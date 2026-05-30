console.log('auth.js loaded');

let currentUser = null;

async function apiLogin(login, password) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Ошибка авторизации');
  return data;
}

async function checkSession() {
  try {
    const res = await fetch('/api/auth/session');
    if (!res.ok) return null;
    const data = await res.json();
    return data.user;
  } catch (e) {
    return null;
  }
}

function showAccessDeniedAndRedirect() {
  const modal = document.getElementById('accessDeniedModal');
  if (modal) {
    modal.classList.add('active');
    const okBtn = document.getElementById('accessDeniedOkBtn');
    if (okBtn) {
      okBtn.onclick = () => {
        window.location.href = '/index.html';
      };
    }
  } else {
    alert('Нет доступа');
    window.location.href = '/index.html';
  }
}

function checkPageAccess(user) {
  const path = window.location.pathname;
  
  
  const publicPages = ['/index.html', '/pages/students.html', '/pages/movement.html', '/pages/reports.html', '/pages/archive.html'];
  
  
  const adminOnlyPages = ['/pages/users.html'];
  
  
  const adminDirectorPages = ['/pages/auth-log.html'];
  
  
  const importExportPages = ['/pages/import-export.html'];
  
  if (!user) {
    if (!path.endsWith('/pages/login.html')) {
      window.location.href = '/pages/login.html';
    }
    return false;
  }
  
  
  if (adminOnlyPages.some(p => path.endsWith(p))) {
    if (user.role !== 'admin') {
      showAccessDeniedAndRedirect();
      return false;
    }
  }
  
  
  if (adminDirectorPages.some(p => path.endsWith(p))) {
    if (!['admin', 'director'].includes(user.role)) {
      showAccessDeniedAndRedirect();
      return false;
    }
  }
  
  
  if (importExportPages.some(p => path.endsWith(p))) {
    if (user.role !== 'admin') {
      
    }
  }
  
  return true;
}

function updateUIByRole(user) {
  if (!user) return;
  
  
  const importExportLink = document.querySelector('a[href="/pages/import-export.html"]');
  const authLogLink = document.querySelector('a[href="/pages/auth-log.html"]');
  const adminSection = document.getElementById('adminSection');
  
  
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
  
  
  if (adminSection) {
    if (user.role === 'admin') {
      adminSection.style.display = 'block';
    } else {
      adminSection.style.display = 'none';
    }
  }
  
  
  
  window.currentUser = user;
}


if (window.location.pathname.endsWith('/pages/login.html')) {
  const form = document.querySelector('form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const login = document.getElementById('login').value.trim();
      const password = document.getElementById('password').value.trim();
      if (!login || !password) {
        alert('Введите логин и пароль');
        return;
      }
      try {
        const result = await apiLogin(login, password);
        sessionStorage.setItem('user', JSON.stringify(result.user));
        window.location.href = '/index.html';
      } catch (err) {
        alert(err.message);
      }
    });
  }
} else {
  
  window.addEventListener('DOMContentLoaded', async () => {
    let user = null;
    const stored = sessionStorage.getItem('user');
    if (stored) {
      try {
        user = JSON.parse(stored);
      } catch(e) {}
    }
    
    
    const sessionUser = await checkSession();
    if (!sessionUser) {
      sessionStorage.removeItem('user');
      if (!window.location.pathname.endsWith('/pages/login.html')) {
        window.location.href = '/pages/login.html';
      }
      return;
    }
    
    
    if (!user || user.login !== sessionUser.login) {
      user = sessionUser;
      sessionStorage.setItem('user', JSON.stringify(user));
    }
    
    
    const nameEl = document.querySelector('.user__name');
    const roleEl = document.querySelector('.user__role');
    if (nameEl) nameEl.textContent = user.login;
    if (roleEl) {
      const roleText = {
        'admin': 'Администратор',
        'director': 'Директор',
        'zaveduyushaya': 'Заведующая'
      }[user.role] || user.role;
      roleEl.textContent = `Роль: ${roleText}`;
    }
    
    
    const hasAccess = checkPageAccess(user);
    if (hasAccess) {
      updateUIByRole(user);
    }
  });
}


document.addEventListener('click', (e) => {
  const logoutBtn = e.target.closest('#logoutBtn, .btn--ghost[href="pages/login.html"]');
  if (logoutBtn) {
    e.preventDefault();
    fetch('/api/auth/logout', { method: 'POST' })
      .then(() => {
        sessionStorage.removeItem('user');
        window.location.href = '/pages/login.html';
      })
      .catch(() => {
        sessionStorage.removeItem('user');
        window.location.href = '/pages/login.html';
      });
  }
});