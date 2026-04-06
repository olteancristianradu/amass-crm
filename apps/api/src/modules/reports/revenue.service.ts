import { prisma } from '../../config/database';

interface DateRange {
  from?: Date;
  to?: Date;
}

interface RevenueMetrics {
  totalRevenue: number;
  monthlyRevenue: number;
  mrr: number;
  arr: number;
  churnRate: number;
  avgDealSize: number;
}

interface TimelineEntry {
  month: string;
  revenue: number;
  deals: number;
  mrr: number;
}

interface CohortEntry {
  cohortMonth: string;
  totalDeals: number;
  wonDeals: number;
  conversionRate: number;
  totalValue: number;
}

interface PipelineRevenue {
  pipelineId: string;
  pipelineName: string;
  totalRevenue: number;
  dealCount: number;
  avgDealSize: number;
}

interface UserRevenue {
  userId: string;
  userName: string;
  totalRevenue: number;
  dealCount: number;
  avgDealSize: number;
}

export class RevenueService {
  /**
   * Computes aggregate revenue metrics for a tenant, including total revenue,
   * current month revenue, MRR, ARR, churn rate, and average deal size.
   * @param tenantId - The tenant identifier
   * @param dateRange - Optional date range filter for revenue calculations
   * @returns Revenue metrics object
   */
  async getRevenueMetrics(tenantId: string, dateRange?: DateRange): Promise<RevenueMetrics> {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const wonWhere: Record<string, unknown> = { tenantId, wonAt: { not: null } };
    if (dateRange?.from || dateRange?.to) {
      const wonAtFilter: Record<string, Date> = {};
      if (dateRange.from) wonAtFilter.gte = dateRange.from;
      if (dateRange.to) wonAtFilter.lte = dateRange.to;
      wonWhere.wonAt = { not: null, ...wonAtFilter };
    }

    const [allWon, currentMonthWon, totalDeals, lostDeals] = await Promise.all([
      prisma.deal.aggregate({
        where: wonWhere,
        _sum: { value: true },
        _count: true,
      }),
      prisma.deal.aggregate({
        where: {
          tenantId,
          wonAt: { gte: currentMonthStart, lte: currentMonthEnd },
        },
        _sum: { value: true },
        _count: true,
      }),
      prisma.deal.count({
        where: { tenantId, closedAt: { not: null } },
      }),
      prisma.deal.count({
        where: { tenantId, lostAt: { not: null } },
      }),
    ]);

    const totalRevenue = Number(allWon._sum.value || 0);
    const wonCount = allWon._count;
    const monthlyRevenue = Number(currentMonthWon._sum.value || 0);
    const avgDealSize = wonCount > 0 ? Math.round(totalRevenue / wonCount) : 0;

    // MRR is approximated as total won revenue divided by months of activity
    const firstDeal = await prisma.deal.findFirst({
      where: { tenantId, wonAt: { not: null } },
      orderBy: { wonAt: 'asc' },
      select: { wonAt: true },
    });

    let mrr = monthlyRevenue;
    if (firstDeal?.wonAt) {
      const monthsActive = Math.max(
        1,
        (now.getFullYear() - firstDeal.wonAt.getFullYear()) * 12 +
          (now.getMonth() - firstDeal.wonAt.getMonth()) + 1,
      );
      mrr = Math.round(totalRevenue / monthsActive);
    }

    const arr = mrr * 12;
    const churnRate = totalDeals > 0
      ? Math.round((lostDeals / totalDeals) * 10000) / 100
      : 0;

    return { totalRevenue, monthlyRevenue, mrr, arr, churnRate, avgDealSize };
  }

  /**
   * Returns a monthly revenue timeline for the specified number of past months.
   * Each entry contains month label, total revenue, deal count, and MRR.
   * @param tenantId - The tenant identifier
   * @param months - Number of past months to include (default 12)
   * @returns Array of timeline entries sorted chronologically
   */
  async getRevenueTimeline(tenantId: string, months: number = 12): Promise<TimelineEntry[]> {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

    const deals = await prisma.deal.findMany({
      where: {
        tenantId,
        wonAt: { not: null, gte: startDate },
      },
      select: { value: true, wonAt: true },
      orderBy: { wonAt: 'asc' },
    });

    const buckets: Record<string, { revenue: number; deals: number }> = {};

    // Initialize all months
    for (let i = 0; i < months; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - months + 1 + i, 1);
      const key = d.toISOString().substring(0, 7);
      buckets[key] = { revenue: 0, deals: 0 };
    }

    for (const deal of deals) {
      if (!deal.wonAt) continue;
      const key = deal.wonAt.toISOString().substring(0, 7);
      if (buckets[key]) {
        buckets[key].revenue += Number(deal.value);
        buckets[key].deals += 1;
      }
    }

    const sortedMonths = Object.keys(buckets).sort();
    let runningTotal = 0;
    let monthCount = 0;

    return sortedMonths.map((month) => {
      runningTotal += buckets[month].revenue;
      monthCount += 1;
      return {
        month,
        revenue: buckets[month].revenue,
        deals: buckets[month].deals,
        mrr: Math.round(runningTotal / monthCount),
      };
    });
  }

  /**
   * Groups deals by their creation month and tracks conversion percentages
   * from created to won status for each cohort.
   * @param tenantId - The tenant identifier
   * @returns Array of cohort entries with conversion statistics
   */
  async getCohortAnalysis(tenantId: string): Promise<CohortEntry[]> {
    const deals = await prisma.deal.findMany({
      where: { tenantId },
      select: {
        createdAt: true,
        wonAt: true,
        value: true,
      },
    });

    const cohorts: Record<string, { total: number; won: number; value: number }> = {};

    for (const deal of deals) {
      const cohortKey = deal.createdAt.toISOString().substring(0, 7);
      if (!cohorts[cohortKey]) {
        cohorts[cohortKey] = { total: 0, won: 0, value: 0 };
      }
      cohorts[cohortKey].total += 1;
      if (deal.wonAt) {
        cohorts[cohortKey].won += 1;
        cohorts[cohortKey].value += Number(deal.value);
      }
    }

    return Object.keys(cohorts)
      .sort()
      .map((cohortMonth) => ({
        cohortMonth,
        totalDeals: cohorts[cohortMonth].total,
        wonDeals: cohorts[cohortMonth].won,
        conversionRate:
          cohorts[cohortMonth].total > 0
            ? Math.round((cohorts[cohortMonth].won / cohorts[cohortMonth].total) * 10000) / 100
            : 0,
        totalValue: cohorts[cohortMonth].value,
      }));
  }

  /**
   * Breaks down revenue by pipeline, returning totals and averages for
   * each pipeline the tenant has configured.
   * @param tenantId - The tenant identifier
   * @returns Array of per-pipeline revenue breakdowns
   */
  async getRevenueByPipeline(tenantId: string): Promise<PipelineRevenue[]> {
    const pipelines = await prisma.pipeline.findMany({
      where: { tenantId },
      select: { id: true, name: true },
    });

    const results = await Promise.all(
      pipelines.map(async (pipeline) => {
        const agg = await prisma.deal.aggregate({
          where: { tenantId, pipelineId: pipeline.id, wonAt: { not: null } },
          _sum: { value: true },
          _count: true,
        });
        const totalRevenue = Number(agg._sum.value || 0);
        const dealCount = agg._count;
        return {
          pipelineId: pipeline.id,
          pipelineName: pipeline.name,
          totalRevenue,
          dealCount,
          avgDealSize: dealCount > 0 ? Math.round(totalRevenue / dealCount) : 0,
        };
      }),
    );

    return results.sort((a, b) => b.totalRevenue - a.totalRevenue);
  }

  /**
   * Breaks down revenue by user (sales rep), returning totals and averages
   * for each user in the tenant.
   * @param tenantId - The tenant identifier
   * @returns Array of per-user revenue breakdowns sorted by total revenue
   */
  async getRevenueByUser(tenantId: string): Promise<UserRevenue[]> {
    const users = await prisma.user.findMany({
      where: { tenantId },
      select: { id: true, name: true },
    });

    const results = await Promise.all(
      users.map(async (user) => {
        const agg = await prisma.deal.aggregate({
          where: { tenantId, assignedToId: user.id, wonAt: { not: null } },
          _sum: { value: true },
          _count: true,
        });
        const totalRevenue = Number(agg._sum.value || 0);
        const dealCount = agg._count;
        return {
          userId: user.id,
          userName: user.name,
          totalRevenue,
          dealCount,
          avgDealSize: dealCount > 0 ? Math.round(totalRevenue / dealCount) : 0,
        };
      }),
    );

    return results.sort((a, b) => b.totalRevenue - a.totalRevenue);
  }
}
