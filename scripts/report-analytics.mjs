#!/usr/bin/env node
// Cloudflare Web Analytics（RUM）から直近24時間のアクセス数を取得し、
// Discordに送信するための本文を組み立てて notify-discord.mjs へ渡すスクリプト。
//
// 実行前に以下を環境変数（または .env ファイル）で設定してください。
//   CLOUDFLARE_API_TOKEN   … Account Analytics: Read 権限を持つAPIトークン
//   CLOUDFLARE_ACCOUNT_ID  … CloudflareダッシュボードのアカウントID
//   CF_ANALYTICS_SITE_TAG  … src/site.config.ts の cfAnalyticsToken と同じ値（サイトトークン）
//
// 実行: node scripts/report-analytics.mjs
//       node scripts/report-analytics.mjs --dry-run   （Discordへは送らずコンソール出力のみ）

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

try {
  process.loadEnvFile();
} catch {
  // .envが無い場合はシェルの環境変数をそのまま使う
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NOTIFY_SCRIPT = path.join(__dirname, 'notify-discord.mjs');

const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CF_SITE_TAG = process.env.CF_ANALYTICS_SITE_TAG;
const GRAPHQL_URL = 'https://api.cloudflare.com/client/v4/graphql';

const QUERY = `
  query SiteAnalytics($accountTag: string!, $siteTag: string!, $since: Time!, $until: Time!) {
    viewer {
      accounts(filter: { accountTag: $accountTag }) {
        rumPageloadEventsAdaptiveGroups(
          limit: 1
          filter: { siteTag: $siteTag, datetime_geq: $since, datetime_lt: $until }
        ) {
          count
          sum {
            visits
          }
        }
      }
    }
  }
`;

function sendToDiscord(message) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [NOTIFY_SCRIPT, message], { stdio: 'inherit' });
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`notify-discord.mjs exited with code ${code}`))));
  });
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  const missing = ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID', 'CF_ANALYTICS_SITE_TAG'].filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error(`未設定の環境変数があります: ${missing.join(', ')}`);
    process.exit(1);
  }

  const until = new Date();
  const since = new Date(until.getTime() - 24 * 60 * 60 * 1000);

  let result;
  try {
    const res = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${CF_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: QUERY,
        variables: {
          accountTag: CF_ACCOUNT_ID,
          siteTag: CF_SITE_TAG,
          since: since.toISOString(),
          until: until.toISOString(),
        },
      }),
    });

    const json = await res.json();
    if (!res.ok || json.errors) {
      throw new Error(`Cloudflare GraphQL API error: ${res.status} ${JSON.stringify(json.errors ?? json)}`);
    }
    result = json.data?.viewer?.accounts?.[0]?.rumPageloadEventsAdaptiveGroups?.[0] ?? { count: 0, sum: { visits: 0 } };
  } catch (err) {
    const errMessage = `⚠️ アクセス数の取得に失敗しました: ${err.message}`;
    console.error(errMessage);
    if (!dryRun) await sendToDiscord(errMessage).catch((e) => console.error('Discord送信も失敗:', e.message));
    process.exit(1);
  }

  const pageviews = result.count ?? 0;
  const visits = result.sum?.visits ?? 0;
  const dateLabel = until.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });

  const message = [
    `📊 アクセス数レポート（${dateLabel} 直近24時間）`,
    `- ページビュー: ${pageviews.toLocaleString('ja-JP')}`,
    `- 訪問数: ${visits.toLocaleString('ja-JP')}`,
  ].join('\n');

  console.log(message);
  if (!dryRun) await sendToDiscord(message);
}

main().catch((err) => {
  console.error('report-analytics.mjs failed:', err);
  process.exit(1);
});
