
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const bookRoutes = require('./routes/bookRoutes');
const requestRoutes = require('./routes/requestRoutes');
const borrowRoutes = require('./routes/borrowRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = [
    'https://my-education-institution-library.netlify.app',
    'http://localhost:63342'
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    }
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.status(200).json({ message: 'Вітаємо у API нашої бібліотеки!' });
});

app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/borrows', borrowRoutes);
app.use('/api/users', userRoutes);



if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Сервер успішно запущено і працює на порту ${PORT}`);
        console.log(`Перевірити можна за адресою: http://localhost:${PORT}`);
    });
}

module.exports = app;
