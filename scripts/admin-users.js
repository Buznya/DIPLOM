

let currentDeleteId = null;


async function checkAdminAccess() {
  try {
    const stored = sessionStorage.getItem('user');
    if (!stored) {
      window.location.href = '/pages/login.html';
      return false;
    }
    const user = JSON.parse(stored);
    if (user.role !== 'Администратор') {
      const modal = document.getElementById('accessDeniedModal');
      if (modal) modal.classList.add('active');
      return false;
    }
    return true;
  } catch (e) {
    console.error('Access check error:', e);
    window.location.href = '/pages/login.html';
    return false;
  }
}


async function loadUsers() {
  try {
    const res = await fetch('/api/admin/users');
    if (!res.ok) {
      if (res.status === 403) throw new Error('Нет доступа');
      throw new Error('Ошибка загрузки');
    }
    const users = await res.json();
    renderUsersTable(users);
    document.getElementById('usersCount').textContent = users.length;
  } catch (err) {
    console.error('LOAD USERS ERROR:', err);
    const tbody = document.getElementById('usersTableBody');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px; color: var(--danger);">❌ Ошибка загрузки пользователей</td></tr>';
    }
  }
}


function renderUsersTable(users) {
  const tbody = document.getElementById('usersTableBody');
  if (!tbody) return;

  if (!users.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px;">Нет пользователей</td></tr>';
    return;
  }

  tbody.innerHTML = '';
  
  users.forEach(user => {
    const tr = document.createElement('tr');
    const createdAt = user.created_at ? new Date(user.created_at).toLocaleDateString('ru-RU') : '—';
    const isSelf = user.login === 'admin1'; 

    tr.innerHTML = `
      <td>${user.id}</td>
      <td>${escapeHtml(user.login)}</td>
      <td>
        <select class="role-select" data-id="${user.id}" ${isSelf ? 'disabled' : ''}>
          <option value="Работник" ${user.role === 'Работник' ? 'selected' : ''}>Работник</option>
          <option value="Администратор" ${user.role === 'Администратор' ? 'selected' : ''}>Администратор</option>
          <option value="Директор" ${user.role === 'Директор' ? 'selected' : ''}>Директор</option>
          <option value="Заведующая" ${user.role === 'Заведующая' ? 'selected' : ''}>Заведующая</option>
        </select>
      </td>
      <td>${createdAt}</td>
      <td class="cell-actions">
        <button class="btn btn--danger delete-user" data-id="${user.id}" data-login="${escapeHtml(user.login)}" ${isSelf ? 'disabled' : ''}>🗑 Удалить</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  
  document.querySelectorAll('.role-select').forEach(select => {
    select.addEventListener('change', async () => {
      const userId = select.getAttribute('data-id');
      const newRole = select.value;
      await updateUserRole(userId, newRole);
    });
  });

  
  document.querySelectorAll('.delete-user').forEach(btn => {
    btn.addEventListener('click', () => {
      const userId = btn.getAttribute('data-id');
      const login = btn.getAttribute('data-login');
      showDeleteConfirm(userId, login);
    });
  });
}


async function updateUserRole(userId, newRole) {
  try {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole })
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Ошибка при обновлении роли');
      await loadUsers(); 
    } else {
      alert('✅ Роль обновлена');
    }
  } catch (err) {
    console.error('UPDATE ROLE ERROR:', err);
    alert('Ошибка сервера');
    await loadUsers();
  }
}


function showDeleteConfirm(userId, login) {
  currentDeleteId = userId;
  const modal = document.getElementById('confirmModal');
  const message = document.getElementById('confirmMessage');
  message.textContent = `Удалить пользователя "${login}"? Это действие необратимо.`;
  modal.classList.add('active');
}


async function deleteUser(userId) {
  try {
    const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Ошибка при удалении');
      return;
    }
    alert('✅ Пользователь удалён');
    await loadUsers();
  } catch (err) {
    console.error('DELETE USER ERROR:', err);
    alert('Ошибка сервера');
  }
}


document.getElementById('addUserForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const login = document.getElementById('user_login').value.trim();
  const password = document.getElementById('user_password').value.trim();
  const role = document.getElementById('user_role').value;

  if (!login || !password) {
    alert('Заполните логин и пароль');
    return;
  }

  if (password.length < 3) {
    alert('Пароль должен быть не менее 3 символов');
    return;
  }

  try {
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login, password, role })
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Ошибка при создании пользователя');
      return;
    }

    alert('✅ Пользователь создан');
    document.getElementById('addUserForm').reset();
    await loadUsers();
  } catch (err) {
    console.error('CREATE USER ERROR:', err);
    alert('Ошибка сервера');
  }
});


document.getElementById('modalCancelBtn')?.addEventListener('click', () => {
  document.getElementById('confirmModal')?.classList.remove('active');
  currentDeleteId = null;
});


document.getElementById('modalConfirmBtn')?.addEventListener('click', async () => {
  if (currentDeleteId) {
    await deleteUser(currentDeleteId);
    document.getElementById('confirmModal')?.classList.remove('active');
    currentDeleteId = null;
  }
});


document.getElementById('accessDeniedOkBtn')?.addEventListener('click', () => {
  window.location.href = '/index.html';
});


function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}


window.addEventListener('DOMContentLoaded', async () => {
  if (!window.location.pathname.endsWith('/pages/users.html')) return;
  
  const hasAccess = await checkAdminAccess();
  if (!hasAccess) return;
  
  await loadUsers();
});