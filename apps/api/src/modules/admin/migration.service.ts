import { prisma } from '../../config/database';

/** Column mapping from CSV headers to Contact fields. */
interface ColumnMapping {
  [csvHeader: string]: string;
}

/** Shape of a contact for JSON import. */
interface ContactImport {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  jobTitle?: string;
  source?: string;
  tags?: string[];
  score?: number;
}

/**
 * Parses CSV content and creates contacts using the provided column mapping.
 * Splits on newlines, uses the first row as headers, then maps each
 * subsequent row's values to Contact fields via the mapping object.
 * Creates contacts in batches using Prisma transactions.
 *
 * @param tenantId - The tenant to import contacts into
 * @param csvContent - Raw CSV string content
 * @param columnMapping - Map of CSV header names to Contact field names
 * @returns Count of imported contacts
 */
export async function importContactsCsv(
  tenantId: string,
  csvContent: string,
  columnMapping: ColumnMapping,
): Promise<{ imported: number }> {
  const lines = csvContent.split('\n').filter((line) => line.trim().length > 0);
  if (lines.length < 2) {
    return { imported: 0 };
  }

  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  const contacts: Record<string, unknown>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
    const contact: Record<string, unknown> = { tenantId };

    for (let j = 0; j < headers.length; j++) {
      const mappedField = columnMapping[headers[j]];
      if (mappedField && values[j]) {
        if (mappedField === 'score') {
          contact[mappedField] = parseInt(values[j], 10) || 0;
        } else if (mappedField === 'tags') {
          contact[mappedField] = values[j].split(';').map((t) => t.trim());
        } else {
          contact[mappedField] = values[j];
        }
      }
    }

    contacts.push(contact);
  }

  // Batch create in transaction
  const BATCH_SIZE = 100;
  let imported = 0;

  for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
    const batch = contacts.slice(i, i + BATCH_SIZE);
    await prisma.$transaction(
      batch.map((c) =>
        prisma.contact.create({ data: c as Parameters<typeof prisma.contact.create>[0]['data'] }),
      ),
    );
    imported += batch.length;
  }

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId: null,
      action: 'migration.import.csv',
      entityType: 'Contact',
      entityId: null,
      metadata: { imported },
    },
  });

  return { imported };
}

/**
 * Imports contacts from a JSON array.
 * Each object in the array maps directly to Contact creation fields.
 *
 * @param tenantId - The tenant to import contacts into
 * @param contacts - Array of contact objects
 * @returns Count of imported contacts
 */
export async function importContactsJson(
  tenantId: string,
  contacts: ContactImport[],
): Promise<{ imported: number }> {
  const BATCH_SIZE = 100;
  let imported = 0;

  for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
    const batch = contacts.slice(i, i + BATCH_SIZE);
    await prisma.$transaction(
      batch.map((c) =>
        prisma.contact.create({
          data: {
            tenantId,
            firstName: c.firstName ?? '',
            lastName: c.lastName ?? '',
            email: c.email ?? '',
            phone: c.phone ?? '',
            mobile: c.mobile ?? '',
            jobTitle: c.jobTitle ?? '',
            source: c.source ?? 'import',
            tags: c.tags ?? [],
            score: c.score ?? 0,
          },
        }),
      ),
    );
    imported += batch.length;
  }

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId: null,
      action: 'migration.import.json',
      entityType: 'Contact',
      entityId: null,
      metadata: { imported },
    },
  });

  return { imported };
}

/**
 * Exports all tenant data as a JSON object.
 * Includes contacts, companies, deals, activities, tasks, and pipelines.
 *
 * @param tenantId - The tenant whose data to export
 * @returns JSON object with all entity arrays
 */
export async function exportAllData(tenantId: string): Promise<Record<string, unknown>> {
  const [contacts, companies, deals, activities, tasks, pipelines] = await Promise.all([
    prisma.contact.findMany({ where: { tenantId } }),
    prisma.company.findMany({ where: { tenantId } }),
    prisma.deal.findMany({
      where: { tenantId },
      include: { lineItems: true, contacts: true },
    }),
    prisma.activity.findMany({ where: { tenantId } }),
    prisma.task.findMany({ where: { tenantId } }),
    prisma.pipeline.findMany({
      where: { tenantId },
      include: { stages: true },
    }),
  ]);

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId: null,
      action: 'migration.export',
      entityType: 'Tenant',
      entityId: tenantId,
      metadata: {
        contacts: contacts.length,
        companies: companies.length,
        deals: deals.length,
        activities: activities.length,
        tasks: tasks.length,
        pipelines: pipelines.length,
      },
    },
  });

  return {
    exportedAt: new Date().toISOString(),
    tenantId,
    contacts,
    companies,
    deals,
    activities,
    tasks,
    pipelines,
  };
}

/**
 * Imports contacts from HubSpot using their Contacts API v3.
 * Fetches all contacts with pagination and creates them in the local database.
 *
 * @param tenantId - The tenant to import into
 * @param apiKey - HubSpot API key (private app access token)
 * @returns Count of imported contacts
 */
export async function importFromHubspot(
  tenantId: string,
  apiKey: string,
): Promise<{ imported: number }> {
  let imported = 0;
  let after: string | undefined;
  const baseUrl = 'https://api.hubapi.com/crm/v3/objects/contacts';

  do {
    const url = after ? `${baseUrl}?limit=100&after=${after}` : `${baseUrl}?limit=100`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      throw new Error(`HubSpot API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as {
      results: Array<{
        properties: {
          firstname?: string;
          lastname?: string;
          email?: string;
          phone?: string;
          jobtitle?: string;
          hs_lead_status?: string;
        };
      }>;
      paging?: { next?: { after: string } };
    };

    const contacts = data.results.map((r) => ({
      tenantId,
      firstName: r.properties.firstname ?? '',
      lastName: r.properties.lastname ?? '',
      email: r.properties.email ?? '',
      phone: r.properties.phone ?? '',
      jobTitle: r.properties.jobtitle ?? '',
      source: 'hubspot',
    }));

    if (contacts.length > 0) {
      await prisma.$transaction(
        contacts.map((c) => prisma.contact.create({ data: c })),
      );
      imported += contacts.length;
    }

    after = data.paging?.next?.after;
  } while (after);

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId: null,
      action: 'migration.import.hubspot',
      entityType: 'Contact',
      entityId: null,
      metadata: { imported },
    },
  });

  return { imported };
}

/**
 * Imports contacts from Pipedrive using their API.
 * Fetches all persons with pagination and creates them in the local database.
 *
 * @param tenantId - The tenant to import into
 * @param apiToken - Pipedrive API token
 * @returns Count of imported contacts
 */
export async function importFromPipedrive(
  tenantId: string,
  apiToken: string,
): Promise<{ imported: number }> {
  let imported = 0;
  let start = 0;
  const limit = 100;
  let moreItems = true;

  while (moreItems) {
    const url = `https://api.pipedrive.com/v1/persons?start=${start}&limit=${limit}&api_token=${apiToken}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Pipedrive API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as {
      success: boolean;
      data: Array<{
        first_name?: string;
        last_name?: string;
        name?: string;
        email?: Array<{ value: string }>;
        phone?: Array<{ value: string }>;
      }> | null;
      additional_data?: { pagination?: { more_items_in_collection: boolean; next_start: number } };
    };

    if (!data.success || !data.data || data.data.length === 0) {
      break;
    }

    const contacts = data.data.map((p) => ({
      tenantId,
      firstName: p.first_name ?? p.name?.split(' ')[0] ?? '',
      lastName: p.last_name ?? p.name?.split(' ').slice(1).join(' ') ?? '',
      email: p.email?.[0]?.value ?? '',
      phone: p.phone?.[0]?.value ?? '',
      source: 'pipedrive',
    }));

    if (contacts.length > 0) {
      await prisma.$transaction(
        contacts.map((c) => prisma.contact.create({ data: c })),
      );
      imported += contacts.length;
    }

    moreItems = data.additional_data?.pagination?.more_items_in_collection ?? false;
    start = data.additional_data?.pagination?.next_start ?? start + limit;
  }

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId: null,
      action: 'migration.import.pipedrive',
      entityType: 'Contact',
      entityId: null,
      metadata: { imported },
    },
  });

  return { imported };
}
