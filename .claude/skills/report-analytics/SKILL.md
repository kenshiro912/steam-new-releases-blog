---
description: サイトのアクセス数（Cloudflare Web Analytics）を集計してDiscordに送信する。1日1回程度の定期実行（cron）から呼び出される。ユーザーが「アクセス数を教えて」と言った場合にも使う。
disable-model-invocation: true
model: sonnet
effort: low
allowed-tools: Bash
---

# アクセス数レポート送信手順

`node scripts/report-analytics.mjs` を実行する。

- このスクリプトが Cloudflare Web Analytics（GraphQL Analytics API）から直近24時間の
  ページビュー・訪問数を取得し、Discordへの送信までを行う（Claudeのトークンを消費しない）
- `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` / `CF_ANALYTICS_SITE_TAG` /
  `DISCORD_WEBHOOK_URL` のいずれかが未設定、またはCloudflare APIがエラーを返した場合、
  スクリプトが標準エラーにエラー内容を出力して終了する。その内容をそのまま報告して終了する
  （無理にリトライしたり他の手段でアクセス数を調べようとしない）
- このタスクでは `data/`・`src/content/articles/` 等の探索・変更は一切行わない
