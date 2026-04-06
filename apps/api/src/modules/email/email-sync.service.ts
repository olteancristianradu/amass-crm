/**
 * Email Sync Service — handles OAuth-based Gmail and Outlook integration.
 *
 * Provides functions to connect email accounts via OAuth2, sync inbox messages,
 * send emails through provider APIs, refresh expired tokens, and disconnect accounts.
 */

import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { NotFoundError, AppError } from '../../utils/errors';

// ─── Types ───

interface OAuthTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
}

interface GmailMessage {
  id: string;
  threadId: string;
  payload: {
    headers: Array<{ name: string; value: string }>;
    body?: { data?: string };
    parts?: Array<{ mimeType: string; body?: { data?: string } }>;
  };
  internalDate?: string;
}

interface GraphMailMessage {
  id: string;
  conversationId: string;
  subject: string;
  from: { emailAddress: { address: string } };
  toRecipients: Array<{ emailAddress: { address: string } }>;
  ccRecipients?: Array<{ emailAddress: { address: string } }>;
  body: { content: string; contentType: string };
  receivedDateTime: string;
}

// ─── Helpers ───

/**
 * Performs an HTTP POST request with a JSON or form-encoded body and returns parsed JSON.
 * Uses the native fetch API available in Node 18+.
 *
 * @param url - The endpoint URL to call
 * @param body - Key-value pairs to send as x-www-form-urlencoded
 * @returns Parsed JSON response
 */
async function postForm(url: string, body: Record<string, string>): Promise<OAuthTokenResponse> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body).toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new AppError(`OAuth token exchange failed: ${text}`, 400, 'ERR_OAUTH');
  }

  return response.json() as Promise<OAuthTokenResponse>;
}

/**
 * Performs an authenticated GET request against a provider API.
 *
 * @param url - The API endpoint URL
 * @param accessToken - Bearer token for authentication
 * @returns Parsed JSON response body
 */
async function apiGet<T>(url: string, accessToken: string): Promise<T> {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new AppError(`API request failed (${response.status}): ${text}`, 502, 'ERR_PROVIDER_API');
  }

  return response.json() as Promise<T>;
}

/**
 * Performs an authenticated POST request with a JSON body against a provider API.
 *
 * @param url - The API endpoint URL
 * @param accessToken - Bearer token for authentication
 * @param body - JSON-serializable request body
 * @returns Parsed JSON response body
 */
async function apiPost<T>(url: string, accessToken: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new AppError(`API request failed (${response.status}): ${text}`, 502, 'ERR_PROVIDER_API');
  }

  return response.json() as Promise<T>;
}

/**
 * Extracts a header value from a Gmail message payload by header name.
 *
 * @param headers - Array of name/value header pairs from Gmail API
 * @param name - The header name to look up (case-insensitive)
 * @returns The header value, or an empty string if not found
 */
function getGmailHeader(headers: Array<{ name: string; value: string }>, name: string): string {
  const header = headers.find((h) => h.name.toLowerCase() === name.toLowerCase());
  return header?.value || '';
}

/**
 * Decodes a base64url-encoded string (as used by the Gmail API) to a UTF-8 string.
 *
 * @param data - The base64url-encoded string
 * @returns The decoded UTF-8 string
 */
function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64').toString('utf-8');
}

/**
 * Encodes a raw RFC 2822 email string to the base64url format required by the Gmail API.
 *
 * @param raw - The raw email string (with headers and body)
 * @returns The base64url-encoded representation
 */
function encodeBase64Url(raw: string): string {
  return Buffer.from(raw).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// ─── Service Functions ───

/**
 * Exchanges a Google OAuth2 authorization code for access and refresh tokens,
 * then creates or updates an EmailAccount record for the user.
 *
 * @param userId - The ID of the authenticated user
 * @param tenantId - The tenant ID the user belongs to
 * @param authCode - The authorization code received from the Google OAuth2 callback
 * @returns The created or updated EmailAccount record
 */
export async function connectGmail(userId: string, tenantId: string, authCode: string) {
  const tokens = await postForm('https://oauth2.googleapis.com/token', {
    code: authCode,
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    redirect_uri: env.GOOGLE_REDIRECT_URI,
    grant_type: 'authorization_code',
  });

  // Fetch the user's email address from the Gmail profile
  const profile = await apiGet<{ emailAddress: string }>(
    'https://gmail.googleapis.com/gmail/v1/users/me/profile',
    tokens.access_token,
  );

  // Upsert: update if the same email+provider exists, otherwise create
  const existing = await prisma.emailAccount.findFirst({
    where: { tenantId, userId, provider: 'gmail', email: profile.emailAddress },
  });

  if (existing) {
    return prisma.emailAccount.update({
      where: { id: existing.id },
      data: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || existing.refreshToken,
        settings: { expiresIn: tokens.expires_in, scope: tokens.scope },
        isActive: true,
      },
    });
  }

  return prisma.emailAccount.create({
    data: {
      tenantId,
      userId,
      provider: 'gmail',
      email: profile.emailAddress,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || null,
      settings: { expiresIn: tokens.expires_in, scope: tokens.scope },
      isActive: true,
    },
  });
}

/**
 * Exchanges a Microsoft OAuth2 authorization code for access and refresh tokens,
 * then creates or updates an EmailAccount record for the user.
 *
 * @param userId - The ID of the authenticated user
 * @param tenantId - The tenant ID the user belongs to
 * @param authCode - The authorization code received from the Microsoft OAuth2 callback
 * @returns The created or updated EmailAccount record
 */
export async function connectOutlook(userId: string, tenantId: string, authCode: string) {
  const tokens = await postForm(
    'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    {
      code: authCode,
      client_id: env.MICROSOFT_CLIENT_ID,
      client_secret: env.MICROSOFT_CLIENT_SECRET,
      redirect_uri: env.MICROSOFT_REDIRECT_URI,
      grant_type: 'authorization_code',
      scope: 'https://graph.microsoft.com/Mail.ReadWrite https://graph.microsoft.com/Mail.Send offline_access',
    },
  );

  // Fetch the user's email from Microsoft Graph
  const profile = await apiGet<{ mail?: string; userPrincipalName: string }>(
    'https://graph.microsoft.com/v1.0/me',
    tokens.access_token,
  );

  const email = profile.mail || profile.userPrincipalName;

  const existing = await prisma.emailAccount.findFirst({
    where: { tenantId, userId, provider: 'outlook', email },
  });

  if (existing) {
    return prisma.emailAccount.update({
      where: { id: existing.id },
      data: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || existing.refreshToken,
        settings: { expiresIn: tokens.expires_in, scope: tokens.scope },
        isActive: true,
      },
    });
  }

  return prisma.emailAccount.create({
    data: {
      tenantId,
      userId,
      provider: 'outlook',
      email,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || null,
      settings: { expiresIn: tokens.expires_in, scope: tokens.scope },
      isActive: true,
    },
  });
}

/**
 * Syncs the inbox of the given email account by fetching recent messages from the
 * appropriate provider API (Gmail or Microsoft Graph) and upserting them into the
 * EmailMessage table. Skips messages that already exist (matched by externalId).
 *
 * @param emailAccountId - The ID of the EmailAccount to sync
 * @returns An object containing the count of newly synced messages
 */
export async function syncInbox(emailAccountId: string) {
  const account = await prisma.emailAccount.findUnique({ where: { id: emailAccountId } });
  if (!account) throw new NotFoundError('EmailAccount');
  if (!account.accessToken) throw new AppError('No access token available. Re-connect the account.', 400, 'ERR_NO_TOKEN');

  let synced = 0;

  if (account.provider === 'gmail') {
    synced = await syncGmailInbox(account.id, account.tenantId, account.accessToken, account.email);
  } else if (account.provider === 'outlook') {
    synced = await syncOutlookInbox(account.id, account.tenantId, account.accessToken, account.email);
  }

  return { synced };
}

/**
 * Fetches the 20 most recent messages from a Gmail inbox and upserts them
 * into the local EmailMessage table.
 *
 * @param accountId - The EmailAccount ID in the local database
 * @param tenantId - The tenant ID for scoping
 * @param accessToken - A valid Gmail API access token
 * @param accountEmail - The email address of the connected Gmail account
 * @returns The number of newly inserted messages
 */
async function syncGmailInbox(accountId: string, tenantId: string, accessToken: string, accountEmail: string): Promise<number> {
  const listResponse = await apiGet<{ messages?: Array<{ id: string }> }>(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=20&labelIds=INBOX',
    accessToken,
  );

  if (!listResponse.messages || listResponse.messages.length === 0) return 0;

  let synced = 0;

  for (const item of listResponse.messages) {
    // Skip if already synced
    const exists = await prisma.emailMessage.findFirst({
      where: { accountId, externalId: item.id },
      select: { id: true },
    });
    if (exists) continue;

    const msg = await apiGet<GmailMessage>(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${item.id}?format=full`,
      accessToken,
    );

    const from = getGmailHeader(msg.payload.headers, 'From');
    const to = getGmailHeader(msg.payload.headers, 'To');
    const cc = getGmailHeader(msg.payload.headers, 'Cc');
    const subject = getGmailHeader(msg.payload.headers, 'Subject');

    // Extract body
    let bodyHtml: string | null = null;
    let bodyText: string | null = null;

    if (msg.payload.parts) {
      for (const part of msg.payload.parts) {
        if (part.mimeType === 'text/html' && part.body?.data) {
          bodyHtml = decodeBase64Url(part.body.data);
        } else if (part.mimeType === 'text/plain' && part.body?.data) {
          bodyText = decodeBase64Url(part.body.data);
        }
      }
    } else if (msg.payload.body?.data) {
      bodyText = decodeBase64Url(msg.payload.body.data);
    }

    const fromEmail = from.replace(/.*<([^>]+)>.*/, '$1').trim() || from.trim();
    const isInbound = fromEmail.toLowerCase() !== accountEmail.toLowerCase();

    // Auto-link contact
    const contact = await prisma.contact.findFirst({
      where: { tenantId, email: { equals: isInbound ? fromEmail : to.replace(/.*<([^>]+)>.*/, '$1').trim(), mode: 'insensitive' } },
      select: { id: true },
    });

    await prisma.emailMessage.create({
      data: {
        tenantId,
        accountId,
        contactId: contact?.id || null,
        externalId: msg.id,
        threadId: msg.threadId,
        direction: isInbound ? 'inbound' : 'outbound',
        fromEmail,
        toEmails: to.split(',').map((e) => e.replace(/.*<([^>]+)>.*/, '$1').trim()).filter(Boolean),
        ccEmails: cc ? cc.split(',').map((e) => e.replace(/.*<([^>]+)>.*/, '$1').trim()).filter(Boolean) : [],
        subject,
        bodyHtml,
        bodyText,
        status: isInbound ? 'received' : 'sent',
        receivedAt: msg.internalDate ? new Date(parseInt(msg.internalDate, 10)) : new Date(),
      },
    });

    synced++;
  }

  return synced;
}

/**
 * Fetches the 20 most recent messages from a Microsoft Outlook inbox via
 * the Microsoft Graph API and upserts them into the local EmailMessage table.
 *
 * @param accountId - The EmailAccount ID in the local database
 * @param tenantId - The tenant ID for scoping
 * @param accessToken - A valid Microsoft Graph API access token
 * @param accountEmail - The email address of the connected Outlook account
 * @returns The number of newly inserted messages
 */
async function syncOutlookInbox(accountId: string, tenantId: string, accessToken: string, accountEmail: string): Promise<number> {
  const response = await apiGet<{ value: GraphMailMessage[] }>(
    'https://graph.microsoft.com/v1.0/me/messages?$top=20&$orderby=receivedDateTime desc&$select=id,conversationId,subject,from,toRecipients,ccRecipients,body,receivedDateTime',
    accessToken,
  );

  let synced = 0;

  for (const msg of response.value) {
    const exists = await prisma.emailMessage.findFirst({
      where: { accountId, externalId: msg.id },
      select: { id: true },
    });
    if (exists) continue;

    const fromEmail = msg.from.emailAddress.address;
    const isInbound = fromEmail.toLowerCase() !== accountEmail.toLowerCase();
    const toEmails = msg.toRecipients.map((r) => r.emailAddress.address);
    const ccEmails = msg.ccRecipients?.map((r) => r.emailAddress.address) || [];

    const contactEmail = isInbound ? fromEmail : toEmails[0];
    const contact = contactEmail
      ? await prisma.contact.findFirst({
          where: { tenantId, email: { equals: contactEmail, mode: 'insensitive' } },
          select: { id: true },
        })
      : null;

    const isHtml = msg.body.contentType === 'html';

    await prisma.emailMessage.create({
      data: {
        tenantId,
        accountId,
        contactId: contact?.id || null,
        externalId: msg.id,
        threadId: msg.conversationId,
        direction: isInbound ? 'inbound' : 'outbound',
        fromEmail,
        toEmails,
        ccEmails,
        subject: msg.subject,
        bodyHtml: isHtml ? msg.body.content : null,
        bodyText: isHtml ? null : msg.body.content,
        status: isInbound ? 'received' : 'sent',
        receivedAt: new Date(msg.receivedDateTime),
      },
    });

    synced++;
  }

  return synced;
}

/**
 * Sends an email through the provider API (Gmail or Microsoft Graph) associated
 * with the given email account, and records the sent message in the database.
 *
 * @param emailAccountId - The EmailAccount ID to send from
 * @param to - Recipient email address
 * @param subject - Email subject line
 * @param htmlBody - HTML content of the email body
 * @param contactId - Optional CRM contact ID to link the message to
 * @returns The created EmailMessage record
 */
export async function sendEmail(
  emailAccountId: string,
  to: string,
  subject: string,
  htmlBody: string,
  contactId?: string,
) {
  const account = await prisma.emailAccount.findUnique({ where: { id: emailAccountId } });
  if (!account) throw new NotFoundError('EmailAccount');
  if (!account.accessToken) throw new AppError('No access token. Re-connect the account.', 400, 'ERR_NO_TOKEN');

  if (account.provider === 'gmail') {
    const raw = [
      `From: ${account.email}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      '',
      htmlBody,
    ].join('\r\n');

    await apiPost(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
      account.accessToken,
      { raw: encodeBase64Url(raw) },
    );
  } else if (account.provider === 'outlook') {
    await apiPost(
      'https://graph.microsoft.com/v1.0/me/sendMail',
      account.accessToken,
      {
        message: {
          subject,
          body: { contentType: 'HTML', content: htmlBody },
          toRecipients: [{ emailAddress: { address: to } }],
        },
      },
    );
  }

  // Auto-link contact if not provided
  let resolvedContactId = contactId || null;
  if (!resolvedContactId) {
    const contact = await prisma.contact.findFirst({
      where: { tenantId: account.tenantId, email: { equals: to, mode: 'insensitive' } },
      select: { id: true },
    });
    if (contact) resolvedContactId = contact.id;
  }

  return prisma.emailMessage.create({
    data: {
      tenantId: account.tenantId,
      accountId: account.id,
      contactId: resolvedContactId,
      direction: 'outbound',
      fromEmail: account.email,
      toEmails: [to],
      ccEmails: [],
      subject,
      bodyHtml: htmlBody,
      status: 'sent',
      sentAt: new Date(),
    },
  });
}

/**
 * Refreshes the OAuth2 access token for the given email account using its
 * stored refresh token. Updates the account record with the new access token.
 *
 * @param emailAccountId - The EmailAccount whose tokens should be refreshed
 * @returns The updated EmailAccount record with a fresh access token
 */
export async function refreshTokens(emailAccountId: string) {
  const account = await prisma.emailAccount.findUnique({ where: { id: emailAccountId } });
  if (!account) throw new NotFoundError('EmailAccount');
  if (!account.refreshToken) throw new AppError('No refresh token available. Re-connect the account.', 400, 'ERR_NO_REFRESH_TOKEN');

  let tokens: OAuthTokenResponse;

  if (account.provider === 'gmail') {
    tokens = await postForm('https://oauth2.googleapis.com/token', {
      refresh_token: account.refreshToken,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      grant_type: 'refresh_token',
    });
  } else if (account.provider === 'outlook') {
    tokens = await postForm('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      refresh_token: account.refreshToken,
      client_id: env.MICROSOFT_CLIENT_ID,
      client_secret: env.MICROSOFT_CLIENT_SECRET,
      grant_type: 'refresh_token',
      scope: 'https://graph.microsoft.com/Mail.ReadWrite https://graph.microsoft.com/Mail.Send offline_access',
    });
  } else {
    throw new AppError(`Unsupported provider: ${account.provider}`, 400, 'ERR_UNSUPPORTED_PROVIDER');
  }

  return prisma.emailAccount.update({
    where: { id: account.id },
    data: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || account.refreshToken,
      settings: { expiresIn: tokens.expires_in, scope: tokens.scope },
    },
  });
}

/**
 * Disconnects an email account by deleting it from the database along with
 * all associated email messages (handled by Prisma cascading deletes).
 *
 * @param emailAccountId - The ID of the EmailAccount to remove
 */
export async function disconnectAccount(emailAccountId: string) {
  const account = await prisma.emailAccount.findUnique({ where: { id: emailAccountId } });
  if (!account) throw new NotFoundError('EmailAccount');

  await prisma.emailAccount.delete({ where: { id: emailAccountId } });
}
