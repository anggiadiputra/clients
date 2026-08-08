import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FileText,
  Tag,
  Download,
  Menu,
  LogOut,
  Globe,
  Settings,
  User,
  Kanban,
  FolderKanban,
  ChevronDown,
  Shield,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useAccess } from '../../contexts/AccessContext';
import { exportClientsXlsx } from '../../lib/api';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true, pageKey: 'dashboard' as const },
  { to: '/clients', icon: Users, label: 'Pelanggan', pageKey: 'clients' as const },
  { to: '/kanban', icon: Kanban, label: 'Calon Pelanggan', pageKey: 'kanban' as const },
  { to: '/projects', icon: FolderKanban, label: 'Proyek', pageKey: 'projects' as const },
  { to: '/invoices', icon: FileText, label: 'Invoice', pageKey: 'invoices' as const },
  { to: '/services', icon: Tag, label: 'Layanan', pageKey: 'services' as const },
];

const primaryBgMap: Record<string, string> = {
  black: 'bg-black',
  blue: 'bg-blue-600',
  emerald: 'bg-emerald-600',
  purple: 'bg-purple-600',
  red: 'bg-red-600',
  orange: 'bg-orange-600',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('sidebar_collapsed') === 'true');
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  function toggleSidebarCollapsed() {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed', String(next));
      return next;
    });
  }
  const { user, logout } = useAuth();
  const { settings } = useSettings();
  const { canAccess } = useAccess();
  const navigate = useNavigate();
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  // Close user dropdown on outside click / Escape
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setUserMenuOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  function handleLogout() {
    setUserMenuOpen(false);
    logout();
    navigate('/login');
  }

  function handleExport() {
    exportClientsXlsx().catch((err) => alert(err.message));
  }

  function goProfile() {
    setUserMenuOpen(false);
    navigate('/profile');
  }

  function goSettings() {
    setUserMenuOpen(false);
    navigate('/settings');
  }


  const primaryBg = primaryBgMap[settings.primaryColor] || 'bg-black';

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: settings.pageBackground }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-40 ${
          sidebarCollapsed ? 'md:w-16' : 'md:w-64'
        } w-64 h-screen md:shrink-0 bg-white border-r border-gray-200 transform transition-all duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 flex flex-col justify-between overflow-y-auto overflow-x-hidden`}
      >

        <div>
          <div className={`h-14 flex items-center ${sidebarCollapsed ? 'md:justify-center md:px-2 px-5' : 'px-5'} gap-3 border-b border-gray-100`}>
            {settings.logo ? (
              <img src={settings.logo} alt="Logo" title={settings.projectName} className="max-h-8 w-auto rounded-lg object-contain shrink-0" />
            ) : (
              <div className={`w-8 h-8 ${primaryBg} rounded-lg flex items-center justify-center shrink-0`}>
                <Globe className="w-4 h-4 text-white" />
              </div>
            )}
            {!settings.logo && (
              <span className={`text-sm font-bold text-gray-900 truncate ${sidebarCollapsed ? 'hidden md:hidden' : ''}`}>
                {settings.projectName}
              </span>
            )}
          </div>

          <nav className="p-3 space-y-1">
            {navItems.filter((n) => canAccess(n.pageKey)).map(({ to, icon: Icon, label, exact }) => (
              <NavLink
                key={to}
                to={to}
                end={exact}
                onClick={() => setSidebarOpen(false)}
                title={sidebarCollapsed ? label : undefined}
                className={({ isActive }) =>
                  `w-full flex items-center ${sidebarCollapsed ? 'md:justify-center md:px-2' : ''} gap-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    isActive
                      ? `${primaryBg} text-white shadow-sm`
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className={sidebarCollapsed ? 'hidden md:hidden' : 'truncate'}>{label}</span>
              </NavLink>
            ))}

            {(canAccess('users') || canAccess('access') || canAccess('settings')) && (
              <hr className="my-3 border-gray-100" />
            )}

            {canAccess('users') && (
              <NavLink
                to="/users"
                onClick={() => setSidebarOpen(false)}
                title={sidebarCollapsed ? 'Manajemen User' : undefined}
                className={({ isActive }) =>
                  `w-full flex items-center ${sidebarCollapsed ? 'md:justify-center md:px-2' : ''} gap-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    isActive
                      ? `${primaryBg} text-white shadow-sm`
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`
                }
              >
                <Users className="w-4 h-4 shrink-0" />
                <span className={sidebarCollapsed ? 'hidden md:hidden' : 'truncate'}>Manajemen User</span>
              </NavLink>
            )}

            {canAccess('access') && (
              <NavLink
                to="/access"
                onClick={() => setSidebarOpen(false)}
                title={sidebarCollapsed ? 'Hak Akses' : undefined}
                className={({ isActive }) =>
                  `w-full flex items-center ${sidebarCollapsed ? 'md:justify-center md:px-2' : ''} gap-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    isActive
                      ? `${primaryBg} text-white shadow-sm`
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`
                }
              >
                <Shield className="w-4 h-4 shrink-0" />
                <span className={sidebarCollapsed ? 'hidden md:hidden' : 'truncate'}>Hak Akses</span>
              </NavLink>
            )}

            {canAccess('settings') && (
              <NavLink
                to="/settings"
                onClick={() => setSidebarOpen(false)}
                title={sidebarCollapsed ? 'Settings' : undefined}
                className={({ isActive }) =>
                  `w-full flex items-center ${sidebarCollapsed ? 'md:justify-center md:px-2' : ''} gap-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    isActive
                      ? `${primaryBg} text-white shadow-sm`
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`
                }
              >
                <Settings className="w-4 h-4 shrink-0" />
                <span className={sidebarCollapsed ? 'hidden md:hidden' : 'truncate'}>Settings</span>
              </NavLink>
            )}

            {canAccess('export') && (
              <button
                onClick={handleExport}
                title={sidebarCollapsed ? 'Export Excel' : undefined}
                className={`w-full flex items-center ${sidebarCollapsed ? 'md:justify-center md:px-2' : ''} gap-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all`}
              >
                <Download className="w-4 h-4 shrink-0" />
                <span className={sidebarCollapsed ? 'hidden md:hidden' : 'truncate'}>Export Excel</span>
              </button>
            )}
          </nav>
        </div>

        <div className={`p-3 border-t border-gray-100 text-[11px] text-gray-400 ${sidebarCollapsed ? 'hidden md:hidden' : ''}`}>
          v1.0 · Client CRM
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-3 sm:px-5 sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <button
              className="md:hidden p-2 hover:bg-gray-100 rounded-lg text-gray-500"
              onClick={() => setSidebarOpen(true)}
              aria-label="Buka menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="md:hidden flex items-center gap-2">
              {settings.logo ? (
                <img src={settings.logo} alt="Logo" className="max-h-7 w-auto rounded-lg object-contain" />
              ) : (
                <div className={`w-7 h-7 ${primaryBg} rounded-lg flex items-center justify-center`}>
                  <Globe className="w-3.5 h-3.5 text-white" />
                </div>
              )}
              {!settings.logo && <span className="text-sm font-bold text-gray-900 truncate max-w-[140px]">{settings.projectName}</span>}
            </div>
            <div className="hidden md:flex items-center gap-3">
              <button
                onClick={toggleSidebarCollapsed}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                title={sidebarCollapsed ? 'Perluas Sidebar' : 'Ciutkan Sidebar'}
                aria-label={sidebarCollapsed ? 'Perluas Sidebar' : 'Ciutkan Sidebar'}
              >
                {sidebarCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
              </button>
              <span className="text-xs font-semibold text-gray-500">Selamat datang, {user?.name || user?.email}</span>
            </div>
          </div>

          {/* User dropdown */}
          <div ref={userMenuRef} className="relative">
            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              className="flex items-center gap-2 hover:bg-gray-50 p-1.5 rounded-lg transition-colors"
              aria-haspopup="menu"
              aria-expanded={userMenuOpen}
            >
              <div className="w-7 h-7 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold text-xs">
                {(user?.name || user?.email || 'A').charAt(0).toUpperCase()}
              </div>
              <span className="hidden sm:inline text-xs font-semibold text-gray-700">{user?.name || user?.email}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {userMenuOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setUserMenuOpen(false)} />
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-30"
                >
                  <div className="px-4 py-3 border-b border-gray-100">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-900 truncate">{user?.name || 'Administrator'}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                        user?.role === 'ADMIN'
                          ? 'bg-black text-white border-black'
                          : user?.role === 'STAFF'
                          ? 'bg-blue-50 text-blue-700 border-blue-100'
                          : 'bg-gray-50 text-gray-600 border-gray-200'
                      }`}>
                        {user?.role || '—'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 truncate">{user?.email || 'admin@example.com'}</p>
                  </div>
                  <button
                    onClick={goProfile}
                    role="menuitem"
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
                  >
                    <User className="w-4 h-4 text-gray-400" />
                    Profil Saya
                  </button>
                  {user?.role !== 'STAFF' && (
                    <button
                      onClick={goSettings}
                      role="menuitem"
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
                    >
                      <Settings className="w-4 h-4 text-gray-400" />
                      Settings
                    </button>
                  )}
                  <hr className="border-gray-100" />
                  <button
                    onClick={handleLogout}
                    role="menuitem"
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    Keluar
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        <main className="flex-1 p-5 md:p-8">{children}</main>
      </div>
    </div>
  );
}
