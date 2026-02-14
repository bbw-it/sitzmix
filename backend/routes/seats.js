const express = require('express');
const router = express.Router();
const { Seat } = require('../models');

// Get seats for a room
router.get('/rooms/:roomId/seats', async (req, res) => {
  try {
    const seats = await Seat.findAll({
      where: { room_id: req.params.roomId },
      order: [['seat_number', 'ASC']],
    });
    res.json(seats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk update seats (replace all)
router.put('/rooms/:roomId/seats', async (req, res) => {
  try {
    const { seats } = req.body;
    // Delete all existing seats for this room
    await Seat.destroy({ where: { room_id: req.params.roomId } });
    // Create new seats
    if (seats && seats.length > 0) {
      const newSeats = seats.map(s => ({
        room_id: parseInt(req.params.roomId),
        seat_number: s.seat_number,
        x_position: s.x_position,
        y_position: s.y_position,
      }));
      await Seat.bulkCreate(newSeats);
    }
    // Return updated list
    const result = await Seat.findAll({
      where: { room_id: req.params.roomId },
      order: [['seat_number', 'ASC']],
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
