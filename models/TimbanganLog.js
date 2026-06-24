const mongoose = require('mongoose');

const TimbanganLogSchema = new mongoose.Schema({
  datetime: { type: String, required: true }, // Format DD/MM/YYYY HH:MM:SS
  t1: { type: Number, default: 0 },
  t2: { type: Number, default: 0 },
  t3: { type: Number, default: 0 },
  t4: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('TimbanganLog', TimbanganLogSchema);