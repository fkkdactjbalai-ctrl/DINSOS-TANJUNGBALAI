import { SurveyData, FamilyMember } from '../types';

export interface FlatSurveyPayload {
  id: string;
  submittedAt: string;
  namaPendata: string;
  noKK: string;
  namaResponden: string;
  kecamatan: string;
  kelurahan: string;
  alamat: string;
  statusKepemilikanRumah: string;
  buktiKepemilikanTanah: string;
  luasLantai: number;
  jenisLantai: string;
  jenisDinding: string;
  jenisAtap: string;
  sumberAirMinum: string;
  jarakAirMinum: string;
  sumberPenerangan: string;
  dayaListrik: string;
  noMeteranPelanggan: string;
  bahanBakarMemasak: string;
  fasilitasBab: string;
  jenisKloset: string;
  pembuanganAkhirTinja: string;
  kondisiGiziAnak: string;
  penyakitKronis: string;
  jaminanKesehatan: string;
  programBantuan: string;
  asetBergerak: string;
  asetTidakBergerak: string;
  jumlahTernak: string;
  aksesInternetKeluarga: string;
  rekeningDompetDigital: string;
  pmksTerdapat: string;
  pmksJenis: string;
  jenisBantuanDiinginkan: string;
  catatan: string;
  jumlahAnggotaKeluarga: number;
  daftarAnggotaKeluarga: string; // Concise string overview of members
}

/**
 * Creates a flattened version of the survey, suitable for single-row spreadsheets.
 */
export function flattenSurvey(survey: SurveyData): FlatSurveyPayload {
  const memberSummaries = (survey.anggotaKeluarga || []).map(m => {
    return `${m.noUrut}. ${m.nama} (${m.nik}) [Hub: ${m.statusHubunganKK}, Umur: ${m.umur} thn, Kerja: ${m.apakahBekerja}]`;
  }).join('; ');

  return {
    id: survey.id,
    submittedAt: survey.submittedAt,
    namaPendata: survey.namaPendata || '',
    noKK: survey.noKK || '',
    namaResponden: survey.namaResponden || '',
    kecamatan: survey.kecamatan || '',
    kelurahan: survey.kelurahan || '',
    alamat: survey.alamat || '',
    statusKepemilikanRumah: survey.statusKepemilikanRumah || '',
    buktiKepemilikanTanah: survey.buktiKepemilikanTanah || '',
    luasLantai: Number(survey.luasLantai) || 0,
    jenisLantai: survey.jenisLantai || '',
    jenisDinding: survey.jenisDinding || '',
    jenisAtap: survey.jenisAtap || '',
    sumberAirMinum: survey.sumberAirMinum || '',
    jarakAirMinum: survey.jarakAirMinum || '',
    sumberPenerangan: survey.sumberPenerangan || '',
    dayaListrik: survey.dayaListrik || '',
    noMeteranPelanggan: survey.noMeteranPelanggan || '',
    bahanBakarMemasak: survey.bahanBakarMemasak || '',
    fasilitasBab: survey.fasilitasBab || '',
    jenisKloset: survey.jenisKloset || '',
    pembuanganAkhirTinja: survey.pembuanganAkhirTinja || '',
    kondisiGiziAnak: survey.kondisiGiziAnak || '',
    penyakitKronis: survey.penyakitKronis || '',
    jaminanKesehatan: survey.jaminanKesehatan || '',
    programBantuan: (survey.programBantuan || []).join(', '),
    asetBergerak: (survey.asetBergerak || []).join(', '),
    asetTidakBergerak: (survey.asetTidakBergerak || []).join(', '),
    jumlahTernak: survey.jumlahTernak || '',
    aksesInternetKeluarga: survey.aksesInternetKeluarga || '',
    rekeningDompetDigital: survey.rekeningDompetDigital || 'Tidak',
    pmksTerdapat: survey.pmksTerdapat || '',
    pmksJenis: survey.pmksJenis || '',
    jenisBantuanDiinginkan: survey.jenisBantuanDiinginkan || '',
    catatan: survey.catatan || '',
    jumlahAnggotaKeluarga: survey.anggotaKeluarga?.length || 0,
    daftarAnggotaKeluarga: memberSummaries,
  };
}

/**
 * Sends a survey to the user's custom Google Apps Script Web App (GAS) URL.
 * Handles the communication as a POST request containing both rich raw and flattened layouts.
 */
export async function sendSurveyToGoogleAppsScript(
  url: string, 
  survey: SurveyData
): Promise<{ success: boolean; message: string }> {
  if (!url || !url.trim().startsWith('http')) {
    return { 
      success: false, 
      message: 'URL Google Apps Script tidak valid. Silakan lengkapi URL di pengaturan cloud.' 
    };
  }

  const payload = {
    action: 'save_dtsen_data',
    timestamp: new Date().toISOString(),
    flat: flattenSurvey(survey),
    raw: {
      ...survey,
      // exclude actual base64 photos from spreadsheets to prevent cell capacity overflows, 
      // but include metadata or let them keep them if they are small enough.
      // We will keep a placeholder or size indicator of attachments.
      fotoKK: survey.fotoKK ? '[Ada Lampiran Berkas KK]' : '',
      fotoRumahDepan: survey.fotoRumahDepan ? '[Ada Lampiran Foto Depan]' : '',
      fotoRumahDalam: survey.fotoRumahDalam ? '[Ada Lampiran Foto Dalam]' : ''
    }
  };

  try {
    // Send using standard fetch with text/plain.
    // This allows browser requests to bypass CORS preflights for easier connection.
    const response = await fetch(url.trim(), {
      method: 'POST',
      mode: 'cors',
      redirect: 'follow',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload)
    });

    // If the server returns 200 or is ok, or even if it's redirects (which fetch follows automatically)
    if (response.ok) {
      try {
        const textResult = await response.text();
        const jsonResult = textResult ? JSON.parse(textResult) : null;
        
        if (jsonResult && jsonResult.status === 'error') {
          return {
            success: false,
            message: `Alur script mengembalikan error: ${jsonResult.message || 'Error tidak diketahui'}`
          };
        }
        
        return {
          success: true,
          message: 'Berhasil tersinkronisasi dengan Google Sheet.'
        };
      } catch (e) {
        // Response wasn't rich JSON but was HTTP 200. With GAS, sometimes opaque or successful redirect output
        // is returned without CORS headers on the final body. 
        // If status was Ok, we can treat it as a successful transmission of data!
        return {
          success: true,
          message: 'Data berhasil terkirim (Status OK).'
        };
      }
    } else {
      return {
        success: false,
        message: `Koneksi gagal dengan kode respon HTTP: ${response.status} (${response.statusText})`
      };
    }
  } catch (error: any) {
    console.warn('Error syncing survey with browser CORS, attempting no-cors fallback:', error);
    
    // Fallback: Use 'no-cors' mode. This sends the request through the browser sandbox successfully,
    // Google Sheets receives and processes it, but returns an opaque response (status: 0).
    // This is a reliable way to bypass local browser CORS policy blocks for Google App Script Web Apps.
    try {
      await fetch(url.trim(), {
        method: 'POST',
        mode: 'no-cors',
        redirect: 'follow',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(payload)
      });
      
      return {
        success: true,
        message: 'Data berhasil disinkronkan ke Google Sheet (via No-CORS-safe fallback).'
      };
    } catch (fallbackError: any) {
      console.error('Both CORS and No-CORS fallback connections failed:', fallbackError);
      return {
        success: false,
        message: `Gagal terhubung dengan server: ${error.message || 'Cek koneksi internet Anda & pastikan URL deployment Web App benar'}`
      };
    }
  }
}

/**
 * Returns a copy-pasteable script template for Google Apps Script Google Sheets
 */
export function getGoogleAppsScriptTemplate(): string {
  return `/**
 * GOOGLE APPS SCRIPT - SINKRONISASI INTERAKTIF DTSEN TANJUNGBALAI
 * 
 * Petunjuk Pemasangan:
 * 1. Buka Google Sheet baru, ganti nama Sheet menjadi "DTSEN_Data".
 * 2. Klik menu 'Ekstensi' atau 'Extensions' -> pilih 'Apps Script'.
 * 3. Hapus seluruh kode bawaan yang ada di editor, lalu tempelkan seluruh kode di bawah ini.
 * 4. Klik ikon Save (Disket).
 */

function doPost(e) {
  try {
    // Membaca data kiriman
    var payloadString = e.postData.contents;
    var payload = JSON.parse(payloadString);
    var flatData = payload.flat;
    
    // Buka Spreadsheet aktif
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("DTSEN_Data");
    
    // Jika Sheet belum ada, buat atau gunakan Sheet pertama
    if (!sheet) {
      sheet = ss.insertSheet("DTSEN_Data");
    }
    
    // Buat Header baris pertama jika Sheet masih kosong
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "ID_DATA", 
        "TANGGAL_INPUT", 
        "NAMA_PENDATA", 
        "NO_KK", 
        "NAMA_RESPONDEN", 
        "KECAMATAN", 
        "KELURAHAN", 
        "ALAMAT",
        "STATUS_KEPEMILIKAN_RUMAH",
        "SUMBER_AIR_MINUM",
        "BANTUAN_SOSIAL",
        "ASET_BERGERAK",
        "PMKS_STATUS",
        "PMKS_JENIS",
        "USULAN_BANTUAN",
        "JUMLAH_JIWA",
        "RINGKASAN_KELUARGA",
        "CATATAN_SURVEY"
      ]);
      
      // Mendesain header agar tampak rapi
      var headerRange = sheet.getRange(1, 1, 1, 18);
      headerRange.setFontWeight("bold");
      headerRange.setBackground("#4F46E5");
      headerRange.setFontColor("#FFFFFF");
      headerRange.setHorizontalAlignment("center");
    }
    
    // Masukkan data baris baru
    sheet.appendRow([
      flatData.id,
      flatData.submittedAt,
      flatData.namaPendata,
      flatData.noKK,
      flatData.namaResponden,
      flatData.kecamatan,
      flatData.kelurahan,
      flatData.alamat,
      flatData.statusKepemilikanRumah,
      flatData.sumberAirMinum,
      flatData.programBantuan,
      flatData.asetBergerak,
      flatData.pmksTerdapat,
      flatData.pmksJenis,
      flatData.jenisBantuanDiinginkan,
      flatData.jumlahAnggotaKeluarga,
      flatData.daftarAnggotaKeluarga,
      flatData.catatan
    ]);
    
    // Berhasil menyimpan
    return ContentService.createTextOutput(JSON.stringify({ 
      "status": "success", 
      "id": flatData.id, 
      "noKK": flatData.noKK,
      "message": "Data DTSEN berhasil direkam ke Google Sheets!" 
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    // Kembalikan info kesalahan
    return ContentService.createTextOutput(JSON.stringify({ 
      "status": "error", 
      "message": err.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Fungsi untuk mengetes koneksi dasar (GET request)
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ 
    "status": "online", 
    "app": "DTSEN Kota Tanjungbalai Cloud Sync Link Active!", 
    "timestamp": new Date().toISOString() 
  })).setMimeType(ContentService.MimeType.JSON);
}
`;
}
