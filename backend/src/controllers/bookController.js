
const bookService = require('../services/bookService');
const requestService = require('../services/requestService');


const addBook = async (req, res) => {

    console.log('[BookController - addBook] Початок обробки запиту. Тіло запиту:', req.body);
    try {
        const { title, author, genre, description, isbn, publishedYear, publisher, totalCopies, materialType } = req.body;
        if (!title || !author || !genre) {
            console.log('[BookController - addBook] Помилка: Не надано обов\'язкові поля (title, author, genre).');
            return res.status(400).json({ message: 'Назва, автор та жанр є обов\'язковими.' });
        }
        if (totalCopies === undefined || totalCopies === null || parseInt(totalCopies, 10) <= 0) {
            console.log('[BookController - addBook] Помилка: Неправильна кількість totalCopies.');
            return res.status(400).json({ message: 'Загальна кількість екземплярів (totalCopies) має бути позитивним числом.' });
        }
        let year = publishedYear;
        if (year !== undefined && year !== null) {
            year = parseInt(year, 10);
            if (isNaN(year)) {
                console.log('[BookController - addBook] Помилка: publishedYear не є числом.');
                return res.status(400).json({ message: 'Рік видання (publishedYear) має бути числом.' });
            }
        }
        const numTotalCopies = parseInt(totalCopies, 10);
        const bookData = { title, author, genre, description, isbn, publishedYear: year, publisher, totalCopies: numTotalCopies, materialType };
        console.log('[BookController - addBook] Виклик bookService.createBook з даними:', bookData);
        const book = await bookService.createBook(bookData);
        console.log('[BookController - addBook] Книгу створено, надсилаємо відповідь.');
        res.status(201).json({ message: 'Книгу успішно додано!', book });
    } catch (error) {
        console.error("[BookController - addBook] Помилка додавання книги:", error);
        if (error.message.includes('Книга з ISBN') || error.message.includes('totalCopies') || error.message.includes('publishedYear')) {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: error.message || 'Не вдалося додати книгу.' });
    }
};


const getAllBooks = async (req, res) => {

    const { title, author, genre, materialType, includeDeleted } = req.query;
    const searchParams = { title, author, genre, materialType };
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    if (page <= 0) { return res.status(400).json({ message: 'Номер сторінки має бути позитивним числом.'}); }
    if (limit <= 0) { return res.status(400).json({ message: 'Ліміт елементів на сторінці має бути позитивним числом.'}); }
    const paginationParams = { page, limit };
    const showDeleted = includeDeleted === 'true';
    console.log("[Controller] Отримано запит GET /api/books з параметрами пошуку:", searchParams, "пагінації:", paginationParams, "includeDeleted:", showDeleted);
    try {
        const result = await bookService.findAllBooks(searchParams, paginationParams, showDeleted);
        res.status(200).json(result);
    } catch (error) {
        console.error("[Controller] Помилка отримання книг:", error);
        res.status(500).json({ message: 'Не вдалося отримати книги.' });
    }
};


const getBookById = async (req, res) => {
    const { bookId } = req.params;
    console.log(`[Controller - getBookById] Отримано запит на книгу з ID: ${bookId}`);
    try {
        const book = await bookService.findBookById(bookId);
        if (!book) {
            console.log(`[Controller - getBookById] Книгу з ID ${bookId} не знайдено.`);
            return res.status(404).json({ message: 'Книгу не знайдено.' });
        }
        console.log(`[Controller - getBookById] Книгу знайдено, надсилаємо відповідь.`);
        res.status(200).json(book);
    } catch (error) {
        console.error(`[Controller - getBookById] Помилка отримання книги з ID ${bookId}:`, error);
        res.status(500).json({ message: 'Не вдалося отримати інформацію про книгу.' });
    }
};



const requestBook = async (req, res) => {

    try {
        const { bookId } = req.params;
        const userId = req.user.userId;
        if (!bookId) { return res.status(400).json({ message: 'Необхідно вказати ID книги.' }); }
        const request = await requestService.createRequest(userId, bookId);
        res.status(201).json({ message: 'Запит на книгу успішно створено!', request });
    } catch (error) {
        console.error("Помилка створення запиту на книгу:", error);
        res.status(400).json({ message: error.message || 'Не вдалося створити запит.' });
    }
};


const editBook = async (req, res) => {

    const { bookId } = req.params;
    const { title, author, genre, description, isbn, publishedYear, publisher, totalCopies, availableCopies, materialType } = req.body;
    const bookData = { title, author, genre, description, isbn, publishedYear, publisher, totalCopies, availableCopies, materialType };
    console.log(`[Controller] Отримано запит PUT /api/books/${bookId} з даними:`, bookData);
    try {
        const hasUpdateData = Object.values(bookData).some(value => value !== undefined);
        if (!hasUpdateData) { return res.status(400).json({ message: 'Необхідно надати хоча б одне поле для оновлення.' }); }
        if (bookData.publishedYear !== undefined && bookData.publishedYear !== null) {
            const year = parseInt(bookData.publishedYear, 10);
            if (isNaN(year)) { return res.status(400).json({ message: 'Рік видання (publishedYear) має бути числом.' }); }
            bookData.publishedYear = year;
        }
        if (bookData.totalCopies !== undefined && bookData.totalCopies !== null) {
            const copies = parseInt(bookData.totalCopies, 10);
            if (isNaN(copies) || copies < 0) { return res.status(400).json({ message: 'Загальна кількість екземплярів (totalCopies) має бути невід\'ємним числом.' }); }
            bookData.totalCopies = copies;
        }
        if (bookData.availableCopies !== undefined && bookData.availableCopies !== null) {
            const copies = parseInt(bookData.availableCopies, 10);
            if (isNaN(copies) || copies < 0) { return res.status(400).json({ message: 'Доступна кількість екземплярів (availableCopies) має бути невід\'ємним числом.' }); }
            bookData.availableCopies = copies;
        }
        const updatedBook = await bookService.updateBook(bookId, bookData);
        res.status(200).json({ message: 'Книгу успішно оновлено!', book: updatedBook });
    } catch (error) {
        console.error(`[Controller] Помилка оновлення книги ID ${bookId}:`, error);
        if (error.message.includes('не знайдено') || error.message.includes('Книга з ISBN') || error.message.includes('Неможливо встановити') || error.message.includes('не може перевищувати') || error.message.includes('має бути числом')) {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: error.message || 'Не вдалося оновити книгу.' });
    }
};


const removeBook = async (req, res) => {

    const { bookId } = req.params;
    console.log(`[Controller - removeBook] Початок. Book ID: ${bookId}. Запит від User ID: ${req.user ? req.user.userId : 'Невідомий (токен не перевірено)'}`);
    try {
        console.log(`[Controller - removeBook] Виклик bookService.deleteBook для ID: ${bookId}`);
        const result = await bookService.deleteBook(bookId);
        console.log(`[Controller - removeBook] Результат від сервісу для ID ${bookId}:`, result);
        res.status(200).json(result);
    } catch (error) {
        console.error(`[Controller - removeBook] Помилка "м'якого" видалення книги ID ${bookId}:`, error);
        if (error.message.includes('не знайдено') || error.message.includes('Неможливо видалити книгу')) {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: error.message || 'Не вдалося позначити книгу як видалену.' });
    }
};

const restoreBookController = async (req, res) => {
    // ... (код залишається без змін) ...
    const { bookId } = req.params;
    console.log(`[Controller] Отримано запит POST /api/books/${bookId}/restore`);
    try {
        const restoredBook = await bookService.restoreBook(bookId);
        res.status(200).json({ message: 'Книгу успішно відновлено!', book: restoredBook });
    } catch (error) {
        console.error(`[Controller] Помилка відновлення книги ID ${bookId}:`, error);
        if (error.message.includes('не знайдено') || error.message.includes('не є видаленою') || error.message.includes('Неможливо відновити')) {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: error.message || 'Не вдалося відновити книгу.' });
    }
};

module.exports = {
    addBook,
    getAllBooks,
    getBookById,
    requestBook,
    editBook,
    removeBook,
    restoreBookController,
};