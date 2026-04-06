import { CSSProperties } from 'react';
import { T } from '@/styles/tokens';
import { STAGES, STAGE_COLORS } from '@amass/shared';
import type { Client, Stage } from '@amass/shared';
import { KanbanCard } from './KanbanCard';

interface KanbanBoardProps {
  clients: Client[];
  onSelectClient: (client: Client) => void;
  onMoveStage?: (clientId: string, newStage: Stage) => void;
}

export function KanbanBoard({ clients, onSelectClient, onMoveStage }: KanbanBoardProps) {
  const board: CSSProperties = {
    display: 'flex',
    gap: 12,
    overflowX: 'auto',
    padding: '0 4px 12px 4px',
    flex: 1,
    minHeight: 0,
  };

  const handleDrop = (e: React.DragEvent, stage: Stage) => {
    e.preventDefault();
    const clientId = e.dataTransfer.getData('clientId');
    if (clientId && onMoveStage) {
      onMoveStage(clientId, stage);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div style={board}>
      {STAGES.map(stage => {
        const stageClients = clients.filter(c => c.stage === stage);
        const color = STAGE_COLORS[stage];

        const column: CSSProperties = {
          minWidth: 240,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        };

        const header: CSSProperties = {
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 0',
          borderBottom: `2px solid ${color}`,
          marginBottom: 4,
        };

        return (
          <div
            key={stage}
            style={column}
            onDrop={e => handleDrop(e, stage)}
            onDragOver={handleDragOver}
          >
            <div style={header}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{stage}</span>
              <span style={{ fontSize: 11, color: T.text3, marginLeft: 'auto' }}>{stageClients.length}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto', flex: 1 }}>
              {stageClients.map(client => (
                <div
                  key={client.id}
                  draggable
                  onDragStart={e => {
                    e.dataTransfer.setData('clientId', client.id);
                  }}
                >
                  <KanbanCard client={client} onClick={() => onSelectClient(client)} />
                </div>
              ))}
              {stageClients.length === 0 && (
                <div style={{ padding: 16, textAlign: 'center', color: T.text3, fontSize: 11 }}>
                  Niciun client
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
