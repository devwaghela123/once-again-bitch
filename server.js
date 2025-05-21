const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));


// Animal hierarchy scoring system
const animalHierarchy = {
  'lion': 100,
  'tiger': 90,
  'bull': 85,
  'wolf': 80,
  'panther': 75,
  'eagle': 70,
  'dog': 60,
  'cat': 50,
  'donkey': 45,
  'cow': 40,
  'pig': 35,
  'rabbit': 30,
  'deer': 25,
  'sheep': 20,
  'rat': 10,
  'monkey': 65,
  'hippo': 55,
  'racoon': 30,
  'snowseal': 20,
  'tortoise': 15
};

// In-memory database to hold users and scores
let users = []; // { filename, score, matches, wins }

// Multer setup
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });
const multiUpload = upload.array('images', 10);

// Home
app.get('/', (req, res) => {
  res.send('Welcome to Evolution Loop');
});

// Upload images
app.post('/upload', (req, res) => {
  multiUpload(req, res, (err) => {
    if (err) return res.status(500).send(`Error: ${err.message}`);
    if (!req.files || req.files.length < 3) return res.status(400).send('Upload at least 3 images');

    req.files.forEach(file => {
      const name = file.filename;
      const baseAnimal = Object.keys(animalHierarchy)[Math.floor(Math.random() * Object.keys(animalHierarchy).length)];
      const score = animalHierarchy[baseAnimal] + Math.floor(Math.random() * 20 - 10);
      users.push({ filename: name, score, matches: 0, wins: 0 });
    });

    res.json({ message: 'Uploaded and registered for battle', users });
  });
});

// Get 2 random face-off candidates
app.get('/faceoff', (req, res) => {
  if (users.length < 2) return res.status(400).send('Not enough players');
  const shuffled = [...users].sort(() => 0.5 - Math.random());
  const [first, second] = shuffled.slice(0, 2);
  res.json({ first, second });
});

// Vote: winner steals points from loser
app.post('/vote', (req, res) => {
  const { winner, loser } = req.body;
  const winUser = users.find(u => u.filename === winner);
  const loseUser = users.find(u => u.filename === loser);

  if (!winUser || !loseUser) return res.status(400).send('Invalid participants');

  const steal = Math.round(loseUser.score * 0.1);
  winUser.score += steal;
  winUser.matches++;
  winUser.wins++;
  loseUser.score -= steal;
  loseUser.matches++;

  res.json({ message: `${winner} defeated ${loser}`, winUser, loseUser });
});

// Leaderboard
app.get('/leaderboard', (req, res) => {
  const sorted = [...users].sort((a, b) => b.score - a.score);
  res.json(sorted);
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});