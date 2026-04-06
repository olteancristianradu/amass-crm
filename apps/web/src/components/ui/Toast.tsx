import { useEffect, CSSProperties } from 'react';
import { T } from '@/styles/tokens';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, type = 'info', onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [onClose, duration]);

  const colors = {
    success: T.green,
    error: T.red,
    info: T.blue,
  };

  const style: CSSProperties = {
    position: 'fixed',
    bottom: 24,
    left: '50%',
    transform: 'translateX(-50%)',
    background: T.surface,
    color: T.text,
    padding: '10px 20px',
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 500,
    boxShadow: `0 4px 20px ${T.shadow}`,
    borderLeft: `3px solid ${colors[type]}`,
    zIndex: 9999,
    animation: 'slideUp .2s ease',
  };

  return <div style={style}>{message}</div>;
}
