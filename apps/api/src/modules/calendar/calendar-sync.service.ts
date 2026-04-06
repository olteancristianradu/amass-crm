import { prisma } from '../../config/database';
import { env } from '../../config/env';

export class CalendarSyncService {
  getGoogleAuthUrl(userId: string, tenantId: string): string {
    const params = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      redirect_uri: `${env.OAUTH_REDIRECT_BASE_URL}/api/v1/calendar/sync/google/callback`,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/calendar.events',
      access_type: 'offline',
      prompt: 'consent',
      state: JSON.stringify({ userId, tenantId }),
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async connectGoogle(userId: string, tenantId: string, code: string) {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${env.OAUTH_REDIRECT_BASE_URL}/api/v1/calendar/sync/google/callback`,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await response.json() as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
      error?: string;
    };

    if (tokens.error) {
      throw new Error(`Google token exchange failed: ${tokens.error}`);
    }

    // Fetch user email from Google
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const profile = await profileRes.json() as { email: string };

    const connection = await prisma.calendarConnection.upsert({
      where: { userId_provider: { userId, provider: 'google' } },
      create: {
        userId,
        provider: 'google',
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        email: profile.email || '',
      },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        email: profile.email || '',
        isActive: true,
      },
    });

    return connection;
  }

  getOutlookAuthUrl(userId: string, tenantId: string): string {
    const params = new URLSearchParams({
      client_id: env.MICROSOFT_CLIENT_ID,
      redirect_uri: `${env.OAUTH_REDIRECT_BASE_URL}/api/v1/calendar/sync/outlook/callback`,
      response_type: 'code',
      scope: 'Calendars.ReadWrite offline_access',
      state: JSON.stringify({ userId, tenantId }),
    });
    return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
  }

  async connectOutlook(userId: string, tenantId: string, code: string) {
    const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.MICROSOFT_CLIENT_ID,
        client_secret: env.MICROSOFT_CLIENT_SECRET,
        redirect_uri: `${env.OAUTH_REDIRECT_BASE_URL}/api/v1/calendar/sync/outlook/callback`,
        grant_type: 'authorization_code',
      }).toString(),
    });

    const tokens = await response.json() as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
      error?: string;
    };

    if (tokens.error) {
      throw new Error(`Outlook token exchange failed: ${tokens.error}`);
    }

    // Fetch user email from Microsoft Graph
    const profileRes = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const profile = await profileRes.json() as { mail?: string; userPrincipalName?: string };

    const connection = await prisma.calendarConnection.upsert({
      where: { userId_provider: { userId, provider: 'outlook' } },
      create: {
        userId,
        provider: 'outlook',
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        email: profile.mail || profile.userPrincipalName || '',
      },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        email: profile.mail || profile.userPrincipalName || '',
        isActive: true,
      },
    });

    return connection;
  }

  async syncFromProvider(connectionId: string) {
    const connection = await prisma.calendarConnection.findUnique({
      where: { id: connectionId },
      include: { user: { select: { tenantId: true } } },
    });

    if (!connection) {
      throw new Error('Calendar connection not found');
    }

    // Refresh tokens if expired
    if (connection.expiresAt && connection.expiresAt <= new Date()) {
      await this.refreshTokens(connectionId);
    }

    // Re-read after potential refresh
    const freshConnection = await prisma.calendarConnection.findUnique({
      where: { id: connectionId },
      include: { user: { select: { tenantId: true } } },
    });
    if (!freshConnection) throw new Error('Calendar connection not found');

    const tenantId = freshConnection.user.tenantId;
    let events: Array<{
      id: string;
      summary?: string;
      subject?: string;
      description?: string;
      bodyPreview?: string;
      start: { dateTime: string } | string;
      end: { dateTime: string } | string;
      location?: { displayName?: string } | string;
      isAllDay?: boolean;
    }> = [];

    const now = new Date();
    const threeMonthsLater = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    if (freshConnection.provider === 'google') {
      const params = new URLSearchParams({
        timeMin: now.toISOString(),
        timeMax: threeMonthsLater.toISOString(),
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: '250',
      });
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
        { headers: { Authorization: `Bearer ${freshConnection.accessToken}` } },
      );
      const data = await res.json() as { items?: typeof events };
      events = data.items || [];
    } else if (freshConnection.provider === 'outlook') {
      const res = await fetch(
        `https://graph.microsoft.com/v1.0/me/calendarview?startDateTime=${now.toISOString()}&endDateTime=${threeMonthsLater.toISOString()}&$top=250`,
        { headers: { Authorization: `Bearer ${freshConnection.accessToken}` } },
      );
      const data = await res.json() as { value?: typeof events };
      events = data.value || [];
    }

    // Upsert calendar events
    for (const event of events) {
      const title =
        (freshConnection.provider === 'google'
          ? (event as { summary?: string }).summary
          : (event as { subject?: string }).subject) || 'Untitled';

      const description =
        freshConnection.provider === 'google'
          ? ((event as { description?: string }).description || '')
          : ((event as { bodyPreview?: string }).bodyPreview || '');

      const startAt =
        typeof event.start === 'string'
          ? new Date(event.start)
          : new Date((event.start as { dateTime: string }).dateTime);

      const endAt =
        typeof event.end === 'string'
          ? new Date(event.end)
          : new Date((event.end as { dateTime: string }).dateTime);

      const location =
        typeof event.location === 'string'
          ? event.location
          : (event.location as { displayName?: string })?.displayName || '';

      await prisma.calendarEvent.upsert({
        where: {
          id: `${freshConnection.provider}_${event.id}`,
        },
        create: {
          tenantId,
          userId: freshConnection.userId,
          title,
          description,
          location,
          startAt,
          endAt,
          allDay: event.isAllDay || false,
          externalId: event.id,
          externalSource: freshConnection.provider,
        },
        update: {
          title,
          description,
          location,
          startAt,
          endAt,
          allDay: event.isAllDay || false,
        },
      });
    }

    return { synced: events.length };
  }

  async pushEvent(connectionId: string, eventId: string) {
    const connection = await prisma.calendarConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new Error('Calendar connection not found');
    }

    if (connection.expiresAt && connection.expiresAt <= new Date()) {
      await this.refreshTokens(connectionId);
    }

    const freshConnection = await prisma.calendarConnection.findUnique({
      where: { id: connectionId },
    });
    if (!freshConnection) throw new Error('Calendar connection not found');

    const event = await prisma.calendarEvent.findUnique({ where: { id: eventId } });
    if (!event) {
      throw new Error('Calendar event not found');
    }

    if (freshConnection.provider === 'google') {
      const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${freshConnection.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary: event.title,
          description: event.description,
          location: event.location,
          start: { dateTime: event.startAt.toISOString() },
          end: { dateTime: event.endAt.toISOString() },
        }),
      });
      const created = await res.json() as { id: string };

      await prisma.calendarEvent.update({
        where: { id: eventId },
        data: { externalId: created.id, externalSource: 'google' },
      });

      return created;
    } else if (freshConnection.provider === 'outlook') {
      const res = await fetch('https://graph.microsoft.com/v1.0/me/events', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${freshConnection.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: event.title,
          body: { contentType: 'Text', content: event.description },
          start: { dateTime: event.startAt.toISOString(), timeZone: 'UTC' },
          end: { dateTime: event.endAt.toISOString(), timeZone: 'UTC' },
          location: { displayName: event.location },
        }),
      });
      const created = await res.json() as { id: string };

      await prisma.calendarEvent.update({
        where: { id: eventId },
        data: { externalId: created.id, externalSource: 'outlook' },
      });

      return created;
    }

    throw new Error(`Unsupported provider: ${freshConnection.provider}`);
  }

  async disconnect(connectionId: string) {
    await prisma.calendarConnection.delete({ where: { id: connectionId } });
  }

  async refreshTokens(connectionId: string) {
    const connection = await prisma.calendarConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new Error('Calendar connection not found');
    }

    if (connection.provider === 'google') {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: env.GOOGLE_CLIENT_ID,
          client_secret: env.GOOGLE_CLIENT_SECRET,
          refresh_token: connection.refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      const tokens = await response.json() as {
        access_token: string;
        expires_in: number;
        error?: string;
      };

      if (tokens.error) {
        throw new Error(`Google token refresh failed: ${tokens.error}`);
      }

      await prisma.calendarConnection.update({
        where: { id: connectionId },
        data: {
          accessToken: tokens.access_token,
          expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        },
      });
    } else if (connection.provider === 'outlook') {
      const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: env.MICROSOFT_CLIENT_ID,
          client_secret: env.MICROSOFT_CLIENT_SECRET,
          refresh_token: connection.refreshToken,
          grant_type: 'refresh_token',
        }).toString(),
      });

      const tokens = await response.json() as {
        access_token: string;
        refresh_token?: string;
        expires_in: number;
        error?: string;
      };

      if (tokens.error) {
        throw new Error(`Outlook token refresh failed: ${tokens.error}`);
      }

      await prisma.calendarConnection.update({
        where: { id: connectionId },
        data: {
          accessToken: tokens.access_token,
          ...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {}),
          expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        },
      });
    }
  }
}
