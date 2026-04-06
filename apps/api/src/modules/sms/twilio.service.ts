import twilio from 'twilio';
import { Request } from 'express';
import { prisma } from '../../config/database';
import { env } from '../../config/env';

const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);

/**
 * Sends an SMS message via Twilio and creates an SmsMessage record in the database.
 *
 * @param tenantId - The tenant identifier for multi-tenant isolation.
 * @param to - The recipient phone number in E.164 format.
 * @param body - The text content of the SMS message.
 * @param contactId - Optional contact identifier to associate the message with.
 * @returns The created SmsMessage database record.
 */
export async function sendSms(
  tenantId: string,
  to: string,
  body: string,
  contactId?: string,
) {
  const message = await client.messages.create({
    to,
    from: env.TWILIO_PHONE_NUMBER,
    body,
    statusCallback: `${env.BASE_URL}/api/v1/sms/webhook/status`,
  });

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

  const smsRecord = await prisma.smsMessage.create({
    data: {
      tenantId,
      contactId: resolvedContactId,
      direction: 'outbound',
      fromNumber: env.TWILIO_PHONE_NUMBER,
      toNumber: to,
      body,
      status: message.status || 'queued',
      externalId: message.sid,
    },
  });

  return smsRecord;
}

/**
 * Handles an inbound SMS webhook from Twilio. Parses the Twilio request body,
 * matches the sender phone number to an existing contact, and creates an
 * SmsMessage record with direction "inbound".
 *
 * @param req - The Express request object containing the Twilio inbound SMS payload.
 * @returns The created SmsMessage database record.
 */
export async function handleInboundWebhook(req: Request) {
  const { From, To, Body, MessageSid } = req.body as {
    From: string;
    To: string;
    Body: string;
    MessageSid: string;
  };

  // Try to match a contact by phone number across all tenants that use this Twilio number
  const contact = await prisma.contact.findFirst({
    where: {
      OR: [{ phone: From }, { mobile: From }],
    },
    select: { id: true, tenantId: true },
  });

  const tenantId = contact?.tenantId || '';

  const smsRecord = await prisma.smsMessage.create({
    data: {
      tenantId,
      contactId: contact?.id || null,
      direction: 'inbound',
      fromNumber: From,
      toNumber: To,
      body: Body,
      status: 'received',
      externalId: MessageSid,
    },
  });

  return smsRecord;
}

/**
 * Handles a Twilio status callback webhook. Looks up the SmsMessage by its
 * Twilio MessageSid (stored as externalId) and updates the status field to
 * reflect the latest delivery status (e.g., "delivered", "failed", "undelivered").
 *
 * @param req - The Express request object containing the Twilio status callback payload.
 * @returns The updated SmsMessage record, or null if no matching record was found.
 */
export async function handleStatusCallback(req: Request) {
  const { MessageSid, MessageStatus } = req.body as {
    MessageSid: string;
    MessageStatus: string;
  };

  const existing = await prisma.smsMessage.findFirst({
    where: { externalId: MessageSid },
  });

  if (!existing) {
    return null;
  }

  const updated = await prisma.smsMessage.update({
    where: { id: existing.id },
    data: { status: MessageStatus },
  });

  return updated;
}
