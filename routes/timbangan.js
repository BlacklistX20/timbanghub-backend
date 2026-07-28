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

    const [dataT1, dataT2, dataT3, dataT4] = await Promise.all([
      Timbangan1.find({ weight: { $exists: true } }).sort({ _id: -1 }).limit(limit),
      Timbangan2.find({ weight: { $exists: true } }).sort({ _id: -1 }).limit(limit),
      Timbangan3.find({ weight: { $exists: true } }).sort({ _id: -1 }).limit(limit),
      Timbangan4.find({ weight: { $exists: true } }).sort({ _id: -1 }).limit(limit)
    ]);

    const maxRows = Math.max(dataT1.length, dataT2.length, dataT3.length, dataT4.length);
    const finalData = [];

    for (let i = 0; i < maxRows; i++) {
      finalData.push({
        id: i + 1,
        // _id disertakan agar frontend tahu data mana yang mau diubah/dihapus
        t1: {
          _id: dataT1[i] ? dataT1[i]._id : null,
          dt: dataT1[i] ? dataT1[i].dateTime : '-',
          w: dataT1[i] ? dataT1[i].weight : 0
        },
        t2: {
          _id: dataT2[i] ? dataT2[i]._id : null,
          dt: dataT2[i] ? dataT2[i].dateTime : '-',
          w: dataT2[i] ? dataT2[i].weight : 0
        },
        t3: {
          _id: dataT3[i] ? dataT3[i]._id : null,
          dt: dataT3[i] ? dataT3[i].dateTime : '-',
          w: dataT3[i] ? dataT3[i].weight : 0
        },
        t4: {
          _id: dataT4[i] ? dataT4[i]._id : null,
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
    }).sort({ _id: 1 }); 
    
    const dailySacks = todayRecords.length;
    const totalKg = todayRecords.reduce((sum, item) => sum + item.weight, 0);

    const latestRecord = await Model.findOne({ weight: { $exists: true } }).sort({ _id: -1 });
    let realtime = latestRecord ? latestRecord.weight : 0;

    const statusRecord = await Model.findOne({ status: { $exists: true } });
    let status = statusRecord && statusRecord.status ? statusRecord.status : 'stopped';

    const chartLabels = todayRecords.map(r => {
      if (r.dateTime) {
        const timePart = r.dateTime.split(' ')[1]; 
        if (timePart) {
          const timeSplit = timePart.split(':');
          return `${timeSplit[0]}:${timeSplit[1]}`; 
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

// ====================================================================
// 4. API: EDIT DATA TIMBANGAN (Spesifik 1 Mesin & 1 Data)
// ====================================================================
router.put('/edit/:scaleId/:docId', async (req, res) => {
  try {
    const scaleIndex = parseInt(req.params.scaleId) - 1;
    const Model = models[scaleIndex];

    if (!Model) return res.status(400).json({ message: 'Mesin timbangan tidak valid' });

    const { weight, dateTime } = req.body;

    const updateData = {};
    if (weight !== undefined) updateData.weight = Number(weight);
    if (dateTime !== undefined) updateData.dateTime = dateTime;

    const updatedRecord = await Model.findByIdAndUpdate(
      req.params.docId, 
      updateData, 
      { new: true } 
    );

    if (!updatedRecord) {
      return res.status(404).json({ message: 'Data tidak ditemukan di database' });
    }

    res.json({ message: 'Data timbangan berhasil diperbarui!', data: updatedRecord });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Terjadi kesalahan saat mengupdate data', error: err.message });
  }
});

// ====================================================================
// 5. API: HAPUS DATA TIMBANGAN (Spesifik 1 Mesin & 1 Data)
// ====================================================================
router.delete('/delete/:scaleId/:docId', async (req, res) => {
  try {
    const scaleIndex = parseInt(req.params.scaleId) - 1;
    const Model = models[scaleIndex];

    if (!Model) return res.status(400).json({ message: 'Mesin timbangan tidak valid' });

    // Hapus data spesifik berdasarkan ObjectID bawaan MongoDB
    const deletedRecord = await Model.findByIdAndDelete(req.params.docId);

    if (!deletedRecord) {
      return res.status(404).json({ message: 'Data tidak ditemukan atau sudah dihapus sebelumnya' });
    }

    res.json({ message: 'Data timbangan berhasil dihapus!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal menghapus data', error: err.message });
  }
});

module.exports = router;