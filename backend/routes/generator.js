const express = require('express');
const router = express.Router();
const { Class, Student, Rule, Room, Seat, Area } = require('../models');
const { generateSeatingPlan } = require('../services/seatingAlgorithm');

router.post('/generate', async (req, res) => {
  try {
    const { classId, roomId, fillMode, personsPerArea } = req.body;

    if (!classId || !roomId) {
      return res.status(400).json({ error: 'Klasse und Zimmer müssen gewählt werden' });
    }

    const students = await Student.findAll({
      where: { class_id: classId },
      order: [['name', 'ASC']],
    });

    const seats = await Seat.findAll({
      where: { room_id: roomId },
      order: [['seat_number', 'ASC']],
    });

    const rules = await Rule.findAll({
      where: { class_id: classId },
    });

    const areas = await Area.findAll({
      where: { room_id: roomId },
      order: [['sort_order', 'ASC']],
    });

    const room = await Room.findByPk(roomId);
    if (!room) return res.status(404).json({ error: 'Zimmer nicht gefunden' });

    if (seats.length === 0) {
      return res.status(400).json({ error: 'Das Zimmer hat noch keine Sitzplätze' });
    }

    if (students.length > seats.length) {
      return res.status(400).json({
        error: `Zu wenig Plätze: ${students.length} Lernende, aber nur ${seats.length} Plätze`,
      });
    }

    const result = generateSeatingPlan(
      students.map(s => s.toJSON()),
      seats.map(s => s.toJSON()),
      rules.map(r => r.toJSON()),
      {
        areas: areas.map(a => a.toJSON()),
        fillMode: fillMode || 'sequential',
        personsPerArea: parseInt(personsPerArea) || 0,
      }
    );

    res.json({
      ...result,
      room: {
        id: room.id,
        name: room.name,
        floorplan_image_path: room.floorplan_image_path,
        image_width: room.image_width,
        image_height: room.image_height,
      },
      areas: areas.map(a => a.toJSON()),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
