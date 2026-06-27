const express = require('express');
const router = express.Router();
const { Timbangan1, Timbangan2, Timbangan3, Timbangan4 } = require('../models/Timbangan');

const models = [Timbangan1, Timbangan2, Timbangan3, Timbangan4];

// Fungsi Bantuan: Mengubah format string tanggal panjang menjadi DD/MM/YYYY HH:MM:SS
const formatDate = (dateString) => {
  if (!dateString) return '-';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '-';
  
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
};

// ====================================================================
// 1. API: RINGKASAN DASHBOARD UTAMA
// ====================================================================
router.get('/dashboard-summary', async (req, res) => {
  try {
    let totalWeight = 0, totalSacks = 0, dailySacks = 0;
    const todayStr = new Date().toDateString(); 
    const regexToday = new RegExp(todayStr, 'i');

    for (const model of models) {
      totalSacks += await model.countDocuments();
      dailySacks += await model.countDocuments({ dateTime: { $regex: regexToday } });
      
      const weightAgg = await model.aggregate([{ $group: { _id: null, total: { $sum: "$weight" } } }]);
      if (weightAgg.length > 0) totalWeight += weightAgg[0].total;
    }

    res.json({
      totalWeight: parseFloat(totalWeight.toFixed(2)),
      totalSacks,
      dailySacks
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
});

// ====================================================================
// 2. API: DATA TABEL KESELURUHAN (Independen, Abaikan GroupId)
// ====================================================================
router.get('/semua-data', async (req, res) => {
  try {
    const limit = 200; // Ambil 200 data terakhir agar ringan

    // Ambil data dari 4 collection secara bersamaan (paralel) untuk mempercepat respon
    const [dataT1, dataT2, dataT3, dataT4] = await Promise.all([
      Timbangan1.find().sort({ _id: -1 }).limit(limit),
      Timbangan2.find().sort({ _id: -1 }).limit(limit),
      Timbangan3.find().sort({ _id: -1 }).limit(limit),
      Timbangan4.find().sort({ _id: -1 }).limit(limit)
    ]);

    // Cari tahu collection mana yang datanya paling panjang untuk menentukan jumlah baris tabel
    const maxRows = Math.max(dataT1.length, dataT2.length, dataT3.length, dataT4.length);
    const finalData = [];

    // Susun data baris demi baris menyamping
    for (let i = 0; i < maxRows; i++) {
      finalData.push({
        id: i + 1,
        t1: {
          dt: dataT1[i] ? formatDate(dataT1[i].dateTime) : '-',
          w: dataT1[i] ? dataT1[i].weight : 0
        },
        t2: {
          dt: dataT2[i] ? formatDate(dataT2[i].dateTime) : '-',
          w: dataT2[i] ? dataT2[i].weight : 0
        },
        t3: {
          dt: dataT3[i] ? formatDate(dataT3[i].dateTime) : '-',
          w: dataT3[i] ? dataT3[i].weight : 0
        },
        t4: {
          dt: dataT4[i] ? formatDate(dataT4[i].dateTime) : '-',
          w: dataT4[i] ? dataT4[i].weight : 0
        }
      });
    }

    res.json(finalData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Terjadi kesalahan server saat mengambil tabel data' });
  }
});

// ====================================================================
// 3. API: DETAIL MASING-MASING TIMBANGAN (Untuk Halaman 1-4)
// ====================================================================
router.get('/detail/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const modelIndex = parseInt(id) - 1;
    const Model = models[modelIndex];

    if (!Model) return res.status(400).json({ message: 'ID Timbangan tidak valid!' });

    const todayStr = new Date().toDateString();
    const regexToday = new RegExp(todayStr, 'i');

    const totalSacks = await Model.countDocuments();
    const todayRecords = await Model.find({ dateTime: { $regex: regexToday } }).sort({ _id: 1 });
    
    const dailySacks = todayRecords.length;
    const totalKg = todayRecords.reduce((sum, item) => sum + item.weight, 0);

    const latestRecord = await Model.findOne().sort({ _id: -1 });
    
    let realtime = 0;
    let status = 'stopped';

    if (latestRecord) {
      realtime = latestRecord.weight;
      const latestTime = new Date(latestRecord.dateTime).getTime();
      const now = new Date().getTime();
      const diffMinutes = Math.floor((now - latestTime) / (1000 * 60));
      
      if (diffMinutes <= 15) status = 'running';
    }

    const chartLabels = todayRecords.map(r => {
      const d = new Date(r.dateTime);
      return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    });
    
    const chartData = todayRecords.map(r => parseFloat(r.weight.toFixed(2)));

    res.json({
      status,
      realtime,
      totalKg: parseFloat(totalKg.toFixed(2)),
      totalSacks,
      dailySacks,
      chart: { labels: chartLabels, data: chartData }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Terjadi kesalahan server saat mengambil detail timbangan' });
  }
});

module.exports = router;