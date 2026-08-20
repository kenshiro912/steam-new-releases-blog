---
description: Steam新作ゲーム速報ブログの定期更新手順。新規Steamゲームを検知し、記事化キューを処理してmainにpushする。4時間ごとの定期実行（cron）から呼び出される。ユーザーが「記事を更新して」「ブログを更新して」と言った場合にも使う。
disable-model-invocation: true
model: sonnet
effort: low
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
---

# ブログ定期更新手順

このリポジトリ（steam-new-releases-blog）の定期更新タスクを実行する。
記事の品質基準・テンプレート・NGテーマは `src/content/articles/` を扱う際に
`.claude/rules/articles.md` が自動的に読み込まれるので、そちらに従う。

## 手順

1. `git pull` で最新状態を取得する
2. `node scripts/check-new-steam-games.mjs` を実行する
   - 新規appidの検出・DLC/アダルトコンテンツの除外・開発元/発売元未記載の除外・重複排除を
     すべてこのスクリプトが行う（Claudeのトークンを消費しない）
   - STEAM_API_KEYが未設定、またはネットワークエラーでスクリプトが失敗した場合は、
     エラーメッセージ全文を報告して終了する（無理に続行しない）
   - 結果は `data/pending-games.json` に追記される
3. `data/pending-games.json` を読み、**先頭から `data/config.json` の `maxArticlesPerRun` 件まで**を処理する
   （超過分はキューに残し、次回実行に自動的に持ち越す。1回の実行で無理に全件処理しない）
4. 処理対象の各エントリについて、`.claude/rules/articles.md` のテンプレート・品質基準に従って
   `src/content/articles/<slug>.md` を作成する
   - 1記事につき一発生成・確定。下書き→推敲→再生成のような複数ターンの往復はしない
5. 記事を作成したエントリは `data/pending-games.json` から削除する
6. 変更を `git add` → コミット → `git push` する（Cloudflare Pagesがpushを検知して自動デプロイする）

## 厳守ルール

- 読み書きするファイルは `data/pending-games.json`・生成する記事Markdown・`data/seen-appids.json` に限定する。
  無関係なファイルの探索やリポジトリ全体の走査はしない
- ローカルビルド（`npm run build`）はこのタスクでは実行しない。ビルド・デプロイはpush後にCloudflare Pages側で自動的に行われる
- 新規ゲームが検知されない、または `pending-games.json` が空の場合は、何もコミットせずに終了してよい
- 同一runで例外・エラーが発生した場合は、そこまでの正常分のみコミットし、エラー内容をコミットメッセージかログに残す
