
const prisma = require('../config/prismaClient');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { STUDENT } = require('../config/roles');

/**
 * Реєструє нового користувача.
 */
const registerUser = async (userData) => {
    const { email, password, username } = userData;

    const existingUser = await prisma.user.findFirst({
        where: {
            OR: [ { email: email }, { username: username }, ],
            deletedAt: null,
        },
    });

    if (existingUser) {
        throw new Error('Користувач з таким email або іменем вже існує серед активних користувачів.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
        data: {
            email: email,
            username: username,
            password: hashedPassword,
            role: STUDENT,
        },
    });

    return { id: newUser.id, email: newUser.email, username: newUser.username, role: newUser.role };
};

/**
 * Здійснює вхід користувача.
 */
const loginUser = async (loginData) => {
    const { email, password } = loginData;

    const user = await prisma.user.findFirst({
        where: { email: email, deletedAt: null },
    });

    if (!user) {
        throw new Error('Неправильний email або пароль, або користувача не знайдено.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        throw new Error('Неправильний email або пароль.');
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        console.error("Помилка: JWT_SECRET не встановлено у .env файлі!");
        throw new Error("Помилка конфігурації сервера.");
    }

    const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role, },
        jwtSecret,
        { expiresIn: '24h' }
    );

    return {
        token,
        user: { id: user.id, email: user.email, username: user.username, role: user.role, },
    };
};

module.exports = {
    registerUser,
    loginUser,
};