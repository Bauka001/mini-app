// Simple JSON-file-backed local store for Admin Panel V2 fallback.
// Used when Supabase is not configured (placeholder credentials).
'use strict';
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.resolve(__dirname, 'admin-v2-data.json');

const defaultState = () => ({
  promoCodes: [],          // [{ code, discountPercent, planCodes:[], maxUses, usedCount, validUntil, isActive, note, bloggerName, createdBy, createdAt, updatedAt }]
  promoRedemptions: [],
  appSettings: {},         // { key: { value, updatedAt, updatedBy } }
  sessions: {},            // not persisted: rebuilt on restart (kept in memory)
});

function read() {
  try {
    if (!fs.existsSync(DATA_FILE)) return defaultState();
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const data = JSON.parse(raw);
    return { ...defaultState(), ...data };
  } catch (_) {
    return defaultState();
  }
}

function write(data) {
  // Don't persist live sessions
  const { sessions, ...rest } = data;
  fs.writeFileSync(DATA_FILE, JSON.stringify(rest, null, 2), 'utf8');
}

const cache = read();

module.exports = {
  state: cache,
  save: () => write(cache),
  reload: () => {
    Object.assign(cache, read());
    return cache;
  },
};
