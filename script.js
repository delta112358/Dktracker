let gameState = {
  players: ["Player 1", "Player 2", "Player 3", "Player 4"],
  rounds: [],
};

function saveState() {
  localStorage.setItem("dokoGame", JSON.stringify(gameState));
}

// Keep an array to track modal winner button elements for easy reference
let modalWinnerButtons = [];

// Toast notification functions
function showToast(message, type = 'error', duration = 4000) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  
  container.appendChild(toast);
  
  // Trigger animation
  setTimeout(() => toast.classList.add('show'), 100);
  
  // Auto remove
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => container.removeChild(toast), 300);
  }, duration);
}

// Confirmation modal functions
function showConfirm(message, onConfirm) {
  const modal = document.getElementById('confirmModal');
  const messageEl = document.getElementById('confirmMessage');
  const yesBtn = document.getElementById('confirmYes');
  const noBtn = document.getElementById('confirmNo');
  
  messageEl.textContent = message;
  modal.style.display = 'block';
  
  // Remove existing listeners
  const newYesBtn = yesBtn.cloneNode(true);
  const newNoBtn = noBtn.cloneNode(true);
  yesBtn.parentNode.replaceChild(newYesBtn, yesBtn);
  noBtn.parentNode.replaceChild(newNoBtn, noBtn);
  
  // Add new listeners
  newYesBtn.addEventListener('click', () => {
    modal.style.display = 'none';
    onConfirm();
  });
  
  newNoBtn.addEventListener('click', () => {
    modal.style.display = 'none';
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

  // Add permanent "Add Round" row at the end
  const addRow = document.createElement("tr");
  addRow.className = "add-round-row";
  
  // If no rounds exist, show a more prominent message
  if (gameState.rounds.length === 0) {
    addRow.innerHTML = `
      <td colspan="7" class="empty-state">
        <div class="empty-message">
          <p>No rounds yet. Click the button below to start your first round!</p>
          <button onclick='openAddRoundModal()' aria-label="Add new round" class="add-round-button prominent">Add Round</button>
        </div>
      </td>
    `;
  } else {
    addRow.innerHTML = `<td colspan="7"><button onclick='openAddRoundModal()' aria-label="Add new round" class="add-round-button">Add Round</button></td>`;
  }
  
  tbody.appendChild(addRow);

  saveState();
}


function editRound(index) {
  const round = gameState.rounds[index];
  
  // Store the index of the round being edited
  window.editingRoundIndex = index;
  
  // Open modal in edit mode
  openAddRoundModal(true);
  
  // Pre-fill the modal with existing round data
  document.getElementById('modalRoundPoints').value = round.points;
  document.getElementById('modalSoloRound').checked = round.solo;
  
  // Pre-select winner buttons based on original round data
  // Determine winners from the original scores
  const winners = round.scores.map(score => score > 0);
  
  // Build modal winner buttons first, then set their states
  buildModalWinnerButtons();
  
  // Set the winner button states after they're built
  setTimeout(() => {
    modalWinnerButtons.forEach((btn, i) => {
      if (winners[i]) {
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
      } else {
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
      }
    });
  }, 0);
}


function resetGame() {
  showConfirm("Are you sure you want to reset all scores? This action cannot be undone.", () => {
    gameState.rounds = [];
    renderTable();
    showToast("Game has been reset successfully.", "success");
  });
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

// Add event listeners for player name inputs to persist changes immediately
for (let i = 0; i < 4; i++) {
  const playerInput = document.getElementById("player" + i);
  playerInput.addEventListener("input", () => {
    gameState.players[i] = playerInput.value.trim() || `Player ${i + 1}`;
    saveState();
  });
}

document.getElementById("resetGame").addEventListener("click", resetGame);
document.getElementById("exportGame").addEventListener("click", exportGame);


const svgPencil = `
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
  <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2L3 10.207V13h2.793L14 4.793 11.207 2z"/>
</svg>`;

const svgPlus = `
<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
  <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
</svg>`;

// Modal functions
function openAddRoundModal(isEditMode = false) {
  const modal = document.getElementById('addRoundModal');
  modal.style.display = 'block';
  
  // Update modal title and button text based on mode
  const modalTitle = document.querySelector('.modal-header h2');
  const modalButton = document.getElementById('modalAddRound');
  
  if (isEditMode) {
    modalTitle.textContent = 'Edit Round';
    modalButton.textContent = 'Save Edits';
  } else {
    modalTitle.textContent = 'Add Round';
    modalButton.textContent = 'Add Round';
    // Reset modal form only for new rounds
    document.getElementById('modalRoundPoints').value = '1';
    document.getElementById('modalSoloRound').checked = false;
  }
  
  // Build modal winner buttons
  buildModalWinnerButtons();
  
  // Reset winner buttons only for new rounds
  if (!isEditMode) {
    modalWinnerButtons.forEach(btn => btn.classList.remove('active'));
  }
}

function closeAddRoundModal() {
  const modal = document.getElementById('addRoundModal');
  modal.style.display = 'none';
  
  // Clear editing state
  window.editingRoundIndex = undefined;
}

function buildModalWinnerButtons() {
  const modalWinnerButtonsContainer = document.getElementById('modalWinnerButtonsContainer');
  const legend = modalWinnerButtonsContainer.querySelector('legend');
  
  modalWinnerButtonsContainer.innerHTML = '';
  if (legend) {
    modalWinnerButtonsContainer.appendChild(legend);
  }
  
  modalWinnerButtons = [];

  gameState.players.forEach((playerName, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = playerName;
    btn.className = "winner-button";
    btn.dataset.playerIndex = index;

    btn.addEventListener("click", () => {
      btn.classList.toggle("active");
      btn.setAttribute("aria-pressed", btn.classList.contains("active"));
    });

    modalWinnerButtonsContainer.appendChild(btn);
    modalWinnerButtons.push(btn);
  });
}

function addRoundFromModal() {
  let points = parseInt(document.getElementById("modalRoundPoints").value, 10);
  if (isNaN(points) || points < 0) {
    showToast("Please enter a valid point value (0 or greater).");
    return;
  }

  let solo = document.getElementById("modalSoloRound").checked;

  // Determine winners by active modal buttons
  let winners = modalWinnerButtons.map((btn) => btn.classList.contains("active"));

  if (!winners.includes(true)) {
    showToast("Please select at least one winner.");
    return;
  }
  
  const winnerCount = winners.filter((w) => w).length;
  
  if (solo) {
    if (winnerCount !== 1 && winnerCount !== 3) {
      showToast("For a solo round, select exactly 1 winner (solo player) or 3 winners (against solo player).");
      return;
    }
  } else {
    if (winnerCount !== 2) {
      showToast("For a normal round, select exactly 2 winners.");
      return;
    }
  }

  let scores;
  if (solo) {
    scores = winners.map((w) => (w ? points * 3 : -points));
  } else {
    scores = winners.map((w) => (w ? points : -points));
  }

  // Check if we're editing an existing round
  if (window.editingRoundIndex !== undefined) {
    // Update existing round
    gameState.rounds[window.editingRoundIndex] = { points: points, scores: scores, solo: solo };
    window.editingRoundIndex = undefined; // Clear the editing index
  } else {
    // Add new round
    gameState.rounds.push({ points: points, scores: scores, solo: solo });
  }
  
  closeAddRoundModal();
  renderTable();
}

// Modal event listeners
document.getElementById('modalAddRound').addEventListener('click', addRoundFromModal);
document.querySelector('.modal-cancel-button').addEventListener('click', closeAddRoundModal);
document.querySelector('.modal-close').addEventListener('click', closeAddRoundModal);

// Close modal when clicking outside of it
document.getElementById('addRoundModal').addEventListener('click', (e) => {
  if (e.target.id === 'addRoundModal') {
    closeAddRoundModal();
  }
});

// Close confirmation modal when clicking outside of it
document.getElementById('confirmModal').addEventListener('click', (e) => {
  if (e.target.id === 'confirmModal') {
    document.getElementById('confirmModal').style.display = 'none';
  }
});

// Modal points adjustment buttons
document.getElementById('modalIncreasePoints').addEventListener('click', () => {
  let input = document.getElementById('modalRoundPoints');
  input.value = parseInt(input.value || '1') + 1;
});

document.getElementById('modalDecreasePoints').addEventListener('click', () => {
  let input = document.getElementById('modalRoundPoints');
  let newValue = parseInt(input.value || '1') - 1;
  input.value = Math.max(newValue, 0);
});

// Initialize on page load
loadState();
renderTable();
