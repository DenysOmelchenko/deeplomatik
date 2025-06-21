
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');
const { isAdmin } = require('../middlewares/roleMiddleware');


router.get('/me/activity', authMiddleware, userController.getMyActivityController);


router.get('/me/borrowing-history', authMiddleware, userController.getMyBorrowingHistoryController);



router.get('/', authMiddleware, isAdmin, userController.listAllUsersController);
router.put('/:userId/role', authMiddleware, isAdmin, userController.changeUserRoleController);
router.put('/:userId', authMiddleware, isAdmin, userController.updateUserControllerByAdmin);
router.delete('/:userId', authMiddleware, isAdmin, userController.deleteUserControllerByAdmin);
router.post('/:userId/restore', authMiddleware, isAdmin, userController.restoreUserControllerByAdmin);

module.exports = router;