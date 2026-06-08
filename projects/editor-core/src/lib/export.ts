import type { Editor } from '@tiptap/core';

export type ExportFormat = 'html' | 'json' | 'text' | 'markdown' | 'docx' | 'pdf';

export interface ExportFormatDescriptor {
  readonly format: ExportFormat;
  readonly extension: string;
  readonly mime: string;
  readonly label: string;
}

export const EXPORT_FORMAT_DESCRIPTORS: ReadonlyArray<ExportFormatDescriptor> = [
  { format: 'html', extension: 'html', mime: 'text/html', label: 'HTML' },
  { format: 'json', extension: 'json', mime: 'application/json', label: 'JSON' },
  { format: 'text', extension: 'txt', mime: 'text/plain', label: 'Plain text' },
  { format: 'markdown', extension: 'md', mime: 'text/markdown', label: 'Markdown' },
  {
    format: 'docx',
    extension: 'docx',
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    label: 'Word document',
  },
  { format: 'pdf', extension: 'pdf', mime: 'application/pdf', label: 'PDF (print)' },
];

export function exportHtml(editor: Editor): string {
  return editor.getHTML();
}

export function exportJson(editor: Editor): string {
  return JSON.stringify(editor.getJSON(), null, 2);
}

export function exportText(editor: Editor): string {
  return editor.getText();
}

export async function exportMarkdown(editor: Editor): Promise<string> {
  let TurndownService: any;
  try {
    // @ts-ignore — optional peer dep, resolved by consumer's bundler when used.
    const mod = await import(/* @vite-ignore */ /* webpackIgnore: true */ 'turndown');
    TurndownService = (mod as any).default ?? mod;
  } catch {
    throw new Error(
      'Markdown export requires the "turndown" package. Install: npm i turndown',
    );
  }
  const service = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
  });
  return service.turndown(editor.getHTML());
}

export async function exportDocx(editor: Editor, title?: string): Promise<Blob> {
  let asBlob: ((html: string) => Promise<Blob> | Blob) | undefined;
  try {
    // @ts-ignore — optional peer dep, resolved by consumer's bundler when used.
    const mod: any = await import(
      /* @vite-ignore */ /* webpackIgnore: true */ 'html-docx-js-typescript'
    );
    asBlob = mod.asBlob ?? mod.default?.asBlob ?? mod.default;
  } catch {
    throw new Error(
      'DOCX export requires the "html-docx-js-typescript" package. ' +
        'Install: npm i html-docx-js-typescript',
    );
  }
  if (typeof asBlob !== 'function') {
    throw new Error('html-docx-js-typescript did not export an asBlob() function.');
  }
  const safeTitle = escapeAttribute(title ?? 'Document');
  const html =
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${safeTitle}</title></head>` +
    `<body>${editor.getHTML()}</body></html>`;
  const result = await asBlob(html);
  return result instanceof Blob
    ? result
    : new Blob([result], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
}

export function exportPdf(editor: Editor, title?: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const safeTitle = escapeAttribute(title ?? 'Document');
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText =
    'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    throw new Error('Unable to access the print iframe document.');
  }
  doc.open();
  doc.write(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${safeTitle}</title>` +
      `<style>body{font-family:ui-sans-serif,system-ui,sans-serif;color:#0f172a;` +
      `padding:1.5rem;line-height:1.6;}img,video{max-width:100%;height:auto;}` +
      `table{border-collapse:collapse;}th,td{border:1px solid #cbd5e1;padding:.35rem .5rem;}` +
      `pre{background:#f1f5f9;padding:.75rem;border-radius:.4rem;overflow:auto;}` +
      `</style></head><body>${editor.getHTML()}</body></html>`,
  );
  doc.close();
  const win = iframe.contentWindow;
  if (!win) {
    document.body.removeChild(iframe);
    return;
  }
  const cleanup = () => {
    setTimeout(() => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 1000);
  };
  win.addEventListener('afterprint', cleanup, { once: true });
  // Some browsers don't fire afterprint reliably; fall back to a timeout.
  setTimeout(cleanup, 60_000);
  win.focus();
  win.print();
}

export function downloadBlob(content: Blob | string, filename: string, mime?: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const blob =
    content instanceof Blob
      ? content
      : new Blob([content], { type: mime ?? 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadAs(
  editor: Editor,
  format: ExportFormat,
  filename = 'document',
): Promise<void> {
  const base = stripExtension(filename) || 'document';
  switch (format) {
    case 'html':
      downloadBlob(exportHtml(editor), `${base}.html`, 'text/html');
      return;
    case 'json':
      downloadBlob(exportJson(editor), `${base}.json`, 'application/json');
      return;
    case 'text':
      downloadBlob(exportText(editor), `${base}.txt`, 'text/plain;charset=utf-8');
      return;
    case 'markdown': {
      const md = await exportMarkdown(editor);
      downloadBlob(md, `${base}.md`, 'text/markdown;charset=utf-8');
      return;
    }
    case 'docx': {
      const blob = await exportDocx(editor, base);
      downloadBlob(blob, `${base}.docx`);
      return;
    }
    case 'pdf':
      exportPdf(editor, base);
      return;
  }
}

function stripExtension(name: string): string {
  return name.replace(/\.[^/.]+$/, '');
}

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
