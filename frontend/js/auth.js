// frontend/js/auth.js


window.API_BASE_URL = 'https://deeplomatik-production.up.railway.app/api';
window.LIBRARIAN_ROLE = 'LIBRARIAN';
window.STUDENT_ROLE = 'STUDENT';
window.TEACHER_ROLE = 'TEACHER';


window.isLoggedIn = function() {
    return !!localStorage.getItem('authToken');
};

window.getCurrentUser = function() {
    const user = localStorage.getItem('currentUser');
    return user ? JSON.parse(user) : null;
};

window.getToken = function() {
    return localStorage.getItem('authToken');
};

window.logout = function() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');


    const isAdminPage = window.location.pathname.includes('/admin/');
    const loginPagePath = isAdminPage ? '../login.html' : 'login.html';

    window.location.href = loginPagePath;


};


window.updateNavigation = function() {
    const navElement = document.getElementById('mainNav');
    if (!navElement) {
        return;
    }

    const user = window.getCurrentUser();
    let navHTML = '';

    const currentPathname = window.location.pathname;
    const isAdminPage = currentPathname.includes('/admin/');
    const basePath = isAdminPage ? '../' : '';



    if (window.isLoggedIn() && user) {
        navHTML += `<a href="${basePath}index.html">Головна</a> | `;
        navHTML += `<span>Вітаємо, ${user.username}! (Роль: ${user.role})</span> | `;
        navHTML += `<a href="${basePath}my-books.html">Мої Книги/Запити</a> | `;

        if (user.role === window.LIBRARIAN_ROLE) {



            navHTML += `<a href="${isAdminPage ? 'dashboard.html' : 'admin/dashboard.html'}">Адмін-Панель</a> | `;
        }

        navHTML += `<button id="logoutButton" type="button">Вийти</button>`;
    } else { // Користувач не залогінений
        navHTML += `<a href="${basePath}index.html">Головна</a> | `;
        navHTML += `<a href="${basePath}login.html">Вхід</a> | `;
        navHTML += `<a href="${basePath}register.html">Реєстрація</a>`;
    }

    navElement.innerHTML = navHTML;

    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {

        const oldButton = logoutButton;
        const newButton = oldButton.cloneNode(true);
        oldButton.parentNode.replaceChild(newButton, oldButton);
        newButton.addEventListener('click', window.logout);
    }
};



const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async function (event) {
        event.preventDefault();
        const messageDiv = document.getElementById('message');
        if (!messageDiv) { console.error("Елемент #message не знайдено для реєстрації"); return; }
        messageDiv.textContent = '';

        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        if (!username || !email || !password) {
            messageDiv.textContent = 'Будь ласка, заповніть усі поля.'; messageDiv.style.color = 'red'; return;
        }
        if (password.length < 6) {
            messageDiv.textContent = 'Пароль має містити щонайменше 6 символів.'; messageDiv.style.color = 'red'; return;
        }

        try {
            const response = await fetch(`${window.API_BASE_URL}/auth/register`, {
                method: 'POST', headers: {'Content-Type': 'application/json',},
                body: JSON.stringify({ username, email, password }),
            });
            const data = await response.json();
            if (response.ok) {
                messageDiv.textContent = data.message + (data.userId ? ` Ваш ID: ${data.userId}` : '');
                messageDiv.style.color = 'green';
                registerForm.reset();
                setTimeout(() => { window.location.href = 'login.html'; }, 2000);
            } else {
                messageDiv.textContent = 'Помилка реєстрації: ' + (data.message || response.statusText);
                messageDiv.style.color = 'red';
            }
        } catch (error) {
            console.error('Помилка мережі або виконання запиту (реєстрація):', error);
            messageDiv.textContent = 'Помилка підключення до сервера. Спробуйте пізніше.'; messageDiv.style.color = 'red';
        }
    });
}


const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async function (event) {
        event.preventDefault();
        const messageDiv = document.getElementById('message');
        if (!messageDiv) { console.error("Елемент #message не знайдено для логіну"); return; }
        messageDiv.textContent = '';

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        if (!email || !password) {
            messageDiv.textContent = 'Будь ласка, заповніть усі поля.'; messageDiv.style.color = 'red'; return;
        }

        try {
            const response = await fetch(`${window.API_BASE_URL}/auth/login`, {
                method: 'POST', headers: { 'Content-Type': 'application/json', },
                body: JSON.stringify({ email, password }),
            });
            const data = await response.json();
            if (response.ok) {
                messageDiv.textContent = data.message; messageDiv.style.color = 'green';
                loginForm.reset();
                if (data.token && data.user) {
                    localStorage.setItem('authToken', data.token);
                    localStorage.setItem('currentUser', JSON.stringify(data.user));


                    setTimeout(() => {
                        if (data.user.role === window.LIBRARIAN_ROLE) {
                            window.location.href = 'admin/dashboard.html';
                        } else {
                            window.location.href = 'index.html';
                        }
                    }, 1500);
                } else {
                    messageDiv.textContent = 'Помилка: Не отримано токен або дані користувача.'; messageDiv.style.color = 'red';
                }
            } else {
                messageDiv.textContent = 'Помилка входу: ' + (data.message || response.statusText); messageDiv.style.color = 'red';
            }
        } catch (error) {
            console.error('Помилка мережі або виконання запиту (логін):', error);
            messageDiv.textContent = 'Помилка підключення до сервера. Спробуйте пізніше.'; messageDiv.style.color = 'red';
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    window.updateNavigation();
});