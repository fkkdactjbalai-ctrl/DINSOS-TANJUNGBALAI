import { SurveyData } from '../types';

export function formatRupiah(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(value);
}

export function exportSurveysToCSV(surveys: SurveyData[]) {
  if (surveys.length === 0) {
    alert('Tidak ada data untuk diekspor!');
    return;
  }

  // Define headers for the flat CSV format (household columns + member columns)
  const headers = [
    // Section 1: Lokasi & Petugas
    'ID Data (DTSEN)',
    'Tanggal Pendataan',
    'Nama Pendata',
    'No KK',
    'Nama Responden',
    'Kecamatan',
    'Kelurahan',
    'Alamat',
    'Latitude (GPS)',
    'Longitude (GPS)',
    'Status Sinkronisasi Cloud',
    'Waktu Sinkronisasi',
    // Section 2: Perumahan
    'Status Pemilikan Rumah',
    'Bukti Pemilikan Tanah',
    'Luas Lantai (m2)',
    'Jenis Lantai',
    'Jenis Dinding',
    'Jenis Atap',
    'Sumber Air Minum',
    'Jarak Air Minum',
    'Sumber Penerangan',
    'Daya Listrik',
    'No Meteran Pelanggan',
    'Bahan Bakar Memasak',
    'Fasilitas BAB',
    'Jenis Kloset',
    'Pembuangan Akhir Tinja',
    // Section 3 & 4 (Family Member Columns - "Tambah Keluarga")
    'No Urut Anggota',
    'Nama Anggota',
    'NIK Anggota',
    'Status Keberadaan',
    'Jenis Kelamin',
    'Tanggal Lahir',
    'Umur',
    'Status Perkawinan',
    'Hubungan KK',
    'Sedang Hamil (Wanita Subur)',
    'Kartu Identitas Dimiliki',
    'Partisipasi Sekolah',
    'Jenjang Pendidikan',
    'Kelas Tertinggi',
    'Ijazah Tertinggi',
    'Apakah Bekerja Seminggu Lalu',
    'Jam Bekerja Seminggu',
    'Lapangan Usaha',
    'Status Pekerjaan',
    'Penghasilan Bulanan (Rp)',
    'Memiliki NPWP',
    'Memiliki Usaha Sendiri',
    'Jumlah Usaha',
    'Pekerja Dibayar',
    'Pekerja Tidak Dibayar',
    'Perizinan Usaha',
    'Omzet Bulanan (Rp)',
    'Internet untuk Usaha',
    'Status PMKS Anggota',
    'Kategori PMKS Anggota',
    'Jenis Disabilitas Anggota',
    // Section 5: Kesehatan, Aset, Sosial
    'Kondisi Gizi Anak (Posyandu)',
    'Penyakit Kronis',
    'Jaminan Kesehatan',
    'Program Bantuan Sosial',
    'Aset Bergerak',
    'Aset Tidak Bergerak',
    'Jumlah Ternak',
    'Akses Internet Keluarga',
    'Memiliki Rekening/Dompet Digital',
    'Penyandang Masalah Kesejahteraan (PMKS Rumah Tangga)',
    'Jenis PMKS Rumah Tangga',
    'Jenis Bantuan Diinginkan',
    'Catatan Petugas',
    // Section 6: Dokumentasi (Metadata status)
    'Lampiran Foto KK',
    'Lampiran Foto Rumah Depan',
    'Lampiran Foto Rumah Dalam'
  ];

  const rows: string[][] = [headers];

  surveys.forEach((survey) => {
    // If the household has no actual family members (shouldn't happen), add one empty row
    const members = survey.anggotaKeluarga && survey.anggotaKeluarga.length > 0 
      ? survey.anggotaKeluarga 
      : [null];

    members.forEach((member) => {
      const row = [
        // Section 1
        survey.id,
        survey.submittedAt ? new Date(survey.submittedAt).toLocaleString('id-ID') : '-',
        survey.namaPendata || '-',
        `="${survey.noKK || ''}"`, // Excel safe text format
        survey.namaResponden || '-',
        survey.kecamatan || '-',
        survey.kelurahan || '-',
        survey.alamat || '-',
        survey.latitude || '-',
        survey.longitude || '-',
        survey.synced ? 'TERKIRIM (CLOUD)' : 'LOKAL',
        survey.syncedAt ? new Date(survey.syncedAt).toLocaleString('id-ID') : '-',
        // Section 2
        survey.statusKepemilikanRumah || '-',
        survey.buktiKepemilikanTanah || '-',
        (survey.luasLantai || 0).toString(),
        survey.jenisLantai || '-',
        survey.jenisDinding || '-',
        survey.jenisAtap || '-',
        survey.sumberAirMinum || '-',
        survey.jarakAirMinum || '-',
        survey.sumberPenerangan || '-',
        survey.dayaListrik || '-',
        survey.noMeteranPelanggan || '-',
        survey.bahanBakarMemasak || '-',
        survey.fasilitasBab || '-',
        survey.jenisKloset || '-',
        survey.pembuanganAkhirTinja || '-',
        // Member Data (dynamic columns)
        member ? (member.noUrut || 0).toString() : '-',
        member ? (member.nama || '-') : '-',
        member ? `="${member.nik || ''}"` : '-', // Excel safe NIK
        member ? (member.keteranganKeberadaan || '-') : '-',
        member ? (member.jenisKelamin || '-') : '-',
        member ? (member.tanggalLahir || '-') : '-',
        member ? (member.umur || 0).toString() : '-',
        member ? (member.statusPerkawinan || '-') : '-',
        member ? (member.statusHubunganKK || '-') : '-',
        member ? (member.sedangHamil || '-') : '-',
        member ? (member.kartuIdentitas ? member.kartuIdentitas.join(', ') : 'Tidak Ada') : '-',
        member ? (member.partisipasiSekolah || '-') : '-',
        member ? (member.jenjangPendidikan || '-') : '-',
        member ? (member.kelasTertinggi || '-') : '-',
        member ? (member.ijazahTertinggi || '-') : '-',
        member ? (member.apakahBekerja || '-') : '-',
        member ? (member.jamBekerja || 0).toString() : '0',
        member ? (member.lapanganUsaha || '-') : '-',
        member ? (member.statusPekerjaan || '-') : '-',
        member ? (member.penghasilanBulanan || 0).toString() : '0',
        member ? (member.memilikiNpwp || '-') : '-',
        member ? (member.memilikiUsaha || '-') : '-',
        member ? (member.jumlahUsaha || 0).toString() : '0',
        member ? (member.pekerjaDibayar || 0).toString() : '0',
        member ? (member.pekerjaTidakDibayar || 0).toString() : '0',
        member ? (member.perizinanUsaha || '-') : '-',
        member ? (member.omzetBulanan || 0).toString() : '0',
        member ? (member.penggunaanInternetUsaha || '-') : '-',
        member ? (member.isPmks || '-') : '-',
        member ? (member.pmksKategori && member.pmksKategori.length > 0 ? member.pmksKategori.join(', ') : '-') : '-',
        member ? (member.jenisDisabilitas || '-') : '-',
        // Section 5
        survey.kondisiGiziAnak || '-',
        survey.penyakitKronis || '-',
        survey.jaminanKesehatan || '-',
        survey.programBantuan && survey.programBantuan.length > 0 ? survey.programBantuan.join(' & ') : '-',
        survey.asetBergerak && survey.asetBergerak.length > 0 ? survey.asetBergerak.join(' & ') : '-',
        survey.asetTidakBergerak && survey.asetTidakBergerak.length > 0 ? survey.asetTidakBergerak.join(' & ') : '-',
        survey.jumlahTernak || '-',
        survey.aksesInternetKeluarga || '-',
        survey.rekeningDompetDigital || '-',
        survey.pmksTerdapat || '-',
        survey.pmksJenis || '-',
        survey.jenisBantuanDiinginkan || '-',
        survey.catatan || '-',
        // Section 6: Dokumentasi (Tersedia / Tidak)
        survey.fotoKK ? 'Tersedia' : 'Tidak Ada',
        survey.fotoRumahDepan ? 'Tersedia' : 'Tidak Ada',
        survey.fotoRumahDalam ? 'Tersedia' : 'Tidak Ada'
      ];

      rows.push(row.map(cell => {
        // Clean double quotes
        const cleanedStr = (cell || '').replace(/"/g, '""');
        // Wrap in quotes if it contains commas, newlines, or double quotes
        if (cleanedStr.includes(',') || cleanedStr.includes('\n') || cleanedStr.includes('"')) {
          return `"${cleanedStr}"`;
        }
        return cleanedStr;
      }));
    });
  });

  const csvContent = '\ufeff' + rows.map(r => r.join(',')).join('\n'); // Add UTF-8 BOM for Indonesian characters & accents in Excel
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  
  const formattedDate = new Date().toISOString().slice(0, 10);
  link.setAttribute('download', `DTSEN_Tanjungbalai_Export_${formattedDate}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
