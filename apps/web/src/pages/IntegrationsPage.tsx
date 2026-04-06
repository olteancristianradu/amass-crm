import { useState, CSSProperties } from 'react';
import { T, F } from '@/styles/tokens';
import { Btn } from '@/components/ui/Btn';
import { Badge } from '@/components/ui/Badge';
import { Toast } from '@/components/ui/Toast';
import { api } from '@/services/api';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: string;
  status: 'connected' | 'available' | 'coming_soon';
  category: string;
  connectAction?: () => void;
}

export function IntegrationsPage() {
  const [toast, setToast] = useState('');
  const [connecting, setConnecting] = useState<string | null>(null);

  const connectSlack = async () => {
    setConnecting('slack');
    try {
      const data: any = await api('/integrations/slack/install');
      if (data.url) window.open(data.url, '_blank');
      else setToast('Slack redirect URL received');
    } catch { setToast('Slack not configured — add SLACK_CLIENT_ID to .env'); }
    setConnecting(null);
  };

  const connectGoogle = async () => {
    setConnecting('google-cal');
    try {
      const data: any = await api('/calendar/sync/google/auth');
      if (data.url) window.open(data.url, '_blank');
      else setToast('Google auth URL received');
    } catch { setToast('Google not configured — add GOOGLE_CLIENT_ID to .env'); }
    setConnecting(null);
  };

  const connectOutlook = async () => {
    setConnecting('outlook-cal');
    try {
      const data: any = await api('/calendar/sync/outlook/auth');
      if (data.url) window.open(data.url, '_blank');
      else setToast('Outlook auth URL received');
    } catch { setToast('Microsoft not configured — add MICROSOFT_CLIENT_ID to .env'); }
    setConnecting(null);
  };

  const integrations: Integration[] = [
    { id: 'slack', name: 'Slack', description: 'Get deal notifications, search CRM from Slack', icon: '\uD83D\uDCAC', status: 'available', category: 'Communication', connectAction: connectSlack },
    { id: 'zapier', name: 'Zapier / Make', description: 'Connect to 5000+ apps via webhooks', icon: '\u26A1', status: 'available', category: 'Automation' },
    { id: 'whatsapp', name: 'WhatsApp Business', description: 'Send messages and templates via WhatsApp', icon: '\uD83D\uDCF1', status: 'available', category: 'Communication' },
    { id: 'twilio', name: 'Twilio (SMS + VoIP)', description: 'Send SMS and make VoIP calls', icon: '\uD83D\uDCDE', status: 'available', category: 'Communication' },
    { id: 'google-cal', name: 'Google Calendar', description: 'Sync events with Google Calendar', icon: '\uD83D\uDCC5', status: 'available', category: 'Calendar', connectAction: connectGoogle },
    { id: 'outlook-cal', name: 'Outlook Calendar', description: 'Sync events with Microsoft Outlook', icon: '\uD83D\uDCC6', status: 'available', category: 'Calendar', connectAction: connectOutlook },
    { id: 'gmail', name: 'Gmail', description: 'Sync emails and send from Gmail', icon: '\u2709\uFE0F', status: 'available', category: 'Email' },
    { id: 'outlook-mail', name: 'Outlook Mail', description: 'Sync emails and send from Outlook', icon: '\uD83D\uDCE7', status: 'available', category: 'Email' },
    { id: 'stripe', name: 'Stripe', description: 'Billing, subscriptions, and payments', icon: '\uD83D\uDCB3', status: 'available', category: 'Billing' },
    { id: 'openai', name: 'OpenAI', description: 'AI scoring, transcription, email drafting', icon: '\uD83E\uDDE0', status: 'available', category: 'AI' },
    { id: 'hubspot', name: 'HubSpot Import', description: 'Import contacts from HubSpot', icon: '\uD83D\uDD36', status: 'available', category: 'Migration' },
    { id: 'pipedrive', name: 'Pipedrive Import', description: 'Import contacts from Pipedrive', icon: '\uD83D\uDFE2', status: 'available', category: 'Migration' },
  ];

  const categories = [...new Set(integrations.map(i => i.category))];

  const page: CSSProperties = { padding: 32, overflowY: 'auto', height: '100%', fontFamily: F };
  const card: CSSProperties = {
    background: T.surface, borderRadius: 12, border: `1px solid ${T.border}`,
    padding: 16, display: 'flex', alignItems: 'center', gap: 16, transition: 'all .15s',
  };
  const statusColor: Record<string, string> = {
    connected: T.green,
    available: T.blue,
    coming_soon: T.text3,
  };

  return (
    <div style={page}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: T.text, marginBottom: 4 }}>Integrations</h1>
      <p style={{ fontSize: 13, color: T.text2, marginBottom: 24 }}>Connect your CRM with external services</p>

      {categories.map(category => (
        <div key={category} style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: T.text2, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>{category}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340, 1fr))', gap: 12 }}>
            {integrations.filter(i => i.category === category).map(integration => (
              <div key={integration.id} style={card}>
                <span style={{ fontSize: 32 }}>{integration.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{integration.name}</span>
                    <Badge text={integration.status.replace('_', ' ')} color={statusColor[integration.status]} />
                  </div>
                  <div style={{ fontSize: 12, color: T.text3, marginTop: 2 }}>{integration.description}</div>
                </div>
                {integration.connectAction && (
                  <Btn onClick={integration.connectAction} disabled={connecting === integration.id}>
                    {connecting === integration.id ? 'Connecting...' : 'Connect'}
                  </Btn>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  );
}
