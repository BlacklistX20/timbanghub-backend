const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

// Data berat (time-series) hasil pembacaan timbangan
const ScaleReading = sequelize.define('ScaleReading', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  },
  // Kunci idempoten yang dipakai data-collector saat sinkronisasi database
  // lokal -> cloud (lihat syncWorker.js di project data-collector). Backend
  // utama ini tidak pernah membuat baris baru secara langsung, tapi field ini
  // tetap dideklarasikan supaya Sequelize mengenali kolomnya (misal saat query
  // SELECT *, atau kalau suatu saat backend perlu insert manual juga).
  syncId: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    allowNull: false,
    unique: true,
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
    { fields: ['scale_id', 'recorded_at'] }, // index biasa (bukan unique) - beberapa data bisa punya waktu sama
  ],
});

module.exports = ScaleReading;