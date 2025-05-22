const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const port = 3000;
const SECRET_KEY = 'secret_key'; // Replace with a secure key in production

// Database setup
const db = new sqlite3.Database('./faceslap.db', (err) => {
  if (err) console.error('Database connection error:', err);
});

// Create tables
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    email TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    file_path TEXT,
    elo_rating INTEGER DEFAULT 1000,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS captions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    photo_id INTEGER,
    caption_text TEXT,
    score INTEGER DEFAULT 0,
    FOREIGN KEY(photo_id) REFERENCES photos(id)
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    photo_id INTEGER,
    user_id INTEGER,
    comment_text TEXT,
    is_anonymous INTEGER DEFAULT 0,
    FOREIGN KEY(photo_id) REFERENCES photos(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);
});

// Multer setup for photo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Authentication middleware
function authenticateToken(req, res, next) {
  const token = req.headers['authorization'];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}

// Routes
app.post('/register', async (req, res) => {
  const { username, password, email } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  db.run(`INSERT INTO users (username, password, email) VALUES (?, ?, ?)`,
    [username, hashedPassword, email], function (err) {
      if (err) return res.status(400).json({ error: err.message });
      res.json({ id: this.lastID });
    });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  db.get(`SELECT * FROM users WHERE username = ?`, [username], async (err, user) => {
    if (err || !user) return res.status(400).json({ error: 'User not found' });
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ error: 'Invalid password' });
    const token = jwt.sign({ id: user.id }, SECRET_KEY, { expiresIn: '1h' });
    res.json({ token });
  });
});

app.post('/upload', authenticateToken, upload.single('photo'), (req, res) => {
  const user_id = req.user.id;
  const file_path = req.file.path;
  db.run(`INSERT INTO photos (user_id, file_path) VALUES (?, ?)`,
    [user_id, file_path], function (err) {
      if (err) return res.status(400).json({ error: err.message });
      res.json({ id: this.lastID });
    });
});

app.get('/matchup', (req, res) => {
  db.all(`SELECT * FROM photos ORDER BY RANDOM() LIMIT 2`, [], (err, rows) => {
    if (err || rows.length < 2) return res.status(500).json({ error: 'Not enough photos' });
    res.json(rows);
  });
});

app.post('/vote', (req, res) => {
  const { winner_id, loser_id } = req.body;
  // Simple ELO update (to be expanded)
  db.run(`UPDATE photos SET elo_rating = elo_rating + 10 WHERE id = ?`, [winner_id]);
  db.run(`UPDATE photos SET elo_rating = elo_rating - 5 WHERE id = ?`, [loser_id]);
  res.json({ message: 'Vote recorded' });
});

app.get('/captions/:photoId', (req, res) => {
  const { photoId } = req.params;
  db.all(`SELECT * FROM captions WHERE photo_id = ?`, [photoId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/caption', authenticateToken, (req, res) => {
  const { photo_id, caption_text } = req.body;
  db.run(`INSERT INTO captions (photo_id, caption_text) VALUES (?, ?)`,
    [photo_id, caption_text], function (err) {
      if (err) return res.status(400).json({ error: err.message });
      res.json({ id: this.lastID });
    });
});

app.post('/caption/vote', (req, res) => {
  const { caption_id } = req.body;
  db.run(`UPDATE captions SET score = score + 5 WHERE id = ?`, [caption_id]);
  res.json({ message: 'Caption vote recorded' });
});

app.post('/comment', authenticateToken, (req, res) => {
  const { photo_id, comment_text, is_anonymous } = req.body;
  const user_id = is_anonymous ? null : req.user.id;
  db.run(`INSERT INTO comments (photo_id, user_id, comment_text, is_anonymous) VALUES (?, ?, ?, ?)`,
    [photo_id, user_id, comment_text, is_anonymous ? 1 : 0], function (err) {
      if (err) return res.status(400).json({ error: err.message });
      res.json({ id: this.lastID });
    });
});

app.get('/comments/:photoId', (req, res) => {
  const { photoId } = req.params;
  db.all(`SELECT comment_text, is_anonymous FROM comments WHERE photo_id = ?`, [photoId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
