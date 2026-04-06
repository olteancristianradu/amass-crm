import { useState, useEffect, useCallback, CSSProperties } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { T } from '@/styles/tokens';
import { Btn } from '@/components/ui/Btn';
import { Inp } from '@/components/ui/Inp';
import { Badge } from '@/components/ui/Badge';
import { Toast } from '@/components/ui/Toast';
import { useAuthStore } from '@/store/authStore';
import * as contactService from '@/services/contact.service';
import type { Contact } from '@/services/contact.service';
import { api } from '@/services/api';

interface Activity {
  id: string;
  type: 'call' | 'email' | 'note' | 'meeting' | 'stage_change';
  title: string;
  description: string;
  createdAt: string;
  user?: { id: string; name: string };
}

interface DealSummary {
  id: string;
  title: string;
  value: number;
  stage?: { name: string; color: string };
}

interface TaskSummary {
  id: string;
  title: string;
  dueDate?: string;
  completed: boolean;
}

const ACTIVITY_ICONS: Record<string, string> = {
  call: '\uD83D\uDCDE',
  email: '\u2709\uFE0F',
  note: '\uD83D\uDCDD',
  meeting: '\uD83D\uDCC5',
  stage_change: '\u27A1\uFE0F',
};

const ACTIVITY_COLORS: Record<string, string> = {
  call: T.green,
  email: T.blue,
  note: T.yellow,
  meeting: T.purple,
  stage_change: T.orange,
};

export function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Contact>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Related data
  const [activities, setActivities] = useState<Activity[]>([]);
  const [deals, setDeals] = useState<DealSummary[]>([]);
  const [tasks, setTasks] = useState<TaskSummary[]>([]);

  // Add activity modal
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [activityType, setActivityType] = useState<'note' | 'call' | 'email' | 'meeting'>('note');
  const [activityTitle, setActivityTitle] = useState('');
  const [activityDesc, setActivityDesc] = useState('');

  const loadContact = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const c = await contactService.getContact(id);
      setContact(c);
      setEditForm(c);
    } catch (err) {
      console.error('Failed to load contact:', err);
      setToast({ msg: 'Failed to load contact', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadRelated = useCallback(async () => {
    if (!id) return;
    try {
      const [activitiesRes, dealsRes, tasksRes] = await Promise.allSettled([
        api<Activity[]>(`/contacts/${id}/activities`),
        api<DealSummary[]>(`/contacts/${id}/deals`),
        api<TaskSummary[]>(`/contacts/${id}/tasks`),
      ]);
      if (activitiesRes.status === 'fulfilled') setActivities(activitiesRes.value);
      if (dealsRes.status === 'fulfilled') setDeals(dealsRes.value);
      if (tasksRes.status === 'fulfilled') setTasks(tasksRes.value);
    } catch {
      // silently fail for related data
    }
  }, [id]);

  useEffect(() => {
    loadContact();
    loadRelated();
  }, [loadContact, loadRelated]);

  const handleSave = async () => {
    if (!id || !contact) return;
    try {
      setSaving(true);
      const updated = await contactService.updateContact(id, editForm);
      setContact(updated);
      setEditing(false);
      setToast({ msg: 'Contact updated', type: 'success' });
    } catch {
      setToast({ msg: 'Failed to update contact', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !confirm('Are you sure you want to delete this contact?')) return;
    try {
      await contactService.deleteContact(id);
      setToast({ msg: 'Contact deleted', type: 'success' });
      navigate('/contacts');
    } catch {
      setToast({ msg: 'Failed to delete contact', type: 'error' });
    }
  };

  const handleAddActivity = async () => {
    if (!id || !activityTitle.trim()) return;
    try {
      await api(`/contacts/${id}/activities`, {
        method: 'POST',
        body: JSON.stringify({ type: activityType, title: activityTitle, description: activityDesc }),
      });
      setShowAddActivity(false);
      setActivityTitle('');
      setActivityDesc('');
      setToast({ msg: 'Activity added', type: 'success' });
      loadRelated();
    } catch {
      setToast({ msg: 'Failed to add activity', type: 'error' });
    }
  };

  const formatDate = (d?: string) => {
    if (!d) return '\u2014';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const scoreColor = (score: number) => {
    if (score >= 80) return T.green;
    if (score >= 50) return T.yellow;
    return T.orange;
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
  const cardStyle: CSSProperties = {
    background: T.surface,
    borderRadius: 12,
    padding: 16,
    border: `1px solid ${T.border}`,
  };
  const sectionTitle: CSSProperties = { fontSize: 13, fontWeight: 700, marginBottom: 12, color: T.text };
  const fieldRow: CSSProperties = { display: 'flex', gap: 10, marginBottom: 10 };
  const fieldLabel: CSSProperties = { fontSize: 10, fontWeight: 600, color: T.text3, textTransform: 'uppercase', marginBottom: 2 };
  const fieldValue: CSSProperties = { fontSize: 13, color: T.text };
  const overlayStyle: CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  };
  const modalStyle: CSSProperties = {
    background: T.surface,
    borderRadius: 14,
    padding: 24,
    width: 440,
    maxWidth: '90vw',
    boxShadow: `0 20px 60px ${T.shadow}`,
    border: `1px solid ${T.border}`,
  };

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={{ textAlign: 'center', padding: 60, color: T.text2 }}>Loading...</div>
      </div>
    );
  }

  if (!contact) {
    return (
      <div style={pageStyle}>
        <div style={{ textAlign: 'center', padding: 60, color: T.text3 }}>
          Contact not found
          <div style={{ marginTop: 12 }}>
            <Btn variant="ghost" onClick={() => navigate('/contacts')}>Back to Contacts</Btn>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <Btn variant="ghost" size="sm" onClick={() => navigate('/contacts')}>
          &larr; Contacts
        </Btn>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: T.text }}>
            {contact.firstName} {contact.lastName}
          </div>
          <div style={{ fontSize: 12, color: T.text2, display: 'flex', gap: 8, alignItems: 'center', marginTop: 2 }}>
            {contact.company && <span>{contact.company.name}</span>}
            {contact.jobTitle && <span>{contact.jobTitle}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {(contact.tags || []).map((tag) => (
            <Badge key={tag} text={tag} color={T.blue} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <Btn variant="ghost" size="sm" onClick={() => setShowAddActivity(true)}>+ Activity</Btn>
          {editing ? (
            <>
              <Btn size="sm" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Btn>
              <Btn variant="ghost" size="sm" onClick={() => { setEditing(false); setEditForm(contact); }}>Cancel</Btn>
            </>
          ) : (
            <Btn variant="ghost" size="sm" onClick={() => setEditing(true)}>Edit</Btn>
          )}
          <Btn variant="danger" size="sm" onClick={handleDelete}>Delete</Btn>
        </div>
      </div>

      {/* Content */}
      <div style={contentStyle}>
        {/* Left column */}
        <div style={leftCol}>
          {/* Contact Info */}
          <div style={cardStyle}>
            <div style={sectionTitle}>Contact Information</div>
            {editing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={fieldRow}>
                  <Inp label="First Name" value={editForm.firstName || ''} onChange={(v) => setEditForm((f) => ({ ...f, firstName: v }))} />
                  <Inp label="Last Name" value={editForm.lastName || ''} onChange={(v) => setEditForm((f) => ({ ...f, lastName: v }))} />
                </div>
                <Inp label="Email" value={editForm.email || ''} onChange={(v) => setEditForm((f) => ({ ...f, email: v }))} type="email" />
                <div style={fieldRow}>
                  <Inp label="Phone" value={editForm.phone || ''} onChange={(v) => setEditForm((f) => ({ ...f, phone: v }))} />
                  <Inp label="Mobile" value={editForm.mobile || ''} onChange={(v) => setEditForm((f) => ({ ...f, mobile: v }))} />
                </div>
                <Inp label="Job Title" value={editForm.jobTitle || ''} onChange={(v) => setEditForm((f) => ({ ...f, jobTitle: v }))} />
                <Inp label="Source" value={editForm.source || ''} onChange={(v) => setEditForm((f) => ({ ...f, source: v }))} />
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <div style={fieldLabel}>Email</div>
                  <div style={fieldValue}>{contact.email || '\u2014'}</div>
                </div>
                <div>
                  <div style={fieldLabel}>Phone</div>
                  <div style={fieldValue}>{contact.phone || '\u2014'}</div>
                </div>
                <div>
                  <div style={fieldLabel}>Mobile</div>
                  <div style={fieldValue}>{contact.mobile || '\u2014'}</div>
                </div>
                <div>
                  <div style={fieldLabel}>Job Title</div>
                  <div style={fieldValue}>{contact.jobTitle || '\u2014'}</div>
                </div>
                <div>
                  <div style={fieldLabel}>Source</div>
                  <div style={fieldValue}>{contact.source || '\u2014'}</div>
                </div>
                <div>
                  <div style={fieldLabel}>Score</div>
                  <div style={{ ...fieldValue, fontWeight: 700, color: scoreColor(contact.score) }}>{contact.score}</div>
                </div>
                <div>
                  <div style={fieldLabel}>Assigned To</div>
                  <div style={fieldValue}>{contact.assignedTo?.name || '\u2014'}</div>
                </div>
                <div>
                  <div style={fieldLabel}>Last Contacted</div>
                  <div style={fieldValue}>{formatDate(contact.lastContactedAt)}</div>
                </div>
              </div>
            )}
          </div>

          {/* Activity Timeline */}
          <div style={cardStyle}>
            <div style={{ ...sectionTitle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Activity Timeline</span>
              <Btn variant="ghost" size="sm" onClick={() => setShowAddActivity(true)}>+ Add</Btn>
            </div>
            {activities.length === 0 ? (
              <div style={{ color: T.text3, fontSize: 12, textAlign: 'center', padding: 20 }}>No activities yet</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {activities.map((act, idx) => (
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
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: (ACTIVITY_COLORS[act.type] || T.blue) + '18',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 14,
                        flexShrink: 0,
                      }}
                    >
                      {ACTIVITY_ICONS[act.type] || '\u2022'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{act.title}</div>
                      {act.description && <div style={{ fontSize: 12, color: T.text2, marginTop: 2 }}>{act.description}</div>}
                      <div style={{ fontSize: 10, color: T.text3, marginTop: 4 }}>
                        {formatDate(act.createdAt)}
                        {act.user && <span> &middot; {act.user.name}</span>}
                      </div>
                    </div>
                    <Badge text={act.type} color={ACTIVITY_COLORS[act.type] || T.blue} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div style={rightCol}>
          {/* Linked Deals */}
          <div style={cardStyle}>
            <div style={sectionTitle}>Deals</div>
            {deals.length === 0 ? (
              <div style={{ color: T.text3, fontSize: 12, textAlign: 'center', padding: 16 }}>No linked deals</div>
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

          {/* Linked Tasks */}
          <div style={cardStyle}>
            <div style={sectionTitle}>Tasks</div>
            {tasks.length === 0 ? (
              <div style={{ color: T.text3, fontSize: 12, textAlign: 'center', padding: 16 }}>No linked tasks</div>
            ) : (
              tasks.map((task) => (
                <div
                  key={task.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 0',
                    borderBottom: `1px solid ${T.border2}`,
                  }}
                >
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 4,
                      border: `2px solid ${task.completed ? T.green : T.border}`,
                      background: task.completed ? T.green : 'transparent',
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: task.completed ? T.text3 : T.text,
                        textDecoration: task.completed ? 'line-through' : 'none',
                      }}
                    >
                      {task.title}
                    </div>
                    {task.dueDate && (
                      <div style={{ fontSize: 10, color: T.text3 }}>{formatDate(task.dueDate)}</div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Custom Fields */}
          <div style={cardStyle}>
            <div style={sectionTitle}>Custom Fields</div>
            <div style={{ color: T.text3, fontSize: 12, textAlign: 'center', padding: 16 }}>
              No custom fields configured
            </div>
          </div>
        </div>
      </div>

      {/* Add Activity Modal */}
      {showAddActivity && (
        <div style={overlayStyle} onClick={() => setShowAddActivity(false)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: T.text }}>Add Activity</div>
            <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
              {(['note', 'call', 'email', 'meeting'] as const).map((t) => (
                <Btn
                  key={t}
                  variant={activityType === t ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setActivityType(t)}
                >
                  {ACTIVITY_ICONS[t]} {t.charAt(0).toUpperCase() + t.slice(1)}
                </Btn>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Inp label="Title" value={activityTitle} onChange={setActivityTitle} placeholder="Activity title..." />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <label style={{ fontSize: 10, fontWeight: 600, color: T.text3, textTransform: 'uppercase' }}>Description</label>
                <textarea
                  value={activityDesc}
                  onChange={(e) => setActivityDesc(e.target.value)}
                  placeholder="Details..."
                  rows={4}
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
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <Btn variant="ghost" onClick={() => setShowAddActivity(false)}>Cancel</Btn>
              <Btn onClick={handleAddActivity}>Add Activity</Btn>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
