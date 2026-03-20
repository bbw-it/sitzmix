const sequelize = require('../config/database');
const Class = require('./Class');
const Student = require('./Student');
const Rule = require('./Rule');
const Room = require('./Room');
const Seat = require('./Seat');
const Area = require('./Area');

// Associations
Class.hasMany(Student, { foreignKey: 'class_id', as: 'students', onDelete: 'CASCADE' });
Student.belongsTo(Class, { foreignKey: 'class_id', as: 'class' });

Class.hasMany(Rule, { foreignKey: 'class_id', as: 'rules', onDelete: 'CASCADE' });
Rule.belongsTo(Class, { foreignKey: 'class_id', as: 'class' });

Rule.belongsTo(Student, { foreignKey: 'student_a_id', as: 'studentA' });
Rule.belongsTo(Student, { foreignKey: 'student_b_id', as: 'studentB' });

Room.hasMany(Seat, { foreignKey: 'room_id', as: 'seats', onDelete: 'CASCADE' });
Seat.belongsTo(Room, { foreignKey: 'room_id', as: 'room' });

Room.hasMany(Area, { foreignKey: 'room_id', as: 'areas', onDelete: 'CASCADE' });
Area.belongsTo(Room, { foreignKey: 'room_id', as: 'room' });

Area.hasMany(Seat, { foreignKey: 'area_id', as: 'seats' });
Seat.belongsTo(Area, { foreignKey: 'area_id', as: 'area' });

module.exports = {
  sequelize,
  Class,
  Student,
  Rule,
  Room,
  Seat,
  Area,
};
