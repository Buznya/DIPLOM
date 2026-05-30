async function generateReport(e) {
  e.preventDefault();

  const type = document.getElementById('rep_type').value;
  const asOf = document.getElementById('rep_date').value;
  const from = document.getElementById('rep_from').value;
  const to = document.getElementById('rep_to').value;

  const params = new URLSearchParams({ type });
  if (asOf) params.append('as_of', asOf);
  if (from) params.append('from', from);
  if (to) params.append('to', to);

  console.log('Reports: запрос параметров', params.toString());

  const res = await fetch('/api/reports?' + params.toString());
  const data = await res.json();

  if (!res.ok) {
    alert(data.error || 'Ошибка при формировании отчета');
    return;
  }

  renderReport(type, data);
}

function renderReport(type, data) {
  const thead = document.querySelector('.table thead tr');
  const tbody = document.querySelector('.table tbody');

  thead.innerHTML = '';
  tbody.innerHTML = '';

  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="10">Нет данных</td></tr>';
    return;
  }

  switch (type) {
    case 'current_by_class':
      renderCurrentByClass(data, thead, tbody);
      break;
    case 'movement_period':
      renderMovementPeriod(data, thead, tbody);
      break;
    case 'summary_parallel_year':
      renderSummaryParallelYear(data, thead, tbody);
      break;
    case 'arrived_left_period':
      renderArrivedLeftPeriod(data, thead, tbody);
      break;
    default:
      tbody.innerHTML = '<tr><td colspan="10">Неизвестный тип отчета</td></tr>';
  }
}

function renderCurrentByClass(data, thead, tbody) {
  thead.innerHTML = `
    <th>Класс</th>
    <th>Параллель</th>
    <th>Всего</th>
    <th>Мальчиков</th>
    <th>Девочек</th>
  `;

  data.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.class_name || '—'}</td>
      <td>${row.parallel || '—'}</td>
      <td>${row.total_students || 0}</td>
      <td>${row.male || 0}</td>
      <td>${row.female || 0}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderMovementPeriod(data, thead, tbody) {
  thead.innerHTML = `
    <th>Дата</th>
    <th>Тип</th>
    <th>ID</th>
    <th>ФИО</th>
    <th>Из класса</th>
    <th>В класс</th>
    <th>Приказ</th>
    <th>Причина</th>
  `;

  data.forEach(row => {
    const tr = document.createElement('tr');

    const date = row.event_date
      ? new Date(row.event_date).toLocaleDateString('ru-RU')
      : '—';

    let typeText = '';
    switch (row.event_type) {
      case 'enroll':
        typeText = 'зачисление';
        break;
      case 'transfer':
        typeText = 'перевод';
        break;
      case 'expel':
        typeText = 'отчисление';
        break;
      default:
        typeText = row.event_type;
    }

    tr.innerHTML = `
      <td>${date}</td>
      <td>${typeText}</td>
      <td>${row.unique_id || '—'}</td>
      <td>${row.fio || '—'}</td>
      <td>${row.from_class || '—'}</td>
      <td>${row.to_class || '—'}</td>
      <td>${row.order_info || '—'}</td>
      <td>${row.reason || '—'}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderSummaryParallelYear(data, thead, tbody) {
  thead.innerHTML = `
    <th>Параллель</th>
    <th>Учебный год</th>
    <th>Всего учащихся</th>
  `;

  data.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.parallel || '—'}</td>
      <td>${row.year_name || '—'}</td>
      <td>${row.total_students || 0}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderArrivedLeftPeriod(data, thead, tbody) {
  thead.innerHTML = `
    <th>Тип события</th>
    <th>Количество</th>
  `;

  data.forEach(row => {
    const tr = document.createElement('tr');

    let typeText = '';
    switch (row.event_type) {
      case 'enroll':
        typeText = 'Зачислено';
        break;
      case 'transfer':
        typeText = 'Переведено';
        break;
      case 'expel':
        typeText = 'Отчислено';
        break;
      default:
        typeText = row.event_type;
    }

    tr.innerHTML = `
      <td>${typeText}</td>
      <td>${row.count || 0}</td>
    `;
    tbody.appendChild(tr);
  });
}

window.addEventListener('DOMContentLoaded', () => {
  if (!window.location.pathname.endsWith('/pages/reports.html')) return;

  const form = document.getElementById('reportParams');
  form?.addEventListener('submit', generateReport);
});

function exportReportCSV() {
  const type = document.getElementById('rep_type').value;
  const asOf = document.getElementById('rep_date').value;
  const from = document.getElementById('rep_from').value;
  const to = document.getElementById('rep_to').value;

  const params = new URLSearchParams({ type });
  if (asOf) params.append('as_of', asOf);
  if (from) params.append('from', from);
  if (to) params.append('to', to);

  window.location.href = '/api/reports/export?' + params.toString();
}

function printReport() {
  window.print();
}

window.addEventListener('DOMContentLoaded', () => {
  if (!window.location.pathname.endsWith('/pages/reports.html')) return;
  document.querySelectorAll('.form__actions button').forEach(btn => {
    if (btn.textContent.includes('Экспорт CSV')) {
      btn.addEventListener('click', exportReportCSV);
    }
    if (btn.textContent.includes('Печать')) {
      btn.addEventListener('click', printReport);
    }
  });
});