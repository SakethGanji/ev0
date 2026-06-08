import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  model,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import type { Editor } from '@tiptap/core';
import {
  menuBarStateSelector,
  type BlockType,
  type MenuBarState,
} from './menu-bar-state';
import { TipColorPickerComponent } from './tip-color-picker.component';
import { TipExportMenuComponent } from './tip-export-menu.component';
import { TipFindReplaceComponent } from './tip-find-replace.component';
import { TipIconComponent } from './tip-icon.component';
import { TipImportButtonComponent } from './tip-import-button.component';
import {
  TipMediaInsertComponent,
  type MediaUploadHandler,
} from './tip-media-insert.component';
import { useEditorState } from './use-editor-state';

const EMPTY_STATE: MenuBarState = {
  blockType: 'other',
  isBold: false, canBold: false,
  isItalic: false, canItalic: false,
  isStrike: false, canStrike: false,
  isCode: false, canCode: false,
  canClearMarks: false,
  isParagraph: false,
  isHeading1: false, isHeading2: false, isHeading3: false,
  isHeading4: false, isHeading5: false, isHeading6: false,
  isBulletList: false, isOrderedList: false, isTaskList: false,
  isCodeBlock: false, isBlockquote: false,
  canUndo: false, canRedo: false,
  fontFamily: null,
  fontSize: null,
  lineHeight: null,
  invisibleCharactersVisible: false,
  isAlignLeft: false, isAlignCenter: false,
  isAlignRight: false, isAlignJustify: false,
};

interface SelectOption {
  readonly label: string;
  readonly value: string | null;
}

const STYLE_OPTIONS: ReadonlyArray<{ label: string; value: BlockType }> = [
  { label: 'Normal text', value: 'paragraph' },
  { label: 'Heading 1', value: 'h1' },
  { label: 'Heading 2', value: 'h2' },
  { label: 'Heading 3', value: 'h3' },
  { label: 'Heading 4', value: 'h4' },
  { label: 'Heading 5', value: 'h5' },
  { label: 'Heading 6', value: 'h6' },
  { label: 'Quote', value: 'blockquote' },
  { label: 'Code block', value: 'codeBlock' },
];

// Labels for the "no mark applied" option match what the editor actually
// renders by default (Inter, 16px, 1.5 line-height — see tip-editor-content.ts).
// Picking the labelled-default unsets any explicit textStyle mark.
const FONT_FAMILY_OPTIONS: ReadonlyArray<SelectOption> = [
  { label: 'Inter', value: null },
  { label: 'Georgia', value: 'Georgia, "Times New Roman", serif' },
  { label: 'Times', value: '"Times New Roman", Times, serif' },
  { label: 'Courier', value: '"Courier New", Courier, monospace' },
  { label: 'JetBrains Mono', value: '"JetBrains Mono", ui-monospace, monospace' },
  { label: 'System UI', value: 'ui-sans-serif, system-ui, sans-serif' },
];

const FONT_SIZE_OPTIONS: ReadonlyArray<SelectOption> = [
  { label: '16', value: null },
  { label: '12', value: '12px' },
  { label: '14', value: '14px' },
  { label: '18', value: '18px' },
  { label: '20', value: '20px' },
  { label: '24', value: '24px' },
  { label: '30', value: '30px' },
  { label: '36', value: '36px' },
];

const LINE_HEIGHT_OPTIONS: ReadonlyArray<SelectOption> = [
  { label: '1.5', value: null },
  { label: '1', value: '1' },
  { label: '1.15', value: '1.15' },
  { label: '1.75', value: '1.75' },
  { label: '2', value: '2' },
];

@Component({
  selector: 'tip-menu-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [
    TipIconComponent,
    TipColorPickerComponent,
    TipExportMenuComponent,
    TipImportButtonComponent,
    TipMediaInsertComponent,
    TipFindReplaceComponent,
  ],
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'closeInsertMenu()',
  },
  template: `
    @if (editor()) {
      <div class="tip-menu-bar" role="toolbar" aria-label="Editor toolbar">
        <!-- History -->
        <div class="tip-menu-bar__group">
          <button
            type="button"
            class="tip-menu-bar__btn"
            (click)="run('undo')"
            [disabled]="!state().canUndo"
            title="Undo (Ctrl+Z)"
            aria-label="Undo"
          ><tip-icon name="undo" /></button>
          <button
            type="button"
            class="tip-menu-bar__btn"
            (click)="run('redo')"
            [disabled]="!state().canRedo"
            title="Redo (Ctrl+Shift+Z)"
            aria-label="Redo"
          ><tip-icon name="redo" /></button>
        </div>

        <span class="tip-menu-bar__divider" aria-hidden="true"></span>

        <!-- Block style -->
        <div class="tip-menu-bar__group">
          <select
            class="tip-menu-bar__select tip-menu-bar__select--style"
            [value]="state().blockType"
            (change)="onStyleChange($event)"
            title="Paragraph style"
            aria-label="Paragraph style"
          >
            @for (opt of styleOptions; track opt.value) {
              <option [value]="opt.value">{{ opt.label }}</option>
            }
            @if (state().blockType === 'other') {
              <option value="other" disabled>—</option>
            }
          </select>
        </div>

        <span class="tip-menu-bar__divider" aria-hidden="true"></span>

        <!-- Font -->
        <div class="tip-menu-bar__group">
          <select
            class="tip-menu-bar__select tip-menu-bar__select--font"
            [value]="state().fontFamily ?? ''"
            (change)="onFontFamilyChange($event)"
            title="Font family"
            aria-label="Font family"
          >
            @for (opt of fontFamilyOptions; track opt.value ?? '_default') {
              <option [value]="opt.value ?? ''">{{ opt.label }}</option>
            }
          </select>
          <select
            class="tip-menu-bar__select tip-menu-bar__select--size"
            [value]="state().fontSize ?? ''"
            (change)="onFontSizeChange($event)"
            title="Font size"
            aria-label="Font size"
          >
            @for (opt of fontSizeOptions; track opt.value ?? '_default') {
              <option [value]="opt.value ?? ''">{{ opt.label }}</option>
            }
          </select>
          <select
            class="tip-menu-bar__select tip-menu-bar__select--line"
            [value]="state().lineHeight ?? ''"
            (change)="onLineHeightChange($event)"
            title="Line height"
            aria-label="Line height"
          >
            @for (opt of lineHeightOptions; track opt.value ?? '_default') {
              <option [value]="opt.value ?? ''">↕ {{ opt.label }}</option>
            }
          </select>
        </div>

        <span class="tip-menu-bar__divider" aria-hidden="true"></span>

        <!-- Inline marks -->
        <div class="tip-menu-bar__group">
          <button
            type="button"
            class="tip-menu-bar__btn"
            (click)="run('toggleBold')"
            [disabled]="!state().canBold"
            [class.is-active]="state().isBold"
            [attr.aria-pressed]="state().isBold"
            title="Bold (Ctrl+B)"
            aria-label="Bold"
          ><tip-icon name="bold" /></button>
          <button
            type="button"
            class="tip-menu-bar__btn"
            (click)="run('toggleItalic')"
            [disabled]="!state().canItalic"
            [class.is-active]="state().isItalic"
            [attr.aria-pressed]="state().isItalic"
            title="Italic (Ctrl+I)"
            aria-label="Italic"
          ><tip-icon name="italic" /></button>
          <button
            type="button"
            class="tip-menu-bar__btn"
            (click)="run('toggleStrike')"
            [disabled]="!state().canStrike"
            [class.is-active]="state().isStrike"
            [attr.aria-pressed]="state().isStrike"
            title="Strikethrough"
            aria-label="Strikethrough"
          ><tip-icon name="strike" /></button>
          <button
            type="button"
            class="tip-menu-bar__btn"
            (click)="run('toggleCode')"
            [disabled]="!state().canCode"
            [class.is-active]="state().isCode"
            [attr.aria-pressed]="state().isCode"
            title="Inline code (Ctrl+E)"
            aria-label="Inline code"
          ><tip-icon name="code" /></button>
        </div>

        <span class="tip-menu-bar__divider" aria-hidden="true"></span>

        <!-- Colors -->
        <div class="tip-menu-bar__group">
          <tip-color-picker [editor]="editor()" mode="text" />
          <tip-color-picker [editor]="editor()" mode="background" />
        </div>

        <span class="tip-menu-bar__divider" aria-hidden="true"></span>

        <!-- Alignment -->
        <div class="tip-menu-bar__group">
          <button
            type="button"
            class="tip-menu-bar__btn"
            (click)="setAlign('left')"
            [class.is-active]="state().isAlignLeft"
            [attr.aria-pressed]="state().isAlignLeft"
            title="Align left"
            aria-label="Align left"
          ><tip-icon name="align-left" /></button>
          <button
            type="button"
            class="tip-menu-bar__btn"
            (click)="setAlign('center')"
            [class.is-active]="state().isAlignCenter"
            [attr.aria-pressed]="state().isAlignCenter"
            title="Align center"
            aria-label="Align center"
          ><tip-icon name="align-center" /></button>
          <button
            type="button"
            class="tip-menu-bar__btn"
            (click)="setAlign('right')"
            [class.is-active]="state().isAlignRight"
            [attr.aria-pressed]="state().isAlignRight"
            title="Align right"
            aria-label="Align right"
          ><tip-icon name="align-right" /></button>
          <button
            type="button"
            class="tip-menu-bar__btn"
            (click)="setAlign('justify')"
            [class.is-active]="state().isAlignJustify"
            [attr.aria-pressed]="state().isAlignJustify"
            title="Justify"
            aria-label="Justify"
          ><tip-icon name="align-justify" /></button>
        </div>

        <span class="tip-menu-bar__divider" aria-hidden="true"></span>

        <!-- Lists -->
        <div class="tip-menu-bar__group">
          <button
            type="button"
            class="tip-menu-bar__btn"
            (click)="run('toggleBulletList')"
            [class.is-active]="state().isBulletList"
            [attr.aria-pressed]="state().isBulletList"
            title="Bullet list"
            aria-label="Bullet list"
          ><tip-icon name="list" /></button>
          <button
            type="button"
            class="tip-menu-bar__btn"
            (click)="run('toggleOrderedList')"
            [class.is-active]="state().isOrderedList"
            [attr.aria-pressed]="state().isOrderedList"
            title="Numbered list"
            aria-label="Numbered list"
          ><tip-icon name="list-ordered" /></button>
          <button
            type="button"
            class="tip-menu-bar__btn"
            (click)="run('toggleTaskList')"
            [class.is-active]="state().isTaskList"
            [attr.aria-pressed]="state().isTaskList"
            title="Task list"
            aria-label="Task list"
          ><tip-icon name="list-checks" /></button>
        </div>

        <span class="tip-menu-bar__divider" aria-hidden="true"></span>

        <!-- Insert -->
        <div class="tip-menu-bar__group" #insertHost>
          <div class="tip-menu-bar__insert">
            <button
              type="button"
              class="tip-menu-bar__btn tip-menu-bar__btn--label"
              (click)="toggleInsertMenu($event)"
              [class.is-active]="insertOpen()"
              [attr.aria-expanded]="insertOpen()"
              title="Insert"
              aria-label="Insert"
            >
              <tip-icon name="plus" />
              <span>Insert</span>
              <tip-icon name="chevron-down" [size]="12" />
            </button>
            @if (insertOpen()) {
              <div class="tip-menu-bar__popover" role="menu">
                <button
                  type="button"
                  class="tip-menu-bar__menu-item"
                  role="menuitem"
                  (click)="insertTable()"
                ><tip-icon name="table" /> <span>Table</span></button>
                <button
                  type="button"
                  class="tip-menu-bar__menu-item"
                  role="menuitem"
                  (click)="runFromMenu('setHorizontalRule')"
                ><tip-icon name="horizontal-rule" /> <span>Horizontal rule</span></button>
                <button
                  type="button"
                  class="tip-menu-bar__menu-item"
                  role="menuitem"
                  [class.is-active]="state().isCodeBlock"
                  (click)="runFromMenu('toggleCodeBlock')"
                ><tip-icon name="code-block" /> <span>Code block</span></button>
                <button
                  type="button"
                  class="tip-menu-bar__menu-item"
                  role="menuitem"
                  (click)="runFromMenu('setHardBreak')"
                ><tip-icon name="corner-down-left" /> <span>Line break</span></button>
              </div>
            }
          </div>
          @if (showImage()) {
            <tip-media-insert
              [editor]="editor()"
              kind="image"
              [uploadHandler]="imageUploadHandler()"
            />
          }
          @if (showVideo()) {
            <tip-media-insert
              [editor]="editor()"
              kind="video"
              [uploadHandler]="videoUploadHandler()"
            />
          }
        </div>

        @if (showImport() || showFind() || showToc() || showComments()) {
          <span class="tip-menu-bar__divider" aria-hidden="true"></span>
          <div class="tip-menu-bar__group">
            @if (showImport()) {
              <tip-import-button [editor]="editor()" [mode]="importMode()" />
            }
            @if (showFind()) {
              <button
                type="button"
                class="tip-menu-bar__btn"
                (click)="toggleFind()"
                [class.is-active]="findVisible()"
                [attr.aria-pressed]="findVisible()"
                title="Find and replace (Ctrl+F)"
                aria-label="Find and replace"
              ><tip-icon name="search" /></button>
            }
            @if (showComments()) {
              <button
                type="button"
                class="tip-menu-bar__btn"
                (click)="toggleComments()"
                [class.is-active]="commentsVisible()"
                [attr.aria-pressed]="commentsVisible()"
                title="Toggle comments"
                aria-label="Toggle comments"
              ><tip-icon name="quote" /></button>
            }
            @if (showToc()) {
              <button
                type="button"
                class="tip-menu-bar__btn"
                (click)="toggleToc()"
                [class.is-active]="tocVisible()"
                [attr.aria-pressed]="tocVisible()"
                title="Toggle table of contents"
                aria-label="Toggle table of contents"
              ><tip-icon name="panel-right" /></button>
            }
          </div>
        }

        @if (showExport()) {
          <span class="tip-menu-bar__spacer" aria-hidden="true"></span>
          <div class="tip-menu-bar__group">
            <tip-export-menu [editor]="editor()" [filename]="filename()" />
          </div>
        }
      </div>

      @if (showFind()) {
        <div class="tip-menu-bar__find-slot">
          <tip-find-replace [editor]="editor()" [(visible)]="findVisible" />
        </div>
      }
    }
  `,
  styles: `
    :host { display: block; }
    .tip-menu-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.1rem;
      padding: 0.4rem 0.55rem;
      background: #ffffff;
      border-bottom: 1px solid #e2e8f0;
      color: #475569;
    }
    .tip-menu-bar__group {
      display: inline-flex;
      align-items: center;
      gap: 0.05rem;
    }
    .tip-menu-bar__divider {
      width: 1px;
      align-self: stretch;
      background: #e2e8f0;
      margin: 0.25rem 0.3rem;
    }
    .tip-menu-bar__spacer {
      flex: 1 1 auto;
      min-width: 0.4rem;
    }
    .tip-menu-bar__btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 28px;
      height: 28px;
      padding: 0 0.35rem;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 0.35rem;
      color: inherit;
      cursor: pointer;
      font: inherit;
      font-size: 0.78rem;
      transition: background 0.1s ease, color 0.1s ease, border-color 0.1s ease;
    }
    .tip-menu-bar__btn:hover:not(:disabled) {
      background: #f1f5f9;
      color: #0f172a;
    }
    .tip-menu-bar__btn:focus-visible {
      outline: none;
      border-color: #6366f1;
      box-shadow: 0 0 0 2px #eef2ff;
    }
    .tip-menu-bar__btn.is-active {
      background: #0f172a;
      color: #ffffff;
      border-color: #0f172a;
    }
    .tip-menu-bar__btn:disabled {
      cursor: not-allowed;
      opacity: 0.35;
    }
    .tip-menu-bar__btn--label {
      gap: 0.25rem;
      padding: 0 0.55rem;
      font-weight: 500;
    }
    .tip-menu-bar__select {
      height: 28px;
      padding: 0 1.5rem 0 0.5rem;
      border: 1px solid #e2e8f0;
      border-radius: 0.35rem;
      background: #ffffff;
      color: #334155;
      font: inherit;
      font-size: 0.76rem;
      cursor: pointer;
      appearance: none;
      -webkit-appearance: none;
      background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='m6 9 6 6 6-6'/></svg>");
      background-repeat: no-repeat;
      background-position: right 0.35rem center;
      transition: border-color 0.1s ease, background-color 0.1s ease;
    }
    .tip-menu-bar__select:hover { background-color: #f8fafc; color: #0f172a; }
    .tip-menu-bar__select:focus-visible {
      outline: none;
      border-color: #6366f1;
      box-shadow: 0 0 0 2px #eef2ff;
    }
    .tip-menu-bar__select--style { min-width: 130px; }
    .tip-menu-bar__select--font  { min-width: 110px; max-width: 150px; }
    .tip-menu-bar__select--size  { width: 64px; }
    .tip-menu-bar__select--line  { width: 76px; }

    .tip-menu-bar__insert { position: relative; display: inline-flex; }
    .tip-menu-bar__popover {
      position: absolute;
      top: calc(100% + 6px);
      left: 0;
      z-index: 30;
      min-width: 180px;
      padding: 0.3rem;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
    }
    .tip-menu-bar__menu-item {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      width: 100%;
      padding: 0.4rem 0.55rem;
      background: transparent;
      border: 0;
      border-radius: 0.3rem;
      color: #0f172a;
      cursor: pointer;
      font: inherit;
      font-size: 0.8rem;
      text-align: left;
      transition: background 0.1s ease, color 0.1s ease;
    }
    .tip-menu-bar__menu-item:hover { background: #f1f5f9; }
    .tip-menu-bar__menu-item.is-active {
      background: #eef2ff;
      color: #4338ca;
      font-weight: 500;
    }
    .tip-menu-bar__menu-item tip-icon {
      color: #64748b;
      flex: 0 0 auto;
    }
    .tip-menu-bar__menu-item:hover tip-icon { color: #0f172a; }
    .tip-menu-bar__menu-item.is-active tip-icon { color: #4338ca; }

    .tip-menu-bar__find-slot {
      padding: 0.5rem 0.6rem;
      border-bottom: 1px solid #e2e8f0;
      background: #f8fafc;
    }
    .tip-menu-bar__find-slot tip-find-replace {
      display: block;
    }
    .tip-menu-bar__find-slot .tip-find-replace {
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
    }
  `,
})
export class MenuBarComponent {
  readonly editor = input<Editor | null>(null);

  // Opt-in feature toggles.
  readonly showExport = input<boolean>(false);
  readonly showImport = input<boolean>(false);
  readonly showImage = input<boolean>(false);
  readonly showVideo = input<boolean>(false);
  readonly showFind = input<boolean>(false);
  readonly showToc = input<boolean>(false);
  readonly showComments = input<boolean>(false);

  readonly filename = input<string>('document');
  readonly importMode = input<'replace' | 'insert'>('replace');
  readonly imageUploadHandler = input<MediaUploadHandler | null>(null);
  readonly videoUploadHandler = input<MediaUploadHandler | null>(null);

  // Two-way binding for panel visibility (driven by the composite editor).
  readonly findVisible = model<boolean>(false);
  readonly tocVisible = model<boolean>(false);
  readonly commentsVisible = model<boolean>(false);

  protected readonly insertOpen = signal(false);

  protected readonly styleOptions = STYLE_OPTIONS;
  protected readonly fontFamilyOptions = FONT_FAMILY_OPTIONS;
  protected readonly fontSizeOptions = FONT_SIZE_OPTIONS;
  protected readonly lineHeightOptions = LINE_HEIGHT_OPTIONS;

  private readonly hostRef = inject(ElementRef<HTMLElement>);
  private readonly rawState = useEditorState(this.editor, menuBarStateSelector);
  readonly state = computed<MenuBarState>(() => this.rawState() ?? EMPTY_STATE);

  toggleFind(): void {
    this.findVisible.update((v) => !v);
  }

  toggleToc(): void {
    this.tocVisible.update((v) => !v);
  }

  toggleComments(): void {
    this.commentsVisible.update((v) => !v);
  }

  toggleInsertMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.insertOpen.update((v) => !v);
  }

  closeInsertMenu(): void {
    this.insertOpen.set(false);
  }

  onDocumentClick(event: MouseEvent): void {
    if (!this.insertOpen()) return;
    if (!this.hostRef.nativeElement.contains(event.target as Node)) {
      this.closeInsertMenu();
    }
  }

  run(command: string): void {
    const editor = this.editor();
    if (!editor) return;
    const chain = editor.chain().focus() as unknown as Record<
      string,
      () => { run: () => boolean }
    >;
    chain[command]?.().run();
  }

  runFromMenu(command: string): void {
    this.run(command);
    this.closeInsertMenu();
  }

  onStyleChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as BlockType;
    this.applyBlockType(value);
  }

  private applyBlockType(value: BlockType): void {
    const editor = this.editor();
    if (!editor) return;
    const chain = editor.chain().focus() as unknown as Record<
      string,
      (opts?: unknown) => { run: () => boolean }
    >;
    if (value === 'paragraph') {
      chain['setParagraph']?.().run();
    } else if (value.startsWith('h')) {
      const level = Number(value.slice(1)) as 1 | 2 | 3 | 4 | 5 | 6;
      chain['setHeading']?.({ level }).run();
    } else if (value === 'blockquote') {
      chain['toggleBlockquote']?.().run();
    } else if (value === 'codeBlock') {
      chain['toggleCodeBlock']?.().run();
    }
  }

  onFontFamilyChange(event: Event): void {
    this.applyTextStyle('FontFamily', (event.target as HTMLSelectElement).value || null);
  }

  onFontSizeChange(event: Event): void {
    this.applyTextStyle('FontSize', (event.target as HTMLSelectElement).value || null);
  }

  onLineHeightChange(event: Event): void {
    this.applyTextStyle('LineHeight', (event.target as HTMLSelectElement).value || null);
  }

  private applyTextStyle(
    suffix: 'FontFamily' | 'FontSize' | 'LineHeight',
    value: string | null,
  ): void {
    const editor = this.editor();
    if (!editor) return;
    const chain = editor.chain().focus() as unknown as Record<
      string,
      (value?: string) => { run: () => boolean }
    >;
    if (value) {
      chain[`set${suffix}`]?.(value).run();
    } else {
      chain[`unset${suffix}`]?.().run();
    }
  }

  insertTable(): void {
    const editor = this.editor();
    if (!editor) return;
    const chain = editor.chain().focus() as unknown as Record<
      string,
      (opts: { rows: number; cols: number; withHeaderRow: boolean }) => {
        run: () => boolean;
      }
    >;
    chain['insertTable']?.({ rows: 3, cols: 3, withHeaderRow: true }).run();
    this.closeInsertMenu();
  }

  setAlign(value: 'left' | 'center' | 'right' | 'justify'): void {
    const editor = this.editor();
    if (!editor) return;
    const chain = editor.chain().focus() as unknown as Record<
      string,
      (value: string) => { run: () => boolean }
    >;
    chain['setTextAlign']?.(value).run();
  }
}
