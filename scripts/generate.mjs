#!/usr/bin/env node
/**
 * Minecraft Pixel GitHub Profile Generator (Zero Dependencies)
 * Usage: node scripts/generate.mjs
 *
 * Reads ./profile.config.json and ./data/guestbook.json and generates:
 *  - assets/btn-zh-active.svg, btn-zh-idle.svg, btn-en-active.svg, btn-en-idle.svg
 *  - assets/btn-diamond-zh.svg, btn-diamond-en.svg, btn-sign-zh.svg, btn-sign-en.svg
 *  - assets/mc-banner-zh.svg, assets/mc-banner-en.svg
 *  - assets/mc-hotbar-zh.svg, assets/mc-hotbar-en.svg
 *  - assets/guestbook-zh.svg, assets/guestbook-en.svg
 *  - README.md, README.en.md
 *  - .github/workflows/snake.yml
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const configPath = path.join(ROOT, 'profile.config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const guestbookRel = config.guestbook?.dataFile || 'data/guestbook.json';
const guestbookPath = path.join(ROOT, guestbookRel);
const guestbook = fs.existsSync(guestbookPath)
  ? JSON.parse(fs.readFileSync(guestbookPath, 'utf8'))
  : { diamonds: 1, entries: [] };

export function escapeXml(str) {
  return String(str ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function truncateChars(str, maxLen) {
  const chars = Array.from(String(str ?? ''));
  if (chars.length <= maxLen) return chars.join('');
  return chars.slice(0, Math.max(1, maxLen - 1)).join('') + '…';
}

/**
 * Renders a 2D pixel grid into horizontal-run-merged <rect> SVG elements.
 */
function renderPixelGrid(grid, palette, offsetX, offsetY, pixelSize) {
  const rects = [];
  for (let row = 0; row < grid.length; row++) {
    const line = grid[row];
    let col = 0;
    while (col < line.length) {
      const ch = line[col];
      const fill = palette[ch];
      if (!fill) {
        col++;
        continue;
      }
      let span = 1;
      while (col + span < line.length && line[col + span] === ch) {
        span++;
      }
      const x = offsetX + col * pixelSize;
      const y = offsetY + row * pixelSize;
      const w = span * pixelSize;
      rects.push(`<rect x="${x}" y="${y}" width="${w}" height="${pixelSize}" fill="${fill}"/>`);
      col += span;
    }
  }
  return rects.join('');
}

// ============================================================================
// 1. Built-in 16x16 Minecraft Pixel Item Icon Library
// ============================================================================
const ICONS = {
  diamond_pickaxe: {
    palette: {
      K: '#0b1820',
      D: '#1997ad',
      C: '#22d3ee',
      L: '#a5f3fc',
      W: '#5c3a1e',
      B: '#855830',
      H: '#a67346',
    },
    grid: [
      '......KKKKK.....',
      '....KKLCCCDKK...',
      '...KLCCCDDDCDK..',
      '...KKKDDKKDCDK..',
      '..........KCCK..',
      '.........KCKCK..',
      '........KHBKCK..',
      '.......KHBK.KK..',
      '......KHBK......',
      '.....KHBK.......',
      '....KHBK........',
      '...KHBK.........',
      '..KHBK..........',
      '.KWBK...........',
      '.KWWK...........',
      '..KK............',
    ],
  },

  redstone: {
    palette: {
      K: '#2b0909',
      D: '#991b1b',
      R: '#dc2626',
      B: '#ef4444',
      L: '#fca5a5',
      W: '#fee2e2',
    },
    grid: [
      '................',
      '................',
      '.......KK.......',
      '......KRBK......',
      '....KKRBLRK.....',
      '...KRBLWBLRK....',
      '..KRBBRBBBRDK...',
      '..KDBBRBLBRDK...',
      '.KDRRBBBBBBRDK..',
      '.KRBLBRRBRBBRK..',
      '.KDRRDRRDRRRDK..',
      '..KDDDRRRRDDDKK.',
      '...KKKDDDDDDKK..',
      '......KKKKKK....',
      '................',
      '................',
    ],
  },

  command_block: {
    palette: {
      K: '#1f1410',
      D: '#8a5233',
      O: '#c27b4e',
      L: '#dea073',
      M: '#3b3742',
      I: '#181a24',
      C: '#22d3ee',
      G: '#4ade80',
      Y: '#facc15',
      R: '#f87171',
    },
    grid: [
      '.KKKKKKKKKKKKKK.',
      'KLLLLLLLLLLLLLLK',
      'KLOMOOOOOOOOOMLK',
      'KLOKKKKKKKKKKOLK',
      'KLOKMMMMMMMMKOLK',
      'KLOKMIIIIIIMKOLK',
      'KLOKMICIGIMMKOLK',
      'KLOKMIIIIIIMKOLK',
      'KLOKMIYIRIMMKOLK',
      'KLOKMIIIIIIMKOLK',
      'KLOKMMMMMMMMKOLK',
      'KLOKKKKKKKKKKOLK',
      'KLOMODDDDDDDMOKK',
      'KDDDDDDDDDDDDDDK',
      '.KKKKKKKKKKKKKK.',
      '................',
    ],
  },

  book_and_quill: {
    palette: {
      K: '#1b1410',
      F: '#f8fafc',
      S: '#cbd5e1',
      Q: '#94a3b8',
      D: '#52301a',
      B: '#7a4928',
      L: '#9e6238',
      P: '#f3e7c9',
      E: '#d4c39a',
      I: '#1e293b',
    },
    grid: [
      '..........KKKK..',
      '.........KFFFSK.',
      '........KFFFSSK.',
      '.......KFFSSQK..',
      '..KKKKKKFSSQK...',
      '.KLLLLLKFQQK....',
      '.KLBBBBKQKIK....',
      '.KLBBBBKIKBKK...',
      '.KLBBBLKKBBBK...',
      '.KLBBBBBBBBBK...',
      '.KLBDDDDDDDDK...',
      '.KDBPPPPPPPPK...',
      '.KDBPEEEEEEBK...',
      '..KDBBBBBDDK....',
      '...KKKKKKKK.....',
      '................',
    ],
  },

  ender_pearl: {
    palette: {
      K: '#041214',
      D: '#0b3b3c',
      T: '#0f766e',
      B: '#14b8a6',
      C: '#5eead4',
      L: '#ccfbf1',
    },
    grid: [
      '................',
      '.....KKKKKK.....',
      '...KKDDDDDDKK...',
      '..KDDTTTTTTDDK..',
      '..KDTTBBBBTTDK..',
      '.KDTBBCCCCBBTDK.',
      '.KDTBCCLLCCCTDK.',
      '.KDTBCCLLBBTTDK.',
      '.KDTBBBCCBBTTDK.',
      '.KDTTBBBBBBTTDK.',
      '..KDTTTTBBTTDK..',
      '..KDDTTTTTTDDK..',
      '...KKDDDDDDKK...',
      '.....KKKKKK.....',
      '................',
      '................',
    ],
  },

  nether_star: {
    palette: {
      K: '#1e1b2e',
      P: '#a855f7',
      C: '#67e8f9',
      Y: '#fef08a',
      W: '#ffffff',
    },
    grid: [
      '.......KK.......',
      '......KCCK......',
      '......KCYK......',
      '.....KCYWCK.....',
      '..KKKCYWWYCKKK..',
      '.KCCYYWWWWYYCCK.',
      '.KCYWWWWWWWWYCK.',
      '..KYWWWWWWWWYK..',
      '..KCYWWWWWWYCK..',
      '.KCCYYWWWWYYCCK.',
      '..KKKCPWWPCKKK..',
      '.....KCPWCK.....',
      '......KCPK......',
      '......KPPK......',
      '.......KK.......',
      '................',
    ],
  },

  crafting_table: {
    palette: {
      K: '#1f150e',
      L: '#d4a36a',
      W: '#b07b46',
      D: '#7d522b',
      S: '#57361a',
      G: '#3b2412',
      I: '#94a3b8',
      C: '#cbd5e1',
    },
    grid: [
      '.KKKKKKKKKKKKKK.',
      'KLLWLLWLLWLLWLLK',
      'KLGLLLGLLLGLLGLK',
      'KWWGWWGWWGWWGWWK',
      'KGGGGGGGGGGGGGGK',
      'KWWDDWWDDWWDDWWK',
      'KWICDWDDWDCIDWWK',
      'KWIDDWDDWDDIDWWK',
      'KWDDDWDDWDDDDWWK',
      'KWDSDWDDWDSDDWWK',
      'KWDSDWDDWDSDDWWK',
      'KWWDDWWDDWWDDWWK',
      'KSDDDDDDDDDDDDSK',
      'KSSSSSSSSSSSSSSK',
      '.KKKKKKKKKKKKKK.',
      '................',
    ],
  },

  lantern: {
    palette: {
      K: '#0f131a',
      I: '#475569',
      S: '#64748b',
      L: '#94a3b8',
      O: '#ea580c',
      A: '#f59e0b',
      Y: '#fde047',
      W: '#fefce8',
    },
    grid: [
      '......KKKK......',
      '.....KILLSK.....',
      '......KIIK......',
      '....KKKKKKKK....',
      '...KLLSSSSSSK...',
      '...KIIIIIIIIK...',
      '...KIAAYYAAIK...',
      '...KIAYWWYAIK...',
      '...KIAYWWYAIK...',
      '...KIOAYYAOIK...',
      '...KIOAAAAOIK...',
      '...KIIIIIIIIK...',
      '...KSSSSSSSSK...',
      '....KKKKKKKK....',
      '................',
      '................',
    ],
  },

  compass: {
    palette: {
      K: '#111622',
      D: '#475569',
      I: '#94a3b8',
      L: '#e2e8f0',
      F: '#1e293b',
      N: '#334155',
      R: '#ef4444',
      B: '#fca5a5',
      W: '#cbd5e1',
    },
    grid: [
      '.....KKKKKK.....',
      '...KKLLIIIDKK...',
      '..KLLDDDDDDIDK..',
      '.KLDFFFFFFFFIDK.',
      '.KDFNNFFFFRRFDK.',
      'KIDFNFNNFRBRFDK.',
      'KIDFFFFFRRFFFDK.',
      'KIDFFFFRWWFFFDK.',
      'KIDFFFRRWWFFFDK.',
      'KIDFFWWFFFFNFDK.',
      '.KDFWWFFFFNNFDK.',
      '.KLDFFFFFFFFIDK.',
      '..KDDDDDDDDDDK..',
      '...KKDDDDDDKK...',
      '.....KKKKKK.....',
      '................',
    ],
  },

  diamond_sword: {
    palette: {
      K: '#0b1820',
      D: '#0e7490',
      C: '#22d3ee',
      L: '#a5f3fc',
      W: '#5c3a1e',
      B: '#855830',
    },
    grid: [
      '............KKK.',
      '...........KLCK.',
      '..........KLCCK.',
      '.........KLCCDK.',
      '........KLCCDK..',
      '.......KLCCDK...',
      '......KLCCDK....',
      '..KK.KLCCDK.....',
      '..KCKLCCDK......',
      '...KCCCDK.......',
      '....KCCK........',
      '...KWBKCK.......',
      '..KWBK.KK.......',
      '.KWBK...........',
      '.KDK............',
      '..K.............',
    ],
  },

  emerald: {
    palette: {
      K: '#062618',
      D: '#15803d',
      G: '#22c55e',
      B: '#4ade80',
      L: '#bbf7d0',
      W: '#f0fdf4',
    },
    grid: [
      '................',
      '.....KKKKKK.....',
      '....KBBBBGGK....',
      '...KBLWBBGGDK...',
      '..KBLWBBBGGDDK..',
      '..KBBBBBBGGDDK..',
      '..KBBGGGBGGDDK..',
      '..KBBGGGGGGDDK..',
      '..KBBGGGGGGDDK..',
      '..KBBGGGGGDDDK..',
      '..KDBGGGGDDDDK..',
      '...KDDGGDDDDK...',
      '....KDDDDDDK....',
      '.....KKKKKK.....',
      '................',
      '................',
    ],
  },

  diamond: {
    palette: {
      K: '#082032',
      D: '#0284c7',
      C: '#22d3ee',
      B: '#67e8f9',
      L: '#cffafe',
      W: '#ffffff',
    },
    grid: [
      '................',
      '................',
      '....KKKKKKKK....',
      '...KLLBBBBCCK...',
      '..KLWBBBBCCDDK..',
      '.KLWBBBCCCCDDDK.',
      '.KBBBBCCCCCDDDK.',
      '.KBBCCCCCCDDDDK.',
      '..KCCCCCCDDDDK..',
      '...KCCCCDDDDK...',
      '....KCCDDDDK....',
      '.....KCDDDK.....',
      '......KDDK......',
      '.......KK.......',
      '................',
      '................',
    ],
  },
};

// Compact mini pixel sprites for HUD & buttons
const HEART_SPRITE = {
  palette: { K: '#1a090d', D: '#991b1b', R: '#ef4444', W: '#ffffff' },
  grid: [
    '.KK...KK.',
    'KRRK.KRRK',
    'KRWRKRRRK',
    'KRWRRRRRK',
    'KRRRRRRDK',
    '.KRRRRDK.',
    '..KRRDK..',
    '...KDK...',
    '....K....',
  ],
};

const ARMOR_SPRITE = {
  palette: { K: '#0f172a', D: '#0284c7', C: '#38bdf8', L: '#bae6fd', W: '#f0f9ff' },
  grid: [
    '.KK...KK.',
    'KLCK.KCLK',
    'KLWCKCCCK',
    'KCCCCCCDK',
    'KCCCCCCDK',
    '.KCCCCDK.',
    '.KCCCCDK.',
    '.KDDDDDK.',
    '..KKKKK..',
  ],
};

const MINI_DIAMOND = {
  palette: { K: '#071b2b', D: '#0284c7', C: '#22d3ee', B: '#67e8f9', L: '#a5f3fc', W: '#ffffff' },
  grid: [
    '..KKKKKK..',
    '.KLWBBCCK.',
    'KLWBBCCDDK',
    'KBBCCCDDDK',
    '.KCCCDDDK.',
    '..KCCDDK..',
    '...KDDK...',
    '....KK....',
  ],
};

const MINI_SIGN = {
  palette: { K: '#1f1208', L: '#d9b171', O: '#b3894b', D: '#7d5628', T: '#3d2410' },
  grid: [
    'KKKKKKKKKK',
    'KLLLLLLLLK',
    'KOOTTTTOOK',
    'KOOTTTTOOK',
    'KDDDDDDDDK',
    'KKKKKKKKKK',
    '....KDK...',
    '....KDK...',
  ],
};

// ============================================================================
// 2. Stone Brick Language Toggle Button Generator (104 x 34)
// ============================================================================
function generateLangButton({ label, active, isZh }) {
  const outerFrame = active ? '#0c1322' : '#0f131c';
  const baseFill = active ? '#38465e' : '#3a404c';
  const topBevel = active ? '#67e8f9' : '#586070';
  const topSubBevel = active ? '#38bdf8' : '#4b5363';
  const botBevel = active ? '#1e293b' : '#232830';
  const mortar = active ? '#263247' : '#2a2f3a';
  const speck = active ? '#495a78' : '#484f5e';
  const textFill = active ? '#ffffff' : '#cbd5e1';
  const shadowFill = active ? '#070b14' : '#161a22';
  const fontFamily = isZh
    ? "'Microsoft YaHei', 'PingFang SC', 'Noto Sans CJK SC', sans-serif"
    : "'Courier New', Consolas, 'Liberation Mono', monospace";
  const letterSpacing = isZh ? 2 : 2.5;
  const textX = active ? 58 : 52;

  const gem = active
    ? `
    <rect x="16" y="13" width="8" height="8" fill="#0e7490"/>
    <rect x="18" y="11" width="4" height="12" fill="#22d3ee"/>
    <rect x="14" y="15" width="12" height="4" fill="#22d3ee"/>
    <rect x="18" y="15" width="4" height="4" fill="#e0f2fe"/>
    <rect x="18" y="13" width="2" height="2" fill="#ffffff"/>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 104 34" width="104" height="34" shape-rendering="crispEdges" role="img" aria-label="${escapeXml(label)}">
  <path d="M2,0 H102 V2 H104 V32 H102 V34 H2 V32 H0 V2 H2 Z" fill="${outerFrame}"/>
  <rect x="2" y="2" width="100" height="30" fill="${baseFill}"/>
  <g fill="${mortar}">
    <rect x="2" y="16" width="100" height="2"/>
    <rect x="34" y="4" width="2" height="12"/>
    <rect x="72" y="4" width="2" height="12"/>
    <rect x="20" y="18" width="2" height="12"/>
    <rect x="56" y="18" width="2" height="12"/>
    <rect x="86" y="18" width="2" height="12"/>
  </g>
  <g fill="${speck}">
    <rect x="10" y="8" width="6" height="4"/>
    <rect x="44" y="10" width="8" height="4"/>
    <rect x="80" y="8" width="8" height="4"/>
    <rect x="28" y="22" width="8" height="4"/>
    <rect x="66" y="20" width="8" height="4"/>
  </g>
  <rect x="2" y="2" width="100" height="2" fill="${topBevel}"/>
  <rect x="2" y="4" width="100" height="2" fill="${topSubBevel}" opacity="0.55"/>
  <rect x="2" y="2" width="2" height="28" fill="${topSubBevel}" opacity="0.7"/>
  <rect x="2" y="30" width="100" height="2" fill="${botBevel}"/>
  <rect x="100" y="4" width="2" height="28" fill="${botBevel}"/>
  ${gem}
  <text x="${textX + 1.5}" y="22.5" text-anchor="middle" fill="${shadowFill}" font-family="${fontFamily}" font-size="14" font-weight="800" letter-spacing="${letterSpacing}" shape-rendering="geometricPrecision">${escapeXml(label)}</text>
  <text x="${textX}" y="21" text-anchor="middle" fill="${textFill}" font-family="${fontFamily}" font-size="14" font-weight="800" letter-spacing="${letterSpacing}" shape-rendering="geometricPrecision">${escapeXml(label)}</text>
</svg>
`;
}

// ============================================================================
// 3. Stone Brick Action Button Generator (176 x 38) — Diamond / Sign
// ============================================================================
function generateActionButton({ label, kind, isZh }) {
  const isDiamond = kind === 'diamond';
  const baseFill = isDiamond ? '#35455c' : '#4a3e35';
  const topBevel = isDiamond ? '#67e8f9' : '#fbbf24';
  const topSub = isDiamond ? '#22d3ee' : '#d97706';
  const botBevel = isDiamond ? '#1d2738' : '#2a211b';
  const mortar = isDiamond ? '#253245' : '#362c24';
  const speck = isDiamond ? '#465a78' : '#5e4f43';
  const textFill = isDiamond ? '#e0f2fe' : '#fef3c7';

  const sprite = isDiamond ? MINI_DIAMOND : MINI_SIGN;
  const iconSvg = renderPixelGrid(sprite.grid, sprite.palette, 16, 11, 2);

  const fontFamily = isZh
    ? "'Microsoft YaHei', 'PingFang SC', 'Noto Sans CJK SC', sans-serif"
    : "'Courier New', Consolas, 'Liberation Mono', monospace";
  const fontSize = isZh ? 14 : 13;
  const letterSpacing = isZh ? 1.8 : 1;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 176 38" width="176" height="38" shape-rendering="crispEdges" role="img" aria-label="${escapeXml(label)}">
  <path d="M2,0 H174 V2 H176 V36 H174 V38 H2 V36 H0 V2 H2 Z" fill="#0b101b"/>
  <rect x="2" y="2" width="172" height="34" fill="${baseFill}"/>
  <!-- 石砖砖缝 -->
  <g fill="${mortar}">
    <rect x="2" y="18" width="172" height="2"/>
    <rect x="46" y="4" width="2" height="14"/>
    <rect x="104" y="4" width="2" height="14"/>
    <rect x="148" y="4" width="2" height="14"/>
    <rect x="28" y="20" width="2" height="14"/>
    <rect x="82" y="20" width="2" height="14"/>
    <rect x="134" y="20" width="2" height="14"/>
  </g>
  <g fill="${speck}">
    <rect x="54" y="8" width="10" height="4"/>
    <rect x="116" y="10" width="12" height="4"/>
    <rect x="38" y="24" width="12" height="4"/>
    <rect x="96" y="24" width="14" height="4"/>
  </g>
  <!-- 立体高光倒角 -->
  <rect x="2" y="2" width="172" height="2" fill="${topBevel}"/>
  <rect x="2" y="4" width="172" height="2" fill="${topSub}" opacity="0.5"/>
  <rect x="2" y="2" width="2" height="32" fill="${topSub}" opacity="0.7"/>
  <rect x="2" y="34" width="172" height="2" fill="${botBevel}"/>
  <rect x="172" y="4" width="2" height="32" fill="${botBevel}"/>
  <!-- 像素图标 -->
  <g>${iconSvg}</g>
  <!-- 按钮文字 -->
  <text x="101.5" y="25" text-anchor="middle" fill="#070a12" font-family="${fontFamily}" font-size="${fontSize}" font-weight="800" letter-spacing="${letterSpacing}" shape-rendering="geometricPrecision">${escapeXml(label)}</text>
  <text x="100" y="23.5" text-anchor="middle" fill="${textFill}" font-family="${fontFamily}" font-size="${fontSize}" font-weight="800" letter-spacing="${letterSpacing}" shape-rendering="geometricPrecision">${escapeXml(label)}</text>
</svg>
`;
}

// ============================================================================
// 4. High-Craft Pixel Overworld Night Banner Generator (1000 x 280)
// ============================================================================
function generateBanner({ title, subtitle, lang }) {
  const isZh = lang === 'zh';
  const subtitleFont = isZh
    ? "'Microsoft YaHei', 'PingFang SC', 'Noto Sans CJK SC', 'WenQuanYi Micro Hei', sans-serif"
    : "'Courier New', Consolas, 'Liberation Mono', 'DejaVu Sans Mono', monospace";
  const subtitleSize = isZh ? '15.5px' : '14px';
  const subtitleSpacing = isZh ? '3.5px' : '2.2px';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 280" width="1000" height="280" shape-rendering="crispEdges" role="img" aria-label="${escapeXml(title)} — ${escapeXml(subtitle)}">
  <title>${escapeXml(title)} — ${escapeXml(subtitle)}</title>

  <defs>
    <!-- 主标题与副标题（由 profile.config.json 自动生成） -->
    <text id="hero-title" x="500" y="112" text-anchor="middle" class="pixel-title">${escapeXml(title)}</text>
    <text id="hero-subtitle" x="500" y="156" text-anchor="middle" class="pixel-subtitle">${escapeXml(subtitle)}</text>

    <clipPath id="banner-clip">
      <rect x="4" y="4" width="992" height="272"/>
    </clipPath>
    <clipPath id="xp-fill-local">
      <rect x="0" y="0" width="576" height="10"/>
    </clipPath>

    <g id="clouds-far">
      <rect x="148" y="24" width="88" height="4" fill="#2f498a"/>
      <rect x="136" y="28" width="112" height="8" fill="#21356b"/>
      <rect x="148" y="36" width="88" height="4" fill="#16244c"/>

      <rect x="448" y="18" width="100" height="4" fill="#2f498a"/>
      <rect x="436" y="22" width="124" height="8" fill="#21356b"/>
      <rect x="452" y="30" width="92" height="4" fill="#16244c"/>

      <rect x="748" y="28" width="84" height="4" fill="#2f498a"/>
      <rect x="736" y="32" width="108" height="8" fill="#21356b"/>
      <rect x="752" y="40" width="76" height="4" fill="#16244c"/>
    </g>

    <g id="clouds-near">
      <rect x="236" y="46" width="68" height="4" fill="#3a59a3"/>
      <rect x="224" y="50" width="92" height="8" fill="#28407d"/>
      <rect x="232" y="58" width="76" height="4" fill="#1b2d5c"/>

      <rect x="632" y="42" width="76" height="4" fill="#3a59a3"/>
      <rect x="620" y="46" width="100" height="8" fill="#28407d"/>
      <rect x="628" y="54" width="84" height="4" fill="#1b2d5c"/>

      <rect x="892" y="164" width="56" height="4" fill="#2e4887"/>
      <rect x="884" y="168" width="72" height="4" fill="#1f3263"/>
    </g>

    <g id="diamond-ore">
      <rect x="0" y="0" width="28" height="20" fill="#3c424f"/>
      <rect x="0" y="0" width="28" height="4" fill="#4b5363"/>
      <rect x="4" y="16" width="20" height="4" fill="#2e333e"/>
      <rect x="24" y="4" width="4" height="16" fill="#2e333e"/>
      <rect x="4" y="4" width="8" height="4" fill="#06b6d4"/>
      <rect x="4" y="8" width="4" height="4" fill="#22d3ee"/>
      <rect x="16" y="8" width="8" height="4" fill="#06b6d4"/>
      <rect x="20" y="4" width="4" height="4" fill="#22d3ee"/>
      <rect x="12" y="12" width="8" height="4" fill="#22d3ee"/>
      <g class="ore-glow">
        <rect x="4" y="4" width="4" height="4" fill="#a5f3fc"/>
        <rect x="16" y="8" width="4" height="4" fill="#67e8f9"/>
        <rect x="12" y="12" width="4" height="4" fill="#ecfeff"/>
      </g>
    </g>

    <g id="redstone-ore">
      <rect x="0" y="0" width="28" height="20" fill="#3c424f"/>
      <rect x="0" y="0" width="28" height="4" fill="#4b5363"/>
      <rect x="4" y="16" width="20" height="4" fill="#2e333e"/>
      <rect x="24" y="4" width="4" height="16" fill="#2e333e"/>
      <rect x="4" y="8" width="8" height="4" fill="#dc2626"/>
      <rect x="8" y="4" width="4" height="4" fill="#ef4444"/>
      <rect x="16" y="4" width="8" height="4" fill="#dc2626"/>
      <rect x="20" y="12" width="4" height="4" fill="#ef4444"/>
      <rect x="12" y="12" width="4" height="4" fill="#ef4444"/>
      <g class="ore-glow">
        <rect x="8" y="4" width="4" height="4" fill="#fca5a5"/>
        <rect x="4" y="8" width="4" height="4" fill="#f87171"/>
        <rect x="20" y="12" width="4" height="4" fill="#fee2e2"/>
      </g>
    </g>
  </defs>

  <style>
    .pixel-title {
      font-family: 'Courier New', Consolas, 'Liberation Mono', 'DejaVu Sans Mono', monospace;
      font-size: 40px;
      font-weight: 900;
      letter-spacing: 5.5px;
      shape-rendering: geometricPrecision;
    }
    .pixel-subtitle {
      font-family: ${subtitleFont};
      font-size: ${subtitleSize};
      font-weight: 700;
      letter-spacing: ${subtitleSpacing};
      shape-rendering: geometricPrecision;
    }

    @keyframes twinkleA {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.22; }
    }
    @keyframes twinkleB {
      0%, 100% { opacity: 0.28; }
      50% { opacity: 1; }
    }
    @keyframes twinkleC {
      0%, 100% { opacity: 0.85; }
      40% { opacity: 0.15; }
      72% { opacity: 0.95; }
    }
    .star-a { animation: twinkleA 2.5s steps(4, end) infinite; }
    .star-b { animation: twinkleB 3.3s steps(4, end) infinite; }
    .star-c { animation: twinkleC 4.1s steps(5, end) infinite; }

    @keyframes shootingStar {
      0%, 78% { transform: translate(0, 0); opacity: 0; }
      82% { opacity: 0.95; }
      94% { transform: translate(-120px, 44px); opacity: 0; }
      100% { transform: translate(-120px, 44px); opacity: 0; }
    }
    .meteor { animation: shootingStar 11s linear infinite; }

    @keyframes moonPulse {
      0%, 100% { opacity: 0.13; }
      50% { opacity: 0.23; }
    }
    .moon-halo { animation: moonPulse 5.5s ease-in-out infinite; }

    @keyframes driftFar {
      from { transform: translateX(0); }
      to { transform: translateX(-1000px); }
    }
    @keyframes driftNear {
      from { transform: translateX(0); }
      to { transform: translateX(-1000px); }
    }
    .cloud-far { animation: driftFar 70s linear infinite; opacity: 0.62; }
    .cloud-near { animation: driftNear 48s linear infinite; opacity: 0.54; }

    @keyframes warmPulse {
      0%, 100% { opacity: 0.22; }
      50% { opacity: 0.48; }
    }
    .redstone-aura { animation: warmPulse 2.1s ease-in-out infinite; }
    .lantern-aura { animation: warmPulse 3.2s ease-in-out 0.6s infinite; }
    .redstone-dot { animation: twinkleA 1.8s steps(3, end) infinite; }

    @keyframes oreShine {
      0%, 100% { opacity: 0.32; }
      50% { opacity: 1; }
    }
    .ore-glow { animation: oreShine 2.7s ease-in-out var(--ore-delay, 0s) infinite; }
    .ore-1 { --ore-delay: 0s; }
    .ore-2 { --ore-delay: 0.8s; }
    .ore-3 { --ore-delay: 1.5s; }
    .ore-4 { --ore-delay: 0.4s; }
    .ore-5 { --ore-delay: 1.9s; }
    .ore-6 { --ore-delay: 1.1s; }

    @keyframes sparkRise {
      0% { transform: translateY(0); opacity: 0; }
      20% { opacity: 0.95; }
      80% { opacity: 0.55; }
      100% { transform: translateY(-18px); opacity: 0; }
    }
    .spark-1 { animation: sparkRise 3.1s steps(6, end) infinite; }
    .spark-2 { animation: sparkRise 3.7s steps(6, end) 1.2s infinite; }
    .spark-3 { animation: sparkRise 3.4s steps(6, end) 2.1s infinite; }
    .spark-4 { animation: sparkRise 2.9s steps(6, end) 0.7s infinite; }

    @keyframes fireflyA {
      0%, 100% { transform: translate(0, 0); opacity: 0.35; }
      50% { transform: translate(10px, -8px); opacity: 1; }
    }
    @keyframes fireflyB {
      0%, 100% { transform: translate(0, 0); opacity: 0.85; }
      50% { transform: translate(-12px, -6px); opacity: 0.25; }
    }
    .firefly-1 { animation: fireflyA 4.2s ease-in-out infinite; }
    .firefly-2 { animation: fireflyB 5.1s ease-in-out 1.1s infinite; }
    .firefly-3 { animation: fireflyA 4.6s ease-in-out 2.3s infinite; }

    @keyframes creeperBreath {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-2px); }
    }
    .creeper-body { animation: creeperBreath 3.2s steps(2, end) infinite; }

    @keyframes xpFillBreath {
      0%, 100% { transform: scaleX(0.76); }
      50% { transform: scaleX(0.90); }
    }
    @keyframes xpGlintSweep {
      0% { transform: translateX(-48px); opacity: 0; }
      12% { opacity: 0.55; }
      62% { opacity: 0.55; }
      75% { transform: translateX(580px); opacity: 0; }
      100% { transform: translateX(580px); opacity: 0; }
    }
    .xp-fill {
      transform-origin: 0 0;
      animation: xpFillBreath 6s ease-in-out infinite;
    }
    .xp-glint { animation: xpGlintSweep 4.6s linear infinite; }

    @keyframes orbFloat {
      0%, 100% { transform: translateY(0); opacity: 0.85; }
      50% { transform: translateY(-2px); opacity: 1; }
    }
    .xp-orb { animation: orbFloat 2.4s steps(2, end) infinite; }
    .xp-orb-delay { animation: orbFloat 2.4s steps(2, end) 1.2s infinite; }

    @media (prefers-reduced-motion: reduce) {
      .star-a, .star-b, .star-c, .meteor, .moon-halo, .cloud-far, .cloud-near,
      .redstone-aura, .lantern-aura, .redstone-dot, .ore-glow,
      .spark-1, .spark-2, .spark-3, .spark-4,
      .firefly-1, .firefly-2, .firefly-3,
      .creeper-body, .xp-fill, .xp-glint, .xp-orb, .xp-orb-delay {
        animation: none !important;
      }
    }
  </style>

  <g clip-path="url(#banner-clip)">
    <!-- 1. 多层阶梯深蓝像素夜空 -->
    <rect x="0" y="0" width="1000" height="36" fill="#050814"/>
    <rect x="0" y="36" width="1000" height="36" fill="#080e22"/>
    <rect x="0" y="72" width="1000" height="40" fill="#0c1532"/>
    <rect x="0" y="112" width="1000" height="36" fill="#111e45"/>
    <rect x="0" y="148" width="1000" height="32" fill="#172959"/>
    <rect x="0" y="180" width="1000" height="24" fill="#1e3570"/>
    <rect x="0" y="204" width="1000" height="24" fill="#244282"/>

    <g fill="#080e22">
      <rect x="160" y="32" width="4" height="4"/><rect x="312" y="32" width="4" height="4"/>
      <rect x="492" y="32" width="4" height="4"/><rect x="688" y="32" width="4" height="4"/>
      <rect x="852" y="32" width="4" height="4"/>
    </g>
    <g fill="#111e45">
      <rect x="116" y="108" width="4" height="4"/><rect x="256" y="108" width="4" height="4"/>
      <rect x="752" y="108" width="4" height="4"/><rect x="912" y="108" width="4" height="4"/>
    </g>
    <g fill="#1e3570">
      <rect x="200" y="176" width="4" height="4"/><rect x="380" y="176" width="4" height="4"/>
      <rect x="620" y="176" width="4" height="4"/><rect x="780" y="176" width="4" height="4"/>
    </g>

    <!-- 2. 经典方形 Minecraft 月亮 -->
    <g>
      <rect x="48" y="8" width="84" height="84" fill="#60a5fa" opacity="0.05"/>
      <rect x="58" y="18" width="64" height="64" fill="#93c5fd" class="moon-halo"/>
      <rect x="68" y="28" width="44" height="44" fill="#e2e8f0"/>
      <rect x="68" y="28" width="44" height="4" fill="#ffffff"/>
      <rect x="68" y="28" width="4" height="44" fill="#f8fafc"/>
      <rect x="76" y="36" width="8" height="8" fill="#cbd5e1"/>
      <rect x="80" y="40" width="4" height="4" fill="#94a3b8"/>
      <rect x="100" y="36" width="4" height="8" fill="#cbd5e1"/>
      <rect x="88" y="54" width="12" height="8" fill="#cbd5e1"/>
      <rect x="92" y="58" width="4" height="4" fill="#94a3b8"/>
      <rect x="74" y="60" width="8" height="4" fill="#cbd5e1"/>
    </g>

    <!-- 3. 星光与流星 -->
    <g class="meteor">
      <rect x="916" y="24" width="4" height="4" fill="#ffffff"/>
      <rect x="920" y="22" width="4" height="2" fill="#bae6fd"/>
      <rect x="924" y="20" width="6" height="2" fill="#38bdf8" opacity="0.7"/>
      <rect x="930" y="18" width="8" height="2" fill="#38bdf8" opacity="0.35"/>
    </g>

    <g class="star-a">
      <rect x="164" y="16" width="4" height="4" fill="#f8fafc"/>
      <rect x="304" y="24" width="4" height="4" fill="#bae6fd"/>
      <rect x="412" y="16" width="4" height="4" fill="#fef08a"/>
      <rect x="596" y="20" width="4" height="4" fill="#f8fafc"/>
      <rect x="788" y="20" width="4" height="4" fill="#bae6fd"/>
      <rect x="944" y="32" width="4" height="4" fill="#f8fafc"/>
      <rect x="204" y="96" width="4" height="4" fill="#e0f2fe"/>
      <rect x="768" y="96" width="4" height="4" fill="#fef08a"/>
      <rect x="236" y="40" width="2" height="6" fill="#e0f2fe"/>
      <rect x="234" y="42" width="6" height="2" fill="#e0f2fe"/>
      <rect x="236" y="42" width="2" height="2" fill="#ffffff"/>
    </g>
    <g class="star-b">
      <rect x="144" y="56" width="4" height="4" fill="#93c5fd"/>
      <rect x="276" y="52" width="2" height="2" fill="#f8fafc"/>
      <rect x="364" y="44" width="4" height="4" fill="#e0f2fe"/>
      <rect x="516" y="14" width="4" height="4" fill="#bae6fd"/>
      <rect x="664" y="32" width="4" height="4" fill="#f8fafc"/>
      <rect x="728" y="56" width="2" height="2" fill="#bae6fd"/>
      <rect x="856" y="16" width="4" height="4" fill="#fef08a"/>
      <rect x="960" y="64" width="4" height="4" fill="#bae6fd"/>
      <rect x="28" y="104" width="4" height="4" fill="#e0f2fe"/>
      <rect x="172" y="136" width="2" height="2" fill="#93c5fd"/>
      <rect x="814" y="56" width="2" height="6" fill="#fef08a"/>
      <rect x="812" y="58" width="6" height="2" fill="#fef08a"/>
      <rect x="814" y="58" width="2" height="2" fill="#ffffff"/>
    </g>
    <g class="star-c">
      <rect x="20" y="32" width="4" height="4" fill="#93c5fd"/>
      <rect x="204" y="28" width="2" height="2" fill="#f8fafc"/>
      <rect x="468" y="40" width="2" height="2" fill="#bae6fd"/>
      <rect x="560" y="46" width="2" height="2" fill="#e0f2fe"/>
      <rect x="700" y="16" width="4" height="4" fill="#93c5fd"/>
      <rect x="900" y="44" width="4" height="4" fill="#e0f2fe"/>
      <rect x="920" y="108" width="4" height="4" fill="#93c5fd"/>
      <rect x="148" y="92" width="2" height="2" fill="#f8fafc"/>
      <rect x="784" y="136" width="2" height="2" fill="#bae6fd"/>
    </g>

    <!-- 4. 双层视差像素云 -->
    <g class="cloud-far">
      <use href="#clouds-far" x="0"/>
      <use href="#clouds-far" x="1000"/>
    </g>
    <g class="cloud-near">
      <use href="#clouds-near" x="0"/>
      <use href="#clouds-near" x="1000"/>
    </g>

    <!-- 5. 远山剪影 -->
    <g fill="#0a132b">
      <rect x="0" y="168" width="84" height="48"/>
      <rect x="48" y="156" width="56" height="60"/>
      <rect x="104" y="172" width="76" height="44"/>
      <rect x="820" y="172" width="84" height="44"/>
      <rect x="896" y="152" width="104" height="64"/>
    </g>
    <g fill="#0f1c3f">
      <rect x="0" y="180" width="60" height="36"/>
      <rect x="24" y="168" width="44" height="48"/>
      <rect x="60" y="176" width="56" height="40"/>
      <rect x="116" y="188" width="64" height="28"/>
      <rect x="180" y="200" width="44" height="16"/>
      <rect x="760" y="200" width="44" height="16"/>
      <rect x="804" y="188" width="60" height="28"/>
      <rect x="864" y="176" width="64" height="40"/>
      <rect x="928" y="164" width="72" height="52"/>
    </g>
    <g fill="#223b7a">
      <rect x="24" y="168" width="44" height="4"/>
      <rect x="60" y="176" width="56" height="4"/>
      <rect x="116" y="188" width="64" height="4"/>
      <rect x="864" y="176" width="64" height="4"/>
      <rect x="928" y="164" width="72" height="4"/>
    </g>

    <!-- 6. 左侧像素橡树 + 暖光灯笼 + 红石火把 -->
    <g>
      <rect x="48" y="168" width="16" height="36" fill="#523722"/>
      <rect x="48" y="168" width="4" height="36" fill="#6b492e"/>
      <rect x="60" y="168" width="4" height="36" fill="#3a2516"/>
      <rect x="52" y="180" width="4" height="8" fill="#3a2516"/>
      <rect x="24" y="140" width="64" height="28" fill="#1a522a"/>
      <rect x="32" y="128" width="48" height="12" fill="#236b38"/>
      <rect x="44" y="120" width="24" height="8" fill="#2d8546"/>
      <rect x="28" y="144" width="12" height="8" fill="#27753e"/>
      <rect x="52" y="132" width="12" height="8" fill="#349450"/>
      <rect x="72" y="148" width="16" height="16" fill="#123a1d"/>
      <rect x="40" y="160" width="12" height="8" fill="#123a1d"/>
      <rect x="24" y="156" width="12" height="12" fill="#123a1d"/>

      <rect x="68" y="164" width="28" height="28" fill="#f59e0b" class="lantern-aura"/>
      <rect x="80" y="168" width="4" height="4" fill="#64748b"/>
      <rect x="78" y="172" width="8" height="10" fill="#334155"/>
      <rect x="80" y="174" width="4" height="6" fill="#fde047"/>
      <rect x="80" y="176" width="2" height="2" fill="#ffffff"/>
    </g>

    <g>
      <rect x="120" y="176" width="28" height="28" fill="#ef4444" class="redstone-aura"/>
      <rect x="126" y="182" width="16" height="16" fill="#f87171" opacity="0.28"/>
      <rect x="132" y="192" width="4" height="12" fill="#7c5434"/>
      <rect x="132" y="200" width="4" height="4" fill="#593b22"/>
      <rect x="132" y="188" width="4" height="4" fill="#ef4444"/>
      <rect x="133" y="189" width="2" height="2" fill="#fecaca"/>
      <rect x="128" y="180" width="2" height="2" fill="#f87171" class="spark-2"/>
      <rect x="138" y="184" width="2" height="2" fill="#fca5a5" class="spark-1"/>
    </g>

    <!-- 7. 中央复古像素标题与副标题 -->
    <g>
      <use href="#hero-title" x="4" y="4" fill="#040712"/>
      <use href="#hero-title" x="2" y="2" fill="#23396b"/>
      <use href="#hero-title" x="0" y="0" fill="#f8fafc"/>

      <rect x="336" y="128" width="144" height="2" fill="#274073"/>
      <rect x="520" y="128" width="144" height="2" fill="#274073"/>
      <rect x="388" y="128" width="92" height="2" fill="#38bdf8" opacity="0.5"/>
      <rect x="520" y="128" width="92" height="2" fill="#38bdf8" opacity="0.5"/>
      <rect x="498" y="123" width="4" height="12" fill="#38bdf8"/>
      <rect x="494" y="127" width="12" height="4" fill="#38bdf8"/>
      <rect x="498" y="127" width="4" height="4" fill="#ecfeff"/>
      <rect x="484" y="127" width="4" height="4" fill="#ef4444" class="redstone-dot"/>
      <rect x="512" y="127" width="4" height="4" fill="#ef4444" class="redstone-dot"/>

      <use href="#hero-subtitle" x="2" y="2" fill="#040712"/>
      <use href="#hero-subtitle" x="0" y="0" fill="#7dd3fc"/>
    </g>

    <!-- 8. 底部草方块 / 泥土 / 深层石头横截面地形 -->
    <rect x="0" y="232" width="1000" height="48" fill="#3b414d"/>
    <g fill="#2f343f">
      <rect x="12" y="236" width="16" height="8"/><rect x="104" y="244" width="20" height="8"/>
      <rect x="220" y="236" width="24" height="8"/><rect x="388" y="240" width="20" height="8"/>
      <rect x="484" y="236" width="28" height="8"/><rect x="584" y="240" width="24" height="8"/>
      <rect x="720" y="236" width="24" height="8"/><rect x="824" y="244" width="24" height="8"/>
      <rect x="944" y="236" width="24" height="8"/><rect x="140" y="260" width="24" height="8"/>
      <rect x="852" y="264" width="24" height="8"/><rect x="928" y="260" width="28" height="8"/>
    </g>
    <g fill="#4c5362">
      <rect x="36" y="248" width="12" height="4"/><rect x="128" y="236" width="16" height="4"/>
      <rect x="272" y="240" width="16" height="4"/><rect x="436" y="236" width="20" height="4"/>
      <rect x="540" y="236" width="16" height="4"/><rect x="688" y="240" width="16" height="4"/>
      <rect x="796" y="236" width="16" height="4"/><rect x="920" y="240" width="16" height="4"/>
      <rect x="20" y="264" width="20" height="4"/><rect x="804" y="260" width="16" height="4"/>
    </g>

    <rect x="0" y="212" width="164" height="24" fill="#6e4b2e"/>
    <rect x="164" y="224" width="628" height="8" fill="#6e4b2e"/>
    <rect x="792" y="212" width="208" height="24" fill="#6e4b2e"/>
    <g fill="#593b22">
      <rect x="16" y="220" width="8" height="4"/><rect x="48" y="228" width="12" height="4"/>
      <rect x="92" y="220" width="8" height="8"/><rect x="136" y="228" width="12" height="4"/>
      <rect x="184" y="228" width="12" height="4"/><rect x="252" y="228" width="8" height="4"/>
      <rect x="316" y="228" width="12" height="4"/><rect x="404" y="228" width="12" height="4"/>
      <rect x="476" y="228" width="12" height="4"/><rect x="564" y="228" width="12" height="4"/>
      <rect x="636" y="228" width="12" height="4"/><rect x="724" y="228" width="12" height="4"/>
      <rect x="816" y="220" width="12" height="4"/><rect x="876" y="228" width="12" height="4"/>
      <rect x="944" y="220" width="12" height="4"/><rect x="976" y="228" width="8" height="4"/>
    </g>
    <g fill="#845c3b">
      <rect x="32" y="224" width="8" height="4"/><rect x="112" y="224" width="8" height="4"/>
      <rect x="220" y="228" width="8" height="4"/><rect x="360" y="228" width="8" height="4"/>
      <rect x="520" y="228" width="8" height="4"/><rect x="684" y="228" width="8" height="4"/>
      <rect x="844" y="224" width="8" height="4"/><rect x="920" y="228" width="8" height="4"/>
    </g>

    <rect x="0" y="204" width="164" height="8" fill="#52a32b"/>
    <rect x="0" y="204" width="164" height="4" fill="#63ba38"/>
    <g fill="#76d147">
      <rect x="20" y="204" width="12" height="4"/><rect x="76" y="204" width="16" height="4"/>
      <rect x="128" y="204" width="12" height="4"/>
    </g>
    <g fill="#428a21">
      <rect x="8" y="212" width="8" height="4"/><rect x="32" y="212" width="4" height="8"/>
      <rect x="64" y="212" width="12" height="4"/><rect x="108" y="212" width="8" height="4"/>
      <rect x="148" y="212" width="8" height="8"/>
    </g>

    <rect x="164" y="216" width="628" height="8" fill="#52a32b"/>
    <rect x="164" y="216" width="628" height="4" fill="#63ba38"/>
    <g fill="#76d147">
      <rect x="180" y="216" width="16" height="4"/><rect x="244" y="216" width="12" height="4"/>
      <rect x="320" y="216" width="20" height="4"/><rect x="408" y="216" width="16" height="4"/>
      <rect x="492" y="216" width="20" height="4"/><rect x="584" y="216" width="16" height="4"/>
      <rect x="672" y="216" width="16" height="4"/><rect x="748" y="216" width="16" height="4"/>
    </g>
    <g fill="#428a21">
      <rect x="172" y="224" width="8" height="4"/><rect x="208" y="224" width="12" height="4"/>
      <rect x="260" y="224" width="8" height="4"/><rect x="296" y="224" width="4" height="8"/>
      <rect x="344" y="224" width="12" height="4"/><rect x="392" y="224" width="8" height="4"/>
      <rect x="440" y="224" width="12" height="4"/><rect x="500" y="224" width="8" height="4"/>
      <rect x="548" y="224" width="12" height="4"/><rect x="604" y="224" width="8" height="4"/>
      <rect x="656" y="224" width="12" height="4"/><rect x="712" y="224" width="8" height="4"/>
      <rect x="764" y="224" width="12" height="4"/>
    </g>

    <rect x="792" y="204" width="208" height="8" fill="#52a32b"/>
    <rect x="792" y="204" width="208" height="4" fill="#63ba38"/>
    <g fill="#76d147">
      <rect x="804" y="204" width="16" height="4"/><rect x="876" y="204" width="16" height="4"/>
      <rect x="944" y="204" width="20" height="4"/>
    </g>
    <g fill="#428a21">
      <rect x="796" y="212" width="8" height="8"/><rect x="828" y="212" width="12" height="4"/>
      <rect x="868" y="212" width="8" height="4"/><rect x="908" y="212" width="12" height="4"/>
      <rect x="952" y="212" width="8" height="8"/><rect x="984" y="212" width="8" height="4"/>
    </g>

    <!-- 发光钻石矿 + 红石矿 -->
    <g class="ore-1"><use href="#diamond-ore" x="48" y="244"/></g>
    <g class="ore-2"><use href="#redstone-ore" x="148" y="248"/></g>
    <g class="ore-3"><use href="#diamond-ore" x="316" y="234"/></g>
    <g class="ore-4"><use href="#redstone-ore" x="486" y="234"/></g>
    <g class="ore-5"><use href="#diamond-ore" x="652" y="234"/></g>
    <g class="ore-6"><use href="#redstone-ore" x="884" y="244"/></g>
    <g class="ore-3"><use href="#diamond-ore" x="936" y="248"/></g>

    <rect x="60" y="240" width="2" height="2" fill="#67e8f9" class="spark-1"/>
    <rect x="160" y="244" width="2" height="2" fill="#fca5a5" class="spark-4"/>
    <rect x="330" y="232" width="2" height="2" fill="#a5f3fc" class="spark-2"/>
    <rect x="500" y="232" width="2" height="2" fill="#f87171" class="spark-3"/>
    <rect x="898" y="240" width="2" height="2" fill="#fca5a5" class="spark-2"/>
    <rect x="948" y="244" width="2" height="2" fill="#67e8f9" class="spark-1"/>

    <g>
      <rect x="220" y="208" width="4" height="8" fill="#3a7a1d"/>
      <rect x="220" y="204" width="4" height="4" fill="#38bdf8"/>
      <rect x="264" y="210" width="4" height="6" fill="#3a7a1d"/>
      <rect x="264" y="206" width="4" height="4" fill="#f43f5e"/>
      <rect x="736" y="208" width="4" height="8" fill="#3a7a1d"/>
      <rect x="736" y="204" width="4" height="4" fill="#facc15"/>
    </g>
    <g>
      <rect x="292" y="192" width="3" height="3" fill="#fef08a" class="firefly-1"/>
      <rect x="712" y="186" width="3" height="3" fill="#a3e635" class="firefly-2"/>
      <rect x="796" y="164" width="3" height="3" fill="#fef08a" class="firefly-3"/>
    </g>

    <!-- 9. 精致 2.5D 像素苦力怕 -->
    <rect x="832" y="204" width="52" height="4" fill="#1b3d12" opacity="0.62"/>
    <g transform="translate(836, 100)">
      <g class="creeper-body">
        <rect x="4" y="0" width="32" height="32" fill="#53b334"/>
        <rect x="4" y="0" width="8" height="4" fill="#68cf44"/>
        <rect x="16" y="0" width="8" height="8" fill="#469e2a"/>
        <rect x="28" y="0" width="8" height="4" fill="#7be055"/>
        <rect x="4" y="4" width="4" height="8" fill="#469e2a"/>
        <rect x="12" y="4" width="4" height="4" fill="#7be055"/>
        <rect x="24" y="4" width="4" height="4" fill="#68cf44"/>
        <rect x="32" y="8" width="4" height="8" fill="#469e2a"/>
        <rect x="4" y="16" width="4" height="8" fill="#68cf44"/>
        <rect x="8" y="16" width="4" height="4" fill="#469e2a"/>
        <rect x="28" y="16" width="4" height="8" fill="#7be055"/>
        <rect x="4" y="24" width="8" height="8" fill="#469e2a"/>
        <rect x="16" y="28" width="8" height="4" fill="#68cf44"/>
        <rect x="28" y="24" width="8" height="8" fill="#469e2a"/>
        <rect x="36" y="0" width="8" height="32" fill="#377d20"/>
        <rect x="36" y="4" width="4" height="8" fill="#2e6b1b"/>
        <rect x="40" y="12" width="4" height="8" fill="#419126"/>
        <rect x="36" y="24" width="8" height="4" fill="#2e6b1b"/>
        <rect x="8" y="8" width="8" height="8" fill="#090f09"/>
        <rect x="24" y="8" width="8" height="8" fill="#090f09"/>
        <rect x="16" y="16" width="8" height="4" fill="#090f09"/>
        <rect x="12" y="20" width="16" height="8" fill="#090f09"/>
        <rect x="12" y="28" width="4" height="4" fill="#090f09"/>
        <rect x="24" y="28" width="4" height="4" fill="#090f09"/>

        <rect x="8" y="32" width="24" height="48" fill="#50ad31"/>
        <rect x="8" y="32" width="24" height="4" fill="#31701c"/>
        <rect x="12" y="36" width="8" height="8" fill="#65c942"/>
        <rect x="24" y="40" width="8" height="8" fill="#429427"/>
        <rect x="8" y="44" width="8" height="12" fill="#429427"/>
        <rect x="16" y="48" width="8" height="8" fill="#77db53"/>
        <rect x="12" y="56" width="8" height="8" fill="#429427"/>
        <rect x="24" y="56" width="8" height="8" fill="#65c942"/>
        <rect x="8" y="64" width="8" height="8" fill="#65c942"/>
        <rect x="20" y="64" width="8" height="12" fill="#429427"/>
        <rect x="12" y="72" width="8" height="8" fill="#3a8522"/>
        <rect x="32" y="32" width="8" height="48" fill="#35781e"/>
        <rect x="32" y="32" width="8" height="4" fill="#275c15"/>
        <rect x="32" y="44" width="4" height="8" fill="#2c6619"/>
        <rect x="36" y="56" width="4" height="12" fill="#3f8f24"/>
        <rect x="32" y="72" width="8" height="8" fill="#2c6619"/>

        <rect x="32" y="80" width="12" height="20" fill="#2d691a"/>
        <rect x="36" y="84" width="4" height="8" fill="#245414"/>
        <rect x="32" y="96" width="4" height="4" fill="#17380c"/>
        <rect x="40" y="96" width="4" height="4" fill="#17380c"/>

        <rect x="4" y="80" width="12" height="24" fill="#53b334"/>
        <rect x="4" y="80" width="12" height="4" fill="#3c8723"/>
        <rect x="8" y="88" width="4" height="8" fill="#68cf44"/>
        <rect x="4" y="96" width="4" height="4" fill="#429427"/>
        <rect x="4" y="100" width="4" height="4" fill="#1a3d10"/>
        <rect x="12" y="100" width="4" height="4" fill="#1a3d10"/>

        <rect x="20" y="80" width="12" height="24" fill="#4ea830"/>
        <rect x="20" y="80" width="12" height="4" fill="#388020"/>
        <rect x="24" y="84" width="4" height="8" fill="#65c942"/>
        <rect x="20" y="92" width="4" height="8" fill="#3e8c24"/>
        <rect x="20" y="100" width="4" height="4" fill="#1a3d10"/>
        <rect x="28" y="100" width="4" height="4" fill="#1a3d10"/>
      </g>
    </g>

    <!-- 10. 底部 Minecraft HUD 经验条 -->
    <g>
      <g class="xp-orb">
        <rect x="192" y="259" width="8" height="8" fill="#4ade80"/>
        <rect x="194" y="261" width="4" height="4" fill="#d9f99d"/>
        <rect x="194" y="261" width="2" height="2" fill="#ffffff"/>
      </g>
      <g class="xp-orb-delay">
        <rect x="800" y="259" width="8" height="8" fill="#4ade80"/>
        <rect x="802" y="261" width="4" height="4" fill="#d9f99d"/>
        <rect x="802" y="261" width="2" height="2" fill="#ffffff"/>
      </g>

      <rect x="210" y="256" width="580" height="14" fill="#090e12"/>
      <rect x="212" y="258" width="576" height="10" fill="#1a261d"/>
      <rect x="212" y="258" width="576" height="2" fill="#111a14"/>

      <g transform="translate(212, 258)">
        <g class="xp-fill" clip-path="url(#xp-fill-local)">
          <rect x="0" y="0" width="576" height="2" fill="#a3ff57"/>
          <rect x="0" y="2" width="576" height="6" fill="#55ff55"/>
          <rect x="0" y="8" width="576" height="2" fill="#2aa12a"/>
          <rect x="0" y="0" width="36" height="10" fill="#ecfccb" class="xp-glint"/>
        </g>
      </g>

      <g fill="#0b120e">
        <rect x="244" y="258" width="2" height="10"/><rect x="276" y="258" width="2" height="10"/>
        <rect x="308" y="258" width="2" height="10"/><rect x="340" y="258" width="2" height="10"/>
        <rect x="372" y="258" width="2" height="10"/><rect x="404" y="258" width="2" height="10"/>
        <rect x="436" y="258" width="2" height="10"/><rect x="468" y="258" width="2" height="10"/>
        <rect x="500" y="258" width="2" height="10"/><rect x="532" y="258" width="2" height="10"/>
        <rect x="564" y="258" width="2" height="10"/><rect x="596" y="258" width="2" height="10"/>
        <rect x="628" y="258" width="2" height="10"/><rect x="660" y="258" width="2" height="10"/>
        <rect x="692" y="258" width="2" height="10"/><rect x="724" y="258" width="2" height="10"/>
        <rect x="756" y="258" width="2" height="10"/>
      </g>
    </g>
  </g>

  <path d="M4,0 H996 V4 H1000 V276 H996 V280 H4 V276 H0 V4 H4 Z M4,4 V276 H996 V4 Z" fill="#0d1526" fill-rule="evenodd"/>
  <rect x="4" y="4" width="992" height="2" fill="#1e2f52" opacity="0.65"/>
</svg>
`;
}

// ============================================================================
// 5. Authentic 9-Slot Minecraft Starter Hotbar SVG (1000 x 162)
// ============================================================================
function generateHotbar({ items, activeSlot = 0, showHudStats = true, lang }) {
  const isZh = lang === 'zh';
  const labelFont = isZh
    ? "'Microsoft YaHei', 'PingFang SC', 'Noto Sans CJK SC', 'WenQuanYi Micro Hei', sans-serif"
    : "'Courier New', Consolas, 'Liberation Mono', monospace";

  const slotCount = 9;
  const slotPitch = 80;
  const barWidth = slotCount * slotPitch + 4; // 724
  const barX = Math.floor((1000 - barWidth) / 2); // 138
  const barY = showHudStats ? 42 : 18;
  const slotHeight = 80;

  let hudStatsDefs = '';
  let hudStatsSvg = '';
  if (showHudStats) {
    hudStatsDefs = `
    <g id="hud-heart">${renderPixelGrid(HEART_SPRITE.grid, HEART_SPRITE.palette, 0, 0, 2)}</g>
    <g id="hud-armor">${renderPixelGrid(ARMOR_SPRITE.grid, ARMOR_SPRITE.palette, 0, 0, 2)}</g>`;
    const hearts = [];
    const armors = [];
    for (let i = 0; i < 10; i++) {
      hearts.push(`<use href="#hud-heart" x="${barX + 2 + i * 20}" y="16"/>`);
      armors.push(`<use href="#hud-armor" x="${barX + barWidth - 198 + i * 20}" y="16"/>`);
    }
    hudStatsSvg = `
    <g>${hearts.join('')}</g>
    <g>${armors.join('')}</g>`;
  }

  const slotsSvg = [];
  const labelsSvg = [];
  const enchantClipDefs = [];

  for (let i = 0; i < slotCount; i++) {
    const item = items[i] || null;
    const isActive = i === activeSlot;
    const isEmpty = !item;
    const sx = barX + 4 + i * slotPitch;
    const sy = barY + 4;
    const innerW = slotPitch - 4; // 76
    const innerH = slotHeight - 8; // 72

    const wellFill = isActive ? '#31394a' : isEmpty ? '#1d222c' : '#252a35';
    const wellTopShadow = isActive ? '#1b2230' : '#12151c';
    const wellBotBevel = isActive ? '#566480' : isEmpty ? '#353c4a' : '#454d5e';
    const numOpacity = isEmpty ? '0.45' : '0.9';

    let spriteSvg = '';
    if (item && ICONS[item.icon]) {
      const iconDef = ICONS[item.icon];
      const ix = sx + Math.floor((innerW - 48) / 2);
      const iy = sy + Math.floor((innerH - 48) / 2);
      const rendered = renderPixelGrid(iconDef.grid, iconDef.palette, ix, iy, 3);
      spriteSvg = `<g class="${isActive ? 'slot-icon-active' : 'slot-icon'}">${rendered}</g>`;

      if (item.enchanted) {
        const clipId = `ench-clip-${i}`;
        enchantClipDefs.push(`<clipPath id="${clipId}"><rect x="${sx + 3}" y="${sy + 3}" width="${innerW - 6}" height="${innerH - 6}"/></clipPath>`);
        spriteSvg += `
        <g clip-path="url(#${clipId})">
          <g transform="translate(${sx}, ${sy})">
            <rect x="0" y="0" width="18" height="${innerH}" fill="#c084fc" class="enchant-glint ench-d${i % 3}"/>
          </g>
        </g>`;
      }
    }

    slotsSvg.push(`
      <rect x="${sx}" y="${sy}" width="${innerW}" height="${innerH}" fill="${wellFill}"/>
      <rect x="${sx}" y="${sy}" width="${innerW}" height="3" fill="${wellTopShadow}"/>
      <rect x="${sx}" y="${sy}" width="3" height="${innerH}" fill="${wellTopShadow}"/>
      <rect x="${sx}" y="${sy + innerH - 3}" width="${innerW}" height="3" fill="${wellBotBevel}"/>
      <rect x="${sx + innerW - 3}" y="${sy}" width="3" height="${innerH}" fill="${wellBotBevel}"/>
      <text x="${sx + 7}" y="${sy + 14}" fill="#64748b" opacity="${numOpacity}" font-family="'Courier New', Consolas, monospace" font-size="10" font-weight="700" shape-rendering="geometricPrecision">${i + 1}</text>
      ${spriteSvg}
    `);

    if (item) {
      const rawLabel = typeof item.label === 'string' ? item.label : (item.label?.[lang] || item.label?.en || '');
      const cx = sx + innerW / 2;
      const ly = barY + slotHeight + 21;
      const labelColor = isActive ? '#fef08a' : '#cbd5e1';
      labelsSvg.push(`
        <text x="${cx + 1.5}" y="${ly + 1.5}" text-anchor="middle" fill="#070a12" font-family="${labelFont}" font-size="${isZh ? 12.5 : 11.5}" font-weight="700" letter-spacing="${isZh ? 1 : 0.6}" shape-rendering="geometricPrecision">${escapeXml(rawLabel)}</text>
        <text x="${cx}" y="${ly}" text-anchor="middle" fill="${labelColor}" font-family="${labelFont}" font-size="${isZh ? 12.5 : 11.5}" font-weight="700" letter-spacing="${isZh ? 1 : 0.6}" shape-rendering="geometricPrecision">${escapeXml(rawLabel)}</text>
      `);
    }
  }

  const actIdx = Math.max(0, Math.min(slotCount - 1, activeSlot));
  const selX = barX + actIdx * slotPitch;
  const selY = barY;
  const selW = slotPitch + 4;
  const selH = slotHeight;
  const selectorSvg = `
    <g class="active-selector">
      <rect x="${selX - 4}" y="${selY - 4}" width="${selW + 8}" height="${selH + 8}" fill="none" stroke="#0b101b" stroke-width="4"/>
      <rect x="${selX - 2}" y="${selY - 2}" width="${selW + 4}" height="${selH + 4}" fill="none" stroke="#f8fafc" stroke-width="4"/>
      <rect x="${selX + 2}" y="${selY + 2}" width="${selW - 4}" height="${selH - 4}" fill="none" stroke="#38bdf8" stroke-width="2" opacity="0.75"/>
    </g>`;

  const trayX = barX - 24; // 114
  const trayW = barWidth + 48; // 772
  const trayH = 154;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 162" width="1000" height="162" shape-rendering="crispEdges" role="img" aria-label="Minecraft Hotbar">
  <title>Minecraft Hotbar</title>

  <defs>
    ${hudStatsDefs}
    ${enchantClipDefs.join('\n    ')}
  </defs>

  <style>
    @keyframes activeBob {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-2px); }
    }
    .slot-icon-active { animation: activeBob 2.2s steps(2, end) infinite; }

    @keyframes enchantSweep {
      0% { transform: translateX(-30px) skewX(-22deg); opacity: 0; }
      14% { opacity: 0.28; }
      44% { transform: translateX(104px) skewX(-22deg); opacity: 0; }
      100% { transform: translateX(104px) skewX(-22deg); opacity: 0; }
    }
    .enchant-glint { animation: enchantSweep 4.8s linear infinite; }
    .ench-d0 { animation-delay: 0s; }
    .ench-d1 { animation-delay: 1.6s; }
    .ench-d2 { animation-delay: 3.1s; }

    @media (prefers-reduced-motion: reduce) {
      .slot-icon-active, .enchant-glint { animation: none !important; }
    }
  </style>

  <path d="M${trayX + 4},4 H${trayX + trayW - 4} V8 H${trayX + trayW} V${trayH} H${trayX + trayW - 4} V${trayH + 4} H${trayX + 4} V${trayH} H${trayX} V8 H${trayX + 4} Z" fill="#090d16"/>
  <rect x="${trayX + 4}" y="8" width="${trayW - 8}" height="${trayH - 8}" fill="#121722"/>
  <rect x="${trayX + 4}" y="8" width="${trayW - 8}" height="2" fill="#283247"/>
  <rect x="${trayX + 4}" y="8" width="2" height="${trayH - 8}" fill="#222b3d"/>
  <rect x="${trayX + 4}" y="${trayH - 2}" width="${trayW - 8}" height="2" fill="#0a0e17"/>
  <g fill="#38445c">
    <rect x="${trayX + 10}" y="14" width="4" height="4"/>
    <rect x="${trayX + trayW - 14}" y="14" width="4" height="4"/>
    <rect x="${trayX + 10}" y="${trayH - 10}" width="4" height="4"/>
    <rect x="${trayX + trayW - 14}" y="${trayH - 10}" width="4" height="4"/>
  </g>

  ${hudStatsSvg}

  <rect x="${barX - 2}" y="${barY - 2}" width="${barWidth + 4}" height="${slotHeight + 4}" fill="#0a0d14"/>
  <rect x="${barX}" y="${barY}" width="${barWidth}" height="${slotHeight}" fill="#3b4252"/>
  <rect x="${barX}" y="${barY}" width="${barWidth}" height="2" fill="#647087"/>
  <rect x="${barX}" y="${barY + slotHeight - 2}" width="${barWidth}" height="2" fill="#1e222b"/>

  ${slotsSvg.join('\n')}

  ${selectorSvg}

  ${labelsSvg.join('\n')}
</svg>
`;
}

// ============================================================================
// 6. Minecraft Oak Sign Guestbook SVG Generator (1000 x 248)
// ============================================================================
function generateGuestbook({ data, lang }) {
  const isZh = lang === 'zh';
  const maxDisplay = config.guestbook?.maxDisplay || 4;
  const maxMsgLen = config.guestbook?.maxMessageLength || 36;
  const diamonds = Number.isFinite(Number(data?.diamonds)) ? Number(data.diamonds) : 0;
  const entries = Array.isArray(data?.entries) ? data.entries.slice(0, maxDisplay) : [];

  const titleText = isZh ? '橡木告示牌 · 访客足迹' : 'OAK SIGN · GUESTBOOK';
  const diamondText = isZh ? `钻石 × ${diamonds}` : `Diamonds × ${diamonds}`;
  const emptyHint = isZh ? '·  虚位以待，点击下方留下足迹  ·' : '·  Open plank — leave a note below  ·';

  const uiFont = isZh
    ? "'Microsoft YaHei', 'PingFang SC', 'Noto Sans CJK SC', 'WenQuanYi Micro Hei', sans-serif"
    : "'Courier New', Consolas, 'Liberation Mono', monospace";
  const monoFont = "'Courier New', Consolas, 'Liberation Mono', monospace";

  const boardX = 114;
  const boardW = 772;
  const boardY = 8;
  const boardH = 212;

  const diamondIcon = renderPixelGrid(MINI_DIAMOND.grid, MINI_DIAMOND.palette, 0, 0, 2);
  const signMiniIcon = renderPixelGrid(MINI_SIGN.grid, MINI_SIGN.palette, 0, 0, 2);

  const rowsSvg = [];
  const rowClips = [];
  const rowStartY = 64;
  const rowStep = 36;

  for (let i = 0; i < maxDisplay; i++) {
    const ry = rowStartY + i * rowStep;
    const entry = entries[i];

    if (entry) {
      const safeUser = escapeXml('@' + truncateChars(String(entry.user || 'guest').replace(/^@/, ''), 16));
      const safeMsg = escapeXml(truncateChars(entry.message || '', maxMsgLen));
      const safeDate = escapeXml(String(entry.date || '').slice(0, 10));
      const bulletColor = i === 0 ? '#4ade80' : '#38bdf8';

      rowClips.push(`<clipPath id="gb-msg-clip-${i}"><rect x="304" y="${ry}" width="466" height="30"/></clipPath>`);
      rowsSvg.push(`
      <!-- 留言槽 ${i + 1} -->
      <rect x="140" y="${ry}" width="720" height="30" fill="#2e1c0e" opacity="0.88"/>
      <rect x="140" y="${ry}" width="720" height="2" fill="#1d1107"/>
      <rect x="140" y="${ry}" width="2" height="30" fill="#1d1107"/>
      <rect x="140" y="${ry + 28}" width="720" height="2" fill="#825a2f" opacity="0.65"/>
      <rect x="858" y="${ry}" width="2" height="30" fill="#825a2f" opacity="0.65"/>
      <!-- 像素访客标记 -->
      <rect x="152" y="${ry + 12}" width="6" height="6" fill="${bulletColor}"/>
      <rect x="152" y="${ry + 12}" width="2" height="2" fill="#ffffff" opacity="0.85"/>
      <!-- 访客 ID -->
      <text x="166" y="${ry + 19.5}" fill="#fde047" font-family="${monoFont}" font-size="12.5" font-weight="700" shape-rendering="geometricPrecision">${safeUser}</text>
      <!-- 分隔点 -->
      <rect x="294" y="${ry + 14}" width="3" height="3" fill="#9c7548"/>
      <!-- 留言正文（带安全裁剪防溢出） -->
      <g clip-path="url(#gb-msg-clip-${i})">
        <text x="306" y="${ry + 19.5}" fill="#fef3c7" font-family="${uiFont}" font-size="12.5" font-weight="600" shape-rendering="geometricPrecision">${safeMsg}</text>
      </g>
      <!-- 日期 -->
      <text x="846" y="${ry + 19.5}" text-anchor="end" fill="#b38d62" font-family="${monoFont}" font-size="11" shape-rendering="geometricPrecision">${safeDate}</text>
      `);
    } else {
      rowsSvg.push(`
      <!-- 空木板行 ${i + 1} -->
      <rect x="140" y="${ry}" width="720" height="30" fill="#4f3319" opacity="0.46"/>
      <rect x="140" y="${ry}" width="720" height="2" fill="#3a2310" opacity="0.7"/>
      <rect x="140" y="${ry + 28}" width="720" height="2" fill="#cfa668" opacity="0.32"/>
      <text x="500" y="${ry + 19.5}" text-anchor="middle" fill="#e5c899" opacity="0.58" font-family="${uiFont}" font-size="11.5" letter-spacing="1.2" shape-rendering="geometricPrecision">${escapeXml(emptyHint)}</text>
      `);
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 248" width="1000" height="248" shape-rendering="crispEdges" role="img" aria-label="${escapeXml(titleText)}">
  <title>${escapeXml(titleText)}</title>

  <defs>
    ${rowClips.join('\n    ')}
  </defs>

  <style>
    @keyframes diamondPulse {
      0%, 100% { opacity: 0.78; transform: translateY(0); }
      50% { opacity: 1; transform: translateY(-1px); }
    }
    .gb-diamond { animation: diamondPulse 2.6s steps(2, end) infinite; }

    @media (prefers-reduced-motion: reduce) {
      .gb-diamond { animation: none !important; }
    }
  </style>

  <!-- 告示牌底部木桩 -->
  <rect x="478" y="218" width="44" height="26" fill="#26160a"/>
  <rect x="482" y="218" width="36" height="22" fill="#704c27"/>
  <rect x="482" y="218" width="8" height="22" fill="#875d31"/>
  <rect x="510" y="218" width="8" height="22" fill="#523519"/>
  <rect x="486" y="226" width="6" height="6" fill="#5c3d1e"/>
  <rect x="500" y="230" width="6" height="6" fill="#5c3d1e"/>
  <!-- 木桩底部小草点缀 -->
  <rect x="470" y="238" width="8" height="6" fill="#4d9926"/>
  <rect x="474" y="234" width="4" height="4" fill="#63ba38"/>
  <rect x="522" y="238" width="8" height="6" fill="#4d9926"/>
  <rect x="522" y="234" width="4" height="4" fill="#63ba38"/>

  <!-- 橡木告示牌主体外框（深色树皮像素切角边框） -->
  <path d="M${boardX + 4},${boardY - 4} H${boardX + boardW - 4} V${boardY} H${boardX + boardW} V${boardY + boardH} H${boardX + boardW - 4} V${boardY + boardH + 4} H${boardX + 4} V${boardY + boardH} H${boardX} V${boardY} H${boardX + 4} Z" fill="#26160a"/>

  <!-- 5 条经典 MC 橡木横向木板纹理 -->
  <rect x="${boardX + 4}" y="${boardY}" width="${boardW - 8}" height="42" fill="#ba9052"/>
  <rect x="${boardX + 4}" y="${boardY + 42}" width="${boardW - 8}" height="42" fill="#ad8346"/>
  <rect x="${boardX + 4}" y="${boardY + 84}" width="${boardW - 8}" height="42" fill="#b58b4e"/>
  <rect x="${boardX + 4}" y="${boardY + 126}" width="${boardW - 8}" height="42" fill="#a87e42"/>
  <rect x="${boardX + 4}" y="${boardY + 168}" width="${boardW - 8}" height="44" fill="#9c733a"/>

  <!-- 木板水平接缝 + 高光边 -->
  <g fill="#6e4a23">
    <rect x="${boardX + 4}" y="${boardY + 40}" width="${boardW - 8}" height="2"/>
    <rect x="${boardX + 4}" y="${boardY + 82}" width="${boardW - 8}" height="2"/>
    <rect x="${boardX + 4}" y="${boardY + 124}" width="${boardW - 8}" height="2"/>
    <rect x="${boardX + 4}" y="${boardY + 166}" width="${boardW - 8}" height="2"/>
  </g>
  <g fill="#cfa668" opacity="0.6">
    <rect x="${boardX + 4}" y="${boardY + 42}" width="${boardW - 8}" height="2"/>
    <rect x="${boardX + 4}" y="${boardY + 84}" width="${boardW - 8}" height="2"/>
    <rect x="${boardX + 4}" y="${boardY + 126}" width="${boardW - 8}" height="2"/>
    <rect x="${boardX + 4}" y="${boardY + 168}" width="${boardW - 8}" height="2"/>
  </g>

  <!-- 橡木像素木纹细节点缀 -->
  <g fill="#8c6333" opacity="0.5">
    <rect x="132" y="16" width="28" height="4"/><rect x="420" y="20" width="44" height="4"/>
    <rect x="612" y="14" width="32" height="4"/><rect x="128" y="64" width="20" height="4"/>
    <rect x="862" y="72" width="16" height="4"/><rect x="124" y="148" width="16" height="4"/>
    <rect x="862" y="156" width="16" height="4"/><rect x="260" y="208" width="48" height="4"/>
    <rect x="640" y="208" width="52" height="4"/>
  </g>
  <g fill="#d6ae70" opacity="0.45">
    <rect x="240" y="14" width="24" height="4"/><rect x="520" y="34" width="36" height="4"/>
    <rect x="126" y="110" width="14" height="4"/><rect x="864" y="114" width="14" height="4"/>
  </g>

  <!-- 木牌四周立体倒角 -->
  <rect x="${boardX + 4}" y="${boardY}" width="${boardW - 8}" height="4" fill="#d9b272"/>
  <rect x="${boardX + 4}" y="${boardY}" width="4" height="${boardH}" fill="#cca364"/>
  <rect x="${boardX + 4}" y="${boardY + boardH - 4}" width="${boardW - 8}" height="4" fill="#6b4721"/>
  <rect x="${boardX + boardW - 8}" y="${boardY}" width="4" height="${boardH}" fill="#6b4721"/>

  <!-- 四角深铁铆钉 -->
  <g>
    <rect x="124" y="16" width="6" height="6" fill="#26160a"/>
    <rect x="125" y="17" width="4" height="4" fill="#64748b"/>
    <rect x="870" y="16" width="6" height="6" fill="#26160a"/>
    <rect x="871" y="17" width="4" height="4" fill="#64748b"/>
    <rect x="124" y="206" width="6" height="6" fill="#26160a"/>
    <rect x="125" y="207" width="4" height="4" fill="#64748b"/>
    <rect x="870" y="206" width="6" height="6" fill="#26160a"/>
    <rect x="871" y="207" width="4" height="4" fill="#64748b"/>
  </g>

  <!-- 顶栏：左侧告示牌标题 + 右侧发光钻石计数徽章 -->
  <g transform="translate(142, 23)">${signMiniIcon}</g>
  <text x="171" y="38.5" fill="#e5c58a" opacity="0.85" font-family="${uiFont}" font-size="${isZh ? 16 : 15}" font-weight="900" letter-spacing="${isZh ? 2 : 1.8}" shape-rendering="geometricPrecision">${escapeXml(titleText)}</text>
  <text x="170" y="37" fill="#291608" font-family="${uiFont}" font-size="${isZh ? 16 : 15}" font-weight="900" letter-spacing="${isZh ? 2 : 1.8}" shape-rendering="geometricPrecision">${escapeXml(titleText)}</text>

  <!-- 右侧钻石计数器（深色石板徽章 + 发光像素钻石） -->
  <g>
    <rect x="692" y="17" width="168" height="30" fill="#0d131f"/>
    <rect x="694" y="19" width="164" height="26" fill="#182233"/>
    <rect x="694" y="19" width="164" height="2" fill="#38bdf8" opacity="0.75"/>
    <rect x="694" y="43" width="164" height="2" fill="#0b101b"/>
    <g transform="translate(706, 24)" class="gb-diamond">${diamondIcon}</g>
    <text x="794" y="37.5" text-anchor="middle" fill="#060a12" font-family="${uiFont}" font-size="13.5" font-weight="800" letter-spacing="0.8" shape-rendering="geometricPrecision">${escapeXml(diamondText)}</text>
    <text x="793" y="36.5" text-anchor="middle" fill="#67e8f9" font-family="${uiFont}" font-size="13.5" font-weight="800" letter-spacing="0.8" shape-rendering="geometricPrecision">${escapeXml(diamondText)}</text>
  </g>

  <!-- 最近 4 条访客留言槽 -->
  ${rowsSvg.join('\n')}
</svg>
`;
}

// ============================================================================
// 7. Zero-Prose Bilingual README & Snake Workflow Generators
// ============================================================================
function generateReadme(lang) {
  const isZh = lang === 'zh';
  const zhBtn = isZh ? './assets/btn-zh-active.svg' : './assets/btn-zh-idle.svg';
  const enBtn = isZh ? './assets/btn-en-idle.svg' : './assets/btn-en-active.svg';
  const bannerFile = isZh ? './assets/mc-banner-zh.svg' : './assets/mc-banner-en.svg';
  const hotbarFile = isZh ? './assets/mc-hotbar-zh.svg' : './assets/mc-hotbar-en.svg';
  const guestbookFile = isZh ? './assets/guestbook-zh.svg' : './assets/guestbook-en.svg';
  const diamondBtnFile = isZh ? './assets/btn-diamond-zh.svg' : './assets/btn-diamond-en.svg';
  const signBtnFile = isZh ? './assets/btn-sign-zh.svg' : './assets/btn-sign-en.svg';

  const repoUrl = `https://github.com/${config.username}/${config.repo}`;
  const diamondHref = `${repoUrl}/issues/new?title=mc:diamond&body=${encodeURIComponent('送你一颗钻石！')}`;
  const signHref = `${repoUrl}/issues/new?title=mc:sign&body=${encodeURIComponent('在这里写下你想留的话（建议30字以内）：')}`;
  const rawBase = `https://raw.githubusercontent.com/${config.username}/${config.repo}/${config.snake.branch}`;

  return `<div align="center">
  <a href="./README.md"><img src="${zhBtn}" alt="中文" height="34" /></a>
  <a href="./README.en.md"><img src="${enBtn}" alt="EN" height="34" /></a>
</div>

<br />

<div align="center">
  <img src="${bannerFile}" alt="${escapeXml(config.banner.title)}" width="100%" />
</div>

<div align="center">
  <img src="${hotbarFile}" alt="Minecraft Hotbar" width="100%" />
</div>

<div align="center">
  <img src="${guestbookFile}" alt="Minecraft Oak Sign Guestbook" width="100%" />
</div>

<div align="center">
  <a href="${diamondHref}"><img src="${diamondBtnFile}" alt="${isZh ? '投喂钻石' : 'Drop Diamond'}" height="38" /></a>
  &nbsp;&nbsp;
  <a href="${signHref}"><img src="${signBtnFile}" alt="${isZh ? '告示牌留言' : 'Sign Board'}" height="38" /></a>
</div>

<br />

<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="${rawBase}/mc-snake-dark.svg" />
    <source media="(prefers-color-scheme: light)" srcset="${rawBase}/mc-snake-light.svg" />
    <img alt="Minecraft Contribution Snake" src="${rawBase}/mc-snake-light.svg" width="100%" />
  </picture>
</div>
`;
}

function encodeSnkColor(hex) {
  const clean = String(hex).trim().replace(/^(%23|#)/i, '');
  return `%23${clean}`;
}

function encodeSnkDots(dots) {
  return String(dots)
    .split(',')
    .map((c) => encodeSnkColor(c))
    .join(',');
}

function generateWorkflow() {
  const { branch, dark, light } = config.snake;
  const darkSnake = encodeSnkColor(dark.snake);
  const darkDots = encodeSnkDots(dark.dots);
  const lightSnake = encodeSnkColor(light.snake);
  const lightDots = encodeSnkDots(light.dots);
  return `name: Generate Minecraft Contribution Snake

on:
  schedule:
    - cron: "0 0 * * *"
  workflow_dispatch:

permissions:
  contents: write

jobs:
  generate:
    runs-on: ubuntu-latest
    timeout-minutes: 5

    steps:
      - name: Generate Minecraft ore snake SVGs
        uses: Platane/snk/svg-only@v3
        with:
          github_user_name: \${{ github.repository_owner }}
          outputs: |
            dist/mc-snake-dark.svg?palette=github-dark&color_snake=${darkSnake}&color_dots=${darkDots}
            dist/mc-snake-light.svg?palette=github-light&color_snake=${lightSnake}&color_dots=${lightDots}

      - name: Push snake SVGs to ${branch} branch
        uses: crazy-max/ghaction-github-pages@v4
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
        with:
          target_branch: ${branch}
          build_dir: dist
`;
}

// ============================================================================
// Write all outputs
// ============================================================================
function writeOut(relPath, content) {
  const fullPath = path.join(ROOT, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`  ✔ ${relPath} (${Buffer.byteLength(content, 'utf8')} bytes)`);
}

export function generateAll({ guestbookOnly = false } = {}) {
  const latestGuestbook = fs.existsSync(guestbookPath)
    ? JSON.parse(fs.readFileSync(guestbookPath, 'utf8'))
    : guestbook;

  if (guestbookOnly) {
    writeOut('assets/guestbook-zh.svg', generateGuestbook({ data: latestGuestbook, lang: 'zh' }));
    writeOut('assets/guestbook-en.svg', generateGuestbook({ data: latestGuestbook, lang: 'en' }));
    return;
  }

  console.log('Generating Minecraft Visual GitHub Profile from profile.config.json...');

  writeOut('assets/btn-zh-active.svg', generateLangButton({ label: '中文', active: true, isZh: true }));
  writeOut('assets/btn-zh-idle.svg', generateLangButton({ label: '中文', active: false, isZh: true }));
  writeOut('assets/btn-en-active.svg', generateLangButton({ label: 'EN', active: true, isZh: false }));
  writeOut('assets/btn-en-idle.svg', generateLangButton({ label: 'EN', active: false, isZh: false }));

  writeOut('assets/btn-diamond-zh.svg', generateActionButton({ label: '投喂钻石', kind: 'diamond', isZh: true }));
  writeOut('assets/btn-diamond-en.svg', generateActionButton({ label: 'Drop Diamond', kind: 'diamond', isZh: false }));
  writeOut('assets/btn-sign-zh.svg', generateActionButton({ label: '告示牌留言', kind: 'sign', isZh: true }));
  writeOut('assets/btn-sign-en.svg', generateActionButton({ label: 'Sign Board', kind: 'sign', isZh: false }));

  writeOut('assets/mc-banner-zh.svg', generateBanner({
    title: config.banner.title,
    subtitle: config.banner.subtitle.zh,
    lang: 'zh',
  }));
  writeOut('assets/mc-banner-en.svg', generateBanner({
    title: config.banner.title,
    subtitle: config.banner.subtitle.en,
    lang: 'en',
  }));

  writeOut('assets/mc-hotbar-zh.svg', generateHotbar({
    items: config.hotbar.items,
    activeSlot: config.hotbar.activeSlot,
    showHudStats: config.hotbar.showHudStats,
    lang: 'zh',
  }));
  writeOut('assets/mc-hotbar-en.svg', generateHotbar({
    items: config.hotbar.items,
    activeSlot: config.hotbar.activeSlot,
    showHudStats: config.hotbar.showHudStats,
    lang: 'en',
  }));

  writeOut('assets/guestbook-zh.svg', generateGuestbook({ data: latestGuestbook, lang: 'zh' }));
  writeOut('assets/guestbook-en.svg', generateGuestbook({ data: latestGuestbook, lang: 'en' }));

  writeOut('README.md', generateReadme('zh'));
  writeOut('README.en.md', generateReadme('en'));
  writeOut('.github/workflows/snake.yml', generateWorkflow());

  console.log('Done!');
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (isDirectRun) {
  const guestbookOnly = process.argv.includes('--guestbook-only');
  generateAll({ guestbookOnly });
}
