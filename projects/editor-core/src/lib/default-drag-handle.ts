/**
 * Default drag-handle element factory.
 *
 * Pass this directly to the DragHandle extension's `render` option:
 *
 *   DragHandle.configure({ render: createDefaultDragHandleElement })
 *
 * The element is appended to the DOM by the extension and positioned via
 * floating-ui based on cursor proximity to editor blocks. We only need to
 * provide a styled, draggable element.
 */
export function createDefaultDragHandleElement(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'tip-drag-handle';
  el.setAttribute('draggable', 'true');
  el.setAttribute('aria-label', 'Drag to move block');
  el.style.cssText = [
    'display: flex',
    'align-items: center',
    'justify-content: center',
    'width: 18px',
    'height: 24px',
    'border-radius: 4px',
    'color: #94a3b8',
    'background: transparent',
    'cursor: grab',
    'transition: background 0.15s ease, color 0.15s ease',
    'user-select: none',
    '-webkit-user-select: none',
  ].join(';');

  el.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="9" cy="5" r="1"/>
      <circle cx="9" cy="12" r="1"/>
      <circle cx="9" cy="19" r="1"/>
      <circle cx="15" cy="5" r="1"/>
      <circle cx="15" cy="12" r="1"/>
      <circle cx="15" cy="19" r="1"/>
    </svg>
  `;

  el.addEventListener('mouseenter', () => {
    el.style.background = '#f1f5f9';
    el.style.color = '#475569';
  });
  el.addEventListener('mouseleave', () => {
    el.style.background = 'transparent';
    el.style.color = '#94a3b8';
  });
  el.addEventListener('mousedown', () => {
    el.style.cursor = 'grabbing';
  });
  el.addEventListener('mouseup', () => {
    el.style.cursor = 'grab';
  });

  return el;
}
