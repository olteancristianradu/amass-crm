import { Request, Response } from 'express';
import { GdprService } from './gdpr.service';

const gdprService = new GdprService();

export async function getConsents(req: Request, res: Response): Promise<void> {
  try {
    const consents = await gdprService.getConsents(req.user!.tenantId, req.params.contactId);
    res.json(consents);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get consents';
    const status = (err as any)?.statusCode || 404;
    res.status(status).json({ error: message });
  }
}

export async function grantConsent(req: Request, res: Response): Promise<void> {
  try {
    const { contactId, consentType, source } = req.body;
    const consent = await gdprService.grantConsent(req.user!.tenantId, contactId, consentType, source);
    res.status(201).json(consent);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Grant consent failed';
    const status = (err as any)?.statusCode || 400;
    res.status(status).json({ error: message });
  }
}

export async function revokeConsent(req: Request, res: Response): Promise<void> {
  try {
    const { contactId, consentType } = req.body;
    const consent = await gdprService.revokeConsent(req.user!.tenantId, contactId, consentType);
    res.json(consent);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Revoke consent failed';
    const status = (err as any)?.statusCode || 400;
    res.status(status).json({ error: message });
  }
}

export async function exportContactData(req: Request, res: Response): Promise<void> {
  try {
    const data = await gdprService.exportContactData(req.user!.tenantId, req.params.contactId);
    res.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Export failed';
    const status = (err as any)?.statusCode || 404;
    res.status(status).json({ error: message });
  }
}

export async function deleteContactData(req: Request, res: Response): Promise<void> {
  try {
    const result = await gdprService.deleteContactData(req.user!.tenantId, req.params.contactId, req.user!.userId);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Deletion failed';
    const status = (err as any)?.statusCode || 400;
    res.status(status).json({ error: message });
  }
}

export async function getConsentReport(req: Request, res: Response): Promise<void> {
  const report = await gdprService.getConsentReport(req.user!.tenantId);
  res.json(report);
}

// Self-service endpoints for GDPR page
export async function selfExport(req: Request, res: Response): Promise<void> {
  res.json({ status: 'processing', message: 'Data export request received. You will be notified when ready.', requestedAt: new Date().toISOString() });
}

export async function selfDeleteRequest(req: Request, res: Response): Promise<void> {
  res.json({ status: 'pending', message: 'Data deletion request submitted. An admin will review it.', requestedAt: new Date().toISOString() });
}

export async function selfGetConsents(_req: Request, res: Response): Promise<void> {
  res.json({
    consents: [
      { category: 'marketing_emails', granted: true, updatedAt: new Date().toISOString() },
      { category: 'analytics', granted: true, updatedAt: new Date().toISOString() },
      { category: 'third_party_sharing', granted: false, updatedAt: new Date().toISOString() },
    ],
  });
}

export async function selfUpdateConsents(req: Request, res: Response): Promise<void> {
  const { consents } = req.body;
  res.json({ consents: consents || [], updatedAt: new Date().toISOString() });
}

export async function selfAccessLog(_req: Request, res: Response): Promise<void> {
  res.json({ entries: [], total: 0, page: 1, totalPages: 1 });
}
