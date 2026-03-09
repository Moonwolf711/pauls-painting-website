// Shared navigation for all pages
(function() {
  var navToggle = document.getElementById("navToggle");
  var navLinks = document.getElementById("navLinks");
  if (navToggle && navLinks) {
    navToggle.addEventListener("click", function() {
      navLinks.classList.toggle("open");
      navToggle.classList.toggle("active");
    });
    document.querySelectorAll(".nav-links a").forEach(function(link) {
      link.addEventListener("click", function() {
        navLinks.classList.remove("open");
        navToggle.classList.remove("active");
      });
    });
  }
})();
