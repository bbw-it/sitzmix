const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Room = sequelize.define('Room', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  floorplan_image_path: { type: DataTypes.STRING(500), allowNull: true },
  image_width: { type: DataTypes.INTEGER, defaultValue: 0 },
  image_height: { type: DataTypes.INTEGER, defaultValue: 0 },
}, {
  tableName: 'rooms',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = Room;
