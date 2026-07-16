const ModbusRTU = require("modbus-serial");

// 1. IMPORT model yang sudah dibuat di Timbangan.js (Sesuaikan path foldernya)
const { Timbangan1, Timbangan2, Timbangan3, Timbangan4 } = require("./models/Timbangan");

// 2. Masukkan ke dalam objek agar mudah di-looping
const models = {
  1: Timbangan1,
  2: Timbangan2,
  3: Timbangan3,
  4: Timbangan4,
};

// --- 2. KONFIGURASI MODBUS USR ---
const USR_IP = "192.168.0.7"; // Sesuaikan dengan IP USR TCP 232-410s Anda
const USR_PORT = 502;           // Port default Modbus TCP
const SLAVES = [1, 2, 3, 4];
const REGISTER_ADDRESS = 4;     // Alamat register yang akan dibaca (sesuaikan dengan manual slave)

const client = new ModbusRTU();

// Fungsi pembantu untuk memformat waktu sesuai permintaan
const getFormattedDate = () => new Date().toString();

// --- 3. FUNGSI UPDATE STATUS ---
const updateStatus = async (slaveId, status, message) => {
  const Model = models[slaveId];
  
  // Kita menggunakan upsert untuk mencari dokumen yang HANYA memiliki field 'status'
  // Jika ada, timpa (update). Jika tidak, buat dokumen status baru.
  await Model.findOneAndUpdate(
    { status: { $exists: true } }, 
    {
      dateTime: getFormattedDate(),
      status: status,
      message: message
    },
    { upsert: true, returnDocument: 'after' }
  );
};

// --- 4. FUNGSI MENARIK DATA PER SLAVE ---
const readSlaveData = async (slaveId) => {
  const Model = models[slaveId];

  try {
    client.setID(slaveId);

    // Membaca Input Register (FC 04)
    const response = await client.readInputRegisters(REGISTER_ADDRESS, 1);
    const weightValue = response.data[0] / 100; 

    // Logika disederhanakan: Langsung simpan jika di atas 40 kg
    if (weightValue > 40 && weightValue < 52) {
        await Model.create({
            dateTime: getFormattedDate(),
            weight: weightValue
        });
        console.log(`[Slave ${slaveId}] DISIMPAN - Berat: ${weightValue} kg`);
    } else {
        console.log(`[Slave ${slaveId}] Berat di luar rentang, tidak disimpan: ${weightValue} kg`);
    }

    // Update status koneksi menjadi 'running'
    await updateStatus(slaveId, "running", "Data berhasil ditarik");

  } catch (error) {
    // Jika gagal terhubung atau timeout ke slave ini
    await updateStatus(slaveId, "stopped", `Gagal membaca register: ${error.message}`);
    console.log(`[Slave ${slaveId}] Gagal - ${error.message}`);
  }
};

// --- 5. FUNGSI POLLING SEKUENSIAL UTAMA ---
const startPolling = async () => {
  try {
    // Koneksi awal
    await client.connectTcpRTUBuffered(USR_IP, { port: USR_PORT });
    client.setTimeout(1000); 
    console.log("Terhubung ke USR Modbus Gateway!");

    const pollLoop = async () => {
      // LOGIKA BARU: Cek apakah TCP terputus sebelum mulai membaca
      if (!client.isOpen) {
        console.log("Koneksi TCP ke USR terputus. Mencoba menghubungkan ulang...");
        try {
          await client.connectTcpRTUBuffered(USR_IP, { port: USR_PORT });
          console.log("Berhasil terhubung kembali ke USR!");
        } catch (reconnectError) {
          console.log("Gagal menghubungkan ulang:", reconnectError.message);
          
          // Update status MongoDB menjadi stopped
          for (const slaveId of SLAVES) {
            await updateStatus(slaveId, "stopped", "Koneksi gateway terputus");
          }
          
          // Tunggu 5 detik lalu coba cycle loop lagi
          setTimeout(pollLoop, 5000);
          return; // Hentikan eksekusi kode di bawahnya untuk siklus ini
        }
      }

      // Jika port terbuka, lakukan pembacaan normal
      for (const slaveId of SLAVES) {
        await readSlaveData(slaveId); // Atau gunakan readSlave1(), readSlave2() jika Anda memisahkannya
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      
      // Jadwalkan siklus berikutnya
      setTimeout(pollLoop, 5000); 
    };

    // Jalankan loop pertama kali
    pollLoop();

  } catch (error) {
    console.error("Gagal terhubung ke Modbus Gateway USR di awal:", error.message);
    setTimeout(startPolling, 10000);
  }
};

module.exports = { startPolling };