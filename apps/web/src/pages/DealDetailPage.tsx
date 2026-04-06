import { useState, useEffect, useCallback, CSSProperties } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { T, FM } from '@/styles/tokens';
import { Btn } from '@/components/ui/Btn';
import { Inp } from '@/components/ui/Inp';
import { Badge } from '@/components/ui/Badge';
import { Toast } from '@/components/ui/Toast';
import * as dealService from '@/services/deal.service';
import type { Deal } from '@/services/deal.service';
import * as pipelineService from '@/services/pipeline.service';
import type { Pipeline, PipelineStage } from '@/services/pipeline.service';
import * as activityService from '@/services/activity.service';
import type { Activity } from '@/services/activity.service';
import * as taskService from '@/services/task.service';
import type { Task } from '@/services/task.service';
import { api } from '@/services/api';

function fmtCurrency(val: number, cur = 'RON'): string {
  return new Intl.NumberFormat('ro-RO', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(val);
}
function fmtDate(d?: string): string {
  if (!d) return '\u2014';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtDateTime(d?: string): string {
  if (!d) return '\u2014';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

interface LineItem {
  id: string; name: string; quantity: number; unitPrice: number; discount: number; total: number;
}

export function DealDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [deal, setDeal] = useState<Deal | null>(null);
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Deal>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const [activities, setActivities] = useState<Activity[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  // Add contact modal
  const [showAddContact, setShowAddContact] = useState(false);
  const [addContactId, setAddContactId] = useState('');

  // Add line item modal
  const [showAddItem, setShowAddItem] = useState(false);
  const [itemForm, setItemForm] = useState({ name: '', quantity: '1', unitPrice: '', discount: '0' });

  const loadDeal = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const d = await dealService.getDeal(id);
      setDeal(d);
      setEditForm(d);
      if (d.pipelineId) {
        try { const p = await pipelineService.getPipeline(d.pipelineId); setPipeline(p); } catch { /* ignore */ }
      }
    } catch { setToast({ msg: 'Failed to load deal', type: 'error' }); }
    finally { setLoading(false); }
  }, [id]);

  const loadRelated = useCallback(async () => {
    if (!id) return;
    const [actRes, taskRes] = await Promise.allSettled([
      activityService.listActivities({ dealId: id, limit: 50 }),
      taskService.listTasks({ dealId: id, limit: 50 }),
    ]);
    if (actRes.status === 'fulfilled') setActivities(actRes.value.activities);
    if (taskRes.status === 'fulfilled') setTasks(taskRes.value.tasks);
  }, [id]);

  useEffect(() => { loadDeal(); loadRelated(); }, [loadDeal, loadRelated]);

  const handleSave = async () => {
    if (!id) return;
    try {
      setSaving(true);
      const updated = await dealService.updateDeal(id, {
        title: editForm.title, value: editForm.value, currency: editForm.currency,
        expectedCloseDate: editForm.expectedCloseDate, source: editForm.source, notes: editForm.notes,
      });
      setDeal(updated);
      setEditing(false);
      setToast({ msg: 'Deal updated', type: 'success' });
    } catch { setToast({ msg: 'Failed to update', type: 'error' }); }
    finally { setSaving(false); }
  };

  const handleMoveStage = async (stageId: string) => {
    if (!id) return;
    try {
      const updated = await dealService.moveDealStage(id, stageId);
      setDeal(updated);
      setToast({ msg: 'Stage updated', type: 'success' });
    } catch { setToast({ msg: 'Failed to move stage', type: 'error' }); }
  };

  const handleDelete = async () => {
    if (!id || !confirm('Delete this deal?')) return;
    try { await dealService.deleteDeal(id); navigate('/deals'); }
    catch { setToast({ msg: 'Failed to delete', type: 'error' }); }
  };

  const handleAddContact = async () => {
    if (!id || !addContactId.trim()) return;
    try {
      await api(`/deals/${id}/contacts`, { method: 'POST', body: JSON.stringify({ contactId: addContactId }) });
      setShowAddContact(false); setAddContactId('');
      setToast({ msg: 'Contact linked', type: 'success' });
      loadDeal();
    } catch { setToast({ msg: 'Failed to add contact', type: 'error' }); }
  };

  const handleAddItem = async () => {
    if (!id || !itemForm.name.trim()) return;
    try {
      await api(`/deals/${id}/line-items`, {
        method: 'POST',
        body: JSON.stringify({ name: itemForm.name, quantity: parseInt(itemForm.quantity) || 1, unitPrice: parseFloat(itemForm.unitPrice) || 0, discount: parseFloat(itemForm.discount) || 0 }),
      });
      setShowAddItem(false);
      setItemForm({ name: '', quantity: '1', unitPrice: '', discount: '0' });
      setToast({ msg: 'Item added', type: 'success' });
      loadDeal();
    } catch { setToast({ msg: 'Failed to add item', type: 'error' }); }
  };

  const pageStyle: CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column' };
  const headerStyle: CSSProperties = { padding: '16px 20px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 12 };
  const contentStyle: CSSProperties = { flex: 1, overflow: 'auto', padding: 20, display: 'flex', gap: 20 };
  const leftCol: CSSProperties = { flex: '2 1 500px', display: 'flex', flexDirection: 'column', gap: 16 };
  const rightCol: CSSProperties = { flex: '1 1 320px', display: 'flex', flexDirection: 'column', gap: 16 };
  const card: CSSProperties = { background: T.surface, borderRadius: 12, padding: 16, border: `1px solid ${T.border}` };
  const secTitle: CSSProperties = { fontSize: 13, fontWeight: 700, marginBottom: 12, color: T.text };
  const fLabel: CSSProperties = { fontSize: 10, fontWeight: 600, color: T.text3, textTransform: 'uppercase', marginBottom: 2 };
  const fVal: CSSProperties = { fontSize: 13, color: T.text };
  const overlayStyle: CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
  const modalStyle: CSSProperties = { background: T.surface, borderRadius: 14, padding: 24, width: 420, maxWidth: '90vw', boxShadow: `0 20px 60px ${T.shadow}`, border: `1px solid ${T.border}` };
  const thStyle: CSSProperties = { textAlign: 'left', padding: '8px 10px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: T.text3, borderBottom: `1px solid ${T.border}` };
  const tdS: CSSProperties = { padding: '8px 10px', fontSize: 12, borderBottom: `1px solid ${T.border2}` };

  if (loading) return <div style={pageStyle}><div style={{ textAlign: 'center', padding: 60, color: T.text2 }}>Loading...</div></div>;
  if (!deal) return <div style={pageStyle}><div style={{ textAlign: 'center', padding: 60, color: T.text3 }}>Deal not found<div style={{ marginTop: 12 }}><Btn variant="ghost" onClick={() => navigate('/deals')}>Back to Deals</Btn></div></div></div>;

  const stages: PipelineStage[] = pipeline?.stages?.sort((a, b) => a.order - b.order) || [];
  const currentStageIdx = stages.findIndex((s) => s.id === deal.stageId);
  const probability = deal.probability ?? deal.stage?.probability ?? 0;
  const lineItems: LineItem[] = deal.lineItems || [];

  return (
    <div style={pageStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <Btn variant="ghost" size="sm" onClick={() => navigate('/deals')}>&larr; Deals</Btn>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: T.text }}>{deal.title}</span>
            <Badge text={fmtCurrency(deal.value)} color={T.green} />
            {deal.stage && <Badge text={deal.stage.name} color={deal.stage.color || T.accent} />}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
            <span style={{ fontSize: 11, color: T.text3 }}>Probability</span>
            <div style={{ width: 120, height: 6, background: T.surface3, borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `${probability}%`, height: '100%', background: T.accent, borderRadius: 3, transition: 'width .3s' }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: T.accent, fontFamily: FM }}>{probability}%</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {editing ? (
            <>
              <Btn size="sm" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Btn>
              <Btn variant="ghost" size="sm" onClick={() => { setEditing(false); setEditForm(deal); }}>Cancel</Btn>
            </>
          ) : (
            <Btn variant="ghost" size="sm" onClick={() => setEditing(true)}>Edit</Btn>
          )}
          <Btn variant="danger" size="sm" onClick={handleDelete}>Delete</Btn>
        </div>
      </div>

      {/* Stage Progression Bar */}
      {stages.length > 0 && (
        <div style={{ display: 'flex', gap: 2, padding: '0 20px', marginTop: 12 }}>
          {stages.map((st, idx) => {
            const isCurrent = st.id === deal.stageId;
            const isPast = idx < currentStageIdx;
            return (
              <div
                key={st.id}
                onClick={() => handleMoveStage(st.id)}
                style={{
                  flex: 1, padding: '8px 4px', textAlign: 'center', fontSize: 10, fontWeight: 600,
                  background: isCurrent ? (st.color || T.accent) : isPast ? (st.color || T.accent) + '33' : T.surface2,
                  color: isCurrent ? '#fff' : isPast ? T.text : T.text3,
                  borderRadius: 6, cursor: 'pointer', transition: 'all .15s',
                  border: isCurrent ? `2px solid ${st.color || T.accent}` : `1px solid ${T.border2}`,
                }}
              >
                {st.name}
              </div>
            );
          })}
        </div>
      )}

      <div style={contentStyle}>
        <div style={leftCol}>
          {/* Deal Info */}
          <div style={card}>
            <div style={secTitle}>Deal Information</div>
            {editing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Inp label="Title" value={editForm.title || ''} onChange={(v) => setEditForm((f) => ({ ...f, title: v }))} />
                <div style={{ display: 'flex', gap: 10 }}>
                  <Inp label="Value" value={String(editForm.value || '')} onChange={(v) => setEditForm((f) => ({ ...f, value: parseFloat(v) || 0 }))} type="number" />
                  <Inp label="Currency" value={editForm.currency || 'RON'} onChange={(v) => setEditForm((f) => ({ ...f, currency: v }))} />
                </div>
                <Inp label="Expected Close" value={editForm.expectedCloseDate?.split('T')[0] || ''} onChange={(v) => setEditForm((f) => ({ ...f, expectedCloseDate: v }))} type="date" />
                <Inp label="Source" value={editForm.source || ''} onChange={(v) => setEditForm((f) => ({ ...f, source: v }))} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <label style={{ fontSize: 10, fontWeight: 600, color: T.text3, textTransform: 'uppercase' }}>Notes</label>
                  <textarea value={editForm.notes || ''} onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))} rows={4}
                    style={{ padding: '7px 10px', borderRadius: 8, border: `1px solid ${T.border}`, background: T.surface2, color: T.text, fontSize: 12, outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} />
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div><div style={fLabel}>Value</div><div style={{ ...fVal, fontWeight: 700, color: T.green, fontFamily: FM }}>{fmtCurrency(deal.value, deal.currency)}</div></div>
                <div><div style={fLabel}>Currency</div><div style={fVal}>{deal.currency || 'RON'}</div></div>
                <div><div style={fLabel}>Expected Close</div><div style={fVal}>{fmtDate(deal.expectedCloseDate)}</div></div>
                <div><div style={fLabel}>Source</div><div style={fVal}>{deal.source || '\u2014'}</div></div>
                <div><div style={fLabel}>Company</div><div style={{ ...fVal, cursor: deal.companyId ? 'pointer' : 'default', color: deal.companyId ? T.accent : T.text }} onClick={() => deal.companyId && navigate(`/companies/${deal.companyId}`)}>{deal.company?.name || '\u2014'}</div></div>
                <div><div style={fLabel}>Assignee</div><div style={fVal}>{deal.assignedTo?.name || '\u2014'}</div></div>
                {deal.notes && <div style={{ gridColumn: '1 / -1' }}><div style={fLabel}>Notes</div><div style={{ ...fVal, whiteSpace: 'pre-wrap' }}>{deal.notes}</div></div>}
              </div>
            )}
          </div>

          {/* Line Items */}
          <div style={card}>
            <div style={{ ...secTitle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Line Items</span>
              <Btn variant="ghost" size="sm" onClick={() => setShowAddItem(true)}>+ Add Item</Btn>
            </div>
            {lineItems.length === 0 ? (
              <div style={{ color: T.text3, fontSize: 12, textAlign: 'center', padding: 16 }}>No line items</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>
                  <th style={thStyle}>Product</th><th style={thStyle}>Qty</th><th style={thStyle}>Unit Price</th><th style={thStyle}>Discount</th><th style={thStyle}>Total</th>
                </tr></thead>
                <tbody>
                  {lineItems.map((it) => (
                    <tr key={it.id}>
                      <td style={tdS}>{it.name}</td>
                      <td style={{ ...tdS, fontFamily: FM }}>{it.quantity}</td>
                      <td style={{ ...tdS, fontFamily: FM }}>{fmtCurrency(it.unitPrice)}</td>
                      <td style={{ ...tdS, fontFamily: FM }}>{it.discount}%</td>
                      <td style={{ ...tdS, fontFamily: FM, fontWeight: 700, color: T.green }}>{fmtCurrency(it.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Activity Timeline */}
          <div style={card}>
            <div style={secTitle}>Activity Timeline</div>
            {activities.length === 0 ? (
              <div style={{ color: T.text3, fontSize: 12, textAlign: 'center', padding: 20 }}>No activities yet</div>
            ) : (
              activities.map((act, idx) => (
                <div key={act.id} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: idx < activities.length - 1 ? `1px solid ${T.border2}` : 'none' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: T.accent, marginTop: 5, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{act.subject}</div>
                    {act.description && <div style={{ fontSize: 12, color: T.text2, marginTop: 2 }}>{act.description}</div>}
                    <div style={{ fontSize: 10, color: T.text3, marginTop: 4 }}>{fmtDateTime(act.createdAt)}{act.user && <span> &middot; {act.user.name}</span>}</div>
                  </div>
                  <Badge text={act.type} color={T.blue} />
                </div>
              ))
            )}
          </div>
        </div>

        <div style={rightCol}>
          {/* Contacts */}
          <div style={card}>
            <div style={{ ...secTitle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Contacts</span>
              <Btn variant="ghost" size="sm" onClick={() => setShowAddContact(true)}>+ Add</Btn>
            </div>
            {(deal.contacts || []).length === 0 ? (
              <div style={{ color: T.text3, fontSize: 12, textAlign: 'center', padding: 16 }}>No contacts linked</div>
            ) : (
              (deal.contacts || []).map((dc) => (
                <div key={dc.contact.id} onClick={() => navigate(`/contacts/${dc.contact.id}`)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${T.border2}`, cursor: 'pointer' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{dc.contact.firstName} {dc.contact.lastName}</div>
                    <div style={{ fontSize: 10, color: T.text3 }}>{dc.contact.email}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Tasks */}
          <div style={card}>
            <div style={secTitle}>Tasks</div>
            {tasks.length === 0 ? (
              <div style={{ color: T.text3, fontSize: 12, textAlign: 'center', padding: 16 }}>No tasks</div>
            ) : (
              tasks.map((t) => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: `1px solid ${T.border2}` }}>
                  <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${t.status === 'completed' ? T.green : T.border}`, background: t.status === 'completed' ? T.green : 'transparent', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: t.status === 'completed' ? T.text3 : T.text, textDecoration: t.status === 'completed' ? 'line-through' : 'none' }}>{t.title}</div>
                    {t.dueDate && <div style={{ fontSize: 10, color: T.text3 }}>{fmtDate(t.dueDate)}</div>}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Tags */}
          {(deal.tags || []).length > 0 && (
            <div style={card}>
              <div style={secTitle}>Tags</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {deal.tags.map((tag) => <Badge key={tag} text={tag} color={T.blue} />)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Contact Modal */}
      {showAddContact && (
        <div style={overlayStyle} onClick={() => setShowAddContact(false)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: T.text }}>Link Contact</div>
            <Inp label="Contact ID" value={addContactId} onChange={setAddContactId} placeholder="Enter contact ID..." />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <Btn variant="ghost" onClick={() => setShowAddContact(false)}>Cancel</Btn>
              <Btn onClick={handleAddContact}>Add Contact</Btn>
            </div>
          </div>
        </div>
      )}

      {/* Add Line Item Modal */}
      {showAddItem && (
        <div style={overlayStyle} onClick={() => setShowAddItem(false)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: T.text }}>Add Line Item</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Inp label="Product Name" value={itemForm.name} onChange={(v) => setItemForm((f) => ({ ...f, name: v }))} placeholder="Product..." />
              <div style={{ display: 'flex', gap: 10 }}>
                <Inp label="Quantity" value={itemForm.quantity} onChange={(v) => setItemForm((f) => ({ ...f, quantity: v }))} type="number" />
                <Inp label="Unit Price" value={itemForm.unitPrice} onChange={(v) => setItemForm((f) => ({ ...f, unitPrice: v }))} type="number" />
              </div>
              <Inp label="Discount (%)" value={itemForm.discount} onChange={(v) => setItemForm((f) => ({ ...f, discount: v }))} type="number" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <Btn variant="ghost" onClick={() => setShowAddItem(false)}>Cancel</Btn>
              <Btn onClick={handleAddItem}>Add Item</Btn>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
