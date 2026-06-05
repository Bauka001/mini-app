import { useCallback, useEffect, useMemo, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Gamepad2,
  Settings,
  LogOut,
  Menu,
  X,
  Ticket,
  Search,
  RefreshCcw,
  Moon,
  Sun,
  Share2,
  Eye,
} from 'lucide-react';
import { clsx } from 'clsx';
import { getAdminDashboard, AdminDashboardStats } from '../../utils/adminApi';

type BadgeKey = 'feedback' | 'tickets' | 'chat';

type MenuItem = {
  icon: typeof LayoutDashboard;
  label: string;
  path: string;
  badge?: BadgeKey;
  hint?: string;
};

export const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [desktopOpen, setDesktopOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDark, setIsDark] = useState<boolean>(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  );
  const [query, setQuery] = useState('');
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const menuItems: MenuItem[] = useMemo(
    () => [
      { icon: LayoutDashboard, label: 'Дашборд', path: '/admin', hint: 'Басты бет' },
      { icon: Users, label: 'Пайдаланушылар', path: '/admin/users', hint: 'Role, ban, search' },
      { icon: MessageSquare, label: 'Чат модерациясы', path: '/admin/chat', badge: 'chat', hint: 'Reports' },
      { icon: Ticket, label: 'Тікеттер', path: '/admin/tickets', badge: 'tickets', hint: 'Pending verify' },
      { icon: Gamepad2, label: 'Ойын аналитикасы', path: '/admin/games', hint: 'Usage stats' },
      { icon: Eye, label: 'Кірулер', path: '/admin/visitors', hint: 'Кім кірді / қанша' },
      { icon: Share2, label: 'Social Tasks', path: '/admin/tasks', hint: 'Әлеуметтік тапсырмалар' },
      { icon: Settings, label: 'Баптаулар', path: '/admin/settings', hint: 'Feature flags' },
    ],
    []
  );

  const currentItem = menuItems.find((item) =>
    item.path === '/admin' ? location.pathname === '/admin' : location.pathname.startsWith(item.path)
  );

  const loadStats = useCallback(async () => {
    try {
      setRefreshing(true);
      const data = await getAdminDashboard();
      setStats(data.stats);
    } catch {
      // silent; dashboard page handles visible errors
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadStats();
    const id = setInterval(() => void loadStats(), 45_000);
    return () => clearInterval(id);
  }, [loadStats]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        document.getElementById('admin-global-search')?.focus();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setDesktopOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const toggleDark = () => {
    const next = !isDark;
    document.documentElement.classList.toggle('dark', next);
    setIsDark(next);
  };

  const handleLogout = () => {
    if (window.confirm('Админ панелінен шығу керек пе?')) {
      navigate('/');
    }
  };

  const badgeCount = (key?: BadgeKey): number => {
    if (!stats || !key) return 0;
    if (key === 'feedback') return stats.pendingFeedbacks || 0;
    if (key === 'tickets') return stats.pendingTickets || 0;
    if (key === 'chat') return stats.pendingChatReports || 0;
    return 0;
  };

  const totalAlerts =
    (stats?.pendingFeedbacks || 0) + (stats?.pendingTickets || 0) + (stats?.pendingChatReports || 0);

  const filteredMenu = query.trim()
    ? menuItems.filter((m) => m.label.toLowerCase().includes(query.trim().toLowerCase()))
    : menuItems;

  const renderMenuItem = (item: MenuItem, onClick?: () => void) => {
    const Icon = item.icon;
    const isActive =
      item.path === '/admin' ? location.pathname === '/admin' : location.pathname.startsWith(item.path);
    const count = badgeCount(item.badge);
    return (
      <li key={item.path}>
        <button
          onClick={() => {
            onClick?.();
            navigate(item.path);
          }}
          className={clsx(
            'group relative w-full flex items-center gap-3 px-4 py-2.5 rounded-xl mx-2 my-0.5 text-left transition-all',
            isActive
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
          )}
          title={item.hint}
        >
          <Icon className={clsx('w-5 h-5 shrink-0 transition-transform group-hover:scale-110', isActive && 'drop-shadow')} />
          <span className="font-medium text-sm flex-1 truncate">{item.label}</span>
          {count > 0 && (
            <span
              className={clsx(
                'min-w-[22px] h-5 px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center',
                isActive ? 'bg-white text-blue-700' : 'bg-red-500 text-white animate-pulse'
              )}
            >
              {count > 99 ? '99+' : count}
            </span>
          )}
        </button>
      </li>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col">
      <nav className="sticky top-0 z-40 bg-white/95 dark:bg-gray-800/95 backdrop-blur shadow-sm border-b border-gray-200 dark:border-gray-700 px-3 sm:px-4 py-2.5 flex items-center gap-3">
        <button
          onClick={() => {
            if (window.matchMedia('(min-width: 768px)').matches) setDesktopOpen((v) => !v);
            else setMobileOpen(true);
          }}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors shrink-0"
          aria-label="Menu"
        >
          <Menu className="w-5 h-5 text-gray-700 dark:text-gray-200" />
        </button>

        <div className="min-w-0 flex-1 flex items-center gap-4">
          <div className="min-w-0 hidden sm:block">
            <h1 className="text-lg font-black text-gray-900 dark:text-white leading-tight truncate">Admin Panel</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight truncate">
              {currentItem?.label || 'Баскару орталығы'}
              {currentItem?.hint ? <span className="opacity-60"> · {currentItem.hint}</span> : null}
            </p>
          </div>

          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              id="admin-global-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Іздеу… (Ctrl+K)"
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-900/60 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition"
            />
          </div>
        </div>

        {totalAlerts > 0 && (
          <button
            onClick={() => navigate(currentItem?.path === '/admin' ? '/admin/tickets' : '/admin')}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-bold border border-red-200 dark:border-red-800"
            title="Pending tasks"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            {totalAlerts} кутуде
          </button>
        )}

        <button
          onClick={() => void loadStats()}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors shrink-0"
          aria-label="Refresh"
          title="Статистиканы жаңарту"
        >
          <RefreshCcw className={clsx('w-4 h-4 text-gray-600 dark:text-gray-300', refreshing && 'animate-spin')} />
        </button>

        <button
          onClick={toggleDark}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors shrink-0"
          aria-label="Theme"
          title={isDark ? 'Жарық режим' : 'Қараңғы режим'}
        >
          {isDark ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-gray-600" />
          )}
        </button>

        <div className="hidden md:flex items-center gap-2 pl-2 ml-1 border-l border-gray-200 dark:border-gray-700">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs font-bold flex items-center justify-center shadow">
            A
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Шыгу
          </button>
        </div>
        <button
          onClick={handleLogout}
          className="md:hidden p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors shrink-0"
          aria-label="Logout"
        >
          <LogOut className="w-4 h-4 text-red-600" />
        </button>
      </nav>

      <div className="flex flex-1 min-h-0">
        <aside
          className={clsx(
            'hidden md:block bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shrink-0 transition-all duration-200',
            desktopOpen ? 'w-64' : 'w-0 overflow-hidden'
          )}
        >
          <div className="sticky top-[57px] py-3">
            <ul>
              {filteredMenu.map((item) => renderMenuItem(item))}
              {filteredMenu.length === 0 && (
                <li className="px-4 py-3 text-xs text-gray-400 italic">Сәйкес пункт жок</li>
              )}
            </ul>
            <div className="mt-4 px-4 pb-4 text-[11px] text-gray-400 dark:text-gray-500 leading-relaxed">
              <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-[10px] font-mono">Ctrl+B</kbd> буйір панель
              <br />
              <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-[10px] font-mono">Ctrl+K</kbd> іздеу
              <br />
              <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-[10px] font-mono">Esc</kbd> жабу
            </div>
          </div>
        </aside>

        {mobileOpen && (
          <>
            <div
              className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
              aria-hidden
            />
            <aside className="md:hidden fixed top-0 left-0 z-50 h-full w-72 bg-white dark:bg-gray-800 shadow-2xl border-r border-gray-200 dark:border-gray-700 flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="font-bold text-gray-900 dark:text-white">Меню</h2>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </button>
              </div>
              <ul className="flex-1 py-3 overflow-y-auto">
                {menuItems.map((item) => renderMenuItem(item, () => setMobileOpen(false)))}
              </ul>
              {totalAlerts > 0 && (
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 text-xs font-semibold text-red-600 dark:text-red-400">
                  {totalAlerts} элемент кутуде
                </div>
              )}
            </aside>
          </>
        )}

        <main className="flex-1 min-w-0 p-4 sm:p-6 overflow-x-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
