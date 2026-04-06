import { prisma } from '../../config/database';
import { gzipSync, gunzipSync } from 'zlib';

/**
 * Creates a full backup of all tenant data as compressed JSON.
 * Exports contacts, companies, deals (with line items and deal-contact links),
 * activities, tasks, pipelines, pipeline stages, tags, custom field definitions,
 * custom field values, workflows, users (safe fields only), and consent records.
 * @param tenantId - The tenant to back up
 * @returns Compressed backup buffer and metadata including entity counts
 */
export async function createBackup(tenantId: string): Promise<{
  buffer: Buffer;
  size: number;
  metadata: Record<string, unknown>;
}> {
  const [
    contacts,
    companies,
    deals,
    pipelines,
    stages,
    activities,
    tasks,
    tags,
    workflows,
    users,
    customFieldDefs,
    customFieldVals,
    consent,
  ] = await Promise.all([
    prisma.contact.findMany({ where: { tenantId } }),
    prisma.company.findMany({ where: { tenantId } }),
    prisma.deal.findMany({
      where: { tenantId },
      include: { lineItems: true, contacts: true },
    }),
    prisma.pipeline.findMany({ where: { tenantId } }),
    prisma.pipelineStage.findMany({ where: { pipeline: { tenantId } } }),
    prisma.activity.findMany({ where: { tenantId } }),
    prisma.task.findMany({ where: { tenantId } }),
    prisma.tag.findMany({ where: { tenantId } }),
    prisma.workflow.findMany({ where: { tenantId } }),
    prisma.user.findMany({
      where: { tenantId },
      select: { id: true, email: true, name: true, role: true },
    }),
    prisma.customFieldDefinition.findMany({ where: { tenantId } }),
    prisma.customFieldValue.findMany({ where: { tenantId } }),
    prisma.consentRecord.findMany({ where: { tenantId } }),
  ]);

  const data = {
    contacts,
    companies,
    deals,
    pipelines,
    stages,
    activities,
    tasks,
    tags,
    workflows,
    users,
    customFieldDefs,
    customFieldVals,
    consent,
  };

  const backup = {
    version: '1.0',
    tenantId,
    createdAt: new Date().toISOString(),
    data,
  };

  const json = JSON.stringify(backup);
  const compressed = gzipSync(Buffer.from(json));

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId: null,
      action: 'backup.created',
      entityType: 'Backup',
      entityId: backup.createdAt,
      metadata: {
        size: compressed.length,
        entities: {
          contacts: contacts.length,
          companies: companies.length,
          deals: deals.length,
          activities: activities.length,
          tasks: tasks.length,
          pipelines: pipelines.length,
          tags: tags.length,
          workflows: workflows.length,
        },
      },
    },
  });

  return { buffer: compressed, size: compressed.length, metadata: data };
}

/**
 * Lists all backups for a tenant by querying audit log entries
 * where the action is 'backup.created'. Returns the metadata stored
 * in the audit log (entity counts, size, timestamps).
 * @param tenantId - The tenant whose backups to list
 * @returns Array of backup audit log entries sorted by most recent first
 */
export async function listBackups(tenantId: string) {
  const logs = await prisma.auditLog.findMany({
    where: { tenantId, action: 'backup.created' },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      entityId: true,
      metadata: true,
      createdAt: true,
    },
  });

  return logs.map((log) => ({
    id: log.id,
    createdAt: log.entityId,
    metadata: log.metadata,
    logDate: log.createdAt,
  }));
}

/**
 * Restores tenant data from a compressed backup JSON buffer.
 * Validates the backup format and version, then deletes all existing
 * tenant data and re-creates it from the backup within a single
 * database transaction to ensure atomicity.
 *
 * Restoration order respects foreign key constraints:
 * pipelines -> stages -> companies -> contacts -> deals -> deal contacts ->
 * line items -> activities -> tasks -> tags -> custom fields -> workflows -> consent.
 *
 * @param tenantId - The tenant to restore into
 * @param compressedData - Gzip-compressed JSON backup buffer
 * @returns Summary of restored entity counts
 * @throws Error if the backup format is invalid or version is unsupported
 */
export async function restoreBackup(
  tenantId: string,
  compressedData: Buffer
): Promise<Record<string, number>> {
  const json = gunzipSync(compressedData).toString('utf-8');
  const backup = JSON.parse(json);

  if (!backup.version || !backup.data) {
    throw new Error('Invalid backup format: missing version or data');
  }

  if (backup.version !== '1.0') {
    throw new Error(`Unsupported backup version: ${backup.version}`);
  }

  const d = backup.data;

  const counts = await prisma.$transaction(async (tx) => {
    // Delete existing data in reverse dependency order
    await tx.consentRecord.deleteMany({ where: { tenantId } });
    await tx.customFieldValue.deleteMany({ where: { tenantId } });
    await tx.customFieldDefinition.deleteMany({ where: { tenantId } });
    await tx.workflow.deleteMany({ where: { tenantId } });
    await tx.tag.deleteMany({ where: { tenantId } });
    await tx.activity.deleteMany({ where: { tenantId } });
    await tx.task.deleteMany({ where: { tenantId } });
    await tx.deal.deleteMany({ where: { tenantId } });
    await tx.contact.deleteMany({ where: { tenantId } });
    await tx.company.deleteMany({ where: { tenantId } });
    await tx.pipeline.deleteMany({ where: { tenantId } });

    // Restore pipelines
    for (const p of d.pipelines ?? []) {
      await tx.pipeline.create({ data: { ...p, tenantId } });
    }

    // Restore stages
    for (const s of d.stages ?? []) {
      await tx.pipelineStage.create({ data: s });
    }

    // Restore companies
    for (const c of d.companies ?? []) {
      await tx.company.create({ data: { ...c, tenantId } });
    }

    // Restore contacts
    for (const c of d.contacts ?? []) {
      await tx.contact.create({ data: { ...c, tenantId } });
    }

    // Restore deals (without nested relations)
    for (const deal of d.deals ?? []) {
      const { contacts: _dc, lineItems: _li, ...dealData } = deal;
      await tx.deal.create({ data: { ...dealData, tenantId } });
    }

    // Restore deal contacts
    for (const deal of d.deals ?? []) {
      for (const dc of deal.contacts ?? []) {
        await tx.dealContact.create({ data: dc });
      }
    }

    // Restore deal line items
    for (const deal of d.deals ?? []) {
      for (const li of deal.lineItems ?? []) {
        await tx.dealLineItem.create({ data: li });
      }
    }

    // Restore activities
    for (const a of d.activities ?? []) {
      await tx.activity.create({ data: { ...a, tenantId } });
    }

    // Restore tasks
    for (const t of d.tasks ?? []) {
      await tx.task.create({ data: { ...t, tenantId } });
    }

    // Restore tags
    for (const t of d.tags ?? []) {
      await tx.tag.create({ data: { ...t, tenantId } });
    }

    // Restore custom field definitions
    for (const cfd of d.customFieldDefs ?? []) {
      await tx.customFieldDefinition.create({ data: { ...cfd, tenantId } });
    }

    // Restore custom field values
    for (const cfv of d.customFieldVals ?? []) {
      await tx.customFieldValue.create({ data: { ...cfv, tenantId } });
    }

    // Restore workflows
    for (const w of d.workflows ?? []) {
      await tx.workflow.create({ data: { ...w, tenantId } });
    }

    // Restore consent records
    for (const cr of d.consent ?? []) {
      await tx.consentRecord.create({ data: { ...cr, tenantId } });
    }

    return {
      pipelines: (d.pipelines ?? []).length,
      stages: (d.stages ?? []).length,
      companies: (d.companies ?? []).length,
      contacts: (d.contacts ?? []).length,
      deals: (d.deals ?? []).length,
      activities: (d.activities ?? []).length,
      tasks: (d.tasks ?? []).length,
      tags: (d.tags ?? []).length,
      workflows: (d.workflows ?? []).length,
      customFieldDefs: (d.customFieldDefs ?? []).length,
      customFieldVals: (d.customFieldVals ?? []).length,
      consent: (d.consent ?? []).length,
    };
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId: null,
      action: 'backup.restored',
      entityType: 'Backup',
      entityId: new Date().toISOString(),
      metadata: { counts },
    },
  });

  return counts;
}
