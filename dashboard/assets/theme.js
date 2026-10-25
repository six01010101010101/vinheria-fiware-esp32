/* ==========================================================================
   Gerenciador de Temas Client-side (Claro, Escuro e Sistema / Auto)
   Vinheria Agnello — FIWARE & ESP32 Wokwi
   ========================================================================== */

(function () {
  function getSystemTheme() {
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  function updateButtons(preference) {
    var btns = ["light", "dark", "system"];
    btns.forEach(function (t) {
      var btn = document.getElementById("theme-btn-" + t);
      if (btn) {
        if (t === preference) {
          btn.classList.add("active", "btn-wine");
        } else {
          btn.classList.remove("active", "btn-wine");
        }
      }
    });
  }

  function applyTheme(preference, userClicked) {
    var isSystem = preference === "system";
    var effectiveTheme = isSystem ? getSystemTheme() : preference;
    document.documentElement.setAttribute("data-bs-theme", effectiveTheme);
    document.documentElement.setAttribute("data-theme", effectiveTheme);
    document.documentElement.setAttribute("data-theme-mode", preference);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content", effectiveTheme === "dark" ? "#09090b" : "#f5f4f6");
    }
    localStorage.setItem("vinheria_theme", preference);
    localStorage.setItem("portal_theme", effectiveTheme);
    updateButtons(preference);
    if (userClicked && window.arcadeAudio && window.arcadeAudio.playThemeSwitch) {
      window.arcadeAudio.playThemeSwitch(preference);
    }
    try {
      window.dispatchEvent(new CustomEvent("themeChanged", { detail: { preference: preference, effectiveTheme: effectiveTheme } }));
    } catch (_) {}
  }

  window.setDashboardTheme = function (theme) {
    applyTheme(theme, true);
  };

  document.addEventListener("click", function (e) {
    var btn = e.target.closest("button");
    if (!btn || !btn.id) return;
    if (btn.id === "theme-btn-light") applyTheme("light", true);
    else if (btn.id === "theme-btn-dark") applyTheme("dark", true);
    else if (btn.id === "theme-btn-system") applyTheme("system", true);
  });

  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () {
      var current = localStorage.getItem("vinheria_theme") || "dark";
      if (current === "system") {
        applyTheme("system", false);
      }
    });
  }

  var saved = localStorage.getItem("vinheria_theme") || "dark";
  applyTheme(saved, false);

  document.addEventListener("DOMContentLoaded", function () {
    var pref = localStorage.getItem("vinheria_theme") || "dark";
    applyTheme(pref, false);
  });

  setInterval(function () {
    var pref = localStorage.getItem("vinheria_theme") || "dark";
    updateButtons(pref);
  }, 1000);
})();
