import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createProductSchema, updateProductSchema } from './product.schema';
import * as ctrl from './product.controller';

const router = Router();

router.use(authenticate);

router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', requireRole('ADMIN', 'MANAGER'), validate(createProductSchema), ctrl.create);
router.patch('/:id', requireRole('ADMIN', 'MANAGER'), validate(updateProductSchema), ctrl.update);
router.delete('/:id', requireRole('ADMIN'), ctrl.remove);

export default router;
