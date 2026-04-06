import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { connectAccountSchema, sendEmailSchema } from './email.schema';
import * as ctrl from './email.controller';

const router = Router();

// Tracking endpoints - no auth required (called from email clients)
router.get('/track/open/:id', ctrl.trackOpen);
router.get('/track/click/:id', ctrl.trackClick);

// All other routes require authentication
router.use(authenticate);

router.get('/accounts', ctrl.listAccounts);
router.post('/accounts', validate(connectAccountSchema), ctrl.connectAccount);
router.delete('/accounts/:id', ctrl.disconnectAccount);
router.get('/messages', ctrl.listMessages);
router.get('/thread/:threadId', ctrl.getThread);
router.post('/send', validate(sendEmailSchema), ctrl.sendEmail);
router.post('/inbound', ctrl.recordInbound);
router.get('/stats', ctrl.getStats);
router.get('/inbox/:contactId', ctrl.getUnifiedInbox);

export default router;
