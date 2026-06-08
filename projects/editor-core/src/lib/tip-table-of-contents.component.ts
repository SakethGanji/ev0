import { NgFor, NgIf } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  ViewEncapsulation,
} from '@angular/core';
import type { Editor } from '@tiptap/core';

/**
 * Minimal shape of a TableOfContents anchor item — keeps the library
 * free of a direct dependency on @tiptap/extension-table-of-contents types.
 * The consumer passes the `anchors` from the extension's onUpdate callback.
 */
export interface TipTocAnchor {
  id: string;
  textContent: string;
  level: number;
  isActive?: boolean;
  isScrolledOver?: boolean;
  itemIndex?: number;
  pos?: number;
}

@Component({
  selector: 'tip-toc',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [NgFor, NgIf],
  template: `
    <p *ngIf="anchors().length === 0; else hasAnchors" class="tip-toc__empty">No headings yet</p>
    <ng-template #hasAnchors>
      <nav class="tip-toc" aria-label="Table of contents">
        <a
          *ngFor="let anchor of anchors(); trackBy: trackByAnchor"
          class="tip-toc__item"
          [href]="'#' + anchor.id"
          [style.padding-left.rem]="0.6 + (anchor.level - 1) * 0.85"
          [class.is-active]="anchor.isActive"
          [class.is-scrolled-over]="anchor.isScrolledOver"
          (click)="onClick($event, anchor)"
        >{{ anchor.textContent || 'Untitled' }}</a>
      </nav>
    </ng-template>
  `,
  styles: `
    tip-toc {
      display: block;
      padding: 0.6rem 0.55rem;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 0.55rem;
      font-size: 0.82rem;
    }
    tip-toc .tip-toc__empty {
      margin: 0;
      padding: 0.3rem 0.55rem;
      color: #94a3b8;
      font-size: 0.82rem;
    }
    tip-toc .tip-toc {
      display: flex;
      flex-direction: column;
      gap: 0.05rem;
    }
    tip-toc .tip-toc__item {
      display: block;
      padding: 0.3rem 0.55rem;
      border-radius: 0.3rem;
      color: #475569;
      text-decoration: none;
      line-height: 1.35;
      transition: background 0.12s ease, color 0.12s ease;
      cursor: pointer;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    tip-toc .tip-toc__item:hover {
      background: #f1f5f9;
      color: #0f172a;
    }
    tip-toc .tip-toc__item.is-scrolled-over {
      color: #94a3b8;
    }
    tip-toc .tip-toc__item.is-active {
      background: #eef2ff;
      color: #4338ca;
      font-weight: 600;
    }
  `,
})
export class TipTableOfContentsComponent {
  readonly anchors = input<readonly TipTocAnchor[]>([]);
  readonly editor = input<Editor | null>(null);

  protected trackByAnchor(_: number, anchor: TipTocAnchor): string {
    return anchor.id;
  }

  protected onClick(event: MouseEvent, anchor: TipTocAnchor): void {
    event.preventDefault();
    const editor = this.editor();
    if (editor && typeof anchor.pos === 'number') {
      editor
        .chain()
        .focus()
        .setTextSelection(anchor.pos + 1)
        .run();
    }
    const target = document.getElementById(anchor.id);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
