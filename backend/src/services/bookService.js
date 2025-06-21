
const prisma = require('../config/prismaClient');


const createBook = async (bookData) => {
    console.log("[Service - createBook] Початок. Дані:", bookData);
    const { title, author, genre, description, isbn, publishedYear, publisher, totalCopies, materialType } = bookData;
    const copies = totalCopies ? parseInt(totalCopies, 10) : 1;
    if (isNaN(copies) || copies < 0) {
        console.log("[Service - createBook] Помилка: Неправильна кількість екземплярів.");
        throw new Error('Загальна кількість екземплярів (totalCopies) має бути невід\'ємним числом.');
    }
    console.log("[Service - createBook] Крок 1: Кількість екземплярів перевірено:", copies);
    if (isbn) {
        console.log(`[Service - createBook] Крок 2: Перевірка ISBN (${isbn}) на унікальність серед активних...`);
        const existingBook = await prisma.book.findFirst({ where: { isbn, deletedAt: null } });
        if (existingBook) {
            console.log(`[Service - createBook] Помилка: Активна книга з ISBN ${isbn} вже існує.`);
            throw new Error(`Активна книга з ISBN ${isbn} вже існує.`);
        }
        console.log("[Service - createBook] Крок 2а: Перевірку ISBN завершено.");
    } else {
        console.log("[Service - createBook] Крок 2: ISBN не надано, пропускаємо перевірку унікальності.");
    }
    try {
        console.log("[Service - createBook] Крок 3: Спроба створити запис книги в БД...");
        const newBook = await prisma.book.create({
            data: {
                title, author, genre, description, isbn,
                publishedYear: publishedYear ? parseInt(publishedYear, 10) : null,
                publisher,
                totalCopies: copies,
                availableCopies: copies,
                materialType,
                deletedAt: null,
            },
        });
        console.log("[Service - createBook] Крок 3а: Книгу успішно створено в БД, ID:", newBook.id);
        return newBook;
    } catch (error) {
        console.error("[Service - createBook] ПОМИЛКА під час prisma.book.create:", error);
        throw error;
    }
};


const findAllBooks = async (searchParams, paginationParams, includeDeleted = false) => {
    const { title, author, genre, materialType } = searchParams;
    const { page, limit } = paginationParams;
    console.log("[Service] Запуск findAllBooks з параметрами пошуку:", searchParams, "пагінації:", paginationParams, "includeDeleted:", includeDeleted);
    const whereConditions = {};
    if (!includeDeleted) {
        whereConditions.deletedAt = null;
    }
    if (materialType) { whereConditions.materialType = { contains: materialType }; }
    if (title) { whereConditions.title = { contains: title, }; }
    if (author) { whereConditions.author = { contains: author, }; }
    if (genre) { whereConditions.genre = { contains: genre, }; }
    const skip = (page - 1) * limit;
    try {
        const books = await prisma.book.findMany({
            where: whereConditions,
            skip: skip,
            take: limit,
            orderBy: { title: 'asc' }
        });
        const totalBooks = await prisma.book.count({ where: whereConditions, });
        console.log(`[Service] Знайдено книг (з фільтрами та пагінацією): ${books.length}, Всього: ${totalBooks}`);
        return { books, totalBooks, currentPage: page, totalPages: Math.ceil(totalBooks / limit) };
    } catch (error) {
        console.error("[Service] Помилка Prisma у findAllBooks:", error);
        throw error;
    }
};


/**
 * Знаходить книгу за її ID.
 * @param {string} bookId - ID книги.
 * @returns {Promise<Book|null>} - Об'єкт книги або null, якщо не знайдено.
 */
const findBookById = async (bookId) => {
    console.log(`[Service - findBookById] Пошук книги з ID: ${bookId}`);
    try {
        const book = await prisma.book.findFirst({
            where: {
                id: bookId,
                deletedAt: null
            }

        });
        if (book) {
            console.log(`[Service - findBookById] Книгу знайдено:`, book.title);
        } else {
            console.log(`[Service - findBookById] Активну книгу з ID ${bookId} не знайдено.`);
        }
        return book;
    } catch (error) {
        console.error(`[Service - findBookById] Помилка Prisma при пошуку книги з ID ${bookId}:`, error);
        throw error;
    }
};



const updateBook = async (bookId, bookData) => {

    console.log(`[Service] Оновлення книги ID: ${bookId} з даними:`, bookData);
    const { title, author, genre, description, isbn, publishedYear, publisher, totalCopies, availableCopies, materialType } = bookData;
    const existingBook = await prisma.book.findFirst({ where: { id: bookId, deletedAt: null } });
    if (!existingBook) { throw new Error('Активну книгу з таким ID не знайдено.'); }
    if (isbn && isbn !== existingBook.isbn) {
        const existingISBN = await prisma.book.findFirst({ where: { isbn, deletedAt: null } });
        if (existingISBN) { throw new Error(`Активна книга з ISBN ${isbn} вже існує.`); }
    }
    const dataToUpdate = {};
    if (title !== undefined) dataToUpdate.title = title;
    if (author !== undefined) dataToUpdate.author = author;
    if (genre !== undefined) dataToUpdate.genre = genre;
    if (description !== undefined) dataToUpdate.description = description;
    if (isbn !== undefined) dataToUpdate.isbn = isbn;
    if (publishedYear !== undefined) dataToUpdate.publishedYear = publishedYear ? parseInt(publishedYear, 10) : null;
    if (publisher !== undefined) dataToUpdate.publisher = publisher;
    if (materialType !== undefined) dataToUpdate.materialType = materialType;
    if (totalCopies !== undefined) {
        const newTotalCopies = parseInt(totalCopies, 10);
        if (isNaN(newTotalCopies) || newTotalCopies < 0) { throw new Error('Загальна кількість екземплярів має бути невід\'ємним числом.'); }
        dataToUpdate.totalCopies = newTotalCopies;
        const borrowedCount = existingBook.totalCopies - existingBook.availableCopies;
        if (newTotalCopies < borrowedCount) { throw new Error(`Неможливо встановити загальну кількість екземплярів (${newTotalCopies}) меншою, ніж кількість вже позичених книг (${borrowedCount}).`); }
        dataToUpdate.availableCopies = newTotalCopies - borrowedCount;
    }
    if (availableCopies !== undefined && totalCopies === undefined) {
        const newAvailableCopies = parseInt(availableCopies, 10);
        if (isNaN(newAvailableCopies) || newAvailableCopies < 0) { throw new Error('Доступна кількість екземплярів має бути невід\'ємним числом.'); }
        if (newAvailableCopies > (dataToUpdate.totalCopies !== undefined ? dataToUpdate.totalCopies : existingBook.totalCopies) ) { throw new Error('Доступна кількість екземплярів не може перевищувати загальну кількість.'); }
        dataToUpdate.availableCopies = newAvailableCopies;
    }
    if (Object.keys(dataToUpdate).length === 0) { throw new Error("Немає даних для оновлення."); }
    const updatedBook = await prisma.book.update({
        where: { id: bookId },
        data: dataToUpdate,
    });
    console.log(`[Service] Книгу ID: ${bookId} успішно оновлено.`);
    return updatedBook;
};


const deleteBook = async (bookId) => {

    console.log(`[Service - deleteBook] Початок. Book ID: ${bookId}`);
    try {
        console.log(`[Service - deleteBook] Крок 1: Пошук існуючої активної книги...`);
        const existingBook = await prisma.book.findFirst({ where: { id: bookId, deletedAt: null } });
        if (!existingBook) {
            console.log(`[Service - deleteBook] Крок 1а: Активну книгу не знайдено.`);
            throw new Error('Активну книгу з таким ID не знайдено.');
        }
        console.log(`[Service - deleteBook] Крок 1а: Активну книгу знайдено.`);
        console.log(`[Service - deleteBook] Крок 2: Перевірка активних позичань...`);
        const activeBorrows = await prisma.borrow.count({ where: { bookId: bookId, returnDate: null } });
        console.log(`[Service - deleteBook] Крок 2а: Активних позичань: ${activeBorrows}`);
        if (activeBorrows > 0) {
            throw new Error('Неможливо видалити книгу, оскільки вона зараз позичена.');
        }
        console.log(`[Service - deleteBook] Крок 3: Перевірка активних запитів...`);
        const activeRequests = await prisma.bookRequest.count({ where: { bookId: bookId, status: 'PENDING' } });
        console.log(`[Service - deleteBook] Крок 3а: Активних запитів: ${activeRequests}`);
        if (activeRequests > 0) {
            throw new Error('Неможливо видалити книгу, оскільки на неї є активні запити.');
        }
        console.log(`[Service - deleteBook] Крок 4: Оновлення книги (встановлення deletedAt)...`);
        await prisma.book.update({
            where: { id: bookId },
            data: { deletedAt: new Date() },
        });
        console.log(`[Service - deleteBook] Крок 4а: Книгу успішно позначено як видалену.`);
        return { message: 'Книгу успішно позначено як видалену.' };
    } catch (error) {
        console.error(`[Service - deleteBook] ПОМИЛКА для Book ID ${bookId}:`, error);
        throw error;
    }
};


const restoreBook = async (bookId) => {

    console.log(`[Service - restoreBook] Початок. Book ID: ${bookId}`);
    try {
        console.log(`[Service - restoreBook] Крок 1: Пошук книги (включаючи видалені)...`);
        const bookToRestore = await prisma.book.findUnique({
            where: { id: bookId },
        });
        if (!bookToRestore) {
            console.log(`[Service - restoreBook] Крок 1а: Книгу не знайдено.`);
            throw new Error('Книгу з таким ID не знайдено.');
        }
        if (bookToRestore.deletedAt === null) {
            console.log(`[Service - restoreBook] Крок 1а: Книга не є видаленою.`);
            throw new Error('Ця книга не є видаленою.');
        }
        console.log(`[Service - restoreBook] Крок 1а: Книгу знайдено, вона "видалена".`);
        if (bookToRestore.isbn) {
            console.log(`[Service - restoreBook] Крок 2: Перевірка унікальності ISBN (${bookToRestore.isbn}) серед активних книг...`);
            const activeBookWithSameISBN = await prisma.book.findFirst({
                where: { isbn: bookToRestore.isbn, deletedAt: null, id: { not: bookId } }
            });
            if (activeBookWithSameISBN) {
                console.log(`[Service - restoreBook] Крок 2а: Знайдено активну книгу з таким же ISBN.`);
                throw new Error(`Неможливо відновити книгу: активна книга з ISBN ${bookToRestore.isbn} вже існує. Змініть ISBN перед відновленням.`);
            }
            console.log(`[Service - restoreBook] Крок 2а: Конфлікту ISBN не знайдено.`);
        }
        console.log(`[Service - restoreBook] Крок 3: Оновлення книги (скидання deletedAt)...`);
        const restoredBook = await prisma.book.update({
            where: { id: bookId },
            data: { deletedAt: null },
        });
        console.log(`[Service - restoreBook] Крок 3а: Книгу успішно відновлено.`);
        return restoredBook;
    } catch (error) {
        console.error(`[Service - restoreBook] ПОМИЛКА для Book ID ${bookId}:`, error);
        throw error;
    }
};

module.exports = {
    createBook,
    findAllBooks,
    findBookById,
    updateBook,
    deleteBook,
    restoreBook,
};