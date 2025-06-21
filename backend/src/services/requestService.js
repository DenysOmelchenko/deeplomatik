
const prisma = require('../config/prismaClient');
const { STUDENT_ROLE, TEACHER_ROLE, LIBRARIAN_ROLE } = require('./userService');

const getBorrowingRules = (userRole) => {
    switch (userRole) {
        case TEACHER_ROLE: return { limit: 10, durationDays: 30 };
        case LIBRARIAN_ROLE: return { limit: 15, durationDays: 60 };
        case STUDENT_ROLE: default: return { limit: 4, durationDays: 14 };
    }
};

const createRequest = async (userId, bookId) => {
    console.log(`[Request Service] Початок createRequest: Користувач ${userId}, Книга ${bookId}`);
    try {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) { throw new Error('Користувача не знайдено для створення запиту.'); }
        const userRules = getBorrowingRules(user.role);

        console.log("[Request Service] Крок 1 (createRequest): Пошук книги...");
        const book = await prisma.book.findUnique({ where: { id: bookId } });
        console.log("[Request Service] Крок 1а (createRequest): Книгу знайдено:", book ? book.id : 'Не знайдено');
        if (!book) { throw new Error('Книгу не знайдено.'); }

        if (book.availableCopies <= 0) { throw new Error('Ця книга наразі недоступна (немає вільних екземплярів).'); }

        console.log("[Request Service] Крок 2 (createRequest): Перевірка існуючих запитів...");
        const existingRequest = await prisma.bookRequest.findFirst({
            where: { userId: userId, bookId: bookId, status: { not: 'REJECTED' } }
        });
        console.log("[Request Service] Крок 2а (createRequest): Існуючий запит:", existingRequest ? existingRequest.id : 'Немає');
        const existingBorrow = await prisma.borrow.findFirst({
            where: { userId: userId, bookId: bookId, returnDate: null }
        });
        console.log("[Request Service] Крок 2c (createRequest): Існуюче позичання:", existingBorrow ? existingBorrow.id : 'Немає');
        if (existingRequest || existingBorrow) {
            throw new Error('Ви вже позичили або запросили цю книгу.');
        }

        console.log(`[Request Service] Крок 3 (createRequest): Перевірка ліміту (${userRules.limit}) книг для ролі ${user.role}...`);
        const borrowCount = await prisma.borrow.count({ where: { userId: userId, returnDate: null } });
        console.log("[Request Service] Крок 3а (createRequest): Кількість книг:", borrowCount);
        if (borrowCount >= userRules.limit) {
            throw new Error(`Ви не можете мати більше ${userRules.limit} книг одночасно для вашої ролі. Спочатку поверніть якусь книгу.`);
        }

        console.log("[Request Service] Крок 4 (createRequest): Створення запиту...");
        const newRequest = await prisma.bookRequest.create({
            data: { userId: userId, bookId: bookId, status: 'PENDING', },
        });
        console.log("[Request Service] Крок 4а (createRequest): Запит створено:", newRequest.id);
        console.log("[Request Service] Запит успішно створено.");
        return newRequest;
    } catch (error) {
        console.error("[Request Service] ВИНИКЛА ПОМИЛКА в createRequest:", error);
        throw error;
    }
};

const getPendingRequests = async () => {

    console.log("[Request Service] Початок getPendingRequests: Отримання запитів зі статусом PENDING...");
    try {
        const pendingRequests = await prisma.bookRequest.findMany({
            where: { status: 'PENDING' },
            include: {
                user: { select: { id: true, username: true, email: true, role: true } },
                book: { select: { id: true, title: true, author: true, availableCopies: true, totalCopies: true } }
            },
            orderBy: { requestDate: 'asc' }
        });
        console.log(`[Request Service] Знайдено ${pendingRequests.length} PENDING запитів.`);
        return pendingRequests;
    } catch (error) {
        console.error("[Request Service] Помилка отримання PENDING запитів:", error);
        throw error;
    }
};

const approveBookRequest = async (requestId, adminId) => {
    console.log(`[Request Service] Початок approveBookRequest: Запит ID ${requestId}, Адмін ID ${adminId}`);
    return prisma.$transaction(async (tx) => {
        console.log("[Request Service] Крок 1 (approve): Пошук запиту...");
        const request = await tx.bookRequest.findUnique({
            where: { id: requestId },
            include: { user: true, book: true }
        });
        if (!request) { throw new Error('Запит не знайдено.'); }
        if (request.status !== 'PENDING') { throw new Error('Цей запит вже був оброблений або скасований.'); }
        console.log(`[Request Service] Крок 1а (approve): Запит знайдено для користувача ${request.userId} (роль ${request.user.role}) на книгу ${request.bookId}`);

        const userRules = getBorrowingRules(request.user.role);


        if (request.book.availableCopies <= 0) {
            await tx.bookRequest.update({ where: { id: requestId }, data: { status: 'REJECTED', approvedBy: adminId } });
            throw new Error('Книга вже недоступна (немає вільних екземплярів). Запит відхилено.');
        }

        console.log(`[Request Service] Крок 2 (approve): Перевірка ліміту (${userRules.limit}) книг для користувача...`);
        const borrowCount = await tx.borrow.count({ where: { userId: request.userId, returnDate: null } });
        console.log("[Request Service] Крок 2а (approve): Поточна кількість книг у користувача:", borrowCount);
        if (borrowCount >= userRules.limit) {
            await tx.bookRequest.update({ where: { id: requestId }, data: { status: 'REJECTED', approvedBy: adminId } });
            throw new Error(`У користувача (роль ${request.user.role}) досягнуто ліміту в ${userRules.limit} книги. Запит відхилено.`);
        }

        const borrowDate = new Date();
        const dueDate = new Date(borrowDate);
        dueDate.setDate(borrowDate.getDate() + userRules.durationDays);

        console.log(`[Request Service] Крок 3 (approve): Створення запису Borrow (тривалість ${userRules.durationDays} днів)...`);
        await tx.borrow.create({
            data: { userId: request.userId, bookId: request.bookId, borrowDate: borrowDate, dueDate: dueDate, }
        });

        console.log("[Request Service] Крок 4 (approve): Оновлення BookRequest...");
        const updatedRequest = await tx.bookRequest.update({
            where: { id: requestId },
            data: { status: 'APPROVED', approvedBy: adminId, }
        });


        console.log("[Request Service] Крок 5 (approve): Оновлення availableCopies книги...");
        await tx.book.update({
            where: { id: request.bookId },
            data: { availableCopies: { decrement: 1 } }
        });
        console.log("[Request Service] Крок 5а (approve): availableCopies книги оновлено.");

        console.log("[Request Service] Запит успішно схвалено.");
        return updatedRequest;
    });
};

const rejectBookRequest = async (requestId, adminId) => {

    console.log(`[Request Service] Початок rejectBookRequest: Запит ID ${requestId}, Адмін ID ${adminId}`);
    try {
        const request = await prisma.bookRequest.findUnique({ where: { id: requestId }, });
        if (!request) { throw new Error('Запит не знайдено.'); }
        if (request.status !== 'PENDING') { throw new Error('Цей запит вже був оброблений або скасований.'); }
        const updatedRequest = await prisma.bookRequest.update({
            where: { id: requestId },
            data: { status: 'REJECTED', approvedBy: adminId, },
        });
        console.log(`[Request Service] Запит ID ${requestId} успішно відхилено.`);
        return updatedRequest;
    } catch (error) {
        console.error(`[Request Service] Помилка відхилення запиту ID ${requestId}:`, error);
        throw error;
    }
};

module.exports = {
    createRequest,
    getPendingRequests,
    approveBookRequest,
    rejectBookRequest,
};