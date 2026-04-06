import { useState, useEffect, useCallback, CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { T, FM } from '@/styles/tokens';
import { Btn } from '@/components/ui/Btn';
import { Inp } from '@/components/ui/Inp';
import { Badge } from '@/components/ui/Badge';
import { Toast } from '@/components/ui/Toast';
import { CURRENCIES } from '@amass/shared';
import type { CurrencyCode, Currency } from '@amass/shared';
import * as dealService from '@/services/deal.service';
import type { Deal } from '@/services/deal.service';
import * as pipelineService from '@/services/pipeline.service';
import type { Pipeline, PipelineStage } from '@/services/pipeline.service';

const PAGE_SIZE = 25;
type ViewMode = 'kanban' | 'list';
interface KanbanData { [stageId: string]: Deal[] }

const CURRENCY_OPTIONS: Currency[] = Object.values(CURRENCIES);

function fmtCurrency(val: number, cur: CurrencyCode = 'EUR'): string {
  return new Intl.NumberFormat('ro-RO', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(val);
}
function fmtDate(d?: string): string {
  if (!d) return '\u2014';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function DealsPage() {
  const navigate = useNavigate();

  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selPipelineId, setSelPipelineId] = useState('');
  const [selPipeline, setSelPipeline] = useState<Pipeline | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');

  const [deals, setDeals] = useState<Deal[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [kanbanData, setKanbanData] = useState<KanbanData>({});

  const [filterStage, setFilterStage] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');
  const [filterValueMin, setFilterValueMin] = useState('');
  const [filterValueMax, setFilterValueMax] = useState('');

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [totalValue, setTotalValue] = useState(0);

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ title: '', value: '', currency: 'EUR' as CurrencyCode, pipelineId: '', stageId: '', companySearch: '', contactId: '', expectedCloseDate: '' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    pipelineService.listPipelines({ limit: 100 }).then((r) => {
      setPipelines(r.pipelines);
      if (r.pipelines.length) {
        const def = r.pipelines.find((p) => p.isDefault) || r.pipelines[0];
        setSelPipelineId(def.id);
        setSelPipeline(def);
      }
    }).catch(() => setToast({ msg: 'Failed to load pipelines', type: 'error' }));
  }, []);

  useEffect(() => {
    const p = pipelines.find((x) => x.id === selPipelineId) || null;
    setSelPipeline(p);
    if (p) setCreateForm((f) => ({ ...f, pipelineId: p.id, stageId: p.stages?.[0]?.id || '' }));
  }, [selPipelineId, pipelines]);

  const loadList = useCallback(async () => {
    if (!selPipelineId) return;
    try {
      setLoading(true);
      const f: Record<string, string | number | undefined> = { pipelineId: selPipelineId, page, limit: PAGE_SIZE };
      if (filterStage) f.stageId = filterStage;
      if (filterAssignee) f.assignedToId = filterAssignee;
      if (filterValueMin) f.valueMin = filterValueMin;
      if (filterValueMax) f.valueMax = filterValueMax;
      const res = await dealService.listDeals(f);
      setDeals(res.deals);
      setTotal(res.total);
      setTotalPages(res.totalPages);
      setTotalValue(res.deals.reduce((s, d) => s + (d.value || 0), 0));
    } catch { setToast({ msg: 'Failed to load deals', type: 'error' }); }
    finally { setLoading(false); }
  }, [selPipelineId, page, filterStage, filterAssignee, filterValueMin, filterValueMax]);

  const loadKanban = useCallback(async () => {
    if (!selPipelineId) return;
    try {
      setLoading(true);
      const data: any = await dealService.getKanban(selPipelineId);
      if (data && typeof data === 'object') {
        setKanbanData(data as KanbanData);
        const all = Object.values(data).flat() as Deal[];
        setTotalValue(all.reduce((s, d) => s + (d.value || 0), 0));
        setTotal(all.length);
      }
    } catch {
      try {
        const res = await dealService.listDeals({ pipelineId: selPipelineId, limit: 500 });
        const g: KanbanData = {};
        for (const d of res.deals) { const sid = d.stageId || 'unknown'; if (!g[sid]) g[sid] = []; g[sid].push(d); }
        setKanbanData(g);
        setTotalValue(res.deals.reduce((s, d) => s + (d.value || 0), 0));
        setTotal(res.total);
      } catch { setToast({ msg: 'Failed to load deals', type: 'error' }); }
    } finally { setLoading(false); }
  }, [selPipelineId]);

  useEffect(() => { if (viewMode === 'list') loadList(); else loadKanban(); }, [viewMode, loadList, loadKanban]);
  useEffect(() => { setPage(1); }, [filterStage, filterAssignee, filterValueMin, filterValueMax]);

  const handleCreate = async () => {
    if (!createForm.title.trim()) return;
    try {
      setCreating(true);
      await dealService.createDeal({
        title: createForm.title, value: parseFloat(createForm.value) || 0,
        currency: createForm.currency,
        pipelineId: createForm.pipelineId || selPipelineId, stageId: createForm.stageId,
        contactId: createForm.contactId || undefined, expectedCloseDate: createForm.expectedCloseDate || undefined,
      });
      setToast({ msg: 'Deal created', type: 'success' });
      setShowCreate(false);
      setCreateForm({ title: '', value: '', currency: 'EUR', pipelineId: selPipelineId, stageId: selPipeline?.stages?.[0]?.id || '', companySearch: '', contactId: '', expectedCloseDate: '' });
      if (viewMode === 'list') loadList(); else loadKanban();
    } catch { setToast({ msg: 'Failed to create deal', type: 'error' }); }
    finally { setCreating(false); }
  };

  const pageStyle: CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column' };
  const toolbarStyle: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', flexWrap: 'wrap' };
  const thStyle: CSSProperties = { textAlign: 'left', padding: '10px 12px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: T.text3, borderBottom: `2px solid ${T.border}`, position: 'sticky', top: 0, background: T.surface, letterSpacing: 0.5 };
  const tdStyle: CSSProperties = { padding: '10px 12px', fontSize: 13, borderBottom: `1px solid ${T.border2}` };
  const overlayStyle: CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
  const modalStyle: CSSProperties = { background: T.surface, borderRadius: 14, padding: 24, width: 480, maxWidth: '90vw', boxShadow: `0 20px 60px ${T.shadow}`, border: `1px solid ${T.border}` };
  const selStyle: CSSProperties = { padding: '7px 10px', borderRadius: 8, border: `1px solid ${T.border}`, background: T.surface2, color: T.text, fontSize: 12, outline: 'none' };

  const stages: PipelineStage[] = selPipeline?.stages?.sort((a, b) => a.order - b.order) || [];

  return (
    <div style={pageStyle}>
      <div style={toolbarStyle}>
        <div style={{ fontSize: 18, fontWeight: 700, color: T.text, marginRight: 12 }}>Deals</div>
        <select value={selPipelineId} onChange={(e) => setSelPipelineId(e.target.value)} style={selStyle}>
          {pipelines.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <div style={{ display: 'flex', gap: 0, borderRadius: 8, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
          {(['kanban', 'list'] as ViewMode[]).map((m) => (
            <button key={m} onClick={() => setViewMode(m)} style={{ padding: '6px 12px', fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer', background: viewMode === m ? T.accent : T.surface2, color: viewMode === m ? '#fff' : T.text2 }}>
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
        {viewMode === 'list' && (
          <>
            <select value={filterStage} onChange={(e) => setFilterStage(e.target.value)} style={selStyle}>
              <option value="">All Stages</option>
              {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <Inp value={filterAssignee} onChange={setFilterAssignee} placeholder="Assignee ID..." width={130} />
            <Inp value={filterValueMin} onChange={setFilterValueMin} placeholder="Min value" width={100} type="number" />
            <Inp value={filterValueMax} onChange={setFilterValueMax} placeholder="Max value" width={100} type="number" />
          </>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ fontSize: 12, color: T.text2, marginRight: 8 }}>
            <span style={{ fontWeight: 700, color: T.text }}>{total}</span> deals{' \u00b7 '}
            <span style={{ fontWeight: 700, color: T.green, fontFamily: FM }}>{fmtCurrency(totalValue)}</span>
          </div>
          <Btn onClick={() => setShowCreate(true)}>+ New Deal</Btn>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: T.text2 }}>Loading...</div>
      ) : viewMode === 'kanban' ? (
        <div style={{ display: 'flex', gap: 12, overflow: 'auto', flex: 1, padding: '0 20px 20px', alignItems: 'flex-start' }}>
          {stages.map((stage) => {
            const sd = kanbanData[stage.id] || [];
            const sv = sd.reduce((s, d) => s + (d.value || 0), 0);
            return (
              <div key={stage.id} style={{ minWidth: 280, maxWidth: 320, flex: '0 0 280px', background: T.surface2, borderRadius: 12, display: 'flex', flexDirection: 'column', maxHeight: '100%' }}>
                <div style={{ padding: '12px 14px', borderBottom: `2px solid ${stage.color || T.accent}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: stage.color || T.accent }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{stage.name}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: T.text3, background: T.surface, padding: '2px 6px', borderRadius: 10 }}>{sd.length}</span>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, color: T.text2, fontFamily: FM }}>{fmtCurrency(sv)}</span>
                </div>
                <div style={{ flex: 1, overflow: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {sd.map((deal) => (
                    <div key={deal.id} onClick={() => navigate(`/deals/${deal.id}`)} style={{ background: T.surface, borderRadius: 10, padding: 12, border: `1px solid ${T.border}`, cursor: 'pointer', transition: 'all .15s' }}
                      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 4px 12px ${T.shadow}`; }}
                      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 6 }}>{deal.title}</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: T.green, fontFamily: FM, marginBottom: 6 }}>{fmtCurrency(deal.value, (deal.currency as CurrencyCode) || 'EUR')}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: T.text2 }}>{deal.company?.name || '\u2014'}</span>
                        {deal.assignedTo && (
                          <div style={{ width: 24, height: 24, borderRadius: '50%', background: T.accentLt, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: T.accent }}>
                            {deal.assignedTo.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {sd.length === 0 && <div style={{ textAlign: 'center', padding: 20, fontSize: 11, color: T.text3 }}>No deals</div>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ flex: 1, overflow: 'auto', padding: '0 20px 20px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              <th style={thStyle}>Title</th><th style={thStyle}>Value</th><th style={thStyle}>Stage</th>
              <th style={thStyle}>Company</th><th style={thStyle}>Assignee</th><th style={thStyle}>Expected Close</th>
            </tr></thead>
            <tbody>
              {deals.map((d) => (
                <tr key={d.id} onClick={() => navigate(`/deals/${d.id}`)} style={{ cursor: 'pointer', transition: 'background .1s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = T.surface2)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ ...tdStyle, fontWeight: 600, color: T.text }}>{d.title}</td>
                  <td style={{ ...tdStyle, fontWeight: 700, color: T.green, fontFamily: FM }}>{fmtCurrency(d.value, (d.currency as CurrencyCode) || 'EUR')}</td>
                  <td style={tdStyle}>{d.stage ? <Badge text={d.stage.name} color={d.stage.color || T.accent} /> : '\u2014'}</td>
                  <td style={{ ...tdStyle, color: T.text2 }}>{d.company?.name || '\u2014'}</td>
                  <td style={{ ...tdStyle, color: T.text2 }}>{d.assignedTo?.name || '\u2014'}</td>
                  <td style={{ ...tdStyle, color: T.text3, fontSize: 12 }}>{fmtDate(d.expectedCloseDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {deals.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: T.text3 }}>No deals found</div>}
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '16px 0' }}>
              <Btn variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Btn>
              <span style={{ fontSize: 12, color: T.text2 }}>Page {page} of {totalPages}</span>
              <Btn variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Btn>
            </div>
          )}
        </div>
      )}

      {showCreate && (
        <div style={overlayStyle} onClick={() => setShowCreate(false)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: T.text }}>New Deal</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Inp label="Title" value={createForm.title} onChange={(v) => setCreateForm((f) => ({ ...f, title: v }))} placeholder="Deal name..." />
              <div style={{ display: 'flex', gap: 10 }}>
                <Inp label="Value" value={createForm.value} onChange={(v) => setCreateForm((f) => ({ ...f, value: v }))} placeholder="10000" type="number" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 100 }}>
                  <label style={{ fontSize: 10, fontWeight: 600, color: T.text3, textTransform: 'uppercase', letterSpacing: 0.5 }}>Currency</label>
                  <select value={createForm.currency} onChange={(e) => setCreateForm((f) => ({ ...f, currency: e.target.value as CurrencyCode }))} style={selStyle}>
                    {CURRENCY_OPTIONS.map((c) => <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <label style={{ fontSize: 10, fontWeight: 600, color: T.text3, textTransform: 'uppercase', letterSpacing: 0.5 }}>Pipeline</label>
                  <select value={createForm.pipelineId || selPipelineId} onChange={(e) => { const pid = e.target.value; const pl = pipelines.find((p) => p.id === pid); setCreateForm((f) => ({ ...f, pipelineId: pid, stageId: pl?.stages?.[0]?.id || '' })); }} style={selStyle}>
                    {pipelines.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <label style={{ fontSize: 10, fontWeight: 600, color: T.text3, textTransform: 'uppercase', letterSpacing: 0.5 }}>Stage</label>
                  <select value={createForm.stageId} onChange={(e) => setCreateForm((f) => ({ ...f, stageId: e.target.value }))} style={selStyle}>
                    {(pipelines.find((p) => p.id === (createForm.pipelineId || selPipelineId))?.stages || []).sort((a, b) => a.order - b.order).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <Inp label="Expected Close" value={createForm.expectedCloseDate} onChange={(v) => setCreateForm((f) => ({ ...f, expectedCloseDate: v }))} type="date" />
              </div>
              <Inp label="Company (search)" value={createForm.companySearch} onChange={(v) => setCreateForm((f) => ({ ...f, companySearch: v }))} placeholder="Search company..." />
              <Inp label="Contact ID" value={createForm.contactId} onChange={(v) => setCreateForm((f) => ({ ...f, contactId: v }))} placeholder="Contact ID..." />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <Btn variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Btn>
              <Btn onClick={handleCreate} disabled={creating}>{creating ? 'Creating...' : 'Create Deal'}</Btn>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
