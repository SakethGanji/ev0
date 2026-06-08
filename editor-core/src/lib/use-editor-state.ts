import { computed, DestroyRef, effect, inject, signal, type Signal } from '@angular/core';
import type { Editor } from '@tiptap/core';

export interface EditorStateSnapshot<E extends Editor = Editor> {
  editor: E;
}

/**
 * Subscribes to a Tiptap editor's transactions and recomputes a selector
 * whenever the editor state changes. Mirrors @tiptap/react's useEditorState.
 *
 * The returned signal is null until the editor is constructed.
 */
export function useEditorState<T>(
  editorSignal: Signal<Editor | null>,
  selector: (ctx: EditorStateSnapshot) => T,
): Signal<T | null> {
  const destroyRef = inject(DestroyRef);
  const tick = signal(0, { equal: () => false });

  let attachedEditor: Editor | null = null;
  let handler: (() => void) | null = null;

  const detach = () => {
    if (attachedEditor && handler) {
      attachedEditor.off('transaction', handler);
      attachedEditor.off('selectionUpdate', handler);
    }
    attachedEditor = null;
    handler = null;
  };

  effect(() => {
    const editor = editorSignal();
    if (editor === attachedEditor) return;
    detach();
    if (!editor) return;
    const onChange = () => tick.set(0);
    editor.on('transaction', onChange);
    editor.on('selectionUpdate', onChange);
    attachedEditor = editor;
    handler = onChange;
  });

  destroyRef.onDestroy(detach);

  return computed(() => {
    const editor = editorSignal();
    tick();
    if (!editor) return null;
    return selector({ editor });
  });
}
