import crypto from 'crypto';
import { Request } from 'express';
import { prisma } from '../../config/database';
import { env } from '../../config/env';

const GRAPH_API_BASE = 'https://graph.facebook.com/v18.0';

/**
 * Sends a WhatsApp text message via the Meta Graph API (WhatsApp Cloud API)
 * and creates an SmsMessage record in the database with direction "outbound".
 *
 * @param tenantId - The tenant identifier for multi-tenant isolation.
 * @param to - The recipient phone number in international format (without "+").
 * @param body - The text content of the message.
 * @param contactId - Optional contact identifier to associate the message with.
 * @returns The created SmsMessage database record.
 */
export async function sendMessage(
  tenantId: string,
  to: string,
  body: string,
  contactId?: string,
) {
  const url = `${GRAPH_API_BASE}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { body },
    }),
  });

  const data = (await response.json()) as {
    messages?: Array<{ id: string }>;
    error?: { message: string };
  };

  if (!response.ok) {
    throw new Error(data.error?.message || 'WhatsApp API request failed');
  }

  const waMessageId = data.messages?.[0]?.id || null;

  // Auto-link to contact by phone if contactId not provided
  let resolvedContactId = contactId || null;
  if (!resolvedContactId) {
    const contact = await prisma.contact.findFirst({
      where: {
        tenantId,
        OR: [{ phone: to }, { mobile: to }],
      },
      select: { id: true },
    });
    if (contact) {
      resolvedContactId = contact.id;
    }
  }

  const record = await prisma.smsMessage.create({
    data: {
      tenantId,
      contactId: resolvedContactId,
      direction: 'outbound',
      fromNumber: `whatsapp:${env.WHATSAPP_PHONE_NUMBER_ID}`,
      toNumber: to,
      body,
      status: 'sent',
      externalId: waMessageId,
    },
  });

  return record;
}

/**
 * Sends a WhatsApp template message via the Meta Graph API. Template messages
 * are pre-approved messages used for notifications, alerts, and customer
 * re-engagement outside the 24-hour messaging window.
 *
 * @param tenantId - The tenant identifier for multi-tenant isolation.
 * @param to - The recipient phone number in international format (without "+").
 * @param templateName - The name of the pre-approved WhatsApp message template.
 * @param parameters - Array of parameter values to fill in the template placeholders.
 * @returns The parsed JSON response from the Meta Graph API.
 */
export async function sendTemplate(
  tenantId: string,
  to: string,
  templateName: string,
  parameters: string[],
) {
  const url = `${GRAPH_API_BASE}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const components = parameters.length > 0
    ? [
        {
          type: 'body',
          parameters: parameters.map((value) => ({
            type: 'text',
            text: value,
          })),
        },
      ]
    : [];

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: 'en_US' },
        components,
      },
    }),
  });

  const data = (await response.json()) as {
    messages?: Array<{ id: string }>;
    error?: { message: string };
  };

  if (!response.ok) {
    throw new Error(data.error?.message || 'WhatsApp template send failed');
  }

  // Store template message record
  await prisma.smsMessage.create({
    data: {
      tenantId,
      direction: 'outbound',
      fromNumber: `whatsapp:${env.WHATSAPP_PHONE_NUMBER_ID}`,
      toNumber: to,
      body: `[Template: ${templateName}]`,
      status: 'sent',
      externalId: data.messages?.[0]?.id || null,
    },
  });

  return data;
}

/**
 * Handles the WhatsApp webhook verification challenge. Meta sends a GET request
 * with a hub.verify_token and hub.challenge to confirm webhook ownership. This
 * function verifies the token matches the configured WHATSAPP_WEBHOOK_SECRET and
 * returns the challenge string.
 *
 * @param req - The Express request object containing the verification query parameters.
 * @returns An object with the challenge string if verification succeeds.
 * @throws Error if the verification token does not match.
 */
export function verifyWebhook(req: Request): { challenge: string } {
  const mode = req.query['hub.mode'] as string;
  const token = req.query['hub.verify_token'] as string;
  const challenge = req.query['hub.challenge'] as string;

  if (mode === 'subscribe' && token === env.WHATSAPP_WEBHOOK_SECRET) {
    return { challenge };
  }

  throw new Error('Webhook verification failed');
}

interface WhatsAppWebhookEntry {
  id: string;
  changes: Array<{
    value: {
      messaging_product: string;
      metadata: { phone_number_id: string; display_phone_number: string };
      messages?: Array<{
        id: string;
        from: string;
        type: string;
        timestamp: string;
        text?: { body: string };
      }>;
      statuses?: Array<{
        id: string;
        status: string;
        timestamp: string;
        recipient_id: string;
      }>;
    };
  }>;
}

/**
 * Handles the inbound WhatsApp webhook POST request from Meta. Verifies the
 * request signature using HMAC-SHA256, then processes incoming messages and
 * status updates. For each inbound message, a new SmsMessage record is created.
 * For status updates, existing SmsMessage records are updated.
 *
 * @param req - The Express request object containing the webhook payload and X-Hub-Signature-256 header.
 * @returns An object with the count of processed messages and status updates.
 * @throws Error if the signature verification fails.
 */
export async function handleWebhook(req: Request) {
  // Verify signature
  const signature = req.headers['x-hub-signature-256'] as string;
  if (signature && env.WHATSAPP_WEBHOOK_SECRET) {
    const rawBody = JSON.stringify(req.body);
    const expectedSignature =
      'sha256=' +
      crypto
        .createHmac('sha256', env.WHATSAPP_WEBHOOK_SECRET)
        .update(rawBody)
        .digest('hex');

    if (signature !== expectedSignature) {
      throw new Error('Invalid webhook signature');
    }
  }

  const body = req.body as { entry?: WhatsAppWebhookEntry[] };
  let messagesProcessed = 0;
  let statusesProcessed = 0;

  for (const entry of body.entry || []) {
    for (const change of entry.changes) {
      const value = change.value;

      // Process inbound messages
      if (value.messages) {
        for (const msg of value.messages) {
          const textBody = msg.text?.body || `[${msg.type} message]`;

          // Try to match contact by phone
          const contact = await prisma.contact.findFirst({
            where: {
              OR: [{ phone: msg.from }, { mobile: msg.from }],
            },
            select: { id: true, tenantId: true },
          });

          await prisma.smsMessage.create({
            data: {
              tenantId: contact?.tenantId || '',
              contactId: contact?.id || null,
              direction: 'inbound',
              fromNumber: msg.from,
              toNumber: value.metadata.display_phone_number,
              body: textBody,
              status: 'received',
              externalId: msg.id,
            },
          });

          messagesProcessed++;
        }
      }

      // Process status updates
      if (value.statuses) {
        for (const status of value.statuses) {
          const existing = await prisma.smsMessage.findFirst({
            where: { externalId: status.id },
          });

          if (existing) {
            await prisma.smsMessage.update({
              where: { id: existing.id },
              data: { status: status.status },
            });
            statusesProcessed++;
          }
        }
      }
    }
  }

  return { messagesProcessed, statusesProcessed };
}
