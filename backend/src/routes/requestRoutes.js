
const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');
const authMiddleware = require('../middlewares/authMiddleware');
const { isAdmin } = require('../middlewares/roleMiddleware');


router.get('/pending', authMiddleware, isAdmin, requestController.listPendingRequests);


router.post('/:requestId/approve', authMiddleware, isAdmin, requestController.approveRequest);


router.post('/:requestId/reject', authMiddleware, isAdmin, requestController.rejectRequestController);


module.exports = router;