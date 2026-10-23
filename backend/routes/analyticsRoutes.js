const router = require('express').Router();
const c = require('../controllers/analyticsController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.get('/overview', c.overview);
router.get('/trend', c.trend);
router.get('/departments', authorize('admin', 'manager'), c.departments);
router.get('/top-performers', authorize('admin', 'manager'), c.topPerformers);
router.get('/report', authorize('admin', 'manager'), c.report);

module.exports = router;
