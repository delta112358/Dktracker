let gameState = {
  players: ["Player 1", "Player 2", "Player 3", "Player 4"],
  rounds: [],
};

function saveState() {
  localStorage.setItem("dokoGame", JSON.stringify(gameState));
}

// References the container where winner buttons will be placed
const winnerButtonsContainer = document.getElementById(
  "winnerButtonsContainer"
);

// Keep an array to track winner button elements for easy reference
let winnerButtons = [];

// Function to build or rebuild winner buttons based on current player names (called once on load)
function buildWinnerButtons() {
  // Preserve the legend element by finding it first
  const legend = winnerButtonsContainer.querySelector('legend');
  
  // Clear only the content after the legend
  winnerButtonsContainer.innerHTML = "";
  
  // Restore the legend if it existed
  if (legend) {
    winnerButtonsContainer.appendChild(legend);
  }
  
  winnerButtons = [];

  gameState.players.forEach((playerName, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = playerName;
    btn.className = "winner-button";
    btn.dataset.playerIndex = index;

    btn.addEventListener("click", () => {
      // Toggle active state on button click
      btn.classList.toggle("active");
      // Optional for accessibility: toggle aria-pressed
      btn.setAttribute("aria-pressed", btn.classList.contains("active"));
    });

    winnerButtonsContainer.appendChild(btn);
    winnerButtons.push(btn);
  });
}

// Function to update winner button labels to reflect player name changes without rebuilding buttons
function updateWinnerButtonLabels() {
  winnerButtons.forEach((btn, i) => {
    btn.textContent = gameState.players[i];
  });
}

function loadState() {
  let saved = localStorage.getItem("dokoGame");
  if (saved) {
    gameState = JSON.parse(saved);
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
    if (!input.value.trim()) input.value = gameState.players[i];
  }

  // Do NOT rebuild winner buttons here to preserve active states

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
    rowHtml += `<td><button onclick='editRound(${index})' aria-label="Edit round" class="icon-button">${svgPencil}</button></td>`;
    tr.innerHTML = rowHtml;

    // Add separator after every 4th non-solo round
    if (!round.solo && roundCounter > 1 && (roundCounter - 1) % 4 === 0) {
      tr.classList.add("game-separator");
    }

    tbody.appendChild(tr);
  });

  saveState();
}

function addRound() {
  let points = parseInt(document.getElementById("roundPoints").value, 10);
  if (isNaN(points) || points <= 0)
    return alert("Enter a valid positive point value.");

  let solo = document.getElementById("soloRound").checked;

  // Determine winners by active buttons
  let winners = winnerButtons.map((btn) => btn.classList.contains("active"));

  if (!winners.includes(true)) return alert("Select at least one winner.");
  if (solo && winners.filter((w) => w).length !== 1)
    return alert("Select exactly one winner for a solo round.");

  let scores;
  if (solo) {
    scores = winners.map((w) => (w ? points * 3 : -points));
  } else {
    scores = winners.map((w) => (w ? points : -points));
  }

  gameState.rounds.push({ points: points, scores: scores, solo: solo });

  // Reset form inputs
  document.getElementById("roundPoints").value = "1";
  document.getElementById("soloRound").checked = false;
  // Clear active states on winner buttons
  winnerButtons.forEach((btn) => btn.classList.remove("active"));

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
  // CSV header: Round, player names, then Points column
  let csv = "Round," + gameState.players.join(",") + ",Points\n";

  // Initialize totals array to track cumulative scores per player
  let totals = [0, 0, 0, 0];

  gameState.rounds.forEach((round, idx) => {
    // Update totals with this round's scores
    round.scores.forEach((score, i) => {
      totals[i] += score;
    });

    // Compose CSV row:
    // Round label: "S" for solo, otherwise round index + 1
    // Then totals (running scores)
    // Then round.points
    let roundLabel = round.solo ? "S" : idx + 1;

    csv += roundLabel + "," + totals.join(",") + "," + round.points + "\n";
  });

  // Create downloadable CSV file as before
  let blob = new Blob([csv], { type: "text/csv" });
  let url = URL.createObjectURL(blob);
  let a = document.createElement("a");
  a.href = url;
  a.download = "doppelkopf_scores.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// Add event listeners for player name inputs to persist changes immediately and update winner buttons labels
for (let i = 0; i < 4; i++) {
  const playerInput = document.getElementById("player" + i);
  playerInput.addEventListener("input", () => {
    gameState.players[i] = playerInput.value.trim() || `Player ${i + 1}`;
    saveState();
    updateWinnerButtonLabels(); // update button labels but do not rebuild buttons
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

const svgPencil = `
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
  <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2L3 10.207V13h2.793L14 4.793 11.207 2z"/>
</svg>`;

// Initialize on page load
loadState();
buildWinnerButtons(); // build winner buttons once here
renderTable();
