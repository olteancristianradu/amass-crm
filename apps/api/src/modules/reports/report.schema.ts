import { z } from 'zod';

export const createReportSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(['pipeline_forecast', 'conversion_funnel', 'revenue', 'activity', 'team_performance', 'win_loss']),
  config: z.record(z.unknown()),
  schedule: z.string().optional(),
});

export const updateReportSchema = createReportSchema.partial();

export const runReportSchema = z.object({
  type: z.enum(['pipeline_forecast', 'conversion_funnel', 'revenue', 'activity', 'team_performance', 'win_loss']),
  config: z.record(z.unknown()).optional(),
});

export const dashboardWidgetSchema = z.object({
  widgetType: z.enum(['kpi_card', 'chart', 'table', 'funnel', 'leaderboard']),
  config: z.record(z.unknown()),
  position: z.object({ x: z.number(), y: z.number(), w: z.number(), h: z.number() }),
});
