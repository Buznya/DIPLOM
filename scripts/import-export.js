let currentUser = null;

async function importFile(e) {
  e.preventDefault();

  const fileInput = document.getElementById('imp_file');
  const mode = document.getElementById('imp_mode').value;
  const schoolYear = document.getElementById('imp_year').value;

  if (!fileInput.files.length) {
    alert('Выбери файл для импорта');
    return;
  }

  const formData = new FormData();
  formData.append('file', fileInput.files[0]);
  formData.append('mode', mode);
  formData.append('school_year', schoolYear || '');

  const res = await fetch('/api/import-export/import', {
    method: 'POST',
    body: formData
  });

  const data = await res.json();

  if (!res.ok) {
    alert(data.error || 'Ошибка импорта');
    return;
  }

  let message = `Импорт завершён:\n✓ Успешно: ${data.success}\n✗ Ошибок: ${data.errors}`;
  
  if (data.errorList && data.errorList.length) {
    message += '\n\nПримеры ошибок:\n' + data.errorList.slice(0, 5).join('\n');
  }

  alert(message);
  e.target.reset();
}

function exportData(e) {
  e.preventDefault();

  const what = document.getElementById('exp_what').value;
  const format = document.getElementById('exp_format').value;
  const scope = document.getElementById('exp_scope').value;

  const params = new URLSearchParams({ what, format });
  if (scope) params.append('scope', scope);

  window.location.href = '/api/import-export/export?' + params.toString();
}

async function loadImportRefs() {
  const res = await fetch('/api/movement/refs');
  const data = await res.json();

  const yearSel = document.getElementById('imp_year');
  if (yearSel) {
    yearSel.innerHTML = '<option value="">—</option>';
    data.years.forEach(y => {
      const opt = document.createElement('option');
      opt.value = y.id;
      opt.textContent = y.year_name;
      yearSel.appendChild(opt);
    });
  }
}


function setupPageByRole() {
  if (!currentUser) return;
  
  const role = currentUser.role;
  console.log('Import-export.js: роль пользователя =', role);
  
  const importCard = document.querySelector('.grid--2 .card:first-child');
  const exportCard = document.querySelector('.grid--2 .card:last-child');
  
  
  if (role === 'Администратор') {
    if (importCard) importCard.style.display = 'block';
    if (exportCard) exportCard.style.display = 'block';
    return;
  }
  
  
  if (role === 'Директор' || role === 'Заведующая') {
    
    if (importCard) importCard.style.display = 'none';
    
    if (exportCard) exportCard.style.display = 'block';
    
    
    const grid = document.querySelector('.grid--2');
    if (grid && !document.querySelector('.import-notice')) {
      const notice = document.createElement('div');
      notice.className = 'note import-notice';
      notice.style.gridColumn = '1 / -1';
      notice.style.marginBottom = '16px';
      notice.style.background = 'rgba(79, 140, 255, 0.1)';
      notice.style.borderColor = 'rgba(79, 140, 255, 0.3)';
      notice.innerHTML = '📤 Импорт данных доступен только администратору. Вам доступен только экспорт.';
      grid.insertBefore(notice, grid.firstChild);
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  if (!window.location.pathname.endsWith('/pages/import-export.html')) return;

  
  const stored = sessionStorage.getItem('user');
  if (stored) {
    currentUser = JSON.parse(stored);
  }

  loadImportRefs();
  setupPageByRole();

  const importForm = document.getElementById('importForm');
  const exportForm = document.getElementById('exportForm');

  
  if (importForm && currentUser?.role === 'Администратор') {
    importForm.addEventListener('submit', importFile);
  }
  
  
  if (exportForm) {
    exportForm.addEventListener('submit', exportData);
  }
});