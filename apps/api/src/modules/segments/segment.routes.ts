/**
 * Routes for dynamic contact segments.
 * All routes require authentication.
 *
 * GET    /               - List all segments
 * POST   /               - Create a new segment
 * GET    /:id/contacts   - Get contacts matching a segment
 * PUT    /:id            - Update a segment
 * DELETE /:id            - Delete a segment
 * POST   /refresh-counts - Refresh contact counts for all segments
 */

import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createSegmentSchema, updateSegmentSchema } from './segment.schema';
import * as segmentController from './segment.controller';

const router = Router();

router.use(authenticate);

router.get('/', segmentController.listSegments);
router.post('/', validate(createSegmentSchema), segmentController.createSegment);
router.get('/:id/contacts', segmentController.getSegmentContacts);
router.put('/:id', validate(updateSegmentSchema), segmentController.updateSegment);
router.delete('/:id', segmentController.deleteSegment);
router.post('/refresh-counts', segmentController.refreshCounts);

export default router;
