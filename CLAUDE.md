# 運用プレイブック（スケジュール実行エージェント向け）

このリポジトリは「Steamで新たに公開されたゲームのストアページ」を自動検知し、日本語の紹介記事を自動生成・公開するブログです。このファイルは、定期実行されるエージェント（および手動実行時）が毎回従う手順です。

**想定実行頻度: 4時間ごと（1日6回）**。実際のcronはClaude Codeの`schedule`スキルで別途有効化されます。

## 毎回の実行手順

1. `git pull` で最新状態を取得する
2. `node scripts/check-new-steam-games.mjs` を実行する
   - このスクリプトが新規appidの検出・DLC/アダルトコンテンツの除外・重複排除を全て行う（Claudeのトークンは消費しない）
   - 結果は `data/pending-games.json` に追記される。各エントリは `steamAppId, title, sourceUrl, price, tags, releaseDate, heroImage, shortDescription, aboutTheGame` を持つ
3. `data/pending-games.json` を読み、**先頭から `data/config.json` の `maxArticlesPerRun` 件まで**を処理する（超過分はキューに残し、次回実行に自動的に持ち越す。1回の実行で無理に全件処理しない）
4. 処理対象の各エントリについて、`src/content/articles/<slug>.md` を下記テンプレートで作成する
5. 記事を作成したエントリは `data/pending-games.json` から削除する
6. 変更を `git add` → コミット → `git push` する（Cloudflare Pagesがpushを検知して自動デプロイする）

## トークン消費を抑えるための厳守ルール

- 新規検出・フィルタリングの判断はスクリプトに任せ、Claude自身で追加のSteam APIやWebページを読みにいかない
- 1記事につき「一発生成・確定」とする。下書き→推敲→再生成のような複数ターンの往復はしない
- 読み書きするファイルは `data/pending-games.json`・生成する記事Markdown・このCLAUDE.mdに限定する。無関係なファイルの探索やリポジトリ全体の走査はしない
- ローカルビルド（`npm run build`）はこのエージェントの作業では実行しない。ビルド・デプロイはpush後にCloudflare Pages側で自動的に行われる
- `maxArticlesPerRun` の上限を必ず守る。新着が多い日でも一気に大量生成しない（キューに残った分は次回に回る）

## 記事テンプレート

```markdown
---
title: "(Steam上の原題)"
titleJa: "(日本語タイトル。原題が英語等で分かりやすい和訳がある場合のみ。無ければこの行は省略)"
steamAppId: 123456
sourceUrl: "https://store.steampowered.com/app/123456/"
descriptionJa: "(ゲームの説明文。英語等の場合は自然な日本語に翻訳する。shortDescription/aboutTheGameを元に、日本語として読みやすく整える)"
price: "¥1,980"
tags: ["Action", "Indie", "Co-op"]
audienceJa: "(AIによる「どんな人が好きか」分析。日本人読者に自然な日本語で、具体的に。例: 『じっくり探索するのが好きな人、レトロなドット絵に魅力を感じる人におすすめ』)"
releaseDate: "2026年8月20日"
heroImage: "https://cdn.akamai.steamstatic.com/steam/apps/123456/header.jpg"
pubDate: 2026-08-20
---
```

本文（frontmatter以下）は空でよい（記事ページは frontmatter の `descriptionJa` / `audienceJa` を表示するテンプレート構成のため）。

## 品質基準・トーン

- 本文はすべて自然な日本語にする（原文が英語等の場合は必ず翻訳する）
- 誇張・扇情的な煽り文句を避け、事実ベースで簡潔に書く
- 暴力表現・グロテスク表現があるゲームでも、過度に刺激的な描写は避けて淡々と紹介する
- `descriptionJa` は2〜4文程度、`audienceJa` は1〜2文程度を目安にする（記事を量産する前提のため簡潔さを優先）

## NGテーマ・停止条件

- アダルト/性的コンテンツは `scripts/check-new-steam-games.mjs` が自動除外する（`data/config.json` の `adultContentDescriptorIds` / `adultKeywords` で判定）。万一すり抜けたものに気づいた場合は記事化せずスキップし、`data/pending-games.json` から削除する
- Steamの `appdetails` が取得できない（非公開・地域制限等）ゲームはスキップする
- 同一runで例外・エラーが発生した場合は、そこまでの正常分のみコミットし、エラー内容をコミットメッセージかログに残す。無理に処理を続行しない

## 補足: なぜこの構成か

- 新規検出・フィルタリングをスクリプト側に寄せているのは、Claudeのトークン消費を抑えるため
- `schedule`スキルのクラウドエージェントとして実行される想定のため、ローカルMacの起動状態に依存しない。ただしそのためにはこのリポジトリがGitHubなどのリモートにあり、pushでCloudflare Pagesが自動デプロイされる状態になっている必要がある（README.md参照）
