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
import { NgIf, NgSwitch, NgSwitchCase } from '@angular/common';
import type { Editor } from '@tiptap/core';
import { TipIconComponent } from './tip-icon.component';

export type MediaKind = 'image' | 'video';
export type MediaTab = 'upload' | 'url' | 'embed';
export type MediaUploadHandler = (file: File) => Promise<string>;

const DEFAULT_MAX_INLINE_BYTES = 5 * 1024 * 1024;

@Component({
  selector: 'tip-media-insert',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [NgIf, NgSwitch, NgSwitchCase, TipIconComponent],
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'close()',
  },
  template: `
    <div class="tip-media-insert">
      <button
        type="button"
        class="tip-media-insert__trigger"
        (click)="toggle($event)"
        [class.is-open]="open()"
        [disabled]="!editor()"
        [title]="kind() === 'image' ? 'Insert image' : 'Insert video'"
        [attr.aria-label]="kind() === 'image' ? 'Insert image' : 'Insert video'"
        [attr.aria-expanded]="open()"
      >
        <tip-icon [name]="kind() === 'image' ? 'image' : 'video'" />
      </button>
      <div *ngIf="open()" class="tip-media-insert__popover" role="dialog" aria-label="Insert media">
        <div class="tip-media-insert__tabs" role="tablist">
          <button
            type="button"
            role="tab"
            class="tip-media-insert__tab"
            [class.is-active]="tab() === 'upload'"
            (click)="setTab('upload')"
          >Upload</button>
          <button
            type="button"
            role="tab"
            class="tip-media-insert__tab"
            [class.is-active]="tab() === 'url'"
            (click)="setTab('url')"
          >URL</button>
          <button
            *ngIf="kind() === 'video'"
            type="button"
            role="tab"
            class="tip-media-insert__tab"
            [class.is-active]="tab() === 'embed'"
            (click)="setTab('embed')"
          >Embed</button>
        </div>

        <ng-container [ngSwitch]="tab()">
          <ng-container *ngSwitchCase="'upload'">
            <div
              class="tip-media-insert__drop"
              [class.is-dragover]="dragover()"
              (dragover)="onDragOver($event)"
              (dragleave)="onDragLeave($event)"
              (drop)="onDrop($event)"
              (click)="fileInput.click()"
            >
              <tip-icon name="upload" [size]="22" />
              <p>Drop a file or click to browse</p>
              <small>{{ kind() === 'image' ? 'PNG, JPG, GIF, WebP, SVG' : 'MP4, WebM, OGG' }}</small>
            </div>
            <input
              #fileInput
              type="file"
              [attr.accept]="kind() === 'image' ? 'image/*' : 'video/*'"
              (change)="onFile($event)"
              hidden
            />
          </ng-container>
          <ng-container *ngSwitchCase="'url'">
            <label class="tip-media-insert__label">
              <span>{{ kind() === 'image' ? 'Image URL' : 'Video URL' }}</span>
              <input
                class="tip-media-insert__input"
                type="url"
                [placeholder]="kind() === 'image' ? 'https://…/photo.jpg' : 'https://…/clip.mp4'"
                [value]="urlValue()"
                (input)="urlValue.set($any($event.target).value)"
                (keydown.enter)="submitUrl()"
              />
            </label>
            <button
              type="button"
              class="tip-media-insert__submit"
              (click)="submitUrl()"
              [disabled]="!urlValue().trim()"
            >Insert</button>
          </ng-container>
          <ng-container *ngSwitchCase="'embed'">
            <label class="tip-media-insert__label">
              <span>YouTube / Vimeo URL</span>
              <input
                class="tip-media-insert__input"
                type="url"
                placeholder="https://youtube.com/watch?v=…"
                [value]="embedValue()"
                (input)="embedValue.set($any($event.target).value)"
                (keydown.enter)="submitEmbed()"
              />
            </label>
            <button
              type="button"
              class="tip-media-insert__submit"
              (click)="submitEmbed()"
              [disabled]="!embedValue().trim()"
            >Embed</button>
          </ng-container>
        </ng-container>

        <div *ngIf="busy()" class="tip-media-insert__status">Uploading…</div>
        <div *ngIf="error()" class="tip-media-insert__error" role="alert">{{ error() }}</div>
      </div>
    </div>
  `,
  styles: `
    .tip-media-insert { position: relative; display: inline-flex; }
    .tip-media-insert__trigger {
      display: inline-flex; align-items: center; justify-content: center;
      min-width: 30px; height: 30px; padding: 0 0.4rem;
      background: transparent; border: 1px solid transparent;
      border-radius: 0.4rem; color: #475569; cursor: pointer; font: inherit;
      transition: background 0.12s ease, color 0.12s ease, border-color 0.12s ease;
    }
    .tip-media-insert__trigger:hover:not(:disabled) { background: #f1f5f9; color: #0f172a; }
    .tip-media-insert__trigger.is-open { background: #f1f5f9; color: #0f172a; }
    .tip-media-insert__trigger:disabled { cursor: not-allowed; opacity: 0.35; }
    .tip-media-insert__trigger:focus-visible {
      outline: none; border-color: #6366f1; box-shadow: 0 0 0 2px #eef2ff;
    }
    .tip-media-insert__popover {
      position: absolute; top: calc(100% + 6px); left: 0; z-index: 30;
      width: 290px; padding: 0.6rem;
      background: #ffffff; border: 1px solid #e2e8f0; border-radius: 0.55rem;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
    }
    .tip-media-insert__tabs {
      display: flex; gap: 0.2rem; margin-bottom: 0.55rem;
      padding: 0.2rem; background: #f1f5f9; border-radius: 0.4rem;
    }
    .tip-media-insert__tab {
      flex: 1; padding: 0.3rem 0.5rem;
      background: transparent; border: 0; border-radius: 0.3rem;
      color: #475569; cursor: pointer; font: inherit;
      font-size: 0.75rem; font-weight: 500;
      transition: background 0.12s ease, color 0.12s ease;
    }
    .tip-media-insert__tab:hover:not(.is-active) { color: #0f172a; }
    .tip-media-insert__tab.is-active {
      background: #ffffff; color: #0f172a;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
    }
    .tip-media-insert__drop {
      display: flex; flex-direction: column; align-items: center; gap: 0.35rem;
      padding: 1.1rem 1rem;
      border: 1.5px dashed #cbd5e1; border-radius: 0.45rem;
      color: #64748b; cursor: pointer; text-align: center;
      transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease;
    }
    .tip-media-insert__drop:hover { background: #f8fafc; border-color: #94a3b8; }
    .tip-media-insert__drop.is-dragover {
      background: #eef2ff; border-color: #6366f1; color: #4338ca;
    }
    .tip-media-insert__drop p { margin: 0; font-size: 0.78rem; font-weight: 500; }
    .tip-media-insert__drop small { color: #94a3b8; font-size: 0.7rem; }
    .tip-media-insert__label {
      display: flex; flex-direction: column; gap: 0.3rem;
      font-size: 0.72rem; color: #475569;
    }
    .tip-media-insert__input {
      width: 100%; padding: 0.4rem 0.55rem;
      border: 1px solid #e2e8f0; border-radius: 0.35rem;
      background: #ffffff; color: #0f172a; font: inherit; font-size: 0.8rem;
      transition: border-color 0.12s ease, box-shadow 0.12s ease;
    }
    .tip-media-insert__input:focus-visible {
      outline: none; border-color: #6366f1; box-shadow: 0 0 0 2px #eef2ff;
    }
    .tip-media-insert__submit {
      width: 100%; margin-top: 0.55rem; padding: 0.45rem 0.6rem;
      background: #0f172a; border: 0; border-radius: 0.35rem;
      color: #ffffff; cursor: pointer; font: inherit;
      font-size: 0.78rem; font-weight: 500;
      transition: background 0.12s ease;
    }
    .tip-media-insert__submit:hover:not(:disabled) { background: #1e293b; }
    .tip-media-insert__submit:disabled { cursor: not-allowed; opacity: 0.35; }
    .tip-media-insert__status {
      margin-top: 0.4rem; padding: 0.35rem 0.5rem;
      background: #eef2ff; border-radius: 0.3rem;
      color: #4338ca; font-size: 0.72rem; text-align: center;
    }
    .tip-media-insert__error {
      margin-top: 0.4rem; padding: 0.35rem 0.5rem;
      background: #fef2f2; border: 1px solid #fecaca; border-radius: 0.3rem;
      color: #b91c1c; font-size: 0.72rem;
    }
  `,
})
export class TipMediaInsertComponent {
  readonly editor = input<Editor | null>(null);
  readonly kind = input<MediaKind>('image');
  readonly uploadHandler = input<MediaUploadHandler | null>(null);
  readonly maxInlineBytes = input<number>(DEFAULT_MAX_INLINE_BYTES);

  readonly inserted = output<{ kind: MediaKind; src: string; source: 'upload' | 'url' | 'embed' }>();
  readonly insertError = output<Error>();

  protected readonly open = signal(false);
  protected readonly tab = signal<MediaTab>('upload');
  protected readonly urlValue = signal('');
  protected readonly embedValue = signal('');
  protected readonly busy = signal(false);
  protected readonly dragover = signal(false);
  protected readonly error = signal<string | null>(null);

  private readonly hostRef = inject(ElementRef<HTMLElement>);

  protected toggle(event: MouseEvent): void {
    event.stopPropagation();
    this.open.update((v) => !v);
    this.error.set(null);
  }

  protected close(): void {
    this.open.set(false);
    this.dragover.set(false);
  }

  protected onDocumentClick(event: MouseEvent): void {
    if (!this.open()) return;
    if (!this.hostRef.nativeElement.contains(event.target as Node)) this.close();
  }

  protected setTab(t: MediaTab): void {
    this.tab.set(t);
    this.error.set(null);
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragover.set(true);
  }

  protected onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.dragover.set(false);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragover.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) void this.handleFile(file);
  }

  protected onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) void this.handleFile(file);
  }

  protected submitUrl(): void {
    const url = this.urlValue().trim();
    if (!url) return;
    if (this.insert(url, 'url')) {
      this.urlValue.set('');
      this.close();
    }
  }

  protected submitEmbed(): void {
    const url = this.embedValue().trim();
    if (!url) return;
    const editor = this.editor();
    if (!editor) return;
    const chain = editor.chain().focus() as unknown as Record<
      string,
      (opts: { url: string }) => { run: () => boolean }
    >;
    if (!chain['setVideoEmbed']) {
      this.reportError(
        new Error('Embeds require the Video extension exported by editor-core.'),
      );
      return;
    }
    chain['setVideoEmbed']({ url }).run();
    this.inserted.emit({ kind: 'video', src: url, source: 'embed' });
    this.embedValue.set('');
    this.close();
  }

  private async handleFile(file: File): Promise<void> {
    const editor = this.editor();
    if (!editor) return;
    const expected = this.kind() === 'image' ? 'image/' : 'video/';
    if (file.type && !file.type.startsWith(expected)) {
      this.reportError(
        new Error(`Expected a ${this.kind()} file, got ${file.type}.`),
      );
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    try {
      const handler = this.uploadHandler();
      const src = handler ? await handler(file) : await this.toDataUrl(file);
      if (this.insert(src, 'upload')) this.close();
    } catch (err) {
      this.reportError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      this.busy.set(false);
    }
  }

  private async toDataUrl(file: File): Promise<string> {
    if (file.size > this.maxInlineBytes()) {
      throw new Error(
        `File is ${(file.size / 1024 / 1024).toFixed(1)} MB. ` +
          'Provide an uploadHandler or pick a smaller file.',
      );
    }
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error ?? new Error('FileReader failed.'));
      reader.readAsDataURL(file);
    });
  }

  private insert(src: string, source: 'upload' | 'url' | 'embed'): boolean {
    const editor = this.editor();
    if (!editor) return false;
    const chain = editor.chain().focus() as unknown as Record<
      string,
      (opts: Record<string, unknown>) => { run: () => boolean }
    >;
    if (this.kind() === 'image') {
      if (!chain['setImage']) {
        this.reportError(
          new Error(
            'Image inserts require the Image extension. Install @tiptap/extension-image.',
          ),
        );
        return false;
      }
      chain['setImage']({ src }).run();
    } else {
      if (!chain['setVideo']) {
        this.reportError(
          new Error('Video inserts require the Video extension exported by editor-core.'),
        );
        return false;
      }
      chain['setVideo']({ src, provider: 'file' }).run();
    }
    this.inserted.emit({ kind: this.kind(), src, source });
    return true;
  }

  private reportError(err: Error): void {
    this.error.set(err.message);
    this.insertError.emit(err);
  }
}
