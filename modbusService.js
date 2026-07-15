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
    if (weightValue > 40) {
        await Model.create({
            dateTime: getFormattedDate(),
            weight: weightValue
        });
        console.log(`[Slave ${slaveId}] DISIMPAN - Berat: ${weightValue} kg`);
    } else {
        console.log(`[Slave ${slaveId}] Berat di bawah 40 kg, tidak disimpan: ${weightValue} kg`);
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
    // Gunakan TcpRTUBuffered karena USR-TCP232-410S menjembatani TCP ke RS485 (RTU)
    await client.connectTcpRTUBuffered(USR_IP, { port: USR_PORT });
    client.setTimeout(1000); // Batas waktu tunggu per slave (1 detik)
    console.log("Terhubung ke USR Modbus Gateway!");

    // Looping terus-menerus
    setInterval(async () => {
      // Loop berurutan (await digunakan di dalam for..of)
      for (const slaveId of SLAVES) {
        await readSlaveData(slaveId);
        
        // Beri jeda 100ms antar panggilan slave agar jalur RS485 tidak macet
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }, 5000); // Ulangi seluruh proses penarikan setiap 5 detik

  } catch (error) {
    console.error("Gagal terhubung ke Modbus Gateway USR:", error.message);
    
    // Jika IP USR mati total, update semua status slave menjadi stopped
    for (const slaveId of SLAVES) {
      await updateStatus(slaveId, "stopped", "Koneksi gateway terputus");
    }
    
    // Coba hubungkan ulang setelah 10 detik
    setTimeout(startPolling, 10000);
  }
};

module.exports = { startPolling };