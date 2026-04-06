import { prisma } from '../../config/database';

export function injectTracking(emailId: string, htmlBody: string, baseUrl: string): string {
  // Insert 1x1 tracking pixel before </body>
  const pixelUrl = `${baseUrl}/api/v1/email-tracking/track/open/${emailId}`;
  const pixel = `<img src="${pixelUrl}" width="1" height="1" style="display:none" alt="" />`;
  let tracked = htmlBody.replace('</body>', `${pixel}</body>`);

  // If no </body> tag, append pixel at end
  if (!tracked.includes(pixelUrl)) {
    tracked = tracked + pixel;
  }

  // Rewrite <a href="..."> to tracking redirects
  tracked = tracked.replace(
    /<a\s([^>]*?)href="(https?:\/\/[^"]+)"([^>]*?)>/gi,
    (_match, before, url, after) => {
      const trackUrl = `${baseUrl}/api/v1/email-tracking/track/click/${emailId}?url=${encodeURIComponent(url)}`;
      return `<a ${before}href="${trackUrl}"${after}>`;
    },
  );

  return tracked;
}

export async function recordOpen(emailId: string, ip?: string, userAgent?: string) {
  const message = await prisma.emailMessage.findUnique({
    where: { id: emailId },
    select: { id: true, openedAt: true },
  });

  if (!message) return;

  const updateData: Record<string, unknown> = {};

  if (!message.openedAt) {
    updateData.openedAt = new Date();
  }

  await prisma.emailMessage.update({
    where: { id: emailId },
    data: {
      ...updateData,
      openedAt: updateData.openedAt as Date | undefined ?? message.openedAt ?? new Date(),
    },
  });
}

export async function recordClick(emailId: string, url: string, ip?: string) {
  const message = await prisma.emailMessage.findUnique({
    where: { id: emailId },
    select: { id: true, clickedAt: true },
  });

  if (!message) return;

  if (!message.clickedAt) {
    await prisma.emailMessage.update({
      where: { id: emailId },
      data: { clickedAt: new Date() },
    });
  }
}

export async function getTrackingStats(emailId: string) {
  const message = await prisma.emailMessage.findUnique({
    where: { id: emailId },
    select: {
      id: true,
      openedAt: true,
      clickedAt: true,
      status: true,
      sentAt: true,
    },
  });

  if (!message) {
    throw new Error('Email message not found');
  }

  return {
    opens: message.openedAt ? 1 : 0,
    clicks: message.clickedAt ? 1 : 0,
    firstOpenAt: message.openedAt,
    clickedLinks: message.clickedAt ? [] : [],
  };
}
