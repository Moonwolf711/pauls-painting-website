// Paul's Painting — Scheduling Calendar with Live Weather
// Uses Open-Meteo API (free, no key) for Wakefield, MA forecast

(function() {
  "use strict";

  var LAT = 42.5064, LON = -71.0756; // Wakefield, MA
  var CACHE_KEY = "pp_cal_weather";
  var CACHE_TTL = 3600000; // 1 hour

  // ──────────────────────────────────────────
  // Paul: Add your booked dates below in 'YYYY-MM-DD' format.
  // Example: "2026-04-15", "2026-04-16"
  // ──────────────────────────────────────────
  var BOOKED_DATES = [];

  var MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  var DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  var state = {
    month: new Date().getMonth(),
    year: new Date().getFullYear(),
    selected: null,
    weather: {}
  };

  var els = {};

  // ── Weather Fetch ──
  function fetchWeather() {
    try {
      var c = sessionStorage.getItem(CACHE_KEY);
      if (c) {
        var p = JSON.parse(c);
        if (Date.now() - p.ts < CACHE_TTL) return Promise.resolve(p.data);
      }
    } catch(e) {}

    var url = "https://api.open-meteo.com/v1/forecast" +
      "?latitude=" + LAT + "&longitude=" + LON +
      "&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,relative_humidity_2m_max,wind_speed_10m_max,weather_code" +
      "&temperature_unit=fahrenheit&wind_speed_unit=mph&forecast_days=16&timezone=America/New_York";

    return fetch(url)
      .then(function(r) { return r.json(); })
      .then(function(json) {
        var result = {};
        json.daily.time.forEach(function(date, i) {
          result[date] = {
            high: Math.round(json.daily.temperature_2m_max[i]),
            low: Math.round(json.daily.temperature_2m_min[i]),
            precip: Math.round(json.daily.precipitation_probability_max[i]),
            humidity: Math.round(json.daily.relative_humidity_2m_max[i]),
            wind: Math.round(json.daily.wind_speed_10m_max[i]),
            code: json.daily.weather_code[i]
          };
        });
        try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data: result, ts: Date.now() })); } catch(e) {}
        return result;
      })
      .catch(function() { return {}; });
  }

  // ── Weather Helpers ──
  function weatherIcon(code) {
    if (code === undefined || code === null) return "";
    if (code <= 1) return "&#9728;&#65039;";
    if (code <= 2) return "&#9925;";
    if (code <= 3) return "&#9729;&#65039;";
    if (code <= 48) return "&#127787;&#65039;";
    if (code <= 67) return "&#127783;&#65039;";
    if (code <= 77) return "&#10052;&#65039;";
    if (code <= 82) return "&#127782;&#65039;";
    return "&#9928;&#65039;";
  }

  function weatherLabel(code) {
    if (code === undefined) return "";
    if (code <= 1) return "Clear";
    if (code <= 2) return "Partly Cloudy";
    if (code <= 3) return "Overcast";
    if (code <= 48) return "Fog";
    if (code <= 67) return "Rain";
    if (code <= 77) return "Snow";
    if (code <= 82) return "Showers";
    return "Storm";
  }

  function paintScore(w) {
    var score = 100;
    if (w.high < 40) score -= 60;
    else if (w.high < 50) score -= 35;
    else if (w.high > 90) score -= 30;
    else if (w.high > 85) score -= 15;
    if (w.humidity > 80) score -= 40;
    else if (w.humidity > 70) score -= 20;
    if (w.wind > 25) score -= 35;
    else if (w.wind > 15) score -= 15;
    if (w.precip > 60) score -= 50;
    else if (w.precip > 30) score -= 25;
    if (w.low < 35) score -= 20;
    return Math.max(0, Math.min(100, score));
  }

  function dateStr(y, m, d) {
    return y + "-" + String(m + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0");
  }

  function formatDateLong(ds) {
    var p = ds.split("-");
    var d = new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]));
    return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  }

  // ── Render Calendar ──
  function render() {
    els.label.textContent = MONTHS[state.month] + " " + state.year;

    var firstDay = new Date(state.year, state.month, 1).getDay();
    var daysInMonth = new Date(state.year, state.month + 1, 0).getDate();
    var today = new Date();
    today.setHours(0, 0, 0, 0);

    // Don't allow navigating to past months
    var thisMonth = new Date();
    var canGoPrev = state.year > thisMonth.getFullYear() ||
      (state.year === thisMonth.getFullYear() && state.month > thisMonth.getMonth());
    els.prev.disabled = !canGoPrev;
    els.prev.style.opacity = canGoPrev ? "1" : "0.3";

    var html = "";

    // Empty cells before first day
    for (var i = 0; i < firstDay; i++) {
      html += '<div class="cal-day cal-day-empty"></div>';
    }

    for (var d = 1; d <= daysInMonth; d++) {
      var ds = dateStr(state.year, state.month, d);
      var date = new Date(state.year, state.month, d);
      var isPast = date < today;
      var isToday = date.getTime() === today.getTime();
      var isBooked = BOOKED_DATES.indexOf(ds) !== -1;
      var isSelected = state.selected === ds;
      var isSunday = date.getDay() === 0;
      var w = state.weather[ds];

      var cls = "cal-day";
      if (isPast) cls += " cal-day-past";
      if (isToday) cls += " cal-day-today";
      if (isBooked) cls += " cal-day-booked";
      if (isSelected) cls += " cal-day-selected";
      if (isSunday && !isPast) cls += " cal-day-off";

      var score = -1;
      if (w && !isPast && !isSunday) {
        score = paintScore(w);
        if (score >= 70) cls += " cal-day-ideal";
        else if (score >= 40) cls += " cal-day-possible";
        else cls += " cal-day-poor";
      }

      var clickable = !isPast && !isBooked && !isSunday;

      html += '<div class="' + cls + '"' +
        (clickable ? ' data-date="' + ds + '" tabindex="0" role="button"' : '') + '>';
      html += '<span class="cal-day-num">' + d + '</span>';

      if (isBooked) {
        html += '<span class="cal-day-tag">Booked</span>';
      } else if (isSunday && !isPast) {
        html += '<span class="cal-day-tag cal-tag-off">Closed</span>';
      } else if (w && !isPast) {
        html += '<span class="cal-day-icon">' + weatherIcon(w.code) + '</span>';
        html += '<span class="cal-day-temp">' + w.high + '&deg;</span>';
      }

      html += '</div>';
    }

    els.grid.innerHTML = html;

    // Click handlers
    els.grid.querySelectorAll(".cal-day[data-date]").forEach(function(cell) {
      cell.addEventListener("click", function() { selectDate(cell.dataset.date); });
      cell.addEventListener("keydown", function(e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectDate(cell.dataset.date); }
      });
    });
  }

  // ── Select Date ──
  function selectDate(ds) {
    state.selected = ds;

    // Update highlight
    els.grid.querySelectorAll(".cal-day-selected").forEach(function(el) {
      el.classList.remove("cal-day-selected");
    });
    var cell = els.grid.querySelector('[data-date="' + ds + '"]');
    if (cell) cell.classList.add("cal-day-selected");

    // Show booking form
    els.empty.style.display = "none";
    els.formWrap.style.display = "block";
    els.selectedDate.textContent = formatDateLong(ds);
    els.formDate.value = ds;

    // Weather summary
    var w = state.weather[ds];
    if (w) {
      var score = paintScore(w);
      var status = score >= 70 ? "Ideal" : score >= 40 ? "Possible" : "Not Ideal";
      var statusCls = score >= 70 ? "ideal" : score >= 40 ? "possible" : "poor";

      els.dateWeather.innerHTML =
        '<div class="cal-wx-row">' +
          '<span class="cal-wx-icon">' + weatherIcon(w.code) + '</span>' +
          '<div class="cal-wx-info">' +
            '<strong>' + weatherLabel(w.code) + ' &middot; ' + w.high + '&deg;F / ' + w.low + '&deg;F</strong>' +
            '<span>Humidity ' + w.humidity + '% &middot; Wind ' + w.wind + ' mph &middot; Rain ' + w.precip + '%</span>' +
          '</div>' +
          '<span class="cal-wx-badge cal-badge-' + statusCls + '">Paint Score: ' + score + '</span>' +
        '</div>';
      els.dateWeather.style.display = "block";
    } else {
      els.dateWeather.innerHTML = '<p class="cal-no-wx">Weather forecast available within 16 days of this date.</p>';
      els.dateWeather.style.display = "block";
    }

    // Reset deposit visibility
    updateDepositVisibility();

    // Scroll on mobile
    if (window.innerWidth < 900) {
      els.formWrap.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function updateDepositVisibility() {
    var checked = document.querySelector('input[name="booking-type"]:checked');
    if (checked && els.depositInfo) {
      els.depositInfo.style.display = checked.value === "job-start" ? "block" : "none";
    }
  }

  // ── Init ──
  function init() {
    els.grid = document.getElementById("calendarGrid");
    els.label = document.getElementById("calMonthLabel");
    els.prev = document.getElementById("calPrev");
    els.next = document.getElementById("calNext");
    els.empty = document.getElementById("bookingEmpty");
    els.formWrap = document.getElementById("bookingFormWrap");
    els.selectedDate = document.getElementById("selectedDateDisplay");
    els.dateWeather = document.getElementById("dateWeather");
    els.formDate = document.getElementById("formDate");
    els.depositInfo = document.getElementById("depositInfo");
    els.form = document.getElementById("scheduleForm");

    if (!els.grid) return;

    // Month nav
    els.prev.addEventListener("click", function() {
      state.month--;
      if (state.month < 0) { state.month = 11; state.year--; }
      render();
    });
    els.next.addEventListener("click", function() {
      state.month++;
      if (state.month > 11) { state.month = 0; state.year++; }
      render();
    });

    // Booking type toggle
    document.querySelectorAll('input[name="booking-type"]').forEach(function(r) {
      r.addEventListener("change", updateDepositVisibility);
    });

    // Form submission
    if (els.form) {
      els.form.addEventListener("submit", function(e) {
        e.preventDefault();
        var fd = new FormData(els.form);
        var name = fd.get("name") || "there";
        var btype = fd.get("booking-type") === "job-start" ? "job start" : "on-site quote";
        var bdate = formatDateLong(fd.get("selected-date") || "");

        // Submit to Netlify Forms
        fetch("/", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams(fd).toString()
        }).then(function() {
          showConfirmation(name, btype, bdate, fd);
        }).catch(function() {
          showConfirmation(name, btype, bdate, fd);
        });
      });
    }

    // Fetch weather then render
    fetchWeather().then(function(data) {
      state.weather = data;
      render();
    });
  }

  function showConfirmation(name, btype, bdate, fd) {
    var isJob = fd.get("booking-type") === "job-start";
    var depositHtml = isJob ?
      '<div class="cal-deposit-confirm">' +
        '<p>A $500 deposit holds your start date. Call to pay by phone or card:</p>' +
        '<a href="tel:7812541192" class="btn btn-gold btn-lg btn-full" style="margin-top:12px">' +
          '<span>&#9742;</span> Pay Deposit — 781-254-1192</a>' +
      '</div>' : '';

    // Google Calendar link
    var dateVal = fd.get("selected-date") || "";
    var gcalDate = dateVal.replace(/-/g, "");
    var gcalUrl = "https://calendar.google.com/calendar/render?action=TEMPLATE" +
      "&text=" + encodeURIComponent("Paul's Painting — " + (isJob ? "Job Start" : "Quote") + ": " + name) +
      "&dates=" + gcalDate + "T090000/" + gcalDate + "T100000" +
      "&details=" + encodeURIComponent("Client: " + name + "\nPhone: " + (fd.get("phone") || "") + "\nType: " + btype) +
      "&location=" + encodeURIComponent("Wakefield, MA");

    els.formWrap.innerHTML =
      '<div class="cal-success">' +
        '<div class="cal-success-icon">&#10004;</div>' +
        '<h3>Request Received!</h3>' +
        '<p>Thanks <strong>' + name + '</strong>! Paul will confirm your <strong>' + btype +
          '</strong> for <strong>' + bdate + '</strong> within 24 hours.</p>' +
        depositHtml +
        '<a href="' + gcalUrl + '" target="_blank" rel="noopener" class="btn btn-outline btn-full" style="margin-top:12px">' +
          '&#128197; Add to Google Calendar</a>' +
        '<a href="tel:7812541192" class="btn btn-primary btn-full" style="margin-top:8px">' +
          '<span>&#9742;</span> Call for Faster Confirmation</a>' +
      '</div>';
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
