// Paul's Painting - Interactive Features
// 1. Cost Estimator, 2. Before/After Slider, 4. ROI Calculator,
// 5. Sticky Bar, 8. Paintability Forecast, 13. Timeline, 14. Referral

(function () {
  "use strict";

  // ════════════════════════════════════════════
  // 5. STICKY MOBILE BAR
  // ════════════════════════════════════════════
  const stickyBar = document.getElementById("stickyBar");
  if (stickyBar) {
    let lastScroll = 0;
    window.addEventListener("scroll", () => {
      const curr = window.scrollY;
      // Show after scrolling past hero
      if (curr > 600) {
        stickyBar.classList.add("visible");
        // Hide when scrolling up fast (optional, keeps it clean)
        stickyBar.classList.toggle("hidden", curr < lastScroll - 50);
      } else {
        stickyBar.classList.remove("visible");
      }
      lastScroll = curr;
    });
  }

  // ════════════════════════════════════════════
  // 8. PAINTABILITY FORECAST
  // ════════════════════════════════════════════
  function initForecast() {
    const container = document.getElementById("forecastGrid");
    if (!container) return;

    const days = generateForecast();
    const countEl = document.getElementById("idealDaysCount");

    let idealCount = 0;
    days.forEach((day) => {
      if (day.score >= 70) idealCount++;
    });

    // Calculate remaining ideal days in the season
    const now = new Date();
    const seasonEnd = new Date(now.getFullYear(), 9, 31); // Oct 31
    const seasonStart = new Date(now.getFullYear(), 4, 1); // May 1
    let remainingIdeal = 0;
    if (now < seasonStart) {
      remainingIdeal = 120; // rough estimate May-Oct
    } else if (now > seasonEnd) {
      remainingIdeal = 0;
    } else {
      const daysLeft = Math.ceil((seasonEnd - now) / 86400000);
      remainingIdeal = Math.round(daysLeft * 0.65); // ~65% of remaining days are paintable
    }

    if (countEl) {
      countEl.textContent = remainingIdeal;
    }

    days.forEach((day) => {
      const card = document.createElement("div");
      card.className = "forecast-card";

      let status, statusClass, icon;
      if (day.score >= 70) {
        status = "Ideal";
        statusClass = "ideal";
        icon = "&#9728;"; // sun
      } else if (day.score >= 40) {
        status = "Possible";
        statusClass = "possible";
        icon = "&#9925;"; // partly cloudy
      } else {
        status = "Not Ideal";
        statusClass = "poor";
        icon = "&#9730;"; // rain
      }

      card.innerHTML = `
        <div class="forecast-day">${day.dayName}</div>
        <div class="forecast-date">${day.date}</div>
        <div class="forecast-icon">${icon}</div>
        <div class="forecast-temp">${day.high}°F / ${day.low}°F</div>
        <div class="forecast-detail">Humidity: ${day.humidity}%</div>
        <div class="forecast-detail">Wind: ${day.wind} mph</div>
        <div class="forecast-status ${statusClass}">${status}</div>
        <div class="forecast-score-bar">
          <div class="forecast-score-fill ${statusClass}" style="width:${day.score}%"></div>
        </div>
      `;
      container.appendChild(card);
    });
  }

  function generateForecast() {
    const now = new Date();
    const month = now.getMonth();
    const days = [];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const monthNames = [
      "Jan","Feb","Mar","Apr","May","Jun",
      "Jul","Aug","Sep","Oct","Nov","Dec",
    ];

    // Wakefield MA typical weather by month (avg high, avg low, avg humidity, rain chance)
    const climate = [
      { high: 36, low: 20, hum: 62, rain: 0.35 }, // Jan
      { high: 39, low: 22, hum: 60, rain: 0.33 }, // Feb
      { high: 47, low: 29, hum: 58, rain: 0.35 }, // Mar
      { high: 58, low: 39, hum: 56, rain: 0.33 }, // Apr
      { high: 68, low: 49, hum: 58, rain: 0.35 }, // May
      { high: 77, low: 58, hum: 62, rain: 0.32 }, // Jun
      { high: 83, low: 64, hum: 64, rain: 0.30 }, // Jul
      { high: 81, low: 62, hum: 66, rain: 0.28 }, // Aug
      { high: 73, low: 54, hum: 64, rain: 0.27 }, // Sep
      { high: 62, low: 44, hum: 62, rain: 0.30 }, // Oct
      { high: 51, low: 35, hum: 64, rain: 0.32 }, // Nov
      { high: 40, low: 24, hum: 64, rain: 0.34 }, // Dec
    ];

    for (let i = 0; i < 7; i++) {
      const d = new Date(now.getTime() + i * 86400000);
      const m = d.getMonth();
      const c = climate[m];

      // Add randomness
      const rand = () => (Math.random() - 0.5) * 2;
      const high = Math.round(c.high + rand() * 8);
      const low = Math.round(c.low + rand() * 6);
      const humidity = Math.round(c.hum + rand() * 12);
      const wind = Math.round(5 + Math.random() * 15);
      const isRainy = Math.random() < c.rain;

      // Paintability score calculation
      let score = 100;

      // Temperature: ideal 50-85F
      if (high < 40) score -= 60;
      else if (high < 50) score -= 35;
      else if (high > 90) score -= 30;
      else if (high > 85) score -= 15;

      // Humidity: ideal 40-70%
      if (humidity > 80) score -= 40;
      else if (humidity > 70) score -= 20;
      else if (humidity < 30) score -= 10;

      // Wind: ideal < 15
      if (wind > 25) score -= 35;
      else if (wind > 15) score -= 15;

      // Rain
      if (isRainy) score -= 50;

      // Low temp (paint won't cure below 35F)
      if (low < 35) score -= 20;

      score = Math.max(0, Math.min(100, score));

      days.push({
        dayName: dayNames[d.getDay()],
        date: `${monthNames[m]} ${d.getDate()}`,
        high,
        low,
        humidity,
        wind,
        score,
        rainy: isRainy,
      });
    }
    return days;
  }

  initForecast();

  // ════════════════════════════════════════════
  // 1. COST ESTIMATOR
  // ════════════════════════════════════════════
  const estimator = document.getElementById("estimatorForm");
  if (estimator) {
    const steps = estimator.querySelectorAll(".est-step");
    const indicators = document.querySelectorAll(".step-indicator");
    const prevBtn = document.getElementById("estPrev");
    const nextBtn = document.getElementById("estNext");
    const resultDiv = document.getElementById("estResult");
    let currentStep = 0;

    function showStep(n) {
      steps.forEach((s, i) => {
        s.classList.toggle("active", i === n);
      });
      indicators.forEach((ind, i) => {
        ind.classList.toggle("active", i === n);
        ind.classList.toggle("done", i < n);
      });
      prevBtn.style.display = n === 0 ? "none" : "inline-flex";
      if (n === steps.length - 1) {
        nextBtn.textContent = "Get Estimate";
        nextBtn.innerHTML = "<span>&#9998;</span> Get Estimate";
      } else {
        nextBtn.innerHTML = "Next <span>&#8594;</span>";
      }
    }

    nextBtn.addEventListener("click", () => {
      if (currentStep < steps.length - 1) {
        currentStep++;
        showStep(currentStep);
      } else {
        calculateEstimate();
      }
    });

    prevBtn.addEventListener("click", () => {
      if (currentStep > 0) {
        currentStep--;
        showStep(currentStep);
      }
    });

    function calculateEstimate() {
      const stories = parseInt(
        document.querySelector('input[name="stories"]:checked')?.value || "1"
      );
      const size = document.querySelector(
        'input[name="homeSize"]:checked'
      )?.value || "medium";
      const siding = document.getElementById("sidingType")?.value || "clapboard";
      const condition = document.querySelector(
        'input[name="condition"]:checked'
      )?.value || "good";
      const quality = document.querySelector(
        'input[name="quality"]:checked'
      )?.value || "premium";

      const includesTrim =
        document.getElementById("includeTrim")?.checked || false;
      const includesShutters =
        document.getElementById("includeShutters")?.checked || false;
      const includesDoors =
        document.getElementById("includeDoors")?.checked || false;
      const includesDeck =
        document.getElementById("includeDeck")?.checked || false;

      // Base prices by size
      const sizePrices = {
        small: { low: 2800, high: 4200 },
        medium: { low: 4200, high: 6500 },
        large: { low: 6500, high: 9500 },
        xlarge: { low: 9500, high: 14000 },
      };

      let { low, high } = sizePrices[size];

      // Story multiplier
      if (stories === 2) {
        low *= 1.4;
        high *= 1.4;
      }
      if (stories === 3) {
        low *= 1.8;
        high *= 1.8;
      }

      // Siding multiplier
      const sidingMult = {
        clapboard: 1.0,
        vinyl: 0.85,
        stucco: 1.15,
        brick: 1.2,
        shingle: 1.1,
        wood: 1.05,
      };
      const sm = sidingMult[siding] || 1.0;
      low *= sm;
      high *= sm;

      // Condition multiplier
      const condMult = { good: 1.0, fair: 1.15, poor: 1.35 };
      const cm = condMult[condition] || 1.0;
      low *= cm;
      high *= cm;

      // Quality multiplier
      const qualMult = { standard: 0.85, premium: 1.0, ultra: 1.2 };
      const qm = qualMult[quality] || 1.0;
      low *= qm;
      high *= qm;

      // Add-ons
      if (includesTrim) {
        low += 600;
        high += 1200;
      }
      if (includesShutters) {
        low += 400;
        high += 800;
      }
      if (includesDoors) {
        low += 200;
        high += 500;
      }
      if (includesDeck) {
        low += 800;
        high += 1800;
      }

      low = Math.round(low / 100) * 100;
      high = Math.round(high / 100) * 100;

      // Show result
      estimator.style.display = "none";
      resultDiv.style.display = "block";
      document.getElementById("estLow").textContent = low.toLocaleString();
      document.getElementById("estHigh").textContent = high.toLocaleString();

      // Set details
      const detailsList = document.getElementById("estDetails");
      detailsList.innerHTML = "";
      const details = [
        `${stories}-story ${size} home`,
        `${siding.charAt(0).toUpperCase() + siding.slice(1)} siding`,
        `Condition: ${condition}`,
        `${quality.charAt(0).toUpperCase() + quality.slice(1)} paint quality`,
      ];
      if (includesTrim) details.push("Trim & fascia included");
      if (includesShutters) details.push("Shutters included");
      if (includesDoors) details.push("Doors included");
      if (includesDeck) details.push("Deck/porch included");

      details.forEach((d) => {
        const li = document.createElement("li");
        li.textContent = d;
        detailsList.appendChild(li);
      });
    }

    // Reset estimator
    const estReset = document.getElementById("estReset");
    if (estReset) {
      estReset.addEventListener("click", () => {
        resultDiv.style.display = "none";
        estimator.style.display = "block";
        currentStep = 0;
        showStep(0);
      });
    }

    showStep(0);
  }

  // ════════════════════════════════════════════
  // 2. BEFORE/AFTER SLIDER
  // ════════════════════════════════════════════
  function initBeforeAfter() {
    document.querySelectorAll(".ba-slider").forEach((slider) => {
      const handle = slider.querySelector(".ba-handle");
      const afterImg = slider.querySelector(".ba-after");
      let isDragging = false;

      function setPosition(x) {
        const rect = slider.getBoundingClientRect();
        let pct = ((x - rect.left) / rect.width) * 100;
        pct = Math.max(2, Math.min(98, pct));
        handle.style.left = pct + "%";
        afterImg.style.clipPath = `inset(0 0 0 ${pct}%)`;
      }

      // Initialize at 50%
      handle.style.left = "50%";
      afterImg.style.clipPath = "inset(0 0 0 50%)";

      handle.addEventListener("mousedown", (e) => {
        isDragging = true;
        e.preventDefault();
      });
      handle.addEventListener("touchstart", (e) => {
        isDragging = true;
      });

      window.addEventListener("mousemove", (e) => {
        if (isDragging) setPosition(e.clientX);
      });
      window.addEventListener("touchmove", (e) => {
        if (isDragging) setPosition(e.touches[0].clientX);
      });

      window.addEventListener("mouseup", () => (isDragging = false));
      window.addEventListener("touchend", () => (isDragging = false));

      // Click to jump
      slider.addEventListener("click", (e) => {
        if (e.target !== handle) setPosition(e.clientX);
      });
    });
  }

  // Guess the Color game
  function initGuessGame() {
    const projects = [
      {
        answer: "Repose Gray",
        answerHex: "#B8B3A8",
        options: [
          { name: "Repose Gray", hex: "#B8B3A8" },
          { name: "Mindful Gray", hex: "#ACA89D" },
          { name: "Passive", hex: "#BAB8AF" },
        ],
      },
      {
        answer: "Naval",
        answerHex: "#2E3441",
        options: [
          { name: "Inkwell", hex: "#31363F" },
          { name: "Naval", hex: "#2E3441" },
          { name: "Dark Night", hex: "#3A4651" },
        ],
      },
      {
        answer: "Alabaster",
        answerHex: "#EDEADF",
        options: [
          { name: "Snowbound", hex: "#E8E3D8" },
          { name: "Pure White", hex: "#EDECE4" },
          { name: "Alabaster", hex: "#EDEADF" },
        ],
      },
    ];

    let currentProject = 0;
    let score = 0;
    let answered = 0;

    const gameArea = document.getElementById("guessGame");
    if (!gameArea) return;

    function renderQuestion() {
      if (currentProject >= projects.length) {
        gameArea.innerHTML = `
          <div class="guess-result">
            <h3>You got ${score} out of ${projects.length} correct!</h3>
            <p>${score === projects.length ? "You're a true color expert!" : score >= 2 ? "Great eye for color!" : "Color matching is tricky — that's why we're here to help!"}</p>
            <button class="btn btn-primary" onclick="location.reload()">Play Again</button>
          </div>
        `;
        return;
      }

      const p = projects[currentProject];
      const optionsHtml = p.options
        .map(
          (o) => `
        <button class="guess-option" data-name="${o.name}">
          <span class="guess-swatch" style="background:${o.hex}"></span>
          <span class="guess-label">${o.name}</span>
        </button>
      `
        )
        .join("");

      gameArea.innerHTML = `
        <div class="guess-question">
          <p class="guess-prompt">Question ${currentProject + 1} of ${projects.length}: What Sherwin-Williams color was used?</p>
          <div class="guess-options">${optionsHtml}</div>
          <div class="guess-feedback" id="guessFeedback"></div>
        </div>
      `;

      gameArea.querySelectorAll(".guess-option").forEach((btn) => {
        btn.addEventListener("click", () => {
          const chosen = btn.dataset.name;
          const feedback = document.getElementById("guessFeedback");
          answered++;

          if (chosen === p.answer) {
            score++;
            feedback.innerHTML = `<span class="guess-correct">&#10004; Correct! It's ${p.answer}.</span>`;
            btn.classList.add("correct");
          } else {
            feedback.innerHTML = `<span class="guess-wrong">&#10008; Not quite — it was ${p.answer}!</span>`;
            btn.classList.add("wrong");
            // Highlight correct answer
            gameArea.querySelectorAll(".guess-option").forEach((b) => {
              if (b.dataset.name === p.answer) b.classList.add("correct");
            });
          }

          // Disable all buttons
          gameArea
            .querySelectorAll(".guess-option")
            .forEach((b) => (b.disabled = true));

          setTimeout(() => {
            currentProject++;
            renderQuestion();
          }, 1800);
        });
      });
    }

    renderQuestion();
  }

  initBeforeAfter();
  initGuessGame();

  // ════════════════════════════════════════════
  // 4. ROI CALCULATOR
  // ════════════════════════════════════════════
  const roiCalcBtn = document.getElementById("roiCalculate");
  if (roiCalcBtn) {
    roiCalcBtn.addEventListener("click", () => {
      const homeValue =
        parseInt(
          document.getElementById("roiHomeValue").value.replace(/[^0-9]/g, "")
        ) || 350000;
      const condition =
        document.querySelector('input[name="roiCondition"]:checked')?.value ||
        "fair";
      const yearsSince =
        parseInt(document.getElementById("roiYears").value) || 5;

      // ROI calculation based on research
      // Avg exterior painting cost: ~$3,177-$7,500 depending on home size
      // ROI: 51-152% (we'll use 55-95% conservatively for the range)
      const costLow = Math.round(homeValue * 0.008); // ~0.8% of home value
      const costHigh = Math.round(homeValue * 0.018); // ~1.8% of home value
      const costAvg = Math.round((costLow + costHigh) / 2);

      // Value increase factors
      let roiMultiplier;
      if (condition === "poor") roiMultiplier = 1.52;
      else if (condition === "fair") roiMultiplier = 1.25;
      else roiMultiplier = 0.85;

      // Years factor — older paint = more impact
      if (yearsSince > 10) roiMultiplier *= 1.15;
      else if (yearsSince > 5) roiMultiplier *= 1.05;

      const valueIncreaseLow = Math.round(costLow * roiMultiplier);
      const valueIncreaseHigh = Math.round(costHigh * roiMultiplier);
      const roiPct = Math.round(
        (((valueIncreaseLow + valueIncreaseHigh) / 2 /
          ((costLow + costHigh) / 2)) *
          100 -
          100)
      );

      // Days on market improvement
      const domImprovement = condition === "poor" ? "7-10" : condition === "fair" ? "4-7" : "2-4";

      // Display results
      const resultArea = document.getElementById("roiResult");
      resultArea.style.display = "block";
      document.getElementById("roiValueLow").textContent =
        valueIncreaseLow.toLocaleString();
      document.getElementById("roiValueHigh").textContent =
        valueIncreaseHigh.toLocaleString();
      document.getElementById("roiPct").textContent = roiPct;
      document.getElementById("roiDom").textContent = domImprovement;
      document.getElementById("roiCostRange").textContent =
        `$${costLow.toLocaleString()} - $${costHigh.toLocaleString()}`;

      // Update comparison bars
      const paintROI = Math.min(roiPct, 150);
      document.getElementById("barPaint").style.width =
        Math.min(100, (paintROI / 150) * 100) + "%";
      document.getElementById("barPaintLabel").textContent = roiPct + "% ROI";
      document.getElementById("barKitchen").style.width = "47%";
      document.getElementById("barLandscape").style.width = "60%";
      document.getElementById("barWindows").style.width = "45%";

      resultArea.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    // Format home value input
    const homeValueInput = document.getElementById("roiHomeValue");
    if (homeValueInput) {
      homeValueInput.addEventListener("blur", function () {
        const val = parseInt(this.value.replace(/[^0-9]/g, "")) || 0;
        if (val > 0) {
          this.value = "$" + val.toLocaleString();
        }
      });
      homeValueInput.addEventListener("focus", function () {
        this.value = this.value.replace(/[^0-9]/g, "");
      });
    }
  }

  // ════════════════════════════════════════════
  // 13. INTERACTIVE TIMELINE
  // ════════════════════════════════════════════
  function initTimeline() {
    document.querySelectorAll(".tl-step").forEach((step) => {
      step.addEventListener("click", () => {
        const isOpen = step.classList.contains("open");
        // Close all
        document.querySelectorAll(".tl-step").forEach((s) => s.classList.remove("open"));
        if (!isOpen) step.classList.add("open");
      });
    });
  }
  initTimeline();

  // ════════════════════════════════════════════
  // 14. REFERRAL PROGRAM
  // ════════════════════════════════════════════
  const refForm = document.getElementById("referralForm");
  if (refForm) {
    refForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("refName").value.trim();
      const phone = document.getElementById("refPhone").value.trim();

      if (!name || !phone) return;

      // Generate a simple referral code
      const code =
        name
          .split(" ")[0]
          .toUpperCase()
          .replace(/[^A-Z]/g, "")
          .substring(0, 4) +
        Math.floor(1000 + Math.random() * 9000);

      const resultArea = document.getElementById("refResult");
      document.getElementById("refCode").textContent = code;
      document.getElementById("refLink").textContent =
        `paulspaintingwakefield.com/?ref=${code}`;
      document.getElementById("refShareLink").href =
        `sms:?body=I%20just%20found%20an%20amazing%20painter%20in%20Wakefield!%20Use%20my%20code%20${code}%20for%20%24200%20off.%20paulspaintingwakefield.com`;

      refForm.style.display = "none";
      resultArea.style.display = "block";
    });

    const refReset = document.getElementById("refReset");
    if (refReset) {
      refReset.addEventListener("click", () => {
        document.getElementById("refResult").style.display = "none";
        refForm.style.display = "block";
        refForm.reset();
      });
    }
  }

  // Copy referral code
  const copyBtn = document.getElementById("refCopy");
  if (copyBtn) {
    copyBtn.addEventListener("click", () => {
      const code = document.getElementById("refCode").textContent;
      navigator.clipboard.writeText(code).then(() => {
        copyBtn.textContent = "Copied!";
        setTimeout(() => (copyBtn.textContent = "Copy Code"), 2000);
      });
    });
  }

  // ════════════════════════════════════════════
  // SERVICE BUILDER
  // ════════════════════════════════════════════
  function initServiceBuilder() {
    const checkboxes = document.querySelectorAll('.builder-item input[name="svc"]');
    if (!checkboxes.length) return;

    const itemsList = document.getElementById("builderItemsList");
    const emptyMsg = document.getElementById("builderEmpty");
    const totalsArea = document.getElementById("builderTotals");
    const subtotalEl = document.getElementById("builderSubtotal");
    const discountRow = document.getElementById("builderDiscount");
    const discountPctEl = document.getElementById("builderDiscountPct");
    const discountAmtEl = document.getElementById("builderDiscountAmt");
    const totalEl = document.getElementById("builderTotal");

    function updateBuilder() {
      const selected = [];
      checkboxes.forEach(function (cb) {
        if (cb.checked) {
          selected.push({
            name: cb.dataset.name,
            low: parseInt(cb.dataset.low, 10),
            high: parseInt(cb.dataset.high, 10),
          });
        }
      });

      if (selected.length === 0) {
        emptyMsg.style.display = "block";
        totalsArea.style.display = "none";
        itemsList.innerHTML = "";
        return;
      }

      emptyMsg.style.display = "none";
      totalsArea.style.display = "block";

      // Build line items
      itemsList.innerHTML = selected
        .map(function (s) {
          return (
            '<div class="builder-line-item">' +
            '<span class="builder-line-name">' + s.name + "</span>" +
            '<span class="builder-line-price">$' +
            s.low.toLocaleString() + " - $" + s.high.toLocaleString() +
            "</span></div>"
          );
        })
        .join("");

      // Calculate totals
      var subLow = 0;
      var subHigh = 0;
      selected.forEach(function (s) {
        subLow += s.low;
        subHigh += s.high;
      });

      subtotalEl.textContent =
        "$" + subLow.toLocaleString() + " - $" + subHigh.toLocaleString();

      // Bundle discount: 5% for 2 services, 8% for 3, 10% for 4+
      var discountPct = 0;
      if (selected.length >= 4) discountPct = 10;
      else if (selected.length >= 3) discountPct = 8;
      else if (selected.length >= 2) discountPct = 5;

      if (discountPct > 0) {
        discountRow.style.display = "flex";
        discountPctEl.textContent = discountPct;
        var saveLow = Math.round(subLow * discountPct / 100);
        var saveHigh = Math.round(subHigh * discountPct / 100);
        discountAmtEl.textContent =
          "-$" + saveLow.toLocaleString() + " to -$" + saveHigh.toLocaleString();
        subLow = subLow - saveLow;
        subHigh = subHigh - saveHigh;
      } else {
        discountRow.style.display = "none";
      }

      totalEl.textContent =
        "$" + subLow.toLocaleString() + " - $" + subHigh.toLocaleString();
    }

    checkboxes.forEach(function (cb) {
      cb.addEventListener("change", updateBuilder);
    });
  }
  initServiceBuilder();
})();
