
const express = require('express');
const router = express.Router();
const borrowController = require('../controllers/borrowController');
const authMiddleware = require('../middlewares/authMiddleware');




router.post('/:borrowId/return', authMiddleware, borrowController.returnBookController);

module.exports = router;