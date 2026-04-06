import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createDealSchema, updateDealSchema, moveDealStageSchema } from './deal.schema';
import * as ctrl from './deal.controller';

const router = Router();

router.use(authenticate);

router.get('/', ctrl.list);
router.get('/kanban/:pipelineId', ctrl.getKanban);
router.get('/forecast', ctrl.getForecast);
router.get('/analysis', ctrl.getWinLossAnalysis);
router.get('/:id', ctrl.getById);
router.post('/', validate(createDealSchema), ctrl.create);
router.patch('/:id', validate(updateDealSchema), ctrl.update);
router.patch('/:id/stage', validate(moveDealStageSchema), ctrl.moveStage);
router.delete('/:id', ctrl.remove);
router.post('/:id/assign', requireRole('ADMIN', 'MANAGER'), ctrl.assignRoundRobin);

export default router;
