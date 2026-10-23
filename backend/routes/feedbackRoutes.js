const router = require('express').Router();
const c = require('../controllers/feedbackController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.post('/', c.give);
router.get('/received', c.received);
router.get('/given', c.given);
router.get('/team', authorize('manager', 'admin'), c.team);
router.delete('/:id', c.remove);

module.exports = router;
