import type { Editor } from '@tiptap/core';

export type ImportFormat = 'html' | 'markdown' | 'docx' | 'text' | 'json';
export type InsertMode = 'replace' | 'insert';

export interface ImportResult {
  format: ImportFormat;
  kind: 'html' | 'json';
  content: string | object;
}

const EXTENSION_TO_FORMAT: Readonly<Record<string, ImportFormat>> = {
  html: 'html',
  htm: 'html',
  md: 'markdown',
  markdown: 'markdown',
  mdx: 'markdown',
  docx: 'docx',
  txt: 'text',
  json: 'json',
};

export const DEFAULT_IMPORT_ACCEPT =
  '.html,.htm,.md,.markdown,.mdx,.docx,.txt,.json';

export function detectImportFormat(filename: string): ImportFormat | null {
  const ext = filename.toLowerCase().split('.').pop();
  if (!ext) return null;
  return EXTENSION_TO_FORMAT[ext] ?? null;
}

export async function fileToImportResult(
  file: File,
  format: ImportFormat = detectImportFormat(file.name) ?? 'text',
): Promise<ImportResult> {
  switch (format) {
    case 'html':
      return { format, kind: 'html', content: await file.text() };
    case 'text':
      return { format, kind: 'html', content: textToHtml(await file.text()) };
    case 'json': {
      const parsed = JSON.parse(await file.text());
      return { format, kind: 'json', content: parsed };
    }
    case 'markdown':
      return { format, kind: 'html', content: await markdownToHtml(await file.text()) };
    case 'docx':
      return { format, kind: 'html', content: await docxToHtml(await file.arrayBuffer()) };
  }
}

export async function importFile(
  editor: Editor,
  file: File,
  mode: InsertMode = 'replace',
): Promise<ImportResult> {
  const format = detectImportFormat(file.name);
  if (!format) {
    throw new Error(`Unsupported file type: ${file.name}`);
  }
  const result = await fileToImportResult(file, format);
  insertImportedContent(editor, result, mode);
  return result;
}

export function insertImportedContent(
  editor: Editor,
  result: ImportResult,
  mode: InsertMode = 'replace',
): void {
  const commands = editor.commands as unknown as {
    setContent: (content: unknown, emitUpdate?: boolean) => boolean;
    insertContent: (content: unknown) => boolean;
  };
  if (mode === 'replace') {
    commands.setContent(result.content as unknown, true);
  } else {
    commands.insertContent(result.content as unknown);
  }
}

export function textToHtml(text: string): string {
  return text
    .split(/\r?\n\r?\n+/)
    .map((para) => {
      const trimmed = para.trim();
      if (!trimmed) return '';
      return `<p>${escapeHtml(trimmed).replace(/\r?\n/g, '<br>')}</p>`;
    })
    .filter(Boolean)
    .join('');
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function markdownToHtml(md: string): Promise<string> {
  let marked: any;
  try {
    // @ts-ignore — optional peer dep, resolved by consumer's bundler when used.
    const mod = await import(/* @vite-ignore */ /* webpackIgnore: true */ 'marked');
    marked = (mod as any).marked ?? (mod as any).default ?? mod;
  } catch {
    throw new Error(
      'Markdown import requires the "marked" package. Install: npm i marked',
    );
  }
  const html = await marked.parse(md, { async: true });
  return typeof html === 'string' ? html : String(html);
}

async function docxToHtml(buffer: ArrayBuffer): Promise<string> {
  let mammoth: any;
  try {
    // @ts-ignore — optional peer dep, resolved by consumer's bundler when used.
    const mod = await import(/* @vite-ignore */ /* webpackIgnore: true */ 'mammoth');
    mammoth = (mod as any).default ?? mod;
  } catch {
    throw new Error(
      'DOCX import requires the "mammoth" package. Install: npm i mammoth',
    );
  }
  const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
  return result?.value ?? '';
}
