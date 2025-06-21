
const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/prismaClient');
const { LIBRARIAN_ROLE } = require('../src/services/userService');

const adminCredentials = {
    email: 'final_final@example.com',
    password: 'a_good_password'
};
let adminToken;


const uniqueGlobalSuffix = Date.now();
let testStudentEmail = `student_booktest_${uniqueGlobalSuffix}@example.com`;
let testStudentUsername = `student_booktest_${uniqueGlobalSuffix}`;



beforeAll(async () => {
    const loginResponse = await request(app)
        .post('/api/auth/login')
        .send(adminCredentials);
    if (loginResponse.statusCode !== 200 || !loginResponse.body.token) {
        console.error('НЕ ВДАЛОСЯ ЗАЛОГІНИТИСЯ ЯК АДМІНІСТРАТОР в beforeAll (books.test.js):', loginResponse.body);
        throw new Error('Не вдалося залогінитися як адміністратор. Перевір adminCredentials.');
    }
    adminToken = loginResponse.body.token;
    console.log('Admin token отримано для тестів книг.');


    try {
        await request(app)
            .post('/api/auth/register')
            .send({ username: testStudentUsername, email: testStudentEmail, password: 'password123' });
        console.log(`Тестового студента ${testStudentUsername} створено.`);
    } catch (e) {

        console.warn(`Не вдалося створити тестового студента ${testStudentUsername} (можливо, вже існує):`, e.message);
    }
});


describe('Ізольовані тести Soft Delete та Restore для Книг', () => {
    let testBookId;
    const uniqueBookSuffix = `_crud_isolated_${Date.now()}`;
    const bookData = {
        title: `Книга для CRUD Ізольована ${uniqueBookSuffix}`,
        author: `Автор CRUD Ізол. ${uniqueBookSuffix}`,
        genre: "Ізольований Жанр",
        totalCopies: 1,
        isbn: `ISBN-CRUD-ISO-${uniqueBookSuffix}`
    };

    beforeEach(async () => {
        console.log('[BEFORE EACH CRUD] Створення тестової книги...');
        const res = await request(app)
            .post('/api/books')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(bookData);

        if (res.statusCode !== 201 || !res.body.book || !res.body.book.id) {
            console.error("[BEFORE EACH CRUD] Не вдалося створити книгу:", res.status, res.body);
            throw new Error(`Не вдалося створити книгу в beforeEach: ${res.status} - ${JSON.stringify(res.body)}`);
        }
        testBookId = res.body.book.id;
        console.log(`[BEFORE EACH CRUD] Тестову книгу створено, ID: ${testBookId}`);
    });

    afterEach(async () => {
        if (testBookId) {
            console.log(`[AFTER EACH CRUD] Видалення тестової книги ID: ${testBookId}`);
            await prisma.book.deleteMany({ where: { id: testBookId } });
            console.log(`[AFTER EACH CRUD] Тестову книгу ID: ${testBookId} видалено.`);
            testBookId = null;
        }
    });

    it('має "м\'яко" видалити книгу (DELETE /api/books/:bookId)', async () => {
        console.log(`[TEST SOFT DELETE] Початок. Book ID: ${testBookId}`);
        const response = await request(app)
            .delete(`/api/books/${testBookId}`)
            .set('Authorization', `Bearer ${adminToken}`);

        console.log('[TEST SOFT DELETE] DELETE запит виконано. Статус:', response.statusCode, 'Тіло:', JSON.stringify(response.body));
        expect(response.statusCode).toBe(200);
        expect(response.body.message).toBe('Книгу успішно позначено як видалену.');

        console.log('[TEST SOFT DELETE] Перевірка бази даних...');
        const checkDb = await prisma.book.findUnique({ where: { id: testBookId } });
        console.log('[TEST SOFT DELETE] Результат з бази даних:', checkDb);

        expect(checkDb).not.toBeNull();
        if (checkDb) {
            expect(checkDb.deletedAt).not.toBeNull();
        }
    }, 60000);

    it('має відновити "м\'яко" видалену книгу (POST /api/books/:bookId/restore)', async () => {
        console.log(`[TEST RESTORE] Початок. Book ID: ${testBookId}`);

        console.log('[TEST RESTORE] Крок 1: "М\'яке" видалення книги...');
        const deleteResponse = await request(app).delete(`/api/books/${testBookId}`).set('Authorization', `Bearer ${adminToken}`);
        expect(deleteResponse.statusCode).toBe(200);
        console.log('[TEST RESTORE] Крок 1а: Книгу "м\'яко" видалено.');

        // Потім відновлюємо
        console.log('[TEST RESTORE] Крок 2: Відновлення книги...');
        const response = await request(app)
            .post(`/api/books/${testBookId}/restore`)
            .set('Authorization', `Bearer ${adminToken}`);
        console.log('[TEST RESTORE] Крок 2а: Запит на відновлення виконано. Статус:', response.statusCode, 'Тіло:', JSON.stringify(response.body));

        expect(response.statusCode).toBe(200);
        expect(response.body.message).toBe('Книгу успішно відновлено!');

        console.log('[TEST RESTORE] Крок 3: Перевірка бази даних...');
        const checkDb = await prisma.book.findUnique({ where: { id: testBookId } });
        console.log('[TEST RESTORE] Крок 3а: Результат з бази даних після відновлення:', checkDb);

        expect(checkDb).not.toBeNull();
        if (checkDb) {
            expect(checkDb.deletedAt).toBeNull();
        }
    }, 60000);
});

afterAll(async () => {
    try {
        // Видаляємо тестового студента, створеного в глобальному beforeAll
        if (testStudentEmail) { // Перевіряємо, чи змінна визначена
            const student = await prisma.user.findUnique({ where: { email: testStudentEmail }});
            if (student) {
                await prisma.user.delete({ where: { email: testStudentEmail } });
                console.log(`Тестового студента ${testStudentEmail} видалено.`);
            }
        }
    } catch (error) {
        console.error("Помилка під час фінального очищення (студент):", error);
    } finally {
        await prisma.$disconnect();
        console.log('З\'єднання з Prisma закрито (після всіх тестів у books.test.js).');
    }
});