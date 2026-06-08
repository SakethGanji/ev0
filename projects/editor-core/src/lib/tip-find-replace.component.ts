import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  input,
  model,
  output,
  signal,
  untracked,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { NgIf } from '@angular/common';
import type { Editor } from '@tiptap/core';
import { getFindReplaceState } from './find-replace-extension';
import { TipIconComponent } from './tip-icon.component';
import { useEditorState } from './use-editor-state';

interface FindReplaceCommands {
  setSearch?: (opts: {
    query: string;
    caseSensitive?: boolean;
    wholeWord?: boolean;
    regex?: boolean;
  }) => boolean;
  clearSearch?: () => boolean;
  nextMatch?: () => boolean;
  previousMatch?: () => boolean;
  replaceMatch?: (replacement: string) => boolean;
  replaceAllMatches?: (replacement: string) => boolean;
}

@Component({
  selector: 'tip-find-replace',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [NgIf, TipIconComponent],
  host: {
    '(document:keydown)': 'onShortcut($event)',
  },
  template: `
    <ng-container *ngIf="visible()">
      <div class="tip-find-replace" role="dialog" aria-label="Find and replace">
        <div class="tip-find-replace__row">
          <input
            #queryInput
            class="tip-find-replace__input"
            type="text"
            placeholder="Find"
            [value]="query()"
            (input)="onQueryInput($event)"
            (keydown.enter)="next($event)"
            (keydown.shift.enter)="prev($event)"
          />
          <span class="tip-find-replace__count">{{ countLabel() }}</span>
          <button
            type="button"
            class="tip-find-replace__btn"
            (click)="prev()"
            [disabled]="matchCount() === 0"
            title="Previous match (Shift+Enter)"
            aria-label="Previous match"
          ><tip-icon name="chevron-up" /></button>
          <button
            type="button"
            class="tip-find-replace__btn"
            (click)="next()"
            [disabled]="matchCount() === 0"
            title="Next match (Enter)"
            aria-label="Next match"
          ><tip-icon name="chevron-down" /></button>
          <button
            type="button"
            class="tip-find-replace__btn"
            (click)="close()"
            title="Close (Esc)"
            aria-label="Close find and replace"
          ><tip-icon name="x" /></button>
        </div>

        <div *ngIf="showReplace()" class="tip-find-replace__row">
          <input
            class="tip-find-replace__input"
            type="text"
            placeholder="Replace"
            [value]="replacement()"
            (input)="onReplacementInput($event)"
            (keydown.enter)="replaceOne($event)"
          />
          <button
            type="button"
            class="tip-find-replace__action"
            (click)="replaceOne()"
            [disabled]="matchCount() === 0"
          >Replace</button>
          <button
            type="button"
            class="tip-find-replace__action"
            (click)="replaceAll()"
            [disabled]="matchCount() === 0"
          >Replace all</button>
        </div>

        <div class="tip-find-replace__row tip-find-replace__toggles">
          <button
            type="button"
            class="tip-find-replace__toggle"
            [class.is-active]="caseSensitive()"
            [attr.aria-pressed]="caseSensitive()"
            (click)="toggleCase()"
            title="Match case"
            aria-label="Match case"
          >Aa</button>
          <button
            type="button"
            class="tip-find-replace__toggle"
            [class.is-active]="wholeWord()"
            [attr.aria-pressed]="wholeWord()"
            (click)="toggleWholeWord()"
            title="Whole word"
            aria-label="Whole word"
          >⟨W⟩</button>
          <button
            type="button"
            class="tip-find-replace__toggle"
            [class.is-active]="regex()"
            [attr.aria-pressed]="regex()"
            (click)="toggleRegex()"
            title="Regular expression"
            aria-label="Regular expression"
          >.*</button>
          <span class="tip-find-replace__spacer"></span>
          <button
            type="button"
            class="tip-find-replace__toggle"
            [class.is-active]="showReplace()"
            [attr.aria-pressed]="showReplace()"
            (click)="toggleReplace()"
            title="Toggle replace"
            aria-label="Toggle replace"
          >↔</button>
        </div>
      </div>
    </ng-container>
  `,
  styles: `
    .tip-find-replace {
      display: flex; flex-direction: column; gap: 0.4rem;
      padding: 0.6rem; min-width: 320px;
      background: #ffffff;
      border: 1px solid #e2e8f0; border-radius: 0.55rem;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
      font-size: 0.78rem;
    }
    .tip-find-replace__row { display: flex; align-items: center; gap: 0.3rem; }
    .tip-find-replace__toggles { gap: 0.2rem; }
    .tip-find-replace__spacer { flex: 1; }
    .tip-find-replace__input {
      flex: 1; min-width: 0;
      height: 30px; padding: 0 0.55rem;
      border: 1px solid #e2e8f0; border-radius: 0.35rem;
      background: #ffffff; color: #0f172a; font: inherit; font-size: 0.78rem;
      transition: border-color 0.12s ease, box-shadow 0.12s ease;
    }
    .tip-find-replace__input:focus-visible {
      outline: none; border-color: #6366f1; box-shadow: 0 0 0 2px #eef2ff;
    }
    .tip-find-replace__count {
      min-width: 64px; padding: 0 0.4rem;
      color: #64748b; font-size: 0.72rem; text-align: right;
      white-space: nowrap;
    }
    .tip-find-replace__btn,
    .tip-find-replace__toggle,
    .tip-find-replace__action {
      display: inline-flex; align-items: center; justify-content: center;
      min-width: 30px; height: 30px; padding: 0 0.5rem;
      background: transparent; border: 1px solid transparent;
      border-radius: 0.35rem; color: #475569; cursor: pointer;
      font: inherit; font-size: 0.74rem;
      transition: background 0.12s ease, color 0.12s ease, border-color 0.12s ease;
    }
    .tip-find-replace__btn:hover:not(:disabled),
    .tip-find-replace__toggle:hover:not(:disabled),
    .tip-find-replace__action:hover:not(:disabled) {
      background: #f1f5f9; color: #0f172a;
    }
    .tip-find-replace__btn:disabled,
    .tip-find-replace__toggle:disabled,
    .tip-find-replace__action:disabled { cursor: not-allowed; opacity: 0.35; }
    .tip-find-replace__toggle.is-active {
      background: #0f172a; color: #ffffff; border-color: #0f172a;
    }
    .tip-find-replace__action {
      border-color: #e2e8f0; padding: 0 0.75rem;
      font-weight: 500;
    }
    .tip-find-replace__match {
      background: #fef08a; border-radius: 0.15rem;
    }
    .tip-find-replace__match--active {
      background: #f59e0b; color: #ffffff;
    }
  `,
})
export class TipFindReplaceComponent {
  readonly editor = input<Editor | null>(null);
  readonly captureShortcut = input<boolean>(true);
  readonly visible = model<boolean>(false);

  readonly opened = output<void>();
  readonly closed = output<void>();

  protected readonly query = signal('');
  protected readonly replacement = signal('');
  protected readonly caseSensitive = signal(false);
  protected readonly wholeWord = signal(false);
  protected readonly regex = signal(false);
  protected readonly showReplace = signal(false);

  private readonly queryInput =
    viewChild<ElementRef<HTMLInputElement>>('queryInput');

  private readonly pluginState = useEditorState(this.editor, ({ editor }) =>
    getFindReplaceState(editor),
  );

  protected readonly matchCount = computed(() => this.pluginState()?.matches.length ?? 0);
  protected readonly activeIndex = computed(() => this.pluginState()?.activeIndex ?? -1);
  protected readonly countLabel = computed(() => {
    if (!this.query()) return '';
    const total = this.matchCount();
    if (total === 0) return 'No results';
    return `${this.activeIndex() + 1} of ${total}`;
  });

  constructor() {
    // Push search settings to the plugin whenever the inputs change.
    effect(() => {
      const editor = this.editor();
      const query = this.query();
      const caseSensitive = this.caseSensitive();
      const wholeWord = this.wholeWord();
      const regex = this.regex();
      if (!editor) return;
      const commands = editor.commands as unknown as FindReplaceCommands;
      commands.setSearch?.({ query, caseSensitive, wholeWord, regex });
    });

    // Focus the query input on open; clear the search on close.
    effect(() => {
      const isVisible = this.visible();
      if (isVisible) {
        this.opened.emit();
        queueMicrotask(() => this.queryInput()?.nativeElement.focus());
      } else {
        const editor = untracked(this.editor);
        const commands = editor?.commands as unknown as FindReplaceCommands | undefined;
        commands?.clearSearch?.();
        this.closed.emit();
      }
    });
  }

  protected onShortcut(event: KeyboardEvent): void {
    if (!this.captureShortcut()) return;
    const mod = event.metaKey || event.ctrlKey;
    if (mod && event.key.toLowerCase() === 'f') {
      event.preventDefault();
      this.visible.set(true);
    } else if (event.key === 'Escape' && this.visible()) {
      this.close();
    }
  }

  protected onQueryInput(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  protected onReplacementInput(event: Event): void {
    this.replacement.set((event.target as HTMLInputElement).value);
  }

  protected toggleCase(): void { this.caseSensitive.update((v) => !v); }
  protected toggleWholeWord(): void { this.wholeWord.update((v) => !v); }
  protected toggleRegex(): void { this.regex.update((v) => !v); }
  protected toggleReplace(): void { this.showReplace.update((v) => !v); }

  protected next(event?: Event): void {
    event?.preventDefault();
    const editor = this.editor();
    if (!editor) return;
    (editor.commands as unknown as FindReplaceCommands).nextMatch?.();
  }

  protected prev(event?: Event): void {
    event?.preventDefault();
    const editor = this.editor();
    if (!editor) return;
    (editor.commands as unknown as FindReplaceCommands).previousMatch?.();
  }

  protected replaceOne(event?: Event): void {
    event?.preventDefault();
    const editor = this.editor();
    if (!editor) return;
    const commands = editor.commands as unknown as FindReplaceCommands;
    if (commands.replaceMatch?.(this.replacement())) {
      commands.nextMatch?.();
    }
  }

  protected replaceAll(): void {
    const editor = this.editor();
    if (!editor) return;
    (editor.commands as unknown as FindReplaceCommands).replaceAllMatches?.(
      this.replacement(),
    );
  }

  protected close(): void {
    this.visible.set(false);
  }
}
