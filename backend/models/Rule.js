const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Rule = sequelize.define('Rule', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  class_id: { type: DataTypes.INTEGER, allowNull: false },
  student_a_id: { type: DataTypes.INTEGER, allowNull: false },
  student_b_id: { type: DataTypes.INTEGER, allowNull: false },
}, {
  tableName: 'rules',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
});

module.exports = Rule;
