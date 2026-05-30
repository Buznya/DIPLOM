async function loadArchiveFilters() {
  const yearSel = document.getElementById('a_year');

  const res = await fetch('/api/movement/refs');
  const data = await res.json();

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

async function loadArchive(e) {
  if (e) e.preventDefault();

  const query = document.getElementById('a_query').value.trim();
  const yearId = document.getElementById('a_year').value;
  const from = document.getElementById('a_from').value;
  const to = document.getElementById('a_to').value;

  const params = new URLSearchParams({ status: 'expelled' });
  if (query) params.append('query', query);
  if (yearId) params.append('year_id', yearId);
  if (from) params.append('expel_from', from);
  if (to) params.append('expel_to', to);

  console.log('Archive load params:', params.toString());

  const res = await fetch('/api/students?' + params.toString());
  const data = await res.json();

  const tbody = document.querySelector('.table tbody');
  tbody.innerHTML = '';

  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const canRestore = (user.role === 'Администратор' || user.role === 'Директор' || user.role === 'Заведующая');

  console.log('Archive.js: роль =', user.role, 'canRestore =', canRestore);

  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="6">Нет отчисленных</td></tr>';
    return;
  }

  data.forEach(s => {
    const tr = document.createElement('tr');

    const fio = [s.lastname, s.firstname, s.middlename]
      .filter(Boolean)
      .join(' ');

    const expelDate = s.expel_date
      ? new Date(s.expel_date).toLocaleDateString('ru-RU')
      : '—';

    let actions = '';
    if (canRestore) {
      actions = `
        <a class="btn btn--secondary" href="/pages/student-form.html?id=${s.id}">Открыть</a>
        <button class="btn btn--primary" type="button" data-id="${s.id}">Восстановить</button>
      `;
    } else {
      actions = `<a class="btn btn--secondary" href="/pages/student-form.html?id=${s.id}">Открыть</a>`;
    }

    tr.innerHTML = `
      <td>${s.unique_id}</td>
      <td>${fio}</td>
      <td>${expelDate}</td>
      <td>${s.expel_reason || '—'}</td>
      <td>${s.expel_order || '—'}</td>
      <td class="cell-actions">${actions}</td>
    `;

    tbody.appendChild(tr);
  });

  if (canRestore) {
    tbody.querySelectorAll('button[data-id]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        if (!confirm('Восстановить этого учащегося?')) return;

        const resRestore = await fetch(`/api/students/${id}/restore`, { method: 'POST' });
        const dataRestore = await resRestore.json();

        if (!resRestore.ok || !dataRestore.success) {
          alert(dataRestore.error || 'Ошибка при восстановлении');
          return;
        }

        alert('Учащийся восстановлен');
        loadArchive();
      });
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  if (!window.location.pathname.endsWith('/pages/archive.html')) return;

  loadArchiveFilters();
  loadArchive();

  const form = document.querySelector('.form--filters');
  form?.addEventListener('submit', loadArchive);
});

function exportArchiveCSV() {
  const query = document.getElementById('a_query').value.trim();
  const yearId = document.getElementById('a_year').value;
  const from = document.getElementById('a_from').value;
  const to = document.getElementById('a_to').value;

  const params = new URLSearchParams({ status: 'expelled' });
  if (query) params.append('query', query);
  if (yearId) params.append('year_id', yearId);
  if (from) params.append('expel_from', from);
  if (to) params.append('expel_to', to);

  window.location.href = '/api/students/export?' + params.toString();
}

window.addEventListener('DOMContentLoaded', () => {
  if (!window.location.pathname.endsWith('/pages/archive.html')) return;
  document.querySelectorAll('.form__actions button').forEach(btn => {
    if (btn.textContent.includes('Экспорт CSV')) {
      btn.addEventListener('click', exportArchiveCSV);
    }
  });
});