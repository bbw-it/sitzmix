const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Seat = sequelize.define('Seat', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  room_id: { type: DataTypes.INTEGER, allowNull: false },
  seat_number: { type: DataTypes.INTEGER, allowNull: false },
  x_position: { type: DataTypes.FLOAT, allowNull: false },
  y_position: { type: DataTypes.FLOAT, allowNull: false },
}, {
  tableName: 'seats',
  timestamps: false,
});

module.exports = Seat;
