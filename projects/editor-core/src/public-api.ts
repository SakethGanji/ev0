/*
 * Public API Surface of editor-core
 */

// Composite, all-in-one editor (recommended entry point)
export {
  TipEditorComponent,
  type TipEditorCounts,
} from './lib/tip-editor.component';
export {
  defaultExtensions,
  type DefaultExtensionsOptions,
} from './lib/editor-defaults';
export {
  TipCommentsStore,
  type TipComment,
  type TipThread,
} from './lib/comments-store';
export { TipCommentsSidebarComponent } from './lib/tip-comments-sidebar.component';

// Hooks
export {
  useEditor,
  type UseEditorOptions,
  type UseEditorOptionsFactory,
} from './lib/use-editor';
export { useEditorState, type EditorStateSnapshot } from './lib/use-editor-state';

// Building-block components (for advanced custom layouts)
export { TipEditorContentComponent } from './lib/tip-editor-content.component';
export { MenuBarComponent } from './lib/menu-bar.component';
export { TipIconComponent, type IconName } from './lib/tip-icon.component';
export {
  TipColorPickerComponent,
  type ColorPickerMode,
} from './lib/tip-color-picker.component';
export { createDefaultDragHandleElement } from './lib/default-drag-handle';
export {
  TipTableOfContentsComponent,
  type TipTocAnchor,
} from './lib/tip-table-of-contents.component';
export {
  menuBarStateSelector,
  currentBlockType,
  type MenuBarState,
  type BlockType,
} from './lib/menu-bar-state';

// Export (download document in various formats)
export {
  downloadAs,
  downloadBlob,
  exportHtml,
  exportJson,
  exportText,
  exportMarkdown,
  exportDocx,
  exportPdf,
  EXPORT_FORMAT_DESCRIPTORS,
  type ExportFormat,
  type ExportFormatDescriptor,
} from './lib/export';
export { TipExportMenuComponent } from './lib/tip-export-menu.component';

// Import (parse a file and insert into editor)
export {
  detectImportFormat,
  fileToImportResult,
  importFile,
  insertImportedContent,
  textToHtml,
  DEFAULT_IMPORT_ACCEPT,
  type ImportFormat,
  type ImportResult,
  type InsertMode,
} from './lib/import';
export { TipImportButtonComponent } from './lib/tip-import-button.component';

// Image and video insert
export {
  Video,
  parseVideoUrl,
  type VideoOptions,
  type VideoProvider,
  type SetVideoOptions,
} from './lib/video-node';
export {
  TipMediaInsertComponent,
  type MediaKind,
  type MediaTab,
  type MediaUploadHandler,
} from './lib/tip-media-insert.component';

// Find and replace
export {
  FindReplace,
  findReplacePluginKey,
  getFindReplaceState,
  type FindReplaceMatch,
  type FindReplaceOptions,
  type FindReplaceState,
  type SetSearchPayload,
} from './lib/find-replace-extension';
export { TipFindReplaceComponent } from './lib/tip-find-replace.component';

// Comments (Google-Docs-style commenting extension)
export {
  CommentsExtension,
  commentsPluginKey,
  DEFAULT_COMMENT_STYLES,
  type CommentAnchorAttrs,
  type CommentPermissionHooks,
  type CommentsOptions,
  type CommentsPluginState,
  type CommentThreadSnapshot,
  type CommentThreadStatus,
  type CreateCommentEvent,
  type DeleteCommentEvent,
  type SelectedThreadChangeEvent,
  type SelectionThreadChangeEvent,
  type ThreadClickEvent,
  type UpdateCommentEvent,
} from './lib/comments-extension';
export {
  COMMENT_ANCHOR_MARK_NAME,
  findAllThreadRanges,
  findThreadRanges,
  getAllAnchoredThreadIds,
  getOrphanedThreadIds,
  getThreadIdsAtPos,
  getThreadIdsAtSelection,
  getThreadIdsInDocumentOrder,
  getThreadIdsInRange,
  hasThreadAnchor,
  scrollToThread,
  type CommentAnchorRange,
} from './lib/comments-helpers';
