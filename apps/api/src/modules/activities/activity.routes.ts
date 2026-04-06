import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createActivitySchema } from './activity.schema';
import * as ctrl from './activity.controller';

const router = Router();

router.use(authenticate);

router.get('/', ctrl.list);
router.get('/timeline', ctrl.getTimeline);
router.get('/stats', ctrl.getStats);
router.post('/', validate(createActivitySchema), ctrl.create);

export default router;
