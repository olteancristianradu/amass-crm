/**
 * Routes for sandbox tenant management.
 * All routes require ADMIN role authentication.
 *
 * POST   /sandbox          - Create a sandbox copy of the current tenant
 * POST   /sandbox/:id/reset - Reset (delete + recreate) a sandbox
 * DELETE /sandbox/:id      - Delete a sandbox tenant
 * GET    /sandboxes        - List all sandbox tenants for the current tenant
 * POST   /sandbox/:id/seed - Seed demo data into a sandbox tenant
 */

import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import * as sandboxController from './sandbox.controller';

const router = Router();

router.use(authenticate);
router.use(requireRole('ADMIN'));

router.post('/sandbox', sandboxController.createSandbox);
router.post('/sandbox/:id/reset', sandboxController.resetSandbox);
router.delete('/sandbox/:id', sandboxController.deleteSandbox);
router.get('/sandboxes', sandboxController.listSandboxes);
router.post('/sandbox/:id/seed', sandboxController.seedDemoData);

export default router;
