import { prisma } from '../../config/database';
import crypto from 'crypto';

/**
 * Generates a new CUID-like identifier for remapping entity IDs.
 * Uses crypto.randomBytes for uniqueness.
 * @returns A random string suitable for use as a database ID
 */
function newId(): string {
  return crypto.randomBytes(12).toString('hex');
}

/**
 * Creates a sandbox copy of a production tenant.
 * Clones the tenant record (marked as sandbox via settings), then copies
 * the first 100 contacts, all pipelines and stages, all companies,
 * the first 50 deals, and all tags. Foreign key IDs are remapped to
 * new generated IDs to avoid conflicts with the source tenant.
 *
 * @param sourceTenantId - The production tenant to clone
 * @returns The newly created sandbox tenant information
 * @throws Error if the source tenant does not exist
 */
export async function createSandbox(sourceTenantId: string): Promise<{
  id: string;
  name: string;
  slug: string;
}> {
  const sourceTenant = await prisma.tenant.findUnique({
    where: { id: sourceTenantId },
  });

  if (!sourceTenant) {
    throw new Error('Source tenant not found');
  }

  const sandboxId = newId();
  const sandboxSlug = `${sourceTenant.slug}-sandbox-${Date.now()}`;

  // Create the sandbox tenant
  const sandboxTenant = await prisma.tenant.create({
    data: {
      id: sandboxId,
      name: `${sourceTenant.name} (Sandbox)`,
      slug: sandboxSlug,
      plan: sourceTenant.plan,
      defaultCurrency: sourceTenant.defaultCurrency,
      settings: {
        sandbox: true,
        parentTenantId: sourceTenantId,
        createdAt: new Date().toISOString(),
      },
    },
  });

  // Build ID mapping tables
  const pipelineIdMap = new Map<string, string>();
  const stageIdMap = new Map<string, string>();
  const companyIdMap = new Map<string, string>();
  const contactIdMap = new Map<string, string>();

  // Clone pipelines
  const pipelines = await prisma.pipeline.findMany({
    where: { tenantId: sourceTenantId },
  });
  for (const p of pipelines) {
    const pid = newId();
    pipelineIdMap.set(p.id, pid);
    await prisma.pipeline.create({
      data: {
        id: pid,
        tenantId: sandboxId,
        name: p.name,
        isDefault: p.isDefault,
        sortOrder: p.sortOrder,
      },
    });
  }

  // Clone pipeline stages
  const stages = await prisma.pipelineStage.findMany({
    where: { pipeline: { tenantId: sourceTenantId } },
  });
  for (const s of stages) {
    const sid = newId();
    stageIdMap.set(s.id, sid);
    const mappedPipelineId = pipelineIdMap.get(s.pipelineId);
    if (mappedPipelineId) {
      await prisma.pipelineStage.create({
        data: {
          id: sid,
          pipelineId: mappedPipelineId,
          name: s.name,
          sortOrder: s.sortOrder,
          probability: s.probability,
          color: s.color,
          isWon: s.isWon,
          isLost: s.isLost,
          rottingDays: s.rottingDays,
        },
      });
    }
  }

  // Clone companies
  const companies = await prisma.company.findMany({
    where: { tenantId: sourceTenantId },
  });
  for (const c of companies) {
    const cid = newId();
    companyIdMap.set(c.id, cid);
    await prisma.company.create({
      data: {
        id: cid,
        tenantId: sandboxId,
        name: c.name,
        domain: c.domain,
        industry: c.industry,
        size: c.size,
        phone: c.phone,
        email: c.email,
        website: c.website,
        address: c.address,
        city: c.city,
        country: c.country,
        notes: c.notes,
        tags: c.tags,
      },
    });
  }

  // Clone first 100 contacts
  const contacts = await prisma.contact.findMany({
    where: { tenantId: sourceTenantId },
    take: 100,
    orderBy: { createdAt: 'desc' },
  });
  for (const c of contacts) {
    const cid = newId();
    contactIdMap.set(c.id, cid);
    await prisma.contact.create({
      data: {
        id: cid,
        tenantId: sandboxId,
        companyId: c.companyId ? companyIdMap.get(c.companyId) ?? null : null,
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        phone: c.phone,
        mobile: c.mobile,
        jobTitle: c.jobTitle,
        source: c.source,
        tags: c.tags,
        score: c.score,
      },
    });
  }

  // Clone first 50 deals
  const deals = await prisma.deal.findMany({
    where: { tenantId: sourceTenantId },
    take: 50,
    orderBy: { createdAt: 'desc' },
  });
  for (const d of deals) {
    const mappedPipelineId = pipelineIdMap.get(d.pipelineId);
    const mappedStageId = stageIdMap.get(d.stageId);
    if (mappedPipelineId && mappedStageId) {
      await prisma.deal.create({
        data: {
          id: newId(),
          tenantId: sandboxId,
          pipelineId: mappedPipelineId,
          stageId: mappedStageId,
          companyId: d.companyId ? companyIdMap.get(d.companyId) ?? null : null,
          title: d.title,
          value: d.value,
          currency: d.currency,
          probability: d.probability,
          expectedCloseDate: d.expectedCloseDate,
          source: d.source,
          notes: d.notes,
          tags: d.tags,
        },
      });
    }
  }

  // Clone tags
  const tags = await prisma.tag.findMany({
    where: { tenantId: sourceTenantId },
  });
  for (const t of tags) {
    await prisma.tag.create({
      data: {
        id: newId(),
        tenantId: sandboxId,
        name: t.name,
        color: t.color,
        entityType: t.entityType,
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      tenantId: sourceTenantId,
      userId: null,
      action: 'sandbox.created',
      entityType: 'Tenant',
      entityId: sandboxId,
      metadata: {
        sandboxSlug,
        pipelines: pipelines.length,
        companies: companies.length,
        contacts: contacts.length,
        deals: deals.length,
        tags: tags.length,
      },
    },
  });

  return { id: sandboxTenant.id, name: sandboxTenant.name, slug: sandboxTenant.slug };
}

/**
 * Seeds a tenant with realistic demo data for testing purposes.
 * Creates 3 pipelines with stages, 50 contacts, 20 companies,
 * 30 deals distributed across pipelines, and 100 activities.
 * Uses realistic Romanian and international business names.
 *
 * @param tenantId - The tenant to seed with demo data
 * @returns Summary of seeded entity counts
 */
export async function seedDemoData(tenantId: string): Promise<Record<string, number>> {
  const companyNames = [
    'SC Electronica SRL', 'TechVision Romania', 'Carpat Solar Energy',
    'Digital Solutions SA', 'Green Power SRL', 'Danube Consulting',
    'Transylvania Tech', 'Moldavia Imports', 'Oltenia Manufacturing',
    'Banat Logistics', 'Bucharest Dynamics', 'Constanta Shipping',
    'Iasi Software House', 'Cluj Innovation Lab', 'Timisoara Ventures',
    'Brasov Machinery', 'Sibiu Analytics', 'Oradea Textiles',
    'Craiova Steel Works', 'Ploiesti Energy Corp',
  ];

  const firstNames = [
    'Andrei', 'Maria', 'Ion', 'Elena', 'Alexandru', 'Ana', 'Mihai', 'Ioana',
    'Stefan', 'Cristina', 'Daniel', 'Laura', 'Adrian', 'Gabriela', 'Razvan',
    'Diana', 'Bogdan', 'Alina', 'Florin', 'Simona', 'Vlad', 'Madalina',
    'Catalin', 'Raluca', 'George',
  ];

  const lastNames = [
    'Popescu', 'Ionescu', 'Popa', 'Dumitru', 'Stan', 'Gheorghe', 'Stoica',
    'Ciobanu', 'Rusu', 'Marin', 'Tudor', 'Moldovan', 'Matei', 'Barbu',
    'Nistor', 'Dragomir', 'Pavel', 'Lazar', 'Radu', 'Constantin', 'Neagu',
    'Dinu', 'Oprea', 'Ene', 'Manea',
  ];

  // Create 20 companies
  const createdCompanies: string[] = [];
  for (let i = 0; i < 20; i++) {
    const c = await prisma.company.create({
      data: {
        tenantId,
        name: companyNames[i],
        domain: `${companyNames[i].toLowerCase().replace(/\s+/g, '').replace(/[^a-z]/g, '')}.ro`,
        industry: ['Technology', 'Energy', 'Manufacturing', 'Consulting', 'Logistics'][i % 5],
        size: ['1-10', '11-50', '51-200', '201-500', '500+'][i % 5],
        phone: `+4021${String(3000000 + i * 1000).padStart(7, '0')}`,
        email: `office@${companyNames[i].toLowerCase().replace(/\s+/g, '').replace(/[^a-z]/g, '')}.ro`,
        city: ['Bucuresti', 'Cluj-Napoca', 'Timisoara', 'Iasi', 'Brasov'][i % 5],
        country: 'RO',
      },
    });
    createdCompanies.push(c.id);
  }

  // Create 50 contacts
  const createdContacts: string[] = [];
  for (let i = 0; i < 50; i++) {
    const fn = firstNames[i % firstNames.length];
    const ln = lastNames[i % lastNames.length];
    const c = await prisma.contact.create({
      data: {
        tenantId,
        companyId: createdCompanies[i % createdCompanies.length],
        firstName: fn,
        lastName: ln,
        email: `${fn.toLowerCase()}.${ln.toLowerCase()}@example.ro`,
        phone: `+4072${String(1000000 + i * 1000).padStart(7, '0')}`,
        jobTitle: ['CEO', 'CTO', 'Manager', 'Director', 'Engineer'][i % 5],
        source: ['website', 'referral', 'linkedin', 'cold-call', 'event'][i % 5],
        score: Math.floor(Math.random() * 100),
      },
    });
    createdContacts.push(c.id);
  }

  // Create 3 pipelines with stages
  const pipelineConfigs = [
    {
      name: 'Sales Pipeline',
      stages: ['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'],
    },
    {
      name: 'Partnership Pipeline',
      stages: ['Initial Contact', 'Evaluation', 'Due Diligence', 'Agreement', 'Active Partner'],
    },
    {
      name: 'Enterprise Pipeline',
      stages: ['Discovery', 'Solution Design', 'Pilot', 'Executive Review', 'Procurement', 'Onboarding'],
    },
  ];

  const pipelineIds: string[] = [];
  const stageIds: string[] = [];

  for (let pi = 0; pi < pipelineConfigs.length; pi++) {
    const pc = pipelineConfigs[pi];
    const pipeline = await prisma.pipeline.create({
      data: {
        tenantId,
        name: pc.name,
        isDefault: pi === 0,
        sortOrder: pi,
      },
    });
    pipelineIds.push(pipeline.id);

    for (let si = 0; si < pc.stages.length; si++) {
      const stageName = pc.stages[si];
      const isWon = stageName.toLowerCase().includes('won') || stageName === 'Active Partner' || stageName === 'Onboarding';
      const isLost = stageName.toLowerCase().includes('lost');
      const stage = await prisma.pipelineStage.create({
        data: {
          pipelineId: pipeline.id,
          name: stageName,
          sortOrder: si,
          probability: Math.min(Math.round(((si + 1) / pc.stages.length) * 100), 100),
          isWon,
          isLost,
        },
      });
      stageIds.push(stage.id);
    }
  }

  // Fetch all stages for deal assignment
  const allStages = await prisma.pipelineStage.findMany({
    where: { pipeline: { tenantId } },
    include: { pipeline: true },
  });

  // Create 30 deals
  for (let i = 0; i < 30; i++) {
    const pIdx = i % pipelineIds.length;
    const pipelineId = pipelineIds[pIdx];
    const pipelineStages = allStages.filter((s) => s.pipelineId === pipelineId);
    const stage = pipelineStages[i % pipelineStages.length];

    await prisma.deal.create({
      data: {
        tenantId,
        pipelineId,
        stageId: stage.id,
        companyId: createdCompanies[i % createdCompanies.length],
        title: `Deal #${i + 1} - ${companyNames[i % companyNames.length]}`,
        value: Math.floor(Math.random() * 50000) + 1000,
        currency: 'EUR',
        probability: stage.probability,
        expectedCloseDate: new Date(Date.now() + (i + 1) * 7 * 24 * 60 * 60 * 1000),
        source: ['website', 'referral', 'partner', 'outbound', 'event'][i % 5],
        tags: [],
      },
    });
  }

  // Create 100 activities (need a user)
  const users = await prisma.user.findMany({
    where: { tenantId },
    take: 1,
  });

  let activitiesCreated = 0;
  if (users.length > 0) {
    const userId = users[0].id;
    const activityTypes = ['call', 'email', 'meeting', 'note', 'task'];
    for (let i = 0; i < 100; i++) {
      await prisma.activity.create({
        data: {
          tenantId,
          userId,
          contactId: createdContacts[i % createdContacts.length],
          type: activityTypes[i % activityTypes.length],
          subject: `${activityTypes[i % activityTypes.length]} with ${firstNames[i % firstNames.length]} ${lastNames[i % lastNames.length]}`,
          body: `Demo activity #${i + 1} created during sandbox seeding.`,
          createdAt: new Date(Date.now() - Math.floor(Math.random() * 90 * 24 * 60 * 60 * 1000)),
        },
      });
      activitiesCreated++;
    }
  }

  return {
    companies: 20,
    contacts: 50,
    pipelines: 3,
    deals: 30,
    activities: activitiesCreated,
  };
}

/**
 * Deletes a sandbox tenant and ALL its associated data.
 * Cascading deletes are handled by the database foreign key constraints.
 * Only works on tenants whose settings JSON contains sandbox: true.
 *
 * @param sandboxTenantId - The sandbox tenant ID to delete
 * @throws Error if the tenant is not found or is not a sandbox tenant
 */
export async function deleteSandbox(sandboxTenantId: string): Promise<void> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: sandboxTenantId },
  });

  if (!tenant) {
    throw new Error('Sandbox tenant not found');
  }

  const settings = tenant.settings as Record<string, unknown>;
  if (!settings || settings.sandbox !== true) {
    throw new Error('Tenant is not a sandbox. Deletion refused for safety.');
  }

  // Delete the tenant; cascade constraints handle all related data
  await prisma.tenant.delete({ where: { id: sandboxTenantId } });
}

/**
 * Lists all sandbox tenants created from a given parent tenant.
 * Finds tenants whose settings JSON contains the parentTenantId reference.
 *
 * @param parentTenantId - The parent production tenant ID
 * @returns Array of sandbox tenant summaries (id, name, slug, createdAt)
 */
export async function listSandboxes(parentTenantId: string) {
  // Prisma JSON filtering: find tenants where settings.parentTenantId matches
  const sandboxes = await prisma.tenant.findMany({
    where: {
      settings: {
        path: ['parentTenantId'],
        equals: parentTenantId,
      },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      createdAt: true,
      settings: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return sandboxes;
}
