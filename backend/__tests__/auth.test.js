
const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/prismaClient');

describe('Auth Endpoints', () => {
    const uniqueSuffix = Date.now();
    const testUser = {
        username: `testuser_${uniqueSuffix}`,
        email: `test_${uniqueSuffix}@example.com`,
        password: 'password123'
    };
    const anotherTestUserCredentials = {
        username: `anotheruser_${uniqueSuffix}`,
        email: `another_${uniqueSuffix}@example.com`,
        password: 'anotherpassword'
    }

    let userToken = '';


    describe('POST /api/auth/register', () => {
        it('має реєструвати нового користувача успішно', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    username: testUser.username,
                    email: testUser.email,
                    password: testUser.password
                });
            expect(response.statusCode).toBe(201);
            expect(response.body).toHaveProperty('message', 'Користувача успішно зареєстровано!');
            expect(response.body).toHaveProperty('userId');
        });

        it('має повертати помилку, якщо email вже використовується', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    username: anotherTestUserCredentials.username,
                    email: testUser.email,
                    password: anotherTestUserCredentials.password
                });
            expect(response.statusCode).toBe(500);
            expect(response.body).toHaveProperty('message', 'Користувач з таким email або іменем вже існує.');
        });

        it('має повертати помилку, якщо username вже використовується', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    username: testUser.username,
                    email: anotherTestUserCredentials.email,
                    password: anotherTestUserCredentials.password
                });
            expect(response.statusCode).toBe(500);
            expect(response.body).toHaveProperty('message', 'Користувач з таким email або іменем вже існує.');
        });

        it('має повертати помилку, якщо не надано email, password або username', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    username: 'someuser_incomplete'

                });
            expect(response.statusCode).toBe(400);
            expect(response.body).toHaveProperty('message', 'Будь ласка, надайте email, пароль та ім\'я користувача.');
        });
    });


    describe('POST /api/auth/login', () => {

        it('має успішно логінити зареєстрованого користувача та повертати токен', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: testUser.email,
                    password: testUser.password
                });
            expect(response.statusCode).toBe(200);
            expect(response.body).toHaveProperty('message', 'Вхід успішний!');
            expect(response.body).toHaveProperty('token');
            expect(response.body).toHaveProperty('user');
            expect(response.body.user.email).toBe(testUser.email);
            userToken = response.body.token;
        });

        it('має повертати помилку для незареєстрованого email', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: `nonexistent_${uniqueSuffix}@example.com`,
                    password: 'somepassword'
                });
            expect(response.statusCode).toBe(401);
            expect(response.body).toHaveProperty('message', 'Неправильний email або пароль.');
        });

        it('має повертати помилку для неправильного пароля', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: testUser.email,
                    password: 'wrongpassword'
                });
            expect(response.statusCode).toBe(401);
            expect(response.body).toHaveProperty('message', 'Неправильний email або пароль.');
        });

        it('має повертати помилку, якщо не надано email або password', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: testUser.email

                });
            expect(response.statusCode).toBe(400);
            expect(response.body).toHaveProperty('message', 'Будь ласка, надайте email та пароль.');
        });
    });


    afterAll(async () => {
        try {


            await prisma.user.deleteMany({
                where: {
                    OR: [
                        { email: testUser.email },
                        { username: testUser.username },
                        { email: anotherTestUserCredentials.email },
                        { username: anotherTestUserCredentials.username }


                    ]
                }
            });
            console.log('Тестові користувачі видалені');
        } catch (error) {


            console.error("Помилка під час очищення тестових даних (користувачів):", error);
        } finally {

            await prisma.$disconnect();
            console.log('З\'єднання з Prisma закрито');
        }
    });
});