import type { Editor, Extension } from '@tiptap/core';
import { CharacterCount } from '@tiptap/extension-character-count';
import DragHandle from '@tiptap/extension-drag-handle';
import FileHandler from '@tiptap/extension-file-handler';
import Image from '@tiptap/extension-image';
import InvisibleCharacters from '@tiptap/extension-invisible-characters';
import { ListKit } from '@tiptap/extension-list';
import { TableKit } from '@tiptap/extension-table';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyleKit } from '@tiptap/extension-text-style';
import { LineHeight } from '@tiptap/extension-text-style/line-height';
import Typography from '@tiptap/extension-typography';
import { Focus, Placeholder } from '@tiptap/extensions';
import StarterKit from '@tiptap/starter-kit';
import {
  CommentsExtension,
  type CommentsOptions,
} from './comments-extension';
import { TipCommentsStore } from './comments-store';
import { createDefaultDragHandleElement } from './default-drag-handle';
import { FindReplace } from './find-replace-extension';
import { Video } from './video-node';

export interface DefaultExtensionsOptions {
  /** Placeholder text shown in empty paragraphs / headings. */
  placeholder?: string;
  /** Soft character cap (informational). */
  characterLimit?: number | null;
  /**
   * Comments store the CommentsExtension wires into. When omitted, comments
   * still work in-memory but no consumer-visible source of truth exists.
   */
  commentsStore?: TipCommentsStore;
  /** Extra options passed to CommentsExtension.configure (merged over defaults). */
  commentsOptions?: Partial<CommentsOptions>;
}

/**
 * Returns the full set of Tiptap extensions powering `TipEditorComponent` —
 * formatting, lists, tables, alignment, typography, images/video, drag handle,
 * file paste/drop, character count, focus indicator, invisible characters,
 * find-and-replace, and comments. Exported so consumers can compose with
 * additional extensions or replace the defaults entirely.
 */
export function defaultExtensions(
  options: DefaultExtensionsOptions = {},
): Extension[] {
  const commentsBase: CommentsOptions = {
    stripOnPaste: true,
    showResolved: false,
    overlapClickBehavior: 'all',
  };
  if (options.commentsStore) {
    commentsBase.getThread = (id) => options.commentsStore!.getSnapshot(id);
    commentsBase.getThreads = () =>
      options.commentsStore!.threads().map((t) => ({
        id: t.id,
        status: t.status,
      }));
    commentsBase.onRemoveThread = (id) => options.commentsStore!.remove(id);
    commentsBase.onResolveThread = (id) =>
      options.commentsStore!.setStatus(id, 'resolved');
    commentsBase.onUnresolveThread = (id) =>
      options.commentsStore!.setStatus(id, 'open');
    commentsBase.onCreateComment = ({ threadId, body }) =>
      options.commentsStore!.addReply(threadId, body);
  }

  const characterCountExtension =
    options.characterLimit != null
      ? CharacterCount.configure({ limit: options.characterLimit })
      : CharacterCount;

  return [
    StarterKit.configure({
      dropcursor: { color: '#6366f1', width: 3 },
      // Avoid double-registration; ListKit owns these.
      bulletList: false,
      orderedList: false,
      listItem: false,
    }),
    ListKit,
    TextStyleKit,
    LineHeight,
    Placeholder.configure({
      placeholder: ({ node }) => {
        if (node.type.name === 'heading') return 'Heading';
        if (node.type.name === 'paragraph') {
          return options.placeholder ?? 'Write something …';
        }
        return '';
      },
      showOnlyCurrent: true,
      includeChildren: false,
    }),
    characterCountExtension,
    Image,
    Video,
    FindReplace,
    CommentsExtension.configure({
      ...commentsBase,
      ...(options.commentsOptions ?? {}),
    }),
    DragHandle.configure({ render: createDefaultDragHandleElement }),
    FileHandler.configure({
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      onPaste: (editor, files) => insertImagesFromFiles(editor, files),
      onDrop: (editor, files, pos) => insertImagesFromFiles(editor, files, pos),
    }),
    Focus.configure({ mode: 'deepest', className: 'has-focus' }),
    InvisibleCharacters.configure({ visible: false }),
    TableKit.configure({
      table: { resizable: true, HTMLAttributes: { class: 'tip-table' } },
    }),
    TextAlign.configure({ types: ['paragraph', 'heading'] }),
    Typography,
  ] as Extension[];
}

function insertImagesFromFiles(
  editor: Editor,
  files: File[],
  pos?: number,
): void {
  files.forEach((file) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result;
      if (typeof src !== 'string') return;
      if (pos !== undefined) {
        editor
          .chain()
          .insertContentAt(pos, { type: 'image', attrs: { src } })
          .focus()
          .run();
      } else {
        editor.chain().focus().setImage({ src }).run();
      }
    };
    reader.readAsDataURL(file);
  });
}
