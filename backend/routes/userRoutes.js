const router = require('express').Router();
const c = require('../controllers/userController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/team', c.team);
router.get('/directory', c.directory);

module.exports = router;
