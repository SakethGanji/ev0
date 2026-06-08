import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import type { Editor } from '@tiptap/core';
import { TipIconComponent } from './tip-icon.component';
import { useEditorState } from './use-editor-state';

export interface NewCommentPayload {
  from: number;
  to: number;
  body: string;
}

interface SelectionBox {
  from: number;
  to: number;
  top: number;
  bottom: number;
  left: number;
}

interface FormatFlags {
  isBold: boolean;
  isItalic: boolean;
  isStrike: boolean;
  isCode: boolean;
  isInTable: boolean;
}

const EMPTY_FLAGS: FormatFlags = {
  isBold: false,
  isItalic: false,
  isStrike: false,
  isCode: false,
  isInTable: false,
};

const TOOLBAR_HEIGHT = 34;
const COMPOSER_HEIGHT = 142;
const GAP = 8;
const TOOLBAR_OFFSET = 60;
const COMPOSER_HALF_WIDTH = 140;

/**
 * Floating selection bubble. Two modes:
 *   • 'toolbar' — inline format buttons (B / I / S / </>) + a Comment trigger,
 *                 anchored above the current selection.
 *   • 'composer' — small composer card (textarea + Comment/Cancel buttons),
 *                  entered by clicking the Comment trigger.
 *
 * Replaces the old window.prompt flow and brings back the formatting bubble
 * users expect when highlighting text.
 */
@Component({
  selector: 'tip-comment-overlay',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [TipIconComponent],
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'onEscape()',
  },
  template: `
    @if (mode() !== 'hidden' && pos(); as p) {
      <div
        class="tip-bubble"
        [class.tip-bubble--composer]="mode() === 'composer'"
        [style.top.px]="p.top"
        [style.left.px]="p.left"
        (click)="$event.stopPropagation()"
      >
        @if (mode() === 'toolbar') {
          <div
            class="tip-bubble__toolbar"
            (mousedown)="$event.preventDefault()"
          >
            <button
              type="button"
              class="tip-bubble__btn"
              [class.is-active]="flags().isBold"
              (click)="run('toggleBold')"
              title="Bold (Ctrl+B)"
              aria-label="Bold"
            ><tip-icon name="bold" [size]="14" /></button>
            <button
              type="button"
              class="tip-bubble__btn"
              [class.is-active]="flags().isItalic"
              (click)="run('toggleItalic')"
              title="Italic (Ctrl+I)"
              aria-label="Italic"
            ><tip-icon name="italic" [size]="14" /></button>
            <button
              type="button"
              class="tip-bubble__btn"
              [class.is-active]="flags().isStrike"
              (click)="run('toggleStrike')"
              title="Strikethrough"
              aria-label="Strikethrough"
            ><tip-icon name="strike" [size]="14" /></button>
            <button
              type="button"
              class="tip-bubble__btn"
              [class.is-active]="flags().isCode"
              (click)="run('toggleCode')"
              title="Inline code"
              aria-label="Inline code"
            ><tip-icon name="code" [size]="14" /></button>
            @if (commentsEnabled()) {
              <span class="tip-bubble__sep" aria-hidden="true"></span>
              <button
                type="button"
                class="tip-bubble__btn"
                (click)="enterComposer()"
                title="Comment on selection"
                aria-label="Comment on selection"
              ><tip-icon name="message-square" [size]="14" /></button>
            }
          </div>
        } @else {
          <div class="tip-bubble__composer">
            <textarea
              #ta
              class="tip-bubble__textarea"
              placeholder="Write a comment…"
              rows="3"
              [value]="draft()"
              (input)="draft.set($any($event.target).value)"
              (keydown.meta.enter)="submit($event)"
              (keydown.control.enter)="submit($event)"
            ></textarea>
            <div class="tip-bubble__actions">
              <button
                type="button"
                class="tip-bubble__action tip-bubble__action--primary"
                (click)="submit($event)"
                [disabled]="!draft().trim()"
              >Comment</button>
              <button
                type="button"
                class="tip-bubble__action"
                (click)="close()"
              >Cancel</button>
            </div>
          </div>
        }
      </div>
    }
  `,
  styles: `
    :host { display: contents; }
    .tip-bubble {
      position: fixed;
      z-index: 50;
    }
    .tip-bubble__toolbar {
      display: inline-flex;
      align-items: center;
      gap: 0.1rem;
      padding: 0.25rem;
      background: #0f172a;
      color: #ffffff;
      border-radius: 0.45rem;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.22);
    }
    .tip-bubble__btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 28px;
      height: 28px;
      padding: 0 0.4rem;
      background: transparent;
      border: 0;
      border-radius: 0.3rem;
      color: #e2e8f0;
      cursor: pointer;
      font: inherit;
      transition: background 0.1s ease, color 0.1s ease;
    }
    .tip-bubble__btn:hover { background: rgba(255, 255, 255, 0.12); color: #ffffff; }
    .tip-bubble__btn.is-active {
      background: #ffffff;
      color: #0f172a;
    }
    .tip-bubble__sep {
      width: 1px;
      height: 18px;
      background: rgba(255, 255, 255, 0.18);
      margin: 0 0.2rem;
    }
    .tip-bubble__composer {
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
      width: 280px;
      padding: 0.55rem;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
      box-shadow: 0 12px 32px rgba(15, 23, 42, 0.16);
    }
    .tip-bubble__textarea {
      width: 100%;
      padding: 0.45rem 0.55rem;
      border: 1px solid #e2e8f0;
      border-radius: 0.35rem;
      font: inherit;
      font-size: 0.82rem;
      line-height: 1.4;
      color: #0f172a;
      resize: vertical;
      box-sizing: border-box;
    }
    .tip-bubble__textarea:focus {
      outline: none;
      border-color: #6366f1;
      box-shadow: 0 0 0 2px #eef2ff;
    }
    .tip-bubble__actions {
      display: flex;
      gap: 0.35rem;
      justify-content: flex-end;
    }
    .tip-bubble__action {
      padding: 0.35rem 0.7rem;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 0.3rem;
      cursor: pointer;
      font: inherit;
      font-size: 0.74rem;
      font-weight: 500;
      color: #334155;
      transition: background 0.12s ease, border-color 0.12s ease;
    }
    .tip-bubble__action:hover:not(:disabled) {
      background: #f1f5f9;
      border-color: #cbd5e1;
    }
    .tip-bubble__action--primary {
      background: #0f172a;
      color: white;
      border-color: #0f172a;
    }
    .tip-bubble__action--primary:hover:not(:disabled) {
      background: #1e293b;
      border-color: #1e293b;
    }
    .tip-bubble__action:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  `,
})
export class TipCommentOverlayComponent {
  readonly editor = input<Editor | null>(null);
  readonly enabled = input<boolean>(true);
  /** When false, the Comment trigger is hidden (format-only bubble). */
  readonly commentsEnabled = input<boolean>(true);

  readonly composerSubmit = output<NewCommentPayload>();

  protected readonly mode = signal<'hidden' | 'toolbar' | 'composer'>('hidden');
  protected readonly pos = signal<{ top: number; left: number } | null>(null);
  protected readonly draft = signal('');

  private readonly hostRef = inject(ElementRef<HTMLElement>);
  private readonly textarea = viewChild<ElementRef<HTMLTextAreaElement>>('ta');
  private capturedRange: { from: number; to: number } | null = null;

  private readonly selectionSig = useEditorState(this.editor, ({ editor }) => {
    const { from, to } = editor.state.selection;
    if (from >= to) return null;
    try {
      const start = editor.view.coordsAtPos(from);
      const end = editor.view.coordsAtPos(to);
      return {
        from,
        to,
        top: Math.min(start.top, end.top),
        bottom: Math.max(start.bottom, end.bottom),
        left: (start.left + end.right) / 2,
      } satisfies SelectionBox;
    } catch {
      return null;
    }
  });

  private readonly formatSig = useEditorState(this.editor, ({ editor }) => ({
    isBold: editor.isActive('bold'),
    isItalic: editor.isActive('italic'),
    isStrike: editor.isActive('strike'),
    isCode: editor.isActive('code'),
    isInTable:
      editor.isActive('table') ||
      editor.isActive('tableCell') ||
      editor.isActive('tableHeader'),
  } satisfies FormatFlags));

  protected readonly flags = computed<FormatFlags>(
    () => this.formatSig() ?? EMPTY_FLAGS,
  );

  constructor() {
    effect(() => {
      if (!this.enabled()) {
        if (this.mode() !== 'hidden') this.reset();
        return;
      }
      if (this.mode() === 'composer') return;

      const sel = this.selectionSig();
      if (!sel) {
        if (this.mode() !== 'hidden') {
          this.mode.set('hidden');
          this.pos.set(null);
        }
        return;
      }
      this.mode.set('toolbar');
      this.pos.set(positionAbove(sel, TOOLBAR_HEIGHT));
    });
  }

  protected run(command: string): void {
    const editor = this.editor();
    if (!editor) return;
    const chain = editor.chain().focus() as unknown as Record<
      string,
      () => { run: () => boolean }
    >;
    chain[command]?.().run();
  }

  protected enterComposer(): void {
    const sel = this.selectionSig();
    if (!sel) return;
    this.capturedRange = { from: sel.from, to: sel.to };
    this.mode.set('composer');
    this.pos.set(positionForComposer(sel));
    queueMicrotask(() => this.textarea()?.nativeElement.focus());
  }

  protected submit(event?: Event): void {
    event?.preventDefault();
    const body = this.draft().trim();
    if (!body || !this.capturedRange) return;
    this.composerSubmit.emit({ ...this.capturedRange, body });
    this.reset();
  }

  protected close(): void {
    this.reset();
  }

  protected onDocumentClick(event: MouseEvent): void {
    if (this.mode() !== 'composer') return;
    const target = event.target as Node | null;
    if (!target) return;
    if (!this.hostRef.nativeElement.contains(target)) this.reset();
  }

  protected onEscape(): void {
    if (this.mode() === 'hidden') return;
    this.reset();
  }

  private reset(): void {
    this.draft.set('');
    this.capturedRange = null;
    this.mode.set('hidden');
    this.pos.set(null);
  }
}

const TOOLBAR_EST_WIDTH = 220;
const COMPOSER_WIDTH = 280;
const VIEWPORT_PAD = 8;

function positionAbove(sel: SelectionBox, height: number): { top: number; left: number } {
  const aboveTop = sel.top - height - GAP;
  const flipBelow = aboveTop < TOOLBAR_OFFSET;
  const top = flipBelow ? sel.bottom + GAP : aboveTop;
  const viewportWidth =
    typeof window === 'undefined' ? 1280 : window.innerWidth;
  const desiredLeft = sel.left - TOOLBAR_EST_WIDTH / 2;
  const left = clamp(
    desiredLeft,
    VIEWPORT_PAD,
    viewportWidth - TOOLBAR_EST_WIDTH - VIEWPORT_PAD,
  );
  return { top, left };
}

function positionForComposer(sel: SelectionBox): { top: number; left: number } {
  const aboveTop = sel.top - COMPOSER_HEIGHT - GAP;
  const flipBelow = aboveTop < TOOLBAR_OFFSET;
  const top = flipBelow ? sel.bottom + GAP : aboveTop;
  const viewportWidth =
    typeof window === 'undefined' ? 1280 : window.innerWidth;
  const desiredLeft = sel.left - COMPOSER_HALF_WIDTH;
  const left = clamp(
    desiredLeft,
    VIEWPORT_PAD,
    viewportWidth - COMPOSER_WIDTH - VIEWPORT_PAD,
  );
  return { top, left };
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.max(min, Math.min(max, value));
}
