/**
 * Routes for data migration (import/export).
 * All routes require ADMIN role authentication.
 *
 * POST /import/csv       - Import contacts from CSV
 * POST /import/json      - Import contacts from JSON array
 * GET  /export           - Export all tenant data as JSON
 * POST /import/hubspot   - Import contacts from HubSpot
 * POST /import/pipedrive - Import contacts from Pipedrive
 */

import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import * as migrationController from './migration.controller';

const router = Router();

router.use(authenticate);
router.use(requireRole('ADMIN'));

router.post('/import/csv', migrationController.importCsv);
router.post('/import/json', migrationController.importJson);
router.get('/export', migrationController.exportAll);
router.post('/import/hubspot', migrationController.importHubspot);
router.post('/import/pipedrive', migrationController.importPipedrive);

export default router;
