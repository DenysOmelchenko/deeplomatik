// backend/src/services/userService.js
const prisma = require('../config/prismaClient');
// Імпортуємо ролі з нового файлу конфігурації
const USER_ROLES_CONFIG = require('../config/roles');

const getUserActivity = async (userId) => {
    // ... (код залишається без змін) ...
    console.log(`[User Service] Отримання активності для користувача ID: ${userId}`);
    try {
        const borrowedBooks = await prisma.borrow.findMany({
            where: { userId: userId, returnDate: null, book: { deletedAt: null } },
            include: { book: true, },
            orderBy: { borrowDate: 'desc', }
        });
        const bookRequests = await prisma.bookRequest.findMany({
            where: { userId: userId, book: { deletedAt: null } },
            include: { book: true, },
            orderBy: { requestDate: 'desc', }
        });
        return { borrowedBooks, bookRequests, };
    } catch (error) {
        console.error(`[User Service] Помилка отримання активності для користувача ID ${userId}:`, error);
        throw error;
    }
};

const getAllUsers = async (paginationParams, includeDeleted = false) => {
    const { page, limit } = paginationParams;
    const skip = (page - 1) * limit;
    const whereConditions = {};
    if (!includeDeleted) {
        whereConditions.deletedAt = null;
    }
    try {
        const users = await prisma.user.findMany({
            where: whereConditions,
            select: {
                id: true, email: true, username: true, role: true, createdAt: true, updatedAt: true, deletedAt: true
            },
            skip: skip,
            take: limit,
            orderBy: { createdAt: 'desc' }
        });
        const totalUsers = await prisma.user.count({ where: whereConditions });
        return {
            users,
            totalUsers,
            currentPage: page,
            totalPages: Math.ceil(totalUsers / limit)
        };
    } catch (error) {
        console.error("[User Service] Помилка отримання списку всіх користувачів:", error);
        throw error;
    }
};

const updateUserRole = async (targetUserId, newRole) => {
    console.log(`[User Service] Початок updateUserRole: Зміна ролі для User ID ${targetUserId} на ${newRole}`);
    try {
        const definedAllowedRoles = Object.values(USER_ROLES_CONFIG);

        if (!definedAllowedRoles.includes(newRole)) {
            throw new Error(`Недійсна роль. Дозволені ролі: ${definedAllowedRoles.join(', ')}.`);
        }

        const userToUpdate = await prisma.user.findFirst({
            where: { id: targetUserId, deletedAt: null },
        });

        if (!userToUpdate) {
            throw new Error('Активного користувача з таким ID не знайдено.');
        }

        if (userToUpdate.role === USER_ROLES_CONFIG.LIBRARIAN && newRole !== USER_ROLES_CONFIG.LIBRARIAN) {
            const librariansCount = await prisma.user.count({
                where: {
                    role: USER_ROLES_CONFIG.LIBRARIAN,
                    deletedAt: null,
                },
            });
            if (librariansCount <= 1) {
                throw new Error('Неможливо змінити роль останнього адміністратора/бібліотекаря.');
            }
        }

        const updatedUser = await prisma.user.update({
            where: { id: targetUserId },
            data: { role: newRole },
            select: { // вибираємо поля, які повернуться
                id: true, email: true, username: true, role: true, createdAt: true, updatedAt: true,
            },
        });
        console.log(`[User Service] Роль для User ID ${targetUserId} успішно змінено на ${newRole}.`);
        return updatedUser;

    } catch (error) {
        console.error(`[User Service] Помилка зміни ролі для User ID ${targetUserId}:`, error.message);
        throw error;
    }
};

const updateUserProfileByAdmin = async (targetUserId, updateData) => {
    const { username, email } = updateData;
    console.log(`[User Service] Початок updateUserProfileByAdmin: Оновлення даних для User ID ${targetUserId} з:`, updateData);
    try {
        const userToUpdate = await prisma.user.findFirst({
            where: { id: targetUserId, deletedAt: null },
        });
        if (!userToUpdate) {
            throw new Error('Активного користувача з таким ID не знайдено.');
        }
        const dataToUpdate = {};
        if (username) {
            if (username !== userToUpdate.username) {
                const existingUsername = await prisma.user.findFirst({ where: { username, deletedAt: null } });
                if (existingUsername) {
                    throw new Error('Таке ім\'я активного користувача вже використовується.');
                }
            }
            dataToUpdate.username = username;
        }
        if (email) {
            if (email !== userToUpdate.email) {
                const existingEmail = await prisma.user.findFirst({ where: { email, deletedAt: null } });
                if (existingEmail) {
                    throw new Error('Такий email активного користувача вже використовується.');
                }
            }
            dataToUpdate.email = email;
        }
        if (Object.keys(dataToUpdate).length === 0) {
            throw new Error('Не надано даних для оновлення (username або email).');
        }
        const updatedUser = await prisma.user.update({
            where: { id: targetUserId },
            data: dataToUpdate,
            select: {
                id: true, email: true, username: true, role: true, createdAt: true, updatedAt: true,
            },
        });
        console.log(`[User Service] Дані для User ID ${targetUserId} успішно оновлено.`);
        return updatedUser;
    } catch (error) {
        console.error(`[User Service] Помилка оновлення даних для User ID ${targetUserId}:`, error);
        throw error;
    }
};

const deleteUserByAdmin = async (targetUserId, adminId) => {
    // ... (код залишається без змін) ...
    console.log(`[User Service] "М'яке" видалення User ID ${targetUserId} адміністратором ID ${adminId}`);
    try {
        const userToDelete = await prisma.user.findFirst({
            where: { id: targetUserId, deletedAt: null },
        });
        if (!userToDelete) {
            throw new Error('Активного користувача з таким ID не знайдено.');
        }
        if (targetUserId === adminId) {
            throw new Error('Адміністратор не може видалити свій власний обліковий запис.');
        }
        const activeBorrows = await prisma.borrow.count({
            where: { userId: targetUserId, returnDate: null, },
        });
        if (activeBorrows > 0) {
            throw new Error(`Неможливо видалити користувача. У нього є ${activeBorrows} активних позичених книг.`);
        }
        await prisma.bookRequest.updateMany({
            where: { userId: targetUserId, status: 'PENDING' },
            data: { status: 'CANCELLED' }
        });
        await prisma.user.update({
            where: { id: targetUserId },
            data: { deletedAt: new Date(), },
        });
        console.log(`[User Service] Користувача User ID ${targetUserId} успішно позначено як видаленого.`);
        return { message: 'Користувача успішно позначено як видаленого.' };
    } catch (error) {
        console.error(`[User Service] Помилка "м'якого" видалення User ID ${targetUserId}:`, error);
        throw error;
    }
};

const restoreUserByAdmin = async (targetUserId) => {
    // ... (код залишається без змін) ...
    console.log(`[User Service] Відновлення користувача User ID ${targetUserId}`);
    try {
        const userToRestore = await prisma.user.findUnique({
            where: { id: targetUserId }
        });
        if(!userToRestore){
            throw new Error('Користувача з таким ID не знайдено взагалі.');
        }
        if(userToRestore.deletedAt === null){
            throw new Error('Цей користувач не є видаленим.');
        }
        const checkEmail = await prisma.user.findFirst({ where: { email: userToRestore.email, deletedAt: null, id: {not: targetUserId}}});
        if(checkEmail){
            throw new Error(`Неможливо відновити: email ${userToRestore.email} вже використовується активним користувачем. Змініть email перед відновленням.`);
        }
        const checkUsername = await prisma.user.findFirst({ where: { username: userToRestore.username, deletedAt: null, id: {not: targetUserId}}});
        if(checkUsername){
            throw new Error(`Неможливо відновити: username ${userToRestore.username} вже використовується активним користувачем. Змініть username перед відновленням.`);
        }
        const restoredUser = await prisma.user.update({
            where: {id: targetUserId},
            data: { deletedAt: null },
            select: {
                id: true, email: true, username: true, role: true, createdAt: true, updatedAt: true,
            }
        });
        console.log(`[User Service] Користувача User ID ${targetUserId} успішно відновлено.`);
        return restoredUser;
    } catch (error) {
        console.error(`[User Service] Помилка відновлення User ID ${targetUserId}:`, error);
        throw error;
    }
};

const getUserBorrowingHistory = async (userId, paginationParams) => {
    // ... (код залишається без змін) ...
    const { page, limit } = paginationParams;
    // console.log(`[User Service] Початок getUserBorrowingHistory для User ID ${userId} з пагінацією:`, paginationParams);
    const skip = (page - 1) * limit;
    try {
        const borrows = await prisma.borrow.findMany({
            where: {
                userId: userId,
                book: { deletedAt: null }
            },
            include: {
                book: {
                    select: { id: true, title: true, author: true, genre: true, isbn: true }
                }
            },
            orderBy: {
                borrowDate: 'desc'
            },
            skip: skip,
            take: limit,
        });
        const totalBorrows = await prisma.borrow.count({
            where: {
                userId: userId,
                book: { deletedAt: null }
            },
        });
        return {
            history: borrows,
            totalItems: totalBorrows,
            currentPage: page,
            totalPages: Math.ceil(totalBorrows / limit)
        };
    } catch (error) {
        console.error(`[User Service] Помилка отримання історії позичань для User ID ${userId}:`, error);
        throw error;
    }
};

module.exports = {
    getUserActivity,
    getAllUsers,
    updateUserRole,
    updateUserProfileByAdmin,
    deleteUserByAdmin,
    restoreUserByAdmin,
    getUserBorrowingHistory,
};