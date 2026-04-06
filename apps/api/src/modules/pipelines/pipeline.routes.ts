import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createPipelineSchema, updatePipelineSchema, reorderStagesSchema } from './pipeline.schema';
import * as ctrl from './pipeline.controller';

const router = Router();

router.use(authenticate);

router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', requireRole('ADMIN', 'MANAGER'), validate(createPipelineSchema), ctrl.create);
router.patch('/:id', requireRole('ADMIN', 'MANAGER'), validate(updatePipelineSchema), ctrl.update);
router.delete('/:id', requireRole('ADMIN'), ctrl.remove);
router.patch('/:id/reorder', validate(reorderStagesSchema), ctrl.reorderStages);

export default router;
