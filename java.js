(function () {
  "use strict";

  let balance = 50.00; 
  let currentBet = 1.00;
  const betOptions = [0.20, 0.40, 0.60, 0.80, 1.00, 2.00, 5.00, 10.00];
  let betIndex = 4; // Ξεκινάμε από το 1.00€ (index 4)
  let currentMultiplier = 1;
  let isAutoplay = false;
  let isBonusSpin = false;
  let isHeld = false; // Μεταβλητή για το Power Spin (κράτημα κουμπιού)

  // Leveling System Variables
  let currentLevel = 1;
  let currentXP = 0;
  let xpNeeded = 100;

  const spinSound = new window.Audio("spin.mp3");
  const winSound = new window.Audio("win.mp3");
  const popSound = new window.Audio("pop.mp3");

  winSound.volume = 0.3;
  popSound.volume = 1.0;

  // Κεντρική ρύθμιση συμβόλων: Αξία και Σπανιότητα (Weight)
  // Όσο μεγαλύτερο το Weight, τόσο πιο συχνά εμφανίζεται το σύμβολο.
  const symbolConfig = {
    "🥭": { value: 10.00, weight: 2 },  "7️⃣": { value: 5.00, weight: 4 },
    "💎": { value: 3.00, weight: 6 },   "🍍": { value: 2.50, weight: 8 },
    "🍎": { value: 1.50, weight: 10 },  "🍀": { value: 1.00, weight: 12 },
    "🔔": { value: 0.80, weight: 15 },  "🥥": { value: 0.60, weight: 20 },
    "🍌": { value: 0.40, weight: 25 },  "🍒": { value: 0.25, weight: 30 },
    "🍓": { value: 0.20, weight: 35 },  "🥝": { value: 0.15, weight: 40 },
    "🍋": { value: 0.10, weight: 50 },  "🍊": { value: 0.10, weight: 50 },
    "🍑": { value: 0.05, weight: 60 },  "🍇": { value: 0.05, weight: 60 },
    "🍉": { value: 0.05, weight: 60 }
  };

  const levelSymbols = {
    1: ["🍉", "🍇", "🍑", "🍊", "🍋"],
    2: ["🍌", "🥥", "🍓"],
    3: ["🍒", "🥝"],
    4: ["🔔", "🍀", "🍍", "🍎"],
    5: ["💎", "7️⃣", "🥭"]
  };

  const wildProbability = 0.04;

  let activeItems = [];
  const addWeightedSymbols = (lvl) => {
    levelSymbols[lvl].forEach(sym => {
      const weight = symbolConfig[sym]?.weight || 10;
      for (let i = 0; i < weight; i++) activeItems.push(sym);
    });
  };
  addWeightedSymbols(1);
  
  const doors = document.querySelectorAll(".door");
  const spinnerButton = document.querySelector("#spinner");
  const betDisplay = document.querySelector(".bet-text");
  const infoText = document.querySelector(".info");
  const multDisplay = document.querySelector("#multiplier-display");
  const coinDisplay = document.querySelector("#coins-count");
  const autoButton = document.querySelector("#auto-btn");
  const buyButton = document.querySelector("#buy-btn");

  // Βοηθητική συνάρτηση για επιλογή συμβόλου με βάση τις πιθανότητες
  function getRandomSymbol() {
    const prob = isBonusSpin ? 0.15 : wildProbability; 
    if (Math.random() < prob) return "⭐";
    return activeItems[Math.floor(Math.random() * activeItems.length)];
  }

  // Συνάρτηση για την ενημέρωση της εμφάνισης του στοιχήματος και του ελέγχου υπολοίπου
  function updateBetDisplay() {
    if (betDisplay) {
      betDisplay.textContent = currentBet.toFixed(2) + "€";
      
      // Αν το υπόλοιπο είναι αρκετό, αφαιρούμε το κόκκινο αναβόσβησμα
      if (balance >= currentBet) {
        betDisplay.classList.remove("no-funds");
      } else {
        betDisplay.classList.add("no-funds");
      }
    }
  }

  if (coinDisplay) coinDisplay.textContent = balance.toFixed(2) + "€";
  updateBetDisplay();

  async function spin(isBonus = false) {
    const cost = isBonus ? currentBet * 50 : currentBet;
    
    if (balance < cost) {
      alert(`Χρειάζεσαι τουλάχιστον ${cost.toFixed(2)}€ για αυτό!`);
      return;
    }

    spinnerButton.style.pointerEvents = "none";
    spinnerButton.style.opacity = "0.5";
    infoText.textContent = isBonus ? "SUPER SPIN!" : "Spinning...";
    
    isBonusSpin = isBonus;
    currentMultiplier = isBonus ? 5 : 1; 
    if (multDisplay) multDisplay.textContent = isBonus ? "X5 START!" : "";

    balance -= cost;
    if (coinDisplay) coinDisplay.textContent = balance.toFixed(2) + "€";
    updateBetDisplay(); // Ενημέρωση μετά την αφαίρεση χρημάτων

    spinSound.currentTime = 0;
    spinSound.play();

    init(false, 3, 2);

    await new Promise((resolve) => setTimeout(resolve, 50));

    const spins = Array.from(doors).map((door) => {
      return new Promise((resolve) => {
        const boxes = door.querySelector(".boxes");
        const duration = parseFloat(boxes.style.transitionDuration) || 2;
        boxes.style.transform = "translateY(0)";
        setTimeout(resolve, duration * 1000);
      });
    });

    document.querySelector(".spin-icon").classList.add("spinning-icon");
    await Promise.all(spins);
    document.querySelector(".spin-icon").classList.remove("spinning-icon");

    checkResult();
  }

  function init(firstInit = true, groups = 1, duration = 1) {
    for (const door of doors) {
      const boxes = door.querySelector(".boxes");
      const boxesClone = boxes.cloneNode(false);
      const pool = [];

      const currentBoxes = Array.from(boxes.querySelectorAll(".box"));
      if (currentBoxes.length > 0) {
        currentBoxes.forEach(b => pool.push(b.textContent));
      } else {
        pool.push("❓", "❓", "❓", "❓");
      }

      if (!firstInit) {
        // Παράγουμε τυχαία σύμβολα για το spin pool
        const poolSize = groups * 10; 
        for (let n = 0; n < poolSize; n++) {
          pool.push(getRandomSymbol());
        }
      }

      boxesClone.addEventListener("transitionend", function () {
        this.querySelectorAll(".box").forEach((box, index) => {
          if (index > 3) this.removeChild(box);
        });
        this.style.transitionDuration = "0s";
        this.style.transform = "translateY(0)";
      }, { once: true });

      for (let i = pool.length - 1; i >= 0; i--) {
        const box = document.createElement("div");
        box.classList.add("box");
        box.textContent = pool[i];
        boxesClone.appendChild(box);
      }

      // Υπολογισμός του ύψους δυναμικά από το CSS για σωστό animation σε κινητά
      const boxHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--box-size')) || 80;
      const travelDistance = (pool.length - 4) * boxHeight;
      boxesClone.style.transitionDuration = `${duration}s`;
      
      if (!firstInit) {
        boxesClone.style.transform = `translateY(-${travelDistance}px)`;
      }
      door.replaceChild(boxesClone, boxes);
    }
  }

  async function checkResult() {
    const grid = [];
    const doorElements = document.querySelectorAll(".door");
    
    doorElements.forEach((door, colIndex) => {
      const boxes = Array.from(door.querySelectorAll(".box")); 
      boxes.forEach((box, rowIndex) => {
        if (!grid[rowIndex]) grid[rowIndex] = [];
        grid[rowIndex][colIndex] = { symbol: box.textContent, element: box };
      });
    });

    const counts = {};
    const wildPositions = [];
    const toExplode = [];

    // Εντοπισμός Wilds
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (grid[r][c].symbol === "⭐") {
          wildPositions.push(grid[r][c]);
        }
      }
    }

    // Καταμέτρηση συμβόλων λαμβάνοντας υπόψη τα Wilds
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const sym = grid[r][c].symbol;
        if (sym !== "❓" && sym !== "⭐") {
          if (!counts[sym]) counts[sym] = [];
          // Προσθήκη του συμβόλου αν δεν έχει ήδη προστεθεί σε αυτή τη λίστα
          if (!counts[sym].includes(grid[r][c])) {
             counts[sym].push(grid[r][c]);
          }
        }
      }
    }

    // Προσθήκη των Wilds σε κάθε γκρουπ συμβόλων που βρέθηκε
    for (const sym in counts) {
      wildPositions.forEach(wild => counts[sym].push(wild));
    }

    let wonThisRound = false;
    let totalWinThisStep = 0;

    for (const sym in counts) {
      if (counts[sym].length >= 5) { // Δυσκολία 5+
        wonThisRound = true;
        counts[sym].forEach(item => toExplode.push(item.element));
        const val = symbolConfig[sym]?.value || 0.05;
        // Υπολογισμός κέρδους: Μόνο τα πραγματικά σύμβολα πληρώνονται, όχι τα Wilds
        const realSymbolsCount = counts[sym].filter(item => item.symbol !== "⭐").length;
        totalWinThisStep += (realSymbolsCount * val * currentBet * currentMultiplier);
      }
    }

    if (wonThisRound) {
      balance += totalWinThisStep;
      if (multDisplay) multDisplay.textContent = `COMBO X${currentMultiplier}!`;
      if (multDisplay) {
        multDisplay.textContent = `COMBO X${currentMultiplier}!`;
        multDisplay.style.transform = "scale(1.5)";
        multDisplay.style.color = "#6bff8b";
        setTimeout(() => { multDisplay.style.transform = "scale(1)"; }, 300);
      }
      
      // 1. Παίζουμε τους ήχους
      popSound.currentTime = 0;
      popSound.play();
      winSound.play();

      // 2. Εφέ στο Grid
      const mainGrid = document.querySelector(".main-grid");
      if (mainGrid) {
        mainGrid.classList.add("winning");
        if (currentMultiplier > 1) mainGrid.classList.add("shake");
        setTimeout(() => mainGrid.classList.remove("winning"), 800); // Αυξήσαμε τη λάμψη στα 800ms
        setTimeout(() => mainGrid.classList.remove("shake"), 500);
      }

      // Έλεγχος για Big Win (πάνω από 10x το στοίχημα)
      if (totalWinThisStep >= currentBet * 10) {
        showBigWin();
      }

      // Προσθήκη XP βασισμένο στο κέρδος
      currentXP += Math.round(totalWinThisStep * 10);
      updateLevelProgress();

      if (coinDisplay) coinDisplay.textContent = balance.toFixed(2) + "€";
      
      // 3. Animation "Σκασίματος"
      toExplode.forEach(el => {
        // Πρώτα κάνουμε το σύμβολο να μεγαλώσει λίγο (σαν έκρηξη) και μετά να εξαφανιστεί
        el.style.transition = "transform 0.5s ease-in, opacity 0.5s ease-in"; 
        el.style.transform = "scale(1.4)"; // Μεγαλώνει πριν σβήσει
        el.style.opacity = "0";
      });

      // 4. ΠΕΡΙΜΕΝΟΥΜΕ ΠΕΡΙΣΣΟΤΕΡΟ (800ms αντί για 400ms)
      // Έτσι ο παίκτης προλαβαίνει να δει ποια σύμβολα κέρδισαν
      await new Promise(r => setTimeout(r, 800));
      
      toExplode.forEach(el => el.remove());
      
      fillGaps();

      currentMultiplier++; // Αύξηση πολλαπλασιαστή για το επόμενο cascade
      // 5. Αναμονή πριν τον επόμενο έλεγχο (Chain Reaction)
      // Το κάνουμε 1 δευτερόλεπτο για να είναι πιο ομαλό το "πέσιμο"
      await new Promise(r => setTimeout(r, 1000));
      return checkResult(); 
    }
    
   // Έλεγχος υπολοίπου μετά τα κέρδη
   updateBetDisplay();

   // Εδώ ξεκλειδώνει το κουμπί για το επόμενο πάτημα
   spinnerButton.style.pointerEvents = "auto";
   spinnerButton.style.opacity = "1";
   isBonusSpin = false; // Επαναφορά του flag
   infoText.textContent = "Good Luck!";

   // Έλεγχος για Autoplay ή Power Spin (Hold)
   if (isAutoplay || isHeld) {
     if (balance >= currentBet) {
       // 500ms για Autoplay, σχεδόν ακαριαία (50ms) για Power Spin ενώ το κρατάς
       const delay = isAutoplay ? 500 : 50;
       setTimeout(() => { 
         if (isAutoplay || isHeld) spin(); 
       }, delay);
     } else {
       if (isAutoplay) toggleAutoplay();
       isHeld = false;
     }
   }
 } // <--- Εδώ κλείνει η checkResult

  function showBigWin() {
    let winMsg = document.querySelector(".big-win-overlay");
    winMsg.classList.add("show");
    setTimeout(() => winMsg.classList.remove("show"), 2000);
  }

  function updateLevelProgress() {
    if (currentXP >= xpNeeded) {
      levelUp();
    }
    const fill = document.querySelector("#xp-fill");
    const xpText = document.querySelector("#xp-text");
    if (fill) fill.style.width = `${(currentXP / xpNeeded) * 100}%`;
    if (xpText) xpText.textContent = `${currentXP}/${xpNeeded} XP`;
  }

  function levelUp() {
    currentLevel++;
    currentXP = 0;
    xpNeeded = currentLevel * 150;
    
    // Προσθήκη νέων συμβόλων στο pool
    if (levelSymbols[currentLevel]) {
      addWeightedSymbols(currentLevel);
    }

    document.querySelector("#level-val").textContent = currentLevel;
    infoText.textContent = `LEVEL UP! REACHED ${currentLevel}`;
    infoText.style.color = "#ffd700";
    setTimeout(() => { infoText.style.color = "white"; }, 2000);
  }

  function fillGaps() {
    doors.forEach(door => {
      const boxesContainer = door.querySelector(".boxes");
      const currentCount = boxesContainer.querySelectorAll(".box").length;
      const needed = 4 - currentCount;

      for (let i = 0; i < needed; i++) {
        const newBox = document.createElement("div");
        newBox.classList.add("box");
        newBox.textContent = getRandomSymbol();
        newBox.style.opacity = "0";
        boxesContainer.prepend(newBox);
        setTimeout(() => { newBox.style.opacity = "1"; }, 50);
      }
    });
  }

  function shuffle([...arr]) {
    let m = arr.length;
    while (m) {
      const i = Math.floor(Math.random() * m--);
      [arr[m], arr[i]] = [arr[i], arr[m]];
    }
    return arr;
  }

  // --- Διαχείριση Power Spin (Hold) ---
  const startHold = (e) => {
    // Αγνόησε αν δεν είναι το αριστερό κλικ
    if (e.type === "mousedown" && e.button !== 0) return;
    isHeld = true;
    if (spinnerButton.style.pointerEvents !== "none") spin(false);
  };

  const endHold = () => {
    isHeld = false;
  };

  const handleSpinClick = () => {
    if (spinnerButton.style.pointerEvents !== "none") spin(false);
  };

  if (spinnerButton) {
    spinnerButton.addEventListener("mousedown", startHold);
    spinnerButton.addEventListener("touchstart", startHold, { passive: true });
    spinnerButton.addEventListener("click", handleSpinClick); 
  }
  window.addEventListener("mouseup", endHold);
  window.addEventListener("touchend", endHold);

  // --- Διαχείριση Autoplay ---
  function toggleAutoplay() {
    isAutoplay = !isAutoplay;
    if (isAutoplay) {
      autoButton.classList.add("active");
      autoButton.textContent = "STOP";
      // Αν δεν τρέχει ήδη spin, ξεκίνα το
      if (spinnerButton.style.pointerEvents !== "none") spin();
    } else {
      autoButton.classList.remove("active");
      autoButton.textContent = "AUTO";
    }
  }

  if (autoButton) autoButton.addEventListener("click", toggleAutoplay);

  // --- Διαχείριση Buy Bonus ---
  const modalOverlay = document.querySelector("#modal-overlay");
  const bonusCostSpan = document.querySelector("#bonus-cost");
  const confirmBuyBtn = document.querySelector("#confirm-buy");
  const cancelBuyBtn = document.querySelector("#cancel-buy");

  if (buyButton) {
    buyButton.addEventListener("click", () => {
      if (spinnerButton.style.pointerEvents !== "none") {
        const cost = currentBet * 50;
        bonusCostSpan.textContent = cost.toFixed(2);
        modalOverlay.classList.remove("hidden");
      }
    });
  }

  if (confirmBuyBtn) confirmBuyBtn.addEventListener("click", () => {
    modalOverlay.classList.add("hidden");
    spin(true);
  });

  if (cancelBuyBtn) cancelBuyBtn.addEventListener("click", () => {
    modalOverlay.classList.add("hidden");
  });

  // --- Διαχείριση Επιλογής Στοιχήματος ---
  const betMinus = document.querySelector("#bet-minus");
  const betPlus = document.querySelector("#bet-plus");

  if (betMinus) {
    betMinus.addEventListener("click", () => {
      if (betIndex > 0) {
        if (isAutoplay) toggleAutoplay();
        betIndex--;
        currentBet = betOptions[betIndex];
        updateBetDisplay();
      }
    });
  }

  if (betPlus) {
    betPlus.addEventListener("click", () => {
      if (betIndex < betOptions.length - 1) {
        if (isAutoplay) toggleAutoplay();
        betIndex++;
        currentBet = betOptions[betIndex];
        updateBetDisplay();
      }
    });
  }

  // --- Διαχείριση Πίνακα Κερδών (Toggle Paytable) ---
  const toggleBtn = document.querySelector("#toggle-paytable");
  const paytable = document.querySelector(".paytable");

  if (toggleBtn && paytable) {
    toggleBtn.addEventListener("click", () => {
      // Εναλλαγή της κλάσης hidden
      paytable.classList.toggle("hidden");
      
      // Αλλαγή του εικονιδίου: i αν είναι κλειστό, ✕ αν είναι ανοιχτό
      if (paytable.classList.contains("hidden")) {
        toggleBtn.textContent = "i";
        toggleBtn.style.color = "#ffd700"; // Χρυσό όταν είναι κλειστό
      } else {
        toggleBtn.textContent = "✕";
        toggleBtn.style.color = "#ff4d4d"; // Κόκκινο για το κλείσιμο
      }
    });
  }
  init();
})();
