import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import * as ctrl from './notification.controller';

const router = Router();
router.use(authenticate);

router.get('/', ctrl.list);
router.get('/unread', ctrl.getUnread);
router.patch('/:id/read', ctrl.markAsRead);
router.patch('/read-all', ctrl.markAllAsRead);

export default router;
