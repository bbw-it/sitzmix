const express = require('express');
const router = express.Router();
const { Area } = require('../models');

// Get areas for a room
router.get('/rooms/:roomId/areas', async (req, res) => {
  try {
    const areas = await Area.findAll({
      where: { room_id: req.params.roomId },
      order: [['sort_order', 'ASC']],
    });
    res.json(areas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk replace areas for a room
router.put('/rooms/:roomId/areas', async (req, res) => {
  try {
    const { areas } = req.body;
    await Area.destroy({ where: { room_id: req.params.roomId } });
    if (areas && areas.length > 0) {
      const newAreas = areas.map((a, i) => ({
        room_id: parseInt(req.params.roomId),
        name: a.name,
        color: a.color || '#C4B5FD',
        sort_order: a.sort_order !== undefined ? a.sort_order : i,
        x_pos: a.x_pos !== undefined ? a.x_pos : 20,
        y_pos: a.y_pos !== undefined ? a.y_pos : 20,
        width_pct: a.width_pct !== undefined ? a.width_pct : 20,
        height_pct: a.height_pct !== undefined ? a.height_pct : 20,
      }));
      await Area.bulkCreate(newAreas);
    }
    const result = await Area.findAll({
      where: { room_id: req.params.roomId },
      order: [['sort_order', 'ASC']],
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
