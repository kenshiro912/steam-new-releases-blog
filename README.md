# Steam新作ゲーム速報

Steamで新たに公開されたゲームのストアページを自動検知し、日本語の紹介記事（タイトル・説明文の和訳・価格・「どんな人が好きか」分析）を自動生成・公開するブログです。

- フレームワーク: [Astro](https://astro.build/)（静的生成、JS最小）
- 検索: [Pagefind](https://pagefind.app/)（ビルド時に生成する静的なフリーワード検索）
- ホスティング: Cloudflare Pages を想定（無料枠、帯域無制限）
- 収益化: Google AdSense
- Steam監視: 公式 `ISteamApps/GetAppList` + `store.steampowered.com/api/appdetails` をポーリング（APIキー不要）

## ローカル開発

Node.jsは `nvm` で管理しています。

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use --lts

npm install
npm run dev       # http://localhost:4321
npm run build     # dist/ に静的出力 + Pagefindインデックス生成（postbuild）
npm run preview   # ビルド結果をローカルで確認（フリーワード検索の動作確認はこちらで）
```

## Steam新規ゲームの検知

事前に無料のSteam Web APIキーが必要です（Steamアカウントがあれば即時発行できます）。

1. https://steamcommunity.com/dev/apikey でキーを発行する
2. リポジトリ直下に `.env` ファイルを作成し、以下を記載する（`.env` はgit管理外です）

```
STEAM_API_KEY=あなたのキー
```

```bash
npm run check-steam
# または: node scripts/check-new-steam-games.mjs
```

- 初回実行時は、現在Steamに存在する全appidを「既知」として記録するだけで終了します（過去分を一斉に記事化しないためのブートストラップ）。
- 2回目以降は、新規appidを検出し、`data/config.json` の `maxNewAppsPerRun` 件まで詳細を取得して `data/pending-games.json` に追記します。
- DLC/ツール等（`type !== "game"`）とアダルト/性的コンテンツは自動的に除外されます（判定基準は `data/config.json`）。

記事の実際の執筆（日本語訳・「どんな人が好きか」分析・Markdown生成）は `CLAUDE.md` の手順に従って、Claudeが `data/pending-games.json` を元に行います。

## デプロイ（Cloudflare Pages）

1. このリポジトリをGitHubにpushする
2. Cloudflare Pagesで「Gitに接続」からこのリポジトリを選択
   - ビルドコマンド: `npm run build`
   - 出力ディレクトリ: `dist`
3. 初回デプロイ後、`astro.config.mjs` の `site` を実際の公開ドメインに更新してコミットする
4. 以降は `main` ブランチへのpushで自動的に再ビルド・再デプロイされます

## Google AdSense の有効化

1. サイトを一度公開し、Google AdSenseに申請・審査を通す
2. 審査後、`src/site.config.ts` の `adsenseEnabled` を `true` にし、`adsensePublisherId` に発行された `ca-pub-xxxxxxxxxxxxxxxx` を設定する
3. `public/ads.txt` に、AdSenseが指定する1行（`google.com, pub-xxxxxxxxxxxxxxxx, DIRECT, f08c47fec0942fa0`）を追記する

## 自動更新（定期実行）について

想定頻度は4時間ごと（1日6回）で、`CLAUDE.md` に運用ルールとして記載しています。実際のスケジュール（cron）は Claude Code の `schedule` スキルで別途有効化します。これは Anthropic のクラウド側で実行されるため、**ローカルMacが起動していなくても止まりません**。ただしそのためには以下が揃っている必要があります。

- このリポジトリがGitHub等のリモートにあり、スケジュールされたエージェントがpull/pushできること
- Cloudflare Pagesがそのリモートに接続され、pushで自動デプロイされる状態になっていること

有効化する際は、頻度・停止条件（エラー時の挙動など）をあらためて確認します。

## ディレクトリ構成

```
src/
  content/articles/    生成された記事（Markdown）
  content.config.ts    記事のスキーマ定義
  pages/
    index.astro         ホーム（新着一覧・タグクラウド・フリーワード検索）
    tags/[tag].astro     タグ別一覧
    games/[...slug].astro 記事詳細
  components/           ArticleCard, AdSlot
  layouts/               BaseLayout
  site.config.ts         サイト全体設定（タイトル・AdSense設定）
scripts/
  check-new-steam-games.mjs  Steam監視スクリプト
data/
  config.json            検知・生成の各種上限値
  seen-appids.json        既知appidの記録（初回実行で生成）
  pending-games.json      記事化待ちキュー（初回実行で生成）
CLAUDE.md                 自動更新エージェント向けの運用プレイブック
```

## 複数サイト展開について

現時点では単一サイト構成ですが、`src/site.config.ts` にサイト固有設定を集約しているため、将来的に別テーマのサイトを追加する際はこのリポジトリを複製し、`site.config.ts` とコンテンツディレクトリを差し替える形で展開できます。
