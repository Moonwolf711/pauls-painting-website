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
  // 8. PAINTABILITY FORECAST (Live Open-Meteo)
  // ════════════════════════════════════════════
  function initForecast() {
    var container = document.getElementById("forecastGrid");
    if (!container) return;

    var countEl = document.getElementById("idealDaysCount");
    var dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    var monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

    // Calculate remaining ideal days in the season
    var now = new Date();
    var seasonEnd = new Date(now.getFullYear(), 9, 31);
    var seasonStart = new Date(now.getFullYear(), 4, 1);
    var remainingIdeal = 0;
    if (now < seasonStart) { remainingIdeal = 120; }
    else if (now > seasonEnd) { remainingIdeal = 0; }
    else { remainingIdeal = Math.round(Math.ceil((seasonEnd - now) / 86400000) * 0.65); }
    if (countEl) countEl.textContent = remainingIdeal;

    function paintScore(high, low, humidity, wind, precip) {
      var score = 100;
      if (high < 40) score -= 60;
      else if (high < 50) score -= 35;
      else if (high > 90) score -= 30;
      else if (high > 85) score -= 15;
      if (humidity > 80) score -= 40;
      else if (humidity > 70) score -= 20;
      if (wind > 25) score -= 35;
      else if (wind > 15) score -= 15;
      if (precip > 60) score -= 50;
      else if (precip > 30) score -= 25;
      if (low < 35) score -= 20;
      return Math.max(0, Math.min(100, score));
    }

    function renderCards(days) {
      days.forEach(function(day) {
        var card = document.createElement("div");
        card.className = "forecast-card";
        var status, statusClass, icon;
        if (day.score >= 70) { status = "Ideal"; statusClass = "ideal"; icon = "&#9728;&#65039;"; }
        else if (day.score >= 40) { status = "Possible"; statusClass = "possible"; icon = "&#9925;"; }
        else { status = "Not Ideal"; statusClass = "poor"; icon = "&#127783;&#65039;"; }
        card.innerHTML =
          '<div class="forecast-day">' + day.dayName + '</div>' +
          '<div class="forecast-date">' + day.date + '</div>' +
          '<div class="forecast-icon">' + icon + '</div>' +
          '<div class="forecast-temp">' + day.high + '&deg;F / ' + day.low + '&deg;F</div>' +
          '<div class="forecast-detail">Humidity: ' + day.humidity + '%</div>' +
          '<div class="forecast-detail">Wind: ' + day.wind + ' mph</div>' +
          '<div class="forecast-status ' + statusClass + '">' + status + '</div>' +
          '<div class="forecast-score-bar"><div class="forecast-score-fill ' + statusClass + '" style="width:' + day.score + '%"></div></div>';
        container.appendChild(card);
      });
    }

    // Fetch real weather from Open-Meteo
    var cacheKey = "pp_forecast_weather";
    var cacheTTL = 3600000;
    var cached = null;
    try {
      var c = sessionStorage.getItem(cacheKey);
      if (c) {
        var p = JSON.parse(c);
        if (Date.now() - p.ts < cacheTTL) cached = p.data;
      }
    } catch(e) {}

    if (cached) {
      renderCards(cached);
      return;
    }

    var url = "https://api.open-meteo.com/v1/forecast" +
      "?latitude=42.5064&longitude=-71.0756" +
      "&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,relative_humidity_2m_max,wind_speed_10m_max" +
      "&temperature_unit=fahrenheit&wind_speed_unit=mph&forecast_days=7&timezone=America/New_York";

    fetch(url)
      .then(function(r) { return r.json(); })
      .then(function(json) {
        var days = [];
        json.daily.time.forEach(function(dateStr, i) {
          var parts = dateStr.split("-");
          var d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
          var high = Math.round(json.daily.temperature_2m_max[i]);
          var low = Math.round(json.daily.temperature_2m_min[i]);
          var humidity = Math.round(json.daily.relative_humidity_2m_max[i]);
          var wind = Math.round(json.daily.wind_speed_10m_max[i]);
          var precip = Math.round(json.daily.precipitation_probability_max[i]);
          days.push({
            dayName: dayNames[d.getDay()],
            date: monthNames[d.getMonth()] + " " + d.getDate(),
            high: high, low: low, humidity: humidity, wind: wind,
            score: paintScore(high, low, humidity, wind, precip)
          });
        });
        try { sessionStorage.setItem(cacheKey, JSON.stringify({ data: days, ts: Date.now() })); } catch(e) {}
        renderCards(days);
      })
      .catch(function() {
        container.innerHTML = '<p style="text-align:center;color:rgba(255,255,255,0.7);grid-column:1/-1">Weather data unavailable. <a href="tel:7812541192" style="color:#C4923A">Call for scheduling info.</a></p>';
      });
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
