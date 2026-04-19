import { useEffect, useState } from 'react';
import { useStore } from '../../store/useStoreImpl';
import { Settings, Save, Users as UsersIcon, Shield, Globe, Moon, Sun, Volume2, VolumeX, Bell, RefreshCcw, Trash2, AlertCircle } from 'lucide-react';
import { addAdminMember, AdminSettingsResponse, getAdminSettings, removeAdminMember } from '../../utils/adminApi';

export default function AdminSettings() {
  const { theme, setTheme, soundEnabled, toggleSound, language, setLanguage } = useStore();
  const [data, setData] = useState<AdminSettingsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [newAdminId, setNewAdminId] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<'owner' | 'admin'>('admin');
  const [busyAdminId, setBusyAdminId] = useState<number | null>(null);
  const [isSavingAdmin, setIsSavingAdmin] = useState(false);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const nextData = await getAdminSettings();
      setData(nextData);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Admin settings жүктелмеді');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadSettings();
  }, []);

  const handleSaveAdmin = async () => {
    const telegramId = Number(newAdminId.trim());

    if (!Number.isInteger(telegramId) || telegramId <= 0) {
      setError('Telegram ID дұрыс емес');
      return;
    }

    try {
      setIsSavingAdmin(true);
      setError(null);
      await addAdminMember(telegramId, newAdminRole);
      await loadSettings();
      setNewAdminId('');
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Admin сақталмады');
    } finally {
      setIsSavingAdmin(false);
    }
  };

  const handleRemoveAdmin = async (telegramId: number) => {
    const confirmed = window.confirm('Бұл админді тізімнен өшіргіңіз келе ме?');

    if (!confirmed) {
      return;
    }

    try {
      setBusyAdminId(telegramId);
      setError(null);
      await removeAdminMember(telegramId);
      await loadSettings();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Admin өшірілмеді');
    } finally {
      setBusyAdminId(null);
    }
  };

  const formatDate = (value: string | null) =>
    value
      ? new Date(value).toLocaleString('ru-RU', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'bootstrap';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Settings className="w-8 h-8" />
            Admin Settings
          </h1>
          <button
            onClick={() => void loadSettings()}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700"
          >
            <RefreshCcw className="w-4 h-4" />
            Жаңарту
          </button>
        </div>

        {error ? (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-800/50 backdrop-blur rounded-xl p-6 border border-gray-700">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-400" />
              General Settings
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-700 rounded-lg">
                    {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                  </div>
                  <span>Sound</span>
                </div>
                <button
                  onClick={toggleSound}
                  className={`w-12 h-7 rounded-full transition-colors relative ${
                    soundEnabled ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${
                      soundEnabled ? 'left-6' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-700 rounded-lg">
                    {theme === 'light' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                  </div>
                  <span>Theme</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTheme('dark')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors ${
                      theme === 'dark' ? 'bg-gray-600 text-white border border-gray-500' : 'bg-gray-800/50 text-gray-500'
                    }`}
                  >
                    Dark
                  </button>
                  <button
                    onClick={() => setTheme('light')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors ${
                      theme === 'light' ? 'bg-white text-black' : 'bg-gray-800/50 text-gray-500'
                    }`}
                  >
                    Light
                  </button>
                  <button
                    onClick={() => setTheme('gold')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors ${
                      theme === 'gold' ? 'bg-yellow-400 text-black shadow-lg' : 'bg-gray-800/50 text-yellow-500/50'
                    }`}
                  >
                    Gold
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-700 rounded-lg">
                    <Globe className="w-5 h-5" />
                  </div>
                  <span>Language</span>
                </div>
                <div className="flex gap-2">
                  {(['en', 'ru', 'kz'] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setLanguage(lang)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors ${
                        language === lang ? 'bg-blue-600 text-white' : 'bg-gray-800/50 text-gray-500'
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur rounded-xl p-6 border border-gray-700">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <UsersIcon className="w-5 h-5 text-purple-400" />
              Admin Management
            </h2>

            <div className="space-y-4">
              <div className="rounded-xl border border-gray-700 bg-gray-900/40 p-4 text-sm text-gray-300">
                Рөлдің негізгі дереккөзі енді admin users кестесінде сақталады. Тек owner рөлі admin құрамын өзгерте алады.
              </div>

              <div className="grid gap-3 md:grid-cols-[1fr_140px]">
                <input
                  value={newAdminId}
                  onChange={(event) => setNewAdminId(event.target.value)}
                  placeholder="Telegram ID"
                  className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500"
                  disabled={!data?.canManageAdmins}
                />
                <select
                  value={newAdminRole}
                  onChange={(event) => setNewAdminRole(event.target.value as 'owner' | 'admin')}
                  className="rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500"
                  disabled={!data?.canManageAdmins}
                >
                  <option value="admin">admin</option>
                  <option value="owner">owner</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => void handleSaveAdmin()}
                  disabled={!data?.canManageAdmins || isSavingAdmin}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-bold transition flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save className="w-4 h-4" />
                  Admin сақтау
                </button>
                {saved ? (
                  <span className="flex items-center gap-1 text-green-400 text-sm font-bold">
                    <Bell className="w-4 h-4" />
                    Saved!
                  </span>
                ) : null}
              </div>

              <div className="pt-4 border-t border-gray-700">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-300">Current Admins</h3>
                  <span className="text-xs text-gray-500">Сіздің рөліңіз: {data?.currentUserRole || 'unknown'}</span>
                </div>

                {isLoading ? (
                  <div className="py-8 text-center text-sm text-gray-400">Admin тізімі жүктелуде...</div>
                ) : (
                  <div className="space-y-2">
                    {(data?.admins || []).map((admin) => (
                      <div
                        key={`${admin.telegramId}-${admin.source}`}
                        className="flex items-center justify-between bg-gray-900/50 px-4 py-3 rounded-lg"
                      >
                        <div>
                          <p className="font-mono text-sm">{admin.telegramId}</p>
                          <p className="text-xs text-gray-500">
                            {admin.role} • {admin.source} • {formatDate(admin.createdAt)}
                          </p>
                        </div>
                        <button
                          onClick={() => void handleRemoveAdmin(admin.telegramId)}
                          disabled={!data?.canManageAdmins || admin.source === 'bootstrap' || busyAdminId === admin.telegramId}
                          className="inline-flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-sm font-bold text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                          Өшіру
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-gray-700 bg-gray-800/50 p-6">
          <div className="mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-yellow-400" />
            <h2 className="text-xl font-bold">Соңғы audit events</h2>
          </div>
          <div className="space-y-3">
            {(data?.auditLogs || []).length ? (
              data?.auditLogs.map((log) => (
                <div key={log.id} className="rounded-xl border border-gray-700 bg-gray-900/40 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-bold">{log.action}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        actor #{log.actorTelegramId} • {log.entityType} • {log.entityId || 'n/a'}
                      </p>
                    </div>
                    <span className="text-xs text-gray-500">{formatDate(log.createdAt)}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-gray-700 p-6 text-center text-sm text-gray-400">
                Audit trail әлі бос
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
