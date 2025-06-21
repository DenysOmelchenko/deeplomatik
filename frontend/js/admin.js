// frontend/js/admin.js

document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.isLoggedIn !== 'function' || typeof window.getCurrentUser !== 'function' || typeof window.LIBRARIAN_ROLE === 'undefined' || typeof window.getToken !== 'function' || typeof window.api !== 'object') {
        console.error('Основні функції автентифікації/API не завантажені. Перевір auth.js, api.js та порядок скриптів.');
        alert('Помилка завантаження сторінки адміністрування: відсутні необхідні компоненти.');
        if (window.location.pathname.includes('/admin/')) { window.location.href = '../login.html';} else { window.location.href = 'login.html';}
        return;
    }
    if (!window.isLoggedIn() || !window.getCurrentUser() || window.getCurrentUser().role !== window.LIBRARIAN_ROLE) {
        alert('Доступ заборонено. Ця сторінка лише для бібліотекарів.');
        if (window.location.pathname.includes('/admin/')) { window.location.href = '../login.html';} else { window.location.href = 'login.html';}
        return;
    }

    const token = window.getToken();

    const pendingRequestsContainer = document.getElementById('pendingRequestsContainer');
    const actionMessageDiv = document.getElementById('actionMessage');
    const refreshRequestsButton = document.getElementById('refreshRequestsButton');

    if (pendingRequestsContainer) {
        loadPendingRequests();
        if (refreshRequestsButton) {
            refreshRequestsButton.addEventListener('click', loadPendingRequests);
        }
    }

    async function loadPendingRequests() {
        if (!pendingRequestsContainer) return;
        pendingRequestsContainer.innerHTML = '<p>Завантаження запитів, що очікують...</p>';
        if(actionMessageDiv) actionMessageDiv.textContent = '';
        try {
            if (!token) { throw new Error('Токен адміністратора не знайдено.');}
            if (!window.api || typeof window.api.getPendingBookRequests !== 'function') {
                console.error('Функція window.api.getPendingBookRequests не визначена.');
                throw new Error('Помилка конфігурації: функція API недоступна.');
            }
            const requests = await window.api.getPendingBookRequests(token);
            renderPendingRequests(requests);
        } catch (error) {
            console.error('Помилка завантаження запитів:', error);
            pendingRequestsContainer.innerHTML = `<p>Помилка завантаження запитів: ${error.message}</p>`;
        }
    }
    function renderPendingRequests(requests) {
        if (!pendingRequestsContainer) return;
        pendingRequestsContainer.innerHTML = '';
        if (!requests || requests.length === 0) {
            pendingRequestsContainer.innerHTML = '<p>Наразі немає запитів, що очікують на схвалення.</p>';
            return;
        }
        const table = document.createElement('table');
        table.border = "1"; table.style.width = "100%"; table.style.borderCollapse = "collapse";
        table.innerHTML = `<thead><tr><th>Дата Запиту</th><th>Користувач</th><th>Email</th><th>Книга</th><th>Автор</th><th>Дії</th></tr></thead><tbody></tbody>`;
        const tbody = table.querySelector('tbody');
        requests.forEach(request => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${new Date(request.requestDate).toLocaleDateString()}</td><td>${request.user ? request.user.username : 'Н/Д'}</td><td>${request.user ? request.user.email : 'Н/Д'}</td><td>${request.book ? request.book.title : 'Н/Д'}</td><td>${request.book ? request.book.author : 'Н/Д'}</td><td><button class="approve-request-btn" data-request-id="${request.id}">Схвалити</button><button class="reject-request-btn" data-request-id="${request.id}" style="margin-left: 5px;">Відхилити</button></td>`;
            tbody.appendChild(tr);
        });
        pendingRequestsContainer.appendChild(table);
        attachRequestActionListeners();
    }
    function attachRequestActionListeners() {
        document.querySelectorAll('.approve-request-btn').forEach(button => {
            const newBtn = button.cloneNode(true); button.parentNode.replaceChild(newBtn, button);
            newBtn.addEventListener('click', handleApproveRequest);
        });
        document.querySelectorAll('.reject-request-btn').forEach(button => {
            const newBtn = button.cloneNode(true); button.parentNode.replaceChild(newBtn, button);
            newBtn.addEventListener('click', handleRejectRequest);
        });
    }
    async function handleApproveRequest(event) {
        const requestId = event.target.dataset.requestId;
        if (!confirm(`Схвалити запит ID: ${requestId}?`)) return;
        if(actionMessageDiv) { actionMessageDiv.textContent = 'Обробка схвалення...'; actionMessageDiv.style.color = 'blue'; actionMessageDiv.style.display = 'block';}
        try {
            if (!window.api || typeof window.api.approveBookRequest !== 'function') throw new Error('Функція API для схвалення недоступна.');
            await window.api.approveBookRequest(requestId, token);
            if(actionMessageDiv) { actionMessageDiv.textContent = `Запит ID: ${requestId} успішно схвалено!`; actionMessageDiv.style.color = 'green';}
            loadPendingRequests();
        } catch (error) {
            console.error('Помилка схвалення запиту:', error);
            if(actionMessageDiv) { actionMessageDiv.textContent = `Помилка схвалення: ${error.message}`; actionMessageDiv.style.color = 'red';}
        }
    }
    async function handleRejectRequest(event) {
        const requestId = event.target.dataset.requestId;
        if (!confirm(`Відхилити запит ID: ${requestId}?`)) return;
        if(actionMessageDiv) { actionMessageDiv.textContent = 'Обробка відхилення...'; actionMessageDiv.style.color = 'blue'; actionMessageDiv.style.display = 'block';}
        try {
            if (!window.api || typeof window.api.rejectBookRequest !== 'function') throw new Error('Функція API для відхилення недоступна.');
            await window.api.rejectBookRequest(requestId, token);
            if(actionMessageDiv) { actionMessageDiv.textContent = `Запит ID: ${requestId} успішно відхилено!`; actionMessageDiv.style.color = 'orange';}
            loadPendingRequests();
        } catch (error) {
            console.error('Помилка відхилення запиту:', error);
            if(actionMessageDiv) { actionMessageDiv.textContent = `Помилка відхилення: ${error.message}`; actionMessageDiv.style.color = 'red';}
        }
    }


    const adminBookFormEl = document.getElementById('adminBookForm');
    const bookFormTitleEl = document.getElementById('bookFormTitle');
    const adminSaveBookButtonEl = document.getElementById('adminSaveBookButton');
    const adminCancelEditButtonEl = document.getElementById('adminCancelEditButton');
    const adminBookListContainerEl = document.getElementById('adminBookListContainer');
    const formBookMessageDiv = document.getElementById('formBookMessage');
    const adminShowDeletedBooksCheckboxEl = document.getElementById('adminShowDeletedBooks');
    const adminRefreshBooksButtonEl = document.getElementById('adminRefreshBooksButton');
    const adminBookPaginationDivEl = document.getElementById('adminBookPagination');
    let adminBooksCurrentPage = 1;
    const adminBooksLimit = 5;
    let adminBooksEditingId = null;

    if (adminBookFormEl) {
        adminBookFormEl.addEventListener('submit', handleAdminBookFormSubmit);
        if (adminCancelEditButtonEl) adminCancelEditButtonEl.addEventListener('click', resetAdminBookForm);
        if (adminShowDeletedBooksCheckboxEl) adminShowDeletedBooksCheckboxEl.addEventListener('change', () => loadAdminBooks(1));
        if (adminRefreshBooksButtonEl) adminRefreshBooksButtonEl.addEventListener('click', () => loadAdminBooks(adminBooksCurrentPage));
        loadAdminBooks(adminBooksCurrentPage);
    }

    async function handleAdminBookFormSubmit(event) {
        event.preventDefault();
        if (!formBookMessageDiv || !token) return;
        formBookMessageDiv.textContent = ''; formBookMessageDiv.className = 'message-area'; formBookMessageDiv.style.display = 'none';
        const bookData = {
            title: document.getElementById('adminBookTitle').value.trim(),
            author: document.getElementById('adminBookAuthor').value.trim(),
            genre: document.getElementById('adminBookGenre').value.trim(),
            description: document.getElementById('adminBookDescription').value.trim(),
            isbn: document.getElementById('adminBookISBN').value.trim() || null,
            publishedYear: document.getElementById('adminBookPublishedYear').value ? parseInt(document.getElementById('adminBookPublishedYear').value, 10) : null,
            publisher: document.getElementById('adminBookPublisher').value.trim() || null,
            materialType: document.getElementById('adminBookMaterialType').value.trim() || null,
            totalCopies: document.getElementById('adminBookTotalCopies').value ? parseInt(document.getElementById('adminBookTotalCopies').value, 10) : undefined,
        };
        Object.keys(bookData).forEach(key => { if (bookData[key] === '' && key !== 'description') { delete bookData[key]; }});
        if (bookData.publishedYear === null || isNaN(bookData.publishedYear)) delete bookData.publishedYear;
        if (bookData.totalCopies === undefined || isNaN(bookData.totalCopies)) delete bookData.totalCopies;
        if (!bookData.title || !bookData.author || !bookData.genre) {
            formBookMessageDiv.textContent = 'Назва, автор та жанр є обов\'язковими.'; formBookMessageDiv.className = 'message-area error-message'; formBookMessageDiv.style.display = 'block'; return;
        }
        if (bookData.totalCopies !== undefined && bookData.totalCopies < 0) {
            formBookMessageDiv.textContent = 'Загальна кількість екземплярів має бути невід\'ємним числом.'; formBookMessageDiv.className = 'message-area error-message'; formBookMessageDiv.style.display = 'block'; return;
        }
        if (!adminBooksEditingId && (bookData.totalCopies === undefined || bookData.totalCopies <= 0) ) {
            formBookMessageDiv.textContent = 'Загальна кількість екземплярів для нової книги має бути позитивним числом.'; formBookMessageDiv.className = 'message-area error-message'; formBookMessageDiv.style.display = 'block'; return;
        }
        try {
            let resultMessage = '';
            if (adminBooksEditingId) {
                await window.api.updateBook(adminBooksEditingId, bookData, token);
                resultMessage = 'Книгу успішно оновлено!';
            } else {
                await window.api.addBook(bookData, token);
                resultMessage = 'Книгу успішно додано!';
            }
            formBookMessageDiv.textContent = resultMessage; formBookMessageDiv.className = 'message-area success-message'; formBookMessageDiv.style.display = 'block';
            resetAdminBookForm();
            loadAdminBooks(adminBooksEditingId ? adminBooksCurrentPage : 1);
        } catch (error) {
            console.error('Помилка збереження книги:', error);
            formBookMessageDiv.textContent = `Помилка: ${error.message}`; formBookMessageDiv.className = 'message-area error-message'; formBookMessageDiv.style.display = 'block';
        }
    }
    function resetAdminBookForm() {
        if (adminBookFormEl) adminBookFormEl.reset();
        adminBooksEditingId = null;
        if (bookFormTitleEl) bookFormTitleEl.textContent = 'Додати Нову Книгу';
        if (adminSaveBookButtonEl) adminSaveBookButtonEl.textContent = 'Додати книгу';
        if (adminCancelEditButtonEl) adminCancelEditButtonEl.style.display = 'none';
        if (document.getElementById('adminBookIdInput')) document.getElementById('adminBookIdInput').value = '';
    }
    async function loadAdminBooks(page = 1) {
        if (!adminBookListContainerEl || !adminShowDeletedBooksCheckboxEl || !token) return;
        adminBookListContainerEl.innerHTML = '<p>Завантаження книг...</p>';
        adminBooksCurrentPage = page;
        const params = { page: adminBooksCurrentPage, limit: adminBooksLimit, includeDeleted: adminShowDeletedBooksCheckboxEl.checked };
        try {
            if (!window.api || typeof window.api.getAllBooks !== 'function') throw new Error('Функція API getAllBooks недоступна.');
            const data = await window.api.getAllBooks(params);
            renderAdminBookList(data.books);
            renderAdminBookPagination(data.currentPage, data.totalPages);
        } catch (error) {
            console.error('Помилка завантаження списку книг для адміна:', error);
            adminBookListContainerEl.innerHTML = `<p>Помилка: ${error.message}</p>`;
            renderAdminBookPagination(1,1);
        }
    }
    function renderAdminBookList(books) {
        if (!adminBookListContainerEl) return;
        adminBookListContainerEl.innerHTML = '';
        const table = document.createElement('table');
        table.innerHTML = `<thead><tr><th>ID</th><th>Назва</th><th>Автор</th><th>Жанр</th><th>Тип</th><th>Всього/Дост.</th><th>ISBN</th><th>Рік</th><th>Статус</th><th>Дії</th></tr></thead><tbody></tbody>`;
        const tbody = table.querySelector('tbody');
        if (!books || books.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;">Книг не знайдено.</td></tr>';
        } else {
            books.forEach(book => {
                const tr = document.createElement('tr');
                if (book.deletedAt) { tr.classList.add('deleted-row'); }
                tr.innerHTML = `<td>${book.id.slice(0, 8)}...</td><td>${book.title}</td><td>${book.author}</td><td>${book.genre || '-'}</td><td>${book.materialType || '-'}</td><td>${book.availableCopies}/${book.totalCopies}</td><td>${book.isbn || '-'}</td><td>${book.publishedYear || '-'}</td><td>${book.deletedAt ? `Видалена ${new Date(book.deletedAt).toLocaleDateString()}` : (book.availableCopies > 0 ? 'Доступна' : 'Немає')}</td><td class="table-actions"><button class="edit-book-btn" data-id="${book.id}" ${book.deletedAt ? 'disabled' : ''}>Редаг.</button>${book.deletedAt ? `<button class="restore-book-btn" data-id="${book.id}">Віднов.</button>` : `<button class="delete-book-btn" data-id="${book.id}">Видал.</button>`}</td>`;
                tbody.appendChild(tr);
            });
        }
        adminBookListContainerEl.appendChild(table);
        attachAdminBookActionListeners();
    }
    function renderAdminBookPagination(cPage, tPages) {
        if (!adminBookPaginationDivEl) return;
        adminBookPaginationDivEl.innerHTML = '';

        if (tPages <= 1) return;

        if (cPage > 1) {
            const prevButton = document.createElement('button');
            prevButton.textContent = '« Назад';
            prevButton.addEventListener('click', () => loadAdminBooks(cPage - 1));
            adminBookPaginationDivEl.appendChild(prevButton);
        }

        for (let i = 1; i <= tPages; i++) {
            const pageButton = document.createElement('button');
            pageButton.textContent = i;
            if (i === cPage) {
                pageButton.disabled = true;
                pageButton.style.fontWeight = 'bold';
            } else {
                pageButton.addEventListener('click', () => loadAdminBooks(i));
            }
            adminBookPaginationDivEl.appendChild(pageButton);
        }


        if (cPage < tPages) {
            const nextButton = document.createElement('button');
            nextButton.textContent = 'Вперед »';
            nextButton.addEventListener('click', () => loadAdminBooks(cPage + 1));
            adminBookPaginationDivEl.appendChild(nextButton);
        }
    }
    function attachAdminBookActionListeners() {

        document.querySelectorAll('.edit-book-btn').forEach(button => {
            if (!button.disabled) {
                const newBtn = button.cloneNode(true);
                button.parentNode.replaceChild(newBtn, button);
                newBtn.addEventListener('click', (event) => { // Використовуємо стрілочну функцію
                    const bookId = event.target.dataset.id;
                    if (bookId) {

                        const editUrl = window.location.pathname.includes('/admin/')
                            ? `edit-book.html?id=${bookId}`
                            : `admin/edit-book.html?id=${bookId}`;
                        console.log("Redirecting to:", editUrl);
                        window.location.href = editUrl;
                    } else {
                        console.error('Не вдалося отримати ID книги для редагування.');
                    }
                });
            }
        });


        document.querySelectorAll('.delete-book-btn').forEach(button => {
            const newBtn = button.cloneNode(true);
            button.parentNode.replaceChild(newBtn, button);
            newBtn.addEventListener('click', handleAdminDeleteBook);
        });


        document.querySelectorAll('.restore-book-btn').forEach(button => {
            const newBtn = button.cloneNode(true);
            button.parentNode.replaceChild(newBtn, button);
            newBtn.addEventListener('click', handleAdminRestoreBook);
        });
    }
    async function handleAdminEditBookSetup(event) { /* ... твій існуючий код ... */ }
    async function handleAdminDeleteBook(event) {
        const bookId = event.target.dataset.id;

        if (!confirm(`Ви дійсно хочете позначити книгу ID: ${bookId.slice(0, 8)}... як видалену?`)) return;

        if (!formBookMessageDiv) return;
        formBookMessageDiv.textContent = 'Видалення книги...';
        formBookMessageDiv.className = 'message-area';
        formBookMessageDiv.style.display = 'block';

        try {


            if (!window.api || typeof window.api.deleteBookSoft !== 'function') {

                throw new Error('Функція API для м\'якого видалення книги (deleteBookSoft) недоступна.');
            }

            await window.api.deleteBookSoft(bookId, token);

            formBookMessageDiv.textContent = 'Книгу успішно позначено як видалену.';
            formBookMessageDiv.className = 'message-area success-message';
            loadAdminBooks(adminBooksCurrentPage);
        } catch (error) {
            console.error('Помилка видалення книги:', error);
            formBookMessageDiv.textContent = `Помилка видалення: ${error.message}`;
            formBookMessageDiv.className = 'message-area error-message';
        }
    }
    async function handleAdminRestoreBook(event) {
        const bookId = event.target.dataset.id;
        if (!confirm(`Ви дійсно хочете відновити книгу ID: ${bookId.slice(0, 8)}...?`)) return;

        if (!formBookMessageDiv) return;
        formBookMessageDiv.textContent = 'Відновлення книги...';
        formBookMessageDiv.className = 'message-area';
        formBookMessageDiv.style.display = 'block';

        try {
            if (!window.api || typeof window.api.restoreBook !== 'function') {
                throw new Error('Функція API для відновлення книги недоступна.');
            }
            await window.api.restoreBook(bookId, token);
            formBookMessageDiv.textContent = 'Книгу успішно відновлено.';
            formBookMessageDiv.className = 'message-area success-message';
            loadAdminBooks(adminBooksCurrentPage);
        } catch (error) {
            console.error('Помилка відновлення книги:', error);
            formBookMessageDiv.textContent = `Помилка відновлення: ${error.message}`;
            formBookMessageDiv.className = 'message-area error-message';
        }
    }





    console.log("Розпочато блок логіки для manage-users.html");

    const userEditFormContainerEl = document.getElementById('userEditFormContainer');
    const userFormTitleEl = document.getElementById('userFormTitle');
    const adminUserEditFormEl = document.getElementById('adminUserEditForm');
    const adminEditUserIdEl = document.getElementById('adminEditUserId');
    const adminEditUsernameEl = document.getElementById('adminEditUsername');
    const adminEditEmailEl = document.getElementById('adminEditEmail');
    const adminEditRoleEl = document.getElementById('adminEditRole');
    const adminSaveUserButtonEl = document.getElementById('adminSaveUserButton');
    const adminCancelUserEditButtonEl = document.getElementById('adminCancelUserEditButton');

    const adminUserListContainerEl = document.getElementById('adminUserListContainer');
    const userActionMessageDiv = document.getElementById('userActionMessage');
    const adminShowDeletedUsersCheckboxEl = document.getElementById('adminShowDeletedUsers');
    const adminRefreshUsersButtonEl = document.getElementById('adminRefreshUsersButton');
    const adminUserPaginationDivEl = document.getElementById('adminUserPagination');


    let adminUsersCurrentPage = 1;
    const adminUsersLimit = 10;
    let editingUserId = null;

    console.log("adminUserListContainerEl до перевірки if:", adminUserListContainerEl);


    if (adminUserListContainerEl) {
        console.log("Умова if (adminUserListContainerEl) виконана. Викликаємо loadAdminUsers.");

        loadAdminUsers(adminUsersCurrentPage);



        if (adminShowDeletedUsersCheckboxEl) { // Перевіряємо, чи елемент існує
            adminShowDeletedUsersCheckboxEl.addEventListener('change', () => {
                console.log('-------------------------------------------------------------');
                console.log('ПОДІЯ: Зміна стану чекбоксу "Показати видалених"');
                console.log('ПОДІЯ: Стан adminShowDeletedUsersCheckboxEl.checked зараз:', adminShowDeletedUsersCheckboxEl.checked);
                loadAdminUsers(1);
            });
            console.log('Слухача подій для adminShowDeletedUsersCheckboxEl додано.');
        } else {
            console.warn('Елемент adminShowDeletedUsersCheckboxEl не знайдено, слухача не додано.');
        }


        if (adminRefreshUsersButtonEl) {
            adminRefreshUsersButtonEl.addEventListener('click', () => loadAdminUsers(adminUsersCurrentPage));
            console.log('Слухача подій для adminRefreshUsersButtonEl додано.');
        } else {
            console.warn('Елемент adminRefreshUsersButtonEl не знайдено, слухача не додано.');
        }


        if (adminUserEditFormEl) {
            adminUserEditFormEl.addEventListener('submit', handleAdminUserFormSubmit);
        }
        if (adminCancelUserEditButtonEl) {
            adminCancelUserEditButtonEl.addEventListener('click', resetAdminUserForm);
        }


    } else {
        console.log("Умова if (adminUserListContainerEl) НЕ виконана. adminUserListContainerEl:", adminUserListContainerEl);
    }


    async function loadAdminUsers(page = 1) {

        console.log("Функція loadAdminUsers ВИКЛИКАНA з page:", page);

        if (!adminUserListContainerEl || !token) {
            console.warn("loadAdminUsers: Вихід, бо один з необхідних елементів відсутній.");
            if (!adminUserListContainerEl) console.warn("loadAdminUsers: adminUserListContainerEl НЕ знайдено.");
            if (!token) console.warn("loadAdminUsers: token НЕ знайдено.");
            return;
        }

        adminUserListContainerEl.innerHTML = '<p>Завантаження користувачів...</p>';
        console.log("loadAdminUsers: Встановлено 'Завантаження користувачів...' в adminUserListContainerEl");

        if (userActionMessageDiv) {
            userActionMessageDiv.style.display = 'none';
            userActionMessageDiv.textContent = '';
            console.log("loadAdminUsers: Очищено userActionMessageDiv");
        }

        adminUsersCurrentPage = page;
        console.log("loadAdminUsers: adminUsersCurrentPage встановлено на:", adminUsersCurrentPage);

        const params = {
            page: adminUsersCurrentPage,
            limit: adminUsersLimit,
            includeDeleted: adminShowDeletedUsersCheckboxEl ? adminShowDeletedUsersCheckboxEl.checked : false
        };
        console.log("loadAdminUsers: Параметри для API запиту (params):", JSON.stringify(params));

        try {
            if (!window.api || typeof window.api.adminGetAllUsers !== 'function') {
                console.error('loadAdminUsers: Функція window.api.adminGetAllUsers не визначена або не є функцією.');
                throw new Error('Функція API adminGetAllUsers недоступна.');
            }

            console.log("loadAdminUsers: Спроба викликати window.api.adminGetAllUsers...");
            const data = await window.api.adminGetAllUsers(token, params);
            console.log("loadAdminUsers: Відповідь від API (data):", data);

            if (data && typeof data === 'object' && data.hasOwnProperty('users') && data.hasOwnProperty('currentPage') && data.hasOwnProperty('totalPages')) {
                renderAdminUserList(data.users);
                renderAdminUserPagination(data.currentPage, data.totalPages);
                console.log("loadAdminUsers: renderAdminUserList та renderAdminUserPagination викликані.");
            } else {
                console.error("loadAdminUsers: Відповідь від API має некоректну структуру або відсутні необхідні поля. Отримані дані:", data);
                adminUserListContainerEl.innerHTML = `<p class="error-message">Помилка: Отримано некоректні дані від сервера.</p>`;
                if (adminUserPaginationDivEl) adminUserPaginationDivEl.innerHTML = '';
            }

        } catch (error) {
            console.error('loadAdminUsers: Помилка в блоці try-catch під час завантаження списку користувачів:', error);
            if (adminUserListContainerEl) {
                adminUserListContainerEl.innerHTML = `<p class="error-message">Помилка завантаження користувачів: ${error.message}</p>`;
            }
            if (adminUserPaginationDivEl) {
                adminUserPaginationDivEl.innerHTML = '';
            }
        }
    }
    function renderAdminUserList(users) {
        if (!adminUserListContainerEl) return;
        adminUserListContainerEl.innerHTML = '';

        if (!users || users.length === 0) {
            adminUserListContainerEl.innerHTML = '<p>Користувачів не знайдено.</p>';
            return;
        }

        const table = document.createElement('table');
        table.innerHTML = `
        <thead>
            <tr>
                <th>ID</th>
                <th>Ім'я</th>
                <th>Email</th>
                <th>Роль</th>
                <th>Статус</th>
                <th>Створено</th>
                <th>Дії</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;
        const tbody = table.querySelector('tbody');

        users.forEach(user => {
            const tr = document.createElement('tr');
            if (user.deletedAt) {
                tr.classList.add('deleted-row');
            }
            tr.innerHTML = `
            <td>${user.id.slice(0, 8)}...</td>
            <td>${user.username}</td>
            <td>${user.email}</td>
            <td>${user.role}</td>
            <td>${user.deletedAt ? `Видалений (${new Date(user.deletedAt).toLocaleDateString()})` : 'Активний'}</td>
            <td>${new Date(user.createdAt).toLocaleDateString()}</td>
            <td class="table-actions">
                <button class="edit-user-btn" data-id="${user.id}" ${user.deletedAt ? 'disabled' : ''}>Редаг.</button>
                ${user.deletedAt
                ? `<button class="restore-user-btn" data-id="${user.id}">Віднов.</button>`
                : `<button class="delete-user-btn" data-id="${user.id}">Видал.</button>`
            }
            </td>
        `;
            tbody.appendChild(tr);
        });

        adminUserListContainerEl.appendChild(table);
        attachAdminUserActionListeners();
    }

    function renderAdminUserPagination(currentPage, totalPages) {
        if (!adminUserPaginationDivEl) return;
        adminUserPaginationDivEl.innerHTML = '';
        if (totalPages <= 1) return;


        if (currentPage > 1) {
            const prevButton = document.createElement('button');
            prevButton.textContent = '« Назад';
            prevButton.addEventListener('click', () => loadAdminUsers(currentPage - 1));
            adminUserPaginationDivEl.appendChild(prevButton);
        }


        for (let i = 1; i <= totalPages; i++) {
            const pageButton = document.createElement('button');
            pageButton.textContent = i;
            if (i === currentPage) {
                pageButton.disabled = true;
                pageButton.style.fontWeight = 'bold';
            } else {
                pageButton.addEventListener('click', () => loadAdminUsers(i));
            }
            adminUserPaginationDivEl.appendChild(pageButton);
        }


        if (currentPage < totalPages) {
            const nextButton = document.createElement('button');
            nextButton.textContent = 'Вперед »';
            nextButton.addEventListener('click', () => loadAdminUsers(currentPage + 1));
            adminUserPaginationDivEl.appendChild(nextButton);
        }
    }

    function attachAdminUserActionListeners() {
        document.querySelectorAll('.edit-user-btn').forEach(button => {
            if (button.disabled) return;
            const newBtn = button.cloneNode(true);
            button.parentNode.replaceChild(newBtn, button);
            newBtn.addEventListener('click', (event) => handleAdminEditUserSetup(event.target.dataset.id));
        });
        document.querySelectorAll('.delete-user-btn').forEach(button => {
            const newBtn = button.cloneNode(true);
            button.parentNode.replaceChild(newBtn, button);
            newBtn.addEventListener('click', (event) => handleAdminDeleteUser(event.target.dataset.id));
        });
        document.querySelectorAll('.restore-user-btn').forEach(button => {
            const newBtn = button.cloneNode(true);
            button.parentNode.replaceChild(newBtn, button);
            newBtn.addEventListener('click', (event) => handleAdminRestoreUser(event.target.dataset.id));
        });
    }

    async function handleAdminEditUserSetup(userId) {
        if (!userEditFormContainerEl || !token) return;
        editingUserId = userId;


        if (userActionMessageDiv) { userActionMessageDiv.style.display = 'none'; userActionMessageDiv.textContent = '';}

        try {

            const params = { id: userId };
            const userDataResponse = await window.api.adminGetAllUsers(token, params);

            let userToEdit;
            if (userDataResponse && userDataResponse.users && userDataResponse.users.length > 0) {

                userToEdit = userDataResponse.users.find(u => u.id === userId);
                if (!userToEdit && userDataResponse.users.length === 1) userToEdit = userDataResponse.users[0];
            } else if (userDataResponse && !Array.isArray(userDataResponse.users) && userDataResponse.id === userId) {

                userToEdit = userDataResponse;
            }


            if (!userToEdit) {
                throw new Error('Не вдалося знайти користувача для редагування.');
            }

            if (adminEditUserIdEl) adminEditUserIdEl.value = userToEdit.id;
            if (adminEditUsernameEl) adminEditUsernameEl.value = userToEdit.username;
            if (adminEditEmailEl) adminEditEmailEl.value = userToEdit.email;
            if (adminEditRoleEl) adminEditRoleEl.value = userToEdit.role;

            if (userFormTitleEl) userFormTitleEl.textContent = `Редагувати Користувача: ${userToEdit.username}`;
            userEditFormContainerEl.style.display = 'block';
            userEditFormContainerEl.scrollIntoView({ behavior: 'smooth' });

        } catch (error) {
            console.error('Помилка підготовки форми редагування користувача:', error);
            if (userActionMessageDiv) {
                userActionMessageDiv.textContent = `Помилка завантаження даних користувача: ${error.message}`;
                userActionMessageDiv.className = 'message-area error-message';
                userActionMessageDiv.style.display = 'block';
            }
            editingUserId = null;
            userEditFormContainerEl.style.display = 'none';
        }
    }

    function resetAdminUserForm() {
        if (adminUserEditFormEl) adminUserEditFormEl.reset();
        if (adminEditUserIdEl) adminEditUserIdEl.value = '';
        editingUserId = null;
        if (userFormTitleEl) userFormTitleEl.textContent = 'Редагувати Користувача';
        if (userEditFormContainerEl) userEditFormContainerEl.style.display = 'none';
        if (userActionMessageDiv) { userActionMessageDiv.style.display = 'none'; userActionMessageDiv.textContent = '';}
    }

    async function handleAdminUserFormSubmit(event) {
        event.preventDefault();


        userActionMessageDiv.textContent = 'Збереження змін...';
        userActionMessageDiv.className = 'message-area';
        userActionMessageDiv.style.display = 'block';

        const newUsername = adminEditUsernameEl ? adminEditUsernameEl.value.trim() : null;
        const newEmail = adminEditEmailEl ? adminEditEmailEl.value.trim() : null;
        const newRole = adminEditRoleEl ? adminEditRoleEl.value : null;

        console.log("Форма відправлена. Дані з форми:");
        console.log("newUsername:", newUsername);
        console.log("newEmail:", newEmail);
        console.log("newRole:", newRole);

        if (!newUsername || !newEmail || !newRole) {
            userActionMessageDiv.textContent = "Ім'я користувача, Email та Роль є обов'язковими.";
            userActionMessageDiv.className = 'message-area error-message';
            return;
        }


        const allowedRoles = [window.STUDENT_ROLE, window.TEACHER_ROLE, window.LIBRARIAN_ROLE];
        console.log("Клієнтська перевірка: window.STUDENT_ROLE =", window.STUDENT_ROLE);
        console.log("Клієнтська перевірка: window.TEACHER_ROLE =", window.TEACHER_ROLE);
        console.log("Клієнтська перевірка: window.LIBRARIAN_ROLE =", window.LIBRARIAN_ROLE);
        console.log("Клієнтська перевірка: Масив allowedRoles:", allowedRoles);
        console.log("Клієнтська перевірка: newRole для перевірки в includes():", newRole);
        console.log("Клієнтська перевірка: результат allowedRoles.includes(newRole):", allowedRoles.includes(newRole));


        if (!allowedRoles.includes(newRole)) {

            userActionMessageDiv.textContent = `КЛІЄНТ: Неприпустима роль '${newRole}'. Дозволені на клієнті: ${allowedRoles.map(r => r || 'НЕ ВИЗНАЧЕНО').join(', ')}. Перевірте auth.js.`;
            userActionMessageDiv.className = 'message-area error-message';
            userActionMessageDiv.style.display = 'block';
            return;
        }

        console.log("Клієнтська перевірка ролі пройдена. Спроба оновити на сервері...");

        try {

            await window.api.adminUpdateUserProfile(editingUserId, { username: newUsername, email: newEmail }, token);
            console.log("Профіль користувача оновлено (ім'я/email).");


            await window.api.adminUpdateUserRole(editingUserId, newRole, token);
            console.log("Роль користувача оновлено.");

            userActionMessageDiv.textContent = 'Дані користувача успішно оновлено!';
            userActionMessageDiv.className = 'message-area success-message';

            resetAdminUserForm();
            loadAdminUsers(adminUsersCurrentPage);

        } catch (error) {
            console.error('Помилка оновлення даних користувача (з catch в handleAdminUserFormSubmit):', error);
            userActionMessageDiv.textContent = `Помилка оновлення: ${error.message}`;
            userActionMessageDiv.className = 'message-area error-message';
        }
    }

    // }

    async function handleAdminDeleteUser(userId) {
        if (!confirm(`Ви впевнені, що хочете видалити (м'яко) користувача ID: ${userId.slice(0,8)}...?`)) return;
        if (!userActionMessageDiv || !token) return;

        userActionMessageDiv.textContent = 'Видалення користувача...';
        userActionMessageDiv.className = 'message-area';
        userActionMessageDiv.style.display = 'block';

        try {
            if (!window.api || typeof window.api.adminDeleteUserSoft !== 'function') {
                throw new Error('Функція API adminDeleteUserSoft недоступна.');
            }
            await window.api.adminDeleteUserSoft(userId, token);
            userActionMessageDiv.textContent = 'Користувача успішно позначено як видаленого.';
            userActionMessageDiv.className = 'message-area success-message';
            loadAdminUsers(adminUsersCurrentPage);
        } catch (error) {
            console.error('Помилка видалення користувача:', error);
            userActionMessageDiv.textContent = `Помилка видалення: ${error.message}`;
            userActionMessageDiv.className = 'message-area error-message';
        }
    }

    async function handleAdminRestoreUser(userId) {
        if (!confirm(`Ви впевнені, що хочете відновити користувача ID: ${userId.slice(0,8)}...?`)) return;
        if (!userActionMessageDiv || !token) return;

        userActionMessageDiv.textContent = 'Відновлення користувача...';
        userActionMessageDiv.className = 'message-area';
        userActionMessageDiv.style.display = 'block';

        try {
            if (!window.api || typeof window.api.adminRestoreUser !== 'function') {
                throw new Error('Функція API adminRestoreUser недоступна.');
            }
            await window.api.adminRestoreUser(userId, token);
            userActionMessageDiv.textContent = 'Користувача успішно відновлено.';
            userActionMessageDiv.className = 'message-area success-message';
            loadAdminUsers(adminUsersCurrentPage);
        } catch (error) {
            console.error('Помилка відновлення користувача:', error);
            userActionMessageDiv.textContent = `Помилка відновлення: ${error.message}`;
            userActionMessageDiv.className = 'message-area error-message';
        }
    }


});