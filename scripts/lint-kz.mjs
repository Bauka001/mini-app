#!/usr/bin/env node
/**
 * Lint the kz: { translation: {...} } block in src/i18n/i18n.ts for
 * common contamination — Russian-only words and English UI strings that
 * leaked into Kazakh translations.
 *
 *   node scripts/lint-kz.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(__dirname, '..', 'src', 'i18n', 'i18n.ts');
const lines = fs.readFileSync(FILE, 'utf8').split('\n');

// Russian-only words that almost never appear in Kazakh text (loanwords are excluded
// — e.g. "магазин", "компьютер" are valid in both)
const RU_WORDS = [
  'Колесо', 'Фортуны', 'Пополнение', 'пополнение',
  'Получи', 'Получить', 'Получено', 'Получаете',
  'Скоро', 'Сегодня', 'Завтра', 'Сейчас',
  'Бесплатно', 'Подарок', 'подарок',
  'Купить', 'купить', 'Продать', 'продать',
  'Открыть', 'Закрыть', 'открыть', 'закрыть',
  'Новый', 'Новая', 'новый', 'новая',
  'Все', 'все', 'Всё',
  'Очень', 'очень',
  'Награда', 'награда', 'награды',
  'Уровень', 'уровень',
  'Активный', 'активный', 'Активирован',
  'Подтвердить', 'подтвердить',
  'Использовать', 'использовать',
  'Прогресс', 'прогресс',
  'Достижения', 'достижения',
  'Друзья', 'друзья',
  'Уведомление', 'уведомление',
];

// English UI words that shouldn't appear in Kazakh translation (proper-noun
// brand names like Telegram/TON/VIP/NFT are excluded)
const EN_BAD = [
  'Wheel', 'Spin', 'Spins', 'spin',
  'Free', 'Daily', 'daily',
  'Crystal', 'crystal',
  'Limit', 'limit',
  'Frontend', 'Backend', 'Server',
  'Shop', 'shop',
  'Buy', 'Sell', 'Get', 'get',
  'Now', 'Next', 'Back',
  'Cancel', 'Confirm',
  'Open', 'Close',
  'Profile', 'Settings', 'Theme',
  'Sound', 'Music', 'Language',
  'Secure', 'Tutorial',
  'Loading', 'loading',
  'Click', 'click',
];

let cur = null;
const issues = [];

lines.forEach((line, i) => {
  const top = /^\s+(en|ru|kz):\s*{\s*$/.exec(line);
  if (top) { cur = top[1]; return; }
  if (cur !== 'kz') return;
  const m = /^\s+"([a-zA-Z0-9_]+)":\s*"(.+?)",?\s*$/.exec(line);
  if (!m) return;
  const [, key, val] = m;
  const ruHits = RU_WORDS.filter((w) => new RegExp('\\b' + w + '\\b').test(val));
  const enHits = EN_BAD.filter((w) => new RegExp('\\b' + w + '\\b').test(val));
  if (ruHits.length || enHits.length) {
    issues.push({ line: i + 1, key, val, ru: ruHits, en: enHits });
  }
});

console.log(`\nFound ${issues.length} contamination issues in kz block:\n`);
issues.forEach(({ line, key, val, ru, en }) => {
  const tags = [];
  if (ru.length) tags.push(`RU=[${ru.join(',')}]`);
  if (en.length) tags.push(`EN=[${en.join(',')}]`);
  console.log(`  L${line}  ${tags.join(' ')}  "${key}": "${val.slice(0, 90)}${val.length > 90 ? '…' : ''}"`);
});

console.log(`\nTotal: ${issues.length} keys need review`);
