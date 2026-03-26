const express = require('express');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json({ limit: '200kb' }));

function validateTelegramInitData(initData, botToken) {
  if (!initData || !botToken) return { ok: false, reason: 'missing_initdata_or_token' };
  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get('hash');
  if (!hash) return { ok: false, reason: 'missing_hash' };
  urlParams.delete('hash');
  // Build data_check_string
  const pairs = [];
  for (const [key, value] of urlParams.entries()) {
    pairs.push(`${key}=${value}`);
  }
  pairs.sort();
  const dataCheckString = pairs.join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  const ok = calculatedHash === hash;

  let userId = null;
  try {
    const userStr = urlParams.get('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      userId = user.id || null;
    }
  } catch {}

  return { ok, userId, reason: ok ? null : 'hash_mismatch' };
}

app.post('/auth/verify', (req, res) => {
  const botToken = process.env.BOT_TOKEN || '';
  const { initData } = req.body || {};
  if (!botToken) {
    // Dev fallback: accept but warn
    console.warn('[AUTH] BOT_TOKEN not set; accepting all initData (dev mode)');
    try {
      const urlParams = new URLSearchParams(initData || '');
      const userStr = urlParams.get('user');
      const user = userStr ? JSON.parse(userStr) : null;
      return res.json({ ok: true, mode: 'dev', userId: user?.id || 0 });
    } catch {
      return res.json({ ok: true, mode: 'dev', userId: 0 });
    }
  }
  const result = validateTelegramInitData(initData, botToken);
  return res.json(result);
});

const PORT = 3001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
