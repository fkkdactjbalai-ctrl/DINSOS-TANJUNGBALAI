export interface FamilyMember {
  id: string; // unique local ID
  noUrut: number;
  nama: string;
  nik: string;
  keteranganKeberadaan: string;
  jenisKelamin: 'Laki-laki' | 'Perempuan';
  tanggalLahir: string;
  umur: number;
  statusPerkawinan: string;
  statusHubunganKK: string;
  sedangHamil: string; // Only applicable for females of reproductive age
  kartuIdentitas: string[]; // e.g. KTP, KIA, etc.

  // Section 4 details are nested per family member for extreme UX cleanliness
  partisipasiSekolah: string;
  jenjangPendidikan: string;
  kelasTertinggi: string;
  ijazahTertinggi: string;
  apakahBekerja: 'Ya' | 'Tidak';
  jamBekerja: number;
  lapanganUsaha: string;
  statusPekerjaan: string;
  penghasilanBulanan: number; // monthly income if working
  memilikiNpwp: 'Ya' | 'Tidak';
  memilikiUsaha: 'Ya' | 'Tidak';
  jumlahUsaha: number;
  pekerjaDibayar: number;
  pekerjaTidakDibayar: number;
  perizinanUsaha: string;
  omzetBulanan: number;
  penggunaanInternetUsaha: 'Ya' | 'Tidak';
  isPmks: 'Ya' | 'Tidak';
  pmksKategori: string[]; // PMKS Permensos categories
  jenisDisabilitas?: string; // Specific disability type if Penyandang Disabilitas selected
}

export interface SurveyData {
  id: string; // unique submission ID
  submittedAt: string;

  // Section 1: Data Petugas & Lokasi
  namaPendata: string;
  noKK: string;
  namaResponden: string;
  kecamatan: string;
  kelurahan: string;
  alamat: string;

  // Section 2: Kondisi Perumahan & Fasilitas
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

  // Section 3 & 4: Anggota Keluarga (Array)
  anggotaKeluarga: FamilyMember[];

  // Section 5: Kesehatan, Aset & Sosial
  kondisiGiziAnak: string;
  penyakitKronis: string;
  jaminanKesehatan: string;
  programBantuan: string[]; // Checkbox multiple
  asetBergerak: string[]; // Checkbox multiple
  asetTidakBergerak: string[]; // Checkbox multiple
  jumlahTernak: string;
  aksesInternetKeluarga: string;
  rekeningDompetDigital: 'Ya' | 'Tidak';
  pmksTerdapat: string; // e.g. "Ada, Lansia terlantar" or "Tidak Ada"
  pmksJenis?: string;
  jenisBantuanDiinginkan: string;
  catatan: string;

  // Section 6: Dokumentasi (Base64 atau data URL strings)
  fotoKK: string;
  fotoRumahDepan: string;
  fotoRumahDalam: string;

  // New Geolocation Coordinates for direct mapping/charts
  latitude?: string;
  longitude?: string;

  // Sync details for Google Sheets / Apps Script
  synced?: boolean;
  syncedAt?: string;
}
