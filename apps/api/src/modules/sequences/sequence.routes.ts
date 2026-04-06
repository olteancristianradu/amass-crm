import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createSequenceSchema, updateSequenceSchema } from './sequence.schema';
import * as ctrl from './sequence.controller';

const router = Router();

router.use(authenticate);

router.get('/', ctrl.list);
router.post('/', validate(createSequenceSchema), ctrl.create);
router.get('/:id', ctrl.getById);
router.put('/:id', validate(updateSequenceSchema), ctrl.update);
router.delete('/:id', ctrl.remove);
router.post('/:id/enroll', ctrl.enroll);
router.post('/:id/unenroll/:enrollmentId', ctrl.unenroll);
router.get('/:id/stats', ctrl.stats);

export default router;
