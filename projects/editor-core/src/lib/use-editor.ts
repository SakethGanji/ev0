import {
  afterNextRender,
  DestroyRef,
  inject,
  PLATFORM_ID,
  signal,
  type Signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Editor, type EditorOptions } from '@tiptap/core';

export type UseEditorOptions = Omit<Partial<EditorOptions>, 'element'>;
export type UseEditorOptionsFactory = () => UseEditorOptions;

/**
 * Creates a Tiptap Editor and exposes it as a Signal. SSR-safe: the editor
 * is constructed inside afterNextRender, so it only runs in the browser.
 * Disposed automatically when the host injection context is destroyed.
 *
 * Pass a factory function when options depend on signals/inputs that are
 * only bound after construction (e.g. component @Input signals).
 */
export function useEditor(
  options: UseEditorOptions | UseEditorOptionsFactory,
): Signal<Editor | null> {
  const editorRef = signal<Editor | null>(null);
  const destroyRef = inject(DestroyRef);
  const platformId = inject(PLATFORM_ID);

  if (isPlatformBrowser(platformId)) {
    afterNextRender(() => {
      const element = document.createElement('div');
      const resolved = typeof options === 'function' ? options() : options;
      const editor = new Editor({ ...resolved, element });
      editorRef.set(editor);
    });
  }

  destroyRef.onDestroy(() => {
    editorRef()?.destroy();
  });

  return editorRef.asReadonly();
}
