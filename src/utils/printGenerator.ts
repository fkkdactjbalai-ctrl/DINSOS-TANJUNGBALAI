import { SurveyData } from '../types';
import { formatRupiah } from './csvExport';

export function generatePrintableHtml(survey: SurveyData): string {
  const formattedDate = survey.submittedAt 
    ? new Date(survey.submittedAt).toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : '-';

  const familyMembersRows = survey.anggotaKeluarga?.map((m, index) => {
    const isPmksBadge = m.isPmks === 'Ya' 
      ? `<span style="background-color: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 4px; font-weight: bold; border: 1px solid #fde68a;">PMKS</span>` 
      : `<span style="color: #64748b;">Tidak</span>`;

    const pmksKategoriStr = m.isPmks === 'Ya' && m.pmksKategori && m.pmksKategori.length > 0
      ? `<div style="margin-top: 4px; font-size: 10px; color: #b45309;">${m.pmksKategori.join(', ')} ${m.jenisDisabilitas ? `(${m.jenisDisabilitas})` : ''}</div>`
      : '';

    const usahaStr = m.memilikiUsaha === 'Ya'
      ? `<div style="margin-top: 4px; background-color: #e0e7ff; color: #3730a3; padding: 2px 4px; border-radius: 4px; font-size: 9px; border: 1px solid #c7d2fe;">Usaha: Omzet ${formatRupiah(m.omzetBulanan)}/bln</div>`
      : '';

    return `
      <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
        <td style="padding: 8px; text-align: center; font-weight: bold; color: #334155;">${index + 1}</td>
        <td style="padding: 8px; font-weight: bold; color: #1e293b;">
          ${m.nama || '-'}
          <div style="font-family: monospace; font-size: 10px; color: #64748b; margin-top: 2px;">NIK: ${m.nik || '-'}</div>
        </td>
        <td style="padding: 8px;">
          <div><b>Hubungan:</b> ${m.statusHubunganKK || '-'}</div>
          <div style="color: #475569; margin-top: 2px;">${m.jenisKelamin} | ${m.umur} Thn</div>
          <div style="font-size: 9px; color: #64748b; font-family: monospace;">Lahir: ${m.tanggalLahir || '-'}</div>
          ${m.jenisKelamin === 'Perempuan' && m.sedangHamil === 'Ya' ? `<div style="color: #ef4444; font-weight: bold; font-size: 9px; margin-top: 2px;">⚠️ Sedang Hamil</div>` : ''}
        </td>
        <td style="padding: 8px; color: #334155;">
          <div><b>Partisipasi:</b> ${m.partisipasiSekolah || '-'}</div>
          <div style="font-size: 10px; color: #475569; margin-top: 2px;">Lulusan: ${m.jenjangPendidikan || '-'}</div>
          <div style="font-size: 10px; color: #64748b;">Kelas: ${m.kelasTertinggi || '-'} | Ijazah: ${m.ijazahTertinggi || '-'}</div>
        </td>
        <td style="padding: 8px; color: #334155;">
          <div><b>Bekerja:</b> ${m.apakahBekerja || '-'} ${m.apakahBekerja === 'Ya' ? `(${m.jamBekerja} jam/minggu)` : ''}</div>
          ${m.apakahBekerja === 'Ya' ? `
            <div style="font-size: 10px; color: #1e3a8a; margin-top: 2px; font-weight: 500;">Sektor: ${m.lapanganUsaha || '-'}</div>
            <div style="font-size: 10px; color: #0f766e;">Status: ${m.statusPekerjaan || '-'}</div>
            <div style="font-size: 10px; font-weight: bold; color: #047857;">Gaji: ${formatRupiah(m.penghasilanBulanan || 0)}/bln</div>
          ` : ''}
          ${usahaStr}
        </td>
        <td style="padding: 8px;">
          ${isPmksBadge}
          ${pmksKategoriStr}
        </td>
      </tr>
    `;
  }).join('') || `<tr><td colspan="6" style="padding: 16px; text-align: center; color: #64748b;">Tidak ada anggota keluarga terdata</td></tr>`;

  // Programs and Assets arrays formatted as lists
  const programBansosStr = survey.programBantuan && survey.programBantuan.length > 0
    ? survey.programBantuan.map(p => {
        const detail = p === 'Lainnya' && survey.programBantuanLainnya ? ` (${survey.programBantuanLainnya})` : '';
        return `<span style="background-color: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; padding: 2px 6px; border-radius: 4px; font-size: 10px; display: inline-block; margin: 2px;">${p}${detail}</span>`;
      }).join('')
    : '<span style="color: #94a3b8; font-style: italic;">Tidak menerima bantuan sosial</span>';

  const asetBergerakStr = survey.asetBergerak && survey.asetBergerak.length > 0
    ? survey.asetBergerak.map(a => `<span style="background-color: #e0e7ff; color: #3730a3; border: 1px solid #c7d2fe; padding: 2px 6px; border-radius: 4px; font-size: 10px; display: inline-block; margin: 2px;">${a}</span>`).join('')
    : '<span style="color: #94a3b8; font-style: italic;">Tidak memiliki aset bergerak</span>';

  const asetTidakBergerakStr = survey.asetTidakBergerak && survey.asetTidakBergerak.length > 0
    ? survey.asetTidakBergerak.map(a => `<span style="background-color: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; padding: 2px 6px; border-radius: 4px; font-size: 10px; display: inline-block; margin: 2px;">${a}</span>`).join('')
    : '<span style="color: #94a3b8; font-style: italic;">Tidak memiliki properti/aset tetap</span>';

  // Base64 photos
  const fotoKKHtml = survey.fotoKK && !survey.fotoKK.includes('dummy')
    ? `<img src="${survey.fotoKK}" style="width: 100%; height: 160px; object-fit: cover; border-radius: 8px; border: 1px solid #cbd5e1;" />`
    : `<div style="height: 160px; border-radius: 8px; border: 2px dashed #cbd5e1; background-color: #f8fafc; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 12px; color: #64748b;">
        <span style="font-weight: bold; font-size: 11px;">Foto KK / KTP</span>
        <span style="font-size: 9px; color: #94a3b8; margin-top: 4px;">Tidak Terlampir / Mockup</span>
       </div>`;

  const fotoDepanHtml = survey.fotoRumahDepan && !survey.fotoRumahDepan.includes('dummy')
    ? `<img src="${survey.fotoRumahDepan}" style="width: 100%; height: 160px; object-fit: cover; border-radius: 8px; border: 1px solid #cbd5e1;" />`
    : `<div style="height: 160px; border-radius: 8px; border: 2px dashed #cbd5e1; background-color: #f8fafc; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 12px; color: #64748b;">
        <span style="font-weight: bold; font-size: 11px;">Tampak Depan</span>
        <span style="font-size: 9px; color: #94a3b8; margin-top: 4px;">Tidak Terlampir / Mockup</span>
       </div>`;

  const fotoDalamHtml = survey.fotoRumahDalam && !survey.fotoRumahDalam.includes('dummy')
    ? `<img src="${survey.fotoRumahDalam}" style="width: 100%; height: 160px; object-fit: cover; border-radius: 8px; border: 1px solid #cbd5e1;" />`
    : `<div style="height: 160px; border-radius: 8px; border: 2px dashed #cbd5e1; background-color: #f8fafc; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 12px; color: #64748b;">
        <span style="font-weight: bold; font-size: 11px;">Tampak Dalam</span>
        <span style="font-size: 9px; color: #94a3b8; margin-top: 4px;">Tidak Terlampir / Mockup</span>
       </div>`;

  return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Lembar_Pendataan_DTSEN_${survey.noKK || 'Data'}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    
    * {
      box-sizing: border-box;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }

    body {
      background-color: #ffffff;
      color: #0f172a;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .container {
      width: 100%;
      max-width: 900px;
      margin: 0 auto;
      padding: 30px;
      background-color: #ffffff;
    }

    /* Print styling rules */
    @media print {
      @page {
        size: A4 portrait;
        margin: 10mm;
      }
      body {
        background-color: #ffffff;
      }
      .container {
        padding: 0;
        max-width: 100%;
      }
      .no-print {
        display: none !important;
      }
      .page-break {
        page-break-before: always;
      }
    }

    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 25px;
      border-bottom: 3px double #1e3a8a;
      padding-bottom: 12px;
    }

    .header-logo-container {
      width: 70px;
      text-align: left;
      vertical-align: middle;
    }

    .header-logo {
      width: 55px;
      height: 55px;
      background-color: #1e3a8a;
      border-radius: 6px;
      color: white;
      font-weight: 800;
      font-size: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
      letter-spacing: -1px;
    }

    .header-text-container {
      padding-left: 15px;
      vertical-align: middle;
      text-align: left;
    }

    .header-title-main {
      font-size: 16px;
      font-weight: 800;
      color: #1e3a8a;
      margin: 0;
      letter-spacing: -0.5px;
      text-transform: uppercase;
    }

    .header-subtitle {
      font-size: 11px;
      color: #475569;
      margin: 3px 0 0 0;
      font-weight: 500;
    }

    .header-doc-id {
      text-align: right;
      vertical-align: middle;
      font-size: 11px;
      color: #475569;
    }

    .section-title {
      font-size: 12px;
      font-weight: 700;
      color: #1e3a8a;
      border-bottom: 1.5px solid #cbd5e1;
      padding-bottom: 4px;
      margin-top: 25px;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .grid-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
    }

    .grid-table td {
      padding: 6px 10px;
      vertical-align: top;
      font-size: 11px;
    }

    .field-label {
      color: #64748b;
      font-weight: 600;
      text-transform: uppercase;
      font-size: 9px;
      letter-spacing: 0.3px;
      width: 32%;
    }

    .field-value {
      color: #0f172a;
      font-weight: 600;
      width: 68%;
    }

    .card {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background-color: #f8fafc;
      padding: 15px;
      margin-bottom: 15px;
    }

    .members-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 25px;
    }

    .members-table th {
      background-color: #1e3a8a;
      color: #ffffff;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 10px;
      letter-spacing: 0.5px;
      padding: 8px;
      border: 1px solid #1e3a8a;
      text-align: left;
    }

    .members-table td {
      border: 1px solid #e2e8f0;
    }

    .footer-note {
      font-size: 10px;
      font-style: italic;
      color: #64748b;
      margin-top: 15px;
      padding: 10px;
      background-color: #f8fafc;
      border-left: 3px solid #cbd5e1;
      border-radius: 4px;
    }

    .signatures-section {
      width: 100%;
      margin-top: 40px;
      border-collapse: collapse;
    }

    .signatures-section td {
      width: 50%;
      text-align: center;
      font-size: 11px;
      color: #334155;
    }

    .sign-space {
      height: 75px;
    }

    .btn-floating {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background-color: #2563eb;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 50px;
      font-weight: bold;
      font-size: 13px;
      box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      z-index: 9999;
      transition: all 0.2s ease;
    }

    .btn-floating:hover {
      background-color: #1d4ed8;
      transform: translateY(-2px);
    }

    .coordinate-badge {
      background-color: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
      padding: 4px 8px;
      border-radius: 6px;
      font-family: monospace;
      font-size: 10px;
      display: inline-block;
      margin-top: 3px;
    }
  </style>
</head>
<body>

  <!-- Floating print trigger for previewers -->
  <button onclick="window.print()" class="btn-floating no-print">
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-printer"><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6"/><rect x="6" y="14" width="12" height="8" rx="1"/></svg>
    Cetak / Simpan ke PDF
  </button>

  <div class="container">
    
    <!-- Kop Surat Dinas / Header Form -->
    <table class="header-table">
      <tr>
        <td class="header-logo-container">
          <div class="header-logo">TB</div>
        </td>
        <td class="header-text-container">
          <h1 class="header-title-main">Pemerintah Kota Tanjungbalai</h1>
          <div class="header-subtitle"><b>Dinas Sosial & Dinas Kependudukan</b></div>
          <div class="header-subtitle" style="font-size: 10px; color: #64748b;">Sistem Pendataan Terpadu Sosiografis & Ekonomi Kependudukan (DTSEN)</div>
        </td>
        <td class="header-doc-id">
          <div><b>DTSEN SHEET</b></div>
          <div style="font-family: monospace; font-weight: bold; font-size: 12px; color: #1e3a8a; margin-top: 3px;">ID: ${survey.id || 'N/A'}</div>
          <div style="font-size: 9px; color: #64748b; margin-top: 3px;">Cetak: ${new Date().toLocaleDateString('id-ID')}</div>
        </td>
      </tr>
    </table>

    <!-- Bagian 1: Lokasi -->
    <div class="section-title">Bagian 1: Informasi Petugas & Lokasi Pendataan</div>
    <table class="grid-table" style="border: 1px solid #e2e8f0; border-radius: 6px;">
      <tr>
        <td style="border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; width: 50%;">
          <div class="field-label">Nama Petugas</div>
          <div class="field-value">${survey.namaPendata || '-'}</div>
        </td>
        <td style="border-bottom: 1px solid #e2e8f0; width: 50%;">
          <div class="field-label">Tanggal Pendataan</div>
          <div class="field-value" style="font-size: 10.5px;">${formattedDate}</div>
        </td>
      </tr>
      <tr>
        <td style="border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
          <div class="field-label">Nomor Kartu Keluarga</div>
          <div class="field-value" style="font-family: monospace; font-size: 12px; letter-spacing: 0.5px; color: #1e3a8a;">${survey.noKK || '-'}</div>
        </td>
        <td style="border-bottom: 1px solid #e2e8f0;">
          <div class="field-label">Nama Responden Utama</div>
          <div class="field-value">${survey.namaResponden || '-'}</div>
        </td>
      </tr>
      <tr>
        <td style="border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
          <div class="field-label">Kecamatan</div>
          <div class="field-value">${survey.kecamatan || '-'}</div>
        </td>
        <td style="border-bottom: 1px solid #e2e8f0;">
          <div class="field-label">Kelurahan / Desa</div>
          <div class="field-value">${survey.kelurahan || '-'}</div>
        </td>
      </tr>
      <tr>
        <td colspan="2" style="border-bottom: 1px solid #e2e8f0; background-color: #f8fafc;">
          <div class="field-label">Alamat Lengkap KK</div>
          <div class="field-value" style="font-weight: 500; font-size: 11px; white-space: pre-wrap; margin-top: 2px;">${survey.alamat || '-'}</div>
        </td>
      </tr>
      ${survey.latitude && survey.longitude ? `
      <tr>
        <td colspan="2">
          <div class="field-label">Koordinat Geospasial GPS</div>
          <div>
            <span class="coordinate-badge">LATITUDE: ${survey.latitude}</span>
            <span class="coordinate-badge">LONGITUDE: ${survey.longitude}</span>
            <span style="font-size: 9px; color: #059669; font-weight: 600; margin-left: 6px;">✓ Terverifikasi Satelit</span>
          </div>
        </td>
      </tr>
      ` : ''}
    </table>

    <!-- Bagian 2: Rumah & Sanitasi -->
    <div class="section-title">Bagian 2: Kondisi Perumahan & Fasilitas Sanitasi</div>
    <div class="card">
      <table class="grid-table">
        <tr>
          <td>
            <div class="field-label">Kepemilikan Rumah</div>
            <div class="field-value">${survey.statusKepemilikanRumah || '-'}</div>
          </td>
          <td>
            <div class="field-label">Surat/Bukti Tanah</div>
            <div class="field-value">${survey.buktiKepemilikanTanah || '-'}</div>
          </td>
          <td>
            <div class="field-label">Luas Lantai</div>
            <div class="field-value">${survey.luasLantai || '-'} m²</div>
          </td>
        </tr>
        <tr>
          <td>
            <div class="field-label">Jenis Lantai</div>
            <div class="field-value">${survey.jenisLantai || '-'}</div>
          </td>
          <td>
            <div class="field-label">Jenis Dinding</div>
            <div class="field-value">${survey.jenisDinding || '-'}</div>
          </td>
          <td>
            <div class="field-label">Jenis Atap</div>
            <div class="field-value">${survey.jenisAtap || '-'}</div>
          </td>
        </tr>
        <tr>
          <td>
            <div class="field-label">Sumber Air Minum</div>
            <div class="field-value">${survey.sumberAirMinum || '-'}</div>
          </td>
          <td>
            <div class="field-label">Jarak Sumber Air</div>
            <div class="field-value">${survey.jarakAirMinum || '-'}</div>
          </td>
          <td>
            <div class="field-label">Bahan Bakar Masak</div>
            <div class="field-value">${survey.bahanBakarMemasak || '-'}</div>
          </td>
        </tr>
        <tr>
          <td>
            <div class="field-label">Penerangan Utama</div>
            <div class="field-value">${survey.sumberPenerangan || '-'} (${survey.dayaListrik || '-'})</div>
          </td>
          <td>
            <div class="field-label">No Meteran Listrik</div>
            <div class="field-value" style="font-family: monospace;">${survey.noMeteranPelanggan || '-'}</div>
          </td>
          <td>
            <div class="field-label">Fasilitas Sanitasi</div>
            <div class="field-value">${survey.fasilitasBab || '-'} (${survey.jenisKloset || '-'})</div>
          </td>
        </tr>
      </table>
    </div>

    <!-- Page Break for Members Table if it gets too long -->
    <div class="page-break"></div>

    <!-- Bagian 3 & 4: Anggota Keluarga -->
    <div class="section-title">Bagian 3 & 4: Rincian Anggota Keluarga (${survey.anggotaKeluarga?.length || 0} Terdata)</div>
    <table class="members-table">
      <thead>
        <tr>
          <th style="width: 5%; text-align: center;">No</th>
          <th style="width: 25%;">Nama Lengkap & NIK</th>
          <th style="width: 20%;">Informasi Demografis</th>
          <th style="width: 22%;">Pendidikan & Sekolah</th>
          <th style="width: 18%;">Pekerjaan & Pendapatan</th>
          <th style="width: 10%;">PMKS</th>
        </tr>
      </thead>
      <tbody>
        ${familyMembersRows}
      </tbody>
    </table>

    <!-- Bagian 5: Kesehatan & Bansos -->
    <div class="section-title">Bagian 5: Kesehatan, Aset, Dan Bantuan Sosial</div>
    <div class="card" style="background-color: #ffffff; border: 1px solid #cbd5e1;">
      <table class="grid-table">
        <tr>
          <td style="border-right: 1px solid #f1f5f9; width: 50%;">
            <div style="margin-bottom: 8px;">
              <div class="field-label">Pantauan Gizi Balita (Posyandu)</div>
              <div class="field-value" style="font-size: 11px; color: #1e293b;">${survey.kondisiGiziAnak || '-'}</div>
            </div>
            <div style="margin-bottom: 8px;">
              <div class="field-label">Penyakit Kronis Terdiagnosis</div>
              <div class="field-value" style="font-size: 11px; color: #1e293b;">${survey.penyakitKronis || '-'}</div>
            </div>
            <div style="margin-bottom: 8px;">
              <div class="field-label">Jaminan Kesehatan Utama</div>
              <div class="field-value" style="font-size: 11px; color: #1e293b;">${survey.jaminanKesehatan || '-'}</div>
            </div>
            <div style="margin-bottom: 8px;">
              <div class="field-label">Pendaftaran Data PMKS</div>
              <div class="field-value" style="font-size: 11px; color: #1e3a8a;">${survey.pmksTerdapat || '-'} ${survey.pmksJenis ? `(${survey.pmksJenis})` : ''}</div>
            </div>
          </td>
          <td style="width: 50%;">
            <div style="margin-bottom: 10px;">
              <div class="field-label" style="margin-bottom: 3px;">Program Bantuan Sosial Diterima</div>
              <div>${programBansosStr}</div>
            </div>
            <div style="margin-bottom: 10px;">
              <div class="field-label" style="margin-bottom: 3px;">Daftar Aset Bergerak Rumah Tangga</div>
              <div>${asetBergerakStr}</div>
            </div>
            <div style="margin-bottom: 10px;">
              <div class="field-label" style="margin-bottom: 3px;">Aset Tidak Bergerak (Tanah/Bangunan)</div>
              <div>${asetTidakBergerakStr}</div>
            </div>
          </td>
        </tr>
        <tr>
          <td colspan="2" style="border-top: 1px solid #cbd5e1; padding-top: 10px; background-color: #fff9f2;">
            <div class="field-label" style="color: #b45309;">Jenis Bantuan Kesejahteraan Sosial Yang Diinginkan Responden</div>
            <div class="field-value" style="color: #92400e; font-size: 11.5px; margin-top: 2px;">★ ${survey.jenisBantuanDiinginkan || '-'}</div>
          </td>
        </tr>
        <tr>
          <td colspan="2" style="border-top: 1px solid #cbd5e1; padding-top: 10px;">
            <div class="field-label">Catatan khusus dan Evaluasi Lapangan Petugas Sensus</div>
            <div style="font-style: italic; color: #475569; font-size: 11px; margin-top: 3px; background-color: #f8fafc; padding: 10px; border-radius: 4px; border: 1px solid #e2e8f0; line-height: 1.4;">
              "${survey.catatan || 'Tidak ada catatan tambahan.'}"
            </div>
          </td>
        </tr>
      </table>
    </div>

    <!-- Bagian 6: Dokumentasi Visual -->
    <div class="section-title">Bagian 6: Dokumentasi Lapangan Terlampir</div>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
      <tr>
        <td style="width: 32%; padding-right: 10px;">
          <div style="text-align: center; font-size: 8.5px; font-weight: bold; color: #475569; text-transform: uppercase; margin-bottom: 5px;">Foto Identifikasi KK / KTP</div>
          ${fotoKKHtml}
        </td>
        <td style="width: 32%; padding: 0 5px;">
          <div style="text-align: center; font-size: 8.5px; font-weight: bold; color: #475569; text-transform: uppercase; margin-bottom: 5px;">Foto Tampak Depan Rumah</div>
          ${fotoDepanHtml}
        </td>
        <td style="width: 32%; padding-left: 10px;">
          <div style="text-align: center; font-size: 8.5px; font-weight: bold; color: #475569; text-transform: uppercase; margin-bottom: 5px;">Foto Tampak Dalam Rumah</div>
          ${fotoDalamHtml}
        </td>
      </tr>
    </table>

    <div class="footer-note">
      <b>Lembar Pernyataan Keabsahan Data:</b> Data di atas telah dikonfirmasi oleh kepala keluarga / responden bersangkutan dan dicatat secara langsung di lokasi kejadian oleh Petugas Lapangan menggunakan instrumen DTSEN Kota Tanjungbalai yang sah secara hukum dan administrasi negara.
    </div>

    <!-- Tanda Tangan / Legitimasi Form -->
    <table class="signatures-section">
      <tr>
        <td>
          <div>Mengetahui,</div>
          <div style="font-weight: bold; margin-top: 3px;">Kepala Lingkungan / Lurah setempat</div>
          <div class="sign-space"></div>
          <div style="border-bottom: 1px solid #000000; width: 180px; margin: 0 auto;"></div>
          <div style="font-size: 9px; color: #64748b; margin-top: 3px;">Nama & NIP / Tanda Tangan & Stempel Resmi</div>
        </td>
        <td>
          <div>Tanjungbalai, ${new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
          <div style="font-weight: bold; margin-top: 3px;">Petugas Lapangan Pendataan</div>
          <div class="sign-space"></div>
          <div style="border-bottom: 1px solid #000000; width: 180px; margin: 0 auto; font-weight: bold;">${survey.namaPendata || '...........................................'}</div>
          <div style="font-size: 9px; color: #64748b; margin-top: 3px;">Tanda Tangan Petas Lapangan</div>
        </td>
      </tr>
    </table>

  </div>

  <script>
    // Automatically trigger printing when loaded in a new tab
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 800);
    };
  </script>
</body>
</html>
  `;
}
