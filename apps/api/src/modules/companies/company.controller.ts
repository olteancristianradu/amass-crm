import { Request, Response } from 'express';
import { CompanyService } from './company.service';

const companyService = new CompanyService();

export async function list(req: Request, res: Response): Promise<void> {
  const filters = {
    search: req.query.search as string,
    industry: req.query.industry as string,
    page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
  };
  const result = await companyService.list(req.user!.tenantId, filters);
  res.json(result);
}

export async function getById(req: Request, res: Response): Promise<void> {
  try {
    const company = await companyService.getById(req.user!.tenantId, req.params.id);
    res.json(company);
  } catch {
    res.status(404).json({ error: 'Company not found' });
  }
}

export async function create(req: Request, res: Response): Promise<void> {
  try {
    const company = await companyService.create(req.user!.tenantId, req.body);
    res.status(201).json(company);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Create failed';
    res.status(400).json({ error: message });
  }
}

export async function update(req: Request, res: Response): Promise<void> {
  try {
    const company = await companyService.update(req.user!.tenantId, req.params.id, req.body);
    res.json(company);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Update failed';
    res.status(400).json({ error: message });
  }
}

export async function remove(req: Request, res: Response): Promise<void> {
  try {
    await companyService.delete(req.user!.tenantId, req.params.id);
    res.json({ success: true });
  } catch {
    res.status(404).json({ error: 'Company not found' });
  }
}

export async function importCsv(req: Request, res: Response): Promise<void> {
  try {
    const result = await companyService.importCsv(req.user!.tenantId, req.body.csvText);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Import failed';
    res.status(400).json({ error: message });
  }
}

export async function exportCsv(req: Request, res: Response): Promise<void> {
  const csv = await companyService.exportCsv(req.user!.tenantId);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=companies.csv');
  res.send('\uFEFF' + csv);
}

export async function merge(req: Request, res: Response): Promise<void> {
  try {
    const { primaryId, secondaryId } = req.body;
    const company = await companyService.merge(req.user!.tenantId, primaryId, secondaryId);
    res.json(company);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Merge failed';
    const statusCode = message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ error: message });
  }
}
