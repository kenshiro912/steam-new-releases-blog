# Steam新作ゲーム速報ブログ

このリポジトリは「Steamで新たに公開されたゲームのストアページ」を自動検知し、日本語の紹介記事を自動生成・公開するブログです。

- **定期更新の実行手順**: `.claude/skills/update-blog/SKILL.md`（`/update-blog`）にまとまっています。4時間ごと（1日6回）のcronから呼び出されます。手動更新を頼まれたときもこのスキルを使ってください
- **記事のテンプレート・品質基準・NGテーマ**: `.claude/rules/articles.md` に切り出してあります（`src/content/articles/` を扱う際に自動的に読み込まれます）
- **セキュリティレビュー**: 設定変更後や機微情報を扱った後は `repo-security-reviewer` サブエージェントを使ってください

## 常に守ること

- `.env`（`STEAM_API_KEY`）を含む秘密情報は絶対にコミットしない。`.claude/hooks/git-secret-guard.sh` がpush前に機械的にブロックするが、それに頼らず自分でも注意する
- ユーザーのメールアドレス等の個人情報を記事・コミットメッセージ・コミット内容に含めない
- 通常の定期更新タスクでは、読み書きするファイルを `data/pending-games.json`・生成する記事Markdown・`data/seen-appids.json` に限定する。無関係なファイルの探索やローカルビルド（`npm run build`）は行わない

## 補足: なぜこの構成か

- 新規検出・フィルタリング（DLC/アダルトコンテンツ/開発元未記載の除外）をスクリプト（`scripts/check-new-steam-games.mjs`）側に寄せているのは、Claudeのトークン消費を抑えるため
- `schedule`スキルのクラウドエージェントとして実行される想定のため、ローカルMacの起動状態に依存しない。ただしそのためにはこのリポジトリがGitHubなどのリモートにあり、pushでCloudflare Pagesが自動デプロイされる状態になっている必要がある（README.md参照）
