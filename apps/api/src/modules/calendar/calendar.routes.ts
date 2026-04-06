import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createEventSchema, updateEventSchema } from './calendar.schema';
import * as ctrl from './calendar.controller';

const router = Router();

router.use(authenticate);

router.get('/', ctrl.list);
router.get('/agenda', ctrl.getAgenda);
router.get('/:id', ctrl.getById);
router.post('/', validate(createEventSchema), ctrl.create);
router.patch('/:id', validate(updateEventSchema), ctrl.update);
router.delete('/:id', ctrl.remove);

export default router;
