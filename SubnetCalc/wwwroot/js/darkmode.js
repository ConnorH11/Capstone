// Wait until the DOM is fully loaded before running the script
document.addEventListener("DOMContentLoaded", () => {
    // Grab references to the elements involved in the dark mode toggle
    const toggle = document.getElementById("darkModeToggle");
    const text = document.getElementById("darkModeText");
    const navbar = document.getElementById("mainNavbar");
    const logoLight = document.getElementById("logoLight");
    const logoDark = document.getElementById("logoDark");

    /**
     * Apply or remove dark mode styles based on the boolean flag.
     * @param {boolean} isDark - true to enable dark mode, false to disable.
     */
    function applyDarkMode(isDark) {
        // Toggle a class on the body to switch global styles
        document.body.classList.toggle("dark-mode", isDark);
        // Update the toggle button text accordingly
        text.textContent = isDark ? "Light Mode" : "Dark Mode";
        // Persist the choice in localStorage
        localStorage.setItem("darkMode", isDark ? "true" : "false");

        if (isDark) {
            // Switch navbar from light to dark
            navbar.classList.remove("navbar-light", "bg-white");
            navbar.classList.add("navbar-dark", "bg-dark");
            // Show dark logo, hide light logo
            if (logoLight) logoLight.style.display = "none";
            if (logoDark) logoDark.style.display = "inline";
        } else {
            // Switch navbar back from dark to light
            navbar.classList.remove("navbar-dark", "bg-dark");
            navbar.classList.add("navbar-light", "bg-white");
            // Show light logo, hide dark logo
            if (logoLight) logoLight.style.display = "inline";
            if (logoDark) logoDark.style.display = "none";
        }
    }

    // Only proceed if all required elements are present
    if (toggle && text && navbar && logoLight && logoDark) {
        // Listen for clicks on the toggle to flip dark mode on/off
        toggle.addEventListener("click", () => {
            const isDark = !document.body.classList.contains("dark-mode");
            applyDarkMode(isDark);
        });

        // On page load, read the saved preference and apply it
        const stored = localStorage.getItem("darkMode") === "true";
        applyDarkMode(stored);
    } else {
        // Log an error if any expected element is missing
        console.error(
            "Dark mode toggle elements not found. Ensure IDs are correct: " +
            "darkModeToggle, darkModeText, mainNavbar, logoLight, logoDark."
        );
    }
});
