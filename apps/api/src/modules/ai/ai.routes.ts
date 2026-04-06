import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { scoreContactSchema, draftEmailSchema, suggestActionSchema, sentimentSchema, churnPredictionSchema } from './ai.schema';
import * as ctrl from './ai.controller';

const router = Router();

router.use(authenticate);

router.post('/score', validate(scoreContactSchema), ctrl.scoreContact);
router.post('/score-all', requireRole('ADMIN', 'MANAGER'), ctrl.scoreAllContacts);
router.post('/draft-email', validate(draftEmailSchema), ctrl.draftEmail);
router.post('/suggest-action', validate(suggestActionSchema), ctrl.suggestNextAction);
router.post('/sentiment', validate(sentimentSchema), ctrl.analyzeSentiment);
router.post('/predict-churn', validate(churnPredictionSchema), ctrl.predictChurn);
router.post('/transcribe/:callId', ctrl.transcribeCall);
router.post('/summarize-call/:callId', ctrl.summarizeCall);
router.get('/call-insights/:callId', ctrl.callInsights);

export default router;
