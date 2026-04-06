import { CSSProperties } from 'react';
import { T } from '@/styles/tokens';

interface ThemeToggleProps {
  isDark: boolean;
  onToggle: () => void;
}

export function ThemeToggle({ isDark, onToggle }: ThemeToggleProps) {
  const style: CSSProperties = {
    background: 'transparent',
    border: `1px solid ${T.border}`,
    borderRadius: 8,
    padding: '4px 10px',
    cursor: 'pointer',
    fontSize: 14,
    color: T.text,
    transition: 'all .15s',
  };

  return (
    <button style={style} onClick={onToggle} title="Toggle theme">
      {isDark ? '\u2600\uFE0F' : '\uD83C\uDF19'}
    </button>
  );
}
