# 作業引き継ぎメモ（一時ファイル）

> **注意**: このファイルは別セッション（PC）への作業引き継ぎ用の一時ファイルです。
> 該当作業が完了したら、このファイル自体を削除してコミット・pushしてください。

## 現在進めているタスク: アクセス数が伸びない問題の改善

原因調査の結果、以下の技術的な欠落を確認済み:

- サイトマップ無し
- OGP/Twitterカードmeta無し
- RSSフィード無し
- Google Search Console / Bing Webmaster Tools未登録
- 独自ドメイン未設定（`.pages.dev`のまま）

### 完了済み

1. **サイトマップ**: `@astrojs/sitemap`を導入し、`astro.config.mjs`に追加。
   `robots.txt`にも`Sitemap:`行を追加済み。コミット`00f24be`で`main`にpush済み。
   ビルド後 `dist/sitemap-index.xml` / `dist/sitemap-0.xml` が生成されることを確認済み。

### 進行中（ユーザーがPC作業で中断した箇所）

2. **Google Search Console**:
   - ユーザーが誤って「ドメイン」プロパティ（DNS TXTレコード確認が必要）で
     `steam-new-releases-blog.pages.dev` を登録しようとしていた
   - `.pages.dev`はCloudflareが管理するドメインのため、ユーザー側でDNSレコードを
     追加できず、この方法では確認できない
   - **正しい進め方**: 「URLプレフィックス」プロパティで
     `https://steam-new-releases-blog.pages.dev/` を登録し、確認方法は
     「HTMLタグ」を選ぶ
   - HTMLタグ（`<meta name="google-site-verification" content="...">`）が
     発行されたら、`src/layouts/BaseLayout.astro`の`<head>`内に追加してpushし、
     その後Search Console側で「確認」を押す
   - サイトマップ登録: 確認後、左メニュー「サイトマップ」から
     `sitemap-index.xml`（フルURL: `https://steam-new-releases-blog.pages.dev/sitemap-index.xml`）を送信

### 未着手

3. **Bing Webmaster Tools**（https://www.bing.com/webmasters ）
   - Google Search Consoleからのインポート機能が使えるので、2の後に行うと楽
   - サイトマップURLも同様に送信

4. **OGP / Twitterカードのmetaタグ追加**（`src/layouts/BaseLayout.astro`）
   - `og:title` / `og:description` / `og:image`（記事ページでは`heroImage`を使う）/
     `twitter:card` 等
   - Discord/X等にURLを貼った際のリンクプレビュー改善が目的

5. **RSSフィード追加**（`@astrojs/rss`導入想定）

## 関連ファイル

- `astro.config.mjs` — sitemap連携設定済み
- `public/robots.txt` — Sitemap行追加済み
- `src/layouts/BaseLayout.astro` — OGP追加・Search ConsoleのHTMLタグ追加先
- `README.md` — Discord通知・Cloudflare Analytics設定手順が記載済み（同じ調子でSEO設定手順も追記するとよい）
