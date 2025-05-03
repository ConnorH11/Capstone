document.addEventListener("DOMContentLoaded", () => {
    const toggle = document.getElementById("darkModeToggle");
    const text = document.getElementById("darkModeText");
    const navbar = document.getElementById("mainNavbar");

    function applyDarkMode(isDark) {
        document.body.classList.toggle("dark-mode", isDark);
        text.textContent = isDark ? "Light Mode" : "Dark Mode";
        localStorage.setItem("darkMode", isDark ? "true" : "false");

        if (isDark) {
            navbar.classList.remove("navbar-light", "bg-white");
            navbar.classList.add("navbar-dark", "bg-dark");
        } else {
            navbar.classList.remove("navbar-dark", "bg-dark");
            navbar.classList.add("navbar-light", "bg-white");
        }
    }

    toggle.addEventListener("click", () => {
        const isDark = !document.body.classList.contains("dark-mode");
        applyDarkMode(isDark);
    });

    const stored = localStorage.getItem("darkMode") === "true";
    applyDarkMode(stored);
});
