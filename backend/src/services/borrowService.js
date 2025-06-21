// backend/src/services/borrowService.js
const prisma = require('../config/prismaClient');

/**
 * Повертає позичену книгу.
 */
const returnBook = async (borrowId, userId) => {
    console.log(`[Borrow Service] Початок returnBook: Borrow ID ${borrowId}, User ID ${userId}`);
    return prisma.$transaction(async (tx) => {
        console.log("[Borrow Service] Крок 1: Пошук запису Borrow...");
        const borrowRecord = await tx.borrow.findUnique({ where: { id: borrowId }, });
        if (!borrowRecord) { throw new Error('Запис про позичання не знайдено.'); }
        console.log("[Borrow Service] Крок 1а: Запис Borrow знайдено.");
        if (borrowRecord.userId !== userId) {
            throw new Error('Ви не можете повернути цю книгу, оскільки її позичали не ви.');
        }
        console.log("[Borrow Service] Крок 1б: Користувач вірний.");
        if (borrowRecord.returnDate !== null) {
            throw new Error('Ця книга вже була повернута.');
        }
        console.log("[Borrow Service] Крок 1в: Книга ще не повернута.");

        console.log("[Borrow Service] Крок 2: Оновлення запису Borrow...");
        const updatedBorrowRecord = await tx.borrow.update({
            where: { id: borrowId },
            data: { returnDate: new Date() },
        });
        console.log("[Borrow Service] Крок 2а: Запис Borrow оновлено.");

        console.log("[Borrow Service] Крок 3: Оновлення статусу availableCopies книги...");
        const book = await tx.book.findUnique({where: {id: borrowRecord.bookId}});
        if (book && book.availableCopies < book.totalCopies) { // Запобігаємо перевищенню totalCopies
            await tx.book.update({
                where: { id: borrowRecord.bookId },
                data: { availableCopies: { increment: 1 } }, // Збільшуємо на 1
            });
            console.log("[Borrow Service] Крок 3а: Статус availableCopies книги оновлено.");
        } else if (book) {
            console.log(`[Borrow Service] Крок 3а: availableCopies (${book.availableCopies}) вже дорівнює totalCopies (${book.totalCopies}). Не збільшуємо.`);
        } else {
            console.error(`[Borrow Service] Крок 3а: Книгу з ID ${borrowRecord.bookId} не знайдено для оновлення availableCopies.`);
        }
        // --------------------------------------

        console.log("[Borrow Service] Книгу успішно повернуто.");
        return updatedBorrowRecord;
    });
};

module.exports = {
    returnBook,
};