const express = require('express');
const router = express.Router();
const { Timbangan1, Timbangan2, Timbangan3, Timbangan4 } = require('../models/Timbangan');

const models = [Timbangan1, Timbangan2, Timbangan3, Timbangan4];

// ====================================================================
// 1. API: RINGKASAN DASHBOARD UTAMA
// ====================================================================
router.get('/dashboard-summary', async (req, res) => {
  try {
    let totalWeight = 0, totalSacks = 0, dailySacks = 0;
    const today = new Date();
    const todayStr = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
    const regexToday = new RegExp('^' + todayStr);
    
    // Ambil agregasi dari 4 collection secara bersamaan (paralel)
    const modelPromises = models.map(async (model) => {
      const sacks = await model.countDocuments({ weight: { $exists: true } });
      const daily = await model.countDocuments({ dateTime: { $regex: regexToday }, weight: { $exists: true } });
      const weightAgg = await model.aggregate([
        { $match: { weight: { $exists: true } } },
        { $group: { _id: null, total: { $sum: "$weight" } } }
      ]);
      const weight = weightAgg.length > 0 ? weightAgg[0].total : 0;
      
      return { sacks, daily, weight };
    });

    const results = await Promise.all(modelPromises);

    for (const res of results) {
      totalSacks += res.sacks;
      dailySacks += res.daily;
      totalWeight += res.weight;
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
// 2. API: DATA TABEL KESELURUHAN (Terurut dari paling baru)
// ====================================================================
router.get('/semua-data', async (req, res) => {
  try {
    const limit = 200; 

    // sort({ _id: -1 }) adalah cara paling valid untuk mengurutkan dari yang terbaru
    const [dataT1, dataT2, dataT3, dataT4] = await Promise.all([
      Timbangan1.find({ weight: { $exists: true } }).sort({ _id: -1 }).limit(limit),
      Timbangan2.find({ weight: { $exists: true } }).sort({ _id: -1 }).limit(limit),
      Timbangan3.find({ weight: { $exists: true } }).sort({ _id: -1 }).limit(limit),
      Timbangan4.find({ weight: { $exists: true } }).sort({ _id: -1 }).limit(limit)
    ]);

    const maxRows = Math.max(dataT1.length, dataT2.length, dataT3.length, dataT4.length);
    const finalData = [];

    // Kita langsung menggunakan properti dateTime yang sudah berformat rapi dari Modbus
    for (let i = 0; i < maxRows; i++) {
      finalData.push({
        id: i + 1,
        t1: {
          dt: dataT1[i] ? dataT1[i].dateTime : '-',
          w: dataT1[i] ? dataT1[i].weight : 0
        },
        t2: {
          dt: dataT2[i] ? dataT2[i].dateTime : '-',
          w: dataT2[i] ? dataT2[i].weight : 0
        },
        t3: {
          dt: dataT3[i] ? dataT3[i].dateTime : '-',
          w: dataT3[i] ? dataT3[i].weight : 0
        },
        t4: {
          dt: dataT4[i] ? dataT4[i].dateTime : '-',
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

    const today = new Date();
    const todayStr = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
    const regexToday = new RegExp('^' + todayStr);

    const totalSacks = await Model.countDocuments({ weight: { $exists: true } });
    const todayRecords = await Model.find({ 
      dateTime: { $regex: regexToday }, 
      weight: { $exists: true } 
    }).sort({ _id: 1 }); // Diurutkan maju untuk grafik (dari pagi ke malam)
    
    const dailySacks = todayRecords.length;
    const totalKg = todayRecords.reduce((sum, item) => sum + item.weight, 0);

    const latestRecord = await Model.findOne({ weight: { $exists: true } }).sort({ _id: -1 });
    let realtime = latestRecord ? latestRecord.weight : 0;

    const statusRecord = await Model.findOne({ status: { $exists: true } });
    let status = statusRecord && statusRecord.status ? statusRecord.status : 'stopped';

    // PERBAIKAN: Parsing jam secara manual dari string "DD/MM/YYYY HH:MM:SS"
    const chartLabels = todayRecords.map(r => {
      if (r.dateTime) {
        const timePart = r.dateTime.split(' ')[1]; // Mengambil bagian "HH:MM:SS"
        if (timePart) {
          const timeSplit = timePart.split(':');
          return `${timeSplit[0]}:${timeSplit[1]}`; // Mengembalikan "HH:MM"
        }
      }
      return '00:00';
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