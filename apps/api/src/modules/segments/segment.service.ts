import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { NotFoundError } from '../../utils/errors';

/** Shape of a single filter condition within a segment. */
interface SegmentCondition {
  field: string;
  operator: string;
  value?: unknown;
}

/** Input data for creating a new segment. */
interface CreateSegmentInput {
  name: string;
  description?: string;
  conditions: SegmentCondition[];
  matchType?: 'all' | 'any';
  createdBy: string;
}

/** Input data for updating an existing segment. */
interface UpdateSegmentInput {
  name?: string;
  description?: string;
  conditions?: SegmentCondition[];
  matchType?: 'all' | 'any';
}

/**
 * Supported contact fields that can be used in segment conditions.
 * Maps logical field names to Prisma-compatible where-clause paths.
 */
const CONTACT_FIELDS: Record<string, string> = {
  email: 'email',
  firstName: 'firstName',
  lastName: 'lastName',
  phone: 'phone',
  mobile: 'mobile',
  jobTitle: 'jobTitle',
  source: 'source',
  score: 'score',
  city: 'city',
  country: 'country',
  company: 'company',
  lastContactedAt: 'lastContactedAt',
  createdAt: 'createdAt',
  tag: 'tag',
};

/**
 * Translates a single segment condition into a Prisma WHERE clause fragment.
 * Handles string operators (eq, neq, contains, not_contains, in, not_in),
 * numeric/date operators (gt, lt, gte, lte), and existence operators (is_set, is_not_set).
 *
 * @param condition - The filter condition to translate
 * @returns A Prisma-compatible where-clause object for the Contact model
 */
function buildConditionWhere(condition: SegmentCondition): Prisma.ContactWhereInput {
  const { field, operator, value } = condition;

  // Handle tag field specially — uses array contains
  if (field === 'tag') {
    switch (operator) {
      case 'eq':
      case 'contains':
        return { tags: { has: value as string } };
      case 'neq':
      case 'not_contains':
        return { NOT: { tags: { has: value as string } } };
      case 'is_set':
        return { NOT: { tags: { equals: [] } } };
      case 'is_not_set':
        return { tags: { equals: [] } };
      default:
        return {};
    }
  }

  // Handle company field — joins through relation
  if (field === 'company') {
    switch (operator) {
      case 'eq':
        return { company: { name: { equals: value as string, mode: 'insensitive' } } };
      case 'neq':
        return { NOT: { company: { name: { equals: value as string, mode: 'insensitive' } } } };
      case 'contains':
        return { company: { name: { contains: value as string, mode: 'insensitive' } } };
      case 'not_contains':
        return { NOT: { company: { name: { contains: value as string, mode: 'insensitive' } } } };
      case 'is_set':
        return { companyId: { not: null } };
      case 'is_not_set':
        return { companyId: null };
      default:
        return {};
    }
  }

  // Handle city/country through company relation
  if (field === 'city' || field === 'country') {
    const companyField = field as 'city' | 'country';
    switch (operator) {
      case 'eq':
        return { company: { [companyField]: { equals: value as string, mode: 'insensitive' } } };
      case 'neq':
        return { NOT: { company: { [companyField]: { equals: value as string, mode: 'insensitive' } } } };
      case 'contains':
        return { company: { [companyField]: { contains: value as string, mode: 'insensitive' } } };
      default:
        return {};
    }
  }

  // Standard contact fields
  const prismaField = CONTACT_FIELDS[field] || field;

  switch (operator) {
    case 'eq':
      return { [prismaField]: { equals: value } };
    case 'neq':
      return { NOT: { [prismaField]: { equals: value } } };
    case 'contains':
      return { [prismaField]: { contains: value as string, mode: 'insensitive' } };
    case 'not_contains':
      return { NOT: { [prismaField]: { contains: value as string, mode: 'insensitive' } } };
    case 'gt':
      return { [prismaField]: { gt: value } };
    case 'lt':
      return { [prismaField]: { lt: value } };
    case 'gte':
      return { [prismaField]: { gte: value } };
    case 'lte':
      return { [prismaField]: { lte: value } };
    case 'is_set':
      return { [prismaField]: { not: '' } };
    case 'is_not_set':
      return { [prismaField]: { equals: '' } };
    case 'in':
      return { [prismaField]: { in: Array.isArray(value) ? value : [] } };
    case 'not_in':
      return { [prismaField]: { notIn: Array.isArray(value) ? value : [] } };
    default:
      return {};
  }
}

/**
 * Builds a full Prisma WHERE clause from an array of conditions and a match type.
 * Uses AND logic for matchType "all" and OR logic for matchType "any".
 *
 * @param tenantId - The tenant scope for the query
 * @param conditions - Array of filter conditions
 * @param matchType - "all" for AND logic, "any" for OR logic
 * @returns A complete Prisma ContactWhereInput object
 */
function buildSegmentWhere(
  tenantId: string,
  conditions: SegmentCondition[],
  matchType: string,
): Prisma.ContactWhereInput {
  const clauseList = conditions.map(buildConditionWhere);

  if (matchType === 'any') {
    return { tenantId, OR: clauseList };
  }
  return { tenantId, AND: clauseList };
}

/**
 * Creates a new dynamic segment with filter conditions.
 * Conditions are an array of {field, operator, value} objects.
 * Supported fields: email, firstName, lastName, city, country, phone, company, source, tag, lastContactedAt
 * Supported operators: eq, neq, contains, not_contains, gt, lt, gte, lte, is_set, is_not_set, in, not_in
 *
 * @param tenantId - The tenant that owns the segment
 * @param data - The segment creation input including name, conditions, and matchType
 * @returns The newly created segment with its initial contact count
 */
export async function createSegment(tenantId: string, data: CreateSegmentInput) {
  const where = buildSegmentWhere(tenantId, data.conditions, data.matchType || 'all');
  const contactCount = await prisma.contact.count({ where });

  const segment = await prisma.segment.create({
    data: {
      tenantId,
      name: data.name,
      description: data.description || null,
      conditions: data.conditions as unknown as Prisma.JsonArray,
      matchType: data.matchType || 'all',
      contactCount,
      createdBy: data.createdBy,
    },
  });

  return segment;
}

/**
 * Updates an existing segment's name, description, conditions, or matchType.
 * If conditions or matchType are changed, recalculates the contact count.
 *
 * @param segmentId - The ID of the segment to update
 * @param tenantId - The tenant scope to verify ownership
 * @param data - Partial update fields
 * @returns The updated segment record
 */
export async function updateSegment(segmentId: string, tenantId: string, data: UpdateSegmentInput) {
  const existing = await prisma.segment.findFirst({ where: { id: segmentId, tenantId } });
  if (!existing) {
    throw new NotFoundError('Segment');
  }

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.conditions !== undefined) updateData.conditions = data.conditions as unknown as Prisma.JsonArray;
  if (data.matchType !== undefined) updateData.matchType = data.matchType;

  // Recalculate contact count if conditions or matchType changed
  if (data.conditions !== undefined || data.matchType !== undefined) {
    const conditions = (data.conditions || existing.conditions) as unknown as SegmentCondition[];
    const matchType = data.matchType || existing.matchType;
    const where = buildSegmentWhere(tenantId, conditions, matchType);
    updateData.contactCount = await prisma.contact.count({ where });
  }

  const segment = await prisma.segment.update({
    where: { id: segmentId },
    data: updateData,
  });

  return segment;
}

/**
 * Retrieves a single segment by ID within a tenant scope.
 *
 * @param segmentId - The segment ID to look up
 * @param tenantId - The tenant scope
 * @returns The segment record
 * @throws NotFoundError if the segment does not exist in this tenant
 */
export async function getSegment(segmentId: string, tenantId: string) {
  const segment = await prisma.segment.findFirst({ where: { id: segmentId, tenantId } });
  if (!segment) {
    throw new NotFoundError('Segment');
  }
  return segment;
}

/**
 * Lists all segments for a tenant, ordered by most recently updated.
 *
 * @param tenantId - The tenant scope
 * @returns Array of segment records
 */
export async function listSegments(tenantId: string) {
  return prisma.segment.findMany({
    where: { tenantId },
    orderBy: { updatedAt: 'desc' },
  });
}

/**
 * Deletes a segment by ID within a tenant scope.
 *
 * @param segmentId - The segment ID to delete
 * @param tenantId - The tenant scope
 * @throws NotFoundError if the segment does not exist
 */
export async function deleteSegment(segmentId: string, tenantId: string) {
  const existing = await prisma.segment.findFirst({ where: { id: segmentId, tenantId } });
  if (!existing) {
    throw new NotFoundError('Segment');
  }
  await prisma.segment.delete({ where: { id: segmentId } });
}

/**
 * Translates segment conditions into Prisma WHERE clauses and returns matching contacts.
 * Handles matchType "all" (AND logic) and "any" (OR logic).
 * Supports filtering by contact fields, tags, company relations, and custom fields.
 *
 * @param segmentId - The segment whose conditions define the query
 * @param page - Page number for pagination (1-based)
 * @param limit - Number of contacts per page (max 200)
 * @returns Paginated list of contacts matching the segment conditions
 */
export async function getSegmentContacts(segmentId: string, page = 1, limit = 50) {
  const segment = await prisma.segment.findUnique({ where: { id: segmentId } });
  if (!segment) {
    throw new NotFoundError('Segment');
  }

  const conditions = segment.conditions as unknown as SegmentCondition[];
  const where = buildSegmentWhere(segment.tenantId, conditions, segment.matchType);
  const safeLimit = Math.min(limit, 200);

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      include: { company: { select: { id: true, name: true } } },
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * safeLimit,
      take: safeLimit,
    }),
    prisma.contact.count({ where }),
  ]);

  // Update the cached contact count
  if (total !== segment.contactCount) {
    await prisma.segment.update({
      where: { id: segmentId },
      data: { contactCount: total },
    });
  }

  return {
    contacts,
    total,
    page,
    totalPages: Math.ceil(total / safeLimit),
  };
}

/**
 * Refreshes contact counts for all segments in a tenant.
 * Runs each segment query with COUNT and updates the contactCount field.
 * Intended to be called periodically by a background job.
 *
 * @param tenantId - The tenant whose segment counts should be refreshed
 * @returns The number of segments that were updated
 */
export async function refreshSegmentCounts(tenantId: string) {
  const segments = await prisma.segment.findMany({ where: { tenantId } });

  let updated = 0;
  for (const segment of segments) {
    const conditions = segment.conditions as unknown as SegmentCondition[];
    const where = buildSegmentWhere(tenantId, conditions, segment.matchType);
    const count = await prisma.contact.count({ where });

    if (count !== segment.contactCount) {
      await prisma.segment.update({
        where: { id: segment.id },
        data: { contactCount: count },
      });
      updated++;
    }
  }

  return updated;
}
