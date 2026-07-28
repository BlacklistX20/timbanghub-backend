const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load env variables
dotenv.config();

const app = express();

// 1. Ambil URL dari .env, lalu pecah (split) berdasarkan koma menjadi bentuk array
// Jika FRONTEND_URL kosong/tidak terbaca, fallback ke string kosong untuk menghindari error
const allowedOrigins = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : [];

// 2. Terapkan ke dalam konfigurasi CORS
app.use(cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
})); 

app.use(express.json()); // Mengizinkan pembacaan format JSON

// Definisikan Routes API
app.use('/api/auth', require('./routes/auth'));
app.use('/api/account', require('./routes/account'));
app.use('/api/timbangan', require('./routes/timbangan'));

// Hubungkan ke MongoDB dan Jalankan Server
connectDB().then(() => {
    // Jalankan Server
    const PORT = process.env.PORT || 5000; // Tambahkan fallback port 5000 untuk amannya
    app.listen(PORT, () => {
        console.log(`Server berjalan di port ${PORT}`);
        console.log(`CORS diizinkan untuk:`, allowedOrigins); // Opsional: untuk memastikan URL terbaca
    });
});