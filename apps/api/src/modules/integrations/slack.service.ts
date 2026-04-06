import crypto from 'crypto';
import { prisma } from '../../config/database';
import { env } from '../../config/env';

const SLACK_OAUTH_URL = 'https://slack.com/oauth/v2/authorize';
const SLACK_API_BASE = 'https://slack.com/api';

export function getInstallUrl(tenantId: string): string {
  const params = new URLSearchParams({
    client_id: env.SLACK_CLIENT_ID,
    scope: 'chat:write,commands,channels:read',
    redirect_uri: `${env.OAUTH_REDIRECT_BASE_URL}/api/v1/integrations/slack/callback`,
    state: tenantId,
  });

  return `${SLACK_OAUTH_URL}?${params.toString()}`;
}

export async function handleOAuthCallback(code: string, tenantId: string) {
  const response = await fetch(`${SLACK_API_BASE}/oauth.v2.access`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.SLACK_CLIENT_ID,
      client_secret: env.SLACK_CLIENT_SECRET,
      code,
      redirect_uri: `${env.OAUTH_REDIRECT_BASE_URL}/api/v1/integrations/slack/callback`,
    }),
  });

  const data = (await response.json()) as {
    ok: boolean;
    access_token?: string;
    team?: { id: string; name: string };
    error?: string;
  };

  if (!data.ok) {
    throw new Error(data.error || 'Slack OAuth failed');
  }

  // Store token in tenant settings
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { settings: true },
  });

  const currentSettings = (tenant?.settings as Record<string, unknown>) || {};

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      settings: {
        ...currentSettings,
        slackAccessToken: data.access_token,
        slackTeamId: data.team?.id,
        slackTeamName: data.team?.name,
      },
    },
  });

  return { teamId: data.team?.id, teamName: data.team?.name };
}

async function getSlackToken(tenantId: string): Promise<string> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { settings: true },
  });

  const settings = (tenant?.settings as Record<string, unknown>) || {};
  const token = settings.slackAccessToken as string;

  if (!token) {
    throw new Error('Slack is not connected for this tenant');
  }

  return token;
}

export async function sendMessage(tenantId: string, channel: string, text: string) {
  const token = await getSlackToken(tenantId);

  const response = await fetch(`${SLACK_API_BASE}/chat.postMessage`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ channel, text }),
  });

  const data = (await response.json()) as { ok: boolean; error?: string; ts?: string };

  if (!data.ok) {
    throw new Error(data.error || 'Failed to send Slack message');
  }

  return data;
}

export async function sendDealNotification(tenantId: string, deal: any) {
  const token = await getSlackToken(tenantId);

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { settings: true },
  });
  const settings = (tenant?.settings as Record<string, unknown>) || {};
  const channel = (settings.slackNotificationChannel as string) || '#deals';

  const blocks = [
    {
      type: 'header',
      text: { type: 'plain_text', text: `Deal Update: ${deal.title}` },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Value:* ${deal.value} ${deal.currency || 'EUR'}` },
        { type: 'mrkdwn', text: `*Stage:* ${deal.stageName || 'N/A'}` },
      ],
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Assigned To:* ${deal.assignedToName || 'Unassigned'}` },
        { type: 'mrkdwn', text: `*Expected Close:* ${deal.expectedCloseDate || 'N/A'}` },
      ],
    },
  ];

  const response = await fetch(`${SLACK_API_BASE}/chat.postMessage`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ channel, blocks, text: `Deal Update: ${deal.title}` }),
  });

  const data = (await response.json()) as { ok: boolean; error?: string };

  if (!data.ok) {
    throw new Error(data.error || 'Failed to send deal notification');
  }

  return data;
}

export async function sendLeadNotification(tenantId: string, contact: any) {
  const token = await getSlackToken(tenantId);

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { settings: true },
  });
  const settings = (tenant?.settings as Record<string, unknown>) || {};
  const channel = (settings.slackNotificationChannel as string) || '#leads';

  const fullName = `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Unknown';

  const blocks = [
    {
      type: 'header',
      text: { type: 'plain_text', text: `New Lead: ${fullName}` },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Email:* ${contact.email || 'N/A'}` },
        { type: 'mrkdwn', text: `*Phone:* ${contact.phone || 'N/A'}` },
      ],
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Company:* ${contact.companyName || 'N/A'}` },
        { type: 'mrkdwn', text: `*Source:* ${contact.source || 'N/A'}` },
      ],
    },
  ];

  const response = await fetch(`${SLACK_API_BASE}/chat.postMessage`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ channel, blocks, text: `New Lead: ${fullName}` }),
  });

  const data = (await response.json()) as { ok: boolean; error?: string };

  if (!data.ok) {
    throw new Error(data.error || 'Failed to send lead notification');
  }

  return data;
}

export async function handleSlashCommand(body: any) {
  const { text, team_id } = body;

  // Find tenant by Slack team ID
  const tenants = await prisma.tenant.findMany({
    select: { id: true, settings: true },
  });

  const tenant = tenants.find((t) => {
    const settings = (t.settings as Record<string, unknown>) || {};
    return settings.slackTeamId === team_id;
  });

  if (!tenant) {
    return { response_type: 'ephemeral', text: 'Tenant not linked to this Slack workspace.' };
  }

  const tenantId = tenant.id;
  const query = (text || '').trim();

  if (!query) {
    return { response_type: 'ephemeral', text: 'Usage: /amass <search term>' };
  }

  // Search contacts
  const contacts = await prisma.contact.findMany({
    where: {
      tenantId,
      OR: [
        { firstName: { contains: query, mode: 'insensitive' } },
        { lastName: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
      ],
    },
    take: 5,
    select: { id: true, firstName: true, lastName: true, email: true, phone: true },
  });

  // Search deals
  const deals = await prisma.deal.findMany({
    where: {
      tenantId,
      title: { contains: query, mode: 'insensitive' },
    },
    take: 5,
    select: { id: true, title: true, value: true, currency: true },
  });

  const lines: string[] = [];

  if (contacts.length > 0) {
    lines.push('*Contacts:*');
    for (const c of contacts) {
      lines.push(`  - ${c.firstName} ${c.lastName} (${c.email || c.phone || 'no contact info'})`);
    }
  }

  if (deals.length > 0) {
    lines.push('*Deals:*');
    for (const d of deals) {
      lines.push(`  - ${d.title} (${d.value} ${d.currency})`);
    }
  }

  if (lines.length === 0) {
    lines.push(`No results found for "${query}".`);
  }

  return { response_type: 'ephemeral', text: lines.join('\n') };
}

export function verifySlackSignature(
  signature: string,
  timestamp: string,
  body: string,
  signingSecret: string,
): boolean {
  const baseString = `v0:${timestamp}:${body}`;
  const hmac = crypto.createHmac('sha256', signingSecret).update(baseString).digest('hex');
  const expectedSignature = `v0=${hmac}`;

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature),
  );
}
