import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import * as ctrl from './whatsapp.controller';

const router = Router();

// Webhook endpoints - no auth required (called by Meta)
router.get('/webhook', ctrl.verifyWebhook);
router.post('/webhook', ctrl.handleWebhook);

// Authenticated routes
router.use(authenticate);

router.post('/send', ctrl.sendMessage);
router.post('/send-template', ctrl.sendTemplate);

export default router;
