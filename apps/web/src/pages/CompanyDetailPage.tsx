import { useState, useEffect, useCallback, CSSProperties } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { T } from '@/styles/tokens';
import { Btn } from '@/components/ui/Btn';
import { Inp } from '@/components/ui/Inp';
import { Badge } from '@/components/ui/Badge';
import { Toast } from '@/components/ui/Toast';
import { useAuthStore } from '@/store/authStore';
import * as companyService from '@/services/company.service';
import type { Company } from '@/services/company.service';
import { api } from '@/services/api';

interface ContactSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
}

interface DealSummary {
  id: string;
  title: string;
  value: number;
  stage?: { name: string; color: string };
}

interface Activity {
  id: string;
  type: string;
  title: string;
  description: string;
  createdAt: string;
  user?: { id: string; name: string };
}

export function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Company>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const [contacts, setContacts] = useState<ContactSummary[]>([]);
  const [deals, setDeals] = useState<DealSummary[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);

  const loadCompany = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const c = await companyService.getCompany(id);
      setCompany(c);
      setEditForm(c);
    } catch {
      setToast({ msg: 'Failed to load company', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadRelated = useCallback(async () => {
    if (!id) return;
    try {
      const [contactsRes, dealsRes, activitiesRes] = await Promise.allSettled([
        api<ContactSummary[]>(`/companies/${id}/contacts`),
        api<DealSummary[]>(`/companies/${id}/deals`),
        api<Activity[]>(`/companies/${id}/activities`),
      ]);
      if (contactsRes.status === 'fulfilled') setContacts(contactsRes.value);
      if (dealsRes.status === 'fulfilled') setDeals(dealsRes.value);
      if (activitiesRes.status === 'fulfilled') setActivities(activitiesRes.value);
    } catch {
      // silently fail
    }
  }, [id]);

  useEffect(() => {
    loadCompany();
    loadRelated();
  }, [loadCompany, loadRelated]);

  const handleSave = async () => {
    if (!id) return;
    try {
      setSaving(true);
      const updated = await companyService.updateCompany(id, editForm);
      setCompany(updated);
      setEditing(false);
      setToast({ msg: 'Company updated', type: 'success' });
    } catch {
      setToast({ msg: 'Failed to update company', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !confirm('Are you sure you want to delete this company?')) return;
    try {
      await companyService.deleteCompany(id);
      setToast({ msg: 'Company deleted', type: 'success' });
      navigate('/companies');
    } catch {
      setToast({ msg: 'Failed to delete company', type: 'error' });
    }
  };

  const formatDate = (d?: string) => {
    if (!d) return '\u2014';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // Styles
  const pageStyle: CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column' };
  const headerStyle: CSSProperties = {
    padding: '16px 20px',
    borderBottom: `1px solid ${T.border}`,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  };
  const contentStyle: CSSProperties = { flex: 1, overflow: 'auto', padding: 20, display: 'flex', gap: 20 };
  const leftCol: CSSProperties = { flex: '2 1 400px', display: 'flex', flexDirection: 'column', gap: 16 };
  const rightCol: CSSProperties = { flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: 16 };
  const cardStyle: CSSProperties = { background: T.surface, borderRadius: 12, padding: 16, border: `1px solid ${T.border}` };
  const sectionTitle: CSSProperties = { fontSize: 13, fontWeight: 700, marginBottom: 12, color: T.text };
  const fieldLabel: CSSProperties = { fontSize: 10, fontWeight: 600, color: T.text3, textTransform: 'uppercase', marginBottom: 2 };
  const fieldValue: CSSProperties = { fontSize: 13, color: T.text };

  if (loading) {
    return <div style={pageStyle}><div style={{ textAlign: 'center', padding: 60, color: T.text2 }}>Loading...</div></div>;
  }

  if (!company) {
    return (
      <div style={pageStyle}>
        <div style={{ textAlign: 'center', padding: 60, color: T.text3 }}>
          Company not found
          <div style={{ marginTop: 12 }}>
            <Btn variant="ghost" onClick={() => navigate('/companies')}>Back to Companies</Btn>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <Btn variant="ghost" size="sm" onClick={() => navigate('/companies')}>&larr; Companies</Btn>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: T.text }}>{company.name}</div>
          <div style={{ fontSize: 12, color: T.text2, display: 'flex', gap: 8, alignItems: 'center', marginTop: 2 }}>
            {company.industry && <Badge text={company.industry} color={T.blue} />}
            {company.domain && <span>{company.domain}</span>}
            {company.size && <span>{company.size} employees</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {editing ? (
            <>
              <Btn size="sm" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Btn>
              <Btn variant="ghost" size="sm" onClick={() => { setEditing(false); setEditForm(company); }}>Cancel</Btn>
            </>
          ) : (
            <Btn variant="ghost" size="sm" onClick={() => setEditing(true)}>Edit</Btn>
          )}
          <Btn variant="danger" size="sm" onClick={handleDelete}>Delete</Btn>
        </div>
      </div>

      {/* Content */}
      <div style={contentStyle}>
        <div style={leftCol}>
          {/* Company Info */}
          <div style={cardStyle}>
            <div style={sectionTitle}>Company Information</div>
            {editing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Inp label="Name" value={editForm.name || ''} onChange={(v) => setEditForm((f) => ({ ...f, name: v }))} />
                <div style={{ display: 'flex', gap: 10 }}>
                  <Inp label="Domain" value={editForm.domain || ''} onChange={(v) => setEditForm((f) => ({ ...f, domain: v }))} />
                  <Inp label="Industry" value={editForm.industry || ''} onChange={(v) => setEditForm((f) => ({ ...f, industry: v }))} />
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <Inp label="Size" value={editForm.size || ''} onChange={(v) => setEditForm((f) => ({ ...f, size: v }))} />
                  <Inp label="Phone" value={editForm.phone || ''} onChange={(v) => setEditForm((f) => ({ ...f, phone: v }))} />
                </div>
                <Inp label="Email" value={editForm.email || ''} onChange={(v) => setEditForm((f) => ({ ...f, email: v }))} type="email" />
                <Inp label="Website" value={editForm.website || ''} onChange={(v) => setEditForm((f) => ({ ...f, website: v }))} />
                <div style={{ display: 'flex', gap: 10 }}>
                  <Inp label="Address" value={editForm.address || ''} onChange={(v) => setEditForm((f) => ({ ...f, address: v }))} />
                  <Inp label="City" value={editForm.city || ''} onChange={(v) => setEditForm((f) => ({ ...f, city: v }))} />
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <Inp label="State" value={editForm.state || ''} onChange={(v) => setEditForm((f) => ({ ...f, state: v }))} />
                  <Inp label="Country" value={editForm.country || ''} onChange={(v) => setEditForm((f) => ({ ...f, country: v }))} />
                  <Inp label="Postal Code" value={editForm.postalCode || ''} onChange={(v) => setEditForm((f) => ({ ...f, postalCode: v }))} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <label style={{ fontSize: 10, fontWeight: 600, color: T.text3, textTransform: 'uppercase' }}>Description</label>
                  <textarea
                    value={editForm.description || ''}
                    onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                    rows={3}
                    style={{
                      padding: '7px 10px',
                      borderRadius: 8,
                      border: `1px solid ${T.border}`,
                      background: T.surface2,
                      color: T.text,
                      fontSize: 12,
                      outline: 'none',
                      resize: 'vertical',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div><div style={fieldLabel}>Phone</div><div style={fieldValue}>{company.phone || '\u2014'}</div></div>
                <div><div style={fieldLabel}>Email</div><div style={fieldValue}>{company.email || '\u2014'}</div></div>
                <div><div style={fieldLabel}>Website</div><div style={fieldValue}>{company.website || '\u2014'}</div></div>
                <div><div style={fieldLabel}>Revenue</div><div style={fieldValue}>{company.revenue ? `$${company.revenue.toLocaleString()}` : '\u2014'}</div></div>
                <div><div style={fieldLabel}>Address</div><div style={fieldValue}>{[company.address, company.city, company.state, company.country].filter(Boolean).join(', ') || '\u2014'}</div></div>
                <div><div style={fieldLabel}>Owner</div><div style={fieldValue}>{company.owner?.name || '\u2014'}</div></div>
                {company.description && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div style={fieldLabel}>Description</div>
                    <div style={{ ...fieldValue, whiteSpace: 'pre-wrap' }}>{company.description}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Activity Timeline */}
          <div style={cardStyle}>
            <div style={sectionTitle}>Activity Timeline</div>
            {activities.length === 0 ? (
              <div style={{ color: T.text3, fontSize: 12, textAlign: 'center', padding: 20 }}>No activities yet</div>
            ) : (
              activities.map((act, idx) => (
                <div
                  key={act.id}
                  style={{
                    display: 'flex',
                    gap: 12,
                    padding: '10px 0',
                    borderBottom: idx < activities.length - 1 ? `1px solid ${T.border2}` : 'none',
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: T.accent,
                      marginTop: 5,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{act.title}</div>
                    {act.description && <div style={{ fontSize: 12, color: T.text2, marginTop: 2 }}>{act.description}</div>}
                    <div style={{ fontSize: 10, color: T.text3, marginTop: 4 }}>
                      {formatDate(act.createdAt)}
                      {act.user && <span> &middot; {act.user.name}</span>}
                    </div>
                  </div>
                  <Badge text={act.type} color={T.blue} />
                </div>
              ))
            )}
          </div>
        </div>

        <div style={rightCol}>
          {/* Associated Contacts */}
          <div style={cardStyle}>
            <div style={sectionTitle}>Contacts ({contacts.length})</div>
            {contacts.length === 0 ? (
              <div style={{ color: T.text3, fontSize: 12, textAlign: 'center', padding: 16 }}>No contacts</div>
            ) : (
              contacts.map((c) => (
                <div
                  key={c.id}
                  onClick={() => navigate(`/contacts/${c.id}`)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 0',
                    borderBottom: `1px solid ${T.border2}`,
                    cursor: 'pointer',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{c.firstName} {c.lastName}</div>
                    {c.jobTitle && <div style={{ fontSize: 10, color: T.text3 }}>{c.jobTitle}</div>}
                  </div>
                  <div style={{ fontSize: 11, color: T.text2 }}>{c.email}</div>
                </div>
              ))
            )}
          </div>

          {/* Associated Deals */}
          <div style={cardStyle}>
            <div style={sectionTitle}>Deals ({deals.length})</div>
            {deals.length === 0 ? (
              <div style={{ color: T.text3, fontSize: 12, textAlign: 'center', padding: 16 }}>No deals</div>
            ) : (
              deals.map((deal) => (
                <div
                  key={deal.id}
                  onClick={() => navigate(`/deals/${deal.id}`)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 0',
                    borderBottom: `1px solid ${T.border2}`,
                    cursor: 'pointer',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{deal.title}</div>
                    {deal.stage && <Badge text={deal.stage.name} color={deal.stage.color} />}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.green }}>
                    ${deal.value?.toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
