/**
 * Routes for tenant backup and restore operations.
 * All routes require ADMIN role authentication.
 *
 * POST /backup        - Create a full compressed backup of tenant data
 * GET  /backups       - List all previous backups (from audit log)
 * POST /backup/restore - Restore tenant data from an uploaded backup file
 */

import { Router, Request, Response } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { createBackup, listBackups, restoreBackup } from './backup.service';

const router = Router();

router.use(authenticate);
router.use(requireRole('ADMIN'));

/**
 * POST /backup
 * Creates a full compressed backup of all data for the authenticated tenant.
 * Returns the backup as a gzip binary download.
 */
router.post('/backup', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId;
    const result = await createBackup(tenantId);

    res.setHeader('Content-Type', 'application/gzip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="backup-${tenantId}-${Date.now()}.json.gz"`
    );
    res.send(result.buffer);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Backup failed';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /backups
 * Lists all backup records for the authenticated tenant,
 * retrieved from audit log entries.
 */
router.get('/backups', async (req: Request, res: Response): Promise<void> => {
  try {
    const backups = await listBackups(req.user!.tenantId);
    res.json({ backups });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to list backups';
    res.status(500).json({ error: message });
  }
});

/**
 * POST /backup/restore
 * Restores tenant data from an uploaded gzip-compressed backup file.
 * Expects the raw compressed body (Content-Type: application/gzip or application/octet-stream).
 */
router.post('/backup/restore', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId;
    const buffer = req.body as Buffer;

    if (!buffer || !Buffer.isBuffer(buffer)) {
      res.status(400).json({ error: 'Request body must be a raw gzip buffer. Set Content-Type to application/octet-stream.' });
      return;
    }

    const counts = await restoreBackup(tenantId, buffer);
    res.json({ message: 'Backup restored successfully', counts });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Restore failed';
    res.status(400).json({ error: message });
  }
});

export default router;
