import type { Editor } from '@tiptap/core';
import type { EditorStateSnapshot } from './use-editor-state';

type LooseChain = Record<string, (...args: unknown[]) => { run: () => boolean }>;

function canRun(editor: Editor, command: string, ...args: unknown[]): boolean {
  const chain = editor.can().chain() as unknown as LooseChain;
  return chain[command]?.(...args).run() ?? false;
}

export type BlockType =
  | 'paragraph'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'codeBlock'
  | 'blockquote'
  | 'other';

export function currentBlockType(editor: Editor): BlockType {
  if (editor.isActive('paragraph')) return 'paragraph';
  for (const level of [1, 2, 3, 4, 5, 6] as const) {
    if (editor.isActive('heading', { level })) return `h${level}` as BlockType;
  }
  if (editor.isActive('codeBlock')) return 'codeBlock';
  if (editor.isActive('blockquote')) return 'blockquote';
  return 'other';
}

/**
 * State selector for the MenuBar component. Mirrors the React reference exactly.
 * Each `canX` check uses a loose command lookup, so the selector compiles regardless
 * of which Tiptap extensions the consumer has installed.
 */
export function menuBarStateSelector(ctx: EditorStateSnapshot) {
  const { editor } = ctx;
  return {
    isBold: editor.isActive('bold'),
    canBold: canRun(editor, 'toggleBold'),
    isItalic: editor.isActive('italic'),
    canItalic: canRun(editor, 'toggleItalic'),
    isStrike: editor.isActive('strike'),
    canStrike: canRun(editor, 'toggleStrike'),
    isCode: editor.isActive('code'),
    canCode: canRun(editor, 'toggleCode'),
    canClearMarks: canRun(editor, 'unsetAllMarks'),

    blockType: currentBlockType(editor),

    isParagraph: editor.isActive('paragraph'),
    isHeading1: editor.isActive('heading', { level: 1 }),
    isHeading2: editor.isActive('heading', { level: 2 }),
    isHeading3: editor.isActive('heading', { level: 3 }),
    isHeading4: editor.isActive('heading', { level: 4 }),
    isHeading5: editor.isActive('heading', { level: 5 }),
    isHeading6: editor.isActive('heading', { level: 6 }),

    isBulletList: editor.isActive('bulletList'),
    isOrderedList: editor.isActive('orderedList'),
    isTaskList: editor.isActive('taskList'),
    isCodeBlock: editor.isActive('codeBlock'),
    isBlockquote: editor.isActive('blockquote'),

    canUndo: canRun(editor, 'undo'),
    canRedo: canRun(editor, 'redo'),

    fontFamily: readStringAttr(editor, 'fontFamily'),
    fontSize: readStringAttr(editor, 'fontSize'),
    lineHeight: readStringAttr(editor, 'lineHeight'),
    invisibleCharactersVisible: readInvisibleVisible(editor),

    isAlignLeft: editor.isActive({ textAlign: 'left' }),
    isAlignCenter: editor.isActive({ textAlign: 'center' }),
    isAlignRight: editor.isActive({ textAlign: 'right' }),
    isAlignJustify: editor.isActive({ textAlign: 'justify' }),
  };
}

function readStringAttr(editor: Editor, key: string): string | null {
  const attrs = editor.getAttributes('textStyle') as Record<string, unknown>;
  const value = attrs[key];
  return typeof value === 'string' ? value : null;
}

function readInvisibleVisible(editor: Editor): boolean {
  const storage = (editor.storage as unknown as Record<string, unknown>)[
    'invisibleCharacters'
  ] as { visibility: () => boolean } | undefined;
  return storage?.visibility() ?? false;
}

export type MenuBarState = ReturnType<typeof menuBarStateSelector>;
