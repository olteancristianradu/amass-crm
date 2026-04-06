import { CSSProperties } from 'react';
import { T } from '@/styles/tokens';

interface InpProps {
  label?: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  width?: string | number;
  type?: string;
}

export function Inp({ label, value, onChange, placeholder, width, type = 'text' }: InpProps) {
  const wrapStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    width: width || '100%',
  };

  const inputStyle: CSSProperties = {
    padding: '7px 10px',
    borderRadius: 8,
    border: `1px solid ${T.border}`,
    background: T.surface2,
    color: T.text,
    fontSize: 12,
    outline: 'none',
    transition: 'border-color .15s',
  };

  return (
    <div style={wrapStyle}>
      {label && <label style={{ fontSize: 10, fontWeight: 600, color: T.text3, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</label>}
      <input
        type={type}
        style={inputStyle}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}
