import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import * as ctrl from './revenue.controller';

const router = Router();

router.use(authenticate);

router.get('/revenue', ctrl.getRevenueMetrics);
router.get('/revenue/timeline', ctrl.getRevenueTimeline);
router.get('/revenue/cohorts', ctrl.getCohortAnalysis);
router.get('/revenue/by-pipeline', ctrl.getRevenueByPipeline);
router.get('/revenue/by-user', ctrl.getRevenueByUser);

export default router;
