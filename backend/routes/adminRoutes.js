const router = require('express').Router();
const c = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// Departments and cycles can be read by anyone logged in (needed for dropdowns)
router.get('/departments', c.listDepartments);
router.get('/cycles', c.listCycles);

// Everything below is admin-only
router.use(authorize('admin'));

router.route('/users').get(c.listUsers).post(c.createUser);
router.route('/users/:id').put(c.updateUser).delete(c.deleteUser);

router.post('/departments', c.createDepartment);
router.route('/departments/:id').put(c.updateDepartment).delete(c.deleteDepartment);

router.post('/cycles', c.createCycle);
router.route('/cycles/:id').put(c.updateCycle).delete(c.deleteCycle);

module.exports = router;
