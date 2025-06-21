// frontend/js/book-details.js

document.addEventListener('DOMContentLoaded', async () => {
    const bookDetailsContainer = document.getElementById('bookDetailsContainer');
    const requestMessageDiv = document.getElementById('requestMessage');


    if (typeof window.API_BASE_URL === 'undefined' ||
        typeof window.isLoggedIn === 'undefined' ||
        typeof window.getToken === 'undefined') {
        console.error('Ключові функції або змінні з auth.js не доступні. Перевір порядок завантаження скриптів та їх вміст.');
        if (bookDetailsContainer) {
            bookDetailsContainer.innerHTML = '<p>Помилка завантаження сторінки: відсутні необхідні скрипти.</p>';
        }
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const bookId = params.get('id');

    if (!bookId) {
        if (bookDetailsContainer) bookDetailsContainer.innerHTML = '<p>ID книги не знайдено в URL.</p>';
        return;
    }

    if (bookDetailsContainer) bookDetailsContainer.innerHTML = '<p>Завантаження інформації про книгу...</p>';

    try {
        console.log(`[BookDetails] Запит деталей для книги ID: ${bookId}`);

        const response = await fetch(`${window.API_BASE_URL}/books/${bookId}`);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: `Помилка завантаження: ${response.statusText}` }));
            throw new Error(errorData.message || `HTTP помилка! Статус: ${response.status}`);
        }

        const book = await response.json();
        console.log("[BookDetails] Отримано дані книги:", book);
        renderBookDetails(book);

    } catch (error) {
        console.error('Помилка завантаження деталей книги:', error);
        if (bookDetailsContainer) bookDetailsContainer.innerHTML = `<p>Не вдалося завантажити деталі книги: ${error.message}</p>`;
    }

    function renderBookDetails(book) {
        if (!bookDetailsContainer) return;
        if (!book) {
            bookDetailsContainer.innerHTML = '<p>Інформацію про книгу не знайдено.</p>';
            return;
        }
        document.title = `${book.title} - Деталі Книги`;

        let html = `
            <h2>${book.title}</h2>
            <p><strong>Автор:</strong> ${book.author}</p>
            <p><strong>Жанр:</strong> ${book.genre}</p>
            ${book.materialType ? `<p><strong>Тип матеріалу:</strong> ${book.materialType}</p>` : ''}
            ${book.isbn ? `<p><strong>ISBN:</strong> ${book.isbn}</p>` : ''}
            ${book.publishedYear ? `<p><strong>Рік видання:</strong> ${book.publishedYear}</p>` : ''}
            ${book.publisher ? `<p><strong>Видавництво:</strong> ${book.publisher}</p>` : ''}
            ${book.description ? `<p><strong>Опис:</strong><br>${book.description.replace(/\n/g, '<br>')}</p>` : ''}
            <p><strong>Загальна кількість екземплярів:</strong> ${book.totalCopies}</p>
            <p><strong>Доступно екземплярів:</strong> ${book.availableCopies}</p>
            <p><strong>Статус:</strong> ${book.deletedAt ? 'Видалена (недоступна)' : (book.availableCopies > 0 ? 'Доступна' : 'Немає в наявності')}</p>
        `;


        if (window.isLoggedIn() && book.availableCopies > 0 && !book.deletedAt) {
            html += `<button id="requestBookButton" data-book-id="${book.id}">Запросити цю книгу</button>`;
        } else if (window.isLoggedIn() && (book.availableCopies <= 0 || book.deletedAt)) {
            html += `<p style="color: orange;">Цю книгу наразі неможливо запросити.</p>`;
        } else if (!window.isLoggedIn() && book.availableCopies > 0 && !book.deletedAt) {
            html += `<p>Щоб запросити книгу, будь ласка, <a href="login.html?redirect=book-details.html?id=${book.id}">увійдіть</a> або <a href="register.html">зареєструйтеся</a>.</p>`;
        }

        bookDetailsContainer.innerHTML = html;

        const requestButton = document.getElementById('requestBookButton');
        if (requestButton) {
            requestButton.addEventListener('click', handleRequestBook);
        }
    }

    async function handleRequestBook(event) {
        if(!requestMessageDiv) return;
        const bookId = event.target.dataset.bookId;
        const token = window.getToken();

        if (!token) {
            requestMessageDiv.textContent = 'Будь ласка, увійдіть, щоб запросити книгу.';
            requestMessageDiv.style.color = 'red';
            return;
        }

        requestMessageDiv.textContent = 'Надсилаємо запит...';
        requestMessageDiv.style.color = 'blue';

        try {
            const response = await fetch(`${window.API_BASE_URL}/books/${bookId}/request`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
            });
            const data = await response.json();
            if (response.ok) {
                requestMessageDiv.textContent = data.message || 'Запит успішно створено!';
                requestMessageDiv.style.color = 'green';
                event.target.disabled = true;
                event.target.textContent = 'Запит надіслано';




            } else {
                requestMessageDiv.textContent = `Помилка: ${data.message || response.statusText}`;
                requestMessageDiv.style.color = 'red';
            }
        } catch (error) {
            console.error('Помилка при запиті на книгу:', error);
            requestMessageDiv.textContent = `Помилка мережі або сервера: ${error.message}`;
            requestMessageDiv.style.color = 'red';
        }
    }
});