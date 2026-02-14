const express = require('express');
const router = express.Router();
const { Rule, Student } = require('../models');

// List rules for a class
router.get('/classes/:classId/rules', async (req, res) => {
  try {
    const rules = await Rule.findAll({
      where: { class_id: req.params.classId },
      include: [
        { model: Student, as: 'studentA', attributes: ['id', 'name', 'color'] },
        { model: Student, as: 'studentB', attributes: ['id', 'name', 'color'] },
      ],
    });
    res.json(rules);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create rule
router.post('/classes/:classId/rules', async (req, res) => {
  try {
    let { studentAId, studentBId } = req.body;
    if (!studentAId || !studentBId) {
      return res.status(400).json({ error: 'Beide Schüler müssen gewählt werden' });
    }
    if (studentAId === studentBId) {
      return res.status(400).json({ error: 'Zwei verschiedene Schüler wählen' });
    }
    // Canonical ordering
    if (studentAId > studentBId) {
      [studentAId, studentBId] = [studentBId, studentAId];
    }
    // Check for existing
    const existing = await Rule.findOne({
      where: { class_id: req.params.classId, student_a_id: studentAId, student_b_id: studentBId },
    });
    if (existing) {
      return res.status(409).json({ error: 'Diese Regel existiert bereits' });
    }
    const rule = await Rule.create({
      class_id: req.params.classId,
      student_a_id: studentAId,
      student_b_id: studentBId,
    });
    const full = await Rule.findByPk(rule.id, {
      include: [
        { model: Student, as: 'studentA', attributes: ['id', 'name', 'color'] },
        { model: Student, as: 'studentB', attributes: ['id', 'name', 'color'] },
      ],
    });
    res.status(201).json(full);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete rule
router.delete('/rules/:id', async (req, res) => {
  try {
    const rule = await Rule.findByPk(req.params.id);
    if (!rule) return res.status(404).json({ error: 'Regel nicht gefunden' });
    await rule.destroy();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
