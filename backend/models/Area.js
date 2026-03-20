const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AREA_COLORS = [
  '#C4B5FD', '#93C5FD', '#86EFAC',
  '#FCA5A5', '#FDBA74', '#FDE68A',
];

const Area = sequelize.define('Area', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  room_id: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(100), allowNull: false },
  color: { type: DataTypes.STRING(7), allowNull: false, defaultValue: '#C4B5FD' },
  sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  x_pos: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 20 },
  y_pos: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 20 },
  width_pct: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 20 },
  height_pct: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 20 },
}, {
  tableName: 'areas',
  timestamps: false,
});

Area.AREA_COLORS = AREA_COLORS;

module.exports = Area;
