import { useState, useEffect, useCallback, CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { T, F, FM } from '@/styles/tokens';
import { Btn } from '@/components/ui/Btn';
import { Badge } from '@/components/ui/Badge';
import { Toast } from '@/components/ui/Toast';
import { api } from '@/services/api';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Tab = 'export' | 'deletion' | 'consent' | 'access-log';

interface ExportResult {
  status: 'pending' | 'ready';
  downloadUrl?: string;
  requestedAt?: string;
}

interface DeletionResult {
  status: 'none' | 'pending' | 'scheduled' | 'completed';
  requestedAt?: string;
  scheduledFor?: string;
}

interface Consents {
  marketingEmails: boolean;
  analytics: boolean;
  thirdPartySharing: boolean;
}

interface AccessLogEntry {
  id: string;
  accessedBy: string;
  accessType: string;
  dataCategory: string;
  ipAddress: string;
  timestamp: string;
}

interface AccessLogResult {
  entries: AccessLogEntry[];
  total: number;
  page: number;
  totalPages: number;
}

/* ------------------------------------------------------------------ */
/*  Shared styles                                                      */
/* ------------------------------------------------------------------ */

const pageStyle: CSSProperties = {
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  background: T.bg,
  fontFamily: F,
};

const header: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '16px 20px',
  borderBottom: `1px solid ${T.border}`,
  background: T.surface,
  gap: 12,
  flexWrap: 'wrap',
};

const tabBar: CSSProperties = {
  display: 'flex',
  gap: 0,
  borderBottom: `1px solid ${T.border}`,
  background: T.surface,
  padding: '0 20px',
};

const content: CSSProperties = {
  flex: 1,
  overflow: 'auto',
  padding: 24,
};

const card: CSSProperties = {
  background: T.surface,
  border: `1px solid ${T.border}`,
  borderRadius: 12,
  padding: 24,
  maxWidth: 640,
};

const th: CSSProperties = {
  textAlign: 'left',
  padding: '8px 12px',
  fontSize: 10,
  fontWeight: 700,
  color: T.text3,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  borderBottom: `1px solid ${T.border}`,
};

const td: CSSProperties = {
  padding: '10px 12px',
  borderBottom: `1px solid ${T.border2}`,
  color: T.text,
  fontSize: 12,
};

/* ------------------------------------------------------------------ */
/*  Tab button                                                         */
/* ------------------------------------------------------------------ */

function TabBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  const style: CSSProperties = {
    padding: '10px 18px',
    fontSize: 12,
    fontWeight: 600,
    color: active ? T.accent : T.text3,
    background: 'transparent',
    border: 'none',
    borderBottom: active ? `2px solid ${T.accent}` : '2px solid transparent',
    cursor: 'pointer',
    fontFamily: F,
    transition: 'all .15s',
  };
  return <button style={style} onClick={onClick}>{label}</button>;
}

/* ------------------------------------------------------------------ */
/*  Toggle switch                                                      */
/* ------------------------------------------------------------------ */

function Toggle({ on, onToggle, disabled }: { on: boolean; onToggle: () => void; disabled?: boolean }) {
  const track: CSSProperties = {
    width: 36,
    height: 20,
    borderRadius: 10,
    background: on ? T.green : T.surface3,
    border: `1px solid ${on ? T.green : T.border}`,
    cursor: disabled ? 'not-allowed' : 'pointer',
    position: 'relative',
    transition: 'all .2s',
    flexShrink: 0,
    opacity: disabled ? 0.5 : 1,
  };
  const knob: CSSProperties = {
    width: 14,
    height: 14,
    borderRadius: '50%',
    background: '#fff',
    position: 'absolute',
    top: 2,
    left: on ? 18 : 2,
    transition: 'left .2s',
    boxShadow: '0 1px 3px rgba(0,0,0,.2)',
  };
  return (
    <div style={track} onClick={disabled ? undefined : onToggle}>
      <div style={knob} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Data Export Tab                                                     */
/* ------------------------------------------------------------------ */

function DataExportTab() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExportResult | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const requestExport = async () => {
    setLoading(true);
    try {
      const data = (await api('/gdpr/export', { method: 'POST' })) as any;
      setResult(data);
      setToast({ msg: 'Data export requested successfully', type: 'success' });
    } catch (err: any) {
      setToast({ msg: err.message || 'Failed to request data export', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={card}>
      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: T.text }}>Data Export</h2>
      <p style={{ margin: '8px 0 20px', fontSize: 13, color: T.text2, lineHeight: 1.6 }}>
        Request a full export of all personal data stored in your account.
        This includes contacts, deals, activities, and any other data associated with your profile.
        The export will be prepared as a downloadable file.
      </p>

      <Btn onClick={requestExport} disabled={loading}>
        {loading ? 'Requesting...' : 'Request Data Export'}
      </Btn>

      {result && (
        <div
          style={{
            marginTop: 20,
            padding: 16,
            background: T.surface2,
            borderRadius: 10,
            border: `1px solid ${T.border2}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: T.text2 }}>Status:</span>
            <Badge
              text={result.status === 'ready' ? 'Ready' : 'Pending'}
              color={result.status === 'ready' ? T.green : T.yellow}
            />
          </div>
          {result.requestedAt && (
            <p style={{ margin: '4px 0', fontSize: 11, color: T.text3, fontFamily: FM }}>
              Requested: {new Date(result.requestedAt).toLocaleString()}
            </p>
          )}
          {result.status === 'ready' && result.downloadUrl && (
            <a
              href={result.downloadUrl}
              style={{
                display: 'inline-block',
                marginTop: 10,
                padding: '7px 16px',
                borderRadius: 8,
                background: T.accent,
                color: '#fff',
                fontSize: 12,
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Download Export
            </a>
          )}
        </div>
      )}

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Data Deletion Tab                                                  */
/* ------------------------------------------------------------------ */

function DataDeletionTab() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<DeletionResult | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const requestDeletion = async () => {
    if (confirmText !== 'DELETE') return;
    setLoading(true);
    try {
      const data = (await api('/gdpr/delete-request', { method: 'POST' })) as any;
      setStatus(data);
      setConfirmText('');
      setToast({ msg: 'Deletion request submitted', type: 'success' });
    } catch (err: any) {
      setToast({ msg: err.message || 'Failed to submit deletion request', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={card}>
      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: T.text }}>Data Deletion</h2>
      <p style={{ margin: '8px 0 20px', fontSize: 13, color: T.text2, lineHeight: 1.6 }}>
        Request permanent deletion of all your account data. This action is irreversible.
        After submitting, your data will be scheduled for deletion within 30 days
        as required by GDPR regulations.
      </p>

      {status && status.status !== 'none' ? (
        <div
          style={{
            padding: 16,
            background: T.surface2,
            borderRadius: 10,
            border: `1px solid ${T.border2}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: T.text2 }}>Status:</span>
            <Badge
              text={status.status.charAt(0).toUpperCase() + status.status.slice(1)}
              color={
                status.status === 'completed' ? T.green
                : status.status === 'scheduled' ? T.yellow
                : T.blue
              }
            />
          </div>
          {status.requestedAt && (
            <p style={{ margin: '4px 0', fontSize: 11, color: T.text3, fontFamily: FM }}>
              Requested: {new Date(status.requestedAt).toLocaleString()}
            </p>
          )}
          {status.scheduledFor && (
            <p style={{ margin: '4px 0', fontSize: 11, color: T.text3, fontFamily: FM }}>
              Scheduled for: {new Date(status.scheduledFor).toLocaleString()}
            </p>
          )}
        </div>
      ) : (
        <div>
          <div
            style={{
              padding: 16,
              background: T.redLt,
              borderRadius: 10,
              border: `1px solid ${T.red}22`,
              marginBottom: 16,
            }}
          >
            <p style={{ margin: 0, fontSize: 12, color: T.red, fontWeight: 600 }}>
              Warning: This will permanently delete all your data including contacts, deals,
              tasks, notes, and account settings. This cannot be undone.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: T.text2 }}>
              Type DELETE to confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              style={{
                padding: '7px 10px',
                borderRadius: 8,
                border: `1px solid ${T.border}`,
                background: T.surface2,
                color: T.text,
                fontSize: 12,
                outline: 'none',
                fontFamily: FM,
                width: 200,
              }}
            />
          </div>
          <Btn
            variant="danger"
            onClick={requestDeletion}
            disabled={loading || confirmText !== 'DELETE'}
          >
            {loading ? 'Submitting...' : 'Request Data Deletion'}
          </Btn>
        </div>
      )}

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Consent Management Tab                                             */
/* ------------------------------------------------------------------ */

function ConsentManagementTab() {
  const [consents, setConsents] = useState<Consents>({
    marketingEmails: false,
    analytics: false,
    thirdPartySharing: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = (await api('/gdpr/consents')) as any;
        setConsents({
          marketingEmails: !!data.marketingEmails,
          analytics: !!data.analytics,
          thirdPartySharing: !!data.thirdPartySharing,
        });
      } catch (err: any) {
        setToast({ msg: err.message || 'Failed to load consent preferences', type: 'error' });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const updateConsent = async (key: keyof Consents) => {
    const updated = { ...consents, [key]: !consents[key] };
    setConsents(updated);
    setSaving(true);
    try {
      await api('/gdpr/consents', {
        method: 'PUT',
        body: JSON.stringify(updated),
      });
      setToast({ msg: 'Consent preferences updated', type: 'success' });
    } catch (err: any) {
      setConsents(consents);
      setToast({ msg: err.message || 'Failed to update consent', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const consentItems: { key: keyof Consents; label: string; description: string }[] = [
    {
      key: 'marketingEmails',
      label: 'Marketing Emails',
      description: 'Receive product updates, newsletters, and promotional emails from Amass CRM.',
    },
    {
      key: 'analytics',
      label: 'Analytics & Usage Data',
      description: 'Allow collection of anonymized usage data to help improve the product experience.',
    },
    {
      key: 'thirdPartySharing',
      label: 'Third-Party Data Sharing',
      description: 'Allow sharing of non-sensitive data with trusted third-party integrations and partners.',
    },
  ];

  if (loading) {
    return (
      <div style={card}>
        <p style={{ fontSize: 13, color: T.text3 }}>Loading consent preferences...</p>
      </div>
    );
  }

  return (
    <div style={card}>
      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: T.text }}>Consent Management</h2>
      <p style={{ margin: '8px 0 20px', fontSize: 13, color: T.text2, lineHeight: 1.6 }}>
        Manage your data processing consent preferences. Changes take effect immediately.
        You can update these at any time.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {consentItems.map((item, i) => (
          <div
            key={item.key}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 0',
              borderTop: i > 0 ? `1px solid ${T.border2}` : undefined,
              gap: 16,
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{item.label}</span>
                <Badge
                  text={consents[item.key] ? 'Enabled' : 'Disabled'}
                  color={consents[item.key] ? T.green : T.text3}
                />
              </div>
              <p style={{ margin: 0, fontSize: 12, color: T.text3, lineHeight: 1.5 }}>
                {item.description}
              </p>
            </div>
            <Toggle on={consents[item.key]} onToggle={() => updateConsent(item.key)} disabled={saving} />
          </div>
        ))}
      </div>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Data Access Log Tab                                                */
/* ------------------------------------------------------------------ */

function DataAccessLogTab() {
  const [entries, setEntries] = useState<AccessLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const loadLog = useCallback(async () => {
    setLoading(true);
    try {
      const data = (await api(`/gdpr/access-log?page=${page}&limit=25`)) as any as AccessLogResult;
      setEntries(data.entries || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err: any) {
      setToast({ msg: err.message || 'Failed to load access log', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadLog();
  }, [loadLog]);

  const ACCESS_COLORS: Record<string, string> = {
    view: T.blue,
    export: T.purple,
    modify: T.yellow,
    admin: T.red,
    system: T.text3,
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: T.text }}>Data Access Log</h2>
        <p style={{ margin: '8px 0 0', fontSize: 13, color: T.text2, lineHeight: 1.6 }}>
          A record of who has accessed your personal data, when, and for what purpose.
        </p>
        {total > 0 && (
          <span style={{ fontSize: 11, color: T.text3 }}>{total} total entries</span>
        )}
      </div>

      <div
        style={{
          background: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: T.surface }}>
              <th style={th}>Date</th>
              <th style={th}>Accessed By</th>
              <th style={th}>Access Type</th>
              <th style={th}>Data Category</th>
              <th style={th}>IP Address</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td style={{ ...td, textAlign: 'center', color: T.text2 }} colSpan={5}>
                  Loading...
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td style={{ ...td, textAlign: 'center', color: T.text3 }} colSpan={5}>
                  No access log entries found
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr key={entry.id}>
                  <td style={{ ...td, fontFamily: FM, fontSize: 11, color: T.text2, whiteSpace: 'nowrap' }}>
                    {new Date(entry.timestamp).toLocaleString()}
                  </td>
                  <td style={{ ...td, fontWeight: 600 }}>{entry.accessedBy}</td>
                  <td style={td}>
                    <Badge
                      text={entry.accessType}
                      color={ACCESS_COLORS[entry.accessType] || T.text2}
                    />
                  </td>
                  <td style={{ ...td, fontSize: 12 }}>{entry.dataCategory}</td>
                  <td style={{ ...td, fontFamily: FM, fontSize: 11, color: T.text3 }}>
                    {entry.ipAddress}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 8,
            padding: 12,
            marginTop: 8,
          }}
        >
          <Btn size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Prev
          </Btn>
          <span style={{ fontSize: 12, color: T.text2, lineHeight: '28px' }}>
            {page} / {totalPages}
          </span>
          <Btn size="sm" variant="ghost" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Btn>
        </div>
      )}

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export function GdprPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('export');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'export', label: 'Data Export' },
    { key: 'deletion', label: 'Data Deletion' },
    { key: 'consent', label: 'Consent Management' },
    { key: 'access-log', label: 'Data Access Log' },
  ];

  return (
    <div style={pageStyle}>
      <div style={header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span
            className="grad-text"
            style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.5, cursor: 'pointer' }}
            onClick={() => navigate('/')}
          >
            AMASS
          </span>
          <span style={{ fontSize: 13, color: T.text2, fontWeight: 500 }}>GDPR &amp; Privacy</span>
        </div>
      </div>

      <div style={tabBar}>
        {tabs.map((t) => (
          <TabBtn
            key={t.key}
            label={t.label}
            active={activeTab === t.key}
            onClick={() => setActiveTab(t.key)}
          />
        ))}
      </div>

      <div style={content}>
        {activeTab === 'export' && <DataExportTab />}
        {activeTab === 'deletion' && <DataDeletionTab />}
        {activeTab === 'consent' && <ConsentManagementTab />}
        {activeTab === 'access-log' && <DataAccessLogTab />}
      </div>
    </div>
  );
}
