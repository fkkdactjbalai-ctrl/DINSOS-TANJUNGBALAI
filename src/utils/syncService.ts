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
 * Fetches all surveys from the Google Apps Script Web App.
 */
export async function fetchSurveysFromGoogleAppsScript(
  url: string
): Promise<{ success: boolean; surveys?: SurveyData[]; message: string }> {
  if (!url || !url.trim().startsWith('http')) {
    return { 
      success: false, 
      message: 'URL Google Apps Script tidak valid.' 
    };
  }

  try {
    const fetchUrl = `${url.trim()}${url.includes('?') ? '&' : '?'}action=get_dtsen_data`;
    const response = await fetch(fetchUrl, {
      method: 'GET',
      mode: 'cors',
    });

    if (response.ok) {
      const jsonResult = await response.json();
      if (jsonResult && jsonResult.status === 'success') {
        return {
          success: true,
          surveys: jsonResult.surveys,
          message: `Berhasil menarik ${jsonResult.surveys?.length || 0} data dari Google Sheets.`
        };
      } else if (jsonResult && jsonResult.status === 'online') {
        return {
          success: false,
          message: 'Script Anda terdeteksi masih menggunakan versi lama (belum mendukung pengambilan data). Silakan salin "Kode Google Apps Script" terbaru dari menu "Lihat Script" di tabel data, lalu buat "Penerapan Baru" (New Deployment) dengan akses "Siapa Saja" (Anyone) di Google Sheets Anda!'
        };
      } else {
        return {
          success: false,
          message: `Server mengembalikan status gagal: ${jsonResult?.message || 'Format tidak dikenal. Kemungkinan Anda belum memperbarui kode Apps Script Anda ke versi terbaru.'}`
        };
      }
    } else {
      return {
        success: false,
        message: `HTTP Error: ${response.status} (${response.statusText})`
      };
    }
  } catch (error: any) {
    console.error('Error fetching surveys from Google Apps Script:', error);
    return {
      success: false,
      message: `Gagal menarik data dari awan: ${error.message || 'Periksa koneksi atau URL script Anda'}`
    };
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
 * 5. Klik 'Terapkan' atau 'Deploy' -> 'Penerapan Baru' atau 'New Deployment'.
 * 6. Pilih Jenis: 'Aplikasi Web' atau 'Web App'.
 * 7. Akses: 'Siapa saja' atau 'Anyone'. Klik Terapkan lalu salin URL web aplikasinya.
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
        "CATATAN_SURVEY",
        "RAW_JSON"
      ]);
      
      // Mendesain header agar tampak rapi
      var headerRange = sheet.getRange(1, 1, 1, 19);
      headerRange.setFontWeight("bold");
      headerRange.setBackground("#4F46E5");
      headerRange.setFontColor("#FFFFFF");
      headerRange.setHorizontalAlignment("center");
    }
    
    // Cek apakah ID_DATA sudah ada di Sheet untuk meremajakan (update) data dan menghindari duplikasi
    var existingRowIndex = -1;
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      var idValues = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      for (var i = 0; i < idValues.length; i++) {
        if (idValues[i][0] === flatData.id) {
          existingRowIndex = i + 2; // Baris di sheet mulai dari 1, ditambah offset header (baris 2 adalah indexes index 0)
          break;
        }
      }
    }
    
    var rowData = [
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
      flatData.catatan,
      JSON.stringify(payload.raw)
    ];
    
    if (existingRowIndex !== -1) {
      // Overwrite baris yang sudah ada (menghindari data ganda)
      var range = sheet.getRange(existingRowIndex, 1, 1, rowData.length);
      range.setValues([rowData]);
    } else {
      // Tambah baris baru jika belum terdata
      sheet.appendRow(rowData);
    }
    
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

// Fungsi untuk menarik data bagi Admin, atau mengetes koneksi dasar (GET request)
function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("DTSEN_Data");
    
    // Jika parameter 'action' adalah 'get_dtsen_data', kembalikan semua data raw
    if (e && e.parameter && e.parameter.action === 'get_dtsen_data') {
      var dataList = [];
      if (sheet) {
        var lastRow = sheet.getLastRow();
        if (lastRow > 1) {
          // Kolom RAW_JSON berada di kolom ke-19
          var rawValues = sheet.getRange(2, 19, lastRow - 1, 1).getValues();
          for (var i = 0; i < rawValues.length; i++) {
            var rawStr = rawValues[i][0];
            if (rawStr) {
              try {
                dataList.push(JSON.parse(rawStr));
              } catch (parseErr) {
                // Lewati jika format tidak valid
              }
            }
          }
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ 
        "status": "success", 
        "surveys": dataList 
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Default ping response
    return ContentService.createTextOutput(JSON.stringify({ 
      "status": "online", 
      "app": "DTSEN Kota Tanjungbalai Cloud Sync Link Active!", 
      "timestamp": new Date().toISOString() 
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ 
      "status": "error", 
      "message": err.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
`;
}
