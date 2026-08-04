const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

// Data berat (time-series) hasil pembacaan timbangan
const ScaleReading = sequelize.define('ScaleReading', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  },
  scaleId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  weight: {
    type: DataTypes.DECIMAL(12, 3),
    allowNull: false,
    comment: 'Berat hasil timbang',
  },
  recordedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'Waktu berat dibaca dari alat',
  },
}, {
  tableName: 'scale_readings',
  timestamps: true,
  updatedAt: false, // tabel ini hanya punya created_at
  indexes: [
    { fields: ['scale_id', 'recorded_at'] },
  ],
});

module.exports = ScaleReading;
