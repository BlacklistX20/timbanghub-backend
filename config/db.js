require('dotenv').config();
const { Sequelize } = require('sequelize');

// Koneksi ke database MySQL menggunakan kredensial dari .env
const sequelize = new Sequelize(
  process.env.DB_NAME || 'gudang_pupuk',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    timezone: '+08:00', // Asia/Makassar (WITA) - dipakai saat konversi Date & set time_zone koneksi MySQL
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    define: {
      underscored: true, // otomatis map namaKolomCamelCase -> nama_kolom_snake_case
      timestamps: true,
    },
  }
);

// Panggil fungsi ini sekali saat aplikasi start (misal di app.js/server.js)
async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('Koneksi ke database MySQL berhasil.');
  } catch (error) {
    console.error('Gagal terhubung ke database:', error.message);
    process.exit(1);
  }
}

module.exports = { sequelize, testConnection };