import { Request, Response } from 'express';
import { ReportService } from './report.service';
import { generateExcel, generatePdfHtml } from './export.service';
import { prisma } from '../../config/database';

const reportService = new ReportService();

export function getReportDirect(type: string) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const config: Record<string, unknown> = { ...req.query };
      // Auto-select default pipeline for funnel report
      if (type === 'conversion_funnel' && !config.pipelineId) {
        const pipeline = await prisma.pipeline.findFirst({
          where: { tenantId: req.user!.tenantId },
          orderBy: { isDefault: 'desc' },
        });
        if (pipeline) config.pipelineId = pipeline.id;
      }
      const result = await reportService.runReport(req.user!.tenantId, type as any, config);
      res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Report failed';
      res.status(400).json({ error: message });
    }
  };
}

export async function listSavedReports(req: Request, res: Response): Promise<void> {
  const reports = await reportService.listSavedReports(req.user!.tenantId, req.user!.userId);
  res.json(reports);
}

export async function saveReport(req: Request, res: Response): Promise<void> {
  try {
    const report = await reportService.saveReport(req.user!.tenantId, req.user!.userId, req.body);
    res.status(201).json(report);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Save failed';
    res.status(400).json({ error: message });
  }
}

export async function updateReport(req: Request, res: Response): Promise<void> {
  try {
    const report = await reportService.updateReport(req.user!.tenantId, req.params.id, req.body);
    res.json(report);
  } catch (err) {
    if (err instanceof Error && err.message === 'Report not found') {
      res.status(404).json({ error: err.message });
      return;
    }
    const message = err instanceof Error ? err.message : 'Update failed';
    res.status(400).json({ error: message });
  }
}

export async function deleteReport(req: Request, res: Response): Promise<void> {
  try {
    await reportService.deleteReport(req.user!.tenantId, req.params.id);
    res.json({ success: true });
  } catch {
    res.status(404).json({ error: 'Report not found' });
  }
}

export async function runReport(req: Request, res: Response): Promise<void> {
  try {
    const { type, config } = req.body;
    const result = await reportService.runReport(req.user!.tenantId, type, config || {});
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Report execution failed';
    res.status(400).json({ error: message });
  }
}

export async function getDashboardWidgets(req: Request, res: Response): Promise<void> {
  const widgets = await reportService.getDashboardWidgets(req.user!.tenantId, req.user!.userId);
  res.json(widgets);
}

export async function saveDashboardWidget(req: Request, res: Response): Promise<void> {
  try {
    const widget = await reportService.saveDashboardWidget(req.user!.tenantId, req.user!.userId, req.body);
    res.status(201).json(widget);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Save failed';
    res.status(400).json({ error: message });
  }
}

export async function deleteDashboardWidget(req: Request, res: Response): Promise<void> {
  try {
    await reportService.deleteDashboardWidget(req.user!.tenantId, req.params.id);
    res.json({ success: true });
  } catch {
    res.status(404).json({ error: 'Widget not found' });
  }
}

export async function exportExcel(req: Request, res: Response): Promise<void> {
  try {
    const { type, config } = req.body;
    const report = await reportService.runReport(req.user!.tenantId, type, config || {});
    const buffer = generateExcel(report);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=report-${type}.xlsx`);
    res.send(buffer);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Export failed';
    res.status(400).json({ error: message });
  }
}

export async function exportPdf(req: Request, res: Response): Promise<void> {
  try {
    const { type, config } = req.body;
    const report = await reportService.runReport(req.user!.tenantId, type, config || {});
    const title = `${type.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())} Report`;
    const html = generatePdfHtml(report, title);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=report-${type}.html`);
    res.send(html);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Export failed';
    res.status(400).json({ error: message });
  }
}

export async function exportCsv(req: Request, res: Response): Promise<void> {
  try {
    const { type, config } = req.body;
    const csv = await reportService.exportCsv(req.user!.tenantId, type, config || {});
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=report-${type}.csv`);
    res.send('\uFEFF' + csv);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Export failed';
    res.status(400).json({ error: message });
  }
}
