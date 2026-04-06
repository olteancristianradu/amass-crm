import { useState, useEffect, CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { T, F, FM } from '@/styles/tokens';
import { useAuthStore } from '@/store/authStore';
import { Btn } from '@/components/ui/Btn';
import { Badge } from '@/components/ui/Badge';
import { Toast } from '@/components/ui/Toast';
import { api } from '@/services/api';

type ReportTab = 'forecast' | 'funnel' | 'revenue' | 'activity' | 'team' | 'winloss';

const TABS: { key: ReportTab; label: string }[] = [
  { key: 'forecast', label: 'Pipeline Forecast' },
  { key: 'funnel', label: 'Funnel' },
  { key: 'revenue', label: 'Revenue' },
  { key: 'activity', label: 'Activity' },
  { key: 'team', label: 'Team Performance' },
  { key: 'winloss', label: 'Win/Loss' },
];

interface ForecastRow {
  month: string;
  expectedValue: number;
  weightedValue: number;
  dealCount: number;
}

interface FunnelStage {
  stage: string;
  count: number;
  conversionRate: number;
}

interface RevenueMonth {
  month: string;
  revenue: number;
}

interface RevenueData {
  monthly: RevenueMonth[];
  total: number;
  avgDealSize: number;
}

interface ActivityRow {
  type: string;
  count: number;
  userId?: string;
  userName?: string;
}

interface ActivityData {
  byType: ActivityRow[];
  byUser: ActivityRow[];
}

interface TeamEntry {
  userId: string;
  userName: string;
  dealsWon: number;
  valueWon: number;
  activityCount: number;
}

interface WinLossData {
  winRate: number;
  avgWonDealSize: number;
  avgLostDealSize: number;
  topLossReasons: { reason: string; count: number }[];
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function downloadCsv(filename: string, csvContent: string) {
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function toCsv(headers: string[], rows: string[][]): string {
  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export function ReportsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [tab, setTab] = useState<ReportTab>('forecast');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const [forecast, setForecast] = useState<ForecastRow[]>([]);
  const [funnel, setFunnel] = useState<FunnelStage[]>([]);
  const [revenue, setRevenue] = useState<RevenueData | null>(null);
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [team, setTeam] = useState<TeamEntry[]>([]);
  const [winloss, setWinloss] = useState<WinLossData | null>(null);

  useEffect(() => {
    setLoading(true);
    const endpoints: Record<ReportTab, string> = {
      forecast: '/reports/forecast',
      funnel: '/reports/funnel',
      revenue: '/reports/revenue',
      activity: '/reports/activity',
      team: '/reports/team-performance',
      winloss: '/reports/win-loss',
    };

    api(endpoints[tab])
      .then((data: any) => {
        switch (tab) {
          case 'forecast':
            setForecast(Array.isArray(data) ? data : data.months || []);
            break;
          case 'funnel':
            setFunnel(Array.isArray(data) ? data : data.stages || []);
            break;
          case 'revenue':
            setRevenue(data);
            break;
          case 'activity':
            setActivity(data);
            break;
          case 'team':
            setTeam(Array.isArray(data) ? data : data.entries || []);
            break;
          case 'winloss':
            setWinloss(data);
            break;
        }
      })
      .catch((err) => {
        console.error('Failed to load report:', err);
        setToast({ msg: 'Failed to load report', type: 'error' });
      })
      .finally(() => setLoading(false));
  }, [tab]);

  const handleExport = () => {
    let csv = '';
    switch (tab) {
      case 'forecast':
        csv = toCsv(
          ['Month', 'Expected Value', 'Weighted Value', 'Deal Count'],
          forecast.map((r) => [r.month, String(r.expectedValue), String(r.weightedValue), String(r.dealCount)]),
        );
        break;
      case 'funnel':
        csv = toCsv(
          ['Stage', 'Count', 'Conversion Rate'],
          funnel.map((r) => [r.stage, String(r.count), `${r.conversionRate}%`]),
        );
        break;
      case 'revenue':
        if (revenue) {
          csv = toCsv(
            ['Month', 'Revenue'],
            revenue.monthly.map((r) => [r.month, String(r.revenue)]),
          );
        }
        break;
      case 'activity':
        if (activity) {
          csv = toCsv(
            ['Type', 'Count'],
            activity.byType.map((r) => [r.type, String(r.count)]),
          );
        }
        break;
      case 'team':
        csv = toCsv(
          ['User', 'Deals Won', 'Value Won', 'Activity Count'],
          team.map((r) => [r.userName, String(r.dealsWon), String(r.valueWon), String(r.activityCount)]),
        );
        break;
      case 'winloss':
        if (winloss) {
          csv = toCsv(
            ['Metric', 'Value'],
            [
              ['Win Rate', `${winloss.winRate}%`],
              ['Avg Won Deal Size', String(winloss.avgWonDealSize)],
              ['Avg Lost Deal Size', String(winloss.avgLostDealSize)],
              ...winloss.topLossReasons.map((r) => [`Loss: ${r.reason}`, String(r.count)]),
            ],
          );
        }
        break;
    }
    if (csv) downloadCsv(`${tab}-report.csv`, csv);
  };

  const handleSave = async () => {
    try {
      await api('/reports/saved', {
        method: 'POST',
        body: JSON.stringify({ type: tab, savedAt: new Date().toISOString() }),
      });
      setToast({ msg: 'Report saved', type: 'success' });
    } catch {
      setToast({ msg: 'Failed to save report', type: 'error' });
    }
  };

  const page: CSSProperties = {
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
    overflowX: 'auto',
  };

  const content: CSSProperties = {
    flex: 1,
    overflow: 'auto',
    padding: 20,
  };

  const table: CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 12,
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
  };

  const card: CSSProperties = {
    background: T.surface,
    borderRadius: 12,
    padding: 16,
    border: `1px solid ${T.border}`,
    marginBottom: 16,
  };

  const renderForecast = () => (
    <table style={table}>
      <thead>
        <tr>
          <th style={th}>Month</th>
          <th style={th}>Expected Value</th>
          <th style={th}>Weighted Value</th>
          <th style={th}>Deal Count</th>
        </tr>
      </thead>
      <tbody>
        {forecast.map((row) => (
          <tr key={row.month}>
            <td style={td}>{row.month}</td>
            <td style={{ ...td, fontFamily: FM, fontWeight: 600 }}>{formatCurrency(row.expectedValue)}</td>
            <td style={{ ...td, fontFamily: FM, fontWeight: 600, color: T.accent }}>{formatCurrency(row.weightedValue)}</td>
            <td style={{ ...td, fontFamily: FM }}>{row.dealCount}</td>
          </tr>
        ))}
        {forecast.length === 0 && (
          <tr>
            <td style={{ ...td, textAlign: 'center', color: T.text3 }} colSpan={4}>
              No forecast data
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );

  const renderFunnel = () => {
    const maxCount = Math.max(...funnel.map((s) => s.count), 1);
    return (
      <div>
        {funnel.map((stage, i) => (
          <div key={stage.stage} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{stage.stage}</span>
              <span style={{ fontSize: 11, color: T.text2 }}>
                {stage.count} ({stage.conversionRate}%)
              </span>
            </div>
            <div
              style={{
                height: 28,
                background: T.surface2,
                borderRadius: 6,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${(stage.count / maxCount) * 100}%`,
                  background: T.accent,
                  borderRadius: 6,
                  transition: 'width .3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  paddingLeft: 8,
                }}
              >
                <span style={{ fontSize: 10, color: '#fff', fontWeight: 700 }}>{stage.count}</span>
              </div>
            </div>
            {i < funnel.length - 1 && (
              <div style={{ textAlign: 'center', fontSize: 10, color: T.text3, marginTop: 2 }}>
                &darr; {funnel[i + 1]?.conversionRate}% conversion
              </div>
            )}
          </div>
        ))}
        {funnel.length === 0 && <div style={{ color: T.text3, fontSize: 12 }}>No funnel data</div>}
      </div>
    );
  };

  const renderRevenue = () => {
    if (!revenue) return <div style={{ color: T.text3, fontSize: 12 }}>No revenue data</div>;
    const maxRev = Math.max(...revenue.monthly.map((m) => m.revenue), 1);
    return (
      <div>
        <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={card}>
            <div style={{ fontSize: 10, fontWeight: 600, color: T.text3, textTransform: 'uppercase' }}>Total Revenue</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: T.green, fontFamily: FM }}>{formatCurrency(revenue.total)}</div>
          </div>
          <div style={card}>
            <div style={{ fontSize: 10, fontWeight: 600, color: T.text3, textTransform: 'uppercase' }}>Avg Deal Size</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: T.accent, fontFamily: FM }}>{formatCurrency(revenue.avgDealSize)}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 200, paddingTop: 20 }}>
          {revenue.monthly.map((m) => (
            <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 9, color: T.text3, fontFamily: FM }}>{formatCurrency(m.revenue)}</span>
              <div
                style={{
                  width: '100%',
                  maxWidth: 40,
                  height: `${(m.revenue / maxRev) * 150}px`,
                  background: T.accent,
                  borderRadius: '4px 4px 0 0',
                  minHeight: 2,
                  transition: 'height .3s ease',
                }}
              />
              <span style={{ fontSize: 9, color: T.text3 }}>{m.month}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderActivity = () => {
    if (!activity) return <div style={{ color: T.text3, fontSize: 12 }}>No activity data</div>;
    return (
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 300px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>By Type</div>
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>Type</th>
                <th style={th}>Count</th>
              </tr>
            </thead>
            <tbody>
              {activity.byType.map((r) => (
                <tr key={r.type}>
                  <td style={td}>{r.type}</td>
                  <td style={{ ...td, fontFamily: FM, fontWeight: 600 }}>{r.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ flex: '1 1 300px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>By User</div>
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>User</th>
                <th style={th}>Count</th>
              </tr>
            </thead>
            <tbody>
              {activity.byUser.map((r) => (
                <tr key={r.userId || r.userName}>
                  <td style={td}>{r.userName}</td>
                  <td style={{ ...td, fontFamily: FM, fontWeight: 600 }}>{r.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderTeam = () => (
    <table style={table}>
      <thead>
        <tr>
          <th style={th}>#</th>
          <th style={th}>User</th>
          <th style={th}>Deals Won</th>
          <th style={th}>Value Won</th>
          <th style={th}>Activity Count</th>
        </tr>
      </thead>
      <tbody>
        {team.map((entry, i) => (
          <tr key={entry.userId}>
            <td style={{ ...td, fontWeight: 700, color: i < 3 ? T.accent : T.text3 }}>{i + 1}</td>
            <td style={{ ...td, fontWeight: 600 }}>{entry.userName}</td>
            <td style={{ ...td, fontFamily: FM, fontWeight: 700, color: T.green }}>{entry.dealsWon}</td>
            <td style={{ ...td, fontFamily: FM }}>{formatCurrency(entry.valueWon)}</td>
            <td style={{ ...td, fontFamily: FM }}>{entry.activityCount}</td>
          </tr>
        ))}
        {team.length === 0 && (
          <tr>
            <td style={{ ...td, textAlign: 'center', color: T.text3 }} colSpan={5}>
              No team data
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );

  const renderWinLoss = () => {
    if (!winloss) return <div style={{ color: T.text3, fontSize: 12 }}>No win/loss data</div>;
    return (
      <div>
        <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={card}>
            <div style={{ fontSize: 10, fontWeight: 600, color: T.text3, textTransform: 'uppercase' }}>Win Rate</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: T.green, fontFamily: FM }}>{winloss.winRate}%</div>
          </div>
          <div style={card}>
            <div style={{ fontSize: 10, fontWeight: 600, color: T.text3, textTransform: 'uppercase' }}>Avg Won Deal</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: T.accent, fontFamily: FM }}>{formatCurrency(winloss.avgWonDealSize)}</div>
          </div>
          <div style={card}>
            <div style={{ fontSize: 10, fontWeight: 600, color: T.text3, textTransform: 'uppercase' }}>Avg Lost Deal</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: T.red, fontFamily: FM }}>{formatCurrency(winloss.avgLostDealSize)}</div>
          </div>
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Top Loss Reasons</div>
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>Reason</th>
              <th style={th}>Count</th>
            </tr>
          </thead>
          <tbody>
            {winloss.topLossReasons.map((r) => (
              <tr key={r.reason}>
                <td style={td}>{r.reason}</td>
                <td style={{ ...td, fontFamily: FM, fontWeight: 600, color: T.red }}>{r.count}</td>
              </tr>
            ))}
            {winloss.topLossReasons.length === 0 && (
              <tr>
                <td style={{ ...td, textAlign: 'center', color: T.text3 }} colSpan={2}>
                  No loss reasons
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  const renderers: Record<ReportTab, () => React.ReactElement> = {
    forecast: renderForecast,
    funnel: renderFunnel,
    revenue: renderRevenue,
    activity: renderActivity,
    team: renderTeam,
    winloss: renderWinLoss,
  };

  return (
    <div style={page}>
      <div style={header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span
            className="grad-text"
            style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.5, cursor: 'pointer' }}
            onClick={() => navigate('/')}
          >
            AMASS
          </span>
          <span style={{ fontSize: 13, color: T.text2, fontWeight: 500 }}>Reports</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn variant="ghost" size="sm" onClick={handleExport}>
            Export CSV
          </Btn>
          <Btn size="sm" onClick={handleSave}>
            Save Report
          </Btn>
        </div>
      </div>

      <div style={tabBar}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '10px 20px',
              fontSize: 12,
              fontWeight: tab === t.key ? 700 : 500,
              color: tab === t.key ? T.accent : T.text2,
              background: 'transparent',
              border: 'none',
              borderBottom: tab === t.key ? `2px solid ${T.accent}` : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all .15s',
              fontFamily: F,
              whiteSpace: 'nowrap',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={content}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: T.text2 }}>Loading...</div>
        ) : (
          <div style={card}>{renderers[tab]()}</div>
        )}
      </div>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
