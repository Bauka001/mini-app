const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.resolve(__dirname, '..', 'supabase', 'migrations');
const FILES = [
  '001_create_users_table.sql',
  '002_admin_panel_foundation.sql',
  '003_create_social_tasks.sql',
  '004_secure_payment_foundation.sql',
  '005_wheel_of_fortune.sql',
  '006_admin_panel_v2.sql',
  '007_stars_focus_nft.sql',
];

(async () => {
  const client = new Client({
    host: 'aws-1-ap-northeast-1.pooler.supabase.com',
    port: 5432,
    user: 'postgres.mpezrsdxzbfcjavmcmqx',
    password: process.env.SUPABASE_DB_PASSWORD,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 20000,
  });

  await client.connect();
  console.log('Connected to Supabase Postgres (session pooler).\n');

  for (const file of FILES) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    process.stdout.write(`Applying ${file} … `);
    try {
      await client.query(sql);
      console.log('✅ OK');
    } catch (e) {
      console.log('❌ ERROR');
      console.log('   ' + e.message);
      // Continue to next file — many errors are idempotency-safe (already exists)
    }
  }

  // Verify key tables now exist
  console.log('\nVerifying tables…');
  const check = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema='public'
    AND table_name = ANY($1)
    ORDER BY table_name
  `, [['users','payment_orders','user_entitlements','plans','plan_prices','stars_grants','user_wallet_links','focus_token_ledger','focus_claim_requests','nft_trophy_awards','user_inventory','user_consumables']]);
  console.log('Present:', check.rows.map(r => r.table_name).join(', '));

  await client.end();
  console.log('\nDone.');
})().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
