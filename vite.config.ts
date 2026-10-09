import { defineConfig } from 'vite';
import { renderStory } from './src/ui/markup.ts';
import { content } from './src/content/index.ts';

export default defineConfig({
  // Relative base: the build works from any sub-path (GitHub Pages, Vercel, Cloudflare Pages).
  base: './',
  plugins: [
    {
      name: 'story-html',
      transformIndexHtml(html) {
        return html
          .replace('<!--story-->', renderStory(content))
          .replaceAll('%TITLE%', content.meta.title)
          .replaceAll('%DESCRIPTION%', content.meta.description)
          .replace('%LANG%', content.lang);
      },
    },
  ],
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1200,
  },
});
