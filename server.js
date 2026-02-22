const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Настройки
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'viking-secret',
    resave: false,
    saveUninitialized: true
}));

// Шаблоны
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// База данных
const DB_PATH = path.join(__dirname, 'database');
if (!fs.existsSync(DB_PATH)) {
    fs.mkdirSync(DB_PATH);
}

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
    const userFile = path.join(DB_PATH, `${username}.json`);
    
    if (!fs.existsSync(userFile)) {
        return res.json({ success: false, message: 'Пользователь не найден' });
    }
    
    const user = JSON.parse(fs.readFileSync(userFile));
    
    if (user.password !== password) {
        return res.json({ success: false, message: 'Неверный пароль' });
    }
    
    req.session.user = user;
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
    
    const userFile = path.join(DB_PATH, `${username}.json`);
    
    if (fs.existsSync(userFile)) {
        return res.json({ success: false, message: 'Пользователь уже существует' });
    }
    
    const user = {
        username,
        password,
        game: {
            glory: 100,
            gold: 200,
            crew: 50,
            power: 100,
            food: 30,
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
    
    fs.writeFileSync(userFile, JSON.stringify(user, null, 2));
    req.session.user = user;
    res.json({ success: true, redirect: '/game' });
});

app.post('/api/save', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Не авторизован' });
    }
    
    const { gameData } = req.body;
    const userFile = path.join(DB_PATH, `${req.session.user.username}.json`);
    
    let user = JSON.parse(fs.readFileSync(userFile));
    user.game = gameData;
    
    fs.writeFileSync(userFile, JSON.stringify(user, null, 2));
    req.session.user = user;
    
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
    const users = fs.readdirSync(DB_PATH)
        .filter(f => f.endsWith('.json'))
        .map(f => {
            const data = JSON.parse(fs.readFileSync(path.join(DB_PATH, f)));
            return {
                username: data.username,
                glory: data.game.glory,
                gold: data.game.gold
            };
        })
        .sort((a, b) => b.glory - a.glory)
        .slice(0, 10);
    
    res.render('leaders', { users });
});

// Запуск сервера
app.listen(PORT, () => {
    console.log('\n⚔️═══════════════════════════════════⚔️');
    console.log('🔥  NORDSAGA сервер запущен!');
    console.log('🔥  http://localhost:' + PORT);
    console.log('⚔️═══════════════════════════════════⚔️\n');
});