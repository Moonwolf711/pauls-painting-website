// Paul's Painting - Website Application
// Color Visualizer with Sherwin-Williams palette

(function () {
  "use strict";

  // ── Navigation ──
  const navbar = document.getElementById("navbar");
  const navToggle = document.getElementById("navToggle");
  const navLinks = document.getElementById("navLinks");

  window.addEventListener("scroll", () => {
    navbar.classList.toggle("scrolled", window.scrollY > 50);
  });

  navToggle.addEventListener("click", () => {
    navLinks.classList.toggle("open");
    navToggle.classList.toggle("active");
  });

  document.querySelectorAll(".nav-links a").forEach((link) => {
    link.addEventListener("click", () => {
      navLinks.classList.remove("open");
      navToggle.classList.remove("active");
    });
  });

  // ── Contact Form ──
  const contactForm = document.getElementById("contactForm");
  contactForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("formName").value;
    const phone = document.getElementById("formPhone").value;
    const email = document.getElementById("formEmail").value;
    const service = document.getElementById("formService").value;
    const message = document.getElementById("formMessage").value;

    // Build mailto or show confirmation
    const subject = encodeURIComponent(
      `Painting Estimate Request from ${name}`
    );
    const body = encodeURIComponent(
      `Name: ${name}\nPhone: ${phone}\nEmail: ${email}\nService: ${service}\n\nMessage:\n${message}`
    );

    // Show a confirmation message
    const formEl = contactForm;
    formEl.innerHTML = `
      <div class="form-success">
        <div class="success-icon">&#10004;</div>
        <h3>Thank You, ${name}!</h3>
        <p>Your request has been received. For the fastest response, give us a call:</p>
        <a href="tel:7812541192" class="btn btn-primary btn-lg"><span>&#9742;</span> 781-254-1192</a>
        <p class="form-note" style="margin-top:1rem;">We'll review your request and get back to you within 24 hours.</p>
      </div>
    `;
  });

  // ── Color Visualizer ──

  // DOM refs
  const uploadArea = document.getElementById("uploadArea");
  const editorArea = document.getElementById("editorArea");
  const fileInput = document.getElementById("fileInput");
  const cameraInput = document.getElementById("cameraInput");
  const mainCanvas = document.getElementById("mainCanvas");
  const canvasContainer = document.getElementById("canvasContainer");
  const canvasInstructions = document.getElementById("canvasInstructions");
  const colorGrid = document.getElementById("colorGrid");
  const colorSearch = document.getElementById("colorSearch");
  const colorCategories = document.getElementById("colorCategories");
  const selectedSwatch = document.getElementById("selectedSwatch");
  const selectedName = document.getElementById("selectedName");
  const selectedCode = document.getElementById("selectedCode");
  const toleranceSlider = document.getElementById("toleranceSlider");
  const btnUndo = document.getElementById("btnUndo");
  const btnReset = document.getElementById("btnReset");
  const btnNewPhoto = document.getElementById("btnNewPhoto");
  const btnDownload = document.getElementById("btnDownload");

  const ctx = mainCanvas.getContext("2d", { willReadFrequently: true });

  let originalImageData = null;
  let historyStack = [];
  let currentColor = null;
  let activeCategory = "all";
  let searchTerm = "";

  // ── Build Color Palette ──
  function renderColors() {
    colorGrid.innerHTML = "";
    const filtered = SW_COLORS.filter((c) => {
      const matchCat = activeCategory === "all" || c.category === activeCategory;
      const matchSearch =
        !searchTerm ||
        c.name.toLowerCase().includes(searchTerm) ||
        c.code.toLowerCase().includes(searchTerm);
      return matchCat && matchSearch;
    });

    filtered.forEach((color) => {
      const swatch = document.createElement("button");
      swatch.className =
        "color-swatch" +
        (currentColor && currentColor.code === color.code ? " active" : "");
      swatch.style.backgroundColor = color.hex;
      swatch.title = `${color.name} (${color.code})`;
      swatch.setAttribute("data-code", color.code);

      // Determine text color for readability
      const brightness = hexBrightness(color.hex);
      swatch.style.color = brightness > 140 ? "#333" : "#fff";
      swatch.innerHTML = `<span class="swatch-name">${color.name}</span>`;

      swatch.addEventListener("click", () => selectColor(color));
      colorGrid.appendChild(swatch);
    });
  }

  function selectColor(color) {
    currentColor = color;
    selectedSwatch.style.backgroundColor = color.hex;
    selectedName.textContent = color.name;
    selectedCode.textContent = color.code;
    renderColors(); // update active state
  }

  // Category buttons
  colorCategories.addEventListener("click", (e) => {
    if (!e.target.classList.contains("cat-btn")) return;
    document
      .querySelectorAll(".cat-btn")
      .forEach((b) => b.classList.remove("active"));
    e.target.classList.add("active");
    activeCategory = e.target.dataset.category;
    renderColors();
  });

  // Search
  colorSearch.addEventListener("input", (e) => {
    searchTerm = e.target.value.toLowerCase().trim();
    renderColors();
  });

  // Initialize palette
  renderColors();

  // ── Image Upload ──
  function handleFile(file) {
    if (!file || !file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Size canvas to fit container while maintaining aspect ratio
        const maxW = canvasContainer.clientWidth || 800;
        const maxH = 600;
        let w = img.width;
        let h = img.height;
        if (w > maxW) {
          h = (maxW / w) * h;
          w = maxW;
        }
        if (h > maxH) {
          w = (maxH / h) * w;
          h = maxH;
        }
        w = Math.round(w);
        h = Math.round(h);

        mainCanvas.width = w;
        mainCanvas.height = h;
        ctx.drawImage(img, 0, 0, w, h);

        originalImageData = ctx.getImageData(0, 0, w, h);
        historyStack = [];

        uploadArea.style.display = "none";
        editorArea.style.display = "block";
        canvasInstructions.style.display = "block";

        // Select a default color
        if (!currentColor) {
          selectColor(SW_COLORS[0]);
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  fileInput.addEventListener("change", (e) => {
    if (e.target.files[0]) handleFile(e.target.files[0]);
  });

  cameraInput.addEventListener("change", (e) => {
    if (e.target.files[0]) handleFile(e.target.files[0]);
  });

  // Drag and drop
  uploadArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadArea.classList.add("drag-over");
  });
  uploadArea.addEventListener("dragleave", () => {
    uploadArea.classList.remove("drag-over");
  });
  uploadArea.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadArea.classList.remove("drag-over");
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });

  // ── Canvas Click — Flood Fill with Color Blend ──
  mainCanvas.addEventListener("click", (e) => {
    if (!currentColor) {
      alert("Please select a color from the palette first.");
      return;
    }
    canvasInstructions.style.display = "none";

    const rect = mainCanvas.getBoundingClientRect();
    const scaleX = mainCanvas.width / rect.width;
    const scaleY = mainCanvas.height / rect.height;
    const x = Math.round((e.clientX - rect.left) * scaleX);
    const y = Math.round((e.clientY - rect.top) * scaleY);

    // Save state for undo
    historyStack.push(ctx.getImageData(0, 0, mainCanvas.width, mainCanvas.height));

    const tolerance = parseInt(toleranceSlider.value, 10);
    const targetHex = currentColor.hex;
    const targetRGB = hexToRGB(targetHex);

    floodFillBlend(x, y, targetRGB, tolerance);
  });

  // ── Flood Fill with Luminance-Preserving Blend ──
  function floodFillBlend(startX, startY, newColor, tolerance) {
    const w = mainCanvas.width;
    const h = mainCanvas.height;
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    const visited = new Uint8Array(w * h);

    const startIdx = (startY * w + startX) * 4;
    const startR = data[startIdx];
    const startG = data[startIdx + 1];
    const startB = data[startIdx + 2];

    const stack = [[startX, startY]];
    const blendStrength = 0.65; // Blend factor to keep texture visible

    while (stack.length > 0) {
      const [cx, cy] = stack.pop();
      if (cx < 0 || cx >= w || cy < 0 || cy >= h) continue;

      const pi = cy * w + cx;
      if (visited[pi]) continue;
      visited[pi] = 1;

      const idx = pi * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      const diff = colorDiff(r, g, b, startR, startG, startB);
      if (diff > tolerance) continue;

      // Luminance-preserving blend: keep original brightness, apply new hue
      const origLum = 0.299 * r + 0.587 * g + 0.114 * b;
      const newLum =
        0.299 * newColor.r + 0.587 * newColor.g + 0.114 * newColor.b;
      const lumRatio = newLum > 0 ? origLum / newLum : 1;

      let blendR = newColor.r * lumRatio;
      let blendG = newColor.g * lumRatio;
      let blendB = newColor.b * lumRatio;

      // Clamp
      blendR = Math.min(255, Math.max(0, blendR));
      blendG = Math.min(255, Math.max(0, blendG));
      blendB = Math.min(255, Math.max(0, blendB));

      // Mix with original to preserve texture
      data[idx] = Math.round(r * (1 - blendStrength) + blendR * blendStrength);
      data[idx + 1] = Math.round(
        g * (1 - blendStrength) + blendG * blendStrength
      );
      data[idx + 2] = Math.round(
        b * (1 - blendStrength) + blendB * blendStrength
      );

      // Spread to neighbors
      stack.push([cx + 1, cy]);
      stack.push([cx - 1, cy]);
      stack.push([cx, cy + 1]);
      stack.push([cx, cy - 1]);
    }

    ctx.putImageData(imageData, 0, 0);
  }

  function colorDiff(r1, g1, b1, r2, g2, b2) {
    return Math.sqrt(
      (r1 - r2) * (r1 - r2) + (g1 - g2) * (g1 - g2) + (b1 - b2) * (b1 - b2)
    );
  }

  // ── Undo ──
  btnUndo.addEventListener("click", () => {
    if (historyStack.length > 0) {
      const prev = historyStack.pop();
      ctx.putImageData(prev, 0, 0);
    }
  });

  // ── Reset ──
  btnReset.addEventListener("click", () => {
    if (originalImageData) {
      ctx.putImageData(originalImageData, 0, 0);
      historyStack = [];
    }
  });

  // ── New Photo ──
  btnNewPhoto.addEventListener("click", () => {
    editorArea.style.display = "none";
    uploadArea.style.display = "flex";
    historyStack = [];
    originalImageData = null;
    fileInput.value = "";
    cameraInput.value = "";
  });

  // ── Download ──
  btnDownload.addEventListener("click", () => {
    const link = document.createElement("a");
    link.download = "pauls-painting-preview.png";
    link.href = mainCanvas.toDataURL("image/png");
    link.click();
  });

  // ── Utility ──
  function hexToRGB(hex) {
    hex = hex.replace("#", "");
    return {
      r: parseInt(hex.substring(0, 2), 16),
      g: parseInt(hex.substring(2, 4), 16),
      b: parseInt(hex.substring(4, 6), 16),
    };
  }

  function hexBrightness(hex) {
    const rgb = hexToRGB(hex);
    return 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
  }

  // ── Smooth Scroll ──
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute("href"));
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });
})();
