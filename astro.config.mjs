import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://steam-new-releases-blog.pages.dev',
  output: 'static',
  integrations: [sitemap()],
});
