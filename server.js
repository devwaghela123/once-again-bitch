const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer setup for photo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

// Party data
const parties = {};
const MINIMUM_PLAYERS = 3; // Uncomment if you want a minimum

// Socket.IO for real-time
io.on('connection', (socket) => {
  console.log(`Device connected: ${socket.id}`); // Logs device ID for Render.com

  socket.on('createParty', () => {
    const partyCode = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit code
    parties[partyCode] = {
      photos: [],
      burns: [],
      users: [],
      submitted: 0,
      uploaded: 0 // Track how many have uploaded
    };
    socket.join(partyCode);
    socket.emit('partyCreated', partyCode);
    io.to(partyCode).emit('userCount', parties[partyCode].users.length);
    io.to(partyCode).emit('uploadProgress', parties[partyCode].users.length - parties[partyCode].uploaded);
  });

  socket.on('joinParty', (code) => {
    if (parties[code]) {
      socket.join(code);
      parties[code].users.push(socket.id);
      io.to(code).emit('userCount', parties[code].users.length);
      socket.emit('joinedParty', code);
      io.to(code).emit('uploadProgress', parties[code].users.length - parties[code].uploaded);
    } else {
      socket.emit('error', 'Invalid party code');
    }
  });

  socket.on('uploadPlayerPhoto', (code, file) => {
    if (parties[code] && !parties[code].photos.some(p => p.userId === socket.id)) {
      console.log(`Device ${socket.id} uploaded photo ${file}`); // Log upload
      parties[code].photos.push({ path: file, userId: socket.id });
      parties[code].uploaded++;
      io.to(code).emit('uploadProgress', parties[code].users.length - parties[code].uploaded);
      if (parties[code].uploaded === parties[code].users.length) {
        startGameCountdown(code);
      }
    }
  });

  socket.on('submitBurn', (code, photoPath, label, burn) => {
    if (parties[code]) {
      console.log(`Device ${socket.id} submitted for photo ${photoPath}: Label: ${label}, Burn: ${burn}`);
      parties[code].burns.push({ photoPath, label, burn });
      parties[code].submitted++;
      io.to(code).emit('burnSubmitted', parties[code].submitted, parties[code].photos.length);
      if (parties[code].submitted === parties[code].photos.length) {
        showHallOfShame(code);
      }
    }
  });

  socket.on('disconnect', () => {
    console.log(`Device disconnected: ${socket.id}`);
    for (const code in parties) {
      const index = parties[code].users.indexOf(socket.id);
      if (index !== -1) {
        parties[code].users.splice(index, 1);
        io.to(code).emit('userCount', parties[code].users.length);
        io.to(code).emit('uploadProgress', parties[code].users.length - parties[code].uploaded);
      }
    }
  });
});

// Distribute photos to users
function distributePhotos(code) {
  const party = parties[code];
  const shuffledPhotos = [...party.photos].sort(() => Math.random() - 0.5);
  party.users.forEach((userId, i) => {
    const photo = shuffledPhotos[i % shuffledPhotos.length];
    io.to(userId).emit('receivePhoto', photo);
  });
}

// 3-second countdown before game starts
function startGameCountdown(code) {
  let countdown = 3;
  const timer = setInterval(() => {
    io.to(code).emit('countdown', countdown);
    countdown--;
    if (countdown < 0) {
      clearInterval(timer);
      distributePhotos(code);
      startTimer(code);
    }
  }, 1000);
}

// 120-second timer for burn phase
function startTimer(code) {
  let timeLeft = 120;
  const timer = setInterval(() => {
    io.to(code).emit('timerUpdate', timeLeft);
    timeLeft--;
    if (timeLeft < 0 || parties[code].submitted === parties[code].photos.length) {
      clearInterval(timer);
      showHallOfShame(code);
    }
  }, 1000);
}

// Show Hall of Shame
function showHallOfShame(code) {
  const party = parties[code];
  const hallOfShame = party.photos.map(photo => {
    const burnEntry = party.burns.find(b => b.photoPath === photo.path) || {
      label: 'Unnamed Loser',
      burn: 'Too pathetic to even get roasted'
    };
    return { photoPath: photo.path, label: burnEntry.label, burn: burnEntry.burn };
  });
  io.to(code).emit('showHallOfShame', hallOfShame);
}

// Route for photo upload
app.post('/upload', upload.single('photo'), (req, res) => {
  const file = `/uploads/${req.file.filename}`;
  res.json(file);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
