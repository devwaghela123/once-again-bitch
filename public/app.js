async function loadBattle() {
  const res = await fetch('/battle');
  const { a, b } = await res.json();

  const cardA = document.getElementById('cardA');
  const cardB = document.getElementById('cardB');
  const roast = document.getElementById('roast');

  cardA.style.backgroundImage = `url('/uploads/${a.filename}')`;
  cardB.style.backgroundImage = `url('/uploads/${b.filename}')`;

  cardA.onclick = () => vote(a.filename, b.filename);
  cardB.onclick = () => vote(b.filename, a.filename);
}

async function vote(winner, loser) {
  const res = await fetch('/vote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ winner, loser })
  });
  const data = await res.json();
  document.getElementById('roast').innerText = data.roast;
  loadBattle();
}

window.onload = loadBattle;
