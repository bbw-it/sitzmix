const express = require('express');
const router = express.Router();
const { sequelize, Class, Student, Rule, Room, Seat, Area } = require('../models');

// ─── Export ─────────────────────────────────────────────────
// GET /api/export?classIds=1,2&roomIds=3,4

router.get('/export', async (req, res) => {
  try {
    const classIds = (req.query.classIds || '').split(',').map(Number).filter(Boolean);
    const roomIds = (req.query.roomIds || '').split(',').map(Number).filter(Boolean);

    if (classIds.length === 0 && roomIds.length === 0) {
      return res.status(400).json({ error: 'Keine Klassen oder Zimmer ausgewählt.' });
    }

    // Classes with students and rules
    const classes = [];
    for (const id of classIds) {
      const cls = await Class.findByPk(id, {
        include: [
          { model: Student, as: 'students', order: [['id', 'ASC']] },
          { model: Rule, as: 'rules', include: [
            { model: Student, as: 'studentA' },
            { model: Student, as: 'studentB' },
          ]},
        ],
      });
      if (!cls) continue;

      classes.push({
        name: cls.name,
        students: cls.students.map(s => ({ name: s.name, color: s.color })),
        rules: cls.rules.map(r => ({
          studentA: r.studentA?.name,
          studentB: r.studentB?.name,
        })).filter(r => r.studentA && r.studentB),
      });
    }

    // Rooms with seats and areas
    const rooms = [];
    for (const id of roomIds) {
      const room = await Room.findByPk(id, {
        include: [
          { model: Seat, as: 'seats', include: [{ model: Area, as: 'area' }] },
          { model: Area, as: 'areas' },
        ],
      });
      if (!room) continue;

      const areaMap = new Map(room.areas.map(a => [a.id, a.name]));

      rooms.push({
        name: room.name,
        image_width: room.image_width,
        image_height: room.image_height,
        areas: room.areas
          .sort((a, b) => a.sort_order - b.sort_order)
          .map(a => ({
            name: a.name,
            color: a.color,
            sort_order: a.sort_order,
            x_pos: a.x_pos,
            y_pos: a.y_pos,
            width_pct: a.width_pct,
            height_pct: a.height_pct,
          })),
        seats: room.seats
          .sort((a, b) => a.seat_number - b.seat_number)
          .map(s => ({
            seat_number: s.seat_number,
            x_position: s.x_position,
            y_position: s.y_position,
            area_name: s.area_id ? (areaMap.get(s.area_id) || null) : null,
          })),
      });
    }

    const data = {
      type: 'sitzmix-export',
      version: 1,
      exportedAt: new Date().toISOString(),
      classes,
      rooms,
    };

    const dateStr = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Disposition', `attachment; filename="sitzmix-export-${dateStr}.json"`);
    res.setHeader('Content-Type', 'application/json');
    res.json(data);
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Import ─────────────────────────────────────────────────
// POST /api/import

router.post('/import', express.json({ limit: '10mb' }), async (req, res) => {
  try {
    const data = req.body;

    if (data.type !== 'sitzmix-export' || !data.version) {
      return res.status(400).json({ error: 'Ungültiges Dateiformat.' });
    }
    if (data.version > 1) {
      return res.status(400).json({ error: `Version ${data.version} wird nicht unterstützt.` });
    }

    const summary = { classes: 0, students: 0, rules: 0, rooms: 0, seats: 0, areas: 0 };

    const t = await sequelize.transaction();
    try {
      // Import classes
      for (const cls of (data.classes || [])) {
        // Unique name
        let name = cls.name;
        const existing = await Class.findOne({ where: { name }, transaction: t });
        if (existing) name = `${name} (Import)`;

        const newClass = await Class.create({ name }, { transaction: t });
        summary.classes++;

        // Students
        const studentMap = new Map();
        for (const s of (cls.students || [])) {
          const student = await Student.create({
            class_id: newClass.id,
            name: s.name,
            color: s.color || '#A0C4FF',
          }, { transaction: t });
          studentMap.set(s.name, student.id);
          summary.students++;
        }

        // Rules
        for (const r of (cls.rules || [])) {
          const aId = studentMap.get(r.studentA);
          const bId = studentMap.get(r.studentB);
          if (aId && bId) {
            await Rule.create({
              class_id: newClass.id,
              student_a_id: aId,
              student_b_id: bId,
            }, { transaction: t });
            summary.rules++;
          }
        }
      }

      // Import rooms
      for (const room of (data.rooms || [])) {
        let name = room.name;
        const existing = await Room.findOne({ where: { name }, transaction: t });
        if (existing) name = `${name} (Import)`;

        const newRoom = await Room.create({
          name,
          floorplan_image_path: null,
          image_width: room.image_width || 0,
          image_height: room.image_height || 0,
        }, { transaction: t });
        summary.rooms++;

        // Areas
        const areaNameMap = new Map();
        for (const a of (room.areas || [])) {
          const newArea = await Area.create({
            room_id: newRoom.id,
            name: a.name,
            color: a.color || '#C4B5FD',
            sort_order: a.sort_order || 0,
            x_pos: a.x_pos ?? 20,
            y_pos: a.y_pos ?? 20,
            width_pct: a.width_pct ?? 20,
            height_pct: a.height_pct ?? 20,
          }, { transaction: t });
          areaNameMap.set(a.name, newArea.id);
          summary.areas++;
        }

        // Seats
        for (const s of (room.seats || [])) {
          await Seat.create({
            room_id: newRoom.id,
            seat_number: s.seat_number,
            x_position: s.x_position,
            y_position: s.y_position,
            area_id: s.area_name ? (areaNameMap.get(s.area_name) || null) : null,
          }, { transaction: t });
          summary.seats++;
        }
      }

      await t.commit();
      res.json({ success: true, imported: summary });
    } catch (err) {
      await t.rollback();
      throw err;
    }
  } catch (err) {
    console.error('Import error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
