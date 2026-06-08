import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import type { Editor } from '@tiptap/core';
import { TipIconComponent } from './tip-icon.component';
import { useEditorState } from './use-editor-state';

export type ColorPickerMode = 'text' | 'background';

const PALETTE: ReadonlyArray<{ name: string; value: string }> = [
  { name: 'Slate', value: '#0f172a' },
  { name: 'Gray', value: '#475569' },
  { name: 'Cool gray', value: '#94a3b8' },
  { name: 'Light gray', value: '#cbd5e1' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Lime', value: '#84cc16' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Pink', value: '#ec4899' },
];

@Component({
  selector: 'tip-color-picker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [TipIconComponent],
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'close()',
  },
  template: `
    <div class="tip-color-picker">
      <button
        type="button"
        class="tip-color-picker__trigger"
        (click)="toggle($event)"
        [class.is-open]="open()"
        [title]="mode() === 'text' ? 'Text color' : 'Highlight color'"
        [attr.aria-label]="mode() === 'text' ? 'Text color' : 'Highlight color'"
        [attr.aria-expanded]="open()"
      >
        <span class="tip-color-picker__icon-stack">
          <tip-icon [name]="mode() === 'text' ? 'baseline' : 'highlighter'" />
          <span
            class="tip-color-picker__indicator"
            [style.background-color]="indicatorColor()"
          ></span>
        </span>
        <tip-icon name="chevron-down" [size]="12" />
      </button>
      @if (open()) {
        <div class="tip-color-picker__popover" role="dialog">
          <button
            type="button"
            class="tip-color-picker__clear"
            [class.is-current]="!currentSwatch()"
            (click)="apply(null)"
            title="Remove color"
          >No color</button>
          <div class="tip-color-picker__grid">
            @for (swatch of palette; track swatch.value) {
              <button
                type="button"
                class="tip-color-picker__swatch"
                [class.is-current]="currentSwatch() === swatch.value.toLowerCase()"
                [style.background-color]="swatch.value"
                [title]="swatch.name"
                [attr.aria-label]="swatch.name"
                (click)="apply(swatch.value)"
              ></button>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    .tip-color-picker {
      position: relative;
      display: inline-flex;
    }
    .tip-color-picker__trigger {
      display: inline-flex;
      align-items: center;
      gap: 0.1rem;
      height: 30px;
      padding: 0 0.3rem 0 0.4rem;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 0.4rem;
      color: #475569;
      cursor: pointer;
      font: inherit;
      transition: background 0.12s ease, color 0.12s ease, border-color 0.12s ease;
    }
    .tip-color-picker__trigger:hover {
      background: #f1f5f9;
      color: #0f172a;
    }
    .tip-color-picker__trigger:focus-visible {
      outline: none;
      border-color: #6366f1;
      box-shadow: 0 0 0 2px #eef2ff;
    }
    .tip-color-picker__trigger.is-open {
      background: #f1f5f9;
      color: #0f172a;
    }
    .tip-color-picker__icon-stack {
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
    }
    .tip-color-picker__indicator {
      width: 14px;
      height: 3px;
      border-radius: 2px;
      background: transparent;
      box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.06);
      transition: background-color 0.15s ease;
    }
    .tip-color-picker__popover {
      position: absolute;
      top: calc(100% + 6px);
      left: 0;
      z-index: 30;
      width: 200px;
      padding: 0.6rem;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 0.55rem;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
    }
    .tip-color-picker__clear {
      display: block;
      width: 100%;
      padding: 0.4rem 0.5rem;
      margin-bottom: 0.5rem;
      background: transparent;
      border: 1px solid #e2e8f0;
      border-radius: 0.35rem;
      color: #475569;
      cursor: pointer;
      font: inherit;
      font-size: 0.78rem;
      text-align: left;
      transition: background 0.12s ease, color 0.12s ease;
    }
    .tip-color-picker__clear:hover {
      background: #f1f5f9;
      color: #0f172a;
    }
    .tip-color-picker__clear.is-current {
      background: #eef2ff;
      border-color: #c7d2fe;
      color: #4338ca;
      font-weight: 600;
    }
    .tip-color-picker__grid {
      display: grid;
      grid-template-columns: repeat(8, 1fr);
      gap: 0.25rem;
    }
    .tip-color-picker__swatch {
      width: 20px;
      height: 20px;
      padding: 0;
      border: 1px solid rgba(15, 23, 42, 0.1);
      border-radius: 0.3rem;
      cursor: pointer;
      transition: transform 0.1s ease, box-shadow 0.1s ease;
    }
    .tip-color-picker__swatch:hover {
      transform: scale(1.12);
      box-shadow: 0 1px 4px rgba(15, 23, 42, 0.2);
    }
    .tip-color-picker__swatch:focus-visible {
      outline: none;
      box-shadow: 0 0 0 2px #ffffff, 0 0 0 4px #6366f1;
    }
    .tip-color-picker__swatch.is-current {
      box-shadow: 0 0 0 2px #ffffff, 0 0 0 4px #0f172a;
    }
  `,
})
export class TipColorPickerComponent {
  readonly editor = input<Editor | null>(null);
  readonly mode = input<ColorPickerMode>('text');

  protected readonly open = signal(false);
  protected readonly palette = PALETTE;

  private readonly hostRef = inject(ElementRef<HTMLElement>);

  private readonly currentColorState = useEditorState(this.editor, ({ editor }) => {
    const attrs = editor.getAttributes('textStyle') as Record<string, unknown>;
    const value = this.mode() === 'text' ? attrs['color'] : attrs['backgroundColor'];
    return typeof value === 'string' ? value : null;
  });

  protected readonly indicatorColor = computed(
    () => this.currentColorState() ?? 'transparent',
  );

  protected readonly currentSwatch = computed(() => {
    const value = this.currentColorState();
    return value ? value.toLowerCase() : null;
  });

  protected toggle(event: MouseEvent): void {
    event.stopPropagation();
    this.open.update((v) => !v);
  }

  protected close(): void {
    this.open.set(false);
  }

  protected onDocumentClick(event: MouseEvent): void {
    if (!this.open()) return;
    if (!this.hostRef.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }

  protected apply(color: string | null): void {
    const editor = this.editor();
    if (!editor) return;
    const chain = editor.chain().focus() as unknown as Record<
      string,
      (value?: string) => { run: () => boolean }
    >;
    if (this.mode() === 'text') {
      if (color) chain['setColor']?.(color).run();
      else chain['unsetColor']?.().run();
    } else {
      if (color) chain['setBackgroundColor']?.(color).run();
      else chain['unsetBackgroundColor']?.().run();
    }
    this.close();
  }
}
