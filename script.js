let gameState = {
  players: ["Player 1", "Player 2", "Player 3", "Player 4"],
  rounds: [],
};

function saveState() {
  localStorage.setItem("dokoGame", JSON.stringify(gameState));
}

function loadState() {
  let saved = localStorage.getItem("dokoGame");
  if (saved) {
    gameState = JSON.parse(saved);
    // Update player name inputs to loaded names
    for (let i = 0; i < 4; i++) {
      let input = document.getElementById("player" + i);
      input.value = gameState.players[i];
    }
  }
}

function renderTable() {
  // Update player names from inputs and sync to gameState
  for (let i = 0; i < 4; i++) {
    let input = document.getElementById("player" + i);
    gameState.players[i] = input.value.trim() || `Player ${i + 1}`;
    // Ensure input reflects fallback if empty
    if (!input.value.trim()) input.value = gameState.players[i];
  }

  const tbody = document.querySelector("#scoreTable tbody");
  tbody.innerHTML = "";
  let totals = [0, 0, 0, 0];
  let roundCounter = 1; // separate counter for numbered rounds

  gameState.rounds.forEach((round, index) => {
    let tr = document.createElement("tr");
    let roundLabel = round.solo ? "S" : roundCounter++;

    let rowHtml = `<td>${roundLabel}</td>`;
    round.scores.forEach((score, i) => {
      totals[i] += score;
      let cls = score > 0 ? "positive" : score < 0 ? "negative" : "";
      rowHtml += `<td class='${cls}'>${totals[i]}</td>`;
    });

    rowHtml += `<td>${round.points}</td>`;
    rowHtml += `<td><button onclick='editRound(${index})'>Edit</button></td>`;
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
  document.getElementById("roundPoints").value = "1"; // reset to default 1
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
  if (isNaN(newPoints) || newPoints <= 0) {
    return alert("Enter a valid positive point value.");
  }

  let newScores = [];
  for (let i = 0; i < 4; i++) {
    let val = parseInt(document.getElementById(`edit${index}_${i}`).value, 10);
    if (isNaN(val)) {
      return alert("All scores must be valid numbers.");
    }
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

// Add event listeners for player name inputs to persist changes immediately
for (let i = 0; i < 4; i++) {
  const playerInput = document.getElementById("player" + i);
  playerInput.addEventListener("input", () => {
    gameState.players[i] = playerInput.value.trim() || `Player ${i + 1}`;
    saveState();
  });
}

document.getElementById("addRound").addEventListener("click", addRound);
document.getElementById("resetGame").addEventListener("click", resetGame);
document.getElementById("exportGame").addEventListener("click", exportGame);

// Points adjustment buttons
document.getElementById("increasePoints").addEventListener("click", () => {
  let input = document.getElementById("roundPoints");
  input.value = parseInt(input.value || "1") + 1;
});

document.getElementById("decreasePoints").addEventListener("click", () => {
  let input = document.getElementById("roundPoints");
  let newValue = parseInt(input.value || "1") - 1;
  input.value = Math.max(newValue, 1); // prevent < 1
});

// Initialize
loadState();
renderTable();
