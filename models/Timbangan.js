const mongoose = require('mongoose');

// Skema dasar sesuai format JSON Anda
const TimbanganSchema = new mongoose.Schema({
  dateTime: { type: String, required: true },
  weight: { type: Number, required: true },
  groupId: { type: String, required: true }
}, {
  versionKey: false
});

// Ekspor ke 4 collection spesifik
module.exports = {
  Timbangan1: mongoose.model('Timbangan1', TimbanganSchema, 'timbangan1'),
  Timbangan2: mongoose.model('Timbangan2', TimbanganSchema, 'timbangan2'),
  Timbangan3: mongoose.model('Timbangan3', TimbanganSchema, 'timbangan3'),
  Timbangan4: mongoose.model('Timbangan4', TimbanganSchema, 'timbangan4')
};
