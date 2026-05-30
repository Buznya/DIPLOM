(function() {
  const STORAGE_KEY = 'school7_theme';
  const THEME_DARK = 'dark';
  const THEME_PRINT = 'print';
  
  let currentTheme = localStorage.getItem(STORAGE_KEY) || THEME_DARK;
  
  function applyTheme(theme) {
    if (theme === THEME_PRINT) {
      document.body.classList.add('theme-print');
      currentTheme = THEME_PRINT;
    } else {
      document.body.classList.remove('theme-print');
      currentTheme = THEME_DARK;
    }
    
    localStorage.setItem(STORAGE_KEY, currentTheme);
    
    const toggleBtn = document.getElementById('themeToggle');
    if (toggleBtn) {
      const isPrint = document.body.classList.contains('theme-print');
      toggleBtn.setAttribute('aria-label', isPrint ? 'Переключить на тёмную тему' : 'Переключить на светлую тему');
    }
  }
  
  function toggleTheme() {
    if (document.body.classList.contains('theme-print')) {
      applyTheme(THEME_DARK);
    } else {
      applyTheme(THEME_PRINT);
    }
  }
  
  applyTheme(currentTheme);
  
  const toggleBtn = document.getElementById('themeToggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', toggleTheme);
  }
  
  const observer = new MutationObserver(function(mutations) {
    const btn = document.getElementById('themeToggle');
    if (btn && !btn.hasListener) {
      btn.addEventListener('click', toggleTheme);
      btn.hasListener = true;
    }
  });
  
  observer.observe(document.body, { childList: true, subtree: true });
})();