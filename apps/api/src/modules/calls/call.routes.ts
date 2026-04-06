import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import * as ctrl from './call.controller';

const router = Router();

// Twilio webhook callbacks - no auth required (called by Twilio)
router.post('/webhook/status', ctrl.webhookStatus);
router.post('/webhook/recording', ctrl.webhookRecording);
router.post('/twiml/:callId', ctrl.twiml);

// Authenticated routes
router.use(authenticate);

router.post('/initiate', ctrl.initiate);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);

export default router;
