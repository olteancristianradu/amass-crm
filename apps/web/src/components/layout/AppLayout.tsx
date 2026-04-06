import { Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { CSSProperties, useState } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/store/authStore';
import { clearTokens } from '@/services/api';
import { T } from '@/styles/tokens';
import { ThemeToggle } from './ThemeToggle';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: '\u2302' },
  { path: '/deals', label: 'Deals', icon: '\uD83D\uDCB0' },
  { path: '/contacts', label: 'Contacte', icon: '\uD83D\uDC65' },
  { path: '/companies', label: 'Companii', icon: '\uD83C\uDFE2' },
  { path: '/pipeline', label: 'Pipeline', icon: '\u2B95' },
  { path: '/tasks', label: 'Task-uri', icon: '\u2611' },
  { path: '/calendar', label: 'Calendar', icon: '\uD83D\uDCC5' },
  { path: '/calls', label: 'Apeluri', icon: '\uD83D\uDCDE' },
  { path: '/inbox', label: 'Inbox', icon: '\u2709' },
  { path: '/sequences', label: 'Secvente', icon: '\uD83D\uDD04' },
  { path: '/reports', label: 'Rapoarte', icon: '\uD83D\uDCCA' },
  { path: '/workflows', label: 'Automatizari', icon: '\u26A1' },
  { path: '/integrations', label: 'Integratii', icon: '\uD83D\uDD17' },
];

const ADMIN_ITEMS = [
  { path: '/settings', label: 'Setari', icon: '\u2699' },
  { path: '/billing', label: 'Abonament', icon: '\uD83D\uDCB3' },
  { path: '/gdpr', label: 'GDPR', icon: '\uD83D\uDD12' },
  { path: '/notifications', label: 'Notificari', icon: '\uD83D\uDD14' },
  { path: '/audit', label: 'Audit Log', icon: '\uD83D\uDCDD' },
  { path: '/admin/whitelabel', label: 'White Label', icon: '\uD83C\uDFA8' },
];

export function AppLayout() {
  const { isDark, toggle: toggleTheme } = useTheme();
  const { user, isAuthenticated, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    clearTokens();
    clearAuth();
    navigate('/login', { replace: true });
  };

  const isAdmin = user.role === 'ADMIN' || user.role === 'MANAGER';
  const allItems = [...NAV_ITEMS, ...(isAdmin ? ADMIN_ITEMS : [])];

  const sidebar: CSSProperties = {
    width: collapsed ? 56 : 200,
    background: T.surface,
    borderRight: `1px solid ${T.border}`,
    display: 'flex',
    flexDirection: 'column',
    transition: 'width .2s ease',
    overflow: 'hidden',
    flexShrink: 0,
  };

  const navItem = (item: typeof NAV_ITEMS[0], active: boolean): CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: collapsed ? '10px 0' : '8px 16px',
    justifyContent: collapsed ? 'center' : 'flex-start',
    fontSize: 13,
    fontWeight: active ? 600 : 400,
    color: active ? T.accent : T.text2,
    background: active ? T.accentLt : 'transparent',
    borderRadius: 8,
    cursor: 'pointer',
    border: 'none',
    width: '100%',
    textAlign: 'left',
    transition: 'all .15s',
    whiteSpace: 'nowrap',
  });

  return (
    <div style={{ height: '100%', display: 'flex' }}>
      <aside style={sidebar}>
        {/* Logo */}
        <div style={{ padding: '16px 12px', display: 'flex', alignItems: 'center', gap: 8, justifyContent: collapsed ? 'center' : 'flex-start' }}>
          <span className="grad-text" style={{ fontSize: 18, fontWeight: 900, letterSpacing: -0.5 }}>
            {collapsed ? 'A' : 'AMASS'}
          </span>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '0 8px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
          {allItems.map(item => {
            const active = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            return (
              <button key={item.path} style={navItem(item, active)} onClick={() => navigate(item.path)}>
                <span style={{ fontSize: 16, width: 20, textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div style={{ padding: '12px 8px', borderTop: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: T.text3, fontSize: 12, padding: '6px 8px', borderRadius: 6,
              display: 'flex', alignItems: 'center', gap: 8, justifyContent: collapsed ? 'center' : 'flex-start',
            }}
          >
            <span style={{ fontSize: 14 }}>{collapsed ? '\u25B6' : '\u25C0'}</span>
            {!collapsed && <span>Collapse</span>}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', justifyContent: collapsed ? 'center' : 'flex-start' }}>
            <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
          </div>
          <button
            onClick={handleLogout}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: T.text2, fontSize: 12, padding: '6px 8px', borderRadius: 6,
              display: 'flex', alignItems: 'center', gap: 8, justifyContent: collapsed ? 'center' : 'flex-start',
            }}
          >
            <span style={{ fontSize: 14 }}>{user.avatar || '\uD83D\uDC64'}</span>
            {!collapsed && (
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{user.name}</div>
                <div style={{ fontSize: 10, color: T.text3 }}>{user.role}</div>
              </div>
            )}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </div>
    </div>
  );
}
