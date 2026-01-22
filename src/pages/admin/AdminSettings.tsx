import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { Settings, Save, Users as UsersIcon, MessageSquare, Gamepad2, Shield, Globe, Moon, Sun, Volume2, VolumeX, Bell } from 'lucide-react';

export default function AdminSettings() {
  const { adminIds, user, theme, setTheme, soundEnabled, toggleSound, language, setLanguage } = useStore();
  const [newAdminIds, setNewAdminIds] = useState(adminIds.join(', '));
  const [saved, setSaved] = useState(false);

  const isAdmin = adminIds.includes(user.id);

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-4">
        <Shield className="w-24 h-24 text-red-500 mb-4" />
        <h1 className="text-3xl font-bold mb-2">Access Denied</h1>
        <p className="text-gray-400">You do not have permission to access this page</p>
      </div>
    );
  }

  const handleSaveAdminIds = () => {
    const ids = newAdminIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
    if (ids.length > 0) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
          <Settings className="w-8 h-8" />
          Admin Settings
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* General Settings */}
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

          {/* Admin Management */}
          <div className="bg-gray-800/50 backdrop-blur rounded-xl p-6 border border-gray-700">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <UsersIcon className="w-5 h-5 text-purple-400" />
              Admin Management
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2 text-gray-300">
                  Admin User IDs (comma separated)
                </label>
                <textarea
                  value={newAdminIds}
                  onChange={(e) => setNewAdminIds(e.target.value)}
                  placeholder="123456789, 987654321"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 min-h-[100px] resize-y"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Enter the Telegram user IDs that should have admin access
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveAdminIds}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-bold transition flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Admin IDs
                </button>
                {saved && (
                  <span className="flex items-center gap-1 text-green-400 text-sm font-bold">
                    <Bell className="w-4 h-4" />
                    Saved!
                  </span>
                )}
              </div>

              <div className="pt-4 border-t border-gray-700">
                <h3 className="text-sm font-bold mb-3 text-gray-300">Current Admins</h3>
                <div className="space-y-2">
                  {adminIds.map((adminId, index) => (
                    <div
                      key={`${adminId}-${index}`}
                      className="flex items-center justify-between bg-gray-900/50 px-4 py-2 rounded-lg"
                    >
                      <span className="font-mono text-sm">{adminId}</span>
                      <span className="text-xs text-gray-500">
                        {adminId === user.id ? '(You)' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 border border-blue-500/30 rounded-xl p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <UsersIcon className="w-6 h-6 text-blue-400" />
              <span className="text-sm text-gray-400">Total Users</span>
            </div>
            <p className="text-3xl font-bold">-</p>
          </div>

          <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 border border-green-500/30 rounded-xl p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Gamepad2 className="w-6 h-6 text-green-400" />
              <span className="text-sm text-gray-400">Games Played</span>
            </div>
            <p className="text-3xl font-bold">-</p>
          </div>

          <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 border border-purple-500/30 rounded-xl p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <MessageSquare className="w-6 h-6 text-purple-400" />
              <span className="text-sm text-gray-400">Messages</span>
            </div>
            <p className="text-3xl font-bold">-</p>
          </div>
        </div>
      </div>
    </div>
  );
}
