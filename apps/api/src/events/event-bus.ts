import { EventEmitter } from 'events';

// All domain events the system can emit
export interface DomainEvents {
  // Contacts
  'contact.created': { tenantId: string; contactId: string; userId: string };
  'contact.updated': { tenantId: string; contactId: string; userId: string; changes: Record<string, unknown> };
  'contact.deleted': { tenantId: string; contactId: string; userId: string };
  'contact.merged': { tenantId: string; survivorId: string; mergedId: string; userId: string };

  // Companies
  'company.created': { tenantId: string; companyId: string; userId: string };
  'company.updated': { tenantId: string; companyId: string; userId: string; changes: Record<string, unknown> };
  'company.deleted': { tenantId: string; companyId: string; userId: string };

  // Deals
  'deal.created': { tenantId: string; dealId: string; userId: string; pipelineId: string };
  'deal.updated': { tenantId: string; dealId: string; userId: string; changes: Record<string, unknown> };
  'deal.stageChanged': { tenantId: string; dealId: string; userId: string; fromStageId: string; toStageId: string; pipelineId: string };
  'deal.won': { tenantId: string; dealId: string; userId: string; value: number };
  'deal.lost': { tenantId: string; dealId: string; userId: string; reason?: string };
  'deal.deleted': { tenantId: string; dealId: string; userId: string };

  // Tasks
  'task.created': { tenantId: string; taskId: string; userId: string; assignedToId?: string };
  'task.completed': { tenantId: string; taskId: string; userId: string };
  'task.overdue': { tenantId: string; taskId: string; assignedToId: string };

  // Activities
  'activity.created': { tenantId: string; activityId: string; userId: string; type: string; contactId?: string; dealId?: string };

  // Email & SMS
  'email.sent': { tenantId: string; messageId: string; userId: string; contactId?: string };
  'email.received': { tenantId: string; messageId: string; contactId?: string };
  'email.opened': { tenantId: string; messageId: string; contactId?: string };
  'sms.sent': { tenantId: string; messageId: string; contactId?: string };
  'sms.received': { tenantId: string; messageId: string; contactId?: string };

  // Workflows
  'workflow.executed': { tenantId: string; workflowId: string; executionId: string; status: string };

  // Users & Auth
  'user.created': { tenantId: string; userId: string; createdBy: string };
  'user.login': { tenantId: string; userId: string; ip?: string };
  'user.loginFailed': { tenantId: string; userId: string; ip?: string };

  // Pipeline
  'pipeline.created': { tenantId: string; pipelineId: string; userId: string };

  // SLA alerts
  'sla.leadUntouched': { tenantId: string; contactId: string; assignedToId: string; hoursSinceCreation: number };
  'sla.dealStagnant': { tenantId: string; dealId: string; assignedToId: string; daysInStage: number };
}

export type DomainEventName = keyof DomainEvents;

class TypedEventBus {
  private emitter = new EventEmitter();

  constructor() {
    // Allow many listeners (one per subscriber module)
    this.emitter.setMaxListeners(50);
  }

  emit<E extends DomainEventName>(event: E, data: DomainEvents[E]): void {
    this.emitter.emit(event, data);
    // Also emit a wildcard for generic listeners (webhooks, audit)
    this.emitter.emit('*', { event, data, timestamp: new Date().toISOString() });
  }

  on<E extends DomainEventName>(event: E, handler: (data: DomainEvents[E]) => void): void {
    this.emitter.on(event, handler);
  }

  onAny(handler: (payload: { event: string; data: unknown; timestamp: string }) => void): void {
    this.emitter.on('*', handler);
  }

  off<E extends DomainEventName>(event: E, handler: (data: DomainEvents[E]) => void): void {
    this.emitter.off(event, handler);
  }

  once<E extends DomainEventName>(event: E, handler: (data: DomainEvents[E]) => void): void {
    this.emitter.once(event, handler);
  }
}

// Singleton
export const eventBus = new TypedEventBus();
