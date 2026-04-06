import { Request, Response } from 'express';
import { RevenueService } from './revenue.service';

const revenueService = new RevenueService();

/**
 * Returns aggregate revenue metrics (MRR, ARR, churn, etc.) for the authenticated tenant.
 * Accepts optional `from` and `to` query parameters to filter by date range.
 */
export async function getRevenueMetrics(req: Request, res: Response): Promise<void> {
  try {
    const dateRange = {
      from: req.query.from ? new Date(req.query.from as string) : undefined,
      to: req.query.to ? new Date(req.query.to as string) : undefined,
    };
    const metrics = await revenueService.getRevenueMetrics(req.user!.tenantId, dateRange);
    res.json(metrics);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch revenue metrics';
    res.status(400).json({ error: message });
  }
}

/**
 * Returns a monthly revenue timeline for the authenticated tenant.
 * Accepts an optional `months` query parameter (default 12).
 */
export async function getRevenueTimeline(req: Request, res: Response): Promise<void> {
  try {
    const months = req.query.months ? parseInt(req.query.months as string, 10) : 12;
    const timeline = await revenueService.getRevenueTimeline(req.user!.tenantId, months);
    res.json(timeline);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch revenue timeline';
    res.status(400).json({ error: message });
  }
}

/**
 * Returns cohort analysis data, grouping deals by creation month
 * and tracking conversion rates for the authenticated tenant.
 */
export async function getCohortAnalysis(req: Request, res: Response): Promise<void> {
  try {
    const cohorts = await revenueService.getCohortAnalysis(req.user!.tenantId);
    res.json(cohorts);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch cohort analysis';
    res.status(400).json({ error: message });
  }
}

/**
 * Returns revenue broken down by pipeline for the authenticated tenant.
 */
export async function getRevenueByPipeline(req: Request, res: Response): Promise<void> {
  try {
    const data = await revenueService.getRevenueByPipeline(req.user!.tenantId);
    res.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch pipeline revenue';
    res.status(400).json({ error: message });
  }
}

/**
 * Returns revenue broken down by user (sales rep) for the authenticated tenant.
 */
export async function getRevenueByUser(req: Request, res: Response): Promise<void> {
  try {
    const data = await revenueService.getRevenueByUser(req.user!.tenantId);
    res.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch user revenue';
    res.status(400).json({ error: message });
  }
}
