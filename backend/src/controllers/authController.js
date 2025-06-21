
const authService = require('../services/authService');

const register = async (req, res) => {

    try {
        const { email, password, username } = req.body;
        if (!email || !password || !username) {
            return res.status(400).json({ message: "Будь ласка, надайте email, пароль та ім'я користувача." });
        }
        const user = await authService.registerUser({ email, password, username });
        res.status(201).json({ message: 'Користувача успішно зареєстровано!', userId: user.id });
    } catch (error) {
        console.error('Помилка реєстрації:', error);
        res.status(500).json({ message: error.message || 'Під час реєстрації сталася помилка.' });
    }
};


const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Будь ласка, надайте email та пароль.' });
        }

        const data = await authService.loginUser({ email, password });

        res.status(200).json({ message: 'Вхід успішний!', ...data });

    } catch (error) {
        console.error('Помилка входу:', error);

        if (error.message === 'Неправильний email або пароль.') {
            return res.status(401).json({ message: error.message });
        }
        res.status(500).json({ message: 'Під час входу сталася помилка.' });
    }
};




module.exports = {
    register,
    login,
};
