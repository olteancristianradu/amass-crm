import { CSSProperties } from 'react';
import { T } from '@/styles/tokens';
import { STAGE_COLORS, fmtDate, calcScore, getNextAction } from '@amass/shared';
import type { Client, Stage } from '@amass/shared';
import { ScoreBadge } from '../ui/ScoreBadge';

interface KanbanCardProps {
  client: Client;
  onClick: () => void;
}

export function KanbanCard({ client, onClick }: KanbanCardProps) {
  const score = calcScore(client);
  const action = getNextAction(client);
  const stageColor = STAGE_COLORS[client.stage as Stage] || '#6B7280';

  const card: CSSProperties = {
    background: T.surface,
    borderRadius: 10,
    padding: 12,
    border: `1px solid ${T.border}`,
    cursor: 'pointer',
    transition: 'all .15s',
    animation: 'fadeIn .2s ease',
  };

  return (
    <div style={card} className="card-hover" onClick={onClick}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: T.text }}>{client.name || 'Fara nume'}</div>
        <ScoreBadge score={score} />
      </div>

      {client.location && (
        <div style={{ fontSize: 11, color: T.text2, marginBottom: 4 }}>
          {client.location}
        </div>
      )}

      {client.phone && (
        <div style={{ fontSize: 11, color: T.text3, marginBottom: 6 }}>
          {client.phone}
        </div>
      )}

      <div style={{ fontSize: 10, color: stageColor, fontWeight: 600, marginBottom: 4 }}>
        {action}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 10, color: T.text3 }}>
          {fmtDate(client.updatedAt)}
        </div>
        {client.hasSolarPanels && <span style={{ fontSize: 12 }} title="Are panouri">&#9728;</span>}
      </div>
    </div>
  );
}
