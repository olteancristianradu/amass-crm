import { useState, useEffect, useCallback, CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { T } from '@/styles/tokens';
import { STAGES, STAGE_COLORS } from '@amass/shared';
import type { Client, Stage } from '@amass/shared';
import { KanbanBoard } from '@/components/pipeline/KanbanBoard';
import { Btn } from '@/components/ui/Btn';
import { Badge } from '@/components/ui/Badge';
import { Inp } from '@/components/ui/Inp';
import { Toast } from '@/components/ui/Toast';
import * as clientService from '@/services/client.service';

export function PipelinePage() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [filterStage, setFilterStage] = useState<Stage | ''>('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const loadClients = useCallback(async () => {
    try {
      const result = await clientService.listClients({
        search: search || undefined,
        stage: filterStage || undefined,
        limit: 200,
      });
      setClients(result.clients);
    } catch (err) {
      console.error('Failed to load clients:', err);
    } finally {
      setLoading(false);
    }
  }, [search, filterStage]);

  useEffect(() => { loadClients(); }, [loadClients]);

  const handleMoveStage = async (clientId: string, newStage: Stage) => {
    try {
      await clientService.moveClientStage(clientId, newStage);
      setToast({ msg: `Client mutat in ${newStage}`, type: 'success' });
      loadClients();
    } catch {
      setToast({ msg: 'Eroare la mutare', type: 'error' });
    }
  };

  const handleExportCsv = async () => {
    try {
      const csv = await clientService.exportCsv();
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'clients.csv'; a.click();
      URL.revokeObjectURL(url);
    } catch {
      setToast({ msg: 'Export esuat', type: 'error' });
    }
  };

  const page: CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column' };
  const toolbar: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', flexWrap: 'wrap' };
  const content: CSSProperties = { flex: 1, overflow: 'hidden', padding: '0 20px 20px', display: 'flex', flexDirection: 'column' };

  return (
    <div style={page}>
      <div style={{ padding: '16px 20px 0', fontSize: 18, fontWeight: 700, color: T.text }}>
        Solar Pipeline
        <span style={{ fontSize: 12, color: T.text3, fontWeight: 400, marginLeft: 8 }}>Legacy T1/T2/T3</span>
      </div>

      <div style={toolbar}>
        <Inp value={search} onChange={setSearch} placeholder="Cauta client..." width={200} />
        <div style={{ display: 'flex', gap: 4 }}>
          <Btn variant={filterStage === '' ? 'primary' : 'ghost'} size="sm" onClick={() => setFilterStage('')}>Toate</Btn>
          {STAGES.map(s => (
            <Btn key={s} variant={filterStage === s ? 'primary' : 'ghost'} size="sm" onClick={() => setFilterStage(s)}
              style={filterStage === s ? { background: STAGE_COLORS[s] } : {}}>{s}</Btn>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          <Btn variant={viewMode === 'kanban' ? 'primary' : 'ghost'} size="sm" onClick={() => setViewMode('kanban')}>Kanban</Btn>
          <Btn variant={viewMode === 'list' ? 'primary' : 'ghost'} size="sm" onClick={() => setViewMode('list')}>Lista</Btn>
          <Btn variant="ghost" size="sm" onClick={handleExportCsv}>CSV</Btn>
        </div>
      </div>

      <div style={content}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: T.text2 }}>Se incarca...</div>
        ) : viewMode === 'kanban' ? (
          <KanbanBoard clients={clients} onSelectClient={(c) => navigate(`/clients/${c.id}`)} onMoveStage={handleMoveStage} />
        ) : (
          <div style={{ overflowY: 'auto', flex: 1 }}>
            <table className="at">
              <thead><tr><th>Nume</th><th>Telefon</th><th>Localitate</th><th>Etapa</th><th>Scor</th><th>Suprafata</th></tr></thead>
              <tbody>
                {clients.map(c => (
                  <tr key={c.id} onClick={() => navigate(`/clients/${c.id}`)}>
                    <td style={{ fontWeight: 600 }}>{c.name || 'Fara nume'}</td>
                    <td>{c.phone}</td><td>{c.location}</td>
                    <td><Badge text={c.stage} color={STAGE_COLORS[c.stage as Stage] || '#6B7280'} /></td>
                    <td>{c.score}</td><td>{c.area ? `${c.area} mp` : '\u2014'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {clients.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: T.text3 }}>Niciun client</div>}
          </div>
        )}
      </div>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
