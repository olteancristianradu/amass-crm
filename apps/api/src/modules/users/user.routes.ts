import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createUserSchema, updateUserSchema } from './user.schema';
import * as ctrl from './user.controller';

const router = Router();

router.use(authenticate);

router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', requireRole('ADMIN'), validate(createUserSchema), ctrl.create);
router.patch('/:id', validate(updateUserSchema), ctrl.update);
router.delete('/:id', requireRole('ADMIN'), ctrl.remove);

export default router;
