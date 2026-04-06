import { useState, useEffect, useCallback, CSSProperties } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { T } from '@/styles/tokens';
import {
  STAGES, STAGE_COLORS, TRASEU, T2_STEPS, T3_STEPS,
  SISTEME, CONECTAT, CONSTRUCTIE, IZOLATIE, NIVEL_BANI,
  TIPOLOGII, LOSS_REASONS, TEMPLATES,
  fmtDate, calcScore, getNextAction,
} from '@amass/shared';
import type { Client, Stage, ScriptStep } from '@amass/shared';
import { Btn } from '@/components/ui/Btn';
import { Inp } from '@/components/ui/Inp';
import { Badge } from '@/components/ui/Badge';
import { ScoreBadge, ScoreBar } from '@/components/ui/ScoreBadge';
import { Toast } from '@/components/ui/Toast';
import * as clientService from '@/services/client.service';

function StepView({ steps, currentStep, checks, notes, onCheck, onNote }: {
  steps: ScriptStep[];
  currentStep: number;
  checks: Record<string, boolean>;
  notes: Record<string, string>;
  onCheck: (id: number, val: boolean) => void;
  onNote: (id: number, val: string) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {steps.map(step => {
        const isActive = step.id === currentStep + 1;
        const isDone = checks[String(step.id)];
        return (
          <div
            key={step.id}
            style={{
              padding: '10px 12px', borderRadius: 8,
              border: `1px solid ${isActive ? 'var(--accent)' : T.border}`,
              background: isDone ? T.greenLt : isActive ? T.accentLt : T.surface2,
              transition: 'all .15s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <input
                type="checkbox"
                checked={!!isDone}
                onChange={e => onCheck(step.id, e.target.checked)}
                style={{ accentColor: 'var(--accent)' }}
              />
              <span style={{ fontSize: 11, fontWeight: 700, color: isDone ? T.green : T.text }}>
                {step.id}. {step.short}
              </span>
            </div>
            <div style={{ fontSize: 11, color: T.text2, marginBottom: 6, paddingLeft: 24 }}>{step.full}</div>
            <textarea
              value={notes[String(step.id)] || ''}
              onChange={e => onNote(step.id, e.target.value)}
              placeholder="Note..."
              rows={2}
              style={{
                width: '100%', padding: '6px 8px', borderRadius: 6,
                border: `1px solid ${T.border}`, background: T.surface,
                color: T.text, fontSize: 11, resize: 'vertical',
                marginLeft: 24, maxWidth: 'calc(100% - 24px)',
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

export function ClientPage() {
  const { id: clientId = '' } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [activeTab, setActiveTab] = useState<'T1' | 'T2' | 'T3'>('T1');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    clientService.getClient(clientId).then(setClient).catch(console.error);
  }, [clientId]);

  const save = useCallback(async (data: Record<string, unknown>) => {
    if (!client) return;
    setSaving(true);
    try {
      const updated = await clientService.updateClient(client.id, data);
      setClient(prev => prev ? { ...prev, ...updated } : updated);
      setToast({ msg: 'Salvat', type: 'success' });
    } catch {
      setToast({ msg: 'Eroare la salvare', type: 'error' });
    } finally {
      setSaving(false);
    }
  }, [client]);

  if (!client) {
    return <div style={{ padding: 40, textAlign: 'center', color: T.text2 }}>Se incarca...</div>;
  }

  const score = calcScore(client);
  const action = getNextAction(client);
  const stageColor = STAGE_COLORS[client.stage as Stage] || '#6B7280';

  const page: CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column' };
  const content: CSSProperties = { flex: 1, overflow: 'auto', padding: 20 };
  const section: CSSProperties = {
    background: T.surface, borderRadius: 12, padding: 16,
    border: `1px solid ${T.border}`, marginBottom: 16,
  };

  const stepsMap = { T1: TRASEU, T2: T2_STEPS, T3: T3_STEPS };
  const stepKey = activeTab.toLowerCase() as 'T1' | 'T2' | 'T3';
  const checksKey = `${activeTab.toLowerCase()}Checks` as keyof Client;
  const notesKey = `${activeTab.toLowerCase()}Notes` as keyof Client;
  const stepNumKey = `${activeTab.toLowerCase()}Step` as keyof Client;

  return (
    <div style={page}>
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={() => navigate('/pipeline')}
          style={{ background: 'transparent', border: 'none', color: T.text2, cursor: 'pointer', fontSize: 12 }}
        >
          &larr; Pipeline
        </button>
        <h2 style={{ margin: 0, fontSize: 16, color: T.text }}>{client.name || 'Client'}</h2>
      </div>

      <div style={content}>
        {/* Client header */}
        <div style={{ ...section, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 18, fontWeight: 700 }}>{client.name || 'Fara nume'}</span>
              <Badge text={client.stage} color={stageColor} />
            </div>
            <div style={{ fontSize: 12, color: T.text2, display: 'flex', gap: 16 }}>
              {client.phone && <span>{client.phone}</span>}
              {client.location && <span>{client.location}</span>}
              {client.area && <span>{client.area} mp</span>}
            </div>
            <div style={{ fontSize: 11, color: stageColor, fontWeight: 600, marginTop: 4 }}>{action}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <ScoreBadge score={score} />
            <ScoreBar score={score} style={{ width: 80 }} />
          </div>
        </div>

        {/* Quick info edit */}
        <div style={{ ...section }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Informatii</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
            <Inp label="Nume" value={client.name} onChange={v => save({ name: v })} />
            <Inp label="Telefon" value={client.phone} onChange={v => save({ phone: v })} />
            <Inp label="Email" value={client.email} onChange={v => save({ email: v })} />
            <Inp label="Localitate" value={client.location} onChange={v => save({ location: v })} />
            <Inp label="Suprafata (mp)" value={client.area} onChange={v => save({ area: v })} />
            <Inp label="Etaje" value={client.floors} onChange={v => save({ floors: v })} />
          </div>
        </div>

        {/* Stage controls */}
        <div style={{ ...section }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Etapa</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {STAGES.map(s => (
              <Btn
                key={s}
                variant={client.stage === s ? 'primary' : 'ghost'}
                size="sm"
                style={client.stage === s ? { background: STAGE_COLORS[s] } : {}}
                onClick={async () => {
                  if (s === client.stage) return;
                  try {
                    const updated = await clientService.moveClientStage(client.id, s);
                    setClient(prev => prev ? { ...prev, ...updated } : null);
                    setToast({ msg: `Mutat in ${s}`, type: 'success' });
                  } catch {
                    setToast({ msg: 'Eroare', type: 'error' });
                  }
                }}
              >
                {s}
              </Btn>
            ))}
          </div>
        </div>

        {/* Typology */}
        <div style={{ ...section }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Tipologie client</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {TIPOLOGII.map(tip => (
              <button
                key={tip.id}
                onClick={() => save({ primaryType: tip.id })}
                style={{
                  padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                  border: `1px solid ${client.primaryType === tip.id ? tip.color : T.border}`,
                  background: client.primaryType === tip.id ? tip.color + '22' : T.surface2,
                  color: client.primaryType === tip.id ? tip.color : T.text2,
                  cursor: 'pointer', transition: 'all .15s',
                }}
              >
                {tip.icon} {tip.name}
              </button>
            ))}
          </div>
          {client.primaryType && (
            <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 8, background: T.surface2, fontSize: 11, color: T.text2, fontStyle: 'italic' }}>
              &ldquo;{TIPOLOGII.find(t => t.id === client.primaryType)?.replica}&rdquo;
            </div>
          )}
        </div>

        {/* Script tabs */}
        <div style={{ ...section }}>
          <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
            {(['T1', 'T2', 'T3'] as const).map(tab => (
              <Btn
                key={tab}
                variant={activeTab === tab ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab(tab)}
              >
                Traseu {tab}
              </Btn>
            ))}
          </div>

          <StepView
            steps={stepsMap[activeTab]}
            currentStep={(client[stepNumKey] as number) || 0}
            checks={(client[checksKey] as Record<string, boolean>) || {}}
            notes={(client[notesKey] as Record<string, string>) || {}}
            onCheck={(id, val) => {
              const updated = { ...((client[checksKey] as Record<string, boolean>) || {}), [String(id)]: val };
              const maxStep = Math.max(...Object.entries(updated).filter(([, v]) => v).map(([k]) => parseInt(k)), 0);
              save({ [checksKey]: updated, [stepNumKey]: maxStep });
            }}
            onNote={(id, val) => {
              const updated = { ...((client[notesKey] as Record<string, string>) || {}), [String(id)]: val };
              save({ [notesKey]: updated });
            }}
          />
        </div>

        {/* Message templates */}
        <div style={{ ...section }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Template mesaj</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {Object.entries(TEMPLATES).map(([key, tpl]) => {
              const rendered = tpl
                .replace('{nume}', client.name)
                .replace('{locatie}', client.location)
                .replace('{suprafata}', client.area ? `${client.area}mp` : '');
              return (
                <button
                  key={key}
                  onClick={() => {
                    navigator.clipboard.writeText(rendered);
                    setToast({ msg: 'Copiat!', type: 'success' });
                  }}
                  style={{
                    padding: '8px 12px', borderRadius: 8, fontSize: 11,
                    border: `1px solid ${T.border}`, background: T.surface2,
                    color: T.text2, cursor: 'pointer', textAlign: 'left', maxWidth: 300,
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>{key}</div>
                  <div style={{ fontSize: 10, color: T.text3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {rendered.slice(0, 80)}...
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Delete */}
        <div style={{ textAlign: 'right', padding: '16px 0' }}>
          <Btn
            variant="danger"
            onClick={async () => {
              if (!confirm('Sterge clientul?')) return;
              await clientService.deleteClient(client.id);
              navigate('/pipeline');
            }}
          >
            Sterge client
          </Btn>
        </div>
      </div>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
