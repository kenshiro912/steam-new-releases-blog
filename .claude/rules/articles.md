---
paths:
  - "src/content/articles/**"
---

# 記事Markdownのルール

`src/content/articles/<slug>.md` を作成・編集する際は以下に従う。

## テンプレート

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
japaneseSupport: "full"
pubDate: 2026-08-20
---
```

`japaneseSupport` は `scripts/check-new-steam-games.mjs` の `detectJapaneseSupport()` が
`pending-games.json` に既に算出済みの値をそのまま転記する（`"full"` = 字幕+フル音声対応、
`"text"` = 字幕/UIのみ対応、`"none"` = 日本語非対応）。Claude自身で判定し直さない。
このフィールド追加より前にキューされたエントリには値が無いことがあるが、その場合は
無理に推測せず `japaneseSupport` の行ごと省略してよい（スキーマ上optional）。

本文（frontmatter以下）は空でよい（記事ページは frontmatter の `descriptionJa` / `audienceJa` を表示するテンプレート構成のため）。

## 品質基準・トーン

- 本文はすべて自然な日本語にする（原文が英語等の場合は必ず翻訳する）
- 誇張・扇情的な煽り文句を避け、事実ベースで簡潔に書く
- 暴力表現・グロテスク表現があるゲームでも、過度に刺激的な描写は避けて淡々と紹介する
- `descriptionJa` は2〜4文程度、`audienceJa` は1〜2文程度を目安にする（記事を量産する前提のため簡潔さを優先）

## NGテーマ・停止条件

- アダルト/性的コンテンツは `scripts/check-new-steam-games.mjs` が自動除外する（`data/config.json` の
  `adultContentDescriptorIds` / `adultKeywords` で判定）。万一すり抜けたものに気づいた場合は記事化せずスキップし、
  `data/pending-games.json` から削除する
- 開発元・発売元が明記されていない出品もスクリプト側で自動除外される（`hasPublisherInfo()`）
- Steamの `appdetails` が取得できない（非公開・地域制限等）ゲームはスキップする

## ソート順

一覧ページ（ホーム・タグ別）は `pubDate` 降順、同日内は `steamAppId` 降順（ストアページ公開が新しい順の近似）でソートする。
ロジックは `src/lib/articles.ts` の `sortArticles()` に集約されているので、新しい一覧ページを追加する場合もこれを再利用する。
