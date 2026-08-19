import { defineConfig } from 'astro/config';

// TODO: Cloudflare Pagesへの本番デプロイ時に、実際の公開ドメインへ更新してください。
// （サイトマップ・OGP等の絶対URL生成に使われます）
export default defineConfig({
  site: 'https://example.com',
  output: 'static',
});
