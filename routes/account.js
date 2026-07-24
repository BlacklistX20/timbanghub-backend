const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Account = require('../models/Account');

// ====================================================================
// MIDDLEWARE: Cek Token & Role Admin
// ====================================================================
const verifyAdmin = (req, res, next) => {
  // Ambil token dari header request
  const token = req.header('Authorization');
  if (!token) {
    return res.status(401).json({ message: 'Akses ditolak. Token tidak ditemukan.' });
  }

  try {
    // Bersihkan kata "Bearer " jika frontend mengirimkannya
    const tokenClean = token.startsWith('Bearer ') ? token.slice(7) : token;
    
    // Verifikasi token menggunakan rahasia yang sama dengan saat login
    const decoded = jwt.verify(tokenClean, process.env.JWT_SECRET);
    
    // Validasi apakah user yang sedang login adalah admin
    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Akses ditolak. Hanya Admin yang dapat mendaftarkan akun baru!' });
    }
    
    req.user = decoded;
    next(); // Lolos sensor, lanjutkan ke fungsi registrasi di bawah
  } catch (err) {
    res.status(401).json({ message: 'Sesi tidak valid atau telah kedaluwarsa. Silakan login ulang.' });
  }
};


// ====================================================================
// API 1: REGISTER AKUN BARU (Dilindungi Middleware verifyAdmin)
// ====================================================================
router.post('/register', verifyAdmin, async (req, res) => {
  const { email, username, password, role } = req.body;

  try {
    // 1. Validasi input kosong
    if (!username || !password || !role) {
      return res.status(400).json({ message: 'Username, password, dan role wajib diisi!' });
    }

    // 2. Cek apakah username sudah terpakai
    const existingUser = await Account.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username sudah terdaftar, silakan gunakan nama lain.' });
    }

    // 3. Enkripsi (Hash) Password 
    // Kita gunakan 10 rounds agar aman namun prosesnya tetap cepat di server Render
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 4. Ambil waktu saat ini (Otomatis mengikuti TZ=Asia/Makassar di server)
    const now = new Date().toString();

    // 5. Simpan ke database sesuai Schema yang Anda buat
    const newUser = new Account({
      email: email || "", // Jika email kosong, isi dengan string kosong
      username: username,
      passwordHash: passwordHash,
      role: role,
      lastLogin: "",
      createdAt: now,
      updatedAt: now
    });

    await newUser.save();

    // 6. Beri respon sukses ke Frontend
    res.status(201).json({ 
      message: 'Akun baru berhasil ditambahkan!',
      user: { username: newUser.username, role: newUser.role }
    });

  } catch (err) {
    console.error("Error tambah akun:", err.message);
    res.status(500).json({ message: 'Terjadi kesalahan internal saat mendaftarkan akun.', error: err.message });
  }
});

// ====================================================================
// API 2: TAMPILKAN SEMUA AKUN (Untuk Tabel Frontend)
// ====================================================================
router.get('/users', verifyAdmin, async (req, res) => {
  try {
    // Ambil semua data akun, tapi abaikan field 'passwordHash' 
    // Sangat penting agar password (meskipun diacak) tidak bocor ke frontend!
    const users = await Account.find().select('-passwordHash').sort({ createdAt: -1 });
    
    res.json(users);
  } catch (err) {
    console.error("Error ambil data pengguna:", err.message);
    res.status(500).json({ message: 'Terjadi kesalahan saat mengambil data pengguna.' });
  }
});

// ====================================================================
// API 3: EDIT DATA AKUN
// ====================================================================
router.put('/edit/:id', verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const { email, username, role, password } = req.body;

  try {
    const user = await Account.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'Akun tidak ditemukan!' });
    }

    // Perbarui data dasar jika diisi dari frontend
    if (username) user.username = username;
    if (role) user.role = role;
    if (email !== undefined) user.email = email; // Mengizinkan email dikosongkan ("")

    // Jika admin mengetikkan password baru, maka hash ulang password tersebut
    if (password && password.trim() !== "") {
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(password, salt);
    }

    // Perbarui waktu update
    user.updatedAt = new Date().toString();

    await user.save();

    res.json({ message: 'Data akun berhasil diperbarui!' });
  } catch (err) {
    console.error("Error edit akun:", err.message);
    res.status(500).json({ message: 'Terjadi kesalahan internal saat mengedit akun.', error: err.message });
  }
});

// ====================================================================
// API 4: HAPUS AKUN
// ====================================================================
router.delete('/delete/:id', verifyAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    // Mencegah admin menghapus dirinya sendiri secara tidak sengaja
    if (req.user.userId === id) {
      return res.status(400).json({ message: 'Anda tidak dapat menghapus akun Anda sendiri saat sedang login!' });
    }

    const deletedUser = await Account.findByIdAndDelete(id);
    
    if (!deletedUser) {
      return res.status(404).json({ message: 'Akun tidak ditemukan atau sudah dihapus!' });
    }

    res.json({ message: `Akun dengan username '${deletedUser.username}' berhasil dihapus!` });
  } catch (err) {
    console.error("Error hapus akun:", err.message);
    res.status(500).json({ message: 'Terjadi kesalahan internal saat menghapus akun.', error: err.message });
  }
});

module.exports = router;