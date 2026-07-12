const mongoose = require('mongoose');

const AccountSchema = new mongoose.Schema({
  email: { type: String, required: true },
  username: { type: String, required: true },
  passwordHash: { type: String, required: true }, // Disesuaikan dengan nama field Anda
  role: { type: String, required: true },
  lastLogin: { type: String },
  createdAt: { type: String },
  updatedAt: { type: String }
}, {
  collection: 'akun', // Memaksa Mongoose membaca collection 'akun' persis seperti di Atlas
  versionKey: false // Menghilangkan field __v bawaan Mongoose jika tidak diperlukan
});

module.exports = mongoose.model('Account', AccountSchema, 'akun'); // Memastikan model ini menggunakan collection 'akun'
