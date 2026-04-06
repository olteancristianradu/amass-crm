import { Request, Response } from 'express';
import { DashboardService } from './dashboard.service';

const dashboardService = new DashboardService();

export async function getKpis(req: Request, res: Response): Promise<void> {
  const kpis = await dashboardService.getKpis(req.user!.tenantId);
  res.json(kpis);
}

export async function getLeaderboard(req: Request, res: Response): Promise<void> {
  const leaderboard = await dashboardService.getLeaderboard(req.user!.tenantId);
  res.json(leaderboard);
}

export async function getLossReasons(req: Request, res: Response): Promise<void> {
  const reasons = await dashboardService.getLossReasons(req.user!.tenantId);
  res.json(reasons);
}
