import { Router, raw } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createSubscriptionSchema, updateSubscriptionSchema } from './billing.schema';
import * as ctrl from './billing.controller';

const router = Router();

// Stripe webhook - no auth, raw body for signature verification
router.post('/webhook', raw({ type: 'application/json' }), ctrl.handleStripeWebhook);

// All other routes require authentication
router.use(authenticate);

router.get('/subscription', ctrl.getSubscription);
router.post('/subscription', requireRole('ADMIN'), validate(createSubscriptionSchema), ctrl.createSubscription);
router.patch('/subscription', requireRole('ADMIN'), validate(updateSubscriptionSchema), ctrl.updateSubscription);
router.post('/cancel', requireRole('ADMIN'), ctrl.cancelSubscription);
router.post('/reactivate', requireRole('ADMIN'), ctrl.reactivateSubscription);
router.get('/invoices', ctrl.listInvoices);
router.get('/usage', ctrl.getUsage);
router.get('/limits', ctrl.checkLimits);
router.post('/checkout', requireRole('ADMIN'), ctrl.createCheckoutSession);
router.post('/portal', requireRole('ADMIN'), ctrl.createPortalSession);
router.get('/status', ctrl.getSubscriptionStatus);

export default router;
