/*
Copyright (c) 2025 Avdesh Jadon (LoanManager)
All Rights Reserved.
Proprietary and Confidential – Unauthorized copying, modification, or distribution of this file,
via any medium, is strictly prohibited without prior written consent from Avdesh Jadon.
*/

document.addEventListener("DOMContentLoaded", () => {
  const changeThemeBtn = document.getElementById("change-theme-btn");
  const themeModal = document.getElementById("theme-modal");
  const lightThemesGrid = document.getElementById("light-themes-grid");
  const darkThemesGrid = document.getElementById("dark-themes-grid");

  if (!changeThemeBtn || !themeModal) return;

  const themes = [
    {
      name: "Default",
      light: {
        id: "default",
        colors: { p: "#4a55a2", s: "#6d28d9", bm: "#f1f5f9", bc: "#ffffff" },
      },
      dark: {
        id: "dark",
        colors: { p: "#818cf8", s: "#a78bfa", bm: "#0f172a", bc: "#1e293b" },
      },
    },
    {
      name: "Midnight Sapphire",
      light: {
        id: "midnight-sapphire",
        colors: { p: "#1e40af", s: "#3730a3", bm: "#f8fafc", bc: "#ffffff" },
      },
      dark: {
        id: "midnight-sapphire-dark",
        colors: { p: "#60a5fa", s: "#818cf8", bm: "#0f172a", bc: "#1e293b" },
      },
    },
    {
      name: "Crimson Blaze",
      light: {
        id: "crimson-blaze",
        colors: { p: "#dc2626", s: "#b91c1c", bm: "#fef2f2", bc: "#ffffff" },
      },
      dark: {
        id: "crimson-blaze-dark",
        colors: { p: "#f87171", s: "#ef4444", bm: "#450a0a", bc: "#7f1d1d" },
      },
    },
    {
      name: "Emerald Oasis",
      light: {
        id: "emerald-oasis",
        colors: { p: "#059669", s: "#047857", bm: "#f0fdf4", bc: "#ffffff" },
      },
      dark: {
        id: "emerald-oasis-dark",
        colors: { p: "#34d399", s: "#10b981", bm: "#052e16", bc: "#064e3b" },
      },
    },
    {
      name: "Royal Amethyst",
      light: {
        id: "royal-amethyst",
        colors: { p: "#7c3aed", s: "#6d28d9", bm: "#faf5ff", bc: "#ffffff" },
      },
      dark: {
        id: "royal-amethyst-dark",
        colors: { p: "#a78bfa", s: "#8b5cf6", bm: "#1e1b4b", bc: "#312e81" },
      },
    },
    {
      name: "Sunset Orange",
      light: {
        id: "sunset-orange",
        colors: { p: "#ea580c", s: "#c2410c", bm: "#fff7ed", bc: "#ffffff" },
      },
      dark: {
        id: "sunset-orange-dark",
        colors: { p: "#fb923c", s: "#f97316", bm: "#431407", bc: "#7c2d12" },
      },
    },
    {
      name: "Ocean Teal",
      light: {
        id: "ocean-teal",
        colors: { p: "#0d9488", s: "#0f766e", bm: "#f0fdfa", bc: "#ffffff" },
      },
      dark: {
        id: "ocean-teal-dark",
        colors: { p: "#2dd4bf", s: "#14b8a6", bm: "#042f2e", bc: "#115e59" },
      },
    },
    {
      name: "Violet Dream",
      light: {
        id: "violet-dream",
        colors: { p: "#8b5cf6", s: "#7c3aed", bm: "#faf5ff", bc: "#ffffff" },
      },
      dark: {
        id: "violet-dream-dark",
        colors: { p: "#c4b5fd", s: "#a78bfa", bm: "#1e1b4b", bc: "#312e81" },
      },
    },
    {
      name: "Forest Green",
      light: {
        id: "forest-green",
        colors: { p: "#166534", s: "#15803d", bm: "#f0fdf4", bc: "#ffffff" },
      },
      dark: {
        id: "forest-green-dark",
        colors: { p: "#22c55e", s: "#16a34a", bm: "#052e16", bc: "#14532d" },
      },
    },
    {
      name: "Sky Blue",
      light: {
        id: "sky-blue",
        colors: { p: "#0284c7", s: "#0369a1", bm: "#f0f9ff", bc: "#ffffff" },
      },
      dark: {
        id: "sky-blue-dark",
        colors: { p: "#38bdf8", s: "#0ea5e9", bm: "#082f49", bc: "#0c4a6e" },
      },
    },
    {
      name: "Rose Gold",
      light: {
        id: "rose-gold",
        colors: { p: "#be185d", s: "#9d174d", bm: "#fff1f2", bc: "#ffffff" },
      },
      dark: {
        id: "rose-gold-dark",
        colors: { p: "#f472b6", s: "#ec4899", bm: "#4c0519", bc: "#831843" },
      },
    },
    {
      name: "Bronze Age",
      light: {
        id: "bronze-age",
        colors: { p: "#92400e", s: "#78350f", bm: "#fef7ed", bc: "#ffffff" },
      },
      dark: {
        id: "bronze-age-dark",
        colors: { p: "#f59e0b", s: "#d97706", bm: "#451a03", bc: "#78350f" },
      },
    },
    {
      name: "Deep Ocean",
      light: {
        id: "deep-ocean",
        colors: { p: "#1e3a8a", s: "#1e40af", bm: "#eff6ff", bc: "#ffffff" },
      },
      dark: {
        id: "deep-ocean-dark",
        colors: { p: "#60a5fa", s: "#3b82f6", bm: "#0f172a", bc: "#1e3a8a" },
      },
    },
    {
      name: "Lavender Mist",
      light: {
        id: "lavender-mist",
        colors: { p: "#7e22ce", s: "#6b21a8", bm: "#faf5ff", bc: "#ffffff" },
      },
      dark: {
        id: "lavender-mist-dark",
        colors: { p: "#c084fc", s: "#a855f7", bm: "#3b0764", bc: "#581c87" },
      },
    },
    {
      name: "Moss Green",
      light: {
        id: "moss-green",
        colors: { p: "#3f6212", s: "#4d7c0f", bm: "#f7fee7", bc: "#ffffff" },
      },
      dark: {
        id: "moss-green-dark",
        colors: { p: "#84cc16", s: "#65a30d", bm: "#1a2e05", bc: "#365314" },
      },
    },
    {
      name: "Cherry Blossom",
      light: {
        id: "cherry-blossom",
        colors: { p: "#be123c", s: "#9f1239", bm: "#fff1f2", bc: "#ffffff" },
      },
      dark: {
        id: "cherry-blossom-dark",
        colors: { p: "#fb7185", s: "#f43f5e", bm: "#4c0519", bc: "#831843" },
      },
    },
    {
      name: "Desert Sand",
      light: {
        id: "desert-sand",
        colors: { p: "#a16207", s: "#854d0e", bm: "#fefce8", bc: "#ffffff" },
      },
      dark: {
        id: "desert-sand-dark",
        colors: { p: "#eab308", s: "#ca8a04", bm: "#422006", bc: "#713f12" },
      },
    },
    {
      name: "Arctic Blue",
      light: {
        id: "arctic-blue",
        colors: { p: "#0ea5e9", s: "#0284c7", bm: "#f0f9ff", bc: "#ffffff" },
      },
      dark: {
        id: "arctic-blue-dark",
        colors: { p: "#7dd3fc", s: "#38bdf8", bm: "#082f49", bc: "#0c4a6e" },
      },
    },
    {
      name: "Plum Purple",
      light: {
        id: "plum-purple",
        colors: { p: "#6b21a8", s: "#581c87", bm: "#faf5ff", bc: "#ffffff" },
      },
      dark: {
        id: "plum-purple-dark",
        colors: { p: "#a855f7", s: "#9333ea", bm: "#3b0764", bc: "#581c87" },
      },
    },
    {
      name: "Coffee Brown",
      light: {
        id: "coffee-brown",
        colors: { p: "#78350f", s: "#92400e", bm: "#fef7ed", bc: "#ffffff" },
      },
      dark: {
        id: "coffee-brown-dark",
        colors: { p: "#d97706", s: "#b45309", bm: "#451a03", bc: "#78350f" },
      },
    },
    {
      name: "Slate Gray",
      light: {
        id: "slate-gray",
        colors: { p: "#374151", s: "#4b5563", bm: "#f9fafb", bc: "#ffffff" },
      },
      dark: {
        id: "slate-gray-dark",
        colors: { p: "#9ca3af", s: "#6b7280", bm: "#111827", bc: "#1f2937" },
      },
    },
  ];

  window.applyTheme = function (themeId) {
    document.documentElement.setAttribute("data-theme", themeId);
    localStorage.setItem("theme", themeId);

    document
      .querySelectorAll(".theme-card")
      .forEach((card) => card.classList.remove("active"));
    const activeCard = document.querySelector(
      `.theme-card[data-theme="${themeId}"]`
    );
    if (activeCard) {
      activeCard.classList.add("active");
    }

    const isDarkMode = themeId.endsWith("-dark") || themeId === "dark";

    const headerToggleBtn = document.getElementById("theme-toggle-btn");
    if (headerToggleBtn) {
      headerToggleBtn.innerHTML = isDarkMode
        ? '<i class="fas fa-sun"></i>'
        : '<i class="fas fa-moon"></i>';
    }

    const settingsToggleSwitch = document.getElementById("dark-mode-toggle");
    if (settingsToggleSwitch) {
      settingsToggleSwitch.checked = isDarkMode;
    }

    if (typeof renderDashboardCharts === "function" && window.allCustomers) {
      const profitData = window.processProfitData(window.allCustomers);
      renderDashboardCharts(
        window.allCustomers.active,
        window.allCustomers.settled,
        profitData
      );
    }
  };

  window.toggleDarkMode = function () {
    const currentThemeId = localStorage.getItem("theme") || "default";
    const themeInfo = themes.find(
      (t) => t.light.id === currentThemeId || t.dark.id === currentThemeId
    );

    if (themeInfo) {
      const isCurrentlyDark = currentThemeId === themeInfo.dark.id;
      window.applyTheme(
        isCurrentlyDark ? themeInfo.light.id : themeInfo.dark.id
      );
    }
  };

  function createThemeCard(themeVariant, name) {
    const card = document.createElement("div");
    card.className = "theme-card";
    card.dataset.theme = themeVariant.id;
    card.innerHTML = `
            <div class="theme-name">${name}</div>
            <div class="theme-palette">
                <div class="theme-color-swatch" style="background-color: ${themeVariant.colors.p}"></div>
                <div class="theme-color-swatch" style="background-color: ${themeVariant.colors.s}"></div>
                <div class="theme-color-swatch" style="background-color: ${themeVariant.colors.bm}"></div>
                <div class="theme-color-swatch" style="background-color: ${themeVariant.colors.bc}"></div>
            </div>
        `;
    card.addEventListener("click", () => {
      window.applyTheme(themeVariant.id);
      themeModal.classList.remove("show");
    });
    return card;
  }
  function populateThemeModal() {
    if (!lightThemesGrid || !darkThemesGrid) return;
    lightThemesGrid.innerHTML = "";
    darkThemesGrid.innerHTML = "";

    themes.forEach((theme) => {
      lightThemesGrid.appendChild(createThemeCard(theme.light, theme.name));
      darkThemesGrid.appendChild(
        createThemeCard(theme.dark, `${theme.name} (Dark)`)
      );
    });
  }
  populateThemeModal();
  const savedTheme = localStorage.getItem("theme") || "default";
  window.applyTheme(savedTheme);

  changeThemeBtn.addEventListener("click", (e) => {
    e.preventDefault();
    themeModal.classList.add("show");
  });
});
