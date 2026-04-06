import { useState, useEffect, CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { T, FM } from '@/styles/tokens';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/services/api';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Kpis {
  totalDeals: number;
  openDeals: number;
  wonDeals: number;
  lostDeals: number;
  totalValue: number;
  weightedValue: number;
  winRate: number;
  avgDealSize: number;
  totalContacts: number;
  totalCompanies: number;
  tasksOverdue: number;
  activitiesThisWeek: number;
}

interface RevenueMonth {
  month: string;
  revenue: number;
}

interface FunnelStage {
  stage: string;
  count: number;
}

interface Activity {
  id: string;
  type: string;
  description: string;
  createdAt: string;
  contactName?: string;
}

interface Task {
  id: string;
  title: string;
  dueDate: string;
  priority: string;
  status: string;
}

interface TeamMember {
  name: string;
  dealsWon: number;
  revenue: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function fmtCurrency(n: number): string {
  return new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON', maximumFractionDigits: 0 }).format(n);
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'acum';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}z`;
}

function activityIcon(type: string): string {
  const map: Record<string, string> = {
    call: '\u260E',
    email: '\u2709',
    meeting: '\uD83D\uDCC5',
    note: '\uD83D\uDCDD',
    task: '\u2611',
    deal: '\uD83D\uDCBC',
  };
  return map[type?.toLowerCase()] || '\u25CF';
}

function priorityColor(p: string): string {
  switch (p?.toLowerCase()) {
    case 'high': case 'urgent': return T.red;
    case 'medium': return T.yellow;
    default: return T.green;
  }
}

/* ------------------------------------------------------------------ */
/*  Shared card style                                                  */
/* ------------------------------------------------------------------ */

const card: CSSProperties = {
  background: T.surface,
  borderRadius: 12,
  padding: 16,
  border: `1px solid ${T.border}`,
};

const sectionTitle: CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: T.text,
  marginBottom: 14,
};

/* ------------------------------------------------------------------ */
/*  KPI Card                                                           */
/* ------------------------------------------------------------------ */

function KpiCard({ label, value, color, sub, trend }: {
  label: string;
  value: string | number;
  color: string;
  sub?: string;
  trend?: 'up' | 'down' | 'flat';
}) {
  const trendArrow = trend === 'up' ? '\u2191' : trend === 'down' ? '\u2193' : '';
  const trendColor = trend === 'up' ? T.green : trend === 'down' ? T.red : T.text3;

  return (
    <div style={{ ...card, flex: '1 1 160px', minWidth: 140, animation: 'slideUp .3s ease' }} className="card-hover">
      <div style={{ fontSize: 10, fontWeight: 600, color: T.text3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontSize: 28, fontWeight: 800, color, fontFamily: FM }}>{value}</span>
        {trendArrow && (
          <span style={{ fontSize: 14, fontWeight: 700, color: trendColor }}>{trendArrow}</span>
        )}
      </div>
      {sub && <div style={{ fontSize: 11, color: T.text2, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Revenue Mini Chart                                                 */
/* ------------------------------------------------------------------ */

function RevenueChart({ data }: { data: RevenueMonth[] }) {
  if (!data.length) return <div style={{ color: T.text3, fontSize: 12 }}>Nu sunt date disponibile</div>;
  const max = Math.max(...data.map(d => d.revenue), 1);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 160 }}>
      {data.map((d, i) => {
        const pct = (d.revenue / max) * 100;
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 10, color: T.text2, fontFamily: FM }}>{fmt(d.revenue)}</span>
            <div
              style={{
                width: '100%',
                maxWidth: 48,
                height: `${Math.max(pct, 4)}%`,
                background: `linear-gradient(180deg, ${T.accent} 0%, ${T.blue} 100%)`,
                borderRadius: '6px 6px 2px 2px',
                transition: 'height 0.5s ease',
                minHeight: 4,
              }}
            />
            <span style={{ fontSize: 10, color: T.text3 }}>{d.month}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Pipeline Funnel                                                    */
/* ------------------------------------------------------------------ */

function PipelineFunnel({ data }: { data: FunnelStage[] }) {
  if (!data.length) return <div style={{ color: T.text3, fontSize: 12 }}>Nu sunt date disponibile</div>;
  const max = Math.max(...data.map(d => d.count), 1);
  const colors = [T.blue, T.accent, T.purple, T.yellow, T.green, T.orange, T.red];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {data.map((d, i) => {
        const pct = (d.count / max) * 100;
        const barColor = colors[i % colors.length];
        return (
          <div key={i}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: T.text2 }}>{d.stage}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: T.text, fontFamily: FM }}>{d.count}</span>
            </div>
            <div style={{ height: 8, borderRadius: 4, background: T.surface3, overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${Math.max(pct, 3)}%`,
                  background: barColor,
                  borderRadius: 4,
                  transition: 'width 0.5s ease',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Activity Feed                                                      */
/* ------------------------------------------------------------------ */

function ActivityFeed({ activities, navigate }: { activities: Activity[]; navigate: (p: string) => void }) {
  if (!activities.length) return <div style={{ color: T.text3, fontSize: 12 }}>Nicio activitate recenta</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {activities.map((a, i) => (
        <div
          key={a.id || i}
          onClick={() => navigate('/activities')}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            padding: '10px 0',
            borderBottom: i < activities.length - 1 ? `1px solid ${T.border2}` : 'none',
            cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: 16, lineHeight: '20px', flexShrink: 0 }}>{activityIcon(a.type)}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: T.text, lineHeight: '18px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {a.description || `${a.type} - ${a.contactName || ''}`}
            </div>
            <div style={{ fontSize: 10, color: T.text3, marginTop: 2 }}>
              {a.contactName && <span style={{ marginRight: 8 }}>{a.contactName}</span>}
              {timeAgo(a.createdAt)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Upcoming Tasks                                                     */
/* ------------------------------------------------------------------ */

function UpcomingTasks({ tasks, navigate }: { tasks: Task[]; navigate: (p: string) => void }) {
  if (!tasks.length) return <div style={{ color: T.text3, fontSize: 12 }}>Niciun task viitor</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {tasks.map((t, i) => {
        const due = new Date(t.dueDate);
        const isOverdue = due.getTime() < Date.now();
        return (
          <div
            key={t.id || i}
            onClick={() => navigate('/tasks')}
            style={{
              padding: '10px 0',
              borderBottom: i < tasks.length - 1 ? `1px solid ${T.border2}` : 'none',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: T.text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {t.title}
              </span>
              <Badge text={t.priority || 'Normal'} color={priorityColor(t.priority)} />
            </div>
            <div style={{ fontSize: 10, color: isOverdue ? T.red : T.text3, fontFamily: FM }}>
              {isOverdue ? 'Restant' : 'Scadent'}: {due.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Team Leaderboard                                                   */
/* ------------------------------------------------------------------ */

function TeamLeaderboard({ members }: { members: TeamMember[] }) {
  if (!members.length) return <div style={{ color: T.text3, fontSize: 12 }}>Nu sunt date disponibile</div>;

  const medals = ['\uD83E\uDD47', '\uD83E\uDD48', '\uD83E\uDD49'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {members.map((m, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 0',
            borderBottom: i < members.length - 1 ? `1px solid ${T.border2}` : 'none',
          }}
        >
          <span style={{ fontSize: 16, width: 24, textAlign: 'center', flexShrink: 0 }}>
            {medals[i] || `${i + 1}.`}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: T.text, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {m.name}
            </div>
            <div style={{ fontSize: 10, color: T.text3 }}>
              {m.dealsWon} deal{m.dealsWon !== 1 ? '-uri' : ''} castigate
            </div>
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: T.green, fontFamily: FM, flexShrink: 0 }}>
            {fmtCurrency(m.revenue)}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Dashboard Page                                                */
/* ------------------------------------------------------------------ */

export function DashboardPage() {
  const navigate = useNavigate();

  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [revenue, setRevenue] = useState<RevenueMonth[]>([]);
  const [funnel, setFunnel] = useState<FunnelStage[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      /* KPIs */
      Promise.all([
        api<any>('/dashboard/kpis').catch(() => null),
        api<any>('/deals?limit=1').catch(() => ({ total: 0 })),
        api<any>('/contacts?limit=1').catch(() => ({ total: 0 })),
        api<any>('/companies?limit=1').catch(() => ({ total: 0 })),
      ]).then(([dashKpis, deals, contacts, companies]) => {
        const k: Kpis = {
          totalDeals: deals?.total || dashKpis?.totalClients || 0,
          openDeals: dashKpis?.byStage
            ? Object.values(dashKpis.byStage as Record<string, number>).reduce((a, b) => a + b, 0) - (dashKpis?.contracted || 0) - (dashKpis?.byStage?.Pierdut || 0)
            : 0,
          wonDeals: dashKpis?.contracted || 0,
          lostDeals: dashKpis?.byStage?.Pierdut || 0,
          totalValue: dashKpis?.totalValue || 0,
          weightedValue: dashKpis?.weightedValue || 0,
          winRate: dashKpis?.conversionRate || 0,
          avgDealSize: dashKpis?.avgDealSize || 0,
          totalContacts: contacts?.total || 0,
          totalCompanies: companies?.total || 0,
          tasksOverdue: dashKpis?.urgentClients || 0,
          activitiesThisWeek: dashKpis?.callsToday || 0,
        };
        setKpis(k);
      }).catch(() => setKpis(null)),

      /* Revenue chart */
      api<any>('/reports/revenue').then(d => {
        const arr = Array.isArray(d) ? d : d?.data || d?.months || [];
        setRevenue(arr.slice(-6));
      }).catch(() => setRevenue([])),

      /* Funnel */
      api<any>('/reports/funnel').then(d => {
        const arr = Array.isArray(d) ? d : d?.data || d?.stages || [];
        setFunnel(arr);
      }).catch(() => setFunnel([])),

      /* Activities */
      api<any>('/activities?limit=10').then(d => {
        const arr = Array.isArray(d) ? d : d?.data || d?.activities || [];
        setActivities(arr.slice(0, 10));
      }).catch(() => setActivities([])),

      /* Tasks */
      api<any>('/tasks?status=pending&limit=5&sort=dueDate').then(d => {
        const arr = Array.isArray(d) ? d : d?.data || d?.tasks || [];
        setTasks(arr.slice(0, 5));
      }).catch(() => setTasks([])),

      /* Team leaderboard */
      api<any>('/reports/team-performance').then(d => {
        const arr = Array.isArray(d) ? d : d?.data || d?.members || [];
        setTeam(arr.slice(0, 5));
      }).catch(() => setTeam([])),
    ]).finally(() => setLoading(false));
  }, []);

  /* ----- Layout styles ----- */

  const page: CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column' };
  const content: CSSProperties = { flex: 1, overflow: 'auto', padding: 20 };
  const kpiRow: CSSProperties = { display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 };

  const row2: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    gap: 16,
    marginBottom: 20,
  };

  const row3: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: 16,
    marginBottom: 20,
  };

  /* Responsive: stack on smaller screens */
  const row2Responsive: CSSProperties = { ...row2 };
  const row3Responsive: CSSProperties = { ...row3 };

  return (
    <div style={page}>
      <div style={{ padding: '16px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: T.text }}>Dashboard</div>
        <div style={{ fontSize: 11, color: T.text3 }}>
          {new Date().toLocaleDateString('ro-RO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      <div style={content}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: T.text2 }}>Se incarca...</div>
        ) : (
          <>
            {/* KPI row */}
            <div style={kpiRow}>
              <KpiCard label="Deals active" value={kpis?.openDeals ?? 0} color={T.accent} trend="up" sub="In desfasurare" />
              <KpiCard label="Castigate" value={kpis?.wonDeals ?? 0} color={T.green} trend="up" />
              <KpiCard label="Pierdute" value={kpis?.lostDeals ?? 0} color={T.red} trend="down" />
              <KpiCard label="Rata conversie" value={`${kpis?.winRate ?? 0}%`} color={T.blue} trend={kpis && kpis.winRate > 50 ? 'up' : 'flat'} />
              <KpiCard label="Contacte" value={fmt(kpis?.totalContacts ?? 0)} color={T.purple} />
              <KpiCard label="Companii" value={fmt(kpis?.totalCompanies ?? 0)} color={T.yellow} />
            </div>

            {/* Row 2: Revenue + Funnel */}
            <div style={row2Responsive}>
              <div style={card}>
                <div style={sectionTitle}>Venituri ultimele 6 luni</div>
                <RevenueChart data={revenue} />
              </div>
              <div style={card}>
                <div style={sectionTitle}>Pipeline Funnel</div>
                <PipelineFunnel data={funnel} />
              </div>
            </div>

            {/* Row 3: Activity + Tasks + Leaderboard */}
            <div style={row3Responsive}>
              <div style={card}>
                <div style={sectionTitle}>Activitate recenta</div>
                <ActivityFeed activities={activities} navigate={navigate} />
              </div>
              <div style={card}>
                <div style={sectionTitle}>Task-uri urmatoare</div>
                <UpcomingTasks tasks={tasks} navigate={navigate} />
              </div>
              <div style={card}>
                <div style={sectionTitle}>Top vanzari luna aceasta</div>
                <TeamLeaderboard members={team} />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Responsive grid override for narrow screens */}
      <style>{`
        @media (max-width: 900px) {
          /* row2 and row3 selectors via container query workaround */
        }
      `}</style>
    </div>
  );
}
