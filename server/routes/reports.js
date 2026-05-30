const express = require('express');
const router = express.Router();
const db = require('../db/connection');

router.get('/', async (req, res) => {
  const { type, as_of, from, to } = req.query;

  try {
    let data = [];
    switch (type) {
      case 'current_by_class': data = await reportCurrentByClass(as_of); break;
      case 'movement_period': data = await reportMovementPeriod(from, to); break;
      case 'summary_parallel_year': data = await reportSummaryParallelYear(); break;
      case 'arrived_left_period': data = await reportArrivedLeftPeriod(from, to); break;
      default: return res.status(400).json({ error: 'Укажи тип отчета' });
    }
    res.json(data);
  } catch (err) {
    console.error('REPORTS ERROR:', err);
    res.status(500).json({ error: 'Ошибка сервера при формировании отчета' });
  }
});

async function reportCurrentByClass(asOf) {
  const date = asOf || new Date().toISOString().slice(0, 10);
  const [rows] = await db.query(`
    SELECT c.name AS class_name, c.parallel, COUNT(s.id) AS total_students,
           SUM(CASE WHEN s.gender = 'm' THEN 1 ELSE 0 END) AS male,
           SUM(CASE WHEN s.gender = 'f' THEN 1 ELSE 0 END) AS female
    FROM classes c LEFT JOIN students s ON s.class_id = c.id AND s.status IN ('active', 'enrolled') AND (s.expel_date IS NULL OR s.expel_date > ?)
    GROUP BY c.id ORDER BY c.parallel, c.name
  `, [date]);
  return rows;
}

async function reportMovementPeriod(from, to) {
  let sql = `SELECT me.event_date, me.event_type, s.unique_id, CONCAT(s.lastname, ' ', s.firstname, ' ', IFNULL(s.middlename, '')) AS fio, cf.name AS from_class, ct.name AS to_class, me.order_info, me.reason
             FROM movement_events me LEFT JOIN students s ON me.student_id = s.id LEFT JOIN classes cf ON me.from_class_id = cf.id LEFT JOIN classes ct ON me.to_class_id = ct.id WHERE 1=1`;
  const params = [];
  if (from) { sql += ' AND me.event_date >= ?'; params.push(from); }
  if (to) { sql += ' AND me.event_date <= ?'; params.push(to); }
  sql += ' ORDER BY me.event_date DESC, me.id DESC';
  const [rows] = await db.query(sql, params);
  return rows;
}

async function reportSummaryParallelYear() {
  const [rows] = await db.query(`
    SELECT c.parallel, sy.year_name, COUNT(s.id) AS total_students
    FROM students s LEFT JOIN classes c ON s.class_id = c.id LEFT JOIN school_years sy ON s.school_year_id = sy.id
    WHERE s.status IN ('active', 'enrolled') GROUP BY c.parallel, sy.year_name ORDER BY c.parallel, sy.year_name
  `);
  return rows;
}

async function reportArrivedLeftPeriod(from, to) {
  let sql = `SELECT me.event_type, COUNT(me.id) AS count FROM movement_events me WHERE 1=1`;
  const params = [];
  if (from) { sql += ' AND me.event_date >= ?'; params.push(from); }
  if (to) { sql += ' AND me.event_date <= ?'; params.push(to); }
  sql += ' GROUP BY me.event_type';
  const [rows] = await db.query(sql, params);
  return rows;
}

router.get('/export', async (req, res) => {
  const { type, as_of, from, to } = req.query;
  try {
    let data = [], csv = '';
    switch (type) {
      case 'current_by_class':
        data = await reportCurrentByClass(as_of);
        csv = 'Класс;Параллель;Всего;Мальчиков;Девочек\n';
        data.forEach(r => { csv += `${r.class_name || ''};${r.parallel || ''};${r.total_students || 0};${r.male || 0};${r.female || 0}\n`; });
        break;
      case 'movement_period':
        data = await reportMovementPeriod(from, to);
        csv = 'Дата;Тип;ID;ФИО;Из класса;В класс;Приказ;Причина\n';
        data.forEach(r => {
          const date = r.event_date ? new Date(r.event_date).toLocaleDateString('ru-RU') : '';
          let typeText = r.event_type === 'enroll' ? 'зачисление' : r.event_type === 'transfer' ? 'перевод' : 'отчисление';
          csv += `${date};${typeText};${r.unique_id || ''};${r.fio || ''};${r.from_class || ''};${r.to_class || ''};${r.order_info || ''};${r.reason || ''}\n`;
        });
        break;
      case 'summary_parallel_year':
        data = await reportSummaryParallelYear();
        csv = 'Параллель;Учебный год;Всего учащихся\n';
        data.forEach(r => { csv += `${r.parallel || ''};${r.year_name || ''};${r.total_students || 0}\n`; });
        break;
      case 'arrived_left_period':
        data = await reportArrivedLeftPeriod(from, to);
        csv = 'Тип события;Количество\n';
        data.forEach(r => {
          let typeText = r.event_type === 'enroll' ? 'Зачислено' : r.event_type === 'transfer' ? 'Переведено' : 'Отчислено';
          csv += `${typeText};${r.count || 0}\n`;
        });
        break;
      default: return res.status(400).json({ error: 'Укажи тип отчета' });
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="report.csv"');
    res.send('\uFEFF' + csv);
  } catch (err) {
    console.error('REPORTS EXPORT ERROR:', err);
    res.status(500).json({ error: 'Ошибка сервера при экспорте отчета' });
  }
});

module.exports = router;