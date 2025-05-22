const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

// Multer setup
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });
const multiUpload = upload.array('images', 10);

let users = [];

// Brutal roasts
const roasts = [
  "Looks like their face was drawn with a crayon.",
  "That jawline committed tax fraud.",
  "Your mirror deserves an apology.",
  "Uninstall your face, it's corrupted.",
  "This photo is why aliens won't visit us.",
  "This face flunked evolution.",
  "Every pixel screams for mercy.",
  "Born at rock bottom and started digging.",
  "Built like expired lasagna.",
  "Haunted houses use your selfies.",
  "Washed up before the tide came in.",
  "The 'before' in every surgery ad.",
  "Outlook: 404 Facial Definition Not Found.",
  "Built like a deleted draft.",
  "Human patch notes: Buggy AF.",
  "DNA must’ve Ctrl+Z’d itself.",
  "Facial structure sponsored by MS Paint.",
  "Proof evolution can reverse.",
  "They look like AI tried to render shame.",
  "Beta version of a scarecrow.",
  "Even captcha wouldn’t verify that mug.",
  "The face that launched a thousand therapy bills.",
  "More bugs than a Bethesda game.",
  "Like Wi-Fi at 1 bar — broken & annoying.",
  "Background character energy.",
  "Walmart brand Greek statue.",
  "They blink and Wi-Fi drops.render engine.",
  "The final boss in a discount horror game.",
  "Even the file name is ashamed.",
  "The face that invented regret.",
  "You blink and cameras shatter.",
  "Looks like a meme that didn’t make it.",
  "Some features sold separately.",
  "You lost to a pigeon pic, congrats.",
  "Built like low-budget NPC.",
  "Ranked lower than a JPEG of soup.",
  "You got facial features ",
  "Looks like someone sneezed during creation.",
  "Born without a in Comic Sans.",
  "This face is an error 404."
];

function getRandomRoast() {
  const index = Math.floor(Math.random() * roasts.length);
  return roasts[index];
}

app.post('/upload', (req, res) => {
  multiUpload(req, res, (err) => {
    if (err) return res.status(500).send(`Upload error: ${err.message}`);
    if (!req.files || req.files.length < 6) return res.status(400).send('Upload at least 6 images to enter FaceSlap.');

    req.files.forEach(file => {
      users.push({
        filename: file.filename,
        score: 1000,
        wins: 0,
        losses: 0,
        tag: null
      });
    });

    res.redirect('/');
  });
});

app.get('/battle', (req, res) => {
  if (users.length < 2) return res.status(400).send('Not enough contestants.');
  const shuffled = [...users].sort(() => 0.5 - Math.random());
  const [a, b] = shuffled.slice(0, 2);
  res.json({ a, b });
});

app.post('/vote', (req, res) => {
  const { winner, loser } = req.body;
  const winUser = users.find(u => u.filename === winner);
  const loseUser = users.find(u => u.filename === loser);

  if (!winUser || !loseUser) return res.status(400).send('Invalid participants');

  const eloSteal = Math.round(loseUser.score * 0.05);
  winUser.score += eloSteal;
  winUser.wins++;
  loseUser.score -= Math.floor(eloSteal / 2);
  loseUser.losses++;

  if (loseUser.losses >= 10) {
    loseUser.tag = 'Rage Mode';
  } else if (winUser.score > 1300) {
    winUser.tag = 'Certified Alpha';
  } else if (loseUser.score < 800) {
    loseUser.tag = 'Backbench Beta';
  }

  const roast = getRandomRoast();
  res.json({ message: `${winner} won over ${loser}`, winUser, loseUser, roast });
});

app.get('/leaderboard', (req, res) => {
  const sorted = [...users].sort((a, b) => b.score - a.score);
  res.json(sorted);
});

app.listen(PORT, () => console.log(`🔥 FaceSlap LIVE at http://localhost:${PORT}`));
