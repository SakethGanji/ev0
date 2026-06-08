import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  input,
  ViewEncapsulation,
  viewChild,
} from '@angular/core';
import type { Editor } from '@tiptap/core';

/**
 * Mounts a Tiptap editor's ProseMirror view DOM into a host element.
 * Equivalent to @tiptap/react's EditorContent.
 *
 * Uses ViewEncapsulation.None because the ProseMirror DOM is dynamically
 * inserted by Tiptap (outside Angular's template), so emulated style
 * isolation would not reach it. All selectors are scoped under
 * `.tip-editor-content` to prevent leakage.
 */
@Component({
  selector: 'tip-editor-content',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `<div #host class="tip-editor-content" [class.tip-editor-content--embedded]="embedded()"></div>`,
  styles: `
    .tip-editor-content {
      border: 1px solid #e2e8f0;
      border-radius: 0.6rem;
      padding: 1.5rem 1.75rem;
      background: #ffffff;
      min-height: 380px;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }
    .tip-editor-content:focus-within {
      border-color: #6366f1;
      box-shadow: 0 0 0 3px #eef2ff;
    }
    .tip-editor-content--embedded,
    .tip-editor-content--embedded:focus-within {
      border: none;
      border-radius: 0;
      box-shadow: none;
      padding: 1.75rem 2rem;
    }
    .tip-editor-content .ProseMirror {
      outline: none;
      min-height: 340px;
      color: #1e293b;
      font-family: Inter, ui-sans-serif, system-ui, sans-serif;
      font-size: 16px;
      line-height: 1.5;
    }
    .tip-editor-content .ProseMirror ::selection {
      background: rgba(99, 102, 241, 0.22);
      color: inherit;
    }
    .tip-editor-content .ProseMirror::selection,
    .tip-editor-content .ProseMirror *::selection {
      background: rgba(99, 102, 241, 0.22);
      color: inherit;
    }
    .tip-editor-content .ProseMirror > :first-child { margin-top: 0; }
    .tip-editor-content .ProseMirror > * + * { margin-top: 0.75em; }
    .tip-editor-content .ProseMirror p { margin: 0; }

    .tip-editor-content .ProseMirror ul,
    .tip-editor-content .ProseMirror ol {
      padding-left: 1.5rem;
      margin: 0.75rem 0;
    }
    .tip-editor-content .ProseMirror ul { list-style: disc; }
    .tip-editor-content .ProseMirror ol { list-style: decimal; }
    .tip-editor-content .ProseMirror li { margin: 0.2rem 0; }
    .tip-editor-content .ProseMirror li p { margin: 0; }

    .tip-editor-content .ProseMirror h1,
    .tip-editor-content .ProseMirror h2,
    .tip-editor-content .ProseMirror h3,
    .tip-editor-content .ProseMirror h4,
    .tip-editor-content .ProseMirror h5,
    .tip-editor-content .ProseMirror h6 {
      line-height: 1.25;
      font-weight: 600;
      letter-spacing: -0.01em;
      color: #0f172a;
      text-wrap: pretty;
    }
    .tip-editor-content .ProseMirror h1 { font-size: 1.875rem; margin: 2rem 0 0.75rem; }
    .tip-editor-content .ProseMirror h2 { font-size: 1.5rem; margin: 1.75rem 0 0.5rem; }
    .tip-editor-content .ProseMirror h3 { font-size: 1.25rem; margin: 1.5rem 0 0.5rem; }
    .tip-editor-content .ProseMirror h4 { font-size: 1.05rem; margin: 1.25rem 0 0.4rem; }
    .tip-editor-content .ProseMirror h5,
    .tip-editor-content .ProseMirror h6 { font-size: 0.95rem; color: #475569; margin: 1.1rem 0 0.3rem; }

    .tip-editor-content .ProseMirror code {
      background: #eef2ff;
      color: #4338ca;
      border-radius: 0.3rem;
      font-size: 0.85em;
      padding: 0.1em 0.35em;
      font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
    }
    .tip-editor-content .ProseMirror pre {
      background: #0f172a;
      color: #e2e8f0;
      border-radius: 0.5rem;
      font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
      margin: 1rem 0;
      padding: 0.85rem 1rem;
      overflow-x: auto;
      font-size: 0.85rem;
      line-height: 1.55;
    }
    .tip-editor-content .ProseMirror pre code {
      background: none;
      color: inherit;
      padding: 0;
      font-size: inherit;
    }
    .tip-editor-content .ProseMirror blockquote {
      border-left: 3px solid #6366f1;
      margin: 1.25rem 0;
      padding: 0.15rem 0 0.15rem 1rem;
      color: #475569;
      font-style: italic;
    }
    .tip-editor-content .ProseMirror hr {
      border: none;
      border-top: 1px solid #e2e8f0;
      margin: 1.75rem 0;
    }
    .tip-editor-content .ProseMirror s,
    .tip-editor-content .ProseMirror del {
      color: #94a3b8;
    }
    .tip-editor-content .ProseMirror strong { font-weight: 700; }
    .tip-editor-content .ProseMirror em { font-style: italic; }

    .tip-editor-content .ProseMirror img {
      max-width: 100%;
      height: auto;
      border-radius: 0.5rem;
      margin: 0.75rem 0;
      display: block;
    }
    .tip-editor-content .ProseMirror img.ProseMirror-selectednode {
      outline: 3px solid #6366f1;
    }
    .tip-editor-content .prose-mirror-dropcursor,
    .tip-editor-content .ProseMirror-dropcursor {
      background: #6366f1 !important;
    }
    /* Focus extension applies .has-focus; we leave it unstyled by default. */

    /* Invisible characters */
    .tip-editor-content .ProseMirror .Tiptap-invisible-character {
      color: #cbd5e1;
      pointer-events: none;
      user-select: none;
    }

    /* Task lists */
    .tip-editor-content .ProseMirror ul[data-type='taskList'] {
      list-style: none;
      padding: 0;
      margin: 0.75rem 0;
    }
    .tip-editor-content .ProseMirror ul[data-type='taskList'] li {
      display: flex;
      align-items: flex-start;
      gap: 0.55rem;
      margin: 0.25rem 0;
    }
    .tip-editor-content .ProseMirror ul[data-type='taskList'] li > label {
      flex: 0 0 auto;
      display: inline-flex;
      align-items: center;
      margin-top: 0.35em;
      user-select: none;
    }
    .tip-editor-content .ProseMirror ul[data-type='taskList'] li > label > input[type='checkbox'] {
      width: 16px;
      height: 16px;
      margin: 0;
      cursor: pointer;
      accent-color: #6366f1;
    }
    .tip-editor-content .ProseMirror ul[data-type='taskList'] li > div {
      flex: 1 1 auto;
      min-width: 0;
    }
    .tip-editor-content .ProseMirror ul[data-type='taskList'] li > div > p {
      margin: 0;
    }
    .tip-editor-content .ProseMirror ul[data-type='taskList'] li[data-checked='true'] > div > p {
      color: #94a3b8;
      text-decoration: line-through;
    }
    .tip-editor-content .ProseMirror ul[data-type='taskList'] ul[data-type='taskList'] {
      margin-left: 1.25rem;
    }

    /* Tables — Apple-Notes-style */
    .tip-editor-content .ProseMirror .tableWrapper {
      margin: 1rem 0;
      padding-bottom: 6px;
      border: 1px solid #e2e8f0;
      border-radius: 0.55rem;
      overflow-x: auto;
      overflow-y: hidden;
      background: #ffffff;
    }
    .tip-editor-content .ProseMirror table {
      border-collapse: separate;
      border-spacing: 0;
      table-layout: fixed;
      width: 100%;
      margin: 0;
      background: #ffffff;
    }
    .tip-editor-content .ProseMirror table td,
    .tip-editor-content .ProseMirror table th {
      position: relative;
      vertical-align: top;
      box-sizing: border-box;
      min-width: 80px;
      padding: 0.5rem 0.6rem;
      border-right: 1px solid #e2e8f0;
      border-bottom: 1px solid #e2e8f0;
      font-size: 0.92em;
      line-height: 1.5;
      transition: background-color 0.12s ease;
    }
    .tip-editor-content .ProseMirror table td:last-child,
    .tip-editor-content .ProseMirror table th:last-child {
      border-right: none;
    }
    .tip-editor-content .ProseMirror table tr:last-child td,
    .tip-editor-content .ProseMirror table tr:last-child th {
      border-bottom: none;
    }
    .tip-editor-content .ProseMirror table th {
      background: #f8fafc;
      font-weight: 600;
      color: #0f172a;
      text-align: left;
    }
    .tip-editor-content .ProseMirror table tbody tr:hover td:not(.selectedCell) {
      background: #fafbff;
    }
    .tip-editor-content .ProseMirror table p {
      margin: 0;
    }
    .tip-editor-content .ProseMirror table .selectedCell {
      background: #eef2ff;
      box-shadow: inset 0 0 0 2px #6366f1;
    }
    .tip-editor-content .ProseMirror table .column-resize-handle {
      position: absolute;
      right: -2px;
      top: 0;
      bottom: -1px;
      width: 4px;
      background: #6366f1;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.15s ease;
    }
    .tip-editor-content .ProseMirror table:hover .column-resize-handle,
    .tip-editor-content .ProseMirror.resize-cursor table .column-resize-handle {
      opacity: 0.5;
    }
    .tip-editor-content .ProseMirror.resize-cursor {
      cursor: col-resize;
    }
    .tip-editor-content .ProseMirror table .column-resize-handle:hover {
      opacity: 1;
    }

    /* Placeholder */
    .tip-editor-content .ProseMirror p.is-editor-empty:first-child::before {
      content: attr(data-placeholder);
      color: #94a3b8;
      float: left;
      height: 0;
      pointer-events: none;
    }
    .tip-editor-content .ProseMirror p.is-empty::before {
      content: attr(data-placeholder);
      color: #cbd5e1;
      float: left;
      height: 0;
      pointer-events: none;
    }
  `,
})
export class TipEditorContentComponent {
  readonly editor = input<Editor | null>(null);
  readonly embedded = input<boolean>(false);
  private readonly host = viewChild.required<ElementRef<HTMLElement>>('host');

  constructor() {
    effect(() => {
      const editor = this.editor();
      const host = this.host().nativeElement;
      if (!editor) return;
      const dom = editor.view.dom;
      if (dom.parentElement !== host) {
        dom.parentElement?.removeChild(dom);
        host.appendChild(dom);
      }
    });
  }
}
