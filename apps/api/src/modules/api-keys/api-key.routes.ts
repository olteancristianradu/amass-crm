import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createApiKeySchema } from './api-key.schema';
import * as ctrl from './api-key.controller';

const router = Router();

router.use(authenticate);

router.get('/', requireRole('ADMIN'), ctrl.list);
router.post('/', requireRole('ADMIN'), validate(createApiKeySchema), ctrl.create);
router.delete('/:id', requireRole('ADMIN'), ctrl.revoke);

export default router;
