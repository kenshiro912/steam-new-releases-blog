#!/usr/bin/env node
// Discord Webhookへメッセージを送信する共通スクリプト。
//
// 実行前に DISCORD_WEBHOOK_URL を環境変数（または .env ファイル）で設定してください。
// 実行: node scripts/notify-discord.mjs "送信したいメッセージ"
//       echo "本文" | node scripts/notify-discord.mjs   （標準入力からも受け付ける）

try {
  process.loadEnvFile();
} catch {
  // .envが無い場合はシェルの環境変数をそのまま使う
}

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const DISCORD_CONTENT_LIMIT = 2000;

async function readStdin() {
  if (process.stdin.isTTY) return '';
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf-8').trim();
}

async function main() {
  if (!WEBHOOK_URL) {
    console.error('DISCORD_WEBHOOK_URLが設定されていません（.envを確認してください）。');
    process.exit(1);
  }

  const argMessage = process.argv.slice(2).join(' ').trim();
  const message = argMessage || (await readStdin());

  if (!message) {
    console.error('送信するメッセージがありません（引数か標準入力で渡してください）。');
    process.exit(1);
  }

  const content = message.length > DISCORD_CONTENT_LIMIT
    ? message.slice(0, DISCORD_CONTENT_LIMIT - 1) + '…'
    : message;

  const res = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error(`Discordへの送信に失敗しました: ${res.status} ${res.statusText} ${body}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('notify-discord.mjs failed:', err);
  process.exit(1);
});
