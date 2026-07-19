const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const { startPolling } = require("./modbusService");

// Load env variables
dotenv.config();

const app = express();

// konfigurasi agar fronted vercel bisa mengakses API backend
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:8080', 'https://timbanghub.vercel.app', 'https://vercel.com/syafrul-s-projects/timbanghub/4twgu64JXTW9fZsF4nQ2DbxNtvnW'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
})); 

app.use(express.json()); // Mengizinkan pembacaan format JSON

// Definisikan Routes API
app.use('/api/auth', require('./routes/auth'));
app.use('/api/timbangan', require('./routes/timbangan'));

// Hubungkan ke MongoDB dan Jalankan Server
connectDB().then(() => {
    // Jalankan Server
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`Server berjalan di port ${PORT}`);
        startPolling(); // Mulai proses polling data dari Modbus
    });
});