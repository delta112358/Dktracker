// Import utility functions
import { showToast, showConfirm, parseCSV, validateImportedData, exportGame } from './js/utils.js';

// Import constants
import { 
  SVG_PENCIL, 
  PLAYER_COLORS, 
  DEFAULT_PLAYER_NAMES, 
  GAME_CONFIG, 
  GRAPH_CONFIG, 
  TOAST_CONFIG, 
  CSV_CONFIG, 
  MODAL_CONFIG, 
  CSS_CLASSES, 
  ELEMENT_IDS 
} from './js/constants.js';

let gameState = {
  players: [...DEFAULT_PLAYER_NAMES],
  rounds: [],
};

function saveState() {
  localStorage.setItem("dokoGame", JSON.stringify(gameState));
}

// Keep an array to track modal winner button elements for easy reference
let modalWinnerButtons = [];




function loadState() {
  let saved = localStorage.getItem("dokoGame");
  if (saved) {
    gameState = JSON.parse(saved);
    for (let i = 0; i < 4; i++) {
      let input = document.getElementById("player" + i);
      if (gameState.players[i] && gameState.players[i] !== `Player ${i + 1}`) {
        input.value = gameState.players[i];
      } else {
        input.value = input.placeholder; // Show placeholder for default names
      }
    }
  }
}

function renderTable() {
  // Update player names from inputs and sync to gameState
  for (let i = 0; i < 4; i++) {
    let input = document.getElementById("player" + i);
    let currentValue = input.value.trim();
    
    // If the input contains placeholder text, treat it as empty
    if (currentValue === input.placeholder) {
      currentValue = "";
    }
    
    gameState.players[i] = currentValue || DEFAULT_PLAYER_NAMES[i];
    
    // If the field is empty, show placeholder
    if (!currentValue) {
      input.value = input.placeholder;
    }
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
    rowHtml += `<td><button onclick='editRound(${index})' aria-label="Edit round" class="icon-button">${SVG_PENCIL}</button></td>`;
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
          <button onclick='openAddRoundModal()' aria-label="Add new round" class="add-round-button">Add Round</button>
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
    
    // Update graph if it's visible
    const graphContainer = document.getElementById("graphContainer");
    if (graphContainer.style.display !== "none") {
      updateGraph();
    }
  });
}


// CSV Import functionality

function importGame() {
  // Check if there are existing rounds and show warning
  if (gameState.rounds.length > 0) {
    showConfirm(
      "Importing a CSV file will completely replace your current scoreboard. All existing rounds will be lost. Are you sure you want to continue?",
      () => {
        // User confirmed, proceed with file selection
        document.getElementById('csvFileInput').click();
      }
    );
  } else {
    // No existing rounds, proceed directly
    document.getElementById('csvFileInput').click();
  }
}

function handleCSVImport(event) {
  const file = event.target.files[0];
  if (!file) {
    return; // User cancelled file selection
  }

  // Reset file input
  event.target.value = '';

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const csvText = e.target.result;
      
      // Parse and validate the CSV
      const parsedData = parseCSV(csvText);
      validateImportedData(parsedData);
      
      // If we get here, the CSV is valid - proceed with import
      performImport(parsedData);
      
    } catch (error) {
      showToast(`Import failed: ${error.message}`, 'error');
    }
  };
  
  reader.onerror = function() {
    showToast('Error reading file. Please try again.', 'error');
  };
  
  reader.readAsText(file);
}

function performImport(parsedData) {
  const { playerNames, rounds } = parsedData;
  
  // Update player names
  for (let i = 0; i < 4; i++) {
    gameState.players[i] = playerNames[i];
    const input = document.getElementById(`player${i}`);
    input.value = playerNames[i];
  }
  
  // Convert imported rounds to our format
  gameState.rounds = rounds.map(round => ({
    points: round.points,
    scores: round.roundScores,
    solo: round.isSolo
  }));
  
  // Update the display
  renderTable();
  
  // Update graph if visible
  const graphContainer = document.getElementById("graphContainer");
  if (graphContainer.style.display !== "none") {
    updateGraph();
  }
  
  showToast(`Successfully imported ${rounds.length} rounds`, 'success');
}

// Add event listeners for player name inputs to persist changes immediately
for (let i = 0; i < 4; i++) {
  const playerInput = document.getElementById("player" + i);
  
  // Handle placeholder behavior - clear placeholder on focus
  playerInput.addEventListener("focus", () => {
    if (playerInput.value === playerInput.placeholder) {
      playerInput.value = "";
    }
  });
  
  // Restore placeholder if field becomes empty
  playerInput.addEventListener("blur", () => {
    if (playerInput.value.trim() === "") {
      playerInput.value = playerInput.placeholder;
    }
  });
  
  playerInput.addEventListener("input", () => {
    gameState.players[i] = playerInput.value.trim() || `Player ${i + 1}`;
    saveState();
  });
}

document.getElementById("resetGame").addEventListener("click", resetGame);
document.getElementById("exportGame").addEventListener("click", () => exportGame(gameState));
document.getElementById("importGame").addEventListener("click", importGame);
document.getElementById("csvFileInput").addEventListener("change", handleCSVImport);

// Graph functionality
document.getElementById("toggleGraph").addEventListener("click", toggleGraph);




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
    if (!GAME_CONFIG.SOLO_WINNER_COUNTS.includes(winnerCount)) {
      showToast("For a solo round, select exactly 1 winner (solo player) or 3 winners (against solo player).");
      return;
    }
  } else {
    if (winnerCount !== GAME_CONFIG.NORMAL_WINNER_COUNT) {
      showToast("For a normal round, select exactly 2 winners.");
      return;
    }
  }

  let scores;
  if (solo) {
    // Solo round logic:
    // - If 1 winner (solo player wins): winner gets 3x points, losers get -1x points
    // - If 3 winners (solo player loses): winners get 1x points, loser gets -3x points
    if (winnerCount === 1) {
      // Solo player wins
      scores = winners.map((w) => (w ? points * GAME_CONFIG.SOLO_MULTIPLIER : -points));
    } else {
      // Solo player loses (3 winners)
      scores = winners.map((w) => (w ? points : -points * GAME_CONFIG.SOLO_MULTIPLIER));
    }
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
  
  // Update graph if it's visible
  const graphContainer = document.getElementById("graphContainer");
  if (graphContainer.style.display !== "none") {
    updateGraph();
  }
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

// Graph functionality
function toggleGraph() {
  const container = document.getElementById("graphContainer");
  const icon = document.querySelector(".toggle-icon");
  const isVisible = container.style.display !== "none";
  
  if (isVisible) {
    container.style.display = "none";
    icon.classList.remove("expanded");
  } else {
    container.style.display = "block";
    icon.classList.add("expanded");
    updateGraph();
  }
}

function updateGraph() {
  const graphContainer = document.getElementById("scoreGraph");
  const rounds = gameState.rounds;
  
  if (rounds.length === 0) {
    graphContainer.innerHTML = '<p style="text-align: center; color: var(--color-text-muted); padding: 2rem;">No rounds yet. Add some rounds to see the score evolution!</p>';
    return;
  }
  
  // Calculate cumulative scores for each player
  const cumulativeScores = [[0], [0], [0], [0]]; // Start with 0 for each player
  
  rounds.forEach(round => {
    for (let i = 0; i < 4; i++) {
      const previousScore = cumulativeScores[i][cumulativeScores[i].length - 1];
      const roundScore = round.scores[i] || 0;
      cumulativeScores[i].push(previousScore + roundScore);
    }
  });
  
  // Graph dimensions and padding
  const width = Math.max(GRAPH_CONFIG.MIN_WIDTH, rounds.length * GRAPH_CONFIG.ROUND_WIDTH_MULTIPLIER + GRAPH_CONFIG.ADDITIONAL_WIDTH);
  const height = GRAPH_CONFIG.HEIGHT;
  const padding = GRAPH_CONFIG.PADDING;
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;
  
  // Find min and max scores for scaling
  const allScores = cumulativeScores.flat();
  const minScore = Math.min(...allScores);
  const maxScore = Math.max(...allScores);
  const scoreRange = maxScore - minScore || 1; // Avoid division by zero
  
  // Player colors
  const colors = PLAYER_COLORS;
  
  // Create SVG
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", width);
  svg.setAttribute("height", height);
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  
  // Create grid lines
  const gridGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
  gridGroup.setAttribute("class", "grid");
  
  // Horizontal grid lines
  for (let i = 0; i <= GRAPH_CONFIG.GRID_LINES; i++) {
    const y = padding.top + (graphHeight / GRAPH_CONFIG.GRID_LINES) * i;
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", padding.left);
    line.setAttribute("y1", y);
    line.setAttribute("x2", width - padding.right);
    line.setAttribute("y2", y);
    line.setAttribute("stroke", "#e0e0e0");
    line.setAttribute("stroke-width", "1");
    gridGroup.appendChild(line);
    
    // Y-axis labels
    const score = maxScore - (scoreRange / GRAPH_CONFIG.GRID_LINES) * i;
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", padding.left - 10);
    text.setAttribute("y", y + 4);
    text.setAttribute("text-anchor", "end");
    text.setAttribute("font-size", "12");
    text.setAttribute("fill", "#666");
    text.textContent = Math.round(score);
    gridGroup.appendChild(text);
  }
  
  // Vertical grid lines - now includes starting point (0) and all rounds
  const totalPoints = rounds.length + 1; // +1 for starting point
  for (let i = 0; i <= rounds.length; i++) {
    const x = padding.left + (graphWidth / rounds.length) * i;
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", x);
    line.setAttribute("y1", padding.top);
    line.setAttribute("x2", x);
    line.setAttribute("y2", height - padding.bottom);
    line.setAttribute("stroke", "#e0e0e0");
    line.setAttribute("stroke-width", "1");
    gridGroup.appendChild(line);
    
    // X-axis labels - show 0 for starting point, then round numbers
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", x);
    text.setAttribute("y", height - padding.bottom + 20);
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("font-size", "12");
    text.setAttribute("fill", "#666");
    
    if (i === 0) {
      text.textContent = "0";
    } else {
      // Match table numbering: solo rounds show "S", others show round number
      const roundIndex = i - 1;
      const round = rounds[roundIndex];
      if (round.solo) {
        text.textContent = "S";
        text.setAttribute("fill", "#d32f2f"); // Red color for solo rounds
        text.setAttribute("font-weight", "bold");
      } else {
        text.textContent = i.toString();
      }
    }
    gridGroup.appendChild(text);
  }
  
  svg.appendChild(gridGroup);
  
  // Draw lines and points for each player
  for (let playerIndex = 0; playerIndex < 4; playerIndex++) {
    const scores = cumulativeScores[playerIndex];
    const color = colors[playerIndex];
    
    // Create path for the line
    let pathData = "";
    for (let i = 0; i < scores.length; i++) {
      const x = padding.left + (graphWidth / (scores.length - 1)) * i;
      const y = padding.top + graphHeight - ((scores[i] - minScore) / scoreRange) * graphHeight;
      
      if (i === 0) {
        pathData += `M ${x} ${y}`;
      } else {
        pathData += ` L ${x} ${y}`;
      }
    }
    
    // Draw the line
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", pathData);
    path.setAttribute("stroke", color);
    path.setAttribute("stroke-width", GRAPH_CONFIG.LINE_WIDTH);
    path.setAttribute("fill", "none");
    path.setAttribute("class", `player-line player-${playerIndex}`);
    svg.appendChild(path);
    
    // Draw data points
    for (let i = 0; i < scores.length; i++) {
      const x = padding.left + (graphWidth / (scores.length - 1)) * i;
      const y = padding.top + graphHeight - ((scores[i] - minScore) / scoreRange) * graphHeight;
      
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", x);
      circle.setAttribute("cy", y);
      circle.setAttribute("r", GRAPH_CONFIG.POINT_RADIUS);
      circle.setAttribute("fill", color);
      circle.setAttribute("stroke", "#fff");
      circle.setAttribute("stroke-width", "2");
      circle.setAttribute("class", `player-point player-${playerIndex}`);
      svg.appendChild(circle);
    }
  }
  
  // Add axis labels
  const xAxisLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
  xAxisLabel.setAttribute("x", width / 2);
  xAxisLabel.setAttribute("y", height - 5);
  xAxisLabel.setAttribute("text-anchor", "middle");
  xAxisLabel.setAttribute("font-size", "14");
  xAxisLabel.setAttribute("fill", "#333");
  xAxisLabel.textContent = "Round";
  svg.appendChild(xAxisLabel);
  
  const yAxisLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
  yAxisLabel.setAttribute("x", 15);
  yAxisLabel.setAttribute("y", height / 2);
  yAxisLabel.setAttribute("text-anchor", "middle");
  yAxisLabel.setAttribute("font-size", "14");
  yAxisLabel.setAttribute("fill", "#333");
  yAxisLabel.setAttribute("transform", `rotate(-90, 15, ${height / 2})`);
  yAxisLabel.textContent = "Cumulative Score";
  svg.appendChild(yAxisLabel);
  
  // Add legend
  const legendGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
  legendGroup.setAttribute("class", "legend");
  
  for (let i = 0; i < GAME_CONFIG.MAX_PLAYERS; i++) {
    const legendY = GRAPH_CONFIG.LEGEND_OFFSET + i * GRAPH_CONFIG.LEGEND_OFFSET;
    
    // Legend line
    const legendLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    legendLine.setAttribute("x1", width - 120);
    legendLine.setAttribute("y1", legendY);
    legendLine.setAttribute("x2", width - 100);
    legendLine.setAttribute("y2", legendY);
    legendLine.setAttribute("stroke", colors[i]);
    legendLine.setAttribute("stroke-width", GRAPH_CONFIG.LINE_WIDTH);
    legendGroup.appendChild(legendLine);
    
    // Legend text
    const legendText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    legendText.setAttribute("x", width - 95);
    legendText.setAttribute("y", legendY + GRAPH_CONFIG.LEGEND_TEXT_OFFSET);
    legendText.setAttribute("font-size", "12");
    legendText.setAttribute("fill", "#333");
    legendText.textContent = gameState.players[i];
    legendGroup.appendChild(legendText);
  }
  
  svg.appendChild(legendGroup);
  
  // Clear and add the new graph
  graphContainer.innerHTML = "";
  graphContainer.appendChild(svg);
}

// Make functions available globally for onclick handlers
window.openAddRoundModal = openAddRoundModal;
window.editRound = editRound;

// Initialize on page load
loadState();
renderTable();
