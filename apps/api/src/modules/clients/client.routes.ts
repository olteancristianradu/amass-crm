import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createClientSchema, updateClientSchema, moveStageSchema, importEmailSchema, importBatchSchema } from './client.schema';
import * as ctrl from './client.controller';

const router = Router();

router.use(authenticate);

router.get('/', ctrl.list);
router.get('/export/csv', ctrl.exportCsv);
router.get('/duplicate-check', ctrl.checkDuplicate);
router.get('/:id', ctrl.getById);
router.post('/', validate(createClientSchema), ctrl.create);
router.patch('/:id', validate(updateClientSchema), ctrl.update);
router.patch('/:id/stage', validate(moveStageSchema), ctrl.moveStage);
router.delete('/:id', ctrl.remove);
router.post('/import', validate(importEmailSchema), ctrl.importEmail);
router.post('/import/batch', validate(importBatchSchema), ctrl.importBatch);

export default router;
