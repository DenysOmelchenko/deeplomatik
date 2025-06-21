// frontend/js/profile.js

document.addEventListener('DOMContentLoaded', async () => {

    if (!window.isLoggedIn()) { // Використовуємо window.isLoggedIn з auth.js
        window.location.href = 'login.html';
        return;
    }

    const userInfoContainer = document.getElementById('userInfoContainer');
    const borrowedBooksContainer = document.getElementById('borrowedBooksContainer');
    const bookRequestsContainer = document.getElementById('bookRequestsContainer');
    const borrowHistoryContainer = document.getElementById('borrowHistoryContainer');
    const historyPaginationControls = document.getElementById('historyPaginationControls');

    const currentUser = window.getCurrentUser(); // Використовуємо window.getCurrentUser з auth.js
    const token = window.getToken(); // Використовуємо window.getToken з auth.js

    let currentHistoryPage = 1; // Локальна змінна для поточної сторінки історії
    const historyLimit = 5;


    if (userInfoContainer && currentUser) {
        userInfoContainer.innerHTML = `
            <p><strong>Ім'я користувача:</strong> ${currentUser.username}</p>
            <p><strong>Email:</strong> ${currentUser.email}</p>
            <p><strong>Роль:</strong> ${currentUser.role}</p>
        `;
    } else if (userInfoContainer) {
        userInfoContainer.innerHTML = '<p>Не вдалося завантажити інформацію про користувача.</p>';
    }


    async function loadUserActivity() {
        if (!token) return;

        if (borrowedBooksContainer) borrowedBooksContainer.innerHTML = '<p>Завантаження активних позичань...</p>';
        if (bookRequestsContainer) bookRequestsContainer.innerHTML = '<p>Завантаження ваших запитів...</p>';

        try {
            if (!window.api || typeof window.api.getUserActivity !== 'function') {
                console.error('Функція window.api.getUserActivity не визначена. Перевір api.js та порядок завантаження скриптів.');
                throw new Error('Помилка завантаження даних: функція API недоступна.');
            }
            const activity = await window.api.getUserActivity(token);

            if (borrowedBooksContainer) {
                if (activity.borrowedBooks && activity.borrowedBooks.length > 0) {
                    let borrowedHtml = '<ul>';
                    activity.borrowedBooks.forEach(borrow => {
                        borrowedHtml += `
                            <li>
                                <strong>${borrow.book.title}</strong> (Автор: ${borrow.book.author || 'Н/Д'})
                                <br>Позичено: ${new Date(borrow.borrowDate).toLocaleDateString()}
                                <br>Повернути до: ${new Date(borrow.dueDate).toLocaleDateString()}
                                <button class="return-book-btn" data-borrow-id="${borrow.id}">Повернути книгу</button>
                            </li><br>`;
                    });
                    borrowedHtml += '</ul>';
                    borrowedBooksContainer.innerHTML = borrowedHtml;
                } else {
                    borrowedBooksContainer.innerHTML = '<p>У вас немає зараз позичених книг.</p>';
                }
            }


            if (bookRequestsContainer) {
                if (activity.bookRequests && activity.bookRequests.length > 0) {
                    let requestsHtml = '<ul>';
                    activity.bookRequests.forEach(request => {
                        requestsHtml += `
                            <li>
                                <strong>${request.book.title}</strong> (Автор: ${request.book.author || 'Н/Д'})
                                <br>Дата запиту: ${new Date(request.requestDate).toLocaleDateString()}
                                <br>Статус: ${request.status}
                                ${request.status === 'REJECTED' ? '<span style="color:red;"> (Відхилено)</span>' : ''}
                                ${request.status === 'APPROVED' && (!activity.borrowedBooks || !activity.borrowedBooks.find(b => b.bookId === request.bookId && !b.returnDate)) ? '<span style="color:grey;"> (Схвалено, очікує отримання/повернено)</span>' : ''}
                            </li><br>`;
                    });
                    requestsHtml += '</ul>';
                    bookRequestsContainer.innerHTML = requestsHtml;
                } else {
                    bookRequestsContainer.innerHTML = '<p>У вас немає запитів на книги.</p>';
                }
            }
            attachReturnBookEventListeners();
        } catch (error) {
            console.error("Помилка завантаження активності користувача:", error);
            if (borrowedBooksContainer) borrowedBooksContainer.innerHTML = `<p>Помилка завантаження позичених книг: ${error.message}</p>`;
            if (bookRequestsContainer) bookRequestsContainer.innerHTML = `<p>Помилка завантаження запитів: ${error.message}</p>`;
        }
    }


    async function loadBorrowHistory(page = 1) {
        if (!token || !borrowHistoryContainer) return;

        currentHistoryPage = page;
        borrowHistoryContainer.innerHTML = '<p>Завантаження історії...</p>';

        try {

            if (!window.api || typeof window.api.getUserBorrowingHistory !== 'function') {
                console.error('Функція window.api.getUserBorrowingHistory не визначена. Перевір api.js та порядок завантаження скриптів.');
                throw new Error('Помилка завантаження даних: функція API недоступна.');
            }
            const historyData = await window.api.getUserBorrowingHistory(token, { page: currentHistoryPage, limit: historyLimit });

            if (historyData.history && historyData.history.length > 0) {
                let historyHtml = '<ul>';
                historyData.history.forEach(borrow => {
                    historyHtml += `
                        <li>
                            <strong>${borrow.book.title}</strong> (Автор: ${borrow.book.author || 'Н/Д'})
                            <br>Позичено: ${new Date(borrow.borrowDate).toLocaleDateString()}
                            <br>Термін до: ${new Date(borrow.dueDate).toLocaleDateString()}
                            <br>Повернуто: ${borrow.returnDate ? new Date(borrow.returnDate).toLocaleDateString() : '<strong>Ще на руках</strong>'}
                        </li><br>`;
                });
                historyHtml += '</ul>';
                borrowHistoryContainer.innerHTML = historyHtml;
            } else {
                borrowHistoryContainer.innerHTML = '<p>Історія позичань порожня.</p>';
            }

            renderHistoryPagination(historyData.currentPage, historyData.totalPages);
        } catch (error) {
            console.error("Помилка завантаження історії позичань:", error);
            borrowHistoryContainer.innerHTML = `<p>Помилка завантаження історії: ${error.message}</p>`;
            renderHistoryPagination(1, 1);
        }
    }


    function renderHistoryPagination(pageToRender, totalPagesToRender) {
        if (!historyPaginationControls) {
            console.error('Елемент #historyPaginationControls не знайдено!');
            return;
        }



        let paginationHtml = '';
        if (totalPagesToRender > 0) {
            if (totalPagesToRender > 1) {
                paginationHtml += `<button id="prevHistoryPage" ${currentHistoryPage === 1 ? 'disabled' : ''}>Попередня</button> `;
                paginationHtml += `<span style="margin: 0 10px;">Сторінка ${currentHistoryPage} з ${totalPagesToRender}</span> `;
                paginationHtml += `<button id="nextHistoryPage" ${currentHistoryPage === totalPagesToRender ? 'disabled' : ''}>Наступна</button>`;
            } else {
                paginationHtml = `<span style="margin: 0 10px;">Сторінка ${currentHistoryPage} з ${totalPagesToRender}</span>`;
            }
        } else {
            paginationHtml = `<span style="margin: 0 10px;">Історія порожня</span>`;
        }

        historyPaginationControls.innerHTML = paginationHtml;

        const prevBtn = document.getElementById('prevHistoryPage');
        const nextBtn = document.getElementById('nextHistoryPage');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (currentHistoryPage > 1) loadBorrowHistory(currentHistoryPage - 1);
            });
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {

                if (currentHistoryPage < totalPagesToRender) loadBorrowHistory(currentHistoryPage + 1);
            });
        }
    }


    async function handleReturnBook(event) {
        const borrowId = event.target.dataset.borrowId;
        if (!confirm(`Ви дійсно хочете повернути цю книгу?`)) return;

        try {

            if (!window.api || typeof window.api.returnBook !== 'function') {
                console.error('Функція window.api.returnBook не визначена. Перевір api.js та порядок завантаження скриптів.');
                throw new Error('Помилка повернення книги: функція API недоступна.');
            }
            const result = await window.api.returnBook(borrowId, token);
            alert(result.message || 'Книгу успішно повернуто!');
            loadUserActivity();
            loadBorrowHistory(currentHistoryPage);
        } catch (error) {
            console.error('Помилка повернення книги:', error);
            alert(`Не вдалося повернути книгу: ${error.message}`);
        }
    }

    function attachReturnBookEventListeners() {
        const returnButtons = document.querySelectorAll('.return-book-btn');
        returnButtons.forEach(button => {
            button.removeEventListener('click', handleReturnBook);
            button.addEventListener('click', handleReturnBook);
        });
    }


    loadUserActivity();
    loadBorrowHistory(currentHistoryPage);
});