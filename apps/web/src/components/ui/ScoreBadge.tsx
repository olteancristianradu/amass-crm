import { CSSProperties } from 'react';
import { T } from '@/styles/tokens';

interface ScoreBadgeProps {
  score: number;
}

export function ScoreBadge({ score }: ScoreBadgeProps) {
  const color = score >= 70 ? T.green : score >= 40 ? T.yellow : T.red;
  const style: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    borderRadius: '50%',
    fontSize: 11,
    fontWeight: 700,
    background: color + '22',
    color: color,
  };
  return <div style={style}>{score}</div>;
}

interface ScoreBarProps {
  score: number;
  style?: CSSProperties;
}

export function ScoreBar({ score, style: st }: ScoreBarProps) {
  const color = score >= 70 ? T.green : score >= 40 ? T.yellow : T.red;
  return (
    <div style={{ height: 4, borderRadius: 2, background: T.surface3, overflow: 'hidden', ...st }}>
      <div style={{ height: '100%', width: `${score}%`, background: color, borderRadius: 2, transition: 'width .3s' }} />
    </div>
  );
}
