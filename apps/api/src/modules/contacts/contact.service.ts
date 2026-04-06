import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { NotFoundError, ConflictError } from '../../utils/errors';
import { eventBus } from '../../events/event-bus';

interface ListFilters {
  search?: string;
  companyId?: string;
  assignedToId?: string;
  tag?: string;
  page?: number;
  limit?: number;
}

interface ImportContact {
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  jobTitle?: string;
  source?: string;
}

export class ContactService {
  async list(tenantId: string, filters: ListFilters) {
    const where: Prisma.ContactWhereInput = { tenantId };

    if (filters.companyId) {
      where.companyId = filters.companyId;
    }
    if (filters.assignedToId) {
      where.assignedToId = filters.assignedToId;
    }
    if (filters.tag) {
      where.tags = { has: filters.tag };
    }
    if (filters.search) {
      const s = filters.search;
      where.OR = [
        { firstName: { contains: s, mode: 'insensitive' } },
        { lastName: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
        { phone: { contains: s } },
      ];
    }

    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 50, 200);

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          company: { select: { id: true, name: true } },
          assignedTo: { select: { id: true, name: true, avatar: true } },
        },
      }),
      prisma.contact.count({ where }),
    ]);

    return {
      contacts,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getById(tenantId: string, id: string) {
    const contact = await prisma.contact.findFirst({
      where: { id, tenantId },
      include: {
        company: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true, avatar: true } },
        deals: {
          include: {
            deal: {
              select: {
                id: true,
                title: true,
                value: true,
                currency: true,
                stage: { select: { id: true, name: true } },
              },
            },
          },
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: {
            user: { select: { id: true, name: true } },
          },
        },
        tasks: {
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, name: true } },
          },
        },
        customFieldValues: {
          include: {
            definition: { select: { fieldName: true, fieldLabel: true, fieldType: true } },
          },
        },
      },
    });
    if (!contact) throw new NotFoundError('Contact');
    return contact;
  }

  async create(tenantId: string, userId: string, data: Record<string, unknown>) {
    const contactData: Prisma.ContactCreateInput = {
      tenant: { connect: { id: tenantId } },
      firstName: (data.firstName as string) || '',
      lastName: (data.lastName as string) || '',
      email: (data.email as string) || '',
      phone: (data.phone as string) || '',
      mobile: (data.mobile as string) || '',
      jobTitle: (data.jobTitle as string) || '',
      source: (data.source as string) || '',
      tags: (data.tags as string[]) || [],
    };

    if (data.companyId) {
      contactData.company = { connect: { id: data.companyId as string } };
    }
    if (data.assignedToId) {
      contactData.assignedTo = { connect: { id: data.assignedToId as string } };
    }

    const contact = await prisma.contact.create({ data: contactData });

    // Log activity
    await prisma.activity.create({
      data: {
        tenantId,
        userId,
        contactId: contact.id,
        type: 'note',
        subject: 'Contact created',
        body: `Contact ${contact.firstName} ${contact.lastName} was created.`,
      },
    });

    eventBus.emit('contact.created', { tenantId, contactId: contact.id, userId });

    return contact;
  }

  async update(tenantId: string, userId: string, id: string, data: Record<string, unknown>) {
    const existing = await prisma.contact.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundError('Contact');

    // Handle relational fields separately
    const { companyId, assignedToId, ...scalarData } = data;
    const updateData: Prisma.ContactUpdateInput = scalarData as Prisma.ContactUpdateInput;

    if (companyId !== undefined) {
      if (companyId) {
        updateData.company = { connect: { id: companyId as string } };
      } else {
        updateData.company = { disconnect: true };
      }
    }
    if (assignedToId !== undefined) {
      if (assignedToId) {
        updateData.assignedTo = { connect: { id: assignedToId as string } };
      } else {
        updateData.assignedTo = { disconnect: true };
      }
    }

    const contact = await prisma.contact.update({
      where: { id },
      data: updateData,
    });

    // Log activity
    await prisma.activity.create({
      data: {
        tenantId,
        userId,
        contactId: contact.id,
        type: 'note',
        subject: 'Contact updated',
        body: `Contact ${contact.firstName} ${contact.lastName} was updated.`,
      },
    });

    eventBus.emit('contact.updated', { tenantId, contactId: contact.id, userId, changes: data as Record<string, unknown> });

    return contact;
  }

  async delete(tenantId: string, id: string) {
    const existing = await prisma.contact.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundError('Contact');
    await prisma.contact.delete({ where: { id } });
    eventBus.emit('contact.deleted', { tenantId, contactId: id, userId: '' });
  }

  async merge(tenantId: string, primaryId: string, secondaryId: string) {
    if (primaryId === secondaryId) {
      throw new ConflictError('Cannot merge a contact with itself');
    }

    const [primary, secondary] = await Promise.all([
      prisma.contact.findFirst({ where: { id: primaryId, tenantId } }),
      prisma.contact.findFirst({ where: { id: secondaryId, tenantId } }),
    ]);

    if (!primary) throw new NotFoundError('Primary contact');
    if (!secondary) throw new NotFoundError('Secondary contact');

    // Move deals from secondary to primary (update DealContact)
    // First get existing deal links on primary to avoid duplicates
    const primaryDealLinks = await prisma.dealContact.findMany({
      where: { contactId: primaryId },
      select: { dealId: true },
    });
    const primaryDealIds = new Set(primaryDealLinks.map(d => d.dealId));

    // Update non-duplicate deal contacts
    const secondaryDealLinks = await prisma.dealContact.findMany({
      where: { contactId: secondaryId },
    });
    for (const link of secondaryDealLinks) {
      if (primaryDealIds.has(link.dealId)) {
        // Already linked to primary, delete the secondary link
        await prisma.dealContact.delete({ where: { id: link.id } });
      } else {
        await prisma.dealContact.update({
          where: { id: link.id },
          data: { contactId: primaryId },
        });
      }
    }

    // Move activities from secondary to primary
    await prisma.activity.updateMany({
      where: { contactId: secondaryId },
      data: { contactId: primaryId },
    });

    // Move tasks from secondary to primary
    await prisma.task.updateMany({
      where: { contactId: secondaryId },
      data: { contactId: primaryId },
    });

    // Fill empty fields on primary from secondary
    const fillData: Prisma.ContactUpdateInput = {};
    if (!primary.lastName && secondary.lastName) fillData.lastName = secondary.lastName;
    if (!primary.email && secondary.email) fillData.email = secondary.email;
    if (!primary.phone && secondary.phone) fillData.phone = secondary.phone;
    if (!primary.mobile && secondary.mobile) fillData.mobile = secondary.mobile;
    if (!primary.jobTitle && secondary.jobTitle) fillData.jobTitle = secondary.jobTitle;
    if (!primary.source && secondary.source) fillData.source = secondary.source;
    if (!primary.companyId && secondary.companyId) {
      fillData.company = { connect: { id: secondary.companyId } };
    }
    if (!primary.assignedToId && secondary.assignedToId) {
      fillData.assignedTo = { connect: { id: secondary.assignedToId } };
    }

    // Merge tags (deduplicate)
    const mergedTags = [...new Set([...primary.tags, ...secondary.tags])];
    fillData.tags = mergedTags;

    if (Object.keys(fillData).length > 0) {
      await prisma.contact.update({ where: { id: primaryId }, data: fillData });
    }

    // Delete secondary contact
    await prisma.contact.delete({ where: { id: secondaryId } });

    // Return updated primary
    return this.getById(tenantId, primaryId);
  }

  async checkDuplicate(tenantId: string, email?: string, phone?: string) {
    if (!email && !phone) return null;

    const conditions: Prisma.ContactWhereInput[] = [];
    if (email) {
      conditions.push({ email: { equals: email, mode: 'insensitive' } });
    }
    if (phone) {
      conditions.push({ phone: { contains: phone } });
    }

    const duplicate = await prisma.contact.findFirst({
      where: {
        tenantId,
        OR: conditions,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        company: { select: { id: true, name: true } },
      },
    });

    return duplicate;
  }

  async importBatch(tenantId: string, userId: string, contacts: ImportContact[], assignToId?: string) {
    const results: { contact: unknown; duplicate: unknown; status: string }[] = [];

    for (const item of contacts) {
      // Check for duplicates
      const duplicate = await this.checkDuplicate(tenantId, item.email, item.phone);

      if (duplicate) {
        results.push({ contact: null, duplicate, status: 'skipped_duplicate' });
        continue;
      }

      // Find or create company if companyName is provided
      let companyId: string | undefined;
      if (item.companyName) {
        const existing = await prisma.company.findFirst({
          where: {
            tenantId,
            name: { equals: item.companyName, mode: 'insensitive' },
          },
        });
        if (existing) {
          companyId = existing.id;
        } else {
          const newCompany = await prisma.company.create({
            data: {
              tenant: { connect: { id: tenantId } },
              name: item.companyName,
            },
          });
          companyId = newCompany.id;
        }
      }

      const contact = await this.create(tenantId, userId, {
        firstName: item.firstName,
        lastName: item.lastName,
        email: item.email,
        phone: item.phone,
        jobTitle: item.jobTitle,
        source: item.source || 'import',
        companyId,
        assignedToId: assignToId,
      });

      results.push({ contact, duplicate: null, status: 'created' });
    }

    return {
      total: contacts.length,
      created: results.filter(r => r.status === 'created').length,
      skipped: results.filter(r => r.status === 'skipped_duplicate').length,
      results,
    };
  }

  /**
   * Fuzzy matching deduplication. Finds potential duplicate contacts using:
   * - Exact email match
   * - Exact phone match (normalized)
   * - Fuzzy name match (Levenshtein distance)
   */
  async findDuplicates(tenantId: string, threshold: number = 0.8) {
    const contacts = await prisma.contact.findMany({
      where: { tenantId },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true, mobile: true },
    });

    const duplicateGroups: Array<{ contacts: typeof contacts; matchType: string; confidence: number }> = [];
    const processed = new Set<string>();

    for (let i = 0; i < contacts.length; i++) {
      if (processed.has(contacts[i].id)) continue;
      const group = [contacts[i]];
      let matchType = '';
      let confidence = 0;

      for (let j = i + 1; j < contacts.length; j++) {
        if (processed.has(contacts[j].id)) continue;
        const match = this.matchContacts(contacts[i], contacts[j]);
        if (match.confidence >= threshold) {
          group.push(contacts[j]);
          matchType = match.matchType;
          confidence = Math.max(confidence, match.confidence);
        }
      }

      if (group.length > 1) {
        group.forEach(c => processed.add(c.id));
        duplicateGroups.push({ contacts: group, matchType, confidence });
      }
    }

    return duplicateGroups;
  }

  private matchContacts(
    a: { firstName: string; lastName: string; email: string | null; phone: string | null; mobile: string | null },
    b: { firstName: string; lastName: string; email: string | null; phone: string | null; mobile: string | null }
  ): { confidence: number; matchType: string } {
    // Exact email match
    if (a.email && b.email && a.email.toLowerCase() === b.email.toLowerCase()) {
      return { confidence: 0.95, matchType: 'email' };
    }

    // Phone match (normalize: remove spaces, dashes, parens)
    const normalizePhone = (p: string | null) => p?.replace(/[\s\-\(\)\.+]/g, '') || '';
    const aPhones = [normalizePhone(a.phone), normalizePhone(a.mobile)].filter(Boolean);
    const bPhones = [normalizePhone(b.phone), normalizePhone(b.mobile)].filter(Boolean);
    for (const ap of aPhones) {
      for (const bp of bPhones) {
        if (ap && bp && (ap === bp || ap.endsWith(bp) || bp.endsWith(ap))) {
          return { confidence: 0.9, matchType: 'phone' };
        }
      }
    }

    // Fuzzy name match using Levenshtein
    const fullA = `${a.firstName} ${a.lastName}`.toLowerCase().trim();
    const fullB = `${b.firstName} ${b.lastName}`.toLowerCase().trim();
    const nameSimilarity = this.stringSimilarity(fullA, fullB);
    if (nameSimilarity >= 0.85) {
      return { confidence: nameSimilarity * 0.85, matchType: 'name' };
    }

    // First name + last initial match
    if (a.firstName.toLowerCase() === b.firstName.toLowerCase() &&
        a.lastName[0]?.toLowerCase() === b.lastName[0]?.toLowerCase()) {
      return { confidence: 0.7, matchType: 'partial_name' };
    }

    return { confidence: 0, matchType: 'none' };
  }

  /**
   * Levenshtein-based string similarity (0-1 range)
   */
  private stringSimilarity(a: string, b: string): number {
    if (a === b) return 1;
    if (!a.length || !b.length) return 0;

    const matrix: number[][] = [];
    for (let i = 0; i <= a.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= b.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }
    const maxLen = Math.max(a.length, b.length);
    return 1 - matrix[a.length][b.length] / maxLen;
  }

  /**
   * Merge two contacts. The survivor keeps their data, the merged contact's
   * unique data fills in gaps. All relationships are transferred to the survivor.
   */
  async mergeContacts(tenantId: string, survivorId: string, mergedId: string) {
    const [survivor, merged] = await Promise.all([
      prisma.contact.findFirst({ where: { id: survivorId, tenantId } }),
      prisma.contact.findFirst({ where: { id: mergedId, tenantId } }),
    ]);
    if (!survivor || !merged) throw new Error('Contact not found');

    // Merge data: survivor's non-null values take priority, merged fills gaps
    const mergedData: Record<string, unknown> = {};
    const fields = ['email', 'phone', 'mobile', 'jobTitle', 'source'] as const;
    for (const field of fields) {
      if (!survivor[field] && merged[field]) {
        mergedData[field] = merged[field];
      }
    }

    await prisma.$transaction([
      // Update survivor with merged data
      prisma.contact.update({ where: { id: survivorId }, data: mergedData }),
      // Transfer all deals from merged to survivor
      prisma.dealContact.updateMany({ where: { contactId: mergedId }, data: { contactId: survivorId } }),
      // Transfer all activities from merged to survivor
      prisma.activity.updateMany({ where: { contactId: mergedId }, data: { contactId: survivorId } }),
      // Transfer all tasks from merged to survivor
      prisma.task.updateMany({ where: { contactId: mergedId }, data: { contactId: survivorId } }),
      // Transfer email messages
      prisma.emailMessage.updateMany({ where: { contactId: mergedId }, data: { contactId: survivorId } }),
      // Transfer SMS messages
      prisma.smsMessage.updateMany({ where: { contactId: mergedId }, data: { contactId: survivorId } }),
      // Delete the merged contact
      prisma.contact.delete({ where: { id: mergedId } }),
    ]);

    return prisma.contact.findUnique({ where: { id: survivorId } });
  }

  /**
   * Export contacts as vCard 3.0 format
   */
  async exportVCard(tenantId: string): Promise<string> {
    const contacts = await prisma.contact.findMany({
      where: { tenantId },
      include: {
        company: { select: { name: true } },
      },
    });

    const vcards = contacts.map(c => {
      const lines = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `N:${this.vcardEscape(c.lastName)};${this.vcardEscape(c.firstName)};;;`,
        `FN:${this.vcardEscape(c.firstName)} ${this.vcardEscape(c.lastName)}`,
      ];
      if (c.email) lines.push(`EMAIL;TYPE=WORK:${c.email}`);
      if (c.phone) lines.push(`TEL;TYPE=WORK:${c.phone}`);
      if (c.mobile) lines.push(`TEL;TYPE=CELL:${c.mobile}`);
      if (c.jobTitle) lines.push(`TITLE:${this.vcardEscape(c.jobTitle)}`);
      if (c.company?.name) lines.push(`ORG:${this.vcardEscape(c.company.name)}`);
      if (c.source) lines.push(`NOTE:Source: ${this.vcardEscape(c.source)}`);
      lines.push('END:VCARD');
      return lines.join('\r\n');
    });

    return vcards.join('\r\n');
  }

  private vcardEscape(s: string): string {
    return s.replace(/[;,\\]/g, c => '\\' + c).replace(/\n/g, '\\n');
  }

  /**
   * Import contacts from vCard format
   */
  async importVCard(tenantId: string, userId: string, vcardText: string): Promise<{ imported: number; skipped: number }> {
    const cards = vcardText.split('END:VCARD').filter(c => c.includes('BEGIN:VCARD'));
    let imported = 0;
    let skipped = 0;

    for (const card of cards) {
      const lines = card.split(/\r?\n/);
      const get = (prefix: string): string => {
        const line = lines.find(l => l.startsWith(prefix));
        return line ? line.substring(line.indexOf(':') + 1).trim() : '';
      };

      const nParts = get('N').split(';');
      const firstName = nParts[1] || get('FN').split(' ')[0] || '';
      const lastName = nParts[0] || get('FN').split(' ').slice(1).join(' ') || '';

      if (!firstName && !lastName) { skipped++; continue; }

      const email = get('EMAIL');
      const phone = lines.find(l => l.includes('TEL') && l.includes('WORK'))?.split(':').pop() || '';
      const mobile = lines.find(l => l.includes('TEL') && l.includes('CELL'))?.split(':').pop() || '';
      const jobTitle = get('TITLE');
      const org = get('ORG');

      // Check for duplicate
      if (email) {
        const dup = await this.checkDuplicate(tenantId, email);
        if (dup) { skipped++; continue; }
      }

      // Find or create company
      let companyId: string | undefined;
      if (org) {
        const existing = await prisma.company.findFirst({
          where: { tenantId, name: { equals: org, mode: 'insensitive' } },
        });
        if (existing) {
          companyId = existing.id;
        } else {
          const newCo = await prisma.company.create({
            data: { tenant: { connect: { id: tenantId } }, name: org },
          });
          companyId = newCo.id;
        }
      }

      await this.create(tenantId, userId, {
        firstName, lastName, email, phone, mobile, jobTitle,
        companyId, source: 'vcard_import',
      });
      imported++;
    }

    return { imported, skipped };
  }

  async exportCsv(tenantId: string): Promise<string> {
    const contacts = await prisma.contact.findMany({
      where: { tenantId },
      orderBy: { updatedAt: 'desc' },
      include: {
        company: { select: { name: true } },
        assignedTo: { select: { name: true } },
      },
    });

    const headers = [
      'First Name',
      'Last Name',
      'Email',
      'Phone',
      'Mobile',
      'Job Title',
      'Company',
      'Source',
      'Tags',
      'Assigned To',
      'Created At',
    ];

    const rows = contacts.map(c => [
      c.firstName,
      c.lastName,
      c.email,
      c.phone,
      c.mobile,
      c.jobTitle,
      c.company?.name || '',
      c.source,
      c.tags.join('; '),
      c.assignedTo?.name || '',
      c.createdAt.toISOString().split('T')[0],
    ]);

    const escape = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const csv = [
      headers.map(escape).join(','),
      ...rows.map(r => r.map(escape).join(',')),
    ].join('\n');

    return csv;
  }
}
