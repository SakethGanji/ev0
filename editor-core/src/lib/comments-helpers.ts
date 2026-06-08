import type { Editor } from '@tiptap/core';
import type { Mark, Node as ProseMirrorNode } from '@tiptap/pm/model';
import type { EditorState } from '@tiptap/pm/state';

export const COMMENT_ANCHOR_MARK_NAME = 'commentAnchor';

export interface CommentAnchorRange {
  readonly threadId: string;
  readonly from: number;
  readonly to: number;
}

function findAnchorMark(node: ProseMirrorNode): Mark | undefined {
  return node.marks.find((m) => m.type.name === COMMENT_ANCHOR_MARK_NAME);
}

function threadIdsOf(mark: Mark): string[] {
  const raw = (mark.attrs as { threadIds?: unknown })['threadIds'];
  return Array.isArray(raw) ? (raw as string[]).slice() : [];
}

/** Thread IDs whose anchors lie anywhere within a range. Deduped, order: first appearance. */
export function getThreadIdsInRange(
  editor: Editor | { state: EditorState },
  from: number,
  to: number,
): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];
  editor.state.doc.nodesBetween(from, to, (node) => {
    if (!node.isText) return;
    const mark = findAnchorMark(node);
    if (!mark) return;
    for (const id of threadIdsOf(mark)) {
      if (!seen.has(id)) {
        seen.add(id);
        ordered.push(id);
      }
    }
  });
  return ordered;
}

/** Thread IDs at the cursor / selection. */
export function getThreadIdsAtSelection(editor: Editor): string[] {
  const { from, to } = editor.state.selection;
  return getThreadIdsInRange(editor, from, to);
}

/** Thread IDs at a single position (cursor-style). */
export function getThreadIdsAtPos(editor: Editor, pos: number): string[] {
  const $pos = editor.state.doc.resolve(pos);
  const mark = $pos.marks().find((m) => m.type.name === COMMENT_ANCHOR_MARK_NAME);
  return mark ? threadIdsOf(mark) : [];
}

/** Every thread ID currently anchored in the document. */
export function getAllAnchoredThreadIds(editor: Editor): string[] {
  return getThreadIdsInRange(editor, 0, editor.state.doc.content.size);
}

/** Thread IDs ordered by first appearance in the document. */
export function getThreadIdsInDocumentOrder(
  editor: Editor | { state: EditorState },
): string[] {
  return getThreadIdsInRange(editor, 0, editor.state.doc.content.size);
}

/** Contiguous ranges occupied by the given thread. Adjacent text-node ranges are merged. */
export function findThreadRanges(editor: Editor, threadId: string): CommentAnchorRange[] {
  const raw: CommentAnchorRange[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (!node.isText) return;
    const mark = findAnchorMark(node);
    if (!mark) return;
    if (!threadIdsOf(mark).includes(threadId)) return;
    raw.push({ threadId, from: pos, to: pos + node.nodeSize });
  });
  return mergeAdjacent(raw);
}

/** All threads, mapped to their merged ranges. */
export function findAllThreadRanges(editor: Editor): Map<string, CommentAnchorRange[]> {
  const buckets = new Map<string, CommentAnchorRange[]>();
  editor.state.doc.descendants((node, pos) => {
    if (!node.isText) return;
    const mark = findAnchorMark(node);
    if (!mark) return;
    for (const id of threadIdsOf(mark)) {
      const arr = buckets.get(id) ?? [];
      arr.push({ threadId: id, from: pos, to: pos + node.nodeSize });
      buckets.set(id, arr);
    }
  });
  for (const [id, ranges] of buckets) {
    buckets.set(id, mergeAdjacent(ranges));
  }
  return buckets;
}

export function hasThreadAnchor(editor: Editor, threadId: string): boolean {
  let found = false;
  editor.state.doc.descendants((node) => {
    if (found) return false;
    if (!node.isText) return;
    const mark = findAnchorMark(node);
    if (!mark) return;
    if (threadIdsOf(mark).includes(threadId)) found = true;
    return !found;
  });
  return found;
}

/**
 * Thread IDs the consumer knows about that no longer have an anchor in the document
 * (the commented text was deleted or pasted away).
 */
export function getOrphanedThreadIds(
  editor: Editor,
  threads: ReadonlyArray<string | { readonly id: string }>,
): string[] {
  const knownIds = threads.map((t) => (typeof t === 'string' ? t : t.id));
  const anchored = new Set(getAllAnchoredThreadIds(editor));
  return knownIds.filter((id) => !anchored.has(id));
}

/** Scroll the first occurrence of `threadId` into view. Returns false if not anchored. */
export function scrollToThread(editor: Editor, threadId: string): boolean {
  const ranges = findThreadRanges(editor, threadId);
  if (ranges.length === 0) return false;
  const range = ranges[0];
  editor
    .chain()
    .setTextSelection({ from: range.from, to: range.to })
    .scrollIntoView()
    .run();
  return true;
}

function mergeAdjacent(ranges: CommentAnchorRange[]): CommentAnchorRange[] {
  if (ranges.length === 0) return ranges;
  const sorted = [...ranges].sort((a, b) => a.from - b.from);
  const result: CommentAnchorRange[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const prev = result[result.length - 1];
    const cur = sorted[i];
    if (cur.from <= prev.to) {
      result[result.length - 1] = {
        threadId: prev.threadId,
        from: prev.from,
        to: Math.max(prev.to, cur.to),
      };
    } else {
      result.push(cur);
    }
  }
  return result;
}
