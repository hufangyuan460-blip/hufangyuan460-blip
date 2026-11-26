#!/usr/bin/env node
/**
 * Safe GitHub Issue Interaction Handler for Minecraft Oak Sign Guestbook
 * Reads ISSUE_TITLE, ISSUE_BODY, ISSUE_USER from environment variables
 * (never shell-interpolated!) to prevent command/script injection.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateAll } from './generate.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'profile.config.json'), 'utf8'));
const dataRel = config.guestbook?.dataFile || 'data/guestbook.json';
const dataPath = path.join(ROOT, dataRel);
const maxMessageLength = config.guestbook?.maxMessageLength || 36;

const rawTitle = (process.env.ISSUE_TITLE || '').trim().toLowerCase();
const rawBody = process.env.ISSUE_BODY || '';
const rawUser = (process.env.ISSUE_USER || 'adventurer').replace(/[^a-zA-Z0-9_-]/g, '') || 'adventurer';
const outputPath = process.env.GITHUB_OUTPUT || '';

function setOutput(key, value) {
  if (!outputPath) return;
  const delim = `EOF_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  fs.appendFileSync(outputPath, `${key}<<${delim}\n${value}\n${delim}\n`, 'utf8');
}

function sanitizeMessage(body) {
  const promptPrefixes = [
    /^在这里写下你想留的话（建议\d+字以内）[：:]\s*/i,
    /^write your message here.*?[：:]\s*/i,
  ];

  const lines = String(body)
    .split(/\r?\n/)
    .map((line) => {
      let cleaned = line.replace(/[\u0000-\u001F\u007F]/g, '').trim();
      for (const re of promptPrefixes) {
        cleaned = cleaned.replace(re, '').trim();
      }
      // Collapse consecutive spaces
      cleaned = cleaned.replace(/\s+/g, ' ');
      return cleaned;
    })
    .filter(Boolean);

  const firstLine = lines[0] || '路过主世界，留下一个像素脚印！';
  const chars = Array.from(firstLine);
  if (chars.length <= maxMessageLength) return firstLine;
  return chars.slice(0, maxMessageLength - 1).join('') + '…';
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

const data = fs.existsSync(dataPath)
  ? JSON.parse(fs.readFileSync(dataPath, 'utf8'))
  : { diamonds: 0, entries: [] };

if (!Array.isArray(data.entries)) data.entries = [];

if (rawTitle === 'mc:diamond') {
  data.diamonds = (Number(data.diamonds) || 0) + 1;
  fs.mkdirSync(path.dirname(dataPath), { recursive: true });
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2) + '\n', 'utf8');

  generateAll({ guestbookOnly: true });

  const reply = [
    `💎 叮当！收到来自 @${rawUser} 的一颗璀璨钻石！`,
    ``,
    `当前主世界橡木告示牌已累计收获 **${data.diamonds}** 颗钻石，主页已自动更新，感谢冒险者路过！`,
    ``,
    `*(Diamond received! Total diamonds on the Oak Sign: **${data.diamonds}**. Thank you, @${rawUser}!)*`,
  ].join('\n');

  setOutput('handled', 'true');
  setOutput('commit_msg', `feat(guestbook): +1 diamond from @${rawUser}`);
  setOutput('reply_body', reply);
  console.log(`Processed mc:diamond from @${rawUser}. Total diamonds: ${data.diamonds}`);
} else if (rawTitle === 'mc:sign') {
  const message = sanitizeMessage(rawBody);
  data.entries.unshift({
    user: rawUser,
    message,
    date: todayIsoDate(),
  });
  // Keep latest 50 records in JSON history; top 4 render on the Oak Sign
  data.entries = data.entries.slice(0, 50);

  fs.mkdirSync(path.dirname(dataPath), { recursive: true });
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2) + '\n', 'utf8');

  generateAll({ guestbookOnly: true });

  const reply = [
    `🪧 咔哒！已用发光墨囊将 @${rawUser} 的留言刻上主页橡木告示牌：`,
    ``,
    `> ${message}`,
    ``,
    `稍等几秒刷新主页就能看到你的足迹啦，祝你在方块世界玩得开心！`,
    ``,
    `*(Your note has been carved onto the Oak Sign! Refresh the profile in a few seconds to see it.)*`,
  ].join('\n');

  setOutput('handled', 'true');
  setOutput('commit_msg', `feat(guestbook): new oak sign note from @${rawUser}`);
  setOutput('reply_body', reply);
  console.log(`Processed mc:sign from @${rawUser}: "${message}"`);
} else {
  setOutput('handled', 'false');
  console.log(`Ignoring non-interactive issue title: "${rawTitle}"`);
}
