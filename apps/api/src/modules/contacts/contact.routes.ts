import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createContactSchema, updateContactSchema, mergeContactsSchema, mergeContactSchema, importContactsSchema } from './contact.schema';
import * as ctrl from './contact.controller';

const router = Router();

router.use(authenticate);

router.get('/', ctrl.list);
router.get('/export/csv', ctrl.exportCsv);
router.get('/export/vcard', ctrl.exportVCard);
router.post('/import/vcard', ctrl.importVCard);
router.get('/duplicate-check', ctrl.checkDuplicate);
router.get('/duplicates', requireRole('ADMIN', 'MANAGER'), ctrl.findDuplicates);
router.get('/:id', ctrl.getById);
router.post('/', validate(createContactSchema), ctrl.create);
router.patch('/:id', validate(updateContactSchema), ctrl.update);
router.delete('/:id', requireRole('ADMIN', 'MANAGER'), ctrl.remove);
router.post('/merge', requireRole('ADMIN', 'MANAGER'), validate(mergeContactsSchema), ctrl.merge);
router.post('/merge-duplicates', requireRole('ADMIN', 'MANAGER'), validate(mergeContactSchema), ctrl.mergeContacts);
router.post('/import', validate(importContactsSchema), ctrl.importBatch);

export default router;
