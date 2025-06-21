
const borrowService = require('../services/borrowService');

const returnBookController = async (req, res) => {
    const { borrowId } = req.params;
    const userId = req.user.userId;

    console.log(`[Borrow Controller] Отримано запит на повернення книги: Borrow ID ${borrowId} від User ID ${userId}`);
    try {
        if (!borrowId) {
            return res.status(400).json({ message: 'Необхідно вказати ID позичання.' });
        }

        const returnedBorrow = await borrowService.returnBook(borrowId, userId);
        res.status(200).json({ message: 'Книгу успішно повернуто!', borrow: returnedBorrow });

    } catch (error) {
        console.error(`[Borrow Controller] Помилка повернення книги (Borrow ID ${borrowId}):`, error);
        res.status(400).json({ message: error.message || 'Не вдалося повернути книгу.' });
    }
};

module.exports = {
    returnBookController,
};