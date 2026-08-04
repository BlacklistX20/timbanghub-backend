const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

// Riwayat / audit trail setiap perubahan status timbangan (insert-only)
const ScaleStatusLog = sequelize.define('ScaleStatusLog', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  },
  scaleId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('connected', 'disconnected', 'error', 'unknown'),
    allowNull: false,
  },
  message: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'Pesan error / keterangan tambahan jika ada',
  },
  occurredAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'Waktu perubahan status terjadi',
  },
}, {
  tableName: 'scale_status_logs',
  timestamps: false, // audit log pakai occurred_at sendiri, bukan createdAt/updatedAt
  indexes: [
    { fields: ['scale_id', 'occurred_at'] },
  ],
});

module.exports = ScaleStatusLog;
