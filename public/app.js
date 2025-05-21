async function uploadImages() {
    const input = document.getElementById('imageInput');
    const files = input.files;
  
    if (files.length < 3 || files.length > 10) {
      alert('Upload 3–10 images only');
      return;
    }
  
    const formData = new FormData();
    for (let file of files) {
      formData.append('images', file);
    }
  
    const res = await fetch('/upload', { method: 'POST', body: formData });
    const data = await res.json();
    alert(data.message);
    loadFaceOff();
    loadLeaderboard();
  }
  
  async function loadFaceOff() {
    const res = await fetch('/faceoff');
    const data = await res.json();
  
    const container = document.getElementById('contestants');
    container.innerHTML = `
      <img src="/uploads/${data.first.filename}" width="200" onclick="vote('${data.first.filename}', '${data.second.filename}')">
      <img src="/uploads/${data.second.filename}" width="200" onclick="vote('${data.second.filename}', '${data.first.filename}')">
    `;
  }
  
  async function vote(winner, loser) {
    const res = await fetch('/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ winner, loser })
    });
    const data = await res.json();
    document.getElementById('fightStatus').textContent = data.message;
    loadFaceOff();
    loadLeaderboard();
  }
  
  async function loadLeaderboard() {
    const res = await fetch('/leaderboard');
    const data = await res.json();
  
    const lb = document.getElementById('leaderboard');
    lb.innerHTML = data.map((u, i) =>
      `<p><strong>#${i + 1}</strong> ${u.filename} → ${u.score} pts | ${u.wins}/${u.matches} wins</p>`
    ).join('');
  }
  
  document.getElementById('uploadBtn').addEventListener('click', uploadImages);
  