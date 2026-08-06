const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { User } = require('../models');
const { requireAuth } = require('../middleware/auth');


// ====================================================================
// API 1: REGISTER AKUN BARU (Dilindungi requireAuth: admin/dev)
// ====================================================================
router.post('/register', requireAuth(['admin', 'dev']), async (req, res) => {
  const { email, username, password, role } = req.body;

  try {
    // 1. Validasi input kosong
    if (!username || !password || !role) {
      return res.status(400).json({ message: 'Username, password, dan role wajib diisi!' });
    }

    // 2. Cek apakah username sudah terpakai
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ message: 'Username sudah terdaftar, silakan gunakan nama lain.' });
    }

    // 3. Enkripsi (Hash) Password
    // Kita gunakan 10 rounds agar aman namun prosesnya tetap cepat di server Render
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 4. Simpan ke database
    // createdAt & updatedAt otomatis diisi oleh Sequelize, tidak perlu diset manual
    const newUser = await User.create({
      email: email || null, // penting: null (bukan ""), karena kolom email UNIQUE di MySQL
      username,
      passwordHash,
      role,
    });

    // 5. Beri respon sukses ke Frontend
    res.status(201).json({
      message: 'Akun baru berhasil ditambahkan!',
      user: { username: newUser.username, role: newUser.role }
    });

  } catch (err) {
    console.error("Error tambah akun:", err.message);

    // Duplikat username/email (setara err.code 11000 di MongoDB)
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'Username atau email sudah terdaftar.' });
    }

    // Nilai role di luar ENUM('user','operator','admin','dev')
    if (err.name === 'SequelizeValidationError') {
      return res.status(400).json({ message: 'Data tidak valid.', error: err.message });
    }

    res.status(500).json({ message: 'Terjadi kesalahan internal saat mendaftarkan akun.', error: err.message });
  }
});

// ====================================================================
// API 2: TAMPILKAN SEMUA AKUN (Untuk Tabel Frontend)
// ====================================================================
router.get('/users', requireAuth(['admin', 'dev']), async (req, res) => {
  try {
    // Ambil semua data akun, tapi abaikan kolom 'passwordHash'
    // Sangat penting agar password (meskipun di-hash) tidak bocor ke frontend!
    const users = await User.findAll({
      attributes: { exclude: ['passwordHash'] },
      order: [['createdAt', 'DESC']],
    });

    res.json(users);
  } catch (err) {
    console.error("Error ambil data pengguna:", err.message);
    res.status(500).json({ message: 'Terjadi kesalahan saat mengambil data pengguna.' });
  }
});

// ====================================================================
// API 3: EDIT DATA AKUN
// ====================================================================
router.put('/edit/:id', requireAuth(['admin', 'dev']), async (req, res) => {
  const { id } = req.params;
  const { email, username, role, password } = req.body;

  try {
    // 1. Cari akun berdasarkan primary key
    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({ message: 'Akun tidak ditemukan di database!' });
    }

    // 2. Update field hanya jika dikirim dari form
    if (username) user.username = username;
    if (role) user.role = role;

    // 3. Hash ulang password HANYA jika form password diisi
    if (password && password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(password, salt);
    }

    // 4. Tangani email: kosongkan jadi NULL jika dihapus dari form
    if (email === '' || email === null) {
      user.email = null;
    } else if (email !== undefined) {
      user.email = email;
    }

    // 5. Simpan perubahan (updatedAt otomatis ter-update oleh Sequelize)
    await user.save();

    res.json({ message: 'Data akun berhasil diperbarui!' });

  } catch (err) {
    console.error("Error edit akun:", err.message);

    // TANGKAP ERROR DUPLIKAT: Sequelize menolak karena Username/Email sudah terpakai
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        message: 'Username atau Email sudah terdaftar pada akun lain. Gunakan yang berbeda.'
      });
    }

    if (err.name === 'SequelizeValidationError') {
      return res.status(400).json({ message: 'Data tidak valid.', error: err.message });
    }

    res.status(500).json({
      message: 'Terjadi kesalahan internal saat mengedit akun.',
      error: err.message
    });
  }
});

// ====================================================================
// API 4: HAPUS AKUN
// ====================================================================
router.delete('/delete/:id', requireAuth(['admin', 'dev']), async (req, res) => {
  const { id } = req.params;

  try {
    // Mencegah admin menghapus dirinya sendiri secara tidak sengaja
    // Dibandingkan sebagai String karena req.user.userId & :id bisa berbeda tipe (number vs string)
    if (String(req.user.userId) === String(id)) {
      return res.status(400).json({ message: 'Anda tidak dapat menghapus akun Anda sendiri saat sedang login!' });
    }

    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({ message: 'Akun tidak ditemukan atau sudah dihapus!' });
    }

    const deletedUsername = user.username;
    await user.destroy();

    res.json({ message: `Akun dengan username '${deletedUsername}' berhasil dihapus!` });
  } catch (err) {
    console.error("Error hapus akun:", err.message);
    res.status(500).json({ message: 'Terjadi kesalahan internal saat menghapus akun.', error: err.message });
  }
});

module.exports = router;