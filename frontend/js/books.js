// frontend/js/books.js

document.addEventListener('DOMContentLoaded', () => {
    const bookListContainer = document.getElementById('bookListContainer');

    const searchInputTitle = document.getElementById('searchInputTitle');
    const searchInputAuthor = document.getElementById('searchInputAuthor');
    const searchInputGenre = document.getElementById('searchInputGenre');
    const searchInputMaterialType = document.getElementById('searchInputMaterialType');
    const searchButton = document.getElementById('searchButton');
    const resetSearchButton = document.getElementById('resetSearchButton');

    const prevPageButton = document.getElementById('prevPageButton');
    const nextPageButton = document.getElementById('nextPageButton');
    const currentPageInfo = document.getElementById('currentPageInfo');

    let currentPage = 1;
    const limit = 10;
    let currentSearchParams = {};

    async function fetchAndDisplayBooks(page = 1, searchParams = {}) {
        if (!bookListContainer) {
            console.error('Елемент #bookListContainer не знайдено!');
            return;
        }
        bookListContainer.innerHTML = '<p>Завантаження книг...</p>';
        currentPage = page;
        currentSearchParams = searchParams;

        const paramsForAPI = { page: currentPage, limit };
        for (const key in searchParams) {
            if (searchParams[key]) {
                paramsForAPI[key] = searchParams[key];
            }
        }

        try {
            const data = await window.api.getAllBooks(paramsForAPI);

            if (data.books && data.books.length > 0) {
                renderBooks(data.books);
                renderPagination(data.currentPage, data.totalPages);
            } else {
                bookListContainer.innerHTML = '<p>Книг не знайдено за вашим запитом.</p>';
                renderPagination(1, 1);
            }
        } catch (error) {
            console.error('Помилка завантаження книг:', error);
            bookListContainer.innerHTML = `<p>Помилка завантаження книг: ${error.message}</p>`;
            renderPagination(1, 1);
        }
    }

    function renderBooks(books) {
        bookListContainer.innerHTML = '';
        const ul = document.createElement('ul');
        ul.className = 'book-list';

        books.forEach(book => {
            const li = document.createElement('li');
            li.className = 'book-item';


            li.innerHTML = `
                <h3><a href="book-details.html?id=${book.id}">${book.title}</a> (ID: ${book.id})</h3>
                <p><strong>Автор:</strong> ${book.author}</p>
                <p><strong>Жанр:</strong> ${book.genre}</p>
                ${book.materialType ? `<p><strong>Тип:</strong> ${book.materialType}</p>` : ''}
                ${book.isbn ? `<p><strong>ISBN:</strong> ${book.isbn}</p>` : ''}
                ${book.publishedYear ? `<p><strong>Рік видання:</strong> ${book.publishedYear}</p>` : ''}
                ${book.publisher ? `<p><strong>Видавництво:</strong> ${book.publisher}</p>` : ''}
                ${book.description ? `<p><em>${book.description}</em></p>` : ''}
                <p>Доступно: ${book.availableCopies} з ${book.totalCopies}</p>
                `;

            ul.appendChild(li);
        });
        bookListContainer.appendChild(ul);
    }

    function renderPagination(cPage, tPages) {

        if (!prevPageButton || !nextPageButton || !currentPageInfo) {
            console.error('Елементи пагінації не знайдено!');
            return;
        }
        currentPage = cPage;
        const totalPages = tPages;
        currentPageInfo.textContent = `Сторінка ${currentPage} з ${totalPages}`;
        prevPageButton.disabled = currentPage === 1;
        nextPageButton.disabled = currentPage === totalPages || totalPages === 0;
    }

    if (prevPageButton) {
        prevPageButton.addEventListener('click', () => {
            if (currentPage > 1) {
                fetchAndDisplayBooks(currentPage - 1, currentSearchParams);
            }
        });
    }
    if (nextPageButton) {
        nextPageButton.addEventListener('click', () => {
            fetchAndDisplayBooks(currentPage + 1, currentSearchParams);
        });
    }

    if (searchButton) {
        searchButton.addEventListener('click', () => {
            const searchParams = {
                title: searchInputTitle.value.trim(),
                author: searchInputAuthor.value.trim(),
                genre: searchInputGenre.value.trim(),
                materialType: searchInputMaterialType.value.trim()
            };
            fetchAndDisplayBooks(1, searchParams);
        });
    }

    if (resetSearchButton) {
        resetSearchButton.addEventListener('click', () => {
            searchInputTitle.value = '';
            searchInputAuthor.value = '';
            searchInputGenre.value = '';
            searchInputMaterialType.value = '';
            fetchAndDisplayBooks(1, {});
        });
    }

    fetchAndDisplayBooks(currentPage, currentSearchParams);
});