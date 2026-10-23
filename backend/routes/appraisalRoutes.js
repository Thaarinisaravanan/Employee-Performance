const router = require('express').Router();
const c = require('../controllers/appraisalController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.get('/', c.listAppraisals);
router.get('/criteria', c.criteria);
router.post('/generate', authorize('admin'), c.generate);
router.get('/:id', c.getAppraisal);
router.put('/:id/self', c.submitSelf);
router.put('/:id/review', authorize('manager', 'admin'), c.submitReview);

module.exports = router;
