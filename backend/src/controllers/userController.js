
const userService = require('../services/userService');
const USER_ROLES_CONFIG = require('../config/roles');

const getMyActivityController = async (req, res) => {

    const userId = req.user.userId;
    console.log(`[User Controller] Отримано запит на активність для користувача ID: ${userId}`);
    try {
        const activity = await userService.getUserActivity(userId);
        res.status(200).json(activity);
    } catch (error) {
        console.error(`[User Controller] Помилка отримання активності для користувача ID ${userId}:`, error);
        res.status(500).json({ message: error.message || 'Не вдалося отримати активність користувача.' });
    }
};

const listAllUsersController = async (req, res) => {

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 5;
    const { includeDeleted } = req.query;
    if (page <= 0) { return res.status(400).json({ message: 'Номер сторінки має бути позитивним числом.'}); }
    if (limit <= 0) { return res.status(400).json({ message: 'Ліміт елементів на сторінці має бути позитивним числом.'}); }
    const paginationParams = { page, limit };
    const showDeleted = includeDeleted === 'true';
    console.log("[User Controller] Отримано запит на список усіх користувачів (адмін) з пагінацією:", paginationParams, "includeDeleted:", showDeleted);
    try {
        const result = await userService.getAllUsers(paginationParams, showDeleted);
        res.status(200).json(result);
    } catch (error) {
        console.error("[User Controller] Помилка отримання списку всіх користувачів:", error);
        res.status(500).json({ message: error.message || 'Не вдалося отримати список користувачів.' });
    }
};

const changeUserRoleController = async (req, res) => {
    const { userId: targetUserId } = req.params;
    const { role: newRole } = req.body;

    if (req.user.userId === targetUserId) {
        return res.status(403).json({ message: 'Адміністратор не може змінити свою власну роль через цей ендпоінт стандартним чином.' });
    }
    console.log(`[User Controller] Запит на зміну ролі для User ID ${targetUserId} на ${newRole} від Admin ID ${req.user.userId}`);

    try {
        if (!newRole) {
            return res.status(400).json({ message: 'Необхідно вказати нову роль.' });
        }

        const allowedRoleValues = Object.values(USER_ROLES_CONFIG);


        if (!allowedRoleValues.includes(newRole)) {
            return res.status(400).json({ message: `Недійсна роль. Дозволені ролі: ${allowedRoleValues.join(', ')}.` });
        }

        const updatedUser = await userService.updateUserRole(targetUserId, newRole);
        res.status(200).json({ message: 'Роль користувача успішно оновлено!', user: updatedUser });

    } catch (error) {
        console.error(`[User Controller] Помилка зміни ролі для User ID ${targetUserId}:`, error);
        if (error.message && (error.message.includes('не знайдено') || error.message.includes('Недійсна роль'))) {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: error.message || 'Не вдалося змінити роль користувача.' });
    }
};

const updateUserControllerByAdmin = async (req, res) => {
    const { userId: targetUserId } = req.params;
    const { username, email } = req.body;
    console.log(`[User Controller] Запит на оновлення даних для User ID ${targetUserId} від Admin ID ${req.user.userId}. Дані:`, req.body);
    try {
        if (!username && !email) {
            return res.status(400).json({ message: 'Необхідно надати username або email для оновлення.' });
        }
        const updateData = {};
        if (username) updateData.username = username;
        if (email) updateData.email = email;
        if (req.user.userId === targetUserId) {
            return res.status(403).json({ message: 'Адміністратор не може оновити свої власні дані (username/email) через цей ендпоінт. Зверніться до іншого адміністратора або використовуйте функціонал оновлення профілю.' });
        }
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ message: 'Не надано даних (username або email) для оновлення в тілі запиту.' });
        }
        const updatedUser = await userService.updateUserProfileByAdmin(targetUserId, updateData);
        res.status(200).json({ message: 'Дані користувача успішно оновлено!', user: updatedUser });
    } catch (error) {
        console.error(`[User Controller] Помилка оновлення даних для User ID ${targetUserId}:`, error);
        if (error.message.includes('не знайдено') || error.message.includes('вже використовується') || error.message.includes('Не надано даних')) {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: error.message || 'Не вдалося оновити дані користувача.' });
    }
};

const deleteUserControllerByAdmin = async (req, res) => {
    // ... (код без змін) ...
    const { userId: targetUserId } = req.params;
    const adminId = req.user.userId;
    console.log(`[User Controller] Запит на "м'яке" видалення User ID ${targetUserId} від Admin ID ${adminId}.`);
    try {
        const result = await userService.deleteUserByAdmin(targetUserId, adminId);
        res.status(200).json(result);
    } catch (error) {
        console.error(`[User Controller] Помилка "м'якого" видалення User ID ${targetUserId}:`, error);
        if (error.message.includes('не знайдено') || error.message.includes('Адміністратор не може') || error.message.includes('Неможливо видалити користувача')) {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: error.message || 'Не вдалося позначити користувача як видаленого.' });
    }
};

const restoreUserControllerByAdmin = async (req, res) => {
    // ... (код без змін) ...
    const { userId: targetUserId } = req.params;
    console.log(`[User Controller] Запит на відновлення User ID ${targetUserId} від Admin ID ${req.user.userId}.`);
    try {
        const restoredUser = await userService.restoreUserByAdmin(targetUserId);
        res.status(200).json({ message: 'Користувача успішно відновлено!', user: restoredUser});
    } catch (error) {
        console.error(`[User Controller] Помилка відновлення User ID ${targetUserId}:`, error);
        if (error.message.includes('не знайдено') || error.message.includes('не є видаленим') || error.message.includes('Неможливо відновити')) {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: error.message || 'Не вдалося відновити користувача.'});
    }
};

const getMyBorrowingHistoryController = async (req, res) => {
    const userId = req.user.userId;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10; // Наприклад, 10 записів на сторінку

    if (page <= 0) {
        return res.status(400).json({ message: 'Номер сторінки має бути позитивним числом.'});
    }
    if (limit <= 0) {
        return res.status(400).json({ message: 'Ліміт елементів на сторінці має бути позитивним числом.'});
    }

    const paginationParams = { page, limit };
    console.log(`[User Controller] Отримано запит на історію позичань для User ID ${userId} з пагінацією:`, paginationParams);

    try {
        const historyData = await userService.getUserBorrowingHistory(userId, paginationParams);
        res.status(200).json(historyData);
    } catch (error) {
        console.error(`[User Controller] Помилка отримання історії позичань для User ID ${userId}:`, error);
        res.status(500).json({ message: error.message || 'Не вдалося отримати історію позичань.' });
    }
};
// -----------------------------------------------------------------

module.exports = {
    getMyActivityController,
    listAllUsersController,
    changeUserRoleController,
    updateUserControllerByAdmin,
    deleteUserControllerByAdmin,
    restoreUserControllerByAdmin,
    getMyBorrowingHistoryController,
};