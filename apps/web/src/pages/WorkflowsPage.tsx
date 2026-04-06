import { useState, useEffect, useCallback, CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { T, F, FM } from '@/styles/tokens';
import { useAuthStore } from '@/store/authStore';
import { Btn } from '@/components/ui/Btn';
import { Badge } from '@/components/ui/Badge';
import { Inp } from '@/components/ui/Inp';
import { Toast } from '@/components/ui/Toast';
import { api } from '@/services/api';

interface WorkflowAction {
  id?: string;
  type: string;
  config: Record<string, string>;
}

interface Workflow {
  id: string;
  name: string;
  description: string;
  triggerType: string;
  triggerConditions: Record<string, string>;
  actions: WorkflowAction[];
  active: boolean;
  lastExecutedAt?: string;
  executionCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ExecutionLog {
  id: string;
  workflowId: string;
  status: string;
  startedAt: string;
  finishedAt?: string;
  error?: string;
}

const TRIGGER_TYPES = [
  { value: 'deal_created', label: 'Deal Created' },
  { value: 'deal_stage_changed', label: 'Deal Stage Changed' },
  { value: 'contact_created', label: 'Contact Created' },
  { value: 'lead_idle', label: 'Lead Idle' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'manual', label: 'Manual' },
];

const ACTION_TYPES = [
  { value: 'send_email', label: 'Send Email' },
  { value: 'send_sms', label: 'Send SMS' },
  { value: 'create_task', label: 'Create Task' },
  { value: 'update_field', label: 'Update Field' },
  { value: 'assign_user', label: 'Assign User' },
  { value: 'add_tag', label: 'Add Tag' },
  { value: 'webhook', label: 'Webhook' },
  { value: 'wait', label: 'Wait / Delay' },
];

export function WorkflowsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [executions, setExecutions] = useState<ExecutionLog[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    triggerType: 'deal_created',
    triggerConditions: [{ key: '', value: '' }],
    actions: [{ type: 'send_email', config: { to: '', subject: '', body: '' } }] as WorkflowAction[],
  });

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const loadWorkflows = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<{ workflows: Workflow[] }>('/workflows');
      setWorkflows(Array.isArray(data) ? data : data.workflows || []);
    } catch (err) {
      console.error('Failed to load workflows:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWorkflows();
  }, [loadWorkflows]);

  const handleCreate = async () => {
    try {
      const conditions: Record<string, string> = {};
      formData.triggerConditions.forEach((c) => {
        if (c.key) conditions[c.key] = c.value;
      });
      await api('/workflows', {
        method: 'POST',
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          triggerType: formData.triggerType,
          triggerConditions: conditions,
          actions: formData.actions,
        }),
      });
      setToast({ msg: 'Workflow created', type: 'success' });
      setShowForm(false);
      setFormData({
        name: '',
        description: '',
        triggerType: 'deal_created',
        triggerConditions: [{ key: '', value: '' }],
        actions: [{ type: 'send_email', config: { to: '', subject: '', body: '' } }],
      });
      loadWorkflows();
    } catch {
      setToast({ msg: 'Failed to create workflow', type: 'error' });
    }
  };

  const toggleActive = async (wf: Workflow) => {
    try {
      await api(`/workflows/${wf.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ active: !wf.active }),
      });
      loadWorkflows();
    } catch {
      setToast({ msg: 'Failed to update workflow', type: 'error' });
    }
  };

  const executeWorkflow = async (wf: Workflow) => {
    try {
      await api(`/workflows/${wf.id}/execute`, { method: 'POST' });
      setToast({ msg: 'Workflow executed', type: 'success' });
      loadWorkflows();
    } catch {
      setToast({ msg: 'Failed to execute workflow', type: 'error' });
    }
  };

  const loadExecutions = async (workflowId: string) => {
    if (expandedId === workflowId) {
      setExpandedId(null);
      return;
    }
    try {
      const data = await api<{ executions: ExecutionLog[] }>(`/workflows/${workflowId}/executions`);
      setExecutions(Array.isArray(data) ? data : data.executions || []);
      setExpandedId(workflowId);
    } catch {
      setToast({ msg: 'Failed to load executions', type: 'error' });
    }
  };

  const addCondition = () => {
    setFormData((p) => ({
      ...p,
      triggerConditions: [...p.triggerConditions, { key: '', value: '' }],
    }));
  };

  const removeCondition = (idx: number) => {
    setFormData((p) => ({
      ...p,
      triggerConditions: p.triggerConditions.filter((_, i) => i !== idx),
    }));
  };

  const updateCondition = (idx: number, field: 'key' | 'value', val: string) => {
    setFormData((p) => ({
      ...p,
      triggerConditions: p.triggerConditions.map((c, i) => (i === idx ? { ...c, [field]: val } : c)),
    }));
  };

  const addAction = () => {
    setFormData((p) => ({
      ...p,
      actions: [...p.actions, { type: 'send_email', config: {} }],
    }));
  };

  const removeAction = (idx: number) => {
    setFormData((p) => ({
      ...p,
      actions: p.actions.filter((_, i) => i !== idx),
    }));
  };

  const updateAction = (idx: number, field: string, val: string) => {
    setFormData((p) => ({
      ...p,
      actions: p.actions.map((a, i) => {
        if (i !== idx) return a;
        if (field === 'type') return { ...a, type: val };
        return { ...a, config: { ...a.config, [field]: val } };
      }),
    }));
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

  const content: CSSProperties = {
    flex: 1,
    overflow: 'auto',
    padding: 20,
  };

  const card: CSSProperties = {
    background: T.surface,
    borderRadius: 12,
    border: `1px solid ${T.border}`,
    marginBottom: 12,
    overflow: 'hidden',
  };

  const selectStyle: CSSProperties = {
    padding: '7px 10px',
    borderRadius: 8,
    border: `1px solid ${T.border}`,
    background: T.surface2,
    color: T.text,
    fontSize: 12,
    outline: 'none',
    fontFamily: F,
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
          <span style={{ fontSize: 13, color: T.text2, fontWeight: 500 }}>Workflows</span>
          <span style={{ fontSize: 11, color: T.text3 }}>({workflows.length})</span>
        </div>
        <Btn onClick={() => setShowForm((p) => !p)}>+ Add Workflow</Btn>
      </div>

      {showForm && (
        <div
          style={{
            padding: '20px',
            borderBottom: `1px solid ${T.border}`,
            background: T.surface,
          }}
        >
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16, alignItems: 'flex-end' }}>
            <Inp label="Name" value={formData.name} onChange={(v) => setFormData((p) => ({ ...p, name: v }))} width={200} />
            <Inp label="Description" value={formData.description} onChange={(v) => setFormData((p) => ({ ...p, description: v }))} width={250} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <label style={{ fontSize: 10, fontWeight: 600, color: T.text3, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Trigger
              </label>
              <select
                style={selectStyle}
                value={formData.triggerType}
                onChange={(e) => setFormData((p) => ({ ...p, triggerType: e.target.value }))}
              >
                {TRIGGER_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.text2, marginBottom: 8 }}>Trigger Conditions</div>
            {formData.triggerConditions.map((c, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                <Inp label="" value={c.key} onChange={(v) => updateCondition(i, 'key', v)} placeholder="Key" width={150} />
                <Inp label="" value={c.value} onChange={(v) => updateCondition(i, 'value', v)} placeholder="Value" width={200} />
                <Btn variant="danger" size="sm" onClick={() => removeCondition(i)}>
                  X
                </Btn>
              </div>
            ))}
            <Btn variant="ghost" size="sm" onClick={addCondition}>
              + Condition
            </Btn>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.text2, marginBottom: 8 }}>Actions</div>
            {formData.actions.map((a, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  gap: 8,
                  marginBottom: 8,
                  alignItems: 'flex-end',
                  padding: 10,
                  background: T.surface2,
                  borderRadius: 8,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <label style={{ fontSize: 10, fontWeight: 600, color: T.text3, textTransform: 'uppercase' }}>
                    Type
                  </label>
                  <select style={selectStyle} value={a.type} onChange={(e) => updateAction(i, 'type', e.target.value)}>
                    {ACTION_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <Inp label="Config Key" value={Object.keys(a.config)[0] || ''} onChange={() => {}} width={120} placeholder="key" />
                <Inp
                  label="Config Value"
                  value={Object.values(a.config)[0] || ''}
                  onChange={(v) => updateAction(i, Object.keys(a.config)[0] || 'value', v)}
                  width={200}
                  placeholder="value"
                />
                <Btn variant="danger" size="sm" onClick={() => removeAction(i)}>
                  X
                </Btn>
              </div>
            ))}
            <Btn variant="ghost" size="sm" onClick={addAction}>
              + Action
            </Btn>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <Btn onClick={handleCreate} disabled={!formData.name}>
              Create Workflow
            </Btn>
            <Btn variant="ghost" onClick={() => setShowForm(false)}>
              Cancel
            </Btn>
          </div>
        </div>
      )}

      <div style={content}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: T.text2 }}>Loading...</div>
        ) : workflows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: T.text3, fontSize: 13 }}>
            No workflows yet. Create your first workflow to automate your CRM.
          </div>
        ) : (
          workflows.map((wf) => (
            <div key={wf.id} style={card}>
              <div
                style={{
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{wf.name}</span>
                    <Badge text={wf.active ? 'Active' : 'Inactive'} color={wf.active ? T.green : T.text3} />
                    <Badge
                      text={TRIGGER_TYPES.find((t) => t.value === wf.triggerType)?.label || wf.triggerType}
                      color={T.blue}
                    />
                  </div>
                  {wf.description && (
                    <div style={{ fontSize: 11, color: T.text2 }}>{wf.description}</div>
                  )}
                  <div style={{ fontSize: 10, color: T.text3, marginTop: 4, display: 'flex', gap: 16 }}>
                    <span>Executions: {wf.executionCount}</span>
                    {wf.lastExecutedAt && (
                      <span>Last run: {new Date(wf.lastExecutedAt).toLocaleString()}</span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <button
                    onClick={() => toggleActive(wf)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 6,
                      border: `1px solid ${wf.active ? T.green : T.border}`,
                      background: wf.active ? T.greenLt : T.surface2,
                      color: wf.active ? T.green : T.text3,
                      fontSize: 10,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {wf.active ? 'Deactivate' : 'Activate'}
                  </button>
                  <Btn variant="ghost" size="sm" onClick={() => executeWorkflow(wf)}>
                    Execute
                  </Btn>
                  <Btn variant="ghost" size="sm" onClick={() => loadExecutions(wf.id)}>
                    {expandedId === wf.id ? 'Hide History' : 'History'}
                  </Btn>
                </div>
              </div>

              {expandedId === wf.id && (
                <div
                  style={{
                    padding: '0 16px 14px',
                    borderTop: `1px solid ${T.border2}`,
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.text2, padding: '12px 0 8px' }}>
                    Execution History
                  </div>
                  {executions.length === 0 ? (
                    <div style={{ fontSize: 11, color: T.text3 }}>No executions yet</div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                      <thead>
                        <tr>
                          <th
                            style={{
                              textAlign: 'left',
                              padding: '6px 8px',
                              fontSize: 10,
                              fontWeight: 700,
                              color: T.text3,
                              borderBottom: `1px solid ${T.border2}`,
                            }}
                          >
                            Status
                          </th>
                          <th
                            style={{
                              textAlign: 'left',
                              padding: '6px 8px',
                              fontSize: 10,
                              fontWeight: 700,
                              color: T.text3,
                              borderBottom: `1px solid ${T.border2}`,
                            }}
                          >
                            Started
                          </th>
                          <th
                            style={{
                              textAlign: 'left',
                              padding: '6px 8px',
                              fontSize: 10,
                              fontWeight: 700,
                              color: T.text3,
                              borderBottom: `1px solid ${T.border2}`,
                            }}
                          >
                            Finished
                          </th>
                          <th
                            style={{
                              textAlign: 'left',
                              padding: '6px 8px',
                              fontSize: 10,
                              fontWeight: 700,
                              color: T.text3,
                              borderBottom: `1px solid ${T.border2}`,
                            }}
                          >
                            Error
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {executions.map((ex) => (
                          <tr key={ex.id}>
                            <td style={{ padding: '6px 8px', borderBottom: `1px solid ${T.border2}` }}>
                              <Badge
                                text={ex.status}
                                color={ex.status === 'success' ? T.green : ex.status === 'failed' ? T.red : T.yellow}
                              />
                            </td>
                            <td
                              style={{
                                padding: '6px 8px',
                                borderBottom: `1px solid ${T.border2}`,
                                fontFamily: FM,
                                fontSize: 10,
                                color: T.text2,
                              }}
                            >
                              {new Date(ex.startedAt).toLocaleString()}
                            </td>
                            <td
                              style={{
                                padding: '6px 8px',
                                borderBottom: `1px solid ${T.border2}`,
                                fontFamily: FM,
                                fontSize: 10,
                                color: T.text2,
                              }}
                            >
                              {ex.finishedAt ? new Date(ex.finishedAt).toLocaleString() : '-'}
                            </td>
                            <td
                              style={{
                                padding: '6px 8px',
                                borderBottom: `1px solid ${T.border2}`,
                                color: T.red,
                                fontSize: 10,
                              }}
                            >
                              {ex.error || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
