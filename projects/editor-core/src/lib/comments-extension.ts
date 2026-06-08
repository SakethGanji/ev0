import { Extension, Mark, mergeAttributes } from '@tiptap/core';
import type { Editor } from '@tiptap/core';
import { Fragment, Slice, type Node as ProseMirrorNode } from '@tiptap/pm/model';
import { Plugin, PluginKey, TextSelection, type EditorState } from '@tiptap/pm/state';
import {
  Decoration,
  DecorationSet,
  type EditorView,
} from '@tiptap/pm/view';
import {
  COMMENT_ANCHOR_MARK_NAME,
  getThreadIdsAtPos,
  getThreadIdsInDocumentOrder,
  getThreadIdsInRange,
  findThreadRanges,
  scrollToThread,
} from './comments-helpers';

// ─────────────────────────────────────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────────────────────────────────────

export type CommentThreadStatus = 'open' | 'resolved' | 'deleted' | 'orphaned';

/**
 * Minimal thread snapshot the extension needs from the consumer in order to
 * decorate anchors (resolved / orphaned classes) and skip-resolve in nav.
 * Consumers' richer model can extend this.
 */
export interface CommentThreadSnapshot {
  readonly id: string;
  readonly status: CommentThreadStatus;
  readonly [extra: string]: unknown;
}

export interface CommentAnchorAttrs {
  threadIds: string[];
}

export interface CommentPermissionHooks {
  canCreateThread?: () => boolean;
  canRemoveThread?: (threadId: string) => boolean;
  canSelectThread?: (threadId: string) => boolean;
  canResolveThread?: (threadId: string) => boolean;
  canUnresolveThread?: (threadId: string) => boolean;
  canReplyToThread?: (threadId: string) => boolean;
  canEditComment?: (commentId: string) => boolean;
  canDeleteComment?: (commentId: string) => boolean;
}

export interface ThreadClickEvent {
  threadId: string | null;
  threadIds: string[];
  event: MouseEvent;
  editor: Editor;
}

export interface SelectionThreadChangeEvent {
  threadIds: string[];
  from: number;
  to: number;
  editor: Editor;
}

export interface SelectedThreadChangeEvent {
  selectedThreadId: string | null;
  previousSelectedThreadId: string | null;
  editor: Editor;
}

export interface CreateCommentEvent {
  threadId: string;
  body: string;
  editor: Editor;
}

export interface UpdateCommentEvent {
  threadId: string;
  commentId: string;
  body: string;
  editor: Editor;
}

export interface DeleteCommentEvent {
  threadId: string;
  commentId: string;
  editor: Editor;
}

export interface CommentsOptions extends CommentPermissionHooks {
  /** Look up a single thread by ID. Used for decorations + navigation. */
  getThread?: (id: string) => CommentThreadSnapshot | undefined;
  /** Enumerate all known threads. Exposed for consumer convenience. */
  getThreads?: () => readonly CommentThreadSnapshot[];

  onThreadClick?: (event: ThreadClickEvent) => void;
  onSelectionThreadChange?: (event: SelectionThreadChangeEvent) => void;
  onSelectedThreadChange?: (event: SelectedThreadChangeEvent) => void;

  onCreateThread?: (threadId: string) => void;
  onRemoveThread?: (threadId: string) => void;
  onResolveThread?: (threadId: string) => void;
  onUnresolveThread?: (threadId: string) => void;

  onCreateComment?: (event: CreateCommentEvent) => void;
  onUpdateComment?: (event: UpdateCommentEvent) => void;
  onDeleteComment?: (event: DeleteCommentEvent) => void;

  /** Strip commentAnchor marks from pasted content. Default: true. */
  stripOnPaste: boolean;
  /**
   * When false, navigation (selectNext/PreviousThread) skips resolved threads.
   * Decorations always reflect actual status — consumers style as they wish.
   */
  showResolved: boolean;
  /**
   * When clicked text has multiple overlapping threads, what does onThreadClick.threadId become?
   * - 'all': null (consumer reads threadIds and picks)
   * - 'first': the first thread ID in the overlap
   */
  overlapClickBehavior: 'all' | 'first';
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    comments: {
      setThread: (options: { id: string }) => ReturnType;
      removeThread: (options: { id: string }) => ReturnType;
      selectThread: (options: {
        id: string;
        scrollIntoView?: boolean;
        updateSelection?: boolean;
      }) => ReturnType;
      unselectThread: () => ReturnType;
      setHoveredThread: (options: { id: string }) => ReturnType;
      clearHoveredThread: () => ReturnType;
      selectNextThread: () => ReturnType;
      selectPreviousThread: () => ReturnType;
      resolveThread: (options: { id: string }) => ReturnType;
      unresolveThread: (options: { id: string }) => ReturnType;
      createComment: (options: { threadId: string; body: string }) => ReturnType;
      updateComment: (options: {
        threadId: string;
        commentId: string;
        body: string;
      }) => ReturnType;
      deleteComment: (options: { threadId: string; commentId: string }) => ReturnType;
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Mark
// ─────────────────────────────────────────────────────────────────────────────

const CommentAnchorMark = Mark.create({
  name: COMMENT_ANCHOR_MARK_NAME,
  inclusive: false,
  spanning: true,
  excludes: '',

  addAttributes() {
    return {
      threadIds: {
        default: [] as string[],
        parseHTML: (el) => {
          const raw = (el as HTMLElement).getAttribute('data-thread-ids');
          return raw ? raw.split(',').map((s) => s.trim()).filter(Boolean).sort() : [];
        },
        renderHTML: (attrs) => {
          const ids = (attrs as CommentAnchorAttrs).threadIds;
          if (!ids || ids.length === 0) return {};
          return { 'data-thread-ids': ids.join(',') };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-thread-ids]',
        getAttrs: (node) => {
          const raw = (node as HTMLElement).getAttribute('data-thread-ids');
          if (!raw) return false;
          return {
            threadIds: raw.split(',').map((s) => s.trim()).filter(Boolean).sort(),
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, { class: 'comment-anchor' }),
      0,
    ];
  },
});

// ─────────────────────────────────────────────────────────────────────────────
//  Plugin state + decorations
// ─────────────────────────────────────────────────────────────────────────────

export const commentsPluginKey = new PluginKey<CommentsPluginState>('tipComments');

export interface CommentsPluginState {
  selectedThreadId: string | null;
  hoveredThreadId: string | null;
  lastSelectionThreadIds: string[];
}

const EMPTY_PLUGIN_STATE: CommentsPluginState = {
  selectedThreadId: null,
  hoveredThreadId: null,
  lastSelectionThreadIds: [],
};

function arrayEqual<T>(a: readonly T[], b: readonly T[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function stripCommentAnchorMarks(slice: Slice): Slice {
  const mapContent = (content: Fragment): Fragment => {
    const nodes: ProseMirrorNode[] = [];
    content.forEach((child) => {
      if (child.content.size > 0) {
        nodes.push(child.copy(mapContent(child.content)));
      } else if (child.isText) {
        const filtered = child.marks.filter(
          (m) => m.type.name !== COMMENT_ANCHOR_MARK_NAME,
        );
        nodes.push(child.mark(filtered));
      } else {
        nodes.push(child);
      }
    });
    return Fragment.from(nodes);
  };
  return new Slice(mapContent(slice.content), slice.openStart, slice.openEnd);
}

function buildDecorations(state: EditorState, options: CommentsOptions): DecorationSet {
  const pluginState = commentsPluginKey.getState(state) ?? EMPTY_PLUGIN_STATE;
  const decos: Decoration[] = [];

  state.doc.descendants((node, pos) => {
    if (!node.isText) return;
    const mark = node.marks.find((m) => m.type.name === COMMENT_ANCHOR_MARK_NAME);
    if (!mark) return;
    const ids = (mark.attrs as CommentAnchorAttrs).threadIds;
    const classes: string[] = [];

    if (ids.length > 1) classes.push('comment-anchor-overlap');
    if (pluginState.selectedThreadId && ids.includes(pluginState.selectedThreadId)) {
      classes.push('comment-anchor-active');
    }
    if (pluginState.hoveredThreadId && ids.includes(pluginState.hoveredThreadId)) {
      classes.push('comment-anchor-hovered');
    }
    if (options.getThread) {
      const statuses = ids.map((id) => options.getThread!(id)?.status);
      if (statuses.length > 0 && statuses.every((s) => s === 'resolved')) {
        classes.push('comment-anchor-resolved');
      }
      if (statuses.some((s) => s === 'orphaned')) {
        classes.push('comment-anchor-orphaned');
      }
    }

    if (classes.length === 0) return;
    decos.push(
      Decoration.inline(pos, pos + node.nodeSize, { class: classes.join(' ') }),
    );
  });

  return DecorationSet.create(state.doc, decos);
}

function createCommentsPlugin(
  editor: Editor,
  options: CommentsOptions,
): Plugin<CommentsPluginState> {
  return new Plugin<CommentsPluginState>({
    key: commentsPluginKey,
    state: {
      init: () => EMPTY_PLUGIN_STATE,
      apply(tr, value, oldState, newState) {
        let next = value;
        const meta = tr.getMeta(commentsPluginKey) as
          | Partial<CommentsPluginState>
          | undefined;
        if (meta) next = { ...value, ...meta };

        // Recompute thread IDs at selection on selection / doc change
        const selectionChanged =
          !newState.selection.eq(oldState.selection) || tr.docChanged;
        if (selectionChanged) {
          const ids = getThreadIdsInRange(
            { state: newState },
            newState.selection.from,
            newState.selection.to,
          );
          if (!arrayEqual(ids, next.lastSelectionThreadIds)) {
            next = { ...next, lastSelectionThreadIds: ids };
          }
        }

        return next;
      },
    },
    props: {
      decorations(state) {
        return buildDecorations(state, options);
      },
      handleClick(view, pos, event) {
        const ids = getThreadIdsAtPos(editor, pos);
        if (ids.length === 0) return false;
        const threadId =
          ids.length === 1
            ? ids[0]
            : options.overlapClickBehavior === 'first'
              ? ids[0]
              : null;
        options.onThreadClick?.({ threadId, threadIds: ids, event, editor });
        return false;
      },
      handleDOMEvents: {
        mouseover(view, event) {
          const target = event.target as HTMLElement | null;
          if (!target) return false;
          const el = target.closest('.comment-anchor') as HTMLElement | null;
          if (!el) return false;
          const raw = el.getAttribute('data-thread-ids');
          const ids = raw
            ? raw.split(',').map((s) => s.trim()).filter(Boolean)
            : [];
          if (ids.length === 0) return false;
          const newHover = ids[0];
          const cur = commentsPluginKey.getState(view.state);
          if (cur?.hoveredThreadId === newHover) return false;
          view.dispatch(
            view.state.tr.setMeta(commentsPluginKey, {
              hoveredThreadId: newHover,
            }),
          );
          return false;
        },
        mouseout(view, event) {
          const me = event as MouseEvent;
          const related = me.relatedTarget as HTMLElement | null;
          if (related && related.closest('.comment-anchor')) return false;
          const cur = commentsPluginKey.getState(view.state);
          if (!cur || cur.hoveredThreadId == null) return false;
          view.dispatch(
            view.state.tr.setMeta(commentsPluginKey, { hoveredThreadId: null }),
          );
          return false;
        },
      },
      transformPasted(slice) {
        if (!options.stripOnPaste) return slice;
        return stripCommentAnchorMarks(slice);
      },
    },
    view(view) {
      let lastState = commentsPluginKey.getState(view.state) ?? EMPTY_PLUGIN_STATE;
      return {
        update(updatedView) {
          const newPluginState =
            commentsPluginKey.getState(updatedView.state) ?? EMPTY_PLUGIN_STATE;

          if (
            !arrayEqual(
              newPluginState.lastSelectionThreadIds,
              lastState.lastSelectionThreadIds,
            )
          ) {
            options.onSelectionThreadChange?.({
              threadIds: newPluginState.lastSelectionThreadIds.slice(),
              from: updatedView.state.selection.from,
              to: updatedView.state.selection.to,
              editor,
            });
          }

          if (newPluginState.selectedThreadId !== lastState.selectedThreadId) {
            options.onSelectedThreadChange?.({
              selectedThreadId: newPluginState.selectedThreadId,
              previousSelectedThreadId: lastState.selectedThreadId,
              editor,
            });
          }

          lastState = newPluginState;
        },
        destroy() {
          lastState = EMPTY_PLUGIN_STATE;
        },
      };
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  Extension
// ─────────────────────────────────────────────────────────────────────────────

function threadIdsOfMark(mark: { attrs: unknown }): string[] {
  const raw = (mark.attrs as { threadIds?: unknown }).threadIds;
  return Array.isArray(raw) ? (raw as string[]).slice() : [];
}

interface MarkSegment {
  from: number;
  to: number;
  existingIds: string[];
}

function collectAnchorSegments(
  state: EditorState,
  from: number,
  to: number,
): MarkSegment[] {
  const segs: MarkSegment[] = [];
  state.doc.nodesBetween(from, to, (node, pos) => {
    if (!node.isText) return;
    const nodeFrom = Math.max(from, pos);
    const nodeTo = Math.min(to, pos + node.nodeSize);
    if (nodeTo <= nodeFrom) return;
    const mark = node.marks.find((m) => m.type.name === COMMENT_ANCHOR_MARK_NAME);
    segs.push({
      from: nodeFrom,
      to: nodeTo,
      existingIds: mark ? threadIdsOfMark(mark) : [],
    });
  });
  return segs;
}

export const CommentsExtension = Extension.create<CommentsOptions>({
  name: 'comments',

  addOptions() {
    return {
      stripOnPaste: true,
      showResolved: false,
      overlapClickBehavior: 'all',
    } satisfies CommentsOptions;
  },

  addExtensions() {
    return [CommentAnchorMark];
  },

  addProseMirrorPlugins() {
    return [createCommentsPlugin(this.editor as Editor, this.options)];
  },

  addCommands() {
    return {
      // ── Anchor commands ────────────────────────────────────────────────
      setThread:
        ({ id }) =>
        ({ state, tr, dispatch }) => {
          if (state.selection.empty) return false;
          if (this.options.canCreateThread && !this.options.canCreateThread()) {
            return false;
          }
          const markType = state.schema.marks[COMMENT_ANCHOR_MARK_NAME];
          if (!markType) return false;

          const { from, to } = state.selection;
          const segments = collectAnchorSegments(state, from, to);
          if (segments.length === 0) return false;

          if (!dispatch) return true;

          for (const seg of segments) {
            if (seg.existingIds.includes(id)) continue;
            const next = [...seg.existingIds, id].sort();
            if (seg.existingIds.length > 0) {
              tr.removeMark(seg.from, seg.to, markType);
            }
            tr.addMark(seg.from, seg.to, markType.create({ threadIds: next }));
          }

          dispatch(tr);
          this.options.onCreateThread?.(id);
          return true;
        },

      removeThread:
        ({ id }) =>
        ({ state, tr, dispatch }) => {
          if (
            this.options.canRemoveThread &&
            !this.options.canRemoveThread(id)
          ) {
            return false;
          }
          const markType = state.schema.marks[COMMENT_ANCHOR_MARK_NAME];
          if (!markType) return false;

          interface Hit {
            from: number;
            to: number;
            remaining: string[];
          }
          const hits: Hit[] = [];
          state.doc.descendants((node, pos) => {
            if (!node.isText) return;
            const mark = node.marks.find(
              (m) => m.type.name === COMMENT_ANCHOR_MARK_NAME,
            );
            if (!mark) return;
            const ids = threadIdsOfMark(mark);
            if (!ids.includes(id)) return;
            hits.push({
              from: pos,
              to: pos + node.nodeSize,
              remaining: ids.filter((x) => x !== id),
            });
          });

          if (hits.length === 0) return false;
          if (!dispatch) return true;

          for (const hit of hits) {
            tr.removeMark(hit.from, hit.to, markType);
            if (hit.remaining.length > 0) {
              tr.addMark(
                hit.from,
                hit.to,
                markType.create({ threadIds: hit.remaining }),
              );
            }
          }

          dispatch(tr);
          this.options.onRemoveThread?.(id);
          return true;
        },

      // ── Selection commands ────────────────────────────────────────────
      selectThread:
        ({ id, scrollIntoView = true, updateSelection = false }) =>
        ({ state, tr, dispatch, view }) => {
          if (
            this.options.canSelectThread &&
            !this.options.canSelectThread(id)
          ) {
            return false;
          }

          const editor = this.editor as Editor;
          const ranges = findThreadRanges(editor, id);

          if (!dispatch) return ranges.length > 0;

          tr.setMeta(commentsPluginKey, { selectedThreadId: id });

          if (ranges.length > 0 && updateSelection) {
            const range = ranges[0];
            tr.setSelection(TextSelection.create(tr.doc, range.from, range.to));
          }

          if (ranges.length > 0 && scrollIntoView) {
            tr.scrollIntoView();
          }

          dispatch(tr);

          // For sidebar-driven selection (updateSelection=false), the editor
          // selection didn't move — fall back to DOM scrolling so the highlight
          // actually comes into view.
          if (ranges.length > 0 && scrollIntoView && !updateSelection && view) {
            queueMicrotask(() => scrollAnchorIntoView(view, ranges[0].from));
          }

          return true;
        },

      unselectThread:
        () =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            dispatch(tr.setMeta(commentsPluginKey, { selectedThreadId: null }));
          }
          return true;
        },

      setHoveredThread:
        ({ id }) =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            dispatch(tr.setMeta(commentsPluginKey, { hoveredThreadId: id }));
          }
          return true;
        },

      clearHoveredThread:
        () =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            dispatch(tr.setMeta(commentsPluginKey, { hoveredThreadId: null }));
          }
          return true;
        },

      // ── Navigation ────────────────────────────────────────────────────
      selectNextThread:
        () =>
        ({ state, commands }) => {
          return navigateThread(state, this.options, commands, +1);
        },

      selectPreviousThread:
        () =>
        ({ state, commands }) => {
          return navigateThread(state, this.options, commands, -1);
        },

      // ── Delegated lifecycle ───────────────────────────────────────────
      resolveThread:
        ({ id }) =>
        () => {
          if (
            this.options.canResolveThread &&
            !this.options.canResolveThread(id)
          ) {
            return false;
          }
          this.options.onResolveThread?.(id);
          return true;
        },

      unresolveThread:
        ({ id }) =>
        () => {
          if (
            this.options.canUnresolveThread &&
            !this.options.canUnresolveThread(id)
          ) {
            return false;
          }
          this.options.onUnresolveThread?.(id);
          return true;
        },

      createComment:
        ({ threadId, body }) =>
        () => {
          if (
            this.options.canReplyToThread &&
            !this.options.canReplyToThread(threadId)
          ) {
            return false;
          }
          this.options.onCreateComment?.({
            threadId,
            body,
            editor: this.editor as Editor,
          });
          return true;
        },

      updateComment:
        ({ threadId, commentId, body }) =>
        () => {
          if (
            this.options.canEditComment &&
            !this.options.canEditComment(commentId)
          ) {
            return false;
          }
          this.options.onUpdateComment?.({
            threadId,
            commentId,
            body,
            editor: this.editor as Editor,
          });
          return true;
        },

      deleteComment:
        ({ threadId, commentId }) =>
        () => {
          if (
            this.options.canDeleteComment &&
            !this.options.canDeleteComment(commentId)
          ) {
            return false;
          }
          this.options.onDeleteComment?.({
            threadId,
            commentId,
            editor: this.editor as Editor,
          });
          return true;
        },
    };
  },
});

// ─────────────────────────────────────────────────────────────────────────────
//  Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

function navigateThread(
  state: EditorState,
  options: CommentsOptions,
  commands: { selectThread: (opts: { id: string; scrollIntoView?: boolean; updateSelection?: boolean }) => boolean },
  direction: 1 | -1,
): boolean {
  let ordered = getThreadIdsInDocumentOrder({ state });
  if (!options.showResolved && options.getThread) {
    ordered = ordered.filter(
      (id) => options.getThread!(id)?.status !== 'resolved',
    );
  }
  if (ordered.length === 0) return false;

  const cur = commentsPluginKey.getState(state)?.selectedThreadId ?? null;
  let nextIndex = direction > 0 ? 0 : ordered.length - 1;
  if (cur) {
    const idx = ordered.indexOf(cur);
    if (idx !== -1) {
      nextIndex = (idx + direction + ordered.length) % ordered.length;
    }
  }
  return commands.selectThread({
    id: ordered[nextIndex],
    scrollIntoView: true,
    updateSelection: false,
  });
}

function scrollAnchorIntoView(view: EditorView, pos: number): void {
  try {
    const dom = view.domAtPos(pos);
    const el = (dom.node.nodeType === 1 ? dom.node : dom.node.parentElement) as
      | HTMLElement
      | null;
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  } catch {
    /* best-effort */
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Recommended default styles (opt-in for consumers)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sensible default CSS. Inject into your global stylesheet (or component
 * styles with `ViewEncapsulation.None`) to get a usable Google-Docs look,
 * then override per your design system.
 */
export const DEFAULT_COMMENT_STYLES = `
.comment-anchor {
  background: rgba(251, 191, 36, 0.28);
  border-bottom: 1.5px solid rgba(217, 119, 6, 0.55);
  cursor: pointer;
  transition: background 0.12s ease, border-color 0.12s ease;
}
.comment-anchor:hover,
.comment-anchor-hovered {
  background: rgba(251, 191, 36, 0.5);
}
.comment-anchor-active {
  background: rgba(245, 158, 11, 0.7);
  border-bottom-color: rgba(180, 83, 9, 0.9);
  outline: 2px solid rgba(245, 158, 11, 0.45);
  outline-offset: 1px;
  border-radius: 0.1rem;
}
.comment-anchor-overlap {
  border-bottom-width: 2.5px;
  border-bottom-style: double;
}
.comment-anchor-resolved {
  background: transparent;
  border-bottom-color: rgba(148, 163, 184, 0.6);
  border-bottom-style: dashed;
}
.comment-anchor-orphaned {
  background: rgba(239, 68, 68, 0.18);
  border-bottom-color: rgba(185, 28, 28, 0.55);
}
`.trim();
