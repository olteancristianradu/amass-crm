import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { grantConsentSchema, revokeConsentSchema, dataDeletionSchema } from './gdpr.schema';
import * as ctrl from './gdpr.controller';

const router = Router();

router.use(authenticate);

router.get('/consents/:contactId', ctrl.getConsents);
router.post('/consents/grant', validate(grantConsentSchema), ctrl.grantConsent);
router.post('/consents/revoke', validate(revokeConsentSchema), ctrl.revokeConsent);
router.get('/export/:contactId', requireRole('ADMIN', 'MANAGER'), ctrl.exportContactData);
router.post('/delete/:contactId', requireRole('ADMIN'), validate(dataDeletionSchema), ctrl.deleteContactData);
router.delete('/contacts/:contactId', requireRole('ADMIN'), ctrl.deleteContactData);
router.get('/contacts/:contactId/export', ctrl.exportContactData);
router.get('/report', requireRole('ADMIN', 'MANAGER'), ctrl.getConsentReport);

// Self-service GDPR endpoints
router.post('/export', ctrl.selfExport);
router.post('/delete-request', ctrl.selfDeleteRequest);
router.get('/consents', ctrl.selfGetConsents);
router.put('/consents', ctrl.selfUpdateConsents);
router.get('/access-log', ctrl.selfAccessLog);

export default router;
