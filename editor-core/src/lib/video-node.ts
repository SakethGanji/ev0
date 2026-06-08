import { mergeAttributes, Node } from '@tiptap/core';

export type VideoProvider = 'file' | 'youtube' | 'vimeo' | 'url';

export interface VideoOptions {
  HTMLAttributes: Record<string, unknown>;
  defaultWidth: number | string | null;
  defaultHeight: number | string | null;
}

export interface SetVideoOptions {
  src: string;
  provider?: VideoProvider;
  width?: number | string | null;
  height?: number | string | null;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    video: {
      setVideo: (options: SetVideoOptions) => ReturnType;
      setVideoEmbed: (options: { url: string }) => ReturnType;
    };
  }
}

const YOUTUBE_PATTERNS: ReadonlyArray<RegExp> = [
  /(?:youtube\.com\/watch\?(?:.*&)?v=|youtube\.com\/embed\/|youtu\.be\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/,
];
const VIMEO_PATTERN = /vimeo\.com\/(?:video\/)?(\d+)/;

export function parseVideoUrl(url: string): { provider: VideoProvider; embedUrl: string } {
  for (const pattern of YOUTUBE_PATTERNS) {
    const match = url.match(pattern);
    if (match) {
      return {
        provider: 'youtube',
        embedUrl: `https://www.youtube.com/embed/${match[1]}`,
      };
    }
  }
  const vimeoMatch = url.match(VIMEO_PATTERN);
  if (vimeoMatch) {
    return {
      provider: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
    };
  }
  return { provider: 'url', embedUrl: url };
}

/**
 * Tiptap node for video content. Renders as `<video>` for file/URL sources and
 * as `<iframe>` for YouTube/Vimeo embeds. Block-level, draggable, atomic.
 */
export const Video = Node.create<VideoOptions>({
  name: 'video',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,
  marks: '',
  isolating: true,

  addOptions() {
    return {
      HTMLAttributes: {},
      defaultWidth: 640,
      defaultHeight: 360,
    };
  },

  addAttributes() {
    return {
      src: { default: null },
      provider: { default: 'file' },
      width: { default: null },
      height: { default: null },
      controls: { default: true },
      title: { default: null },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'iframe[data-tip-video]',
        getAttrs: (node) => {
          const el = node as HTMLElement;
          return {
            src: el.getAttribute('src'),
            provider: el.getAttribute('data-tip-video'),
            width: el.getAttribute('width'),
            height: el.getAttribute('height'),
          };
        },
      },
      {
        tag: 'video[src]',
        getAttrs: (node) => {
          const el = node as HTMLVideoElement;
          return {
            src: el.getAttribute('src'),
            provider: 'file',
            width: el.getAttribute('width'),
            height: el.getAttribute('height'),
            controls: el.hasAttribute('controls'),
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const provider = (HTMLAttributes['provider'] as VideoProvider) ?? 'file';
    const src = HTMLAttributes['src'] as string | null;
    const width = HTMLAttributes['width'] ?? this.options.defaultWidth;
    const height = HTMLAttributes['height'] ?? this.options.defaultHeight;

    if (provider === 'youtube' || provider === 'vimeo') {
      return [
        'iframe',
        mergeAttributes(this.options.HTMLAttributes, {
          src,
          'data-tip-video': provider,
          frameborder: '0',
          allow:
            'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
          allowfullscreen: 'true',
          width,
          height,
        }),
      ];
    }

    return [
      'video',
      mergeAttributes(this.options.HTMLAttributes, {
        src,
        controls: HTMLAttributes['controls'] === false ? null : '',
        width,
        height,
      }),
    ];
  },

  addCommands() {
    return {
      setVideo:
        ({ src, provider = 'file', width = null, height = null }) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { src, provider, width, height },
          }),
      setVideoEmbed:
        ({ url }) =>
        ({ commands }) => {
          const parsed = parseVideoUrl(url);
          return commands.insertContent({
            type: this.name,
            attrs: {
              src: parsed.embedUrl,
              provider: parsed.provider,
            },
          });
        },
    };
  },
});
