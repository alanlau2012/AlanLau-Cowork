/**
 * Theme Module
 * Handles light/dark theme switching
 */

/**
 * Initialize theme from localStorage
 */
export function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  applyTheme(savedTheme);
}

/**
 * Apply theme to document
 * @param {string} theme - 'light' | 'dark'
 */
export function applyTheme(theme) {
  const root = document.documentElement;
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const themeText = themeToggleBtn?.querySelector('span');

  if (theme === 'dark') {
    root.classList.add('dark');
    if (themeText) {
      themeText.textContent = 'Dark Mode';
    }
  } else {
    root.classList.remove('dark');
    if (themeText) {
      themeText.textContent = 'Light Mode';
    }
  }
  localStorage.setItem('theme', theme);
}

/**
 * Toggle between light and dark theme
 */
export function toggleTheme() {
  const isDark = document.documentElement.classList.contains('dark');
  applyTheme(isDark ? 'light' : 'dark');
}
