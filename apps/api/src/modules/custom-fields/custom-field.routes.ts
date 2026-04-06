import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createFieldDefSchema, updateFieldDefSchema, setFieldValuesSchema } from './custom-field.schema';
import * as ctrl from './custom-field.controller';

const router = Router();

router.use(authenticate);

router.get('/definitions', ctrl.listDefinitions);
router.post('/definitions', requireRole('ADMIN', 'MANAGER'), validate(createFieldDefSchema), ctrl.createDefinition);
router.patch('/definitions/:id', requireRole('ADMIN', 'MANAGER'), validate(updateFieldDefSchema), ctrl.updateDefinition);
router.delete('/definitions/:id', requireRole('ADMIN'), ctrl.deleteDefinition);
router.get('/values', ctrl.getValues);
router.put('/values', validate(setFieldValuesSchema), ctrl.setValues);
router.delete('/values/:defId', ctrl.deleteValue);

export default router;
