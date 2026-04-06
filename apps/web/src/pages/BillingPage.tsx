import { useState, useEffect, CSSProperties } from 'react';
import { T, F, FM } from '@/styles/tokens';
import { Btn } from '@/components/ui/Btn';
import { Badge } from '@/components/ui/Badge';
import { Toast } from '@/components/ui/Toast';
import { api } from '@/services/api';

/* ── Types ────────────────────────────────────────────────── */

interface BillingStatus {
  planName: string;
  status: string;
  billingPeriod: string;
  nextInvoiceDate: string;
  priceId?: string;
}

interface UsageStats {
  contacts: { used: number; limit: number };
  deals: { used: number; limit: number };
  users: { used: number; limit: number };
  storage: { usedMb: number; limitMb: number };
}

interface Invoice {
  id: string;
  date: string;
  amount: number;
  currency: string;
  status: string;
  downloadUrl?: string;
}

interface PlanTier {
  name: string;
  priceId: string;
  price: number;
  features: string[];
}

/* ── Plan data ────────────────────────────────────────────── */

const PLANS: PlanTier[] = [
  {
    name: 'Free',
    priceId: 'price_free',
    price: 0,
    features: [
      'Up to 250 contacts',
      '1 user',
      '1 pipeline',
      '100 MB storage',
      'Basic reports',
    ],
  },
  {
    name: 'Pro',
    priceId: 'price_pro_monthly',
    price: 49,
    features: [
      'Up to 10 000 contacts',
      '10 users',
      'Unlimited pipelines',
      '5 GB storage',
      'Advanced reports',
      'Email sequences',
      'API access',
    ],
  },
  {
    name: 'Enterprise',
    priceId: 'price_enterprise_monthly',
    price: 199,
    features: [
      'Unlimited contacts',
      'Unlimited users',
      'Unlimited pipelines',
      '50 GB storage',
      'Custom reports',
      'Workflow automation',
      'Priority support',
      'Audit log',
    ],
  },
];

/* ── Styles ───────────────────────────────────────────────── */

const S: Record<string, CSSProperties> = {
  page: {
    padding: 32,
    fontFamily: F,
    color: T.text,
    maxWidth: 1100,
    margin: '0 auto',
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: T.text3,
    marginBottom: 28,
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 20,
    marginBottom: 28,
  },
  card: {
    background: T.surface,
    border: `1px solid ${T.border}`,
    borderRadius: 12,
    padding: 24,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    color: T.text3,
    marginBottom: 2,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 14,
    fontWeight: 600,
    marginBottom: 12,
  },
  plansGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 16,
    marginBottom: 28,
  },
  planCard: {
    background: T.surface,
    border: `1px solid ${T.border}`,
    borderRadius: 12,
    padding: 24,
    display: 'flex',
    flexDirection: 'column' as const,
  },
  planCardActive: {
    background: T.surface,
    border: `2px solid ${T.accent}`,
    borderRadius: 12,
    padding: 24,
    display: 'flex',
    flexDirection: 'column' as const,
    boxShadow: `0 0 0 3px ${T.accentLt}`,
  },
  planName: {
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 4,
  },
  planPrice: {
    fontSize: 28,
    fontWeight: 800,
    fontFamily: FM,
    marginBottom: 4,
  },
  planPeriod: {
    fontSize: 11,
    color: T.text3,
    marginBottom: 16,
  },
  featureList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    flex: 1,
    marginBottom: 20,
  },
  featureItem: {
    fontSize: 12,
    color: T.text2,
    padding: '4px 0',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  usageRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  usageLabel: {
    fontSize: 12,
    color: T.text2,
  },
  usageValue: {
    fontSize: 12,
    fontWeight: 600,
    fontFamily: FM,
  },
  progressBg: {
    height: 6,
    borderRadius: 3,
    background: T.surface3,
    marginTop: 4,
    marginBottom: 14,
  },
  invoiceRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 0',
    borderBottom: `1px solid ${T.border2}`,
    gap: 16,
  },
  invoiceDate: {
    fontSize: 12,
    fontFamily: FM,
    color: T.text2,
    width: 100,
    flexShrink: 0,
  },
  invoiceAmount: {
    fontSize: 13,
    fontWeight: 600,
    fontFamily: FM,
    width: 80,
    flexShrink: 0,
  },
  invoiceStatus: {
    flex: 1,
  },
  emptyText: {
    fontSize: 13,
    color: T.text3,
    padding: '20px 0',
    textAlign: 'center' as const,
  },
};

/* ── Helpers ──────────────────────────────────────────────── */

function formatDate(iso: string): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatCurrency(amount: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount / 100);
}

function statusColor(status: string): string {
  const s = status.toLowerCase();
  if (s === 'active' || s === 'paid' || s === 'trialing') return T.green;
  if (s === 'past_due' || s === 'unpaid' || s === 'open') return T.yellow;
  if (s === 'canceled' || s === 'failed' || s === 'void') return T.red;
  return T.text3;
}

/* ── Component ────────────────────────────────────────────── */

export default function BillingPage() {
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [toast, setToast] = useState('');

  /* ── Data fetching ──────────────────────────────────────── */

  useEffect(() => {
    async function load() {
      try {
        const [s, u, inv] = await Promise.all([
          api('/billing/status') as any,
          api('/billing/usage') as any,
          api('/billing/invoices') as any,
        ]);
        setStatus(s);
        setUsage(u);
        setInvoices(Array.isArray(inv) ? inv : inv.invoices ?? []);
      } catch {
        setToast('Failed to load billing data');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  /* ── Actions ────────────────────────────────────────────── */

  async function handleCheckout(priceId: string) {
    setCheckoutLoading(priceId);
    try {
      const res: any = await api('/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({ priceId }),
      });
      if (res.url) {
        window.open(res.url, '_blank');
      } else {
        setToast('Plan updated successfully');
        const s: any = await api('/billing/status');
        setStatus(s);
      }
    } catch {
      setToast('Checkout failed. Please try again.');
    } finally {
      setCheckoutLoading(null);
    }
  }

  async function handlePortal() {
    setPortalLoading(true);
    try {
      const res: any = await api('/billing/portal', { method: 'POST' });
      if (res.url) {
        window.open(res.url, '_blank');
      }
    } catch {
      setToast('Could not open billing portal');
    } finally {
      setPortalLoading(false);
    }
  }

  /* ── Usage bar helper ───────────────────────────────────── */

  function UsageBar({ used, limit, label, unit = '' }: { used: number; limit: number; label: string; unit?: string }) {
    const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
    const barColor = pct > 90 ? T.red : pct > 70 ? T.yellow : T.accent;
    return (
      <div>
        <div style={S.usageRow}>
          <span style={S.usageLabel}>{label}</span>
          <span style={S.usageValue}>
            {used.toLocaleString()}{unit} / {limit > 0 ? limit.toLocaleString() + unit : 'Unlimited'}
          </span>
        </div>
        <div style={S.progressBg}>
          <div
            style={{
              height: '100%',
              width: `${pct}%`,
              borderRadius: 3,
              background: barColor,
              transition: 'width .3s',
            }}
          />
        </div>
      </div>
    );
  }

  /* ── Loading state ──────────────────────────────────────── */

  if (loading) {
    return (
      <div style={S.page}>
        <div style={S.title}>Billing</div>
        <div style={S.subtitle}>Loading billing information...</div>
      </div>
    );
  }

  /* ── Render ─────────────────────────────────────────────── */

  const currentPlan = status?.planName?.toLowerCase() ?? 'free';

  return (
    <div style={S.page}>
      <div style={S.title}>Billing</div>
      <div style={S.subtitle}>Manage your subscription, usage and invoices</div>

      {/* ── Current Plan & Usage ─────────────────────────── */}
      <div style={S.grid2}>
        {/* Current Plan card */}
        <div style={S.card}>
          <div style={S.cardTitle}>Current Plan</div>
          <div style={S.label}>Plan</div>
          <div style={{ ...S.value, display: 'flex', alignItems: 'center', gap: 8 }}>
            {status?.planName ?? 'Free'}
            <Badge
              text={status?.status ?? 'active'}
              color={statusColor(status?.status ?? 'active')}
            />
          </div>
          <div style={S.label}>Billing Period</div>
          <div style={S.value}>{status?.billingPeriod ?? 'N/A'}</div>
          <div style={S.label}>Next Invoice</div>
          <div style={S.value}>{formatDate(status?.nextInvoiceDate ?? '')}</div>
          <div style={{ marginTop: 8 }}>
            <Btn onClick={handlePortal} variant="ghost" disabled={portalLoading}>
              {portalLoading ? 'Opening...' : 'Manage Billing'}
            </Btn>
          </div>
        </div>

        {/* Usage Stats card */}
        <div style={S.card}>
          <div style={S.cardTitle}>Usage</div>
          {usage ? (
            <>
              <UsageBar label="Contacts" used={usage.contacts.used} limit={usage.contacts.limit} />
              <UsageBar label="Deals" used={usage.deals.used} limit={usage.deals.limit} />
              <UsageBar label="Users" used={usage.users.used} limit={usage.users.limit} />
              <UsageBar label="Storage" used={usage.storage.usedMb} limit={usage.storage.limitMb} unit=" MB" />
            </>
          ) : (
            <div style={S.emptyText}>Usage data unavailable</div>
          )}
        </div>
      </div>

      {/* ── Plan Selector ────────────────────────────────── */}
      <div style={{ ...S.cardTitle, marginBottom: 16 }}>Choose a Plan</div>
      <div style={S.plansGrid}>
        {PLANS.map((plan) => {
          const isActive = currentPlan === plan.name.toLowerCase();
          return (
            <div key={plan.priceId} style={isActive ? S.planCardActive : S.planCard}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={S.planName}>{plan.name}</span>
                {isActive && <Badge text="Current" color={T.green} />}
              </div>
              <div style={S.planPrice}>
                {plan.price === 0 ? 'Free' : `${plan.price}\u2009\u20AC`}
              </div>
              <div style={S.planPeriod}>
                {plan.price === 0 ? 'Forever' : 'per month'}
              </div>
              <ul style={S.featureList}>
                {plan.features.map((f) => (
                  <li key={f} style={S.featureItem}>
                    <span style={{ color: T.green }}>&#10003;</span> {f}
                  </li>
                ))}
              </ul>
              {isActive ? (
                <Btn variant="ghost" disabled>
                  Current Plan
                </Btn>
              ) : (
                <Btn
                  onClick={() => handleCheckout(plan.priceId)}
                  variant={plan.price > (PLANS.find((p) => p.name.toLowerCase() === currentPlan)?.price ?? 0) ? 'primary' : 'ghost'}
                  disabled={checkoutLoading === plan.priceId}
                >
                  {checkoutLoading === plan.priceId
                    ? 'Processing...'
                    : plan.price > (PLANS.find((p) => p.name.toLowerCase() === currentPlan)?.price ?? 0)
                      ? 'Upgrade'
                      : 'Downgrade'}
                </Btn>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Invoice History ───────────────────────────────── */}
      <div style={S.card}>
        <div style={S.cardTitle}>Invoice History</div>
        {invoices.length === 0 ? (
          <div style={S.emptyText}>No invoices yet</div>
        ) : (
          <div>
            {invoices.map((inv) => (
              <div key={inv.id} style={S.invoiceRow}>
                <span style={S.invoiceDate}>{formatDate(inv.date)}</span>
                <span style={S.invoiceAmount}>
                  {formatCurrency(inv.amount, inv.currency)}
                </span>
                <span style={S.invoiceStatus}>
                  <Badge text={inv.status} color={statusColor(inv.status)} />
                </span>
                {inv.downloadUrl && (
                  <a
                    href={inv.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 12, color: T.accent, textDecoration: 'none', fontWeight: 600 }}
                  >
                    Download
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  );
}
