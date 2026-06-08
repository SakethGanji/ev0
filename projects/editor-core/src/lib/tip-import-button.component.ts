import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  output,
  signal,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { NgIf } from '@angular/common';
import type { Editor } from '@tiptap/core';
import {
  DEFAULT_IMPORT_ACCEPT,
  importFile,
  type ImportResult,
  type InsertMode,
} from './import';
import { TipIconComponent } from './tip-icon.component';

@Component({
  selector: 'tip-import-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [NgIf, TipIconComponent],
  template: `
    <button
      type="button"
      class="tip-import-button"
      (click)="openPicker()"
      [disabled]="!editor() || busy()"
      [title]="busy() ? 'Importing…' : 'Import file (HTML, Markdown, DOCX, TXT, JSON)'"
      aria-label="Import file"
    >
      <tip-icon name="upload" />
    </button>
    <input
      #fileInput
      type="file"
      class="tip-import-button__input"
      [attr.accept]="accept()"
      (change)="onFile($event)"
      hidden
    />
    <span *ngIf="error()" class="tip-import-button__error" role="alert">{{ error() }}</span>
  `,
  styles: `
    :host { display: inline-flex; align-items: center; gap: 0.4rem; }
    .tip-import-button {
      display: inline-flex; align-items: center; justify-content: center;
      min-width: 30px; height: 30px; padding: 0 0.4rem;
      background: transparent; border: 1px solid transparent;
      border-radius: 0.4rem; color: #475569; cursor: pointer; font: inherit;
      transition: background 0.12s ease, color 0.12s ease, border-color 0.12s ease;
    }
    .tip-import-button:hover:not(:disabled) { background: #f1f5f9; color: #0f172a; }
    .tip-import-button:focus-visible {
      outline: none; border-color: #6366f1; box-shadow: 0 0 0 2px #eef2ff;
    }
    .tip-import-button:disabled { cursor: not-allowed; opacity: 0.35; }
    .tip-import-button__error { color: #b91c1c; font-size: 0.7rem; }
  `,
})
export class TipImportButtonComponent {
  readonly editor = input<Editor | null>(null);
  readonly mode = input<InsertMode>('replace');
  readonly accept = input<string>(DEFAULT_IMPORT_ACCEPT);

  readonly imported = output<{ file: File; result: ImportResult }>();
  readonly importError = output<{ file: File; error: Error }>();

  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  private readonly fileInput =
    viewChild.required<ElementRef<HTMLInputElement>>('fileInput');

  protected openPicker(): void {
    this.error.set(null);
    const input = this.fileInput().nativeElement;
    input.value = '';
    input.click();
  }

  protected async onFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const editor = this.editor();
    if (!editor) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      const result = await importFile(editor, file, this.mode());
      this.imported.emit({ file, result });
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      this.error.set(e.message);
      this.importError.emit({ file, error: e });
    } finally {
      this.busy.set(false);
    }
  }
}
