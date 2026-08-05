const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');

// API LOGIN
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    // 1. Cari user di tabel 'users' berdasarkan username
    const user = await User.findOne({ where: { username } });

    // 2. Jika user tidak ditemukan
    if (!user) {
      return res.status(400).json({ message: 'Username atau Password salah!' });
    }

    // 3. Validasi Password (cocokkan input dengan passwordHash dari database)
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Username atau Password salah!' });
    }

    // 4. Update waktu lastLogin
    // Gunakan objek Date asli (bukan .toString()), supaya Sequelize menyimpannya
    // dengan benar sebagai kolom DATETIME di MySQL
    user.lastLogin = new Date();
    await user.save();

    // 5. Buat JWT Token dengan menyertakan role
    const payload = {
      userId: user.id,
      username: user.username,
      role: user.role
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

    // 6. Kirim respons sukses
    res.json({
      message: 'Login Berhasil',
      token: token,
      username: user.username,
      role: user.role
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;