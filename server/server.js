require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const db = require('./db/connection'); 

const app = express();
const PORT = process.env.PORT || 3000;


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


app.use(session({
  secret: 'school7_secret_key_2025',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, 
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 
  }
}));

app.use((req, res, next) => {
  console.log(`📢 ${req.method} ${req.url}`);
  next();
});

app.use(express.static(path.join(__dirname, '..')));




function checkAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Не авторизован' });
  }
  next();
}


function checkRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.session.user) {
      return res.status(401).json({ error: 'Не авторизован' });
    }
    if (!allowedRoles.includes(req.session.user.role)) {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }
    next();
  };
}




app.post('/api/auth/login', async (req, res) => {
  const { login, password } = req.body;
  const ip = req.ip || req.connection.remoteAddress;

  if (!login || !password) {
    return res.status(400).json({ error: 'Введите логин и пароль' });
  }

  try {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(password).digest('hex');

    const [rows] = await db.query(
      'SELECT id, login, role FROM users WHERE login = ? AND password_hash = ?',
      [login, hash]
    );

    if (rows.length === 0) {
      await db.query(
        'INSERT INTO auth_log (login, result, comment, ip_address) VALUES (?, ?, ?, ?)',
        [login, 'fail', 'Неверный логин или пароль', ip]
      );
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    const user = rows[0];

    await db.query(
      'INSERT INTO auth_log (login, result, comment, ip_address) VALUES (?, ?, ?, ?)',
      [login, 'success', 'Вход в систему', ip]
    );

    req.session.user = {
      id: user.id,
      login: user.login,
      role: user.role
    };

    res.json({
      success: true,
      user: req.session.user
    });
  } catch (err) {
    console.error('AUTH ERROR:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});


app.post('/api/auth/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});


app.get('/api/auth/session', (req, res) => {
  if (req.session.user) {
    res.json({ user: req.session.user });
  } else {
    res.status(401).json({ error: 'Не авторизован' });
  }
});


app.get('/api/auth/log', async (req, res) => {
  
  if (!req.session.user) {
    return res.status(401).json({ error: 'Не авторизован' });
  }
  
  
  const role = req.session.user.role;
  if (role !== 'Администратор' && role !== 'Директор') {
    return res.status(403).json({ error: 'Недостаточно прав' });
  }

  try {
    const { login, result, date_from, date_to } = req.query;
    
    let query = 'SELECT * FROM auth_log WHERE 1=1';
    const params = [];
    
    if (login && login.trim()) {
      query += ' AND login LIKE ?';
      params.push(`%${login.trim()}%`);
    }
    
    if (result && result.trim()) {
      query += ' AND result = ?';
      params.push(result.trim() === 'success' ? 'success' : 'fail');
    }
    
    if (date_from && date_from.trim()) {
      query += ' AND DATE(created_at) >= ?';
      params.push(date_from.trim());
    }
    
    if (date_to && date_to.trim()) {
      query += ' AND DATE(created_at) <= ?';
      params.push(date_to.trim());
    }
    
    query += ' ORDER BY created_at DESC LIMIT 500';
    
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('AUTH LOG ERROR:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});




app.get('/api/admin/users', checkRole(['Администратор']), async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, login, role, created_at FROM users ORDER BY id'
    );
    res.json(rows);
  } catch (err) {
    console.error('GET USERS ERROR:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});


app.post('/api/admin/users', checkRole(['Администратор']), async (req, res) => {
  const { login, password, role } = req.body;

  if (!login || !password || !role) {
    return res.status(400).json({ error: 'Заполните все поля' });
  }

  try {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(password).digest('hex');

    const [existing] = await db.query('SELECT id FROM users WHERE login = ?', [login]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Логин уже существует' });
    }

    await db.query(
      'INSERT INTO users (login, password_hash, role) VALUES (?, ?, ?)',
      [login, hash, role]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('CREATE USER ERROR:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});


app.put('/api/admin/users/:id', checkRole(['Администратор']), async (req, res) => {
  const { role } = req.body;
  const userId = req.params.id;

  if (!role) {
    return res.status(400).json({ error: 'Укажите роль' });
  }

  try {
    if (req.session.user.id === parseInt(userId)) {
      return res.status(400).json({ error: 'Нельзя изменить свою роль' });
    }

    await db.query('UPDATE users SET role = ? WHERE id = ?', [role, userId]);
    res.json({ success: true });
  } catch (err) {
    console.error('UPDATE USER ROLE ERROR:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});


app.delete('/api/admin/users/:id', checkRole(['Администратор']), async (req, res) => {
  const userId = req.params.id;

  try {
    if (req.session.user.id === parseInt(userId)) {
      return res.status(400).json({ error: 'Нельзя удалить самого себя' });
    }

    await db.query('DELETE FROM users WHERE id = ?', [userId]);
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE USER ERROR:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});



const studentsRoutes = require('./routes/students');
const movementRoutes = require('./routes/movement');
const reportsRoutes = require('./routes/reports');
const importExportRoutes = require('./routes/import-export');


app.use('/api/students', checkAuth, studentsRoutes);
app.use('/api/movement', checkAuth, movementRoutes);
app.use('/api/reports', checkAuth, reportsRoutes);
app.use('/api/import-export', checkAuth, importExportRoutes);


app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});


app.listen(PORT, () => {
  console.log(`✅ Сервер запущен: http://localhost:${PORT}/pages/login.html`);
});

process.on('SIGINT', async () => {
  if (db) await db.end();
  process.exit();
});