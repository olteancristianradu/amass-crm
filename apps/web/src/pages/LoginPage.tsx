import { useState, CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { T } from '@/styles/tokens';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/store/authStore';
import { Btn } from '@/components/ui/Btn';
import { Inp } from '@/components/ui/Inp';
import { api, setTokens } from '@/services/api';
import type { AuthTokens } from '@amass/shared';

export function LoginPage() {
  const navigate = useNavigate();
  const { isDark, toggle: toggleTheme } = useTheme();
  const { setAuth } = useAuthStore();

  const [mode, setMode] = useState<'email' | 'pin'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userId, setUserId] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailLogin = async () => {
    if (!email || !password) { setError('Email si parola sunt necesare'); return; }
    setLoading(true);
    setError('');
    try {
      const tokens = await api<AuthTokens>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setTokens(tokens);
      // Decode JWT payload to get user info
      const payload = JSON.parse(atob(tokens.accessToken.split('.')[1]));
      // Fetch user details
      const user = await api<any>(`/users/${payload.userId}`);
      setAuth(user, payload);
      navigate('/deals', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login esuat');
    } finally {
      setLoading(false);
    }
  };

  const handlePinLogin = async () => {
    if (!userId || !pin) { setError('User ID si PIN sunt necesare'); return; }
    setLoading(true);
    setError('');
    try {
      const tokens = await api<AuthTokens>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ userId, pin }),
      });
      setTokens(tokens);
      const payload = JSON.parse(atob(tokens.accessToken.split('.')[1]));
      const user = await api<any>(`/users/${payload.userId}`);
      setAuth(user, payload);
      navigate('/deals', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login esuat');
    } finally {
      setLoading(false);
    }
  };

  const container: CSSProperties = {
    height: '100%', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: 24, position: 'relative',
  };
  const topBar: CSSProperties = { position: 'absolute', top: 16, right: 16 };
  const card: CSSProperties = {
    background: T.surface, borderRadius: 16, padding: 32,
    border: `1px solid ${T.border}`, width: 380, maxWidth: '90vw',
    animation: 'scaleIn .3s ease',
  };
  const tabs: CSSProperties = {
    display: 'flex', gap: 0, marginBottom: 24, borderBottom: `1px solid ${T.border}`,
  };
  const tab = (active: boolean): CSSProperties => ({
    flex: 1, padding: '10px 0', textAlign: 'center', fontSize: 13, fontWeight: 600,
    cursor: 'pointer', color: active ? T.accent : T.text2,
    borderBottom: active ? `2px solid ${T.accent}` : '2px solid transparent',
    background: 'transparent', border: 'none', transition: 'all .15s',
  });

  return (
    <div style={container}>
      <div style={topBar}>
        <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
      </div>

      <div style={{ textAlign: 'center' }}>
        <div className="grad-text" style={{ fontSize: 36, fontWeight: 900, letterSpacing: -1 }}>AMASS</div>
        <div style={{ fontSize: 14, color: T.text2, marginTop: 4 }}>CRM Platform</div>
      </div>

      <div style={card}>
        <div style={tabs}>
          <button style={tab(mode === 'email')} onClick={() => { setMode('email'); setError(''); }}>Email & Parola</button>
          <button style={tab(mode === 'pin')} onClick={() => { setMode('pin'); setError(''); }}>PIN</button>
        </div>

        {mode === 'email' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Inp label="Email" value={email} onChange={setEmail} placeholder="admin@amass.ro" type="email" />
            <Inp label="Parola" value={password} onChange={setPassword} placeholder="Parola" type="password" />
            <Btn onClick={handleEmailLogin} disabled={loading} style={{ width: '100%', marginTop: 8 }}>
              {loading ? 'Se conecteaza...' : 'Conectare'}
            </Btn>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Inp label="User ID" value={userId} onChange={setUserId} placeholder="ID utilizator" />
            <Inp label="PIN" value={pin} onChange={setPin} placeholder="****" type="password" />
            <Btn onClick={handlePinLogin} disabled={loading} style={{ width: '100%', marginTop: 8 }}>
              {loading ? 'Se conecteaza...' : 'Conectare cu PIN'}
            </Btn>
          </div>
        )}

        {error && (
          <div style={{ color: T.red, fontSize: 12, marginTop: 12, textAlign: 'center' }}>{error}</div>
        )}

        <div style={{ marginTop: 20, fontSize: 11, color: T.text3, textAlign: 'center', lineHeight: 1.6 }}>
          Demo: admin@amass.ro / Admin123!
        </div>
      </div>
    </div>
  );
}
