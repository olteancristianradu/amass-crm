import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createCompanySchema, updateCompanySchema, mergeCompaniesSchema } from './company.schema';
import * as ctrl from './company.controller';

const router = Router();

router.use(authenticate);

router.get('/', ctrl.list);
router.get('/export/csv', ctrl.exportCsv);
router.post('/import/csv', ctrl.importCsv);
router.get('/:id', ctrl.getById);
router.post('/', validate(createCompanySchema), ctrl.create);
router.patch('/:id', validate(updateCompanySchema), ctrl.update);
router.delete('/:id', requireRole('ADMIN'), ctrl.remove);
router.post('/merge', requireRole('ADMIN'), validate(mergeCompaniesSchema), ctrl.merge);

export default router;
