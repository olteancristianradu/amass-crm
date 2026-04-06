import { prisma } from '../../config/database';
import { ReportService } from './report.service';
import { env } from '../../config/env';
import { NotFoundError } from '../../utils/errors';

const reportService = new ReportService();

let schedulerInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Determines whether a scheduled report should run now based on its schedule
 * string and when it last ran. Supports "daily", "weekly", "monthly", and
 * cron-like hour specifications such as "daily:09" (daily at 9 AM).
 * @param schedule - The schedule string (e.g. "daily", "weekly", "monthly", "daily:09")
 * @param lastRun - The timestamp of the last execution, if any
 * @returns True if the report should execute now
 */
export function shouldRunNow(schedule: string, lastRun?: Date | null): boolean {
  const now = new Date();

  if (!lastRun) return true;

  const diffMs = now.getTime() - lastRun.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = diffHours / 24;

  const [frequency, hourStr] = schedule.split(':');
  const targetHour = hourStr ? parseInt(hourStr, 10) : undefined;

  // If a target hour is specified, only trigger during that hour
  if (targetHour !== undefined && now.getHours() !== targetHour) {
    return false;
  }

  switch (frequency) {
    case 'daily':
      return diffHours >= 23;
    case 'weekly':
      return diffDays >= 6.5;
    case 'monthly':
      return diffDays >= 28;
    default:
      return diffHours >= 23;
  }
}

/**
 * Executes a single scheduled report: runs the report with saved config
 * and sends the result to the recipients stored in the report config.
 * Updates the lastRunAt timestamp on completion.
 * @param report - The saved report record from the database
 */
export async function executeScheduledReport(report: {
  id: string;
  tenantId: string;
  type: string;
  config: unknown;
}): Promise<void> {
  try {
    const config = (report.config as Record<string, unknown>) || {};
    const reportType = report.type as 'pipeline_forecast' | 'conversion_funnel' | 'revenue' | 'activity' | 'team_performance' | 'win_loss';

    await reportService.runReport(report.tenantId, reportType, config);

    // Send email if SMTP is configured and recipients are present
    const recipients = config.recipients as string[] | undefined;
    if (recipients && recipients.length > 0 && env.SMTP_HOST) {
      // Email delivery is best-effort; failures are logged but do not throw
      try {
        const nodemailer: any = await import('nodemailer');
        const transporter = nodemailer.createTransport({
          host: env.SMTP_HOST,
          port: env.SMTP_PORT,
          auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
        });

        const csv = await reportService.exportCsv(report.tenantId, reportType, config);
        await transporter.sendMail({
          from: env.SMTP_FROM,
          to: recipients.join(','),
          subject: `Scheduled Report: ${report.type}`,
          text: 'Your scheduled report is attached.',
          attachments: [{ filename: `report-${report.type}.csv`, content: csv }],
        });
      } catch (emailErr) {
        console.error(`Failed to send scheduled report email for ${report.id}:`, emailErr);
      }
    }

    await prisma.savedReport.update({
      where: { id: report.id },
      data: { lastRunAt: new Date() },
    });
  } catch (err) {
    console.error(`Scheduled report ${report.id} failed:`, err);
  }
}

/**
 * Starts the report scheduler that runs every 60 seconds, checking
 * for SavedReports with a non-null schedule field and executing those
 * that are due based on their schedule and lastRunAt timestamp.
 */
export function startScheduler(): void {
  if (schedulerInterval) return;

  schedulerInterval = setInterval(async () => {
    try {
      const reports = await prisma.savedReport.findMany({
        where: { schedule: { not: null } },
      });

      for (const report of reports) {
        if (report.schedule && shouldRunNow(report.schedule, report.lastRunAt)) {
          await executeScheduledReport(report);
        }
      }
    } catch (err) {
      console.error('Report scheduler tick failed:', err);
    }
  }, 60_000);
}

/**
 * Saves a schedule configuration on an existing report, specifying
 * when it should auto-run and who should receive the results.
 * @param reportId - The ID of the saved report to schedule
 * @param schedule - Schedule string (e.g. "daily", "weekly", "monthly", "daily:09")
 * @param recipients - Array of email addresses to receive the report
 * @returns The updated saved report
 */
export async function scheduleReport(
  reportId: string,
  schedule: string,
  recipients: string[],
): Promise<unknown> {
  const report = await prisma.savedReport.findUnique({ where: { id: reportId } });
  if (!report) {
    throw new NotFoundError('Report');
  }

  const existingConfig = (report.config as Record<string, unknown>) || {};
  const updated = await prisma.savedReport.update({
    where: { id: reportId },
    data: {
      schedule,
      config: { ...existingConfig, recipients } as object,
    },
  });

  return updated;
}

/**
 * Clears the schedule from a saved report, stopping it from being
 * automatically executed by the scheduler.
 * @param reportId - The ID of the saved report to unschedule
 * @returns The updated saved report
 */
export async function unscheduleReport(reportId: string): Promise<unknown> {
  const report = await prisma.savedReport.findUnique({ where: { id: reportId } });
  if (!report) {
    throw new NotFoundError('Report');
  }

  const existingConfig = (report.config as Record<string, unknown>) || {};
  delete existingConfig.recipients;

  const updated = await prisma.savedReport.update({
    where: { id: reportId },
    data: {
      schedule: null,
      config: existingConfig as object,
    },
  });

  return updated;
}
