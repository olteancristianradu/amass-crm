import { useState, useEffect, type CSSProperties } from 'react';
import { T, F } from '@/styles/tokens';
import { Btn } from '@/components/ui/Btn';
import { Inp } from '@/components/ui/Inp';
import { api } from '@/services/api';

interface WhitelabelConfig {
  companyName: string;
  logoUrl: string;
  primaryColor: string;
  accentColor: string;
  faviconUrl: string;
  loginMessage: string;
  supportEmail: string;
  supportUrl: string;
  customCss: string;
}

const EMPTY: WhitelabelConfig = {
  companyName: '',
  logoUrl: '',
  primaryColor: '#C8102E',
  accentColor: '#2563EB',
  faviconUrl: '',
  loginMessage: '',
  supportEmail: '',
  supportUrl: '',
  customCss: '',
};

export function WhiteLabelPage() {
  const [config, setConfig] = useState<WhitelabelConfig>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api('/admin/whitelabel').then((r: any) => r.json()).then((data: any) => {
      if (data && typeof data === 'object') setConfig({ ...EMPTY, ...data });
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMsg('');
    try {
      await api('/admin/whitelabel', { method: 'PUT', body: JSON.stringify(config) });
      setMsg('Saved!');
    } catch {
      setMsg('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const set = (key: keyof WhitelabelConfig) => (val: string) =>
    setConfig(prev => ({ ...prev, [key]: val }));
  const setEvt = (key: keyof WhitelabelConfig) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setConfig(prev => ({ ...prev, [key]: e.target.value }));

  const page: CSSProperties = { padding: 32, overflowY: 'auto', height: '100%', fontFamily: F };
  const grid: CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 800 };
  const section: CSSProperties = { marginBottom: 24 };
  const label: CSSProperties = { fontSize: 12, color: T.text2, marginBottom: 4, display: 'block' };
  const textarea: CSSProperties = {
    width: '100%', minHeight: 80, padding: 10, borderRadius: 8,
    border: `1px solid ${T.border}`, background: T.surface2, color: T.text,
    fontFamily: F, fontSize: 13, resize: 'vertical',
  };
  const preview: CSSProperties = {
    display: 'flex', gap: 12, alignItems: 'center', padding: 16,
    background: T.surface, borderRadius: 12, border: `1px solid ${T.border}`, marginTop: 16,
  };
  const swatch = (color: string): CSSProperties => ({
    width: 40, height: 40, borderRadius: 8, background: color, border: `1px solid ${T.border}`,
  });

  return (
    <div style={page}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: T.text, marginBottom: 8 }}>White Label Configuration</h1>
      <p style={{ fontSize: 13, color: T.text2, marginBottom: 24 }}>Customize branding for your CRM instance.</p>

      <div style={section}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 12 }}>Branding</h3>
        <div style={grid}>
          <div>
            <span style={label}>Company Name</span>
            <Inp value={config.companyName} onChange={set('companyName')} placeholder="AMASS CRM" />
          </div>
          <div>
            <span style={label}>Logo URL</span>
            <Inp value={config.logoUrl} onChange={set('logoUrl')} placeholder="https://..." />
          </div>
          <div>
            <span style={label}>Primary Color</span>
            <input type="color" value={config.primaryColor} onChange={setEvt('primaryColor')} style={{ width: '100%', height: 36, border: 'none', cursor: 'pointer' }} />
          </div>
          <div>
            <span style={label}>Accent Color</span>
            <input type="color" value={config.accentColor} onChange={setEvt('accentColor')} style={{ width: '100%', height: 36, border: 'none', cursor: 'pointer' }} />
          </div>
          <div>
            <span style={label}>Favicon URL</span>
            <Inp value={config.faviconUrl} onChange={set('faviconUrl')} placeholder="https://..." />
          </div>
          <div>
            <span style={label}>Support Email</span>
            <Inp value={config.supportEmail} onChange={set('supportEmail')} placeholder="support@company.com" />
          </div>
          <div>
            <span style={label}>Support URL</span>
            <Inp value={config.supportUrl} onChange={set('supportUrl')} placeholder="https://support.company.com" />
          </div>
        </div>
      </div>

      <div style={section}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 12 }}>Login Page</h3>
        <span style={label}>Login Message</span>
        <textarea style={textarea} value={config.loginMessage} onChange={setEvt('loginMessage')} placeholder="Welcome to our CRM..." />
      </div>

      <div style={section}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 12 }}>Custom CSS</h3>
        <textarea style={{ ...textarea, fontFamily: "'JetBrains Mono',monospace", minHeight: 120 }} value={config.customCss} onChange={setEvt('customCss')} placeholder=":root { --accent: #C8102E; }" />
      </div>

      <div style={preview}>
        <span style={{ fontSize: 13, color: T.text2 }}>Preview:</span>
        <div style={swatch(config.primaryColor)} title="Primary" />
        <div style={swatch(config.accentColor)} title="Accent" />
        {config.companyName && <span style={{ fontSize: 16, fontWeight: 700, color: T.text }}>{config.companyName}</span>}
      </div>

      <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Btn onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Configuration'}</Btn>
        {msg && <span style={{ fontSize: 13, color: msg === 'Saved!' ? T.green : T.red }}>{msg}</span>}
      </div>
    </div>
  );
}
