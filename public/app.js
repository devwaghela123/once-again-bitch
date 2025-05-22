let token = null;
let currentMatchup = [];

function loadMatchup() {
  fetch('/matchup')
    .then(res => res.json())
    .then(data => {
      currentMatchup = data;
      document.getElementById('face1').src = data[0].file_path;
      document.getElementById('face2').src = data[1].file_path;
      loadCaptions(data[0].id);
      loadComments(data[0].id);
    });
}

function register() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const email = document.getElementById('email').value;
  fetch('/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, email })
  })
    .then(res => res.json())
    .then(data => alert('Registered! Please login.'));
}

function login() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  fetch('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
    .then(res => res.json())
    .then(data => {
      token = data.token;
      document.getElementById('auth').style.display = 'none';
      document.getElementById('upload').style.display = 'block';
    });
}

function uploadPhoto() {
  const formData = new FormData();
  formData.append('photo', document.getElementById('photoInput').files[0]);
  fetch('/upload', {
    method: 'POST',
    headers: { 'Authorization': token },
    body: formData
  })
    .then(res => res.json())
    .then(data => alert('Photo uploaded!'));
}

function vote(index) {
  const winner_id = currentMatchup[index].id;
  const loser_id = currentMatchup[1 - index].id;
  fetch('/vote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ winner_id, loser_id })
  })
    .then(() => loadMatchup());
}

function loadCaptions(photoId) {
  fetch(`/captions/${photoId}`)
    .then(res => res.json())
    .then(captions => {
      const list = document.getElementById('captionList');
      list.innerHTML = '';
      captions.forEach(c => {
        const div = document.createElement('div');
        div.innerHTML = `${c.caption_text} (Score: ${c.score}) <button onclick="voteCaption(${c.id})">Upvote</button>`;
        list.appendChild(div);
      });
    });
}

function addCaption() {
  const photo_id = currentMatchup[0].id;
  const caption_text = document.getElementById('newCaption').value;
  fetch('/caption', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': token },
    body: JSON.stringify({ photo_id, caption_text })
  })
    .then(() => loadCaptions(photo_id));
}

function voteCaption(caption_id) {
  fetch('/caption/vote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ caption_id })
  })
    .then(() => loadCaptions(currentMatchup[0].id));
}

function loadComments(photoId) {
  fetch(`/comments/${photoId}`)
    .then(res => res.json())
    .then(comments => {
      const list = document.getElementById('commentList');
      list.innerHTML = '';
      comments.forEach(c => {
        const div = document.createElement('div');
        div.textContent = c.is_anonymous ? 'Anonymous: ' + c.comment_text : 'User: ' + c.comment_text;
        list.appendChild(div);
      });
    });
}

function addComment() {
  const photo_id = currentMatchup[0].id;
  const comment_text = document.getElementById('commentInput').value;
  const is_anonymous = document.getElementById('anonymous').checked;
  fetch('/comment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': token },
    body: JSON.stringify({ photo_id, comment_text, is_anonymous })
  })
    .then(() => loadComments(photo_id));
}

loadMatchup();
