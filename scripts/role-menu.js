function updateMenuByRole() {
  const stored = sessionStorage.getItem('user');
  if (!stored) return;
  
  const user = JSON.parse(stored);
  const role = user.role;
  
  console.log('role-menu.js: роль пользователя =', role);
  
  
  const importExportLink = document.querySelector('a[href="/pages/import-export.html"], a[href="pages/import-export.html"]');
  const authLogLink = document.querySelector('a[href="/pages/auth-log.html"], a[href="pages/auth-log.html"]');
  const reportsLink = document.querySelector('a[href="/pages/reports.html"], a[href="pages/reports.html"]');
  const archiveLink = document.querySelector('a[href="/pages/archive.html"], a[href="pages/archive.html"]');
  const adminSection = document.getElementById('adminSection');
  const usersLink = document.querySelector('a[href="/pages/users.html"], a[href="pages/users.html"]');
  
  
  if (importExportLink) {  
    importExportLink.style.display = (role !== 'Работник') ? 'block' : 'none';
  }  
  
  
  if (authLogLink) {
    authLogLink.style.display = (role === 'Администратор' || role === 'Директор') ? 'block' : 'none';
  }
  
  
  if (reportsLink) {
    reportsLink.style.display = (role !== 'Работник') ? 'block' : 'none';
  }
  
  
  if (archiveLink) {
    archiveLink.style.display = (role !== 'Работник') ? 'block' : 'none';
  }
  
  
  if (adminSection) {
    adminSection.style.display = (role === 'Администратор') ? 'block' : 'none';
  }
  
  if (usersLink) {
    usersLink.style.display = (role === 'Администратор') ? 'block' : 'none';
  }
  
  
  if (window.location.pathname === '/index.html' || window.location.pathname.endsWith('index.html')) {
    const cardReports = document.getElementById('cardReports');
    if (cardReports && role === 'Работник') {
      cardReports.style.display = 'none';
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', updateMenuByRole);
} else {
  updateMenuByRole();
}
setTimeout(updateMenuByRole, 100);
setTimeout(updateMenuByRole, 500);