const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const sidebar = document.querySelector('.sidebar');
const overlay = document.getElementById('sidebarOverlay');

function toggleMobileMenu() {
  sidebar.classList.toggle('is-open');
  overlay.classList.toggle('is-open');
  document.body.style.overflow = sidebar.classList.contains('is-open') ? 'hidden' : '';
  
  if (mobileMenuToggle) {
    mobileMenuToggle.setAttribute('aria-expanded', sidebar.classList.contains('is-open'));
  }
}

if (mobileMenuToggle) {
  mobileMenuToggle.addEventListener('click', toggleMobileMenu);
}

if (overlay) {
  overlay.addEventListener('click', toggleMobileMenu);
}

window.addEventListener('resize', () => {
  if (window.innerWidth > 768 && sidebar && sidebar.classList.contains('is-open')) {
    toggleMobileMenu();
  }
});

document.querySelectorAll('.navlink').forEach(link => {
  link.addEventListener('click', () => {
    if (window.innerWidth <= 768 && sidebar && sidebar.classList.contains('is-open')) {
      toggleMobileMenu();
    }
  });
});