const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load env variables
dotenv.config();

const app = express();

// Hubungkan ke MongoDB
connectDB();

// konfigurasi agar fronted vercel bisa mengakses API backend
app.use(cors({
    origin: ['http://localhost:5173', 'https://timbanghub.vercel.app/'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
})); 

app.use(express.json()); // Mengizinkan pembacaan format JSON

// Definisikan Routes API
app.use('/api/auth', require('./routes/auth'));
app.use('/api/timbangan', require('./routes/timbangan'));

// Jalankan Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server berjalan di port ${PORT}`));