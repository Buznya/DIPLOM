let currentUser = null;

async function loadMovementRefs() {
  const res = await fetch('/api/movement/refs');
  const data = await res.json();

  const classSelects = [
    document.getElementById('enroll_class'),
    document.getElementById('tr_from'),
    document.getElementById('tr_to')
  ];
  const yearSelect = document.getElementById('enroll_year');

  classSelects.forEach(sel => {
    if (!sel) return;
    sel.innerHTML = '<option value="">—</option>';
    data.classes.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.name;
      sel.appendChild(opt);
    });
  });

  if (yearSelect) {
    yearSelect.innerHTML = '<option value="">—</option>';
    data.years.forEach(y => {
      const opt = document.createElement('option');
      opt.value = y.id;
      opt.textContent = y.year_name;
      yearSelect.appendChild(opt);
    });
  }
}

async function enrollStudent(e) {
  e.preventDefault();

  const canEdit = (currentUser && (currentUser.role === 'Администратор' || currentUser.role === 'Директор'));
  if (!canEdit) {
    alert('У вас нет прав на оформление зачисления');
    return;
  }

  const payload = {
    student_id: document.getElementById('enroll_student').value.trim(),
    order_info: document.getElementById('enroll_order').value.trim(),
    enroll_date: document.getElementById('enroll_date').value,
    class_id: document.getElementById('enroll_class').value || null,
    school_year: document.getElementById('enroll_year').value || null
  };

  if (!payload.student_id || !payload.enroll_date) {
    alert('Заполни ID учащегося и дату зачисления');
    return;
  }

  const res = await fetch('/api/movement/enroll', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!res.ok) {
    alert(data.error || 'Ошибка при зачислении');
    return;
  }

  alert('Зачисление оформлено');
  e.target.reset();
  loadMovementLog();
}

async function transferStudent(e) {
  e.preventDefault();

  const canEdit = (currentUser && (currentUser.role === 'Администратор' || currentUser.role === 'Директор'));
  if (!canEdit) {
    alert('У вас нет прав на оформление перевода');
    return;
  }

  const payload = {
    student_id: document.getElementById('tr_student').value.trim(),
    order_info: document.getElementById('tr_order').value.trim(),
    transfer_date: document.getElementById('tr_date').value,
    from_class_id: document.getElementById('tr_from').value || null,
    to_class_id: document.getElementById('tr_to').value || null
  };

  if (!payload.student_id || !payload.transfer_date || !payload.to_class_id) {
    alert('Заполни ID, дату и класс назначения');
    return;
  }

  const res = await fetch('/api/movement/transfer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!res.ok) {
    alert(data.error || 'Ошибка при переводе');
    return;
  }

  alert('Перевод оформлен');
  e.target.reset();
  loadMovementLog();
}

async function expelStudent(e) {
  e.preventDefault();

  const canEdit = (currentUser && (currentUser.role === 'Администратор' || currentUser.role === 'Директор'));
  if (!canEdit) {
    alert('У вас нет прав на оформление отчисления');
    return;
  }

  const payload = {
    student_id: document.getElementById('ex_student').value.trim(),
    order_info: document.getElementById('ex_order').value.trim(),
    expel_date: document.getElementById('ex_date').value,
    reason: document.getElementById('ex_reason').value
  };

  if (!payload.student_id || !payload.expel_date || !payload.reason) {
    alert('Заполни ID, дату и причину отчисления');
    return;
  }

  const res = await fetch('/api/movement/expel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!res.ok) {
    alert(data.error || 'Ошибка при отчислении');
    return;
  }

  alert('Отчисление оформлено');
  e.target.reset();
  loadMovementLog();
}

async function loadMovementLog(e) {
  if (e) e.preventDefault();

  const query = document.getElementById('mv_query')?.value.trim() || '';
  const type = document.getElementById('mv_type')?.value || '';
  const from = document.getElementById('mv_from')?.value || '';
  const to = document.getElementById('mv_to')?.value || '';

  const params = new URLSearchParams();
  if (query) params.append('query', query);
  if (type) params.append('type', type);
  if (from) params.append('date_from', from);
  if (to) params.append('date_to', to);

  const res = await fetch('/api/movement/log?' + params.toString());
  const data = await res.json();

  const tbody = document.querySelector('.table tbody');
  tbody.innerHTML = '';

  data.forEach(m => {
    const tr = document.createElement('tr');
    const date = m.event_date ? new Date(m.event_date).toLocaleDateString('ru-RU') : '—';

    let typeLabel = '', badgeClass = '';
    if (m.event_type === 'enroll') {
      typeLabel = 'зачисление';
      badgeClass = 'badge--ok';
    } else if (m.event_type === 'transfer') {
      typeLabel = 'перевод';
      badgeClass = 'badge--warn';
    } else if (m.event_type === 'expel') {
      typeLabel = 'отчисление';
      badgeClass = 'badge--danger';
    }

    const studentText = `${m.unique_id || ''} ${m.lastname || ''} ${m.firstname || ''}`.trim() || '—';
    const details = [
      m.from_class ? `из: ${m.from_class}` : '',
      m.to_class ? `в: ${m.to_class}` : '',
      m.reason ? `причина: ${m.reason}` : ''
    ].filter(Boolean).join(' | ') || '—';

    tr.innerHTML = `
      <td>${date}</td>
      <td><span class="badge ${badgeClass}">${typeLabel}</span></td>
      <td>${studentText}</td>
      <td>${m.order_info || '—'}</td>
      <td>${details}</td>
    `;
    tbody.appendChild(tr);
  });
}


function hideFormsForRole() {
  if (!currentUser) return;
  
  
  if (currentUser.role === 'Заведующая' || currentUser.role === 'Работник') {
    const forms = document.querySelectorAll('.grid--3 .card');
    forms.forEach(form => {
      form.style.display = 'none';
    });
    
    const panel = document.querySelector('.panel');
    
    if (!document.querySelector('.movement-notice')) {
      const notice = document.createElement('div');
      notice.className = 'note movement-notice';
      notice.style.marginBottom = '16px';
      notice.style.background = 'rgba(255, 176, 32, 0.1)';
      notice.style.borderColor = 'rgba(255, 176, 32, 0.3)';
      notice.innerHTML = '🔒 У вас нет прав на оформление движения. Доступен только просмотр журнала.';
      panel?.insertBefore(notice, document.querySelector('.grid--3'));
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  if (!window.location.pathname.endsWith('/pages/movement.html')) return;

  const stored = sessionStorage.getItem('user');
  if (stored) {
    currentUser = JSON.parse(stored);
    console.log('Movement.js: роль пользователя =', currentUser.role);
  }

  loadMovementRefs();
  loadMovementLog();
  hideFormsForRole();

  document.getElementById('enrollForm')?.addEventListener('submit', enrollStudent);
  document.getElementById('transferForm')?.addEventListener('submit', transferStudent);
  document.getElementById('expelForm')?.addEventListener('submit', expelStudent);

  const filterForm = document.querySelector('.form--filters');
  filterForm?.addEventListener('submit', loadMovementLog);

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;

    if (btn.textContent.includes('Экспорт CSV')) {
      exportMovementCSV();
    }
    if (btn.textContent.includes('Печать')) {
      printMovement();
    }
  });
});

function exportMovementCSV() {
  window.location.href = '/api/movement/export';
}

function printMovement() {
  window.print();
}