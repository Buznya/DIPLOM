

async function checkDashboardAccess() {
  try {
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    if (!user || !user.login) {
      window.location.href = '/pages/login.html';
      return false;
    }
    
    
    const adminSection = document.getElementById('adminSection');
    if (adminSection) {
      if (user.role === 'admin') {
        adminSection.style.display = 'block';
      } else {
        adminSection.style.display = 'none';
      }
    }
    
    
    const importExportLink = document.getElementById('importExportLink');
    const authLogLink = document.getElementById('authLogLink');
    
    if (importExportLink) {
      if (user.role !== 'admin') {
        importExportLink.style.display = 'none';
      }
    }
    
    if (authLogLink) {
      if (!['admin', 'director'].includes(user.role)) {
        authLogLink.style.display = 'none';
      }
    }
    
    
    
    
    return true;
  } catch (e) {
    console.error('Dashboard access check error:', e);
    window.location.href = '/pages/login.html';
    return false;
  }
}


window.addEventListener('DOMContentLoaded', async () => {
  
  setTimeout(() => {
    checkDashboardAccess();
  }, 100);
});