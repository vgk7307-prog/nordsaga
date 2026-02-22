const express = require('express');
const session = require('express-session');
const path = require('path');
const MemoryStore = require('memorystore')(session);

const app = express();
const PORT = process.env.PORT || 3000;

// Настройки
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Настройка сессий для Vercel
app.use(session({
    secret: 'viking-secret-key-for-nordsaga-game',
    resave: false,
    saveUninitialized: false,
    store: new MemoryStore({
        checkPeriod: 86400000 // чистим раз в 24 часа
    }),
    cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 24 часа
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
    }
}));

// Шаблонизатор
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Временная база данных в памяти
let usersDB = {};

// Маршруты
app.get('/', (req, res) => {
    res.render('index', { user: req.session.user || null });
});

app.get('/game', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    res.render('game', { user: req.session.user });
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    
    if (!usersDB[username]) {
        return res.json({ success: false, message: 'Пользователь не найден' });
    }
    
    if (usersDB[username].password !== password) {
        return res.json({ success: false, message: 'Неверный пароль' });
    }
    
    req.session.user = usersDB[username];
    res.json({ success: true, redirect: '/game' });
});

app.get('/register', (req, res) => {
    res.render('register');
});

app.post('/register', (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.json({ success: false, message: 'Заполните все поля' });
    }
    
    if (usersDB[username]) {
        return res.json({ success: false, message: 'Пользователь уже существует' });
    }
    
    usersDB[username] = {
        username,
        password,
        game: {
            glory: 100,
            gold: 200,
            crew: 50,
            power: 100,
            food: 30,
            day: 1,
            x: 2,
            y: 2,
            inventory: {
                wood: 10,
                iron: 5,
                weapons: 3,
                treasure: 0
            }
        }
    };
    
    req.session.user = usersDB[username];
    res.json({ success: true, redirect: '/game' });
});

app.post('/api/save', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Не авторизован' });
    }
    
    const { gameData } = req.body;
    const username = req.session.user.username;
    
    if (usersDB[username]) {
        usersDB[username].game = gameData;
        req.session.user = usersDB[username];
    }
    
    res.json({ success: true });
});

app.get('/api/load', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Не авторизован' });
    }
    
    res.json({ game: req.session.user.game });
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.get('/leaders', (req, res) => {
    const leaders = Object.values(usersDB)
        .map(u => ({
            username: u.username,
            glory: u.game.glory,
            gold: u.game.gold
        }))
        .sort((a, b) => b.glory - a.glory)
        .slice(0, 10);
    
    res.render('leaders', { users: leaders });
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`\n⚔️ NORDSAGA запущен на http://localhost:${PORT}\n`);
});

// Экспорт для Vercel
module.exports = app;