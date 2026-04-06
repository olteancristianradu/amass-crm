import { useState, CSSProperties } from 'react';
import { T } from '@/styles/tokens';

interface PinPadProps {
  onSubmit: (pin: string) => void;
  onCancel: () => void;
  userName: string;
}

export function PinPad({ onSubmit, onCancel, userName }: PinPadProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handleDigit = (d: string) => {
    if (pin.length >= 6) return;
    const next = pin + d;
    setPin(next);
    setError(false);
    if (next.length === 4) {
      onSubmit(next);
    }
  };

  const handleDelete = () => {
    setPin(p => p.slice(0, -1));
    setError(false);
  };

  const container: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 20,
    animation: 'scaleIn .2s ease',
  };

  const dots: CSSProperties = {
    display: 'flex',
    gap: 12,
    marginBottom: 8,
  };

  const grid: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 64px)',
    gap: 10,
    justifyItems: 'center',
  };

  return (
    <div style={container}>
      <div style={{ fontSize: 24 }}>{userName}</div>
      <div style={{ fontSize: 13, color: T.text2 }}>Introdu PIN-ul</div>

      <div style={dots}>
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            style={{
              width: 14, height: 14, borderRadius: '50%',
              border: `2px solid ${error ? T.red : i < pin.length ? T.accent : T.border}`,
              background: i < pin.length ? T.accent : 'transparent',
              transition: 'all .15s',
            }}
          />
        ))}
      </div>

      {error && <div style={{ color: T.red, fontSize: 12 }}>PIN gresit</div>}

      <div style={grid}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => (
          <button key={d} className="pin-btn" onClick={() => handleDigit(String(d))}>{d}</button>
        ))}
        <button className="pin-btn" onClick={onCancel} style={{ fontSize: 14 }}>&larr;</button>
        <button className="pin-btn" onClick={() => handleDigit('0')}>0</button>
        <button className="pin-btn" onClick={handleDelete} style={{ fontSize: 14 }}>&times;</button>
      </div>
    </div>
  );
}
