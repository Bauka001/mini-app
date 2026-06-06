import { useCallback, useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { RefreshCcw, Users, UserCheck, UserX, Activity, CalendarDays, Crown, Megaphone, Send } from 'lucide-react';
import { getAdminVisitors, AdminVisitorsResponse, AdminVisitorRow, adminMessageUser, adminBroadcast } from '../../utils/adminApi';

const fmtDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleString('kk-KZ', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
};

const platformEmoji = (p: string | null) => {
  switch ((p || '').toLowerCase()) {
    case 'ios': return '🍎';
    case 'android': return '🤖';
    case 'tdesktop': case 'macos': case 'windows': case 'linux': return '🖥️';
    case 'web': case 'weba': case 'webk': return '🌐';
    default: return '❔';
  }
};

const StatCard = ({ icon: Icon, label, value, tone }: { icon: typeof Users; label: string; value: number; tone: string }) => (
  <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</span>
      <span className={clsx('flex h-8 w-8 items-center justify-center rounded-xl', tone)}>
        <Icon className="h-4 w-4" />
      </span>
    </div>
    <div className="mt-2 text-3xl font-black text-gray-900 dark:text-white">{value.toLocaleString('kk-KZ')}</div>
  </div>
);

export const AdminVisitors = () => {
  const [data, setData] = useState<AdminVisitorsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Broadcast panel
  const [bcText, setBcText] = useState('');
  const [bcPin, setBcPin] = useState(false);
  const [bcBusy, setBcBusy] = useState(false);
  const [bcMsg, setBcMsg] = useState<string | null>(null);

  const runBroadcast = async () => {
    const text = bcText.trim();
    if (!text || bcBusy) return;
    if (!window.confirm(`Хабарды БАРЛЫҚ қолданушыға жіберу керек пе?\n\n"${text.slice(0, 80)}…"`)) return;
    setBcBusy(true);
    setBcMsg(null);
    try {
      const r = await adminBroadcast(text, { pin: bcPin, button: true });
      setBcMsg(`✅ Жіберілді: ${r.sent} · жетпеді: ${r.unreachable} · қате: ${r.failed}${r.capped ? ` (тек алғашқы ${r.attempted}, қалғанына скрипт)` : ''}`);
    } catch (e) {
      setBcMsg(`❌ ${e instanceof Error ? e.message : 'Қате'}`);
    } finally {
      setBcBusy(false);
    }
  };

  const messageUser = async (v: AdminVisitorRow) => {
    if (!v.telegramId) {
      window.alert('Бұл аноним кіруші — ID жоқ, хабар жіберілмейді.');
      return;
    }
    const text = window.prompt(`Хабар жазыңыз (→ ${v.firstName || v.username || v.telegramId}):`);
    if (!text || !text.trim()) return;
    try {
      const r = await adminMessageUser(v.telegramId, text.trim());
      window.alert(r.ok ? '✅ Жіберілді' : `❌ ${r.error || 'Жетпеді (қолданушы ботты Start баспаған болуы мүмкін)'}`);
    } catch (e) {
      window.alert(`❌ ${e instanceof Error ? e.message : 'Қате'}`);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAdminVisitors();
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Қате');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const s = data?.stats;
  const recent: AdminVisitorRow[] = data?.recent || [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-gray-900 dark:text-white">Кірулер / Visitors</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Мини-апқа кім кірді — тіркелгендер де, анонимдер де.</p>
        </div>
        <button
          onClick={() => void load()}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-bold text-white hover:bg-blue-700"
        >
          <RefreshCcw className={clsx('h-4 w-4', loading && 'animate-spin')} /> Жаңарту
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Broadcast panel */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <div className="mb-3 flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-blue-600" />
          <h2 className="font-bold text-gray-900 dark:text-white">Рассылка — бәріне хабар</h2>
        </div>
        <textarea
          value={bcText}
          onChange={(e) => setBcText(e.target.value)}
          rows={3}
          placeholder="Хабар мәтіні…  (HTML рұқсат: <b>, <i>)  ·  «🚀 Запустить» батырмасы автоматты қосылады"
          className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 p-3 text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <input type="checkbox" checked={bcPin} onChange={(e) => setBcPin(e.target.checked)} className="h-4 w-4 rounded" />
            Әр чатта бекіту (pin)
          </label>
          <button
            onClick={() => void runBroadcast()}
            disabled={bcBusy || !bcText.trim()}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Send className={clsx('h-4 w-4', bcBusy && 'animate-pulse')} /> {bcBusy ? 'Жіберілуде…' : '📢 Бәріне жіберу'}
          </button>
        </div>
        {bcMsg && <div className="mt-3 rounded-xl bg-gray-100 dark:bg-gray-900 px-3 py-2 text-sm text-gray-700 dark:text-gray-200">{bcMsg}</div>}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard icon={Users} label="Барлық кіруші" value={s?.totalVisitors ?? 0} tone="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" />
        <StatCard icon={UserCheck} label="Telegram (ID-мен)" value={s?.verified ?? 0} tone="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" />
        <StatCard icon={UserX} label="Аноним (ID жоқ)" value={s?.anonymous ?? 0} tone="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" />
        <StatCard icon={Crown} label="Тіркелген" value={s?.registeredUsers ?? 0} tone="bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300" />
        <StatCard icon={Activity} label="Белсенді (24с)" value={s?.active24 ?? 0} tone="bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300" />
        <StatCard icon={CalendarDays} label="Белсенді (7к)" value={s?.active7 ?? 0} tone="bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300" />
      </div>

      {/* Recent visitors */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-3">
          <h2 className="font-bold text-gray-900 dark:text-white">Соңғы кірушілер ({recent.length})</h2>
        </div>

        {loading && recent.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">Жүктелуде…</div>
        ) : recent.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            Әзірше кіру жазбасы жоқ.<br />
            <span className="text-xs">(Кесте бос болса — Supabase-те <code>011_app_visitors.sql</code> миграциясын қолданыңыз.)</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  <th className="px-4 py-2 font-semibold">Кіруші</th>
                  <th className="px-4 py-2 font-semibold">Түрі</th>
                  <th className="px-4 py-2 font-semibold">Платформа</th>
                  <th className="px-2 py-2 font-semibold text-center">Кіру</th>
                  <th className="px-4 py-2 font-semibold">Соңғы рет</th>
                  <th className="px-4 py-2 font-semibold">Source</th>
                  <th className="px-2 py-2 font-semibold text-center">✉️</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((v) => (
                  <tr key={v.visitorKey} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-2.5">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {v.firstName || v.username || (v.isVerified ? `ID ${v.telegramId}` : 'Аноним')}
                        {v.isPremium && <span title="Telegram Premium"> ⭐</span>}
                      </div>
                      <div className="text-xs text-gray-400">
                        {v.username ? `@${v.username}` : v.isVerified ? `tg:${v.telegramId}` : 'no id'}
                        {v.languageCode ? ` · ${v.languageCode}` : ''}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      {v.isVerified ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">Telegram</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">Аноним</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300">{platformEmoji(v.platform)} {v.platform || '—'}</td>
                    <td className="px-2 py-2.5 text-center font-bold text-gray-900 dark:text-white">{v.visitCount}</td>
                    <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmtDate(v.lastSeenAt)}</td>
                    <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400">{v.startParam || '—'}</td>
                    <td className="px-2 py-2.5 text-center">
                      <button
                        onClick={() => void messageUser(v)}
                        disabled={!v.telegramId}
                        title={v.telegramId ? 'Хабар жазу' : 'Аноним — ID жоқ'}
                        className="rounded-lg p-1.5 text-blue-600 hover:bg-blue-50 disabled:opacity-30 dark:hover:bg-blue-900/30"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-center text-xs text-gray-400">
        Әр кіру автоматты жазылады (<code>/track/visit</code>). Аноним кірушілер тұрақты құрылғы-ID-мен есептеледі.
      </p>
    </div>
  );
};

export default AdminVisitors;
