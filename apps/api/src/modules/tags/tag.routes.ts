import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createTagSchema, updateTagSchema, attachTagSchema, detachTagSchema } from './tag.schema';
import * as ctrl from './tag.controller';

const router = Router();

router.use(authenticate);

router.get('/', ctrl.list);
router.post('/', validate(createTagSchema), ctrl.create);
router.patch('/:id', validate(updateTagSchema), ctrl.update);
router.delete('/:id', requireRole('ADMIN', 'MANAGER'), ctrl.remove);
router.post('/attach', validate(attachTagSchema), ctrl.attach);
router.post('/detach', validate(detachTagSchema), ctrl.detach);

export default router;
