import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createWorkflowSchema, updateWorkflowSchema, executeWorkflowSchema } from './workflow.schema';
import * as ctrl from './workflow.controller';

const router = Router();

router.use(authenticate);

router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', requireRole('ADMIN', 'MANAGER'), validate(createWorkflowSchema), ctrl.create);
router.patch('/:id', requireRole('ADMIN', 'MANAGER'), validate(updateWorkflowSchema), ctrl.update);
router.delete('/:id', requireRole('ADMIN', 'MANAGER'), ctrl.remove);
router.post('/:id/toggle', requireRole('ADMIN', 'MANAGER'), ctrl.toggle);
router.post('/:id/execute', validate(executeWorkflowSchema), ctrl.execute);
router.get('/:id/executions', ctrl.getExecutions);

export default router;
