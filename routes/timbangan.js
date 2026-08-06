const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { ScaleReading, ScaleStatus } = require('../models');
const { requireAuth } = require('../middleware/auth');

// Endpoint GET (dashboard-summary, semua-data, detail/:id) sengaja dibiarkan
// publik/tanpa token - DashboardView.vue memanggilnya tanpa Authorization header.
// Hanya endpoint yang MENGUBAH data (edit/delete) yang dikunci di bawah.

// Helper: rentang waktu "hari ini" (00:00:00 s/d sebelum 00:00:00 besok)
// berdasarkan waktu lokal server (pastikan TZ server = Asia/Makassar)
function getTodayRange() {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return { startOfToday, startOfTomorrow };
}

// ====================================================================
// 1. API: RINGKASAN DASHBOARD UTAMA
// ====================================================================
router.get('/dashboard-summary', async (req, res) => {
  try {
    const { startOfToday, startOfTomorrow } = getTodayRange();

    // Semua baris di scale_readings sudah pasti data berat,
    // jadi tidak perlu lagi filter { weight: { $exists: true } } seperti versi Mongo
    const totalSacks = await ScaleReading.count();
    const dailySacks = await ScaleReading.count({
      where: { recordedAt: { [Op.gte]: startOfToday, [Op.lt]: startOfTomorrow } },
    });
    const totalWeightResult = await ScaleReading.sum('weight');

    res.json({
      totalWeight: parseFloat((totalWeightResult || 0).toFixed(2)),
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

    const [dataT1, dataT2, dataT3, dataT4] = await Promise.all(
      [1, 2, 3, 4].map((scaleId) =>
        ScaleReading.findAll({
          where: { scaleId },
          order: [['id', 'DESC']],
          limit,
        })
      )
    );

    const maxRows = Math.max(dataT1.length, dataT2.length, dataT3.length, dataT4.length);
    const finalData = [];

    // Catatan: kolom weight (DECIMAL) dikembalikan mysql2 sebagai string,
    // makanya di-Number()-kan supaya tetap angka seperti versi Mongo sebelumnya
    const mapRow = (record) => ({
      _id: record ? record.id : null, // key '_id' dipertahankan agar frontend tidak perlu diubah
      dt: record ? record.recordedAt : '-',
      w: record ? Number(record.weight) : 0
    });

    for (let i = 0; i < maxRows; i++) {
      finalData.push({
        id: i + 1,
        t1: mapRow(dataT1[i]),
        t2: mapRow(dataT2[i]),
        t3: mapRow(dataT3[i]),
        t4: mapRow(dataT4[i])
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
    const scaleId = parseInt(req.params.id);

    if (!scaleId || scaleId < 1 || scaleId > 4) {
      return res.status(400).json({ message: 'ID Timbangan tidak valid!' });
    }

    const { startOfToday, startOfTomorrow } = getTodayRange();

    const totalSacks = await ScaleReading.count({ where: { scaleId } });

    const todayRecords = await ScaleReading.findAll({
      where: {
        scaleId,
        recordedAt: { [Op.gte]: startOfToday, [Op.lt]: startOfTomorrow }
      },
      order: [['recordedAt', 'ASC']]
    });

    const dailySacks = todayRecords.length;
    const totalKg = todayRecords.reduce((sum, item) => sum + Number(item.weight), 0);

    const latestRecord = await ScaleReading.findOne({
      where: { scaleId },
      order: [['recordedAt', 'DESC']]
    });
    const realtime = latestRecord ? Number(latestRecord.weight) : 0;

    // Status sekarang diambil dari tabel scale_status (1 baris tetap per timbangan)
    const statusRecord = await ScaleStatus.findOne({ where: { scaleId } });
    const status = statusRecord ? statusRecord.status : 'unknown';

    const chartLabels = todayRecords.map((r) => {
      const hh = String(r.recordedAt.getHours()).padStart(2, '0');
      const mm = String(r.recordedAt.getMinutes()).padStart(2, '0');
      return `${hh}:${mm}`;
    });

    const chartData = todayRecords.map((r) => parseFloat(Number(r.weight).toFixed(2)));

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
router.put('/edit/:scaleId/:docId', requireAuth(['operator', 'admin', 'dev']), async (req, res) => {
  try {
    const scaleId = parseInt(req.params.scaleId);

    if (!scaleId || scaleId < 1 || scaleId > 4) {
      return res.status(400).json({ message: 'Mesin timbangan tidak valid' });
    }

    const { weight, dateTime } = req.body;

    // scaleId disertakan di WHERE supaya tidak bisa edit data milik timbangan lain
    const record = await ScaleReading.findOne({ where: { id: req.params.docId, scaleId } });

    if (!record) {
      return res.status(404).json({ message: 'Data tidak ditemukan di database' });
    }

    if (weight !== undefined) record.weight = Number(weight);
    // dateTime WAJIB dikirim dalam format ISO (contoh: "2026-08-04T10:30:00")
    if (dateTime !== undefined) record.recordedAt = new Date(dateTime);

    await record.save();

    res.json({ message: 'Data timbangan berhasil diperbarui!', data: record });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Terjadi kesalahan saat mengupdate data', error: err.message });
  }
});

// ====================================================================
// 5. API: HAPUS DATA TIMBANGAN (Spesifik 1 Mesin & 1 Data)
// ====================================================================
router.delete('/delete/:scaleId/:docId', requireAuth(['operator', 'admin', 'dev']), async (req, res) => {
  try {
    const scaleId = parseInt(req.params.scaleId);

    if (!scaleId || scaleId < 1 || scaleId > 4) {
      return res.status(400).json({ message: 'Mesin timbangan tidak valid' });
    }

    // scaleId disertakan di WHERE supaya tidak bisa hapus data milik timbangan lain
    const deletedCount = await ScaleReading.destroy({ where: { id: req.params.docId, scaleId } });

    if (deletedCount === 0) {
      return res.status(404).json({ message: 'Data tidak ditemukan atau sudah dihapus sebelumnya' });
    }

    res.json({ message: 'Data timbangan berhasil dihapus!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal menghapus data', error: err.message });
  }
});

module.exports = router;