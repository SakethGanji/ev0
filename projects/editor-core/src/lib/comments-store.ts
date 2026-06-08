import { computed, Injectable, signal } from '@angular/core';
import type { CommentThreadSnapshot } from './comments-extension';

export interface TipComment {
  readonly id: string;
  readonly threadId: string;
  readonly body: string;
  readonly author: string;
  readonly createdAt: string;
}

export interface TipThread {
  readonly id: string;
  readonly status: 'open' | 'resolved' | 'deleted' | 'orphaned';
  readonly comments: readonly TipComment[];
  readonly createdAt: string;
  readonly createdBy: string;
}

let counter = 0;
const newId = (prefix: string): string =>
  `${prefix}_${++counter}_${Date.now().toString(36)}`;

/**
 * Default in-memory thread/comment store used by TipEditorComponent. Provided
 * at the component level (not root) so each editor has its own. Consumers can
 * read `threads()` for persistence or inject it via `viewChild` to drive their
 * own UI flows.
 */
@Injectable()
export class TipCommentsStore {
  private readonly threadsSig = signal<readonly TipThread[]>([]);
  readonly threads = this.threadsSig.asReadonly();
  readonly openThreads = computed(() =>
    this.threadsSig().filter((t) => t.status === 'open'),
  );
  readonly resolvedThreads = computed(() =>
    this.threadsSig().filter((t) => t.status === 'resolved'),
  );

  /** Author label written onto new comments when no explicit one is given. */
  defaultAuthor = 'You';

  newThreadId(): string {
    return newId('thread');
  }

  setThreads(threads: readonly TipThread[]): void {
    this.threadsSig.set(threads);
  }

  createThread(threadId: string, body: string, author?: string): TipThread {
    const now = new Date().toISOString();
    const thread: TipThread = {
      id: threadId,
      status: 'open',
      createdAt: now,
      createdBy: author ?? this.defaultAuthor,
      comments: [
        {
          id: newId('cmt'),
          threadId,
          body,
          author: author ?? this.defaultAuthor,
          createdAt: now,
        },
      ],
    };
    this.threadsSig.update((arr) => [...arr, thread]);
    return thread;
  }

  addReply(threadId: string, body: string, author?: string): void {
    this.threadsSig.update((arr) =>
      arr.map((t) =>
        t.id === threadId
          ? {
              ...t,
              comments: [
                ...t.comments,
                {
                  id: newId('cmt'),
                  threadId,
                  body,
                  author: author ?? this.defaultAuthor,
                  createdAt: new Date().toISOString(),
                },
              ],
            }
          : t,
      ),
    );
  }

  setStatus(threadId: string, status: TipThread['status']): void {
    this.threadsSig.update((arr) =>
      arr.map((t) => (t.id === threadId ? { ...t, status } : t)),
    );
  }

  remove(threadId: string): void {
    this.threadsSig.update((arr) => arr.filter((t) => t.id !== threadId));
  }

  getSnapshot(id: string): CommentThreadSnapshot | undefined {
    const t = this.threadsSig().find((x) => x.id === id);
    return t ? { id: t.id, status: t.status } : undefined;
  }
}
