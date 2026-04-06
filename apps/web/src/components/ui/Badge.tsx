import { CSSProperties } from 'react';

interface BadgeProps {
  text: string;
  color: string;
}

export function Badge({ text, color }: BadgeProps) {
  const style: CSSProperties = {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 6,
    fontSize: 10,
    fontWeight: 700,
    background: color + '22',
    color: color,
  };
  return <span style={style}>{text}</span>;
}
