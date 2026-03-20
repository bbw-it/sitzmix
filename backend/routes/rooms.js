const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const sizeOf = require('image-size');
const { Room, Seat, Area } = require('../models');
const upload = require('../middleware/upload');

// List all rooms with seat count
router.get('/', async (req, res) => {
  try {
    const rooms = await Room.findAll({
      include: [
        { model: Seat, as: 'seats', attributes: ['id'] },
        { model: Area, as: 'areas', attributes: ['id'] },
      ],
      order: [['name', 'ASC']],
    });
    const result = rooms.map(r => ({
      id: r.id,
      name: r.name,
      seatCount: r.seats.length,
      hasAreas: r.areas.length > 0,
      areaCount: r.areas.length,
      floorplan_image_path: r.floorplan_image_path,
      image_width: r.image_width,
      image_height: r.image_height,
      created_at: r.created_at,
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single room with seats
router.get('/:id', async (req, res) => {
  try {
    const room = await Room.findByPk(req.params.id, {
      include: [
        { model: Seat, as: 'seats' },
        { model: Area, as: 'areas', order: [['sort_order', 'ASC']] },
      ],
      order: [[{ model: Seat, as: 'seats' }, 'seat_number', 'ASC']],
    });
    if (!room) return res.status(404).json({ error: 'Zimmer nicht gefunden' });
    res.json(room);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create room
router.post('/', async (req, res) => {
  try {
    const room = await Room.create({ name: req.body.name || 'Neues Zimmer' });
    res.status(201).json(room);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update room
router.put('/:id', async (req, res) => {
  try {
    const room = await Room.findByPk(req.params.id);
    if (!room) return res.status(404).json({ error: 'Zimmer nicht gefunden' });
    await room.update({ name: req.body.name });
    res.json(room);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete room
router.delete('/:id', async (req, res) => {
  try {
    const room = await Room.findByPk(req.params.id);
    if (!room) return res.status(404).json({ error: 'Zimmer nicht gefunden' });
    // Delete floorplan file
    if (room.floorplan_image_path) {
      const filePath = path.join(__dirname, '..', 'uploads', room.floorplan_image_path);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await room.destroy();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload floorplan image
router.post('/:id/floorplan', upload.single('floorplan'), async (req, res) => {
  try {
    const room = await Room.findByPk(req.params.id);
    if (!room) return res.status(404).json({ error: 'Zimmer nicht gefunden' });

    // Delete old image
    if (room.floorplan_image_path) {
      const oldPath = path.join(__dirname, '..', 'uploads', room.floorplan_image_path);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const dimensions = sizeOf(req.file.path);
    await room.update({
      floorplan_image_path: req.file.filename,
      image_width: dimensions.width,
      image_height: dimensions.height,
    });
    res.json(room);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete floorplan image
router.delete('/:id/floorplan', async (req, res) => {
  try {
    const room = await Room.findByPk(req.params.id);
    if (!room) return res.status(404).json({ error: 'Zimmer nicht gefunden' });
    if (room.floorplan_image_path) {
      const filePath = path.join(__dirname, '..', 'uploads', room.floorplan_image_path);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await room.update({ floorplan_image_path: null, image_width: 0, image_height: 0 });
    res.json(room);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
