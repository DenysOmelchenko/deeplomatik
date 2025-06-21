document.addEventListener('DOMContentLoaded', () => {
    // --- Перевірки автентифікації (схожі на admin.js) ---
    if (typeof window.isLoggedIn !== 'function' || !window.isLoggedIn() || window.getCurrentUser().role !== window.LIBRARIAN_ROLE) {
        alert('Доступ заборонено.');
        window.location.href = '../login.html';
        return;
    }

    const token = window.getToken();
    const form = document.getElementById('editBookForm');
    const messageDiv = document.getElementById('editBookMessage');
    const bookIdInput = document.getElementById('bookId');


    const urlParams = new URLSearchParams(window.location.search);
    const currentBookId = urlParams.get('id');

    if (!currentBookId) {
        messageDiv.textContent = 'Помилка: ID книги не знайдено в URL.';
        messageDiv.className = 'message-area error-message';
        messageDiv.style.display = 'block';
        form.style.display = 'none';
        return;
    }


    async function loadBookData(id) {
        try {
            const book = await window.api.getBookById(id, token);

            bookIdInput.value = book.id;
            document.getElementById('bookTitle').value = book.title;
            document.getElementById('bookAuthor').value = book.author;
            document.getElementById('bookGenre').value = book.genre || '';
            document.getElementById('bookDescription').value = book.description || '';
            document.getElementById('bookISBN').value = book.isbn || '';
            document.getElementById('bookPublishedYear').value = book.publishedYear || '';
            document.getElementById('bookPublisher').value = book.publisher || '';
            document.getElementById('bookMaterialType').value = book.materialType || '';
            document.getElementById('bookTotalCopies').value = book.totalCopies;

        } catch (error) {
            console.error('Помилка завантаження даних книги:', error);
            messageDiv.textContent = `Помилка завантаження: ${error.message}`;
            messageDiv.className = 'message-area error-message';
            messageDiv.style.display = 'block';
            form.style.display = 'none';
        }
    }


    async function handleSaveChanges(event) {
        event.preventDefault();
        messageDiv.textContent = '';
        messageDiv.style.display = 'none';

        const bookData = {
            title: document.getElementById('bookTitle').value.trim(),
            author: document.getElementById('bookAuthor').value.trim(),
            genre: document.getElementById('bookGenre').value.trim(),
            description: document.getElementById('bookDescription').value.trim(),
            isbn: document.getElementById('bookISBN').value.trim() || null,
            publishedYear: document.getElementById('bookPublishedYear').value ? parseInt(document.getElementById('bookPublishedYear').value, 10) : null,
            publisher: document.getElementById('bookPublisher').value.trim() || null,
            materialType: document.getElementById('bookMaterialType').value.trim() || null,
            totalCopies: document.getElementById('bookTotalCopies').value ? parseInt(document.getElementById('bookTotalCopies').value, 10) : undefined,
        };


        if (!bookData.title || !bookData.author || !bookData.genre) {
            messageDiv.textContent = 'Назва, автор та жанр є обов\'язковими.';
            messageDiv.className = 'message-area error-message';
            messageDiv.style.display = 'block';
            return;
        }
        if (bookData.totalCopies !== undefined && bookData.totalCopies < 0) {
            messageDiv.textContent = 'Загальна кількість екземплярів має бути невід\'ємним числом.';
            messageDiv.className = 'message-area error-message';
            messageDiv.style.display = 'block';
            return;
        }

        try {
            await window.api.updateBook(currentBookId, bookData, token);
            messageDiv.textContent = 'Книгу успішно оновлено!';
            messageDiv.className = 'message-area success-message';
            messageDiv.style.display = 'block';

            setTimeout(() => { window.location.href = 'manage-books.html'; }, 2000);
        } catch (error) {
            console.error('Помилка оновлення книги:', error);
            messageDiv.textContent = `Помилка: ${error.message}`;
            messageDiv.className = 'message-area error-message';
            messageDiv.style.display = 'block';
        }
    }


    loadBookData(currentBookId);


    form.addEventListener('submit', handleSaveChanges);

});