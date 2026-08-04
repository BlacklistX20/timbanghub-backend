const { sequelize } = require('../config/db');
const Scale = require('./Scale');
const ScaleReading = require('./ScaleReading');
const ScaleStatus = require('./ScaleStatus');
const ScaleStatusLog = require('./ScaleStatusLog');
const User = require('./User');

// Relasi: 1 timbangan punya banyak data berat
Scale.hasMany(ScaleReading, { foreignKey: 'scaleId', as: 'readings', onDelete: 'CASCADE' });
ScaleReading.belongsTo(Scale, { foreignKey: 'scaleId' });

// Relasi: 1 timbangan punya 1 status terkini
Scale.hasOne(ScaleStatus, { foreignKey: 'scaleId', as: 'status', onDelete: 'CASCADE' });
ScaleStatus.belongsTo(Scale, { foreignKey: 'scaleId' });

// Relasi: 1 timbangan punya banyak riwayat log status (audit trail)
Scale.hasMany(ScaleStatusLog, { foreignKey: 'scaleId', as: 'statusLogs', onDelete: 'CASCADE' });
ScaleStatusLog.belongsTo(Scale, { foreignKey: 'scaleId' });

module.exports = {
  sequelize,
  Scale,
  ScaleReading,
  ScaleStatus,
  ScaleStatusLog,
  User,
};
