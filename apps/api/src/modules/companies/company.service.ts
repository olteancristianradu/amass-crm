import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { NotFoundError, ConflictError } from '../../utils/errors';

interface ListFilters {
  search?: string;
  industry?: string;
  page?: number;
  limit?: number;
}

export class CompanyService {
  async list(tenantId: string, filters: ListFilters) {
    const where: Prisma.CompanyWhereInput = { tenantId };

    if (filters.industry) {
      where.industry = filters.industry;
    }

    if (filters.search) {
      const s = filters.search;
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { domain: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
      ];
    }

    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 50, 200);

    const [companies, total] = await Promise.all([
      prisma.company.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: { select: { contacts: true, deals: true } },
        },
      }),
      prisma.company.count({ where }),
    ]);

    return {
      companies,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getById(tenantId: string, id: string) {
    const company = await prisma.company.findFirst({
      where: { id, tenantId },
      include: {
        _count: { select: { contacts: true, deals: true } },
        contacts: {
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            jobTitle: true,
          },
        },
      },
    });
    if (!company) throw new NotFoundError('Company');
    return company;
  }

  async create(tenantId: string, data: Record<string, unknown>) {
    const company = await prisma.company.create({
      data: {
        tenant: { connect: { id: tenantId } },
        name: data.name as string,
        domain: (data.domain as string) || undefined,
        industry: (data.industry as string) || undefined,
        size: (data.size as string) || undefined,
        phone: (data.phone as string) || '',
        email: (data.email as string) || '',
        website: (data.website as string) || '',
        address: (data.address as string) || '',
        city: (data.city as string) || '',
        country: (data.country as string) || 'RO',
        notes: (data.notes as string) || '',
        tags: (data.tags as string[]) || [],
      },
    });
    return company;
  }

  async update(tenantId: string, id: string, data: Record<string, unknown>) {
    const existing = await prisma.company.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundError('Company');

    const company = await prisma.company.update({
      where: { id },
      data: data as Prisma.CompanyUpdateInput,
    });
    return company;
  }

  async delete(tenantId: string, id: string) {
    const existing = await prisma.company.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundError('Company');
    await prisma.company.delete({ where: { id } });
  }

  async importCsv(tenantId: string, csvText: string): Promise<{ imported: number; skipped: number }> {
    const lines = csvText.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row');

    const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());
    const nameIdx = headers.findIndex(h => h === 'name' || h === 'company name' || h === 'company');
    if (nameIdx === -1) throw new Error('CSV must have a "Name" or "Company Name" column');

    const domainIdx = headers.findIndex(h => h === 'domain' || h === 'website');
    const industryIdx = headers.findIndex(h => h === 'industry');
    const sizeIdx = headers.findIndex(h => h === 'size' || h === 'company size');
    const phoneIdx = headers.findIndex(h => h === 'phone');
    const emailIdx = headers.findIndex(h => h === 'email');
    const cityIdx = headers.findIndex(h => h === 'city');
    const countryIdx = headers.findIndex(h => h === 'country');

    let imported = 0;
    let skipped = 0;

    for (let i = 1; i < lines.length; i++) {
      const cols = this.parseCsvLine(lines[i]);
      const name = cols[nameIdx]?.trim();
      if (!name) { skipped++; continue; }

      // Check for duplicate
      const existing = await prisma.company.findFirst({
        where: { tenantId, name: { equals: name, mode: 'insensitive' } },
      });
      if (existing) { skipped++; continue; }

      await prisma.company.create({
        data: {
          tenant: { connect: { id: tenantId } },
          name,
          domain: domainIdx >= 0 ? cols[domainIdx]?.trim() || null : null,
          industry: industryIdx >= 0 ? cols[industryIdx]?.trim() || null : null,
          size: sizeIdx >= 0 ? cols[sizeIdx]?.trim() || null : null,
          phone: phoneIdx >= 0 ? cols[phoneIdx]?.trim() || undefined : undefined,
          email: emailIdx >= 0 ? cols[emailIdx]?.trim() || undefined : undefined,
          city: cityIdx >= 0 ? cols[cityIdx]?.trim() || undefined : undefined,
          country: countryIdx >= 0 ? cols[countryIdx]?.trim() || undefined : undefined,
        },
      });
      imported++;
    }

    return { imported, skipped };
  }

  async exportCsv(tenantId: string): Promise<string> {
    const companies = await prisma.company.findMany({
      where: { tenantId },
      orderBy: { updatedAt: 'desc' },
    });

    const headers = ['Name', 'Domain', 'Industry', 'Size', 'Phone', 'Email', 'City', 'Country', 'Created At'];
    const escape = (s: string) => `"${String(s || '').replace(/"/g, '""')}"`;
    const rows = companies.map(c => [
      c.name, c.domain || '', c.industry || '', c.size || '',
      c.phone || '', c.email || '', c.city || '', c.country || '',
      c.createdAt.toISOString().split('T')[0],
    ].map(escape).join(','));

    return [headers.map(escape).join(','), ...rows].join('\n');
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else { inQuotes = !inQuotes; }
      } else if (ch === ',' && !inQuotes) {
        result.push(current); current = '';
      } else {
        current += ch;
      }
    }
    result.push(current);
    return result;
  }

  async merge(tenantId: string, primaryId: string, secondaryId: string) {
    if (primaryId === secondaryId) {
      throw new ConflictError('Cannot merge a company with itself');
    }

    const [primary, secondary] = await Promise.all([
      prisma.company.findFirst({ where: { id: primaryId, tenantId } }),
      prisma.company.findFirst({ where: { id: secondaryId, tenantId } }),
    ]);

    if (!primary) throw new NotFoundError('Primary company');
    if (!secondary) throw new NotFoundError('Secondary company');

    // Move contacts from secondary to primary
    await prisma.contact.updateMany({
      where: { companyId: secondaryId },
      data: { companyId: primaryId },
    });

    // Move deals from secondary to primary
    await prisma.deal.updateMany({
      where: { companyId: secondaryId },
      data: { companyId: primaryId },
    });

    // Fill empty fields on primary from secondary
    const fillData: Prisma.CompanyUpdateInput = {};
    if (!primary.domain && secondary.domain) fillData.domain = secondary.domain;
    if (!primary.industry && secondary.industry) fillData.industry = secondary.industry;
    if (!primary.size && secondary.size) fillData.size = secondary.size;
    if (!primary.phone && secondary.phone) fillData.phone = secondary.phone;
    if (!primary.email && secondary.email) fillData.email = secondary.email;
    if (!primary.website && secondary.website) fillData.website = secondary.website;
    if (!primary.address && secondary.address) fillData.address = secondary.address;
    if (!primary.city && secondary.city) fillData.city = secondary.city;
    if (!primary.notes && secondary.notes) fillData.notes = secondary.notes;

    // Merge tags (deduplicate)
    const mergedTags = [...new Set([...primary.tags, ...secondary.tags])];
    fillData.tags = mergedTags;

    if (Object.keys(fillData).length > 0) {
      await prisma.company.update({ where: { id: primaryId }, data: fillData });
    }

    // Delete secondary company
    await prisma.company.delete({ where: { id: secondaryId } });

    // Return updated primary
    return this.getById(tenantId, primaryId);
  }
}
