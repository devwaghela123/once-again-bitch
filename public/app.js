const socket = io();
let partyCode = null;

function createParty() {
  socket.emit('createParty');
}

function joinParty() {
  const code = document.getElementById('partyCode').value;
  socket.emit('joinParty', code);
}

function uploadPhotos() {
  const files = document.getElementById('photoInput').files;
  if (files.length === 0) return alert('No photos selected');
  
  const formData = new FormData();
  for (let file of files) {
    formData.append('photos', file);
  }

  fetch('/upload', {
    method: 'POST',
    body: formData
  })
    .then(res => res.json())
    .then(files => {
      socket.emit('uploadPhotos', partyCode, files);
    });
}

function submitBurn() {
  const label = document.getElementById('labelInput').value;
  const burn = document.getElementById('burnInput').value;
  const photo = document.getElementById('burnPhoto').src;
  if (!label || !burn) return alert('Fill in both the label and burn, dumbass');
  socket.emit('submitBurn', partyCode, photo, label, `Although they’re good, but ${burn}`);
  document.getElementById('burnSection').style.display = 'none';
}

socket.on('partyCreated', (code) => {
  partyCode = code;
  document.getElementById('partySetup').innerHTML = `<p>Party Code: ${code}</p>`;
  document.getElementById('uploadPhotos').style.display = 'block';
});

socket.on('joinedParty', (code) => {
  partyCode = code;
  document.getElementById('partySetup').innerHTML = `<p>Joined Party: ${code}</p>`;
});

socket.on('error', (msg) => {
  document.getElementById('error').innerText = msg;
});

socket.on('userCount', (count) => {
  document.getElementById('userCount').innerText = `${count} users joined`;
});

socket.on('photosUploaded', () => {
  document.getElementById('uploadPhotos').style.display = 'none';
});

socket.on('receivePhoto', (photo) => {
  document.getElementById('burnPhoto').src = photo.path;
  document.getElementById('burnSection').style.display = 'block';
});

socket.on('timerUpdate', (timeLeft) => {
  document.getElementById('timer').innerText = timeLeft;
});

socket.on('burnSubmitted', (submitted, total) => {
  document.getElementById('burnProgress').innerText = `${total - submitted} burns remaining`;
});

socket.on('showHallOfShame', (hallOfShame) => {
  const shameList = document.getElementById('shameList');
  shameList.innerHTML = hallOfShame.map(entry => `
    <div class="shameEntry">
      <img src="${entry.photoPath}" alt="Loser">
      <p><strong>${entry.label}</strong></p>
      <p>${entry.burn}</p>
    </div>
  `).join('');
  document.getElementById('hallOfShame').style.display = 'block';
});
