// frontend/js/api.js

async function handleResponse(response) {
    if (!response.ok) {
        let errorData = { message: response.statusText };
        try { errorData = await response.json(); } catch (e) { console.warn('Не вдалося розпарсити тіло помилки як JSON.'); }
        console.error('API Error:', response.status, errorData);
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) { return response.json(); }
    return response.text();
}

// --- Функції для роботи з книгами ---
async function getAllBooks(params = {}) {
    if (typeof window.API_BASE_URL === 'undefined') throw new Error('API_BASE_URL не визначено.');
    const queryParams = new URLSearchParams();
    Object.keys(params).forEach(key => { if (params[key] !== undefined) queryParams.append(key, params[key]); });
    const response = await fetch(`${window.API_BASE_URL}/books?${queryParams.toString()}`, {
        method: 'GET', headers: { 'Content-Type': 'application/json' },
    });
    return handleResponse(response);
}
async function getBookById(bookId) {
    if (typeof window.API_BASE_URL === 'undefined') throw new Error('API_BASE_URL не визначено.');
    const response = await fetch(`${window.API_BASE_URL}/books/${bookId}`, {
        method: 'GET', headers: { 'Content-Type': 'application/json' },
    });
    return handleResponse(response);
}
async function addBook(bookData, token) {
    if (typeof window.API_BASE_URL === 'undefined') throw new Error('API_BASE_URL не визначено.');
    if (!token) throw new Error('Токен авторизації не надано для addBook.');
    const response = await fetch(`${window.API_BASE_URL}/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(bookData),
    });
    return handleResponse(response);
}
async function updateBook(bookId, bookData, token) {
    if (typeof window.API_BASE_URL === 'undefined') throw new Error('API_BASE_URL не визначено.');
    if (!token) throw new Error('Токен авторизації не надано для updateBook.');
    const response = await fetch(`${window.API_BASE_URL}/books/${bookId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(bookData),
    });
    return handleResponse(response);
}
async function deleteBookSoft(bookId, token) {
    if (typeof window.API_BASE_URL === 'undefined') throw new Error('API_BASE_URL не визначено.');
    if (!token) throw new Error('Токен авторизації не надано для deleteBookSoft.');
    const response = await fetch(`${window.API_BASE_URL}/books/${bookId}`, {
        method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` },
    });
    return handleResponse(response);
}
async function restoreBook(bookId, token) {
    if (typeof window.API_BASE_URL === 'undefined') throw new Error('API_BASE_URL не визначено.');
    if (!token) throw new Error('Токен авторизації не надано для restoreBook.');
    const response = await fetch(`${window.API_BASE_URL}/books/${bookId}/restore`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${token}` },
    });
    return handleResponse(response);
}

// --- Функції для запитів на книги ---
async function requestBook(bookId, token) {
    if (typeof window.API_BASE_URL === 'undefined') throw new Error('API_BASE_URL не визначено.');
    if (!token) throw new Error('Токен авторизації не надано для requestBook.');
    const response = await fetch(`${window.API_BASE_URL}/books/${bookId}/request`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
    });
    return handleResponse(response);
}
async function getPendingBookRequests(token) {
    if (typeof window.API_BASE_URL === 'undefined') throw new Error('API_BASE_URL не визначено.');
    if (!token) throw new Error('Токен авторизації не надано для getPendingBookRequests.');
    const response = await fetch(`${window.API_BASE_URL}/requests/pending`, {
        method: 'GET', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    });
    return handleResponse(response);
}
async function approveBookRequest(requestId, token) {
    if (typeof window.API_BASE_URL === 'undefined') throw new Error('API_BASE_URL не визначено.');
    if (!token) throw new Error('Токен авторизації не надано для approveBookRequest.');
    const response = await fetch(`${window.API_BASE_URL}/requests/${requestId}/approve`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${token}` },
    });
    return handleResponse(response);
}
async function rejectBookRequest(requestId, token) {
    if (typeof window.API_BASE_URL === 'undefined') throw new Error('API_BASE_URL не визначено.');
    if (!token) throw new Error('Токен авторизації не надано для rejectBookRequest.');
    const response = await fetch(`${window.API_BASE_URL}/requests/${requestId}/reject`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${token}` },
    });
    return handleResponse(response);
}

async function returnBook(borrowId, token) {
    if (typeof window.API_BASE_URL === 'undefined') throw new Error('API_BASE_URL не визначено.');
    if (!token) throw new Error('Токен авторизації не надано для returnBook.');
    const response = await fetch(`${window.API_BASE_URL}/borrows/${borrowId}/return`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${token}` },
    });
    return handleResponse(response);
}

async function getUserActivity(token) {
    if (typeof window.API_BASE_URL === 'undefined') throw new Error('API_BASE_URL не визначено.');
    if (!token) throw new Error('Токен авторизації не надано для getUserActivity.');
    const response = await fetch(`${window.API_BASE_URL}/users/me/activity`, {
        method: 'GET', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    });
    return handleResponse(response);
}
async function getUserBorrowingHistory(token, params = {}) {
    if (typeof window.API_BASE_URL === 'undefined') throw new Error('API_BASE_URL не визначено.');
    if (!token) throw new Error('Токен авторизації не надано для getUserBorrowingHistory.');
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    const response = await fetch(`${window.API_BASE_URL}/users/me/borrowing-history?${queryParams.toString()}`, {
        method: 'GET', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    });
    return handleResponse(response);
}

async function adminGetAllUsers(token, params = {}) {
    if (typeof window.API_BASE_URL === 'undefined') throw new Error('API_BASE_URL не визначено.');
    if (!token) throw new Error('Токен авторизації не надано для adminGetAllUsers.');
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.includeDeleted) queryParams.append('includeDeleted', params.includeDeleted);
    const response = await fetch(`${window.API_BASE_URL}/users?${queryParams.toString()}`, {
        method: 'GET', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    });
    return handleResponse(response);
}
async function adminUpdateUserRole(targetUserId, newRole, token) {
    if (typeof window.API_BASE_URL === 'undefined') throw new Error('API_BASE_URL не визначено.');
    if (!token) throw new Error('Токен авторизації не надано для adminUpdateUserRole.');
    const response = await fetch(`${window.API_BASE_URL}/users/${targetUserId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ role: newRole }),
    });
    return handleResponse(response);
}
async function adminUpdateUserProfile(targetUserId, userData, token) {
    if (typeof window.API_BASE_URL === 'undefined') throw new Error('API_BASE_URL не визначено.');
    if (!token) throw new Error('Токен авторизації не надано для adminUpdateUserProfile.');
    const response = await fetch(`${window.API_BASE_URL}/users/${targetUserId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(userData),
    });
    return handleResponse(response);
}
async function adminDeleteUserSoft(targetUserId, token) {
    if (typeof window.API_BASE_URL === 'undefined') throw new Error('API_BASE_URL не визначено.');
    if (!token) throw new Error('Токен авторизації не надано для adminDeleteUserSoft.');
    const response = await fetch(`${window.API_BASE_URL}/users/${targetUserId}`, {
        method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` },
    });
    return handleResponse(response);
}
async function adminRestoreUser(targetUserId, token) {
    if (typeof window.API_BASE_URL === 'undefined') throw new Error('API_BASE_URL не визначено.');
    if (!token) throw new Error('Токен авторизації не надано для adminRestoreUser.');
    const response = await fetch(`${window.API_BASE_URL}/users/${targetUserId}/restore`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${token}` },
    });
    return handleResponse(response);
}

window.api = {
    ...(window.api || {}),
    getAllBooks, getBookById, addBook, updateBook, deleteBookSoft, restoreBook,
    requestBook, getPendingBookRequests, approveBookRequest, rejectBookRequest,
    returnBook,
    getUserActivity, getUserBorrowingHistory,
    adminGetAllUsers, adminUpdateUserRole, adminUpdateUserProfile, adminDeleteUserSoft, adminRestoreUser,
};