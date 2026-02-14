const sequelize = require('../config/database');
const Class = require('./Class');
const Student = require('./Student');
const Rule = require('./Rule');
const Room = require('./Room');
const Seat = require('./Seat');
const Setting = require('./Setting');

// Associations
Class.hasMany(Student, { foreignKey: 'class_id', as: 'students', onDelete: 'CASCADE' });
Student.belongsTo(Class, { foreignKey: 'class_id', as: 'class' });

Class.hasMany(Rule, { foreignKey: 'class_id', as: 'rules', onDelete: 'CASCADE' });
Rule.belongsTo(Class, { foreignKey: 'class_id', as: 'class' });

Rule.belongsTo(Student, { foreignKey: 'student_a_id', as: 'studentA' });
Rule.belongsTo(Student, { foreignKey: 'student_b_id', as: 'studentB' });

Room.hasMany(Seat, { foreignKey: 'room_id', as: 'seats', onDelete: 'CASCADE' });
Seat.belongsTo(Room, { foreignKey: 'room_id', as: 'room' });

module.exports = {
  sequelize,
  Class,
  Student,
  Rule,
  Room,
  Seat,
  Setting,
};
