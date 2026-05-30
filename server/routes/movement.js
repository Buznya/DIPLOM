const express = require('express');
const router = express.Router();
const db = require('../db/connection');

function getRole(req) {
  return req.session?.user?.role;
}

async function findStudentIdByUnique(uniqueId) {
  const [rows] = await db.query('SELECT id FROM students WHERE unique_id = ?', [uniqueId]);
  return rows.length ? rows[0].id : null;
}


router.get('/refs', async (req, res) => {
  try {
    const [classes] = await db.query('SELECT id, name FROM classes ORDER BY parallel, name');
    const [years] = await db.query('SELECT id, year_name FROM school_years ORDER BY start_date DESC');
    res.json({ classes, years });
  } catch (err) {
    console.error('MOVEMENT REFS ERROR:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});


router.get('/log', async (req, res) => {
  const { query, type, date_from, date_to } = req.query;

  let sql = `
    SELECT me.*, s.unique_id, s.lastname, s.firstname,
           cf.name AS from_class, ct.name AS to_class
    FROM movement_events me
    LEFT JOIN students s ON me.student_id = s.id
    LEFT JOIN classes cf ON me.from_class_id = cf.id
    LEFT JOIN classes ct ON me.to_class_id = ct.id
    WHERE 1=1
  `;
  const params = [];

  if (type && type !== '') {
    sql += ' AND me.event_type = ?';
    params.push(type);
  }
  if (date_from && date_from !== '') {
    sql += ' AND me.event_date >= ?';
    params.push(date_from);
  }
  if (date_to && date_to !== '') {
    sql += ' AND me.event_date <= ?';
    params.push(date_to);
  }
  if (query && query !== '') {
    sql += ' AND (s.lastname LIKE ? OR s.firstname LIKE ? OR s.unique_id LIKE ? OR me.order_info LIKE ?)';
    const q = `%${query}%`;
    params.push(q, q, q, q);
  }

  sql += ' ORDER BY me.event_date DESC, me.id DESC LIMIT 500';

  try {
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('MOVEMENT LOG ERROR:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});


router.post('/enroll', async (req, res) => {
  const role = getRole(req);
  if (role !== 'Администратор' && role !== 'Директор') {
    return res.status(403).json({ error: 'Недостаточно прав' });
  }

  const { student_id, order_info, enroll_date, class_id, school_year } = req.body;

  if (!student_id || !enroll_date) {
    return res.status(400).json({ error: 'Укажи ID учащегося и дату зачисления' });
  }

  try {
    const realId = await findStudentIdByUnique(student_id);
    if (!realId) return res.status(400).json({ error: 'Учащийся с таким ID не найден' });

    await db.query(
      `INSERT INTO movement_events (student_id, event_type, event_date, order_info, to_class_id)
       VALUES (?, 'enroll', ?, ?, ?)`,
      [realId, enroll_date, order_info || null, class_id || null]
    );

    await db.query(
      `UPDATE students SET status = 'enrolled', class_id = ?, school_year_id = ?,
       expel_date = NULL, expel_reason = NULL, expel_order = NULL
       WHERE id = ?`,
      [class_id || null, school_year || null, realId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('ENROLL ERROR:', err);
    res.status(500).json({ error: 'Ошибка сервера при зачислении' });
  }
});


router.post('/transfer', async (req, res) => {
  const role = getRole(req);
  if (role !== 'Администратор' && role !== 'Директор') {
    return res.status(403).json({ error: 'Недостаточно прав' });
  }

  const { student_id, order_info, transfer_date, from_class_id, to_class_id } = req.body;

  if (!student_id || !transfer_date || !to_class_id) {
    return res.status(400).json({ error: 'Укажи ID, дату перевода и класс назначения' });
  }

  try {
    const realId = await findStudentIdByUnique(student_id);
    if (!realId) return res.status(400).json({ error: 'Учащийся с таким ID не найден' });

    await db.query(
      `INSERT INTO movement_events (student_id, event_type, event_date, order_info, from_class_id, to_class_id)
       VALUES (?, 'transfer', ?, ?, ?, ?)`,
      [realId, transfer_date, order_info || null, from_class_id || null, to_class_id || null]
    );

    await db.query(`UPDATE students SET status = 'moved', class_id = ? WHERE id = ?`, [to_class_id || null, realId]);

    res.json({ success: true });
  } catch (err) {
    console.error('TRANSFER ERROR:', err);
    res.status(500).json({ error: 'Ошибка сервера при переводе' });
  }
});


router.post('/expel', async (req, res) => {
  const role = getRole(req);
  console.log('Expel: роль пользователя =', role); 
  
  if (role !== 'Администратор' && role !== 'Директор') {
    return res.status(403).json({ error: 'Недостаточно прав' });
  }

  const { student_id, order_info, expel_date, reason } = req.body;

  if (!student_id || !expel_date || !reason) {
    return res.status(400).json({ error: 'Укажи ID, дату отчисления и причину' });
  }

  try {
    const realId = await findStudentIdByUnique(student_id);
    if (!realId) return res.status(400).json({ error: 'Учащийся с таким ID не найден' });

    await db.query(
      `INSERT INTO movement_events (student_id, event_type, event_date, order_info, reason)
       VALUES (?, 'expel', ?, ?, ?)`,
      [realId, expel_date, order_info || null, reason]
    );

    await db.query(
      `UPDATE students SET status = 'expelled', expel_date = ?, expel_reason = ?, expel_order = ?, class_id = NULL WHERE id = ?`,
      [expel_date, reason, order_info || null, realId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('EXPEL ERROR:', err);
    res.status(500).json({ error: 'Ошибка сервера при отчислении' });
  }
});


router.get('/export', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT me.event_date, me.event_type, s.unique_id,
             s.lastname, s.firstname, s.middlename,
             cf.name AS from_class, ct.name AS to_class,
             me.order_info, me.reason
      FROM movement_events me
      LEFT JOIN students s ON me.student_id = s.id
      LEFT JOIN classes cf ON me.from_class_id = cf.id
      LEFT JOIN classes ct ON me.to_class_id = ct.id
      ORDER BY me.event_date DESC, me.id DESC
      LIMIT 1000
    `);

    let csv = 'Дата;Тип;ID;Фамилия;Имя;Отчество;Из класса;В класс;Приказ;Причина\n';
    rows.forEach(r => {
      const date = r.event_date ? new Date(r.event_date).toLocaleDateString('ru-RU') : '';
      let type = r.event_type === 'enroll' ? 'зачисление' : r.event_type === 'transfer' ? 'перевод' : 'отчисление';
      csv += [date, type, r.unique_id || '', r.lastname || '', r.firstname || '', r.middlename || '', r.from_class || '', r.to_class || '', r.order_info || '', r.reason || ''].join(';') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="movement.csv"');
    res.send('\uFEFF' + csv);
  } catch (err) {
    console.error('MOVEMENT EXPORT ERROR:', err);
    res.status(500).json({ error: 'Ошибка сервера при экспорте' });
  }
});

module.exports = router;