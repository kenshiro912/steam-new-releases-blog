#!/usr/bin/env node
// Steamの新規ストアページ検知スクリプト。
//
// - 公式Web APIのみ使用:
//   - IStoreService/GetAppList/v1 : 全appidの一覧（要APIキー。取得は無料・即時 https://steamcommunity.com/dev/apikey ）
//   - store.steampowered.com/api/appdetails : 個別ゲームの詳細（キー不要）
// - 判定（新規検出・DLC/アダルト除外・重複排除）はこのスクリプト内で完結させ、
//   Claudeのトークンを一切消費しない（CLAUDE.md記載の運用ルールに対応）。
// - 初回実行時は「現在の全appid」をそのまま既知として記録するだけで終了する
//   （過去分を一斉に記事化しないためのブートストラップ処理）。
//
// 実行前に STEAM_API_KEY を環境変数（または .env ファイル）で設定してください。
// 実行: node scripts/check-new-steam-games.mjs

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

try {
  process.loadEnvFile();
} catch {
  // .envが無い場合はシェルの環境変数をそのまま使う
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const SEEN_PATH = path.join(DATA_DIR, 'seen-appids.json');
const PENDING_PATH = path.join(DATA_DIR, 'pending-games.json');
const CONFIG_PATH = path.join(DATA_DIR, 'config.json');

const STEAM_API_KEY = process.env.STEAM_API_KEY;
const APP_LIST_URL = 'https://api.steampowered.com/IStoreService/GetAppList/v1/';
const APP_DETAILS_URL = 'https://store.steampowered.com/api/appdetails';

async function readJson(filePath, fallback) {
  try {
    const raw = await readFile(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') return fallback;
    throw err;
  }
}

async function writeJson(filePath, data) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(text, max) {
  if (text.length <= max) return text;
  return text.slice(0, max).trim() + '…';
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatPrice(data) {
  if (data.is_free) return '無料';
  if (data.price_overview) {
    const yen = Math.round(data.price_overview.final / 100);
    return `¥${yen.toLocaleString('ja-JP')}`;
  }
  return '価格情報なし';
}

function isAdultContent(data, config) {
  // content_descriptors.ids は非公開の内部IDで、実データで検証した結果
  // 1/3/4 がヌーディティ・性的コンテンツ系、2 が暴力表現、5 は汎用の
  // "Mature Content" キャッチオール（単独では判定に使えない）と分かっている。
  const descriptorIds = data.content_descriptors?.ids ?? [];
  if (descriptorIds.some((id) => config.adultContentDescriptorIds.includes(id))) {
    return true;
  }
  // notes・ジャンル・カテゴリのテキストも補助的にキーワード判定する
  // （Valveはnotesを英語のまま返すことも多いため、日本語・英語両方のキーワードで見る）
  const haystack = [
    data.content_descriptors?.notes ?? '',
    ...(data.genres ?? []).map((g) => g.description),
    ...(data.categories ?? []).map((c) => c.description),
  ]
    .join(' ')
    .toLowerCase();
  return config.adultKeywords.some((kw) => haystack.includes(kw.toLowerCase()));
}

async function fetchAppList() {
  if (!STEAM_API_KEY) {
    throw new Error(
      'STEAM_API_KEY が設定されていません。https://steamcommunity.com/dev/apikey で無料のAPIキーを取得し、環境変数 STEAM_API_KEY か .env ファイルに設定してください。'
    );
  }

  const appIds = [];
  let lastAppId = 0;
  let haveMoreResults = true;

  while (haveMoreResults) {
    const url = new URL(APP_LIST_URL);
    url.searchParams.set('key', STEAM_API_KEY);
    url.searchParams.set('include_games', 'true');
    url.searchParams.set('include_dlc', 'false');
    url.searchParams.set('include_software', 'false');
    url.searchParams.set('include_videos', 'false');
    url.searchParams.set('include_hardware', 'false');
    url.searchParams.set('max_results', '50000');
    url.searchParams.set('last_appid', String(lastAppId));

    const res = await fetch(url);
    if (!res.ok) throw new Error(`GetAppList failed: ${res.status}`);
    const json = await res.json();
    const apps = json.response?.apps ?? [];
    for (const app of apps) appIds.push(app.appid);

    haveMoreResults = Boolean(json.response?.have_more_results);
    lastAppId = json.response?.last_appid ?? lastAppId;
  }

  return appIds;
}

async function fetchAppDetails(appid) {
  const url = `${APP_DETAILS_URL}?appids=${appid}&l=japanese&cc=jp`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = await res.json();
  const entry = json[String(appid)];
  if (!entry?.success) return null;
  return entry.data;
}

async function main() {
  const config = await readJson(CONFIG_PATH, {
    maxNewAppsPerRun: 25,
    requestDelayMs: 400,
    adultContentDescriptorIds: [2, 3],
    adultKeywords: [],
  });

  const seenState = await readJson(SEEN_PATH, { bootstrapped: false, seen: [] });
  const seenSet = new Set(seenState.seen);

  console.log('Steamの全appid一覧を取得中...');
  const allAppIds = await fetchAppList();
  console.log(`全${allAppIds.length}件のappidを取得しました。`);

  if (!seenState.bootstrapped) {
    console.log('初回実行のため、現在の全appidを既知として記録し、記事化は行いません。');
    await writeJson(SEEN_PATH, { bootstrapped: true, seen: allAppIds });
    console.log('ブートストラップ完了。次回実行から新規appidの検出を開始します。');
    return;
  }

  const newAppIds = allAppIds.filter((id) => !seenSet.has(id));
  console.log(`新規appid候補: ${newAppIds.length}件`);

  const batch = newAppIds.slice(0, config.maxNewAppsPerRun);
  const pending = await readJson(PENDING_PATH, []);
  const pendingAppIds = new Set(pending.map((p) => p.steamAppId));

  let adopted = 0;
  let skippedAdult = 0;
  let skippedNonGame = 0;
  let skippedNoData = 0;

  for (const appid of batch) {
    const data = await fetchAppDetails(appid);
    seenSet.add(appid); // 処理対象にした appid は結果に関わらず既知として記録し、再検出させない

    if (!data) {
      skippedNoData += 1;
      continue;
    }
    if (data.type !== 'game') {
      skippedNonGame += 1;
      continue;
    }
    if (isAdultContent(data, config)) {
      skippedAdult += 1;
      continue;
    }

    if (!pendingAppIds.has(appid)) {
      const tags = [
        ...new Set([
          ...(data.genres ?? []).map((g) => g.description),
          ...(data.categories ?? [])
            .map((c) => c.description)
            .filter((desc) => /single|multi|co-?op|オンライン|協力|マルチ|シングル/i.test(desc)),
        ]),
      ];

      pending.push({
        steamAppId: appid,
        title: data.name,
        sourceUrl: `https://store.steampowered.com/app/${appid}/`,
        price: formatPrice(data),
        tags,
        releaseDate: data.release_date?.date ?? undefined,
        heroImage: data.header_image ?? undefined,
        shortDescription: truncate(stripHtml(data.short_description ?? ''), 400),
        aboutTheGame: truncate(stripHtml(data.about_the_game ?? data.detailed_description ?? ''), 600),
        detectedAt: new Date().toISOString(),
      });
      adopted += 1;
    }

    await sleep(config.requestDelayMs);
  }

  await writeJson(SEEN_PATH, { bootstrapped: true, seen: [...seenSet] });
  await writeJson(PENDING_PATH, pending);

  console.log('--- 実行結果 ---');
  console.log(`採用（記事化キューに追加）: ${adopted}`);
  console.log(`除外（アダルト/性的コンテンツ）: ${skippedAdult}`);
  console.log(`除外（ゲーム以外: DLC/ツール等）: ${skippedNonGame}`);
  console.log(`除外（詳細取得失敗）: ${skippedNoData}`);
  console.log(`記事化待ちキュー総数: ${pending.length}件（data/pending-games.json）`);
}

main().catch((err) => {
  console.error('Steam監視スクリプトでエラーが発生しました:', err);
  process.exitCode = 1;
});
