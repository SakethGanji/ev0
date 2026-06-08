import { Extension } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { Plugin, PluginKey, type EditorState } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export interface FindReplaceOptions {
  highlightClass: string;
  activeHighlightClass: string;
}

export interface FindReplaceMatch {
  from: number;
  to: number;
}

export interface FindReplaceState {
  query: string;
  caseSensitive: boolean;
  wholeWord: boolean;
  regex: boolean;
  matches: ReadonlyArray<FindReplaceMatch>;
  activeIndex: number;
}

export interface SetSearchPayload {
  query: string;
  caseSensitive?: boolean;
  wholeWord?: boolean;
  regex?: boolean;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    findReplace: {
      setSearch: (payload: SetSearchPayload) => ReturnType;
      clearSearch: () => ReturnType;
      nextMatch: () => ReturnType;
      previousMatch: () => ReturnType;
      replaceMatch: (replacement: string) => ReturnType;
      replaceAllMatches: (replacement: string) => ReturnType;
    };
  }
}

export const findReplacePluginKey = new PluginKey<FindReplaceState>('tipFindReplace');

const EMPTY_STATE: FindReplaceState = {
  query: '',
  caseSensitive: false,
  wholeWord: false,
  regex: false,
  matches: [],
  activeIndex: -1,
};

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildRegex(
  state: Pick<FindReplaceState, 'query' | 'caseSensitive' | 'wholeWord' | 'regex'>,
): RegExp | null {
  if (!state.query) return null;
  try {
    let pattern = state.regex ? state.query : escapeRegex(state.query);
    if (state.wholeWord) pattern = `\\b(?:${pattern})\\b`;
    const flags = state.caseSensitive ? 'g' : 'gi';
    return new RegExp(pattern, flags);
  } catch {
    return null;
  }
}

function findMatches(doc: ProseMirrorNode, regex: RegExp): FindReplaceMatch[] {
  const matches: FindReplaceMatch[] = [];
  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    const text = node.text;
    regex.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text)) !== null) {
      if (m[0].length === 0) {
        regex.lastIndex++;
        continue;
      }
      matches.push({ from: pos + m.index, to: pos + m.index + m[0].length });
    }
  });
  return matches;
}

function recompute(value: FindReplaceState, doc: ProseMirrorNode): FindReplaceState {
  const regex = buildRegex(value);
  if (!regex) return { ...value, matches: [], activeIndex: -1 };
  const matches = findMatches(doc, regex);
  if (matches.length === 0) return { ...value, matches: [], activeIndex: -1 };
  const activeIndex = Math.min(Math.max(value.activeIndex, 0), matches.length - 1);
  return { ...value, matches, activeIndex };
}

export const FindReplace = Extension.create<FindReplaceOptions>({
  name: 'findReplace',

  addOptions() {
    return {
      highlightClass: 'tip-find-replace__match',
      activeHighlightClass: 'tip-find-replace__match--active',
    };
  },

  addProseMirrorPlugins() {
    const options = this.options;
    return [
      new Plugin<FindReplaceState>({
        key: findReplacePluginKey,
        state: {
          init: () => EMPTY_STATE,
          apply(tr, value, _oldState, newState) {
            const meta = tr.getMeta(findReplacePluginKey) as Partial<FindReplaceState> | undefined;
            let next = value;
            if (meta) next = { ...value, ...meta };
            if (meta || tr.docChanged) next = recompute(next, newState.doc);
            return next;
          },
        },
        props: {
          decorations(state) {
            const data = findReplacePluginKey.getState(state);
            if (!data || data.matches.length === 0) return DecorationSet.empty;
            const decos = data.matches.map((match, i) =>
              Decoration.inline(match.from, match.to, {
                class:
                  i === data.activeIndex
                    ? `${options.highlightClass} ${options.activeHighlightClass}`
                    : options.highlightClass,
              }),
            );
            return DecorationSet.create(state.doc, decos);
          },
        },
      }),
    ];
  },

  addCommands() {
    return {
      setSearch:
        ({ query, caseSensitive, wholeWord, regex }) =>
        ({ tr, dispatch }) => {
          const meta: Partial<FindReplaceState> = { query };
          if (caseSensitive !== undefined) meta.caseSensitive = caseSensitive;
          if (wholeWord !== undefined) meta.wholeWord = wholeWord;
          if (regex !== undefined) meta.regex = regex;
          meta.activeIndex = 0;
          if (dispatch) dispatch(tr.setMeta(findReplacePluginKey, meta));
          return true;
        },

      clearSearch:
        () =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            dispatch(
              tr.setMeta(findReplacePluginKey, {
                query: '',
                matches: [],
                activeIndex: -1,
              }),
            );
          }
          return true;
        },

      nextMatch:
        () =>
        ({ state, tr, dispatch }) => {
          const data = findReplacePluginKey.getState(state);
          if (!data || data.matches.length === 0) return false;
          const idx = (data.activeIndex + 1) % data.matches.length;
          if (dispatch) dispatch(tr.setMeta(findReplacePluginKey, { activeIndex: idx }));
          return true;
        },

      previousMatch:
        () =>
        ({ state, tr, dispatch }) => {
          const data = findReplacePluginKey.getState(state);
          if (!data || data.matches.length === 0) return false;
          const idx = (data.activeIndex - 1 + data.matches.length) % data.matches.length;
          if (dispatch) dispatch(tr.setMeta(findReplacePluginKey, { activeIndex: idx }));
          return true;
        },

      replaceMatch:
        (replacement) =>
        ({ state, tr, dispatch }) => {
          const data = findReplacePluginKey.getState(state);
          if (!data || data.matches.length === 0 || data.activeIndex < 0) return false;
          const match = data.matches[data.activeIndex];
          if (dispatch) {
            tr.insertText(replacement, match.from, match.to);
            tr.setMeta(findReplacePluginKey, { activeIndex: data.activeIndex });
            dispatch(tr);
          }
          return true;
        },

      replaceAllMatches:
        (replacement) =>
        ({ state, tr, dispatch }) => {
          const data = findReplacePluginKey.getState(state);
          if (!data || data.matches.length === 0) return false;
          if (dispatch) {
            for (let i = data.matches.length - 1; i >= 0; i--) {
              const match = data.matches[i];
              tr.insertText(replacement, match.from, match.to);
            }
            tr.setMeta(findReplacePluginKey, { activeIndex: -1 });
            dispatch(tr);
          }
          return true;
        },
    };
  },
});

export function getFindReplaceState(editor: { state: EditorState }): FindReplaceState {
  return findReplacePluginKey.getState(editor.state) ?? EMPTY_STATE;
}
