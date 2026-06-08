import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  ViewEncapsulation,
} from '@angular/core';
import type { Editor, EditorOptions } from '@tiptap/core';
import { TipCommentsStore, type TipThread } from './comments-store';
import { defaultExtensions } from './editor-defaults';
import { getOrphanedThreadIds } from './comments-helpers';
import { MenuBarComponent } from './menu-bar.component';
import {
  TipCommentOverlayComponent,
  type NewCommentPayload,
} from './tip-comment-overlay.component';
import { TipCommentsSidebarComponent } from './tip-comments-sidebar.component';
import { TipEditorContentComponent } from './tip-editor-content.component';
import { TipTableBubbleComponent } from './tip-table-bubble.component';
import {
  TipTableOfContentsComponent,
  type TipTocAnchor,
} from './tip-table-of-contents.component';
import { type MediaUploadHandler } from './tip-media-insert.component';
import { useEditor } from './use-editor';
import { useEditorState } from './use-editor-state';

export interface TipEditorCounts {
  readonly characters: number;
  readonly words: number;
}

const EMPTY_COUNTS: TipEditorCounts = { characters: 0, words: 0 };

/**
 * One Tiptap-based editor component with every feature bundled in:
 * toolbar (formatting, headings, fonts, alignment, lists, color),
 * Insert dropdown (table, HR, code block, line break), image and video
 * insert, file import/export (HTML / JSON / Markdown / DOCX / PDF / TXT),
 * find-and-replace, table of contents, comments with sidebar, and a
 * character / word count footer.
 *
 * Consumers pass content, listen to outputs, and optionally hide any UI
 * block via `show*` inputs. Comments are part of the editor — the
 * `TipCommentsStore` is provided internally and exposed for read-out.
 */
@Component({
  selector: 'tip-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  providers: [TipCommentsStore],
  imports: [
    DecimalPipe,
    MenuBarComponent,
    TipEditorContentComponent,
    TipTableOfContentsComponent,
    TipCommentsSidebarComponent,
    TipCommentOverlayComponent,
    TipTableBubbleComponent,
  ],
  template: `
    <div
      class="tip-editor"
      [class.tip-editor--toc-open]="showToc() && tocOpen()"
      [class.tip-editor--comments-open]="showComments() && commentsOpen()"
    >
      <tip-menu-bar
        [editor]="editor()"
        [showExport]="showExport()"
        [showImport]="showImport()"
        [showImage]="showImage()"
        [showVideo]="showVideo()"
        [showFind]="showFind()"
        [showToc]="showToc()"
        [showComments]="showComments()"
        [filename]="filename()"
        [importMode]="importMode()"
        [imageUploadHandler]="imageUploadHandler()"
        [videoUploadHandler]="videoUploadHandler()"
        [(tocVisible)]="tocOpen"
        [(commentsVisible)]="commentsOpen"
      />

      <div class="tip-editor__body">
        <div class="tip-editor__content">
          <tip-editor-content [editor]="editor()" [embedded]="true" />
        </div>

        @if (showToc()) {
          <aside
            class="tip-editor__toc tip-editor__panel"
            [class.is-open]="tocOpen()"
            [attr.aria-hidden]="!tocOpen()"
          >
            <div class="tip-editor__panel-header">
              <span>Contents</span>
              <button
                type="button"
                class="tip-editor__panel-close"
                (click)="tocOpen.set(false)"
                aria-label="Hide table of contents"
              >×</button>
            </div>
            <tip-toc [anchors]="tocAnchors()" [editor]="editor()" />
          </aside>
        }

        @if (showComments()) {
          <aside
            class="tip-editor__comments tip-editor__panel"
            [class.is-open]="commentsOpen()"
            [attr.aria-hidden]="!commentsOpen()"
          >
            <tip-comments-sidebar
              [embedded]="true"
              [threads]="commentsStore.threads()"
              [orphanedIds]="orphanedIds()"
              [selectedId]="selectedThreadId()"
              [showClose]="true"
              (closeClicked)="commentsOpen.set(false)"
              (selectClicked)="onThreadSelected($event)"
              (replyClicked)="reply($event.threadId, $event.body)"
              (resolveClicked)="resolveThread($event)"
              (unresolveClicked)="unresolveThread($event)"
              (removeClicked)="removeThread($event)"
            />
          </aside>
        }
      </div>

      <tip-comment-overlay
        [editor]="editor()"
        [commentsEnabled]="showComments()"
        (composerSubmit)="onComposerSubmit($event)"
      />
      <tip-table-bubble [editor]="editor()" />

      @if (showFooter()) {
        <footer class="tip-editor__footer">
          @if (characterLimit() != null) {
            <span
              class="tip-editor__stat"
              [class.is-warning]="nearLimit()"
              [class.is-over]="overLimit()"
            >{{ counts().characters | number }} / {{ characterLimit() | number }} characters</span>
          } @else {
            <span class="tip-editor__stat">{{ counts().characters | number }} characters</span>
          }
          <span class="tip-editor__sep" aria-hidden="true">·</span>
          <span class="tip-editor__stat">{{ counts().words | number }} words</span>
          @if (counts().characters > 0) {
            <span class="tip-editor__sep" aria-hidden="true">·</span>
            <span class="tip-editor__stat tip-editor__stat--muted">
              ~{{ readingMinutes() }} min read
            </span>
          }
        </footer>
      }
    </div>
  `,
  styles: `
    :host { display: block; }
    .tip-editor {
      display: flex;
      flex-direction: column;
      position: relative;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 0.7rem;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px rgba(15, 23, 42, 0.05);
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }
    .tip-editor:focus-within {
      border-color: #c7d2fe;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 12px 32px rgba(99, 102, 241, 0.12);
    }
    .tip-editor > tip-menu-bar,
    .tip-editor > tip-menu-bar > .tip-menu-bar {
      border-top-left-radius: 0.7rem;
      border-top-right-radius: 0.7rem;
    }
    .tip-editor__footer {
      border-bottom-left-radius: 0.7rem;
      border-bottom-right-radius: 0.7rem;
    }
    .tip-editor:not(:has(.tip-editor__footer)) .tip-editor__body {
      border-bottom-left-radius: 0.7rem;
      border-bottom-right-radius: 0.7rem;
      overflow: hidden;
    }

    .tip-editor > tip-menu-bar {
      display: block;
      position: sticky;
      top: 0;
      z-index: 6;
      background: #ffffff;
    }

    /* Body grid — three columns. Closed panels are display:none so they
       take no grid space; open panels expand to their configured width. */
    .tip-editor__body {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto auto;
      min-height: 320px;
    }
    .tip-editor__content { min-width: 0; background: #ffffff; }

    .tip-editor__panel {
      display: none;
      min-width: 0;
      background: #fafbff;
      border-left: 1px solid #e2e8f0;
      overflow-y: auto;
    }
    .tip-editor__panel.is-open { display: block; }
    .tip-editor__toc.is-open {
      width: 240px;
      padding: 0.55rem 0.5rem 0.85rem;
    }
    .tip-editor__comments.is-open { width: 320px; }
    .tip-editor__panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 0.35rem 0.4rem;
      font-size: 0.68rem;
      letter-spacing: 0.07em;
      text-transform: uppercase;
      font-weight: 600;
      color: #94a3b8;
    }
    .tip-editor__panel-close {
      background: transparent;
      border: 0;
      width: 20px;
      height: 20px;
      border-radius: 0.3rem;
      color: #94a3b8;
      cursor: pointer;
      font-size: 1.05rem;
      line-height: 1;
      transition: background 0.1s ease, color 0.1s ease;
    }
    .tip-editor__panel-close:hover { background: #eef2ff; color: #0f172a; }

    /* Embed-mode TOC tweaks */
    .tip-editor__toc tip-toc { display: block; }
    .tip-editor__toc tip-toc,
    .tip-editor__toc tip-toc .tip-toc__empty {
      border: none;
      background: transparent;
      padding: 0;
    }
    .tip-editor__toc tip-toc .tip-toc__empty {
      padding: 0.5rem 0.4rem;
      text-align: center;
      color: #94a3b8;
      font-size: 0.75rem;
    }
    .tip-editor__toc tip-toc .tip-toc__item {
      position: relative;
      padding: 0.3rem 0.5rem 0.3rem 0.6rem;
      line-height: 1.3;
      border-radius: 0.3rem;
    }
    .tip-editor__toc tip-toc .tip-toc__item.is-active {
      background: #eef2ff;
      color: #4338ca;
      font-weight: 600;
    }
    .tip-editor__toc tip-toc .tip-toc__item.is-active::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0.35rem;
      bottom: 0.35rem;
      width: 2px;
      border-radius: 1px;
      background: #6366f1;
    }

    .tip-editor__footer {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.45rem;
      padding: 0.55rem 0.9rem;
      background: #fafbff;
      border-top: 1px solid #e2e8f0;
      color: #64748b;
      font-size: 0.72rem;
    }
    .tip-editor__stat { white-space: nowrap; }
    .tip-editor__stat--muted { color: #94a3b8; }
    .tip-editor__stat.is-warning { color: #b45309; font-weight: 500; }
    .tip-editor__stat.is-over { color: #b91c1c; font-weight: 600; }
    .tip-editor__sep { color: #cbd5e1; }

    /* Comment anchor styling — plugin decorations layer on top via classes. */
    .tip-editor .comment-anchor {
      background: rgba(251, 191, 36, 0.28);
      border-bottom: 1.5px solid rgba(217, 119, 6, 0.55);
      cursor: pointer;
      transition: background 0.12s ease, border-color 0.12s ease;
    }
    .tip-editor .comment-anchor:hover,
    .tip-editor .comment-anchor-hovered {
      background: rgba(251, 191, 36, 0.5);
    }
    .tip-editor .comment-anchor-active {
      background: rgba(245, 158, 11, 0.7);
      border-bottom-color: rgba(180, 83, 9, 0.9);
      outline: 2px solid rgba(245, 158, 11, 0.45);
      outline-offset: 1px;
      border-radius: 0.1rem;
    }
    .tip-editor .comment-anchor-overlap {
      border-bottom-width: 2.5px;
      border-bottom-style: double;
    }
    .tip-editor .comment-anchor-resolved {
      background: transparent;
      border-bottom-color: rgba(148, 163, 184, 0.6);
      border-bottom-style: dashed;
    }
    .tip-editor .comment-anchor-orphaned {
      background: rgba(239, 68, 68, 0.18);
      border-bottom-color: rgba(185, 28, 28, 0.55);
    }

    /* Narrow viewports: panels stack below the editor instead of squeezing
       it sideways. No overlay, no fixed positioning — predictable layout. */
    @media (max-width: 880px) {
      .tip-editor__body {
        grid-template-columns: minmax(0, 1fr);
      }
      .tip-editor__panel.is-open {
        width: 100%;
        border-left: none;
        border-top: 1px solid #e2e8f0;
      }
    }
  `,
})
export class TipEditorComponent {
  // ── Content ──────────────────────────────────────────────────────────
  readonly content = input<EditorOptions['content']>('');
  readonly placeholder = input<string>('Write something …');

  // ── Feature toggles (default to a polished, all-in-one experience) ──
  readonly showExport = input<boolean>(true);
  readonly showImport = input<boolean>(true);
  readonly showImage = input<boolean>(true);
  readonly showVideo = input<boolean>(true);
  readonly showFind = input<boolean>(true);
  readonly showToc = input<boolean>(true);
  readonly showComments = input<boolean>(true);
  readonly showFooter = input<boolean>(true);

  // ── Misc ─────────────────────────────────────────────────────────────
  readonly filename = input<string>('document');
  readonly importMode = input<'replace' | 'insert'>('replace');
  readonly imageUploadHandler = input<MediaUploadHandler | null>(null);
  readonly videoUploadHandler = input<MediaUploadHandler | null>(null);
  readonly characterLimit = input<number | null>(null);
  readonly wordsPerMinute = input<number>(220);

  // ── Comments ─────────────────────────────────────────────────────────
  /** Seed the comments store on first render (e.g. from a backend load). */
  readonly initialThreads = input<readonly TipThread[]>([]);
  /** Author label written onto new comments. */
  readonly commentsAuthor = input<string>('You');

  // ── Outputs ──────────────────────────────────────────────────────────
  readonly editorReady = output<Editor>();
  readonly countsChange = output<TipEditorCounts>();
  readonly threadsChange = output<readonly TipThread[]>();

  // ── Public reactive state (read-only for consumers) ─────────────────
  readonly commentsStore = inject(TipCommentsStore);

  protected readonly tocOpen = signal(false);
  protected readonly commentsOpen = signal(false);
  protected readonly selectedThreadId = signal<string | null>(null);

  readonly editor = useEditor(() =>
    ({
      extensions: defaultExtensions({
        placeholder: this.placeholder(),
        characterLimit: this.characterLimit() ?? undefined,
        commentsStore: this.commentsStore,
        commentsOptions: {
          onSelectedThreadChange: ({ selectedThreadId }) =>
            this.selectedThreadId.set(selectedThreadId),
          onThreadClick: ({ threadId }) => {
            if (threadId) {
              this.selectedThreadId.set(threadId);
              if (this.showComments() && !this.commentsOpen()) {
                this.commentsOpen.set(true);
              }
            }
          },
        },
      }),
      content: this.content() ?? '',
    }) as Partial<EditorOptions>,
  );

  private readonly countsState = useEditorState(this.editor, ({ editor }) => {
    const text = editor.getText();
    const trimmed = text.trim();
    return {
      characters: text.length,
      words: trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0,
    } satisfies TipEditorCounts;
  });

  private readonly tocState = useEditorState(this.editor, ({ editor }) => {
    const entries: TipTocAnchor[] = [];
    let i = 0;
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'heading') {
        i++;
        const level = (node.attrs as { level?: number })['level'] ?? 1;
        entries.push({
          id: `tip-heading-${i}`,
          textContent: node.textContent || 'Untitled',
          level,
          pos,
        });
      }
    });
    return entries;
  });

  private readonly selectionState = useEditorState(this.editor, ({ editor }) => ({
    hasSelection: !editor.state.selection.empty,
  }));

  readonly counts = computed<TipEditorCounts>(
    () => this.countsState() ?? EMPTY_COUNTS,
  );
  readonly tocAnchors = computed<readonly TipTocAnchor[]>(
    () => this.tocState() ?? [],
  );
  protected readonly hasSelection = computed(
    () => this.selectionState()?.hasSelection ?? false,
  );

  protected readonly orphanedIds = computed(() => {
    const editor = this.editor();
    if (!editor) return [] as string[];
    return getOrphanedThreadIds(editor, this.commentsStore.threads());
  });

  protected readonly nearLimit = computed(() => {
    const limit = this.characterLimit();
    if (limit == null) return false;
    return (
      this.counts().characters / limit >= 0.9 &&
      this.counts().characters < limit
    );
  });

  protected readonly overLimit = computed(() => {
    const limit = this.characterLimit();
    return limit != null && this.counts().characters >= limit;
  });

  protected readonly readingMinutes = computed(() => {
    const wpm = Math.max(60, this.wordsPerMinute());
    const minutes = this.counts().words / wpm;
    return Math.max(1, Math.round(minutes));
  });

  constructor() {
    // Editor-ready announcement (once per editor instance)
    let announced = false;
    effect(() => {
      const e = this.editor();
      if (e && !announced) {
        announced = true;
        this.editorReady.emit(e);
      }
    });

    // Seed the comments store from the input (once it's populated)
    let seeded = false;
    effect(() => {
      const initial = this.initialThreads();
      if (seeded || initial.length === 0) return;
      seeded = true;
      untracked(() => this.commentsStore.setThreads(initial));
    });

    // Author override
    effect(() => {
      this.commentsStore.defaultAuthor = this.commentsAuthor();
    });

    // Emit character / word counts whenever they change
    effect(() => {
      this.countsChange.emit(this.counts());
    });

    // Emit threads + force redecoration whenever the store changes
    effect(() => {
      const threads = this.commentsStore.threads();
      this.threadsChange.emit(threads);
      const editor = this.editor();
      if (editor) editor.view.dispatch(editor.state.tr);
    });
  }

  // ── Comment actions ──────────────────────────────────────────────────
  onComposerSubmit({ from, to, body }: NewCommentPayload): void {
    const editor = this.editor();
    if (!editor) return;
    const id = this.commentsStore.newThreadId();
    this.commentsStore.createThread(id, body, this.commentsAuthor());
    editor
      .chain()
      .focus()
      .setTextSelection({ from, to })
      .setThread({ id })
      .run();
    if (this.showComments() && !this.commentsOpen()) {
      this.commentsOpen.set(true);
    }
    this.selectedThreadId.set(id);
  }

  onThreadSelected(id: string): void {
    const editor = this.editor();
    if (!editor) return;
    editor.commands.selectThread({
      id,
      scrollIntoView: true,
      updateSelection: false,
    });
  }

  reply(threadId: string, body: string): void {
    this.editor()?.commands.createComment({ threadId, body });
  }

  resolveThread(id: string): void {
    this.editor()?.commands.resolveThread({ id });
  }

  unresolveThread(id: string): void {
    this.editor()?.commands.unresolveThread({ id });
  }

  removeThread(id: string): void {
    this.editor()?.commands.removeThread({ id });
  }
}
