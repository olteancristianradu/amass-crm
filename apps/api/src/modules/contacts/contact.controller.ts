import { Request, Response } from 'express';
import { ContactService } from './contact.service';

const contactService = new ContactService();

export async function list(req: Request, res: Response): Promise<void> {
  const filters = {
    search: req.query.search as string,
    companyId: req.query.companyId as string,
    assignedToId: req.query.assignedToId as string,
    tag: req.query.tag as string,
    page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
  };
  const result = await contactService.list(req.user!.tenantId, filters);
  res.json(result);
}

export async function getById(req: Request, res: Response): Promise<void> {
  try {
    const contact = await contactService.getById(req.user!.tenantId, req.params.id);
    res.json(contact);
  } catch {
    res.status(404).json({ error: 'Contact not found' });
  }
}

export async function create(req: Request, res: Response): Promise<void> {
  try {
    const contact = await contactService.create(req.user!.tenantId, req.user!.userId, req.body);
    res.status(201).json(contact);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Create failed';
    res.status(400).json({ error: message });
  }
}

export async function update(req: Request, res: Response): Promise<void> {
  try {
    const contact = await contactService.update(req.user!.tenantId, req.user!.userId, req.params.id, req.body);
    res.json(contact);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Update failed';
    res.status(400).json({ error: message });
  }
}

export async function remove(req: Request, res: Response): Promise<void> {
  try {
    await contactService.delete(req.user!.tenantId, req.params.id);
    res.json({ success: true });
  } catch {
    res.status(404).json({ error: 'Contact not found' });
  }
}

export async function merge(req: Request, res: Response): Promise<void> {
  try {
    const { primaryId, secondaryId } = req.body;
    const contact = await contactService.merge(req.user!.tenantId, primaryId, secondaryId);
    res.json(contact);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Merge failed';
    const statusCode = message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ error: message });
  }
}

export async function checkDuplicate(req: Request, res: Response): Promise<void> {
  const email = req.query.email as string;
  const phone = req.query.phone as string;
  const duplicate = await contactService.checkDuplicate(req.user!.tenantId, email, phone);
  res.json({ duplicate });
}

export async function importBatch(req: Request, res: Response): Promise<void> {
  try {
    const { contacts, assignToId } = req.body;
    const result = await contactService.importBatch(
      req.user!.tenantId,
      req.user!.userId,
      contacts,
      assignToId,
    );
    res.status(201).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Import failed';
    res.status(400).json({ error: message });
  }
}

export async function findDuplicates(req: Request, res: Response): Promise<void> {
  const threshold = req.query.threshold ? parseFloat(req.query.threshold as string) : 0.8;
  const duplicates = await contactService.findDuplicates(req.user!.tenantId, threshold);
  res.json(duplicates);
}

export async function mergeContacts(req: Request, res: Response): Promise<void> {
  try {
    const { survivorId, mergedId } = req.body;
    const result = await contactService.mergeContacts(req.user!.tenantId, survivorId, mergedId);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Merge failed';
    res.status(400).json({ error: message });
  }
}

export async function exportCsv(req: Request, res: Response): Promise<void> {
  const csv = await contactService.exportCsv(req.user!.tenantId);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=contacts.csv');
  res.send('\uFEFF' + csv);
}

export async function exportVCard(req: Request, res: Response): Promise<void> {
  const vcard = await contactService.exportVCard(req.user!.tenantId);
  res.setHeader('Content-Type', 'text/vcard; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=contacts.vcf');
  res.send(vcard);
}

export async function importVCard(req: Request, res: Response): Promise<void> {
  try {
    const result = await contactService.importVCard(req.user!.tenantId, req.user!.userId, req.body.vcardText);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Import failed';
    res.status(400).json({ error: message });
  }
}
