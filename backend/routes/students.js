const express = require('express');
const router = express.Router();
const { Student } = require('../models');

const PASTEL_COLORS = Student.PASTEL_COLORS;

// List students in a class
router.get('/classes/:classId/students', async (req, res) => {
  try {
    const students = await Student.findAll({
      where: { class_id: req.params.classId },
      order: [['name', 'ASC']],
    });
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add single student
router.post('/classes/:classId/students', async (req, res) => {
  try {
    const count = await Student.count({ where: { class_id: req.params.classId } });
    const color = PASTEL_COLORS[count % PASTEL_COLORS.length];
    const student = await Student.create({
      class_id: req.params.classId,
      name: req.body.name,
      color,
    });
    res.status(201).json(student);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk add students
router.post('/classes/:classId/students/bulk', async (req, res) => {
  try {
    const text = req.body.students || '';
    const names = text
      .split(/[\n,;]+/)
      .map(n => n.trim())
      .filter(n => n.length > 0);

    if (names.length === 0) {
      return res.status(400).json({ error: 'Keine Namen angegeben' });
    }

    const count = await Student.count({ where: { class_id: req.params.classId } });
    const students = [];
    for (let i = 0; i < names.length; i++) {
      const color = PASTEL_COLORS[(count + i) % PASTEL_COLORS.length];
      const student = await Student.create({
        class_id: req.params.classId,
        name: names[i],
        color,
      });
      students.push(student);
    }
    res.status(201).json(students);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update student
router.put('/students/:id', async (req, res) => {
  try {
    const student = await Student.findByPk(req.params.id);
    if (!student) return res.status(404).json({ error: 'Schüler nicht gefunden' });
    await student.update({ name: req.body.name, color: req.body.color || student.color });
    res.json(student);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete student
router.delete('/students/:id', async (req, res) => {
  try {
    const student = await Student.findByPk(req.params.id);
    if (!student) return res.status(404).json({ error: 'Schüler nicht gefunden' });
    await student.destroy();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
