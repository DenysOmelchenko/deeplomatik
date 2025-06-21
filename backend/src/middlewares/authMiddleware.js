// backend/src/middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Немає токену або неправильний формат заголовку, авторизація відхилена.' });
        }

        const token = authHeader.split(' ')[1];

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = decoded;

        next();

    } catch (error) {
        console.error('Помилка автентифікації:', error.message);
        res.status(401).json({ message: 'Токен недійсний або його термін дії сплив.' });
    }
};

module.exports = authMiddleware;