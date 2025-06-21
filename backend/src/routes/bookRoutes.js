
const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');
const authMiddleware = require('../middlewares/authMiddleware');
const { isAdmin } = require('../middlewares/roleMiddleware');


router.get('/', bookController.getAllBooks);


router.get('/:bookId', bookController.getBookById);



router.post('/',
    (req, res, next) => { /* ... логер ... */
        console.log(`[BookRoutes] Отримано POST запит на /api/books (створення). Тіло:`, req.body);
        next();
    },
    authMiddleware,
    (req, res, next) => { /* ... логер ... */
        console.log('[BookRoutes] POST /api/books: Після authMiddleware, перед isAdmin.');
        next();
    },
    isAdmin,
    (req, res, next) => { /* ... логер ... */
        console.log('[BookRoutes] POST /api/books: Після isAdmin, перед bookController.addBook.');
        next();
    },
    bookController.addBook
);


router.post('/:bookId/request', authMiddleware, bookController.requestBook);


router.put('/:bookId', authMiddleware, isAdmin, bookController.editBook);


router.delete('/:bookId',
    authMiddleware,
    isAdmin,
    (req, res, next) => { /* ... логер ... */
        console.log(`[Routes - bookRoutes.js] Отримано DELETE запит на /api/books/${req.params.bookId}`);
        next();
    },
    bookController.removeBook
);


router.post('/:bookId/restore', authMiddleware, isAdmin, bookController.restoreBookController);

module.exports = router;