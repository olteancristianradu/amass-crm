import Twilio from 'twilio';
import { prisma } from '../../config/database';
import { env } from '../../config/env';

const twilioClient = env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN
  ? Twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN)
  : null;

/**
 * Initiates an outbound phone call via the Twilio API and records it in the database.
 *
 * @param tenantId - The tenant identifier for multi-tenant isolation.
 * @param userId - The ID of the user initiating the call.
 * @param to - The destination phone number in E.164 format.
 * @param contactId - Optional contact ID to associate the call with.
 * @returns The created Call database record.
 */
export async function initiateCall(
  tenantId: string,
  userId: string,
  to: string,
  contactId?: string,
) {
  // Create the call record first
  const call = await prisma.call.create({
    data: {
      tenantId,
      userId,
      clientId: contactId || '',
      toNumber: to,
      fromNumber: env.TWILIO_PHONE_NUMBER,
      direction: 'outbound',
      stage: 'initiated',
      status: 'initiating',
      contactId: contactId || null,
    },
  });

  if (!twilioClient) {
    // Update status to reflect no Twilio config
    await prisma.call.update({
      where: { id: call.id },
      data: { status: 'failed', stage: 'failed' },
    });
    throw new Error('Twilio is not configured');
  }

  try {
    const twimlUrl = `${env.BASE_URL}/api/v1/calls/twiml/${call.id}`;
    const statusCallback = `${env.BASE_URL}/api/v1/calls/webhook/status`;

    const twilioCall = await twilioClient.calls.create({
      to,
      from: env.TWILIO_PHONE_NUMBER,
      url: twimlUrl,
      statusCallback,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      record: true,
    });

    await prisma.call.update({
      where: { id: call.id },
      data: {
        callSid: twilioCall.sid,
        status: 'initiated',
      },
    });

    return prisma.call.findUniqueOrThrow({ where: { id: call.id } });
  } catch (err) {
    await prisma.call.update({
      where: { id: call.id },
      data: { status: 'failed', stage: 'failed' },
    });
    throw err;
  }
}

/**
 * Handles a Twilio status webhook callback, updating the call record with
 * the current status and optional duration.
 *
 * @param callSid - The Twilio Call SID identifying the call.
 * @param status - The current call status (e.g., 'ringing', 'in-progress', 'completed').
 * @param duration - Optional call duration in seconds, provided when the call completes.
 * @returns The updated Call database record, or null if the call is not found.
 */
export async function handleStatusWebhook(
  callSid: string,
  status: string,
  duration?: number,
) {
  const call = await prisma.call.findFirst({ where: { callSid } });
  if (!call) return null;

  const updateData: Record<string, unknown> = { status };
  if (duration !== undefined) {
    updateData.duration = duration;
  }

  // Map terminal statuses to stage
  if (['completed', 'busy', 'no-answer', 'canceled', 'failed'].includes(status)) {
    updateData.stage = status === 'completed' ? 'completed' : 'failed';
  }

  return prisma.call.update({
    where: { id: call.id },
    data: updateData,
  });
}

/**
 * Handles a Twilio recording webhook callback, storing the recording URL and
 * recording SID on the corresponding call record.
 *
 * @param callSid - The Twilio Call SID identifying the call.
 * @param recordingUrl - The URL where the recording can be accessed.
 * @param recordingSid - The unique Twilio Recording SID.
 * @returns The updated Call database record, or null if the call is not found.
 */
export async function handleRecordingWebhook(
  callSid: string,
  recordingUrl: string,
  recordingSid: string,
) {
  const call = await prisma.call.findFirst({ where: { callSid } });
  if (!call) return null;

  return prisma.call.update({
    where: { id: call.id },
    data: { recordingUrl, recordingSid },
  });
}

/**
 * Retrieves a paginated list of calls for a given tenant, supporting optional
 * filters for status, user, and date range.
 *
 * @param tenantId - The tenant identifier for multi-tenant isolation.
 * @param filters - Optional filtering and pagination parameters.
 * @returns An object containing the list of calls, total count, and pagination metadata.
 */
export async function getCallLog(
  tenantId: string,
  filters: {
    page?: number;
    limit?: number;
    status?: string;
    userId?: string;
    from?: string;
    to?: string;
  } = {},
) {
  const page = filters.page || 1;
  const limit = filters.limit || 25;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { tenantId };
  if (filters.status) where.status = filters.status;
  if (filters.userId) where.userId = filters.userId;
  if (filters.from || filters.to) {
    where.createdAt = {
      ...(filters.from ? { gte: new Date(filters.from) } : {}),
      ...(filters.to ? { lte: new Date(filters.to) } : {}),
    };
  }

  const [calls, total] = await Promise.all([
    prisma.call.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.call.count({ where }),
  ]);

  return {
    data: calls,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Retrieves a single call record by its ID.
 *
 * @param callId - The unique identifier of the call.
 * @returns The Call database record.
 * @throws Error if the call is not found.
 */
export async function getCallById(callId: string) {
  const call = await prisma.call.findUnique({ where: { id: callId } });
  if (!call) throw new Error('Call not found');
  return call;
}

/**
 * Generates a TwiML XML response for the given call, instructing Twilio to
 * dial the destination number and record the conversation.
 *
 * @param callId - The unique identifier of the call to generate TwiML for.
 * @returns A TwiML XML string.
 * @throws Error if the call is not found.
 */
export async function generateTwiML(callId: string) {
  const call = await prisma.call.findUnique({ where: { id: callId } });
  if (!call) throw new Error('Call not found');

  const recordingCallback = `${env.BASE_URL}/api/v1/calls/webhook/recording`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial record="record-from-answer-dual" recordingStatusCallback="${recordingCallback}">
    <Number>${call.toNumber}</Number>
  </Dial>
</Response>`;
}
