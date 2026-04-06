import { CSSProperties } from 'react';
import { T } from '@/styles/tokens';
import { ThemeToggle } from './ThemeToggle';
import { Btn } from '../ui/Btn';

interface HeaderProps {
  title: string;
  isDark: boolean;
  onToggleTheme: () => void;
  onLogout?: () => void;
  onDashboard?: () => void;
  onProfile?: () => void;
  userName?: string;
  userAvatar?: string;
  children?: React.ReactNode;
}

export function Header({ title, isDark, onToggleTheme, onLogout, onDashboard, onProfile, userName, userAvatar, children }: HeaderProps) {
  const header: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 20px',
    borderBottom: `1px solid ${T.border}`,
    background: T.surface,
    gap: 12,
    flexWrap: 'wrap',
  };

  const left: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  };

  const right: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  };

  return (
    <header style={header}>
      <div style={left}>
        <span className="grad-text" style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.5 }}>
          AMASS
        </span>
        <span style={{ fontSize: 13, color: T.text2, fontWeight: 500 }}>{title}</span>
        {children}
      </div>
      <div style={right}>
        {onDashboard && <Btn variant="ghost" size="sm" onClick={onDashboard}>Dashboard</Btn>}
        {onProfile && userName && (
          <button
            onClick={onProfile}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6, color: T.text,
              fontSize: 12, fontWeight: 500,
            }}
          >
            <span style={{ fontSize: 16 }}>{userAvatar || '\uD83D\uDC64'}</span>
            {userName}
          </button>
        )}
        <ThemeToggle isDark={isDark} onToggle={onToggleTheme} />
        {onLogout && <Btn variant="ghost" size="sm" onClick={onLogout}>Logout</Btn>}
      </div>
    </header>
  );
}
