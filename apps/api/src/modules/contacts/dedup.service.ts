import { prisma } from '../../config/database';
import { NotFoundError } from '../../utils/errors';

interface DuplicateGroup {
  contacts: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    mobile: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
  matchType: string;
  confidence: number;
}

type MergeStrategy = 'newest' | 'oldest' | 'most-complete';

/**
 * Compute the Levenshtein distance between two strings.
 * Uses a dynamic programming matrix to find the minimum number of
 * single-character edits (insertions, deletions, substitutions)
 * required to transform string `a` into string `b`.
 *
 * @param a - First input string
 * @param b - Second input string
 * @returns The Levenshtein edit distance as a non-negative integer
 */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

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
  return matrix[a.length][b.length];
}

/**
 * Compute a normalized similarity score between two strings on a 0-1 scale.
 * Returns 1 for identical strings and 0 when strings share no characters.
 * The score is calculated as `1 - (levenshteinDistance / maxLength)`.
 *
 * @param a - First input string
 * @param b - Second input string
 * @returns A similarity score between 0 (completely different) and 1 (identical)
 */
export function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;
  const maxLen = Math.max(a.length, b.length);
  return 1 - levenshtein(a, b) / maxLen;
}

/**
 * Normalize a phone number by stripping all non-digit characters.
 * Useful for comparing phone numbers that may have different formatting
 * (e.g., parentheses, dashes, spaces, dots, plus signs).
 *
 * @param phone - The raw phone number string
 * @returns A string containing only digit characters
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Scan all contacts for a tenant and group potential duplicates.
 * Matches are identified by three criteria (in order of confidence):
 * - Exact email match (confidence: 0.95)
 * - Normalized phone match (confidence: 0.90)
 * - Fuzzy full-name match with >= 0.85 similarity (confidence: similarity * 0.85)
 *
 * @param tenantId - The tenant to scan contacts for
 * @returns An array of duplicate groups, each with contacts, match type, and confidence score
 */
export async function findDuplicates(tenantId: string): Promise<DuplicateGroup[]> {
  const contacts = await prisma.contact.findMany({
    where: { tenantId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      mobile: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const groups: DuplicateGroup[] = [];
  const processed = new Set<string>();

  for (let i = 0; i < contacts.length; i++) {
    if (processed.has(contacts[i].id)) continue;

    const group = [contacts[i]];
    let bestMatchType = '';
    let bestConfidence = 0;

    for (let j = i + 1; j < contacts.length; j++) {
      if (processed.has(contacts[j].id)) continue;

      const match = matchContacts(contacts[i], contacts[j]);
      if (match.confidence > 0) {
        group.push(contacts[j]);
        if (match.confidence > bestConfidence) {
          bestConfidence = match.confidence;
          bestMatchType = match.matchType;
        }
      }
    }

    if (group.length > 1) {
      group.forEach(c => processed.add(c.id));
      groups.push({
        contacts: group,
        matchType: bestMatchType,
        confidence: bestConfidence,
      });
    }
  }

  return groups;
}

/**
 * Find duplicate contacts for a specific contact within the same tenant.
 * Compares the target contact against all other contacts using email,
 * phone normalization, and fuzzy name matching.
 *
 * @param tenantId - The tenant the contact belongs to
 * @param contactId - The ID of the contact to find duplicates for
 * @returns An array of duplicate groups containing the target contact and its matches
 */
export async function findDuplicatesForContact(
  tenantId: string,
  contactId: string
): Promise<DuplicateGroup[]> {
  const target = await prisma.contact.findFirst({
    where: { id: contactId, tenantId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      mobile: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!target) throw new NotFoundError('Contact');

  const others = await prisma.contact.findMany({
    where: { tenantId, id: { not: contactId } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      mobile: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const matches: DuplicateGroup[] = [];

  for (const other of others) {
    const match = matchContacts(target, other);
    if (match.confidence > 0) {
      matches.push({
        contacts: [target, other],
        matchType: match.matchType,
        confidence: match.confidence,
      });
    }
  }

  return matches.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Automatically deduplicate contacts for a tenant using the specified merge strategy.
 * Finds all duplicate groups and merges them by selecting a survivor contact based on the strategy:
 * - 'newest': keeps the most recently updated contact
 * - 'oldest': keeps the earliest created contact
 * - 'most-complete': keeps the contact with the most non-empty fields
 *
 * @param tenantId - The tenant to deduplicate contacts for
 * @param strategy - The merge strategy: 'newest', 'oldest', or 'most-complete'
 * @returns Summary with the number of groups merged and contacts removed
 */
export async function autoDeduplicate(
  tenantId: string,
  strategy: MergeStrategy
): Promise<{ groupsMerged: number; contactsRemoved: number }> {
  const groups = await findDuplicates(tenantId);
  let contactsRemoved = 0;

  for (const group of groups) {
    const survivor = pickSurvivor(group.contacts, strategy);
    const toMerge = group.contacts.filter(c => c.id !== survivor.id);

    for (const contact of toMerge) {
      await mergeContactPair(survivor.id, contact.id);
      contactsRemoved++;
    }
  }

  return { groupsMerged: groups.length, contactsRemoved };
}

function matchContacts(
  a: { email: string; phone: string; mobile: string; firstName: string; lastName: string },
  b: { email: string; phone: string; mobile: string; firstName: string; lastName: string }
): { confidence: number; matchType: string } {
  // Exact email match
  if (a.email && b.email && a.email.toLowerCase() === b.email.toLowerCase()) {
    return { confidence: 0.95, matchType: 'email' };
  }

  // Phone normalization match
  const aPhones = [normalizePhone(a.phone), normalizePhone(a.mobile)].filter(Boolean);
  const bPhones = [normalizePhone(b.phone), normalizePhone(b.mobile)].filter(Boolean);
  for (const ap of aPhones) {
    for (const bp of bPhones) {
      if (ap && bp && ap === bp) {
        return { confidence: 0.90, matchType: 'phone' };
      }
    }
  }

  // Name fuzzy match
  const fullA = `${a.firstName} ${a.lastName}`.toLowerCase().trim();
  const fullB = `${b.firstName} ${b.lastName}`.toLowerCase().trim();
  if (fullA.length > 1 && fullB.length > 1) {
    const sim = similarity(fullA, fullB);
    if (sim >= 0.85) {
      return { confidence: sim * 0.85, matchType: 'name' };
    }
  }

  return { confidence: 0, matchType: 'none' };
}

function pickSurvivor(
  contacts: DuplicateGroup['contacts'],
  strategy: MergeStrategy
): DuplicateGroup['contacts'][number] {
  switch (strategy) {
    case 'newest':
      return contacts.reduce((a, b) => (a.updatedAt > b.updatedAt ? a : b));
    case 'oldest':
      return contacts.reduce((a, b) => (a.createdAt < b.createdAt ? a : b));
    case 'most-complete': {
      const completeness = (c: DuplicateGroup['contacts'][number]) =>
        [c.firstName, c.lastName, c.email, c.phone, c.mobile].filter(Boolean).length;
      return contacts.reduce((a, b) => (completeness(a) >= completeness(b) ? a : b));
    }
  }
}

async function mergeContactPair(survivorId: string, mergedId: string): Promise<void> {
  const [survivor, merged] = await Promise.all([
    prisma.contact.findUniqueOrThrow({ where: { id: survivorId } }),
    prisma.contact.findUniqueOrThrow({ where: { id: mergedId } }),
  ]);

  // Fill empty fields on survivor from merged
  const fillData: Record<string, unknown> = {};
  const fields = ['email', 'phone', 'mobile', 'jobTitle', 'source'] as const;
  for (const field of fields) {
    if (!survivor[field] && merged[field]) {
      fillData[field] = merged[field];
    }
  }

  // Merge tags
  const mergedTags = [...new Set([...survivor.tags, ...merged.tags])];
  fillData.tags = mergedTags;

  await prisma.$transaction([
    prisma.contact.update({ where: { id: survivorId }, data: fillData }),
    prisma.dealContact.updateMany({ where: { contactId: mergedId }, data: { contactId: survivorId } }),
    prisma.activity.updateMany({ where: { contactId: mergedId }, data: { contactId: survivorId } }),
    prisma.task.updateMany({ where: { contactId: mergedId }, data: { contactId: survivorId } }),
    prisma.emailMessage.updateMany({ where: { contactId: mergedId }, data: { contactId: survivorId } }),
    prisma.smsMessage.updateMany({ where: { contactId: mergedId }, data: { contactId: survivorId } }),
    prisma.contact.delete({ where: { id: mergedId } }),
  ]);
}
