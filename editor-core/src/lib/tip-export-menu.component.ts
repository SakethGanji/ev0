import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  output,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import type { Editor } from '@tiptap/core';
import {
  downloadAs,
  EXPORT_FORMAT_DESCRIPTORS,
  type ExportFormat,
  type ExportFormatDescriptor,
} from './export';
import { TipIconComponent } from './tip-icon.component';

@Component({
  selector: 'tip-export-menu',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [NgFor, NgIf, TipIconComponent],
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'close()',
  },
  template: `
    <div class="tip-export-menu">
      <button
        type="button"
        class="tip-export-menu__trigger"
        (click)="toggle($event)"
        [class.is-open]="open()"
        [disabled]="!editor()"
        title="Export document"
        aria-label="Export document"
        [attr.aria-expanded]="open()"
      >
        <tip-icon name="download" />
        <tip-icon name="chevron-down" [size]="12" />
      </button>
      <div *ngIf="open()" class="tip-export-menu__popover" role="menu">
        <div class="tip-export-menu__title">Export as</div>
        <button
          *ngFor="let opt of formats(); trackBy: trackByFormat"
          type="button"
          class="tip-export-menu__item"
          role="menuitem"
          [disabled]="busy() === opt.format"
          (click)="choose(opt)"
        >
          <span class="tip-export-menu__label">{{ opt.label }}</span>
          <span class="tip-export-menu__hint">
            {{ busy() === opt.format ? 'working…' : '.' + opt.extension }}
          </span>
        </button>
        <div *ngIf="error()" class="tip-export-menu__error" role="alert">{{ error() }}</div>
      </div>
    </div>
  `,
  styles: `
    .tip-export-menu { position: relative; display: inline-flex; }
    .tip-export-menu__trigger {
      display: inline-flex; align-items: center; gap: 0.1rem;
      height: 30px; padding: 0 0.3rem 0 0.4rem;
      background: transparent; border: 1px solid transparent;
      border-radius: 0.4rem; color: #475569; cursor: pointer; font: inherit;
      transition: background 0.12s ease, color 0.12s ease, border-color 0.12s ease;
    }
    .tip-export-menu__trigger:hover:not(:disabled) { background: #f1f5f9; color: #0f172a; }
    .tip-export-menu__trigger.is-open { background: #f1f5f9; color: #0f172a; }
    .tip-export-menu__trigger:focus-visible {
      outline: none; border-color: #6366f1; box-shadow: 0 0 0 2px #eef2ff;
    }
    .tip-export-menu__trigger:disabled { cursor: not-allowed; opacity: 0.35; }
    .tip-export-menu__popover {
      position: absolute; top: calc(100% + 6px); right: 0; z-index: 30;
      min-width: 220px; padding: 0.4rem;
      background: #ffffff; border: 1px solid #e2e8f0; border-radius: 0.55rem;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
    }
    .tip-export-menu__title {
      padding: 0.3rem 0.55rem 0.45rem;
      font-size: 0.68rem; font-weight: 600; letter-spacing: 0.06em;
      text-transform: uppercase; color: #94a3b8;
    }
    .tip-export-menu__item {
      display: flex; align-items: center; justify-content: space-between;
      width: 100%; padding: 0.45rem 0.55rem;
      background: transparent; border: 0; border-radius: 0.35rem;
      color: #0f172a; cursor: pointer; font: inherit; font-size: 0.82rem;
      text-align: left;
    }
    .tip-export-menu__item:hover:not(:disabled) { background: #f1f5f9; }
    .tip-export-menu__item:disabled { cursor: progress; color: #94a3b8; }
    .tip-export-menu__hint { color: #94a3b8; font-size: 0.72rem; }
    .tip-export-menu__error {
      margin: 0.4rem 0.1rem 0;
      padding: 0.4rem 0.55rem;
      background: #fef2f2; border: 1px solid #fecaca; border-radius: 0.35rem;
      color: #b91c1c; font-size: 0.72rem;
    }
  `,
})
export class TipExportMenuComponent {
  readonly editor = input<Editor | null>(null);
  readonly filename = input<string>('document');
  readonly formats = input<ReadonlyArray<ExportFormatDescriptor>>(EXPORT_FORMAT_DESCRIPTORS);

  readonly exported = output<ExportFormat>();
  readonly exportError = output<{ format: ExportFormat; error: Error }>();

  protected readonly open = signal(false);
  protected readonly busy = signal<ExportFormat | null>(null);
  protected readonly error = signal<string | null>(null);

  private readonly hostRef = inject(ElementRef<HTMLElement>);

  protected toggle(event: MouseEvent): void {
    event.stopPropagation();
    this.open.update((v) => !v);
    this.error.set(null);
  }

  protected close(): void {
    this.open.set(false);
  }

  protected onDocumentClick(event: MouseEvent): void {
    if (!this.open()) return;
    if (!this.hostRef.nativeElement.contains(event.target as Node)) this.close();
  }

  protected trackByFormat(_: number, opt: ExportFormatDescriptor): string {
    return opt.format;
  }

  protected async choose(opt: ExportFormatDescriptor): Promise<void> {
    const editor = this.editor();
    if (!editor) return;
    this.busy.set(opt.format);
    this.error.set(null);
    try {
      await downloadAs(editor, opt.format, this.filename());
      this.exported.emit(opt.format);
      this.close();
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      this.error.set(e.message);
      this.exportError.emit({ format: opt.format, error: e });
    } finally {
      this.busy.set(null);
    }
  }
}
