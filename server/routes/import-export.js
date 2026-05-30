const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const multer = require('multer');
const xlsx = require('xlsx');
const path = require('path');

const upload = multer({ dest: 'uploads/' });

function getRole(req) {
  return req.session?.user?.role;
}


router.post('/import', upload.single('file'), async (req, res) => {
  const role = getRole(req);
  if (role !== 'Администратор') {
    return res.status(403).json({ error: 'Недостаточно прав' });
  }

  if (!req.file) return res.status(400).json({ error: 'Файл не загружен' });

  const mode = req.body.mode || 'upsert_students';
  const schoolYear = req.body.school_year || null;

  try {
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    let success = 0, errors = 0, errorList = [];

    if (mode === 'mass_enroll') {
      for (const row of data) {
        try {
          const uniqueId = row['ID'] || row['unique_id'];
          if (!uniqueId) { errors++; errorList.push(`Строка без ID`); continue; }

          const [students] = await db.query('SELECT id FROM students WHERE unique_id = ?', [uniqueId]);
          if (!students.length) { errors++; errorList.push(`Ученик ${uniqueId} не найден`); continue; }

          const studentId = students[0].id;
          const classId = row['class_id'] || null;
          const enrollDate = row['enroll_date'] || new Date().toISOString().slice(0, 10);
          const orderInfo = row['order_info'] || '';

          await db.query(`INSERT INTO movement_events (student_id, event_type, event_date, order_info, to_class_id) VALUES (?, 'enroll', ?, ?, ?)`, [studentId, enrollDate, orderInfo, classId]);
          await db.query(`UPDATE students SET status = 'enrolled', class_id = ?, school_year_id = ?, expel_date = NULL, expel_reason = NULL, expel_order = NULL WHERE id = ?`, [classId, schoolYear, studentId]);
          success++;
        } catch (err) { errors++; errorList.push(`Ошибка: ${err.message}`); }
      }
    } else if (mode === 'upsert_students') {
      for (const row of data) {
        try {
          const uniqueId = row['ID'] || row['unique_id'] || `U-${Date.now().toString().slice(-6)}`;
          const lastname = row['Фамилия'] || row['lastname'];
          const firstname = row['Имя'] || row['firstname'];
          if (!lastname || !firstname) { errors++; errorList.push(`Не хватает ФИО`); continue; }

          const [existing] = await db.query('SELECT id FROM students WHERE unique_id = ?', [uniqueId]);

          if (existing.length) {
            await db.query(`UPDATE students SET lastname = ?, firstname = ?, middlename = ?, birth_date = ?, gender = ?, address = ?, phone = ?, parent_name = ?, parent_phone = ? WHERE unique_id = ?`,
              [lastname, firstname, row['middlename'] || null, row['birth_date'] || null, row['gender'] || null, row['address'] || null, row['phone'] || null, row['parent_name'] || null, row['parent_phone'] || null, uniqueId]);
          } else {
            await db.query(`INSERT INTO students (unique_id, lastname, firstname, middlename, birth_date, gender, address, phone, parent_name, parent_phone, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
              [uniqueId, lastname, firstname, row['middlename'] || null, row['birth_date'] || null, row['gender'] || null, row['address'] || null, row['phone'] || null, row['parent_name'] || null, row['parent_phone'] || null]);
          }
          success++;
        } catch (err) { errors++; errorList.push(`Ошибка: ${err.message}`); }
      }
    }

    res.json({ success, errors, errorList });
  } catch (err) {
    console.error('IMPORT ERROR:', err);
    res.status(500).json({ error: 'Ошибка сервера при импорте' });
  }
});


router.get('/export', async (req, res) => {
  const role = getRole(req);
  if (!['Администратор', 'Директор', 'Заведующая'].includes(role)) {
    return res.status(403).json({ error: 'Недостаточно прав' });
  }

  const { what, format } = req.query;

  try {
    let data = [], filename = 'export';

    if (what === 'students') {
      const [rows] = await db.query(`
        SELECT s.unique_id, s.lastname, s.firstname, s.middlename, s.birth_date, s.gender, c.name AS class_name, sy.year_name, s.form_of_study, s.status, s.phone, s.parent_name, s.parent_phone
        FROM students s LEFT JOIN classes c ON s.class_id = c.id LEFT JOIN school_years sy ON s.school_year_id = sy.id
        WHERE s.status IN ('active', 'enrolled') ORDER BY s.lastname, s.firstname
      `);
      data = rows; filename = 'students';
    } else if (what === 'archive') {
      const [rows] = await db.query(`
        SELECT s.unique_id, s.lastname, s.firstname, s.middlename, s.expel_date, s.expel_reason, s.expel_order
        FROM students s WHERE s.status = 'expelled' ORDER BY s.expel_date DESC
      `);
      data = rows; filename = 'archive';
    } else if (what === 'reports') {
      const [rows] = await db.query(`
        SELECT c.name AS class_name, c.parallel, COUNT(s.id) AS total_students
        FROM classes c LEFT JOIN students s ON s.class_id = c.id AND s.status IN ('active', 'enrolled')
        GROUP BY c.id ORDER BY c.parallel, c.name
      `);
      data = rows; filename = 'report';
    }

    if (format === 'csv') {
      let csv = Object.keys(data[0] || {}).join(';') + '\n';
      data.forEach(row => { csv += Object.values(row).map(v => v || '').join(';') + '\n'; });
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      res.send('\uFEFF' + csv);
    } else if (format === 'xlsx') {
      const ws = xlsx.utils.json_to_sheet(data);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
      const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
      res.send(buffer);
    } else {
      res.status(400).json({ error: 'Неизвестный формат' });
    }
  } catch (err) {
    console.error('EXPORT ERROR:', err);
    res.status(500).json({ error: 'Ошибка сервера при экспорте' });
  }
});

module.exports = router;