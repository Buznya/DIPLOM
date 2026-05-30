console.log('auth.js loaded, path =', window.location.pathname);

async function apiLogin(login, password) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login, password })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Ошибка авторизации');
  }
  return data;
}

if (window.location.pathname.endsWith('/pages/login.html')) {
  const form = document.querySelector('form');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('login submit');

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
      console.error(err);
    }
  });
}

window.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.endsWith('/pages/login.html')) return;

  try {
    const stored = sessionStorage.getItem('user');
    if (!stored) {
      window.location.href = '/pages/login.html';
      return;
    }

    const user = JSON.parse(stored);
    const nameEl = document.querySelector('.user__name');
    const roleEl = document.querySelector('.user__role');

    if (nameEl) nameEl.textContent = user.login;
    if (roleEl) {
      
      roleEl.textContent = `Роль: ${user.role}`;
    }
  } catch (e) {
    console.error('Ошибка чтения user из sessionStorage', e);
    window.location.href = '/pages/login.html';
  }
});

if (window.location.pathname.endsWith('/pages/auth-log.html')) {
  const form = document.querySelector('.form--filters');
  const tbody = document.querySelector('.table tbody');
  
  const filterUser = document.getElementById('al_user');
  const filterResult = document.getElementById('al_result');
  const filterFrom = document.getElementById('al_from');
  const filterTo = document.getElementById('al_to');

  async function loadAuthLog() {
    try {
      const params = new URLSearchParams();
      if (filterUser && filterUser.value) params.append('login', filterUser.value);
      if (filterResult && filterResult.value) params.append('result', filterResult.value);
      if (filterFrom && filterFrom.value) params.append('date_from', filterFrom.value);
      if (filterTo && filterTo.value) params.append('date_to', filterTo.value);
      
      const url = '/api/auth/log' + (params.toString() ? '?' + params.toString() : '');
      console.log('Запрос:', url);
      
      const res = await fetch(url);
      const data = await res.json();

      if (!tbody) return;
      tbody.innerHTML = '';

      if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px;">Нет данных</td></tr>';
        return;
      }

      data.forEach(row => {
        const tr = document.createElement('tr');
        const date = new Date(row.created_at).toLocaleString('ru-RU');
        const resultText = row.result === 'success' ? 'успешно' : 'ошибка';
        const badgeClass = row.result === 'success' ? 'badge--ok' : 'badge--danger';

        tr.innerHTML = `
          <tr>${date}</td>
          <td>${escapeHtml(row.login || '—')}</td>
          <td><span class="badge ${badgeClass}">${resultText}</span></td>
          <td>${escapeHtml(row.comment || '—')}</td>
          <td>${escapeHtml(row.ip_address || '—')}</td>
        `;
        tbody.appendChild(tr);
      });
    } catch (err) {
      console.error('Ошибка загрузки:', err);
      if (tbody) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px; color: var(--danger);">Ошибка загрузки данных</td></tr>';
      }
    }
  }

  function resetFilters() {
    if (filterUser) filterUser.value = '';
    if (filterResult) filterResult.value = '';
    if (filterFrom) filterFrom.value = '';
    if (filterTo) filterTo.value = '';
    loadAuthLog();
  }

  async function exportToCSV() {
    try {
      const params = new URLSearchParams();
      if (filterUser && filterUser.value) params.append('login', filterUser.value);
      if (filterResult && filterResult.value) params.append('result', filterResult.value);
      if (filterFrom && filterFrom.value) params.append('date_from', filterFrom.value);
      if (filterTo && filterTo.value) params.append('date_to', filterTo.value);
      
      const url = '/api/auth/log' + (params.toString() ? '?' + params.toString() : '');
      const res = await fetch(url);
      const data = await res.json();
      
      if (!data || data.length === 0) {
        alert('Нет данных для экспорта');
        return;
      }
      
      const headers = ['Дата/время', 'Логин', 'Результат', 'Комментарий', 'IP адрес'];
      
      const rows = data.map(row => {
        const date = new Date(row.created_at).toLocaleString('ru-RU');
        const result = row.result === 'success' ? 'успешно' : 'ошибка';
        
        const escapeCSV = (str) => {
          if (!str) return '—';
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        };
        
        return [
          escapeCSV(date),
          escapeCSV(row.login || '—'),
          escapeCSV(result),
          escapeCSV(row.comment || '—'),
          escapeCSV(row.ip_address || '—')
        ].join(',');
      });
      
      const csvContent = [headers.join(','), ...rows].join('\n');
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url_blob = URL.createObjectURL(blob);
      link.href = url_blob;
      link.setAttribute('download', `auth_log_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url_blob);
      
    } catch (err) {
      console.error('Ошибка экспорта:', err);
      alert('Ошибка при экспорте данных');
    }
  }

  function escapeHtml(str) {
    if (!str) return '—';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  window.addEventListener('DOMContentLoaded', () => {
    loadAuthLog();
    
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        console.log('Применить фильтры');
        loadAuthLog();
      });
    }
    
    const resetBtn = document.querySelector('.btn--ghost');
    if (resetBtn && resetBtn.textContent.includes('Сброс')) {
      resetBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('Сброс фильтров');
        resetFilters();
      });
    }
    
    const exportBtn = document.querySelector('.btn--secondary');
    if (exportBtn && exportBtn.textContent.includes('Экспорт CSV')) {
      exportBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('Экспорт CSV');
        exportToCSV();
      });
    }
  });
}