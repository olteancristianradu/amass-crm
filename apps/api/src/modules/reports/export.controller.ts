import { Request, Response } from 'express';
import {
  exportDealsPdf,
  exportDealsExcel,
  exportContactsPdf,
  exportContactsExcel,
} from './export.service';

function parseFilters(query: Record<string, unknown>) {
  return {
    pipelineId: query.pipelineId as string | undefined,
    stageId: query.stageId as string | undefined,
    assignedToId: query.assignedToId as string | undefined,
    companyId: query.companyId as string | undefined,
    source: query.source as string | undefined,
    tag: query.tag as string | undefined,
    dateFrom: query.dateFrom as string | undefined,
    dateTo: query.dateTo as string | undefined,
  };
}

export async function dealsPdf(req: Request, res: Response): Promise<void> {
  try {
    const filters = parseFilters(req.query);
    const buffer = await exportDealsPdf(req.user!.tenantId, filters);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=deals-report.pdf');
    res.send(buffer);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Export failed';
    res.status(500).json({ error: message });
  }
}

export async function dealsExcel(req: Request, res: Response): Promise<void> {
  try {
    const filters = parseFilters(req.query);
    const buffer = await exportDealsExcel(req.user!.tenantId, filters);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=deals-report.xlsx');
    res.send(buffer);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Export failed';
    res.status(500).json({ error: message });
  }
}

export async function contactsPdf(req: Request, res: Response): Promise<void> {
  try {
    const filters = parseFilters(req.query);
    const buffer = await exportContactsPdf(req.user!.tenantId, filters);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=contacts-report.pdf');
    res.send(buffer);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Export failed';
    res.status(500).json({ error: message });
  }
}

export async function contactsExcel(req: Request, res: Response): Promise<void> {
  try {
    const filters = parseFilters(req.query);
    const buffer = await exportContactsExcel(req.user!.tenantId, filters);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=contacts-report.xlsx');
    res.send(buffer);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Export failed';
    res.status(500).json({ error: message });
  }
}
