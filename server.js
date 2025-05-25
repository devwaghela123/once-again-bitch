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
      submitted: 0
    };
    socket.join(partyCode);
    socket.emit('partyCreated', partyCode);
    io.to(partyCode).emit('userCount', parties[partyCode].users.length);
  });

  socket.on('joinParty', (code) => {
    if (parties[code]) {
      socket.join(code);
      parties[code].users.push(socket.id);
      io.to(code).emit('userCount', parties[code].users.length);
      socket.emit('joinedParty', code);
    } else {
      socket.emit('error', 'Invalid party code');
    }
  });

  socket.on('uploadPhotos', (code, files) => {
    if (parties[code]) {
      // Uncomment this block if you want a minimum number of players
      /*
      if (parties[code].users.length < MINIMUM_PLAYERS) {
        socket.emit('error', `Need at least ${MINIMUM_PLAYERS} players to start!`);
        return;
      }
      */
      const photoPaths = files.map(file => ({ path: file }));
      parties[code].photos = photoPaths;
      io.to(code).emit('photosUploaded', photoPaths);
      distributePhotos(code);
      startTimer(code);
    }
  });

  socket.on('submitBurn', (code, photoPath, label, burn) => {
    if (parties[code]) {
      // Log the comment to Render.com logs
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
    console.log(`Device disconnected: ${socket.id}`); // Logs device ID for Render.com
    for (const code in parties) {
      const index = parties[code].users.indexOf(socket.id);
      if (index !== -1) {
        parties[code].users.splice(index, 1);
        io.to(code).emit('userCount', parties[code].users.length);
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

// 30-second timer
function startTimer(code) {
  let timeLeft = 30;
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
app.post('/upload', upload.array('photos'), (req, res) => {
  const files = req.files.map(file => `/uploads/${file.filename}`);
  res.json(files);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
