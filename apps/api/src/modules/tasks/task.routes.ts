import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createTaskSchema, updateTaskSchema } from './task.schema';
import * as ctrl from './task.controller';

const router = Router();

router.use(authenticate);

router.get('/', ctrl.list);
router.get('/overdue', requireRole('ADMIN', 'MANAGER'), ctrl.getOverdue);
router.get('/upcoming', ctrl.getUpcoming);
router.get('/:id', ctrl.getById);
router.post('/', validate(createTaskSchema), ctrl.create);
router.patch('/:id', validate(updateTaskSchema), ctrl.update);
router.delete('/:id', ctrl.remove);

export default router;
