import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import * as ctrl from './export.controller';

const router = Router();

router.use(authenticate);

// Deal exports
router.get('/deals/pdf', ctrl.dealsPdf);
router.get('/deals/excel', ctrl.dealsExcel);

// Contact exports
router.get('/contacts/pdf', ctrl.contactsPdf);
router.get('/contacts/excel', ctrl.contactsExcel);

export default router;
