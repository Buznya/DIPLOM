const express = require('express');
const router = express.Router();
const db = require('../db/connection');

function getRole(req) {
  return req.session?.user?.role;
}

router.get('/export', async (req, res) => {
  const role = getRole(req);
  if (!['Администратор', 'Директор', 'Заведующая'].includes(role)) {
    return res.status(403).json({ error: 'Недостаточно прав' });
  }

  const { query, class_id, year_id, status, expel_from, expel_to } = req.query;

  let sql = `
    SELECT s.unique_id, s.lastname, s.firstname, s.middlename, s.birth_date, s.gender, c.name AS class_name, sy.year_name, s.form_of_study, s.status, s.phone, s.parent_name, s.parent_phone
    FROM students s
    LEFT JOIN classes c ON s.class_id = c.id
    LEFT JOIN school_years sy ON s.school_year_id = sy.id
    WHERE 1=1
  `;
  const params = [];

  if (query) {
    sql += ' AND (s.lastname LIKE ? OR s.firstname LIKE ? OR s.unique_id LIKE ? OR c.name LIKE ?)';
    const q = `%${query}%`;
    params.push(q, q, q, q);
  }
  if (class_id) { sql += ' AND s.class_id = ?'; params.push(class_id); }
  if (year_id) { sql += ' AND s.school_year_id = ?'; params.push(year_id); }
  if (status) { sql += ' AND s.status = ?'; params.push(status); }
  if (expel_from) {sql += ' AND s.expel_date >= ?'; params.push(expel_from);}
  if (expel_to) {sql += ' AND s.expel_date <= ?'; params.push(expel_to);}

  sql += ' ORDER BY s.lastname, s.firstname';

  try {
    const [rows] = await db.query(sql, params);
    let csv = 'ID;Фамилия;Имя;Отчество;Дата рождения;Пол;Класс;Учебный год;Форма обучения;Статус;Телефон;Родитель;Телефон родителя\n';
    rows.forEach(r => {
      csv += [
        r.unique_id || '', r.lastname || '', r.firstname || '', r.middlename || '',
        r.birth_date ? new Date(r.birth_date).toLocaleDateString('ru-RU') : '',
        r.gender === 'm' ? 'М' : r.gender === 'f' ? 'Ж' : '',
        r.class_name || '', r.year_name || '', r.form_of_study || '', r.status || '',
        r.phone || '', r.parent_name || '', r.parent_phone || ''
      ].join(';') + '\n';
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="students.csv"');
    res.send('\uFEFF' + csv);
  } catch (err) {
    console.error('STUDENTS EXPORT ERROR:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.get('/', async (req, res) => {
  const { query, class_id, year_id, status, expel_from, expel_to } = req.query;
  const role = getRole(req);

  let sql = `
    SELECT s.*, c.name AS class_name, sy.year_name
    FROM students s
    LEFT JOIN classes c ON s.class_id = c.id
    LEFT JOIN school_years sy ON s.school_year_id = sy.id
    WHERE 1=1
  `;
  const params = [];

  if (query) {
    sql += ` AND (s.lastname LIKE ? OR s.firstname LIKE ? OR s.middlename LIKE ? OR s.unique_id LIKE ? OR c.name LIKE ?)`;
    const q = `%${query}%`;
    params.push(q, q, q, q, q);
  }
  if (class_id) { sql += ' AND s.class_id = ?'; params.push(class_id); }
  if (year_id) { sql += ' AND s.school_year_id = ?'; params.push(year_id); }
  if (status) { sql += ' AND s.status = ?'; params.push(status); }
  
  
  if (expel_from) {
    sql += ' AND s.expel_date >= ?';
    params.push(expel_from);
  }
  if (expel_to) {
    sql += ' AND s.expel_date <= ?';
    params.push(expel_to);
  }

  sql += ' ORDER BY s.lastname, s.firstname';

  try {
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('STUDENTS LIST ERROR:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});


router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM students WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Учащийся не найден' });
    res.json(rows[0]);
  } catch (err) {
    console.error('STUDENT GET ERROR:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});


router.post('/', async (req, res) => {
  const role = getRole(req);
  if (role !== 'Администратор' && role !== 'Директор') {
    return res.status(403).json({ error: 'Недостаточно прав' });
  }

  const { lastname, firstname, middlename, birth_date, gender, address, phone, parent_name, parent_phone, parent2_name, class_id, school_year_id, form_of_study, status } = req.body;

  if (!lastname || !firstname) {
    return res.status(400).json({ error: 'Заполни фамилию и имя' });
  }

  const unique_id = `U-${Date.now().toString().slice(-6)}`;

  try {
    const [result] = await db.query(
      `INSERT INTO students (unique_id, lastname, firstname, middlename, birth_date, gender, address, phone, parent_name, parent_phone, parent2_name, class_id, school_year_id, form_of_study, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [unique_id, lastname, firstname, middlename || null, birth_date || null, gender || null, address || null, phone || null, parent_name || null, parent_phone || null, parent2_name || null, class_id || null, school_year_id || null, form_of_study || 'full', status || 'active']
    );
    res.json({ success: true, id: result.insertId, unique_id });
  } catch (err) {
    console.error('STUDENT CREATE ERROR:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});


router.put('/:id', async (req, res) => {
  const role = getRole(req);
  if (role !== 'Администратор' && role !== 'Директор') {
    return res.status(403).json({ error: 'Недостаточно прав' });
  }

  const fields = req.body;
  const updates = [];
  const values = [];

  for (const key in fields) {
    updates.push(`${key} = ?`);
    values.push(fields[key] === '' ? null : fields[key]);
  }
  values.push(req.params.id);

  if (!updates.length) return res.json({ success: true });

  try {
    await db.query(`UPDATE students SET ${updates.join(', ')} WHERE id = ?`, values);
    res.json({ success: true });
  } catch (err) {
    console.error('STUDENT UPDATE ERROR:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});


router.delete('/:id', async (req, res) => {
  const role = getRole(req);
  if (role !== 'Администратор') {
    return res.status(403).json({ error: 'Недостаточно прав' });
  }

  try {
    await db.query('DELETE FROM students WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('STUDENT DELETE ERROR:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});


router.post('/:id/restore', async (req, res) => {
  const role = getRole(req);
  if (role !== 'Администратор' && role !== 'Директор') {
    return res.status(403).json({ error: 'Недостаточно прав' });
  }

  try {
    await db.query(`UPDATE students SET status = 'active', expel_date = NULL, expel_reason = NULL, expel_order = NULL WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('STUDENT RESTORE ERROR:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;