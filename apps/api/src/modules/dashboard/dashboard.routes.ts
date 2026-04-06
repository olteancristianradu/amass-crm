import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import * as ctrl from './dashboard.controller';

const router = Router();

router.use(authenticate);

router.get('/kpis', ctrl.getKpis);
router.get('/leaderboard', ctrl.getLeaderboard);
router.get('/loss-reasons', ctrl.getLossReasons);

export default router;
