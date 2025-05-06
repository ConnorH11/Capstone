document.addEventListener("DOMContentLoaded", () => {
    const toggle = document.getElementById("darkModeToggle");
    const text = document.getElementById("darkModeText");
    const navbar = document.getElementById("mainNavbar");
    const logoLight = document.getElementById("logoLight"); // Get the light mode logo
    const logoDark = document.getElementById("logoDark");   // Get the dark mode logo

    function applyDarkMode(isDark) {
        document.body.classList.toggle("dark-mode", isDark);
        text.textContent = isDark ? "Light Mode" : "Dark Mode";
        localStorage.setItem("darkMode", isDark ? "true" : "false");

        if (isDark) {
            navbar.classList.remove("navbar-light", "bg-white");
            navbar.classList.add("navbar-dark", "bg-dark");
            // Switch logos
            if (logoLight) logoLight.style.display = "none";
            if (logoDark) logoDark.style.display = "inline"; // Or "block" or "initial" depending on original CSS
        } else {
            navbar.classList.remove("navbar-dark", "bg-dark");
            navbar.classList.add("navbar-light", "bg-white");
            // Switch logos back
            if (logoLight) logoLight.style.display = "inline"; // Or "block" or "initial"
            if (logoDark) logoDark.style.display = "none";
        }
    }

    // Ensure toggle and text elements exist before adding event listener
    if (toggle && text && navbar && logoLight && logoDark) {
        toggle.addEventListener("click", () => {
            const isDark = !document.body.classList.contains("dark-mode");
            applyDarkMode(isDark);
        });

        const stored = localStorage.getItem("darkMode") === "true";
        applyDarkMode(stored);
    } else {
        console.error("Dark mode toggle elements not found. Ensure IDs are correct: darkModeToggle, darkModeText, mainNavbar, logoLight, logoDark.");
    }
});