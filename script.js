let gameState = {
  players: ["Player 1", "Player 2", "Player 3", "Player 4"],
  rounds: [],
};

function saveState() {
  localStorage.setItem("dokoGame", JSON.stringify(gameState));
}

function loadState() {
  let saved = localStorage.getItem("dokoGame");
  if (saved) gameState = JSON.parse(saved);
}

function renderTable() {
  // Update player names
  for (let i = 0; i < 4; i++) {
    let input = document.getElementById("player" + i);
    gameState.players[i] = input.value || `Player ${i + 1}`;
  }

  const tbody = document.querySelector("#scoreTable tbody");
  tbody.innerHTML = "";
  let totals = [0, 0, 0, 0];
  let roundCounter = 1; // separate counter for numbered rounds

  gameState.rounds.forEach((round) => {
    let tr = document.createElement("tr");
    let roundLabel = round.solo ? "S" : roundCounter++;

    let rowHtml = `<td>${roundLabel}</td>`;
    round.scores.forEach((score, i) => {
      totals[i] += score;
      let cls = score > 0 ? "positive" : score < 0 ? "negative" : "";
      rowHtml += `<td class='${cls}'>${totals[i]}</td>`;
    });

    rowHtml += `<td>${round.points}</td>`;
    rowHtml += `<td><button onclick='editRound(${gameState.rounds.indexOf(
      round
    )})'>Edit</button></td>`;
    tr.innerHTML = rowHtml;

    // Add separator after every 4th non-solo round
    if (!round.solo && roundCounter > 1 && (roundCounter - 1) % 4 === 0) {
      tr.classList.add("game-separator");
    }

    tbody.appendChild(tr);
  });

  totals.forEach((t, i) => {
    document.getElementById("total" + i).textContent = t;
  });

  saveState();
}

function addRound() {
  let points = parseInt(document.getElementById("roundPoints").value, 10);
  if (isNaN(points) || points <= 0)
    return alert("Enter a valid positive point value.");

  let solo = document.getElementById("soloRound").checked;

  let winners = [];
  for (let i = 0; i < 4; i++) {
    winners[i] = document.getElementById("winner" + i).checked;
  }

  if (!winners.includes(true)) return alert("Select at least one winner.");
  if (solo && winners.filter((w) => w).length !== 1)
    return alert("Select exactly one winner for a solo round.");

  let scores;
  if (solo) {
    // Solo round: winner gets points*3, others lose points
    scores = winners.map((w) => (w ? points * 3 : -points));
  } else {
    // Normal round
    scores = winners.map((w) => (w ? points : -points));
  }

  gameState.rounds.push({ points: points, scores: scores, solo: solo });

  // Reset form
  document.getElementById("roundPoints").value = "";
  document.getElementById("soloRound").checked = false;
  for (let i = 0; i < 4; i++)
    document.getElementById("winner" + i).checked = false;

  renderTable();
}

function editRound(index) {
  const tbody = document.querySelector("#scoreTable tbody");
  let row = tbody.rows[index];
  let round = gameState.rounds[index];

  row.innerHTML =
    `<td>${round.solo ? "S" : index + 1}</td>` +
    round.scores
      .map(
        (s, i) =>
          `<td><input type='number' id='edit${index}_${i}' value='${s}'></td>`
      )
      .join("") +
    `<td><input type='number' id='editPoints${index}' value='${round.points}'></td>` +
    `<td><button onclick='saveRound(${index})'>Save</button> <button onclick='renderTable()'>Cancel</button></td>`;
}

function saveRound(index) {
  let newPoints = parseInt(
    document.getElementById(`editPoints${index}`).value,
    10
  );
  let newScores = [];
  for (let i = 0; i < 4; i++) {
    let val =
      parseInt(document.getElementById(`edit${index}_${i}`).value, 10) || 0;
    newScores.push(val);
  }
  gameState.rounds[index] = {
    points: newPoints,
    scores: newScores,
    solo: gameState.rounds[index].solo,
  };
  renderTable();
}

function resetGame() {
  if (confirm("Are you sure you want to reset all scores?")) {
    gameState.rounds = [];
    renderTable();
  }
}

function exportGame() {
  let csv = "Round," + gameState.players.join(",") + ",Points\n";
  gameState.rounds.forEach((round, idx) => {
    csv +=
      (round.solo ? "S" : idx + 1) +
      "," +
      round.scores.join(",") +
      "," +
      round.points +
      "\n";
  });
  let blob = new Blob([csv], { type: "text/csv" });
  let url = URL.createObjectURL(blob);
  let a = document.createElement("a");
  a.href = url;
  a.download = "doppelkopf_scores.csv";
  a.click();
  URL.revokeObjectURL(url);
}

document.getElementById("addRound").addEventListener("click", addRound);
document.getElementById("resetGame").addEventListener("click", resetGame);
document.getElementById("exportGame").addEventListener("click", exportGame);

// Initialize
loadState();
renderTable();

// Keep names synced with state
for (let i = 0; i < 4; i++) {
  document.getElementById("player" + i).addEventListener("input", renderTable);
}
