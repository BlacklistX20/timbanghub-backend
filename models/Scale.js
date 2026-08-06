const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

// Data master/konfigurasi untuk setiap timbangan
const Scale = sequelize.define('Scale', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  },
  code: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: 'Kode unik timbangan, contoh: TIMBANGAN-01',
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  location: {
    type: DataTypes.STRING(150),
    allowNull: true,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
}, {
  tableName: 'scales',
  timestamps: true, // created_at & updated_at
});

module.exports = Scale;