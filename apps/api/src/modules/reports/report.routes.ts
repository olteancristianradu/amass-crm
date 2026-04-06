import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createReportSchema, updateReportSchema, runReportSchema, dashboardWidgetSchema } from './report.schema';
import * as ctrl from './report.controller';

const router = Router();

router.use(authenticate);

router.get('/saved', ctrl.listSavedReports);
router.post('/saved', validate(createReportSchema), ctrl.saveReport);
router.patch('/saved/:id', validate(updateReportSchema), ctrl.updateReport);
router.delete('/saved/:id', ctrl.deleteReport);

router.post('/run', validate(runReportSchema), ctrl.runReport);

router.get('/dashboard/widgets', ctrl.getDashboardWidgets);
router.post('/dashboard/widgets', validate(dashboardWidgetSchema), ctrl.saveDashboardWidget);
router.delete('/dashboard/widgets/:id', ctrl.deleteDashboardWidget);

router.post('/export/csv', validate(runReportSchema), ctrl.exportCsv);
router.post('/export/excel', validate(runReportSchema), ctrl.exportExcel);
router.post('/export/pdf', validate(runReportSchema), ctrl.exportPdf);

// Direct GET endpoints for frontend pages
router.get('/forecast', ctrl.getReportDirect('pipeline_forecast'));
router.get('/funnel', ctrl.getReportDirect('conversion_funnel'));
router.get('/activity', ctrl.getReportDirect('activity'));
router.get('/team-performance', ctrl.getReportDirect('team_performance'));
router.get('/win-loss', ctrl.getReportDirect('win_loss'));

export default router;
