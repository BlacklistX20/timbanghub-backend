const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

// Status TERKINI setiap timbangan (1 baris per timbangan, selalu di-UPDATE)
const ScaleStatus = sequelize.define('ScaleStatus', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  },
  scaleId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    unique: true,
  },
  status: {
    type: DataTypes.ENUM('connected', 'disconnected', 'error', 'unknown'),
    allowNull: false,
    defaultValue: 'unknown',
  },
  lastConnectedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Waktu terakhir kali status connected',
  },
  lastErrorMessage: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'Pesan error terakhir jika ada',
  },
}, {
  tableName: 'scale_status',
  timestamps: true,
  createdAt: false, // tabel ini hanya punya updated_at
});

module.exports = ScaleStatus;
