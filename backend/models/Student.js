const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PASTEL_COLORS = [
  '#FFB3BA', '#FFDFBA', '#FFFFBA', '#BAFFC9',
  '#BAE1FF', '#E8BAFF', '#FFB3E6', '#B3FFE6',
  '#FFE6B3', '#B3D4FF', '#D4FFB3', '#FFB3B3',
];

const Student = sequelize.define('Student', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  class_id: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(200), allowNull: false },
  color: { type: DataTypes.STRING(7), allowNull: false, defaultValue: '#A0C4FF' },
}, {
  tableName: 'students',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
});

Student.PASTEL_COLORS = PASTEL_COLORS;

module.exports = Student;
