/* ==========================================================================
   Gerenciador de Temas Client-side (Claro, Escuro e Sistema)
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

  function applyTheme(preference) {
    var effectiveTheme = preference === "system" ? getSystemTheme() : preference;
    document.documentElement.setAttribute("data-bs-theme", effectiveTheme);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content", effectiveTheme === "dark" ? "#110d0e" : "#f7f4ee");
    }
    localStorage.setItem("vinheria_theme", preference);
    updateButtons(preference);
  }

  window.setDashboardTheme = function (theme) {
    applyTheme(theme);
  };

  // Event delegation instantâneo nos botões de tema
  document.addEventListener("click", function (e) {
    var btn = e.target.closest("button");
    if (!btn || !btn.id) return;
    if (btn.id === "theme-btn-light") applyTheme("light");
    else if (btn.id === "theme-btn-dark") applyTheme("dark");
    else if (btn.id === "theme-btn-system") applyTheme("system");
  });

  // Ouve mudanças do sistema operacional se configurado para "system"
  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () {
      var current = localStorage.getItem("vinheria_theme") || "system";
      if (current === "system") {
        applyTheme("system");
      }
    });
  }

  // Inicializa tema salvo
  var saved = localStorage.getItem("vinheria_theme") || "system";
  applyTheme(saved);

  // Sincroniza botões no carregamento do DOM e revalida
  document.addEventListener("DOMContentLoaded", function () {
    var pref = localStorage.getItem("vinheria_theme") || "system";
    applyTheme(pref);
  });

  setInterval(function () {
    var pref = localStorage.getItem("vinheria_theme") || "system";
    updateButtons(pref);
  }, 1000);
})();

