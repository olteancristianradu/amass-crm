import { prisma } from '../../config/database';
import { NotFoundError } from '../../utils/errors';

export class GdprService {
  async getConsents(tenantId: string, contactId: string) {
    const contact = await prisma.contact.findFirst({ where: { id: contactId, tenantId } });
    if (!contact) throw new NotFoundError('Contact');

    return prisma.consentRecord.findMany({
      where: { tenantId, contactId },
      orderBy: { grantedAt: 'desc' },
    });
  }

  async grantConsent(tenantId: string, contactId: string, consentType: string, source: string) {
    const contact = await prisma.contact.findFirst({ where: { id: contactId, tenantId } });
    if (!contact) throw new NotFoundError('Contact');

    // Check if already granted (no revokedAt)
    const existing = await prisma.consentRecord.findFirst({
      where: { tenantId, contactId, consentType, revokedAt: null },
    });
    if (existing) {
      return existing; // Already granted, skip
    }

    return prisma.consentRecord.create({
      data: {
        tenant: { connect: { id: tenantId } },
        contact: { connect: { id: contactId } },
        consentType,
        source,
      },
    });
  }

  async revokeConsent(tenantId: string, contactId: string, consentType: string) {
    const contact = await prisma.contact.findFirst({ where: { id: contactId, tenantId } });
    if (!contact) throw new NotFoundError('Contact');

    const active = await prisma.consentRecord.findFirst({
      where: { tenantId, contactId, consentType, revokedAt: null },
    });
    if (!active) throw new NotFoundError('Active consent record');

    return prisma.consentRecord.update({
      where: { id: active.id },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Export ALL data associated with a contact (GDPR data portability)
   */
  async exportContactData(tenantId: string, contactId: string) {
    const contact = await prisma.contact.findFirst({
      where: { id: contactId, tenantId },
      include: {
        company: true,
        assignedTo: { select: { id: true, name: true } },
      },
    });
    if (!contact) throw new NotFoundError('Contact');

    const [deals, activities, tasks, emails, smsMessages, calendarEvents, customFields, consents] = await Promise.all([
      prisma.dealContact.findMany({
        where: { contactId },
        include: { deal: { include: { stage: true, pipeline: true } } },
      }),
      prisma.activity.findMany({ where: { contactId, tenantId }, orderBy: { createdAt: 'desc' } }),
      prisma.task.findMany({ where: { contactId, tenantId } }),
      prisma.emailMessage.findMany({ where: { contactId, tenantId } }),
      prisma.smsMessage.findMany({ where: { contactId, tenantId } }),
      prisma.calendarEvent.findMany({ where: { contactId, tenantId } }),
      prisma.customFieldValue.findMany({
        where: { tenantId, entityType: 'contact', entityId: contactId },
        include: { definition: true },
      }),
      prisma.consentRecord.findMany({ where: { contactId, tenantId } }),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      contact,
      deals: deals.map(dc => dc.deal),
      activities,
      tasks,
      emails,
      smsMessages,
      calendarEvents,
      customFields: customFields.map(cf => ({
        field: cf.definition.fieldLabel,
        value: cf.value,
      })),
      consents,
    };
  }

  /**
   * GDPR Right to Erasure — delete all data associated with a contact.
   * This cascades through all related entities and creates an audit trail.
   */
  async deleteContactData(tenantId: string, contactId: string, requestedBy?: string): Promise<{ deletedEntities: Record<string, number> }> {
    const contact = await prisma.contact.findFirst({
      where: { id: contactId, tenantId },
    });
    if (!contact) throw new NotFoundError('Contact');

    const counts: Record<string, number> = {};

    await prisma.$transaction(async (tx) => {
      // Delete deal contacts (junction table)
      const dealContacts = await tx.dealContact.deleteMany({ where: { contactId } });
      counts.dealContacts = dealContacts.count;

      // Delete activities
      const activities = await tx.activity.deleteMany({ where: { contactId, tenantId } });
      counts.activities = activities.count;

      // Delete tasks
      const tasks = await tx.task.deleteMany({ where: { contactId, tenantId } });
      counts.tasks = tasks.count;

      // Delete email messages
      const emails = await tx.emailMessage.deleteMany({ where: { contactId, tenantId } });
      counts.emails = emails.count;

      // Delete SMS messages
      const sms = await tx.smsMessage.deleteMany({ where: { contactId, tenantId } });
      counts.sms = sms.count;

      // Delete calendar events
      const events = await tx.calendarEvent.deleteMany({ where: { contactId, tenantId } });
      counts.calendarEvents = events.count;

      // Delete custom field values
      const customFields = await tx.customFieldValue.deleteMany({
        where: { tenantId, entityType: 'contact', entityId: contactId },
      });
      counts.customFields = customFields.count;

      // Delete consent records
      const consents = await tx.consentRecord.deleteMany({ where: { contactId, tenantId } });
      counts.consents = consents.count;

      // Finally delete the contact
      await tx.contact.delete({ where: { id: contactId } });
      counts.contact = 1;

      // Create audit log entry for the deletion
      await tx.auditLog.create({
        data: {
          tenantId,
          userId: requestedBy || null,
          action: 'gdpr_deletion',
          entityType: 'contact',
          entityId: contactId,
          metadata: {
            contactName: `${contact.firstName} ${contact.lastName}`,
            contactEmail: contact.email,
            deletedEntities: counts,
          },
          ipAddress: null,
          userAgent: null,
        },
      });
    });

    return { deletedEntities: counts };
  }

  async getConsentReport(tenantId: string) {
    const totalContacts = await prisma.contact.count({ where: { tenantId } });

    const consentTypes = ['marketing_email', 'marketing_sms', 'data_processing', 'profiling'];
    const breakdown: Record<string, { granted: number; revoked: number }> = {};

    for (const consentType of consentTypes) {
      const [granted, revoked] = await Promise.all([
        prisma.consentRecord.count({
          where: { tenantId, consentType, revokedAt: null },
        }),
        prisma.consentRecord.count({
          where: { tenantId, consentType, revokedAt: { not: null } },
        }),
      ]);
      breakdown[consentType] = { granted, revoked };
    }

    // Contacts with at least one active marketing consent (email or sms)
    const contactsWithMarketingConsent = await prisma.consentRecord.groupBy({
      by: ['contactId'],
      where: {
        tenantId,
        consentType: { in: ['marketing_email', 'marketing_sms'] },
        revokedAt: null,
      },
    });

    const withConsent = contactsWithMarketingConsent.length;

    return {
      totalContacts,
      contactsWithMarketingConsent: withConsent,
      contactsWithoutMarketingConsent: totalContacts - withConsent,
      breakdown,
    };
  }
}
