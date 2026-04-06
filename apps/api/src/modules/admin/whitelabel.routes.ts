/**
 * Routes for white-label branding configuration.
 * GET and PUT require ADMIN role authentication.
 *
 * GET / - Get current white-label config
 * PUT / - Update white-label config
 */

import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import * as whitelabelController from './whitelabel.controller';

const router = Router();

router.use(authenticate);
router.use(requireRole('ADMIN'));

router.get('/', whitelabelController.getConfig);
router.put('/', whitelabelController.updateConfig);

export default router;
