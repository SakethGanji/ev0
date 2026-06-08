import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  ViewEncapsulation,
} from '@angular/core';
import type { TipThread } from './comments-store';

@Component({
  selector: 'tip-comments-sidebar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [DatePipe],
  template: `
    <aside class="tip-comments" [class.tip-comments--embedded]="embedded()">
      <header class="tip-comments__header">
        <h3>Comments</h3>
        @if (showClose()) {
          <button
            type="button"
            class="tip-comments__close"
            (click)="closeClicked.emit()"
            aria-label="Hide comments"
            title="Hide comments"
          >×</button>
        }
      </header>

      @if (threads().length === 0) {
        <p class="tip-comments__empty">
          Select text in the editor, then click the <strong>Comment</strong>
          button that appears.
        </p>
      }

      @for (thread of threads(); track thread.id) {
        <article
          class="tip-comments__thread"
          [class.is-active]="selectedId() === thread.id"
          [class.is-resolved]="thread.status === 'resolved'"
          [class.is-orphan]="orphanedIds().includes(thread.id)"
          (click)="selectClicked.emit(thread.id)"
        >
          <div class="tip-comments__meta">
            <span class="tip-comments__author">{{ thread.createdBy }}</span>
            <span class="tip-comments__date">{{ thread.createdAt | date: 'short' }}</span>
            @if (orphanedIds().includes(thread.id)) {
              <span class="tip-comments__badge tip-comments__badge--orphan">orphaned</span>
            }
            @if (thread.status === 'resolved') {
              <span class="tip-comments__badge tip-comments__badge--resolved">resolved</span>
            }
          </div>

          @for (comment of thread.comments; track comment.id) {
            <div class="tip-comments__comment">
              <p>{{ comment.body }}</p>
              @if (!$first) {
                <small>{{ comment.author }} · {{ comment.createdAt | date: 'shortTime' }}</small>
              }
            </div>
          }

          @if (thread.status === 'open') {
            <div class="tip-comments__reply" (click)="$event.stopPropagation()">
              <textarea
                #replyInput
                placeholder="Reply…"
                rows="2"
                (keydown.meta.enter)="sendReply(thread.id, replyInput); $event.preventDefault()"
                (keydown.control.enter)="sendReply(thread.id, replyInput); $event.preventDefault()"
              ></textarea>
              <div class="tip-comments__actions">
                <button type="button" class="tip-comments__primary" (click)="sendReply(thread.id, replyInput)">Reply</button>
                <button type="button" (click)="resolveClicked.emit(thread.id)">Resolve</button>
                <button type="button" class="tip-comments__danger" (click)="removeClicked.emit(thread.id)">Delete</button>
              </div>
            </div>
          } @else if (thread.status === 'resolved') {
            <div class="tip-comments__actions" (click)="$event.stopPropagation()">
              <button type="button" (click)="unresolveClicked.emit(thread.id)">Reopen</button>
              <button type="button" class="tip-comments__danger" (click)="removeClicked.emit(thread.id)">Delete</button>
            </div>
          }
        </article>
      }
    </aside>
  `,
  styles: `
    tip-comments-sidebar { display: block; }
    .tip-comments {
      display: flex;
      flex-direction: column;
      gap: 0.55rem;
      padding: 0.85rem;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 0.7rem;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px rgba(15, 23, 42, 0.05);
      max-height: calc(100vh - 110px);
      overflow-y: auto;
      position: sticky;
      top: 1rem;
    }
    .tip-comments--embedded {
      background: transparent;
      border: none;
      border-radius: 0;
      box-shadow: none;
      padding: 0.6rem 0.7rem 0.85rem;
      max-height: none;
      position: static;
    }
    .tip-comments__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 0.55rem;
      border-bottom: 1px solid #e2e8f0;
    }
    .tip-comments__header h3 {
      margin: 0;
      font-size: 0.95rem;
      font-weight: 600;
      color: #0f172a;
    }
    .tip-comments__header-actions { display: inline-flex; gap: 0.3rem; align-items: center; }
    .tip-comments__add {
      background: #6366f1;
      color: white;
      border: 0;
      padding: 0.35rem 0.7rem;
      border-radius: 0.35rem;
      font-size: 0.74rem;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.12s ease;
    }
    .tip-comments__add:hover:not(:disabled) { background: #4f46e5; }
    .tip-comments__add:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      background: #cbd5e1;
    }
    .tip-comments__close {
      width: 26px;
      height: 26px;
      border-radius: 0.35rem;
      background: transparent;
      border: 0;
      color: #94a3b8;
      cursor: pointer;
      font-size: 1.2rem;
      line-height: 1;
      transition: background 0.12s ease, color 0.12s ease;
    }
    .tip-comments__close:hover { background: #f1f5f9; color: #0f172a; }
    .tip-comments__empty {
      color: #94a3b8;
      font-size: 0.78rem;
      text-align: center;
      padding: 1rem 0.5rem;
      margin: 0;
      line-height: 1.5;
    }
    .tip-comments__empty strong { color: #475569; }
    .tip-comments__thread {
      padding: 0.6rem 0.7rem;
      border: 1px solid #e2e8f0;
      border-radius: 0.45rem;
      cursor: pointer;
      transition: border-color 0.12s ease, background 0.12s ease;
    }
    .tip-comments__thread:hover { border-color: #c7d2fe; background: #fafbff; }
    .tip-comments__thread.is-active {
      border-color: #6366f1;
      background: #eef2ff;
      box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.12);
    }
    .tip-comments__thread.is-resolved { opacity: 0.65; background: #f8fafc; }
    .tip-comments__thread.is-orphan {
      border-color: #fca5a5;
      background: #fef2f2;
    }
    .tip-comments__meta {
      display: flex;
      gap: 0.4rem;
      align-items: center;
      flex-wrap: wrap;
      margin-bottom: 0.45rem;
      font-size: 0.7rem;
    }
    .tip-comments__author { font-weight: 600; color: #0f172a; }
    .tip-comments__date { color: #94a3b8; }
    .tip-comments__badge {
      padding: 0.05rem 0.4rem;
      border-radius: 0.25rem;
      font-size: 0.62rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .tip-comments__badge--resolved { background: #dcfce7; color: #166534; }
    .tip-comments__badge--orphan { background: #fee2e2; color: #991b1b; }
    .tip-comments__comment { margin: 0.35rem 0; }
    .tip-comments__comment p {
      margin: 0;
      font-size: 0.82rem;
      color: #0f172a;
      line-height: 1.45;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    .tip-comments__comment small {
      color: #94a3b8;
      font-size: 0.66rem;
    }
    .tip-comments__reply {
      margin-top: 0.55rem;
      padding-top: 0.55rem;
      border-top: 1px dashed #e2e8f0;
    }
    .tip-comments__reply textarea {
      width: 100%;
      padding: 0.4rem 0.5rem;
      border: 1px solid #e2e8f0;
      border-radius: 0.35rem;
      font: inherit;
      font-size: 0.78rem;
      line-height: 1.4;
      resize: vertical;
      box-sizing: border-box;
      color: #0f172a;
    }
    .tip-comments__reply textarea:focus {
      outline: none;
      border-color: #6366f1;
      box-shadow: 0 0 0 2px #eef2ff;
    }
    .tip-comments__actions {
      display: flex;
      gap: 0.35rem;
      margin-top: 0.45rem;
    }
    .tip-comments__actions button {
      flex: 1;
      padding: 0.3rem 0.45rem;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 0.3rem;
      cursor: pointer;
      font-size: 0.7rem;
      color: #334155;
      font-weight: 500;
      transition: background 0.12s ease, border-color 0.12s ease;
    }
    .tip-comments__actions button:hover {
      background: #f1f5f9;
      border-color: #cbd5e1;
    }
    .tip-comments__actions .tip-comments__primary {
      background: #0f172a;
      color: white;
      border-color: #0f172a;
    }
    .tip-comments__actions .tip-comments__primary:hover {
      background: #1e293b;
      border-color: #1e293b;
    }
    .tip-comments__actions .tip-comments__danger { color: #b91c1c; }
    .tip-comments__actions .tip-comments__danger:hover {
      background: #fef2f2;
      border-color: #fecaca;
    }
  `,
})
export class TipCommentsSidebarComponent {
  readonly threads = input<readonly TipThread[]>([]);
  readonly orphanedIds = input<readonly string[]>([]);
  readonly selectedId = input<string | null>(null);
  readonly hasSelection = input<boolean>(false);
  readonly showClose = input<boolean>(false);
  readonly embedded = input<boolean>(false);

  readonly addClicked = output<void>();
  readonly closeClicked = output<void>();
  readonly selectClicked = output<string>();
  readonly replyClicked = output<{ threadId: string; body: string }>();
  readonly resolveClicked = output<string>();
  readonly unresolveClicked = output<string>();
  readonly removeClicked = output<string>();

  sendReply(threadId: string, textarea: HTMLTextAreaElement): void {
    const body = textarea.value.trim();
    if (!body) return;
    this.replyClicked.emit({ threadId, body });
    textarea.value = '';
  }
}
