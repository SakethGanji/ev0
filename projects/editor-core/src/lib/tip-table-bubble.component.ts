import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import type { Editor } from '@tiptap/core';
import { TipIconComponent } from './tip-icon.component';
import { useEditorState } from './use-editor-state';

const BUBBLE_HEIGHT = 34;
const GAP = 8;
const TOOLBAR_OFFSET = 60;

interface TableSelectionInfo {
  from: number;
  top: number;
  bottom: number;
  left: number;
}

/**
 * Floating contextual toolbar for table cells. Appears when the cursor is
 * inside a table; offers row/column add+delete, merge/split, header toggle,
 * and delete-table. Hidden when there's an explicit text selection (the
 * format bubble takes over in that case).
 */
@Component({
  selector: 'tip-table-bubble',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [TipIconComponent],
  template: `
    @if (visible() && pos(); as p) {
      <div
        class="tip-bubble tip-bubble--table"
        [style.top.px]="p.top"
        [style.left.px]="p.left"
        (mousedown)="$event.preventDefault()"
      >
        <div class="tip-bubble__toolbar">
          <button type="button" class="tip-bubble__btn" (click)="run('addRowBefore')"
                  title="Add row above" aria-label="Add row above">
            <tip-icon name="row-insert-above" [size]="14" />
          </button>
          <button type="button" class="tip-bubble__btn" (click)="run('addRowAfter')"
                  title="Add row below" aria-label="Add row below">
            <tip-icon name="row-insert-below" [size]="14" />
          </button>
          <button type="button" class="tip-bubble__btn" (click)="run('deleteRow')"
                  title="Delete row" aria-label="Delete row">
            <tip-icon name="row-delete" [size]="14" />
          </button>
          <span class="tip-bubble__sep" aria-hidden="true"></span>
          <button type="button" class="tip-bubble__btn" (click)="run('addColumnBefore')"
                  title="Add column left" aria-label="Add column left">
            <tip-icon name="column-insert-left" [size]="14" />
          </button>
          <button type="button" class="tip-bubble__btn" (click)="run('addColumnAfter')"
                  title="Add column right" aria-label="Add column right">
            <tip-icon name="column-insert-right" [size]="14" />
          </button>
          <button type="button" class="tip-bubble__btn" (click)="run('deleteColumn')"
                  title="Delete column" aria-label="Delete column">
            <tip-icon name="column-delete" [size]="14" />
          </button>
          <span class="tip-bubble__sep" aria-hidden="true"></span>
          <button type="button" class="tip-bubble__btn" (click)="run('toggleHeaderRow')"
                  title="Toggle header row" aria-label="Toggle header row">
            <tip-icon name="table-header" [size]="14" />
          </button>
          <button type="button" class="tip-bubble__btn" (click)="run('mergeOrSplit')"
                  title="Merge or split cells" aria-label="Merge or split cells">
            <tip-icon name="merge-cells" [size]="14" />
          </button>
          <span class="tip-bubble__sep" aria-hidden="true"></span>
          <button type="button" class="tip-bubble__btn tip-bubble__btn--danger"
                  (click)="run('deleteTable')"
                  title="Delete table" aria-label="Delete table">
            <tip-icon name="trash" [size]="14" />
          </button>
        </div>
      </div>
    }
  `,
  styles: `
    :host { display: contents; }
    .tip-bubble--table {
      position: fixed;
      z-index: 49;
    }
    .tip-bubble--table .tip-bubble__btn--danger { color: #fca5a5; }
    .tip-bubble--table .tip-bubble__btn--danger:hover {
      background: rgba(239, 68, 68, 0.18);
      color: #fecaca;
    }
  `,
})
export class TipTableBubbleComponent {
  readonly editor = input<Editor | null>(null);
  readonly enabled = input<boolean>(true);

  protected readonly pos = signal<{ top: number; left: number } | null>(null);

  private readonly tableSig = useEditorState(this.editor, ({ editor }) => {
    const inTable =
      editor.isActive('table') ||
      editor.isActive('tableCell') ||
      editor.isActive('tableHeader');
    if (!inTable) return null;
    // Only show when there's no text selection — otherwise the format
    // bubble owns the floating UI.
    if (!editor.state.selection.empty) return null;
    try {
      const { from } = editor.state.selection;
      const coords = editor.view.coordsAtPos(from);
      return {
        from,
        top: coords.top,
        bottom: coords.bottom,
        left: coords.left,
      } satisfies TableSelectionInfo;
    } catch {
      return null;
    }
  });

  protected readonly visible = computed(
    () => this.enabled() && this.tableSig() != null,
  );

  constructor() {
    effect(() => {
      const info = this.tableSig();
      if (!info || !this.enabled()) {
        this.pos.set(null);
        return;
      }
      const aboveTop = info.top - BUBBLE_HEIGHT - GAP;
      const flipBelow = aboveTop < TOOLBAR_OFFSET;
      const top = flipBelow ? info.bottom + GAP : aboveTop;
      const viewportWidth =
        typeof window === 'undefined' ? 1280 : window.innerWidth;
      // Estimated bubble width (10 icon buttons + 3 separators) — clamp so
      // it never disappears past the viewport edge.
      const estWidth = 340;
      const desiredLeft = info.left - estWidth / 2;
      const pad = 8;
      const left = Math.max(
        pad,
        Math.min(desiredLeft, viewportWidth - estWidth - pad),
      );
      this.pos.set({ top, left });
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
}
