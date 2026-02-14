const express = require('express');
const router = express.Router();
const { Class, Student, Rule } = require('../models');
const { fn, col } = require('sequelize');

// List all classes with student count
router.get('/', async (req, res) => {
  try {
    const classes = await Class.findAll({
      include: [{ model: Student, as: 'students', attributes: ['id'] }],
      order: [['name', 'ASC']],
    });
    const result = classes.map(c => ({
      id: c.id,
      name: c.name,
      studentCount: c.students.length,
      created_at: c.created_at,
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single class with students and rules
router.get('/:id', async (req, res) => {
  try {
    const cls = await Class.findByPk(req.params.id, {
      include: [
        { model: Student, as: 'students', order: [['name', 'ASC']] },
        {
          model: Rule,
          as: 'rules',
          include: [
            { model: Student, as: 'studentA', attributes: ['id', 'name', 'color'] },
            { model: Student, as: 'studentB', attributes: ['id', 'name', 'color'] },
          ],
        },
      ],
    });
    if (!cls) return res.status(404).json({ error: 'Klasse nicht gefunden' });
    res.json(cls);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create class
router.post('/', async (req, res) => {
  try {
    const cls = await Class.create({ name: req.body.name || 'Neue Klasse' });
    res.status(201).json(cls);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update class
router.put('/:id', async (req, res) => {
  try {
    const cls = await Class.findByPk(req.params.id);
    if (!cls) return res.status(404).json({ error: 'Klasse nicht gefunden' });
    await cls.update({ name: req.body.name });
    res.json(cls);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete class
router.delete('/:id', async (req, res) => {
  try {
    const cls = await Class.findByPk(req.params.id);
    if (!cls) return res.status(404).json({ error: 'Klasse nicht gefunden' });
    await cls.destroy();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
