import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createWebhookSchema, updateWebhookSchema } from './webhook.schema';
import * as ctrl from './webhook.controller';

const router = Router();

router.use(authenticate);

router.get('/', requireRole('ADMIN'), ctrl.list);
router.get('/:id', requireRole('ADMIN'), ctrl.getById);
router.post('/', requireRole('ADMIN'), validate(createWebhookSchema), ctrl.create);
router.patch('/:id', requireRole('ADMIN'), validate(updateWebhookSchema), ctrl.update);
router.delete('/:id', requireRole('ADMIN'), ctrl.remove);
router.post('/:id/test', requireRole('ADMIN'), ctrl.test);
router.get('/:id/deliveries', requireRole('ADMIN'), ctrl.getDeliveries);
router.patch('/:id/reset', requireRole('ADMIN'), ctrl.resetFailCount);

export default router;
