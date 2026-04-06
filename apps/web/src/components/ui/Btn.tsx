import { CSSProperties, ReactNode } from 'react';
import { T } from '@/styles/tokens';

interface BtnProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  style?: CSSProperties;
}

const SIZE = {
  sm: { padding: '4px 10px', fontSize: '11px' },
  md: { padding: '7px 16px', fontSize: '12px' },
  lg: { padding: '10px 24px', fontSize: '14px' },
};

export function Btn({ children, onClick, variant = 'primary', size = 'md', disabled, style }: BtnProps) {
  const base: CSSProperties = {
    border: 'none',
    borderRadius: 8,
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'all .15s',
    ...SIZE[size],
    ...style,
  };

  if (variant === 'primary') {
    Object.assign(base, {
      background: T.accent,
      color: '#fff',
    });
  } else if (variant === 'ghost') {
    Object.assign(base, {
      background: 'transparent',
      color: T.text2,
      border: `1px solid ${T.border}`,
    });
  } else if (variant === 'danger') {
    Object.assign(base, {
      background: T.redLt,
      color: T.red,
    });
  }

  return (
    <button style={base} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
