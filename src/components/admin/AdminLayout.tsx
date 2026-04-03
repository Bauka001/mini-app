import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, MessageSquare, Gamepad2, Settings, LogOut, ArrowLeft, Ticket } from 'lucide-react';
import { clsx } from 'clsx';

export const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const menuItems = [
    { icon: LayoutDashboard, label: 'Дашборд', path: '/admin' },
    { icon: Users, label: 'Пайдаланушылар', path: '/admin/users' },
    { icon: MessageSquare, label: 'Чат модерациясы', path: '/admin/chat' },
    { icon: Ticket, label: 'Тікеттер', path: '/admin/tickets' },
    { icon: Gamepad2, label: 'Ойын аналитикасы', path: '/admin/games' },
    { icon: Settings, label: 'Баптаулар', path: '/admin/settings' },
  ];

  const currentItem = menuItems.find((item) =>
    item.path === '/admin' ? location.pathname === '/admin' : location.pathname.startsWith(item.path)
  );

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 shadow-md px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className={clsx('w-5 h-5 transition-transform', !sidebarOpen && 'rotate-180')} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Admin Panel</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">{currentItem?.label || 'Басқару орталығы'}</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Шығу
        </button>
      </nav>

      <div className="flex">
        {sidebarOpen && (
          <aside className="w-64 bg-white dark:bg-gray-800 min-h-screen shadow-lg">
            <ul className="py-4">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.path === '/admin'
                  ? location.pathname === '/admin'
                  : location.pathname.startsWith(item.path);
                return (
                  <li key={item.path}>
                    <button
                      onClick={() => navigate(item.path)}
                      className={clsx(
                        'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                        isActive
                          ? 'bg-blue-500 text-white'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>
        )}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
