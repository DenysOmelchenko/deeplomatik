// backend/src/controllers/requestController.js
const requestService = require('../services/requestService');

const listPendingRequests = async (req, res) => {
    console.log("[Request Controller] Отримано запит на список PENDING запитів.");
    try {
        const pendingRequests = await requestService.getPendingRequests();
        res.status(200).json(pendingRequests);
    } catch (error) {
        console.error("[Request Controller] Помилка отримання PENDING запитів:", error);
        res.status(500).json({ message: error.message || 'Не вдалося отримати список запитів.' });
    }
};

const approveRequest = async (req, res) => {
    const { requestId } = req.params;
    const adminId = req.user.userId;

    console.log(`[Request Controller] Отримано запит на схвалення запиту ID: ${requestId} від адміна ID: ${adminId}`);
    try {
        if (!requestId) {
            return res.status(400).json({ message: 'Необхідно вказати ID запиту.' });
        }
        const approvedRequest = await requestService.approveBookRequest(requestId, adminId);
        res.status(200).json({ message: 'Запит на книгу успішно схвалено!', request: approvedRequest });
    } catch (error) {
        console.error(`[Request Controller] Помилка схвалення запиту ID ${requestId}:`, error);
        res.status(400).json({ message: error.message || 'Не вдалося схвалити запит.' });
    }
};

const rejectRequestController = async (req, res) => {
    const { requestId } = req.params; // ID запиту з URL
    const adminId = req.user.userId; // ID адміна з токену

    console.log(`[Request Controller] Отримано запит на відхилення запиту ID: ${requestId} від адміна ID: ${adminId}`);
    try {
        if (!requestId) {
            return res.status(400).json({ message: 'Необхідно вказати ID запиту.' });
        }

        const rejectedRequest = await requestService.rejectBookRequest(requestId, adminId);
        res.status(200).json({ message: 'Запит на книгу успішно відхилено!', request: rejectedRequest });

    } catch (error) {
        console.error(`[Request Controller] Помилка відхилення запиту ID ${requestId}:`, error);
        // Якщо помилка через те, що запит не знайдено або вже оброблено
        if (error.message.includes('не знайдено') || error.message.includes('вже був оброблений')) {
            return res.status(404).json({ message: error.message });
        }
        res.status(500).json({ message: error.message || 'Не вдалося відхилити запит.' });
    }
};

module.exports = {
    listPendingRequests,
    approveRequest,
    rejectRequestController,
};