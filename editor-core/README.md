# editor-core

A self-contained, Tiptap v3 based rich-text editor for Angular 20+ (standalone components, signals). Ships an all-in-one `<tip-editor>` component plus the building blocks (toolbar, content host, find/replace, comments, export, import, media insert, table-of-contents) so you can either drop in the bundle or assemble your own layout.

- **Angular 20+**, standalone, OnPush, signal-based inputs/outputs
- **Tiptap 3** under the hood (ProseMirror)
- **Zero internal cross-project imports** — copy `src/lib/` + `src/public-api.ts` anywhere and it just works once you install the peer deps below.

---

## Two ways to consume it

### 1. Copy-paste into another Angular app (fastest)

1. Copy `projects/editor-core/src/lib/` and `projects/editor-core/src/public-api.ts` into the destination project, e.g. `src/app/editor-core/`.
2. Rename `public-api.ts` → `index.ts` (or leave it; both work).
3. Install the peer deps (see below).
4. Import the component:

```ts
import { TipEditorComponent } from './editor-core';
```

No NgModule wiring — every component is standalone.

### 2. Build as an Angular library

From the workspace root:

```bash
ng build editor-core
```

Output goes to `dist/editor-core/`. Pack it (`npm pack`) and `npm install` the tarball in the destination project, then `import { TipEditorComponent } from 'editor-core'`.

---

## Required packages

These are declared as **peerDependencies** in `package.json` (Angular library convention — the host app installs them so there is exactly one copy of Angular and one copy of Tiptap at runtime).

### Required (always)

```bash
npm i \
  @tiptap/core \
  @tiptap/pm \
  @tiptap/starter-kit \
  @tiptap/extensions \
  @tiptap/extension-character-count \
  @tiptap/extension-drag-handle \
  @tiptap/extension-file-handler \
  @tiptap/extension-image \
  @tiptap/extension-invisible-characters \
  @tiptap/extension-list \
  @tiptap/extension-table \
  @tiptap/extension-text-align \
  @tiptap/extension-text-style \
  @tiptap/extension-typography
```

Angular itself (`@angular/common`, `@angular/core`) is assumed to already be in the host project.

### Optional (only if you use these features)

| Feature | Package |
|---|---|
| Markdown export (`exportMarkdown`) | `turndown` |
| DOCX export (`exportDocx`) | `html-docx-js-typescript` |
| Markdown import | `marked` |
| DOCX import | `mammoth` |

```bash
# Install only what you need:
npm i turndown html-docx-js-typescript marked mammoth
```

PDF export uses `window.print()` and needs no extra package.

> If a feature is left uninstalled, only the corresponding `export*`/`importFile` call throws — the rest of the editor is unaffected.

---

## Quick start

```ts
import { Component } from '@angular/core';
import { TipEditorComponent } from './editor-core'; // or 'editor-core' if installed

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [TipEditorComponent],
  template: `
    <tip-editor
      [content]="content"
      [characterLimit]="10000"
      filename="document"
      (editorReady)="onReady($event)"
    />
  `,
})
export class App {
  content = '<h2>Hello</h2><p>Start typing…</p>';
  onReady(editor: import('@tiptap/core').Editor) { /* … */ }
}
```

That single component renders the toolbar, content area, find/replace, table-of-contents, comments sidebar, footer, export menu, import button, and media-insert popovers.

---

## `<tip-editor>` inputs

| Input | Type | Default | Notes |
|---|---|---|---|
| `content` | `EditorOptions['content']` | `''` | HTML string or Tiptap JSON |
| `placeholder` | `string` | `'Write something …'` | |
| `filename` | `string` | `'document'` | Used by export menu |
| `importMode` | `'replace' \| 'insert'` | `'replace'` | |
| `characterLimit` | `number \| null` | `null` | Footer counter caps here |
| `wordsPerMinute` | `number` | `220` | Reading-time estimate |
| `imageUploadHandler` | `MediaUploadHandler \| null` | `null` | Hook for custom upload |
| `videoUploadHandler` | `MediaUploadHandler \| null` | `null` | |
| `initialThreads` | `readonly TipThread[]` | `[]` | Seed comments store |
| `commentsAuthor` | `string` | `'You'` | Author label on new comments |
| `showExport` / `showImport` / `showImage` / `showVideo` / `showFind` / `showToc` / `showComments` / `showFooter` | `boolean` | `true` | Feature toggles |

## `<tip-editor>` outputs

| Output | Payload |
|---|---|
| `editorReady` | `Editor` (Tiptap instance, once initialised) |
| `countsChange` | `{ characters, words, readingTime }` |
| `threadsChange` | `readonly TipThread[]` |

---

## Public API surface

Exported from `public-api.ts`:

**All-in-one**
- `TipEditorComponent`, `TipEditorCounts`
- `TipCommentsStore`, `TipComment`, `TipThread`
- `TipCommentsSidebarComponent`
- `defaultExtensions(opts)` — the Tiptap extension stack used inside `<tip-editor>`

**Hooks (signal-based)**
- `useEditor(optionsFactory)` → `Signal<Editor | null>`
- `useEditorState(editorSignal, selector)` → reactive snapshot

**Building-block components** (compose your own layout)
- `TipEditorContentComponent` (selector `tip-editor-content`)
- `MenuBarComponent` (selector `tip-menu-bar`)
- `TipIconComponent`, `IconName`
- `TipColorPickerComponent`
- `TipTableOfContentsComponent`
- `createDefaultDragHandleElement()`
- `menuBarStateSelector`, `currentBlockType`, `MenuBarState`, `BlockType`

**Export**
- `exportHtml`, `exportJson`, `exportText`, `exportMarkdown`, `exportDocx`, `exportPdf`
- `downloadAs`, `downloadBlob`
- `EXPORT_FORMAT_DESCRIPTORS`, `ExportFormat`
- `TipExportMenuComponent`

**Import**
- `importFile`, `detectImportFormat`, `fileToImportResult`, `insertImportedContent`, `textToHtml`
- `DEFAULT_IMPORT_ACCEPT`, `ImportFormat`, `ImportResult`, `InsertMode`
- `TipImportButtonComponent`

**Media**
- `Video` (Tiptap node), `parseVideoUrl`, `VideoOptions`, `VideoProvider`, `SetVideoOptions`
- `TipMediaInsertComponent`, `MediaKind`, `MediaTab`, `MediaUploadHandler`

**Find & replace**
- `FindReplace` (Tiptap extension), `findReplacePluginKey`, `getFindReplaceState`
- `TipFindReplaceComponent`
- Types: `FindReplaceMatch`, `FindReplaceOptions`, `FindReplaceState`, `SetSearchPayload`

**Comments (Google-Docs-style)**
- `CommentsExtension`, `commentsPluginKey`, `DEFAULT_COMMENT_STYLES`
- Helpers: `findAllThreadRanges`, `findThreadRanges`, `getThreadIdsAtPos`, `getThreadIdsAtSelection`, `getThreadIdsInRange`, `getThreadIdsInDocumentOrder`, `getAllAnchoredThreadIds`, `getOrphanedThreadIds`, `hasThreadAnchor`, `scrollToThread`
- Constants/types: `COMMENT_ANCHOR_MARK_NAME`, `CommentAnchorAttrs`, `CommentAnchorRange`, `CommentPermissionHooks`, `CommentsOptions`, `CommentsPluginState`, `CommentThreadSnapshot`, `CommentThreadStatus`, plus the event types (`CreateCommentEvent`, `UpdateCommentEvent`, `DeleteCommentEvent`, `SelectedThreadChangeEvent`, `SelectionThreadChangeEvent`, `ThreadClickEvent`)

---

## Building a custom layout

Want your own chrome? Skip `<tip-editor>` and assemble the pieces:

```ts
import { Component } from '@angular/core';
import {
  useEditor,
  defaultExtensions,
  TipEditorContentComponent,
  MenuBarComponent,
  TipCommentsStore,
} from './editor-core';

@Component({
  standalone: true,
  imports: [TipEditorContentComponent, MenuBarComponent],
  providers: [TipCommentsStore],
  template: `
    <tip-menu-bar [editor]="editor()" />
    <tip-editor-content [editor]="editor()" />
  `,
})
export class MyEditor {
  private commentsStore = inject(TipCommentsStore);
  editor = useEditor(() => ({
    extensions: defaultExtensions({ commentsStore: this.commentsStore }),
    content: '<p>Hello</p>',
  }));
}
```

`TipCommentsStore` is **not** `providedIn: 'root'` — provide it at the component level (the `<tip-editor>` does this for you). One store per editor instance.

---

## File layout (copy-paste reference)

```
src/
├── public-api.ts            # barrel — keep this
└── lib/
    ├── tip-editor.component.ts            # all-in-one component
    ├── tip-editor-content.component.ts    # editor surface only
    ├── tip-comments-sidebar.component.ts
    ├── tip-comment-overlay.component.ts
    ├── tip-table-bubble.component.ts
    ├── tip-color-picker.component.ts
    ├── tip-export-menu.component.ts
    ├── tip-import-button.component.ts
    ├── tip-find-replace.component.ts
    ├── tip-media-insert.component.ts
    ├── tip-table-of-contents.component.ts
    ├── tip-icon.component.ts
    ├── menu-bar.component.ts
    ├── menu-bar-state.ts
    ├── editor-defaults.ts                 # defaultExtensions()
    ├── use-editor.ts                      # useEditor()
    ├── use-editor-state.ts                # useEditorState()
    ├── default-drag-handle.ts
    ├── export.ts
    ├── import.ts
    ├── video-node.ts
    ├── find-replace-extension.ts
    ├── comments-extension.ts
    ├── comments-helpers.ts
    └── comments-store.ts
```

Every file imports only from `@angular/*`, `@tiptap/*`, the optional doc-conversion libs, or sibling files via `./`. There are no out-of-folder imports.

---

## Versions tested against

- Angular `^20.3.0`
- Tiptap `^3.0.0`

See `package.json` for the exact peer-dependency ranges.
