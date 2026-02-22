const express = require('express');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Настройки
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Простые сессии (без memorystore)
app.use(session({
    secret: 'viking-secret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

// Шаблоны
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Временная база данных
let users = {};

// Главная
app.get('/', (req, res) => {
    res.render('index', { user: req.session.user || null });
});

// Игра
app.get('/game', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    res.render('game', { user: req.session.user });
});

// Логин
app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (users[username] && users[username].password === password) {
        req.session.user = users[username];
        res.json({ success: true, redirect: '/game' });
    } else {
        res.json({ success: false, message: 'Неверный логин или пароль' });
    }
});

// Регистрация
app.get('/register', (req, res) => {
    res.render('register');
});

app.post('/register', (req, res) => {
    const { username, password } = req.body;
    if (users[username]) {
        res.json({ success: false, message: 'Пользователь уже существует' });
    } else {
        users[username] = {
            username,
            password,
            game: {
                glory: 100, gold: 200, crew: 50, power: 100, food: 30, day: 1,
                x: 2, y: 2,
                inventory: { wood: 10, iron: 5, weapons: 3, treasure: 0 }
            }
        };
        req.session.user = users[username];
        res.json({ success: true, redirect: '/game' });
    }
});

// Сохранение
app.post('/api/save', (req, res) => {
    if (req.session.user) {
        const username = req.session.user.username;
        users[username].game = req.body.gameData;
        res.json({ success: true });
    } else {
        res.status(401).json({ error: 'Не авторизован' });
    }
});

// Загрузка
app.get('/api/load', (req, res) => {
    if (req.session.user) {
        res.json({ game: req.session.user.game });
    } else {
        res.status(401).json({ error: 'Не авторизован' });
    }
});

// Выход
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// Лидеры
app.get('/leaders', (req, res) => {
    const leaders = Object.values(users)
        .map(u => ({ username: u.username, glory: u.game.glory, gold: u.game.gold }))
        .sort((a, b) => b.glory - a.glory)
        .slice(0, 10);
    res.render('leaders', { users: leaders });
});

// Запуск
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;
