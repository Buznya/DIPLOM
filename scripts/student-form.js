const urlParams = new URLSearchParams(window.location.search);
const studentId = urlParams.get('id');

let currentUser = null;

async function loadFormSelects() {
  const res = await fetch('/api/movement/refs');
  const data = await res.json();

  const classSel = document.getElementById('st_class');
  const yearSel = document.getElementById('st_year');

  if (classSel) {
    classSel.innerHTML = '<option value="">—</option>';
    data.classes.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.name;
      classSel.appendChild(opt);
    });
  }

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

async function loadStudent() {
  if (!studentId) return;

  const res = await fetch('/api/students/' + studentId);
  if (!res.ok) {
    alert('Ошибка загрузки данных ученика');
    return;
  }

  const s = await res.json();

  document.getElementById('st_id').value = s.unique_id || '';
  document.getElementById('st_lastname').value = s.lastname || '';
  document.getElementById('st_firstname').value = s.firstname || '';
  document.getElementById('st_middlename').value = s.middlename || '';
  document.getElementById('st_birth').value = s.birth_date || '';
  document.getElementById('st_gender').value = s.gender || '';
  document.getElementById('st_address').value = s.address || '';
  document.getElementById('st_phone').value = s.phone || '';
  document.getElementById('st_parent').value = s.parent_name || '';
  document.getElementById('st_parent_phone').value = s.parent_phone || '';
  document.getElementById('st_parent2').value = s.parent2_name || '';
  document.getElementById('st_class').value = s.class_id || '';
  document.getElementById('st_year').value = s.school_year_id || '';
  document.getElementById('st_form').value = s.form_of_study || 'full';
  document.getElementById('st_status').value = s.status || 'active';
}

async function saveStudent(e) {
  e.preventDefault();

  const canEdit = (currentUser && (currentUser.role === 'Администратор' || currentUser.role === 'Директор'));
  if (!canEdit) {
    alert('У вас нет прав на сохранение данных учащегося');
    return;
  }

  const payload = {
    lastname: document.getElementById('st_lastname').value.trim(),
    firstname: document.getElementById('st_firstname').value.trim(),
    middlename: document.getElementById('st_middlename').value.trim(),
    birth_date: document.getElementById('st_birth').value || null,
    gender: document.getElementById('st_gender').value || null,
    address: document.getElementById('st_address').value.trim(),
    phone: document.getElementById('st_phone').value.trim(),
    parent_name: document.getElementById('st_parent').value.trim(),
    parent_phone: document.getElementById('st_parent_phone').value.trim(),
    parent2_name: document.getElementById('st_parent2').value.trim(),
    class_id: document.getElementById('st_class').value || null,
    school_year_id: document.getElementById('st_year').value || null,
    form_of_study: document.getElementById('st_form').value || 'full',
    status: document.getElementById('st_status').value || 'active'
  };

  if (!payload.lastname || !payload.firstname) {
    alert('Заполни фамилию и имя');
    return;
  }

  let url = '/api/students';
  let method = 'POST';

  if (studentId) {
    url = '/api/students/' + studentId;
    method = 'PUT';
  }

  const res = await fetch(url, {
    method: method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!res.ok) {
    alert(data.error || 'Ошибка сохранения');
    return;
  }

  alert(studentId ? 'Данные обновлены!' : 'Учащийся добавлен!');
  window.location.href = '/pages/students.html';
}


function disableFormForViewOnly() {
  if (!currentUser) return;
  
  console.log('Student-form.js: роль пользователя =', currentUser.role);
  
  if (currentUser.role === 'Заведующая') {
    const form = document.querySelector('form');
    const inputs = form.querySelectorAll('input, select, button[type="submit"]');
    inputs.forEach(input => {
      if (input.type !== 'button' && !input.classList.contains('btn--danger')) {
        input.disabled = true;
      }
    });
    
    const deleteBtn = document.querySelector('.btn--danger');
    if (deleteBtn) deleteBtn.style.display = 'none';
    
    const cardBody = document.querySelector('.card__body');
    const notice = document.createElement('div');
    notice.className = 'note';
    notice.style.marginTop = '16px';
    notice.style.background = 'rgba(255, 176, 32, 0.1)';
    notice.style.borderColor = 'rgba(255, 176, 32, 0.3)';
    notice.innerHTML = '🔒 Режим только для просмотра. У вас нет прав на редактирование.';
    cardBody?.appendChild(notice);
  } else if (currentUser.role === 'Директор') {
    const deleteBtn = document.querySelector('.btn--danger');
    if (deleteBtn) deleteBtn.style.display = 'none';
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  if (!window.location.pathname.endsWith('/pages/student-form.html')) return;

  const stored = sessionStorage.getItem('user');
  if (stored) {
    currentUser = JSON.parse(stored);
  }

  await loadFormSelects();
  await loadStudent();
  disableFormForViewOnly();

  const form = document.querySelector('form');
  form?.addEventListener('submit', saveStudent);
});