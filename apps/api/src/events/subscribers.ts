import { eventBus } from './event-bus';
import { emitToTenant } from '../socket';
import { WebhookService } from '../modules/webhooks/webhook.service';

const webhookService = new WebhookService();

/**
 * Initialize all event subscribers.
 * Call this once at app startup (after socket.io is initialized).
 */
export function initEventSubscribers(): void {
  // === REAL-TIME SOCKET EVENTS ===
  // Forward domain events to connected frontend clients via socket.io

  eventBus.on('contact.created', (data) => {
    emitToTenant(data.tenantId, 'contact:created', { contactId: data.contactId });
  });

  eventBus.on('contact.updated', (data) => {
    emitToTenant(data.tenantId, 'contact:updated', { contactId: data.contactId, changes: data.changes });
  });

  eventBus.on('contact.deleted', (data) => {
    emitToTenant(data.tenantId, 'contact:deleted', { contactId: data.contactId });
  });

  eventBus.on('company.created', (data) => {
    emitToTenant(data.tenantId, 'company:created', { companyId: data.companyId });
  });

  eventBus.on('company.updated', (data) => {
    emitToTenant(data.tenantId, 'company:updated', { companyId: data.companyId });
  });

  eventBus.on('deal.created', (data) => {
    emitToTenant(data.tenantId, 'deal:created', { dealId: data.dealId, pipelineId: data.pipelineId });
  });

  eventBus.on('deal.updated', (data) => {
    emitToTenant(data.tenantId, 'deal:updated', { dealId: data.dealId });
  });

  eventBus.on('deal.stageChanged', (data) => {
    emitToTenant(data.tenantId, 'deal:stageChanged', {
      dealId: data.dealId,
      fromStageId: data.fromStageId,
      toStageId: data.toStageId,
      pipelineId: data.pipelineId,
    });
  });

  eventBus.on('deal.won', (data) => {
    emitToTenant(data.tenantId, 'deal:won', { dealId: data.dealId, value: data.value });
  });

  eventBus.on('deal.lost', (data) => {
    emitToTenant(data.tenantId, 'deal:lost', { dealId: data.dealId });
  });

  eventBus.on('task.created', (data) => {
    emitToTenant(data.tenantId, 'task:created', { taskId: data.taskId });
  });

  eventBus.on('task.completed', (data) => {
    emitToTenant(data.tenantId, 'task:completed', { taskId: data.taskId });
  });

  eventBus.on('activity.created', (data) => {
    emitToTenant(data.tenantId, 'activity:created', {
      activityId: data.activityId,
      type: data.type,
      contactId: data.contactId,
      dealId: data.dealId,
    });
  });

  eventBus.on('email.received', (data) => {
    emitToTenant(data.tenantId, 'email:received', { messageId: data.messageId, contactId: data.contactId });
  });

  eventBus.on('sms.received', (data) => {
    emitToTenant(data.tenantId, 'sms:received', { messageId: data.messageId, contactId: data.contactId });
  });

  // SLA alerts
  eventBus.on('sla.leadUntouched', (data) => {
    emitToTenant(data.tenantId, 'sla:alert', {
      type: 'lead_untouched',
      contactId: data.contactId,
      assignedToId: data.assignedToId,
      hours: data.hoursSinceCreation,
    });
  });

  eventBus.on('sla.dealStagnant', (data) => {
    emitToTenant(data.tenantId, 'sla:alert', {
      type: 'deal_stagnant',
      dealId: data.dealId,
      assignedToId: data.assignedToId,
      days: data.daysInStage,
    });
  });

  // === WEBHOOK DELIVERY ===
  // Forward all events to webhook subscribers
  eventBus.onAny(async (payload) => {
    try {
      // Extract tenantId from the event data
      const data = payload.data as Record<string, unknown>;
      const tenantId = data?.tenantId as string;
      if (!tenantId) return;

      await webhookService.deliverEvent(tenantId, payload.event, payload.data);
    } catch (err) {
      console.error('Webhook delivery error:', err);
    }
  });

  console.log('[Events] All event subscribers initialized');
}
