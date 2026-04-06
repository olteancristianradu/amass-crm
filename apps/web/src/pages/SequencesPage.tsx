import { useState, useEffect, CSSProperties } from 'react';
import { T, F } from '@/styles/tokens';
import { Btn } from '@/components/ui/Btn';
import { Badge } from '@/components/ui/Badge';
import { Inp } from '@/components/ui/Inp';
import { Toast } from '@/components/ui/Toast';
import { api } from '@/services/api';

interface Sequence {
  id: string;
  name: string;
  status: string;
  steps: Array<{ type: string; subject?: string; delay?: number }>;
  createdAt: string;
  _count?: { enrollments: number };
}

interface SequenceStats {
  active: number;
  completed: number;
  unsubscribed: number;
}

export function SequencesPage() {
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stats, setStats] = useState<SequenceStats | null>(null);
  const [toast, setToast] = useState('');

  const load = async () => {
    try {
      const r: any = await api('/sequences');
      const data = await r.json();
      setSequences(Array.isArray(data) ? data : []);
    } catch { setSequences([]); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      await api('/sequences', {
        method: 'POST',
        body: JSON.stringify({
          name,
          steps: [
            { type: 'email', subject: 'Introduction', delay: 0 },
            { type: 'wait', delay: 2 },
            { type: 'email', subject: 'Follow-up', delay: 0 },
          ],
        }),
      });
      setName('');
      setShowCreate(false);
      setToast('Sequence created');
      load();
    } catch { setToast('Create failed'); }
  };

  const handleDelete = async (id: string) => {
    try {
      await api(`/sequences/${id}`, { method: 'DELETE' });
      setToast('Deleted');
      if (selectedId === id) setSelectedId(null);
      load();
    } catch { setToast('Delete failed'); }
  };

  const loadStats = async (id: string) => {
    setSelectedId(id);
    try {
      const r: any = await api(`/sequences/${id}/stats`);
      setStats(await r.json());
    } catch { setStats(null); }
  };

  const handleEnroll = async (sequenceId: string) => {
    const contactId = prompt('Enter Contact ID to enroll:');
    if (!contactId) return;
    try {
      await api(`/sequences/${sequenceId}/enroll`, {
        method: 'POST',
        body: JSON.stringify({ contactId }),
      });
      setToast('Contact enrolled');
      loadStats(sequenceId);
    } catch { setToast('Enroll failed'); }
  };

  const page: CSSProperties = { padding: 32, overflowY: 'auto', height: '100%', fontFamily: F };
  const card: CSSProperties = {
    background: T.surface, borderRadius: 12, border: `1px solid ${T.border}`,
    padding: 16, marginBottom: 8, cursor: 'pointer', transition: 'all .15s',
  };

  if (loading) return <div style={page}><p style={{ color: T.text2 }}>Loading...</p></div>;

  return (
    <div style={page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: 0 }}>Sequences</h1>
          <p style={{ fontSize: 13, color: T.text2, margin: '4px 0 0' }}>Automated email & SMS drip campaigns</p>
        </div>
        <Btn onClick={() => setShowCreate(!showCreate)}>+ New Sequence</Btn>
      </div>

      {showCreate && (
        <div style={{ ...card, display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <Inp label="Sequence Name" value={name} onChange={setName} placeholder="e.g. Welcome Series" />
          </div>
          <Btn onClick={handleCreate}>Create</Btn>
          <Btn onClick={() => setShowCreate(false)}>Cancel</Btn>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: selectedId ? '1fr 1fr' : '1fr', gap: 16 }}>
        <div>
          {sequences.length === 0 && <p style={{ color: T.text3, fontSize: 13 }}>No sequences yet. Create your first one!</p>}
          {sequences.map(seq => (
            <div key={seq.id} style={{ ...card, borderColor: selectedId === seq.id ? T.accent : T.border }}
              onClick={() => loadStats(seq.id)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{seq.name}</span>
                  <div style={{ fontSize: 11, color: T.text3, marginTop: 4 }}>
                    {seq.steps?.length || 0} steps | Created {new Date(seq.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Badge text={seq.status} color={seq.status === 'active' ? T.green : T.yellow} />
                  <Btn onClick={() => handleEnroll(seq.id)}>Enroll</Btn>
                  <Btn onClick={() => handleDelete(seq.id)}>Delete</Btn>
                </div>
              </div>
            </div>
          ))}
        </div>

        {selectedId && stats && (
          <div style={card}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 12 }}>Enrollment Stats</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div style={{ textAlign: 'center', padding: 12, background: T.surface2, borderRadius: 8 }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: T.green }}>{stats.active}</div>
                <div style={{ fontSize: 11, color: T.text2 }}>Active</div>
              </div>
              <div style={{ textAlign: 'center', padding: 12, background: T.surface2, borderRadius: 8 }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: T.blue }}>{stats.completed}</div>
                <div style={{ fontSize: 11, color: T.text2 }}>Completed</div>
              </div>
              <div style={{ textAlign: 'center', padding: 12, background: T.surface2, borderRadius: 8 }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: T.red }}>{stats.unsubscribed}</div>
                <div style={{ fontSize: 11, color: T.text2 }}>Unsubscribed</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  );
}
