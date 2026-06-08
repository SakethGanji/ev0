import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type IconName =
  | 'bold'
  | 'italic'
  | 'strike'
  | 'code'
  | 'eraser'
  | 'remove-formatting'
  | 'pilcrow'
  | 'list'
  | 'list-ordered'
  | 'code-block'
  | 'quote'
  | 'horizontal-rule'
  | 'corner-down-left'
  | 'undo'
  | 'redo'
  | 'baseline'
  | 'highlighter'
  | 'chevron-down'
  | 'eye'
  | 'eye-off'
  | 'list-checks'
  | 'table'
  | 'row-insert-above'
  | 'row-insert-below'
  | 'column-insert-left'
  | 'column-insert-right'
  | 'row-delete'
  | 'column-delete'
  | 'merge-cells'
  | 'split-cell'
  | 'table-header'
  | 'trash'
  | 'align-left'
  | 'align-center'
  | 'align-right'
  | 'align-justify'
  | 'download'
  | 'upload'
  | 'image'
  | 'video'
  | 'x'
  | 'chevron-up'
  | 'search'
  | 'plus'
  | 'panel-right'
  | 'indent-decrease'
  | 'indent-increase'
  | 'message-square';

/**
 * Inline SVG icons (Lucide-style, 24x24 viewBox, 2px stroke).
 * Self-contained — no external icon dep.
 */
@Component({
  selector: 'tip-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      @switch (name()) {
        @case ('bold') {
          <path d="M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8" />
        }
        @case ('italic') {
          <line x1="19" x2="10" y1="4" y2="4" />
          <line x1="14" x2="5" y1="20" y2="20" />
          <line x1="15" x2="9" y1="4" y2="20" />
        }
        @case ('strike') {
          <path d="M16 4H9a3 3 0 0 0-2.83 4" />
          <path d="M14 12a4 4 0 0 1 0 8H6" />
          <line x1="4" x2="20" y1="12" y2="12" />
        }
        @case ('code') {
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        }
        @case ('eraser') {
          <path d="M21 21H8a2 2 0 0 1-1.42-.587l-3.994-3.999a2 2 0 0 1 0-2.828l10-10a2 2 0 0 1 2.829 0l5.999 6a2 2 0 0 1 0 2.828L12.834 21" />
          <path d="m5.082 11.09 8.828 8.828" />
        }
        @case ('remove-formatting') {
          <path d="M4 7V4h16v3" />
          <path d="M5 20h6" />
          <path d="M13 4 8 20" />
          <path d="m15 15 5 5" />
          <path d="m20 15-5 5" />
        }
        @case ('pilcrow') {
          <path d="M13 4v16" />
          <path d="M17 4v16" />
          <path d="M19 4H9.5a4.5 4.5 0 0 0 0 9H13" />
        }
        @case ('list') {
          <path d="M3 12h.01" />
          <path d="M3 18h.01" />
          <path d="M3 6h.01" />
          <path d="M8 12h13" />
          <path d="M8 18h13" />
          <path d="M8 6h13" />
        }
        @case ('list-ordered') {
          <path d="M10 12h11" />
          <path d="M10 18h11" />
          <path d="M10 6h11" />
          <path d="M4 10h2" />
          <path d="M4 6h1v4" />
          <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
        }
        @case ('code-block') {
          <path d="m10 12-2 2 2 2" />
          <path d="m14 12 2 2-2 2" />
          <rect width="18" height="18" x="3" y="3" rx="2" />
        }
        @case ('quote') {
          <path d="M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z" />
          <path d="M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z" />
        }
        @case ('horizontal-rule') {
          <path d="M5 12h14" />
        }
        @case ('corner-down-left') {
          <polyline points="9 10 4 15 9 20" />
          <path d="M20 4v7a4 4 0 0 1-4 4H4" />
        }
        @case ('undo') {
          <path d="M9 14 4 9l5-5" />
          <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11" />
        }
        @case ('redo') {
          <path d="m15 14 5-5-5-5" />
          <path d="M20 9H9.5A5.5 5.5 0 0 0 4 14.5v0A5.5 5.5 0 0 0 9.5 20H13" />
        }
        @case ('baseline') {
          <path d="M4 20h16" />
          <path d="m6 16 6-12 6 12" />
          <path d="M8 12h8" />
        }
        @case ('highlighter') {
          <path d="m9 11-6 6v3h9l3-3" />
          <path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4" />
        }
        @case ('chevron-down') {
          <path d="m6 9 6 6 6-6" />
        }
        @case ('eye') {
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
          <circle cx="12" cy="12" r="3" />
        }
        @case ('eye-off') {
          <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
          <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
          <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
          <line x1="2" x2="22" y1="2" y2="22" />
        }
        @case ('list-checks') {
          <path d="m3 17 2 2 4-4" />
          <path d="m3 7 2 2 4-4" />
          <path d="M13 6h8" />
          <path d="M13 12h8" />
          <path d="M13 18h8" />
        }
        @case ('table') {
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <path d="M3 9h18" />
          <path d="M3 15h18" />
          <path d="M9 3v18" />
          <path d="M15 3v18" />
        }
        @case ('row-insert-above') {
          <rect width="18" height="6" x="3" y="15" rx="1" />
          <path d="M12 3v6" />
          <path d="M9 6h6" />
        }
        @case ('row-insert-below') {
          <rect width="18" height="6" x="3" y="3" rx="1" />
          <path d="M12 15v6" />
          <path d="M9 18h6" />
        }
        @case ('column-insert-left') {
          <rect width="6" height="18" x="15" y="3" rx="1" />
          <path d="M3 12h6" />
          <path d="M6 9v6" />
        }
        @case ('column-insert-right') {
          <rect width="6" height="18" x="3" y="3" rx="1" />
          <path d="M15 12h6" />
          <path d="M18 9v6" />
        }
        @case ('row-delete') {
          <rect width="18" height="6" x="3" y="9" rx="1" />
          <path d="m9 4 6 6" />
          <path d="m15 4-6 6" />
        }
        @case ('column-delete') {
          <rect width="6" height="18" x="9" y="3" rx="1" />
          <path d="m4 9 6 6" />
          <path d="m4 15 6-6" />
        }
        @case ('merge-cells') {
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <path d="M8 12h8" />
          <path d="m10 9-2 3 2 3" />
          <path d="m14 9 2 3-2 3" />
        }
        @case ('split-cell') {
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <path d="M12 3v18" />
        }
        @case ('table-header') {
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <path d="M3 9h18" />
          <rect x="3" y="3" width="18" height="6" fill="currentColor" opacity="0.15" stroke="none" />
        }
        @case ('trash') {
          <path d="M3 6h18" />
          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <path d="m19 6-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <line x1="10" x2="10" y1="11" y2="17" />
          <line x1="14" x2="14" y1="11" y2="17" />
        }
        @case ('align-left') {
          <line x1="21" x2="3" y1="6" y2="6" />
          <line x1="15" x2="3" y1="12" y2="12" />
          <line x1="17" x2="3" y1="18" y2="18" />
        }
        @case ('align-center') {
          <line x1="21" x2="3" y1="6" y2="6" />
          <line x1="17" x2="7" y1="12" y2="12" />
          <line x1="19" x2="5" y1="18" y2="18" />
        }
        @case ('align-right') {
          <line x1="21" x2="3" y1="6" y2="6" />
          <line x1="21" x2="9" y1="12" y2="12" />
          <line x1="21" x2="7" y1="18" y2="18" />
        }
        @case ('align-justify') {
          <line x1="21" x2="3" y1="6" y2="6" />
          <line x1="21" x2="3" y1="12" y2="12" />
          <line x1="21" x2="3" y1="18" y2="18" />
        }
        @case ('download') {
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" x2="12" y1="15" y2="3" />
        }
        @case ('upload') {
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" x2="12" y1="3" y2="15" />
        }
        @case ('image') {
          <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
          <circle cx="9" cy="9" r="2" />
          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
        }
        @case ('video') {
          <path d="m22 8-6 4 6 4V8Z" />
          <rect width="14" height="12" x="2" y="6" rx="2" ry="2" />
        }
        @case ('x') {
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        }
        @case ('chevron-up') {
          <path d="m18 15-6-6-6 6" />
        }
        @case ('search') {
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        }
        @case ('plus') {
          <path d="M5 12h14" />
          <path d="M12 5v14" />
        }
        @case ('panel-right') {
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <path d="M15 3v18" />
        }
        @case ('indent-decrease') {
          <path d="M21 4H8" />
          <path d="M21 9H8" />
          <path d="M21 14H8" />
          <path d="M21 19H8" />
          <polyline points="7 8 3 12 7 16" />
        }
        @case ('indent-increase') {
          <path d="M21 4H8" />
          <path d="M21 9H8" />
          <path d="M21 14H8" />
          <path d="M21 19H8" />
          <polyline points="3 8 7 12 3 16" />
        }
        @case ('message-square') {
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        }
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      line-height: 0;
    }
  `,
})
export class TipIconComponent {
  readonly name = input.required<IconName>();
  readonly size = input<number>(16);
}
