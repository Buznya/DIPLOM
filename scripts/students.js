async function loadStudentFilters() {
  const classSel = document.getElementById('s_class');
  const yearSel = document.getElementById('s_year');

  const res = await fetch('/api/movement/refs');
  const data = await res.json();

  if (classSel) {
    classSel.innerHTML = '<option value="">Все</option>';
    data.classes.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.name;
      classSel.appendChild(opt);
    });
  }

  if (yearSel) {
    yearSel.innerHTML = '<option value="">Все</option>';
    data.years.forEach(y => {
      const opt = document.createElement('option');
      opt.value = y.id;
      opt.textContent = y.year_name;
      yearSel.appendChild(opt);
    });
  }
}

async function loadStudents(e) {
  if (e) e.preventDefault();

  const q = document.getElementById('s_query').value.trim();
  const classId = document.getElementById('s_class').value;
  const yearId = document.getElementById('s_year').value;
  const status = document.getElementById('s_status').value;

  const params = new URLSearchParams();
  if (q) params.append('query', q);
  if (classId) params.append('class_id', classId);
  if (yearId) params.append('year_id', yearId);
  if (status) params.append('status', status);

  const res = await fetch('/api/students?' + params.toString());
  const data = await res.json();

  const tbody = document.querySelector('.table tbody');
  tbody.innerHTML = '';

  
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const canEdit = (user.role === 'Администратор' || user.role === 'Директор');
  const canDelete = (user.role === 'Администратор');

  console.log('Students.js: роль =', user.role, 'canEdit =', canEdit, 'canDelete =', canDelete);

  data.forEach(s => {
    const tr = document.createElement('tr');

    const fio = [s.lastname, s.firstname, s.middlename]
      .filter(Boolean)
      .join(' ');

    const birth = s.birth_date
      ? new Date(s.birth_date).toLocaleDateString('ru-RU')
      : '—';

    let statusText = '';
    let badgeClass = '';
    switch (s.status) {
      case 'active':
        statusText = 'обучается';
        badgeClass = 'badge--ok';
        break;
      case 'enrolled':
        statusText = 'зачислен';
        badgeClass = 'badge--ok';
        break;
      case 'moved':
        statusText = 'переведен';
        badgeClass = 'badge--warn';
        break;
      case 'expelled':
        statusText = 'отчислен';
        badgeClass = 'badge--danger';
        break;
      default:
        statusText = s.status || '—';
    }

    let actions = '';
    if (canEdit) {
      actions += `<a class="btn btn--secondary" href="/pages/student-form.html?id=${s.id}">Открыть</a>`;
    }
    if (canDelete && s.status !== 'expelled') {
      actions += `<button class="btn btn--danger" type="button" data-id="${s.id}">Удалить</button>`;
    }

    tr.innerHTML = `
      <td>${s.unique_id}</td>
      <td>${fio}</td>
      <td>${birth}</td>
      <td>${s.class_name || '—'}</td>
      <td>${s.year_name || '—'}</td>
      <td>${s.form_of_study || '—'}</td>
      <td><span class="badge ${badgeClass}">${statusText}</span></td>
      <td class="cell-actions">${actions || '—'}</td>
    `;

    tbody.appendChild(tr);
  });

  
  if (canDelete) {
    tbody.querySelectorAll('button[data-id]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        if (!confirm('Удалить этого учащегося?')) return;

        const resDel = await fetch('/api/students/' + id, { method: 'DELETE' });
        const dataDel = await resDel.json();

        if (!resDel.ok || !dataDel.success) {
          alert(dataDel.error || 'Ошибка при удалении');
          return;
        }

        loadStudents();
      });
    });
  }
}


function checkAddButtonAccess() {
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const addButton = document.querySelector('a[href="/pages/student-form.html"]');
  const canEdit = (user.role === 'Администратор' || user.role === 'Директор');
  if (addButton && !canEdit) {
    addButton.style.display = 'none';
  }
}

window.addEventListener('DOMContentLoaded', () => {
  if (!window.location.pathname.endsWith('/pages/students.html')) return;

  loadStudentFilters();
  loadStudents();
  checkAddButtonAccess();

  const form = document.querySelector('.form--filters');
  form?.addEventListener('submit', loadStudents);
});

function exportStudentsCSV() {
  const q = document.getElementById('s_query').value.trim();
  const classId = document.getElementById('s_class').value;
  const yearId = document.getElementById('s_year').value;
  const status = document.getElementById('s_status').value;

  const params = new URLSearchParams();
  if (q) params.append('query', q);
  if (classId) params.append('class_id', classId);
  if (yearId) params.append('year_id', yearId);
  if (status) params.append('status', status);

  window.location.href = '/api/students/export?' + params.toString();
}

function printStudents() {
  window.print();
}

window.addEventListener('DOMContentLoaded', () => {
  if (!window.location.pathname.endsWith('/pages/students.html')) return;
  document.querySelectorAll('.toolbar button').forEach(btn => {
    if (btn.textContent.includes('Экспорт CSV')) {
      btn.addEventListener('click', exportStudentsCSV);
    }
  });
});