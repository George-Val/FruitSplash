(function () {
  "use strict";

  let balance = 50.00; 
  const spinSound = new window.Audio("spin.mp3");
  const winSound = new window.Audio("win.mp3");
  const popSound = new window.Audio("pop.mp3");

  winSound.volume = 0.3;
  popSound.volume = 1.0;

  const items = ["7️⃣", "💎", "🍎", "🍀", "🔔", "🍒", "🍓", "🍋", "🍊", "🍑", "🍇", "🍉"];
  
  const doors = document.querySelectorAll(".door");
  const spinnerButton = document.querySelector("#spinner");
  const coinDisplay = document.querySelector("#coins-count");
  const infoText = document.querySelector(".info");

  if (coinDisplay) coinDisplay.textContent = balance.toFixed(2) + "€";

  async function spin() {
    if (balance < 1.00) {
      alert("Χρειάζεσαι τουλάχιστον 1.00€!");
      return;
    }

    spinnerButton.style.pointerEvents = "none";
    spinnerButton.style.opacity = "0.5";
    infoText.textContent = "Spinning...";

    balance -= 1.00;
    if (coinDisplay) coinDisplay.textContent = balance.toFixed(2) + "€";

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
        const arr = [];
        for (let n = 0; n < groups; n++) {
          arr.push(...items);
        }
        pool.push(...shuffle(arr));
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

      const travelDistance = (pool.length - 4) * 80;
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
    const toExplode = [];
    const symbolValues = {
        "7️⃣": 5.00, "💎": 3.00, "🍎": 1.50, "🍀": 1.00,
        "🔔": 0.50, "🍒": 0.20, "🍓": 0.15, "🍋": 0.10,
        "🍊": 0.10, "🍑": 0.05, "🍇": 0.05, "🍉": 0.05
    };

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const sym = grid[r][c].symbol;
        if (sym !== "❓") {
          if (!counts[sym]) counts[sym] = [];
          counts[sym].push(grid[r][c]);
        }
      }
    }

    let wonThisRound = false;
    for (const sym in counts) {
      if (counts[sym].length >= 5) { // Δυσκολία 5+
        wonThisRound = true;
        counts[sym].forEach(item => toExplode.push(item.element));
        let val = symbolValues[sym] || 0.05;
        balance += (counts[sym].length * val);
      }
    }

    if (wonThisRound) {
      // 1. Παίζουμε τους ήχους
      popSound.currentTime = 0;
      popSound.play();
      winSound.play();

      // 2. Εφέ στο Grid
      const mainGrid = document.querySelector(".main-grid");
      if (mainGrid) {
        mainGrid.classList.add("winning");
        setTimeout(() => mainGrid.classList.remove("winning"), 800); // Αυξήσαμε τη λάμψη στα 800ms
      }

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

      // 5. Αναμονή πριν τον επόμενο έλεγχο (Chain Reaction)
      // Το κάνουμε 1 δευτερόλεπτο για να είναι πιο ομαλό το "πέσιμο"
      await new Promise(r => setTimeout(r, 1000));
      return checkResult(); 
    }
    
   // ΠΡΟΣΘΗΚΗ: Έλεγχος για το αν αναβοσβήνει το κόστος
   const betDisplay = document.querySelector(".bet-text");
   if (balance < 1.00) {
       if (betDisplay) betDisplay.classList.add("no-funds");
   } else {
       if (betDisplay) betDisplay.classList.remove("no-funds");
   }

   // Εδώ ξεκλειδώνει το κουμπί για το επόμενο πάτημα
   spinnerButton.style.pointerEvents = "auto";
   spinnerButton.style.opacity = "1";
   infoText.textContent = "Good Luck!";
 } // <--- Εδώ κλείνει η checkResult

  function fillGaps() {
    doors.forEach(door => {
      const boxesContainer = door.querySelector(".boxes");
      const currentCount = boxesContainer.querySelectorAll(".box").length;
      const needed = 4 - currentCount;

      for (let i = 0; i < needed; i++) {
        const newBox = document.createElement("div");
        newBox.classList.add("box");
        newBox.textContent = items[Math.floor(Math.random() * items.length)];
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

  if (spinnerButton) spinnerButton.addEventListener("click", spin);
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