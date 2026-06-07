import { SurveyData, FamilyMember } from '../types';

export const KECAMATAN_KELURAHAN: Record<string, string[]> = {
  'Kecamatan Datuk Bandar': ['Sirantau', 'Sijambi', 'Pantai Johor', 'Pahang', 'Gading'],
  'Kecamatan Datuk Bandar Timur': ['Pulau Simardan', 'Selat Lancang', 'Selat Tanjung Medan', 'Semula Jadi', 'Bunga Tanjung'],
  'Kecamatan Teluk Nibung': ['Beting Kuala Kapias', 'Kapias Pulau Buaya', 'Sei Merbau', 'Pematang Pasir', 'Perjuangan'],
  'Kecamatan Sei Tualang Raso': ['Keramat Kubah', 'Sumber Sari', 'Pasar Baru', 'Sei Raja', 'Muara Sentosa'],
  'Kecamatan Tanjungbalai Selatan': ['Tanjungbalai Kota I', 'Tanjungbalai Kota II', 'Perwira', 'Pantai Burung', 'Indra Sakti', 'Karya'],
  'Kecamatan Tanjungbalai Utara': ['Tanjungbalai Kota III', 'Tanjungbalai Kota IV', 'Sejahtera', 'Matahalasan', 'Kuala Silo Bestari']
};

export const STATUS_KEPEMILIKAN_RUMAH = [
  'Milik Sendiri',
  'Kontrak / Sewa',
  'Bebas Sewa (Milik Orang Lain/Keluarga)',
  'Rumah Dinas',
  'Lainnya'
];

export const BUKTI_KEPEMILIKAN_TANAH = [
  'Sertifikat Hak Milik (SHM)',
  'Sertifikat Hak Guna Bangunan (SHGB)',
  'Akta Jual Beli (AJB)',
  'Girik / Petuk / Letter C',
  'Surat Keterangan Tanah (SKT)',
  'Tidak Ada / Menumpang',
  'Lainnya'
];

export const JENIS_LANTAI_TERLUAS = [
  'MARMET/GRANIT',
  'KERAMIK',
  'PARKET/VINIL/KARPET',
  'UBIN/TEGEL/TERASO',
  'KAYU/PAPAN',
  'SEMEN/BATAMERAH',
  'BAMBU',
  'TANAH',
  'LAINNYA'
];

export const JENIS_DINDING_TERLUAS = [
  'TEMBOK',
  'PLESTERAN ANYAMAN BAMBU',
  'KAYU/PAPAN/GYPSUM/GRC/CALCIBOARD',
  'ANYAMAN BAMBU',
  'BATANG KAYU',
  'BAMBU',
  'LAINNYA'
];

export const JENIS_ATAP_TERLUAS = [
  'BETON',
  'GENTENG',
  'SENG',
  'ASBES',
  'BAMBU',
  'KAYU/SIRAP',
  'JERAMI/IJUK/DAUN-DAUNAN/RUMBIA',
  'LAINNYA'
];

export const SUMBER_AIR_MINUM = [
  'AIR KEMASAN BERMERK',
  'AIR ISI ULANG',
  'LEDING',
  'SUMUR BOR/POMPA',
  'SUMUR TERLINDUNG',
  'SUMUR TAK TERLINDUNG',
  'MATA AIR TERLINDUNG',
  'MATA AIR TAK TERLINDUNG',
  'AIR PERMUKAAN (SUNGAI/DANAU/WADUK/KOLAM/IRIGASI)',
  'AIR HUJAN',
  'DAN LAINNYA'
];

export const JARAK_AIR_MINUM = [
  'Di dalam rumah / Terintegrasi',
  'Kurang dari 10 meter',
  '10 meter atau lebih'
];

export const SUMBER_PENERANGAN = [
  'LISTRIK PLN DENGAN METERAN',
  'LISTRIK PLN TANPA METERAN',
  'LISTRIK NON-PLN',
  'DAN BUKAN LISTRIK'
];

export const DAYA_LISTRIK = [
  'Bukan Pengguna PLN / Tidak Ada',
  '450 VA',
  '900 VA',
  '1300 VA',
  '2200 VA',
  '3500 VA ke atas'
];

export const BAHAN_BAKAR_MEMASAK = [
  'LISTRIK',
  'GAS ELPIJI 5,5 KG',
  'GAS ELPIJI 12 KG',
  'GAS ELPIJI 3 KG',
  'GAS KOTA/METERAN PGN',
  'BIOGAS',
  'MINYAK TANAH',
  'BRIKET',
  'ARANG',
  'KAYU BAKAR',
  'LAINNYA',
  'DAN TIDAK MEMASAK DIRUMAH'
];

export const FASILITAS_BAB = [
  'Milik Sendiri (Jamban Pribadi)',
  'Milik Bersama (Dengan Tetangga/Keluarga Lain)',
  'Jamban Umum / MCK Komunal',
  'Tidak Ada (Sungai/Kolam/Kebun)'
];

export const JENIS_KLOSET = [
  'Leher Angsa',
  'Plengsengan (Dengan Penutup)',
  'Cubluk / Cemplung (Tanpa Penutup)',
  'Lainnya'
];

export const PEMBUANGAN_AKHIR_TINJA = [
  'Tangki Septik (Septic Tank) Terlindungi',
  'Tangki Septik Tanpa Peresapan / Bocor',
  'Lubang Tanah',
  'Kolam / Sawah / Sungai / Selokan',
  'Pantai / Laut / Kebun',
  'Lainnya'
];

export const KETERANGAN_KEBERADAAN = [
  'TINGGAL BERSAMA KELUARGA',
  'MENINGGAL',
  'TIDAK TINGGAL BERSAMA KELUARGA / PINDAH KEWILAYAH (DAERAH) LAIN DI INDONESIA',
  'TIDAK TINGGAL BERSAMA KELUARGA/PINDAH KELUAR NEGERI',
  'ANGGOTA KELUARGA BARU',
  'DAN TIDAK DITEMUKAN'
];

export const STATUS_PERKAWINAN = [
  'Belum Kawin',
  'Kawin / Menikah',
  'Cerai Hidup',
  'Cerai Mati'
];

export const HUBUNGAN_KEPALA_KELUARGA = [
  'Kepala Keluarga',
  'Istri',
  'Anak',
  'Orang Tua',
  'Mertua',
  'Cucu',
  'Famili Lain',
  'Lainnya'
];

export const PARTISIPASI_SEKOLAH = [
  'Tidak / Belum Pernah Sekolah',
  'Masih Sekolah',
  'Tidak Sekolah Lagi'
];

export const JENJANG_PENDIDIKAN = [
  'Tidak / Belum Sekolah',
  'SD / MI / Paket A',
  'SMP / MTs / Paket B',
  'SMA / MA / SMK / Paket C',
  'Diploma I / II / III',
  'Diploma IV / Sarjana (S1)',
  'Magister (S2)',
  'Doktor (S3)',
  'Sekolah Luar Biasa (SLB)',
  'Lainnya'
];

export const KELAS_TERTINGGI = [
  'Belum pernah duduk di kelas',
  'Kelas 1',
  'Kelas 2',
  'Kelas 3',
  'Kelas 4',
  'Kelas 5',
  'Kelas 6',
  'Tamat / Selesai'
];

export const IJAZAH_TERTINGGI = [
  'Tidak Memiliki Ijazah / Belum Tamat',
  'SD / Sederajat',
  'SMP / Sederajat',
  'SMA / Sederajat / Kejuruan',
  'Diploma I / II / III',
  'Diploma IV / S1',
  'S2 / S3'
];

export const LAPANGAN_USAHA = [
  'Pertanian, Perkebunan, dan Tanaman Pangan',
  'Kehutanan, Penebangan Kayu, dan Hasil Hutan',
  'Perikanan Tangkap, Budidaya, dan Jasa Kelautan',
  'Pertambangan Minyak, Gas Bumi, dan Panas Bumi',
  'Pertambangan Batubara, Bijih Logam, dan Penggalian Lainnya',
  'Industri Pengolahan Makanan, Minuman, dan Tembakau',
  'Industri Tekstil, Pakaian Jadi, Kulit, dan Alas Kaki',
  'Industri Kayu, Barang dari Kayu, anyaman, dan Kertas',
  'Industri Kimia, Farmasi, Karet, Plastik, dan Non-Logam',
  'Industri Logam Dasar, Barang Logam, Mesin, Elektronik, dan Peralatan',
  'Pengadaan Listrik, Gas, Uap/Air Panas, dan Udara Dingin',
  'Pengelolaan Air, Pengelolaan Sampah, Limbah, dan Daur Ulang',
  'Konstruksi Gedung, Sipil, dan Konstruksi Khusus',
  'Perdagangan Besar dan Eceran, Reparasi Mobil dan Sepeda Motor',
  'Transportasi Darat (Angkutan Umum, Kereta, Ojek, dll)',
  'Transportasi Air/Udara, Pergudangan, dan Kurir Jasa Pengiriman',
  'Penyediaan Akomodasi, Perhotelan, Wisma, dan Penginapan',
  'Penyediaan Makanan dan Minuman (Restoran, Warung, Katering)',
  'Aktivitas Penerbitan, Penyiaran, Pos, Telekomunikasi, dan Jasa IT',
  'Jasa Keuangan, Lembaga Pembiayaan, Koperasi, dan Asuransi',
  'Real Estat, Perumahan, Jual Beli/Sewa Properti',
  'Jasa Profesional, Ilmiah, Teknis, Hukum, Keahlian Khusus, dan Riset',
  'Administrasi Pemerintahan, Pertahanan, Jaminan Sosial Wajib (PNS/TNI/Polri)',
  'Jasa Pendidikan, Sekolah, Pembelajaran, dan Pelatihan',
  'Jasa Kesehatan Manusia, Klinik, Rumah Sakit, Praktik Mandiri, dan Sosial',
  'Kesenian, Rekreasi, Olahraga, Jasa Perorangan Lainnya (Salon, Laundry, dll)'
];

export const STATUS_PEKERJAAN = [
  'Berusaha Sendiri',
  'Berusaha Dibantu Buruh Tidak Tetap / Tidak Dibayar',
  'Berusaha Dibantu Buruh Tetap / Dibayar',
  'Buruh / Karyawan / Pegawai Swasta',
  'Pekerja Bebas (Serabutan)',
  'Pekerja Keluarga / Tidak Dibayar'
];

export const PERIZINAN_USAHA = [
  'Tidak Memiliki Usaha',
  'Tidak Memiliki Izin Usaha',
  'Nomor Induk Berusaha (NIB)',
  'Izin Usaha Mikro Kecil (IUMK)',
  'SIUP / TDP / Izin Edar Resmi',
  'Lainnya (PIRT, Halal dll)'
];

export const KONDISI_GIZI = [
  'Baik / Sesuai Kurva Pertumbuhan',
  'Kurang (Underweight)',
  'Sangat Kurang (Gizi Buruk / Stunting)',
  'Gizi Lebih (Obesitas / Overweight)',
  'Tidak Ada Anak Balita di Rumah / Tidak Terukur'
];

export const PENYAKIT_KRONIS = [
  'Tidak Ada Penyakit Kronis',
  'Jantung / Hipertensi Kronis',
  'Stroke / Kelumpuhan',
  'Diabetes Melitus / Kencing Manis',
  'TBC / Paru-Paru Menahun',
  'Kanker / Tumor ganas',
  'Gagal Ginjal Menahun',
  'Asma / Gangguan Pernapasan Berat',
  'Lainnya'
];

export const JAMINAN_KESEHATAN = [
  'Ada, BPJS Kesehatan PBI (Pemerintah/Gratis)',
  'Ada, BPJS Kesehatan Non-PBI (Mandiri/Perusahaan)',
  'Ada, Jamkesda / Jaminan Daerah',
  'Ada, Asuransi Kesehatan Swasta',
  'Tidak Memiliki Jaminan Kesehatan'
];

export const PROGRAM_BANTUAN = [
  'Program Keluarga Harapan (PKH)',
  'Bantuan Pangan Non-Tunai (BPNT / Sembako)',
  'Bantuan Langsung Tunai (BLT Dana Desa / APBD)',
  'Program Indonesia Pintar (PIP / Beasiswa)',
  'Kartu Prakerja / Pelatihan Ketenagakerjaan',
  'Penerima Bantuan Iuran Jaminan Kesehatan (PBI JK)',
  'Tidak Menerima Program Bantuan'
];

export const ASET_BERGERAK = [
  'Sepeda Motor',
  'Mobil Pribadi',
  'Televisi / Smart TV',
  'Kulkas / Lemari Es',
  'Mesin Cuci',
  'AC (Air Conditioner)',
  'Laptop / Tablet / Komputer',
  'Perahu / Perahu Motor (Nelayan)',
  'Tidak Memiliki Aset Bergerak'
];

export const ASET_TIDAK_BERGERAK = [
  'Tanah / Sawah / Ladang di lokasi lain',
  'Rumah Kedua / Kontrakan yang disewakan',
  'Kebun / Hutan Rakyat',
  'Tidak Memiliki Aset Tidak Bergerak'
];

export const AKSES_INTERNET = [
  'WiFi Fiber Optik Berlangganan (Daring/Indihome dll)',
  'Paket Data Selular Handphone',
  'WiFi Publik / Menumpang Tetangga',
  'Tidak Menggunakan Akses Internet'
];

export const JENIS_BANTUAN_DIINGINKAN = [
  'Bantuan Modal Usaha Mandiri',
  'Bantuan Sembako rutin bulanan',
  'Bantuan Rehabilitasi / Bedah Rumah',
  'Beasiswa Pendidikan Anak sekolah',
  'Akses Jaminan Kesehatan Gratis (PBI)',
  'Alat Produksi Usaha (Mesin Jahit, Alat Tani, dll)',
  'Lainnya'
];

export const LIST_PMKS = [
  'Tidak Ada PMKS',
  'Lanjut Usia Terlantar / Rawan Sosial',
  'Penyandang Disabilitas (Fisik/Intelektual/Sensorik)',
  'Anak Terlantar / Yatim Piatu Rawan',
  'Korban Kekerasan / Eksploitasi',
  'Gelandangan / Pengemis',
  'Lainnya'
];

export const PMKS_CATEGORIES = [
  'Anak Balita Terlantar',
  'Anak Terlantar',
  'Anak yang Berhadapan dengan Hukum',
  'Anak Jalanan',
  'Anak dengan Kedisabilitasan (ADK)',
  'Anak Korban Tindak Kekerasan atau Diperlakukan Salah',
  'Anak yang Memerlukan Perlindungan Khusus',
  'Lanjut Usia Terlantar',
  'Penyandang Disabilitas',
  'Tuna Susila',
  'Gelandangan',
  'Pengemis',
  'Pemulung',
  'Korban Penyalahgunaan NAPZA',
  'Bekas Warga Binaan Lembaga Pemasyarakatan (BWBLP)',
  'Orang dengan HIV/AIDS (ODHA)',
  'Korban Tindak Kekerasan',
  'Pekerja Migran Bermasalah Sosial / Terlantar',
  'Korban Bencana Alam',
  'Korban Bencana Sosial',
  'Perempuan Rawan Sosial Ekonomi',
  'Fakir Miskin',
  'Keluarga Bermasalah Sosial Psikologis',
  'Keluarga Rumah Tidak Layak Huni',
  'Komunitas Adat Terpencil',
  'Korban Perdagangan Orang (TPPO)'
];

export const emptyFamilyMember = (): FamilyMember => ({
  id: Math.random().toString(36).substring(2, 9),
  noUrut: 1,
  nama: '',
  nik: '',
  keteranganKeberadaan: 'TINGGAL BERSAMA KELUARGA',
  jenisKelamin: 'Laki-laki',
  tanggalLahir: '',
  umur: 0,
  statusPerkawinan: 'Belum Kawin',
  statusHubunganKK: 'Kepala Keluarga',
  sedangHamil: 'Tidak / Bukan Wanita Subur',
  kartuIdentitas: ['KTP'],
  partisipasiSekolah: 'Masih Sekolah',
  jenjangPendidikan: 'SD / MI / Paket A',
  kelasTertinggi: 'Kelas 6',
  ijazahTertinggi: 'Tidak Memiliki Ijazah / Belum Tamat',
  apakahBekerja: 'Tidak',
  jamBekerja: 0,
  lapanganUsaha: 'Kesenian, Rekreasi, Olahraga, Jasa Perorangan Lainnya (Salon, Laundry, dll)',
  statusPekerjaan: 'Pekerja Keluarga / Tidak Dibayar',
  penghasilanBulanan: 0,
  memilikiNpwp: 'Tidak',
  memilikiUsaha: 'Tidak',
  jumlahUsaha: 0,
  pekerjaDibayar: 0,
  pekerjaTidakDibayar: 0,
  perizinanUsaha: 'Tidak Memiliki Usaha',
  omzetBulanan: 0,
  penggunaanInternetUsaha: 'Tidak',
  isPmks: 'Tidak',
  pmksKategori: [],
  jenisDisabilitas: ''
});

export const emptySurvey = (): SurveyData => ({
  id: '',
  submittedAt: '',
  namaPendata: '',
  noKK: '',
  namaResponden: '',
  kecamatan: '',
  kelurahan: '',
  alamat: '',
  statusKepemilikanRumah: 'Milik Sendiri',
  buktiKepemilikanTanah: 'Sertifikat Hak Milik (SHM)',
  luasLantai: 60,
  jenisLantai: 'KERAMIK',
  jenisDinding: 'TEMBOK',
  jenisAtap: 'GENTENG',
  sumberAirMinum: 'LEDING',
  jarakAirMinum: 'Di dalam rumah / Terintegrasi',
  sumberPenerangan: 'LISTRIK PLN DENGAN METERAN',
  dayaListrik: '900 VA',
  noMeteranPelanggan: '',
  bahanBakarMemasak: 'GAS ELPIJI 3 KG',
  fasilitasBab: 'Milik Sendiri (Jamban Pribadi)',
  jenisKloset: 'Leher Angsa',
  pembuanganAkhirTinja: 'Tangki Septik (Septic Tank) Terlindungi',
  anggotaKeluarga: [emptyFamilyMember()],
  kondisiGiziAnak: 'Baik / Sesuai Kurva Pertumbuhan',
  penyakitKronis: 'Tidak Ada Penyakit Kronis',
  jaminanKesehatan: 'Ada, BPJS Kesehatan PBI (Pemerintah/Gratis)',
  programBantuan: ['Bantuan Pangan Non-Tunai (BPNT / Sembako)'],
  asetBergerak: ['Sepeda Motor', 'Televisi / Smart TV', 'Kulkas / Lemari Es'],
  asetTidakBergerak: ['Tidak Memiliki Aset Tidak Bergerak'],
  jumlahTernak: 'Tidak Punya Ternak',
  aksesInternetKeluarga: 'Paket Data Selular Handphone',
  rekeningDompetDigital: 'Ya',
  pmksTerdapat: 'Tidak Ada PMKS',
  jenisBantuanDiinginkan: 'Bantuan Modal Usaha Mandiri',
  catatan: '',
  fotoKK: '',
  fotoRumahDepan: '',
  fotoRumahDalam: '',
  latitude: '',
  longitude: ''
});

// A complete sample / dummy survey to speed up user testing!
export const seedSurveys: SurveyData[] = [
  {
    id: 'srv_9841243',
    submittedAt: '2026-05-30T10:15:00Z',
    namaPendata: 'Stempel Kito Tanjungbalai',
    noKK: '3273150908850021',
    namaResponden: 'Ahmad Hermawan',
    kecamatan: 'Kecamatan Datuk Bandar',
    kelurahan: 'Sijambi',
    alamat: 'Jl. Jend. Sudirman No. 45 RT 02/RW 04, Kel. Sijambi, Kec. Datuk Bandar, Tg. Balai',
    latitude: '2.964210',
    longitude: '99.801240',
    statusKepemilikanRumah: 'Milik Sendiri',
    buktiKepemilikanTanah: 'Sertifikat Hak Milik (SHM)',
    luasLantai: 72,
    jenisLantai: 'MARMET/GRANIT',
    jenisDinding: 'TEMBOK',
    jenisAtap: 'GENTENG',
    sumberAirMinum: 'LEDING',
    jarakAirMinum: 'Di dalam rumah / Terintegrasi',
    sumberPenerangan: 'LISTRIK PLN DENGAN METERAN',
    dayaListrik: '1300 VA',
    noMeteranPelanggan: '840139942001',
    bahanBakarMemasak: 'GAS ELPIJI 3 KG',
    fasilitasBab: 'Milik Sendiri (Jamban Pribadi)',
    jenisKloset: 'Leher Angsa',
    pembuanganAkhirTinja: 'Tangki Septik (Septic Tank) Terlindungi',
    anggotaKeluarga: [
      {
        id: 'mem_1',
        noUrut: 1,
        nama: 'Ahmad Hermawan',
        nik: '3273151204800003',
        keteranganKeberadaan: 'TINGGAL BERSAMA KELUARGA',
        jenisKelamin: 'Laki-laki',
        tanggalLahir: '1980-04-12',
        umur: 46,
        statusPerkawinan: 'Kawin / Menikah',
        statusHubunganKK: 'Kepala Keluarga',
        sedangHamil: 'Tidak / Bukan Wanita Subur',
        kartuIdentitas: ['KTP'],
        partisipasiSekolah: 'Tidak Sekolah Lagi',
        jenjangPendidikan: 'SMA / MA / SMK / Paket C',
        kelasTertinggi: 'Tamat / Selesai',
        ijazahTertinggi: 'SMA / Sederajat / Kejuruan',
        apakahBekerja: 'Ya',
        jamBekerja: 45,
        lapanganUsaha: 'Perdagangan Besar dan Eceran, Reparasi Mobil dan Sepeda Motor',
        statusPekerjaan: 'Berusaha Sendiri',
        penghasilanBulanan: 3500000,
        memilikiNpwp: 'Ya',
        memilikiUsaha: 'Ya',
        jumlahUsaha: 1,
        pekerjaDibayar: 0,
        pekerjaTidakDibayar: 1,
        perizinanUsaha: 'Nomor Induk Berusaha (NIB)',
        omzetBulanan: 4500000,
        penggunaanInternetUsaha: 'Ya',
        isPmks: 'Tidak',
        pmksKategori: []
      },
      {
        id: 'mem_2',
        noUrut: 2,
        nama: 'Aminah Kartini',
        nik: '3273151806850022',
        keteranganKeberadaan: 'TINGGAL BERSAMA KELUARGA',
        jenisKelamin: 'Perempuan',
        tanggalLahir: '1985-06-18',
        umur: 40,
        statusPerkawinan: 'Kawin / Menikah',
        statusHubunganKK: 'Istri',
        sedangHamil: 'Tidak',
        kartuIdentitas: ['KTP'],
        partisipasiSekolah: 'Tidak Sekolah Lagi',
        jenjangPendidikan: 'SMA / MA / SMK / Paket C',
        kelasTertinggi: 'Tamat / Selesai',
        ijazahTertinggi: 'SMA / Sederajat / Kejuruan',
        apakahBekerja: 'Ya',
        jamBekerja: 30,
        lapanganUsaha: 'Perdagangan Besar dan Eceran, Reparasi Mobil dan Sepeda Motor',
        statusPekerjaan: 'Pekerja Keluarga / Tidak Dibayar',
        penghasilanBulanan: 1200000,
        memilikiNpwp: 'Tidak',
        memilikiUsaha: 'Tidak',
        jumlahUsaha: 0,
        pekerjaDibayar: 0,
        pekerjaTidakDibayar: 0,
        perizinanUsaha: 'Tidak Memiliki Usaha',
        omzetBulanan: 0,
        penggunaanInternetUsaha: 'Tidak',
        isPmks: 'Tidak',
        pmksKategori: []
      },
      {
        id: 'mem_3',
        noUrut: 3,
        nama: 'Rizky Ramadhan',
        nik: '3273152410100025',
        keteranganKeberadaan: 'TINGGAL BERSAMA KELUARGA',
        jenisKelamin: 'Laki-laki',
        tanggalLahir: '2010-10-24',
        umur: 15,
        statusPerkawinan: 'Belum Kawin',
        statusHubunganKK: 'Anak',
        sedangHamil: 'Tidak / Bukan Wanita Subur',
        kartuIdentitas: ['KIA'],
        partisipasiSekolah: 'Masih Sekolah',
        jenjangPendidikan: 'SMP / MTs / Paket B',
        kelasTertinggi: 'Kelas 3',
        ijazahTertinggi: 'SD / Sederajat',
        apakahBekerja: 'Tidak',
        jamBekerja: 0,
        lapanganUsaha: 'Kesenian, Rekreasi, Olahraga, Jasa Perorangan Lainnya (Salon, Laundry, dll)',
        statusPekerjaan: 'Pekerja Keluarga / Tidak Dibayar',
        penghasilanBulanan: 0,
        memilikiNpwp: 'Tidak',
        memilikiUsaha: 'Tidak',
        jumlahUsaha: 0,
        pekerjaDibayar: 0,
        pekerjaTidakDibayar: 0,
        perizinanUsaha: 'Tidak Memiliki Usaha',
        omzetBulanan: 0,
        penggunaanInternetUsaha: 'Tidak',
        isPmks: 'Tidak',
        pmksKategori: []
      }
    ],
    kondisiGiziAnak: 'Tidak Ada Anak Balita di Rumah / Tidak Terukur',
    penyakitKronis: 'Tidak Ada Penyakit Kronis',
    jaminanKesehatan: 'Ada, BPJS Kesehatan PBI (Pemerintah/Gratis)',
    programBantuan: ['Bantuan Pangan Non-Tunai (BPNT / Sembako)', 'Program Indonesia Pintar (PIP / Beasiswa)'],
    asetBergerak: ['Sepeda Motor', 'Televisi / Smart TV', 'Kulkas / Lemari Es'],
    asetTidakBergerak: ['Tidak Memiliki Aset Tidak Bergerak'],
    jumlahTernak: 'Tidak Ada',
    aksesInternetKeluarga: 'Paket Data Selular Handphone',
    rekeningDompetDigital: 'Ya',
    pmksTerdapat: 'Tidak Ada PMKS',
    jenisBantuanDiinginkan: 'Bantuan Modal Usaha Mandiri',
    catatan: 'Keluarga mandiri, mengelola usaha kelontong kecil di halaman depan rumah.',
    fotoKK: 'placeholder_kk_b64_dummy',
    fotoRumahDepan: 'placeholder_depan_b64_dummy',
    fotoRumahDalam: 'placeholder_dalam_b64_dummy'
  },
  {
    id: 'srv_1238472',
    submittedAt: '2026-05-31T07:22:00Z',
    namaPendata: 'Stempel Kito Tanjungbalai',
    noKK: '3273151811900014',
    namaResponden: 'Siti Rahmawati',
    kecamatan: 'Kecamatan Sei Tualang Raso',
    kelurahan: 'Sei Raja',
    alamat: 'Kampung Suka Makmur RT 05/RW 03, Kel. Sei Raja, Kec. Sei Tualang Raso, Tg. Balai',
    latitude: '2.981840',
    longitude: '99.815330',
    statusKepemilikanRumah: 'Kontrak / Sewa',
    buktiKepemilikanTanah: 'Tidak Ada / Menumpang',
    luasLantai: 45,
    jenisLantai: 'SEMEN/BATAMERAH',
    jenisDinding: 'TEMBOK',
    jenisAtap: 'SENG',
    sumberAirMinum: 'AIR KEMASAN BERMERK',
    jarakAirMinum: 'Kurang dari 10 meter',
    sumberPenerangan: 'LISTRIK PLN DENGAN METERAN',
    dayaListrik: '450 VA',
    noMeteranPelanggan: '840156711905',
    bahanBakarMemasak: 'GAS ELPIJI 3 KG',
    fasilitasBab: 'Milik Bersama (Dengan Tetangga/Keluarga Lain)',
    jenisKloset: 'Leher Angsa',
    pembuanganAkhirTinja: 'Lubang Tanah',
    anggotaKeluarga: [
      {
        id: 'mem_4',
        noUrut: 1,
        nama: 'Siti Rahmawati',
        nik: '3273154812830005',
        keteranganKeberadaan: 'TINGGAL BERSAMA KELUARGA',
        jenisKelamin: 'Perempuan',
        tanggalLahir: '1983-12-08',
        umur: 42,
        statusPerkawinan: 'Cerai Mati',
        statusHubunganKK: 'Kepala Keluarga',
        sedangHamil: 'Tidak',
        kartuIdentitas: ['KTP'],
        partisipasiSekolah: 'Tidak Sekolah Lagi',
        jenjangPendidikan: 'SD / MI / Paket A',
        kelasTertinggi: 'Tamat / Selesai',
        ijazahTertinggi: 'SD / Sederajat',
        apakahBekerja: 'Ya',
        jamBekerja: 35,
        lapanganUsaha: 'Kesenian, Rekreasi, Olahraga, Jasa Perorangan Lainnya (Salon, Laundry, dll)',
        statusPekerjaan: 'Pekerja Bebas (Serabutan)',
        penghasilanBulanan: 1500000,
        memilikiNpwp: 'Tidak',
        memilikiUsaha: 'Ya',
        jumlahUsaha: 1,
        pekerjaDibayar: 0,
        pekerjaTidakDibayar: 0,
        perizinanUsaha: 'Tidak Memiliki Izin Usaha',
        omzetBulanan: 1200000,
        penggunaanInternetUsaha: 'Tidak',
        isPmks: 'Tidak',
        pmksKategori: []
      },
      {
        id: 'mem_5',
        noUrut: 2,
        nama: 'Aditya Pratama',
        nik: '3273151505220011',
        keteranganKeberadaan: 'TINGGAL BERSAMA KELUARGA',
        jenisKelamin: 'Laki-laki',
        tanggalLahir: '2022-05-15',
        umur: 4,
        statusPerkawinan: 'Belum Kawin',
        statusHubunganKK: 'Anak',
        sedangHamil: 'Tidak / Bukan Wanita Subur',
        kartuIdentitas: ['KIA'],
        partisipasiSekolah: 'Tidak / Belum Pernah Sekolah',
        jenjangPendidikan: 'Tidak / Belum Sekolah',
        kelasTertinggi: 'Belum pernah duduk di kelas',
        ijazahTertinggi: 'Tidak Memiliki Ijazah / Belum Tamat',
        apakahBekerja: 'Tidak',
        jamBekerja: 0,
        lapanganUsaha: 'Kesenian, Rekreasi, Olahraga, Jasa Perorangan Lainnya (Salon, Laundry, dll)',
        statusPekerjaan: 'Pekerja Keluarga / Tidak Dibayar',
        penghasilanBulanan: 0,
        memilikiNpwp: 'Tidak',
        memilikiUsaha: 'Tidak',
        jumlahUsaha: 0,
        pekerjaDibayar: 0,
        pekerjaTidakDibayar: 0,
        perizinanUsaha: 'Tidak Memiliki Usaha',
        omzetBulanan: 0,
        penggunaanInternetUsaha: 'Tidak',
        isPmks: 'Ya',
        pmksKategori: ['Anak Terlantar']
      }
    ],
    kondisiGiziAnak: 'Kurang (Underweight)',
    penyakitKronis: 'Tidak Ada Penyakit Kronis',
    jaminanKesehatan: 'Ada, BPJS Kesehatan PBI (Pemerintah/Gratis)',
    programBantuan: ['Program Keluarga Harapan (PKH)', 'Bantuan Pangan Non-Tunai (BPNT / Sembako)'],
    asetBergerak: ['Televisi / Smart TV'],
    asetTidakBergerak: ['Tidak Memiliki Aset Tidak Bergerak'],
    jumlahTernak: 'Tidak Ada',
    aksesInternetKeluarga: 'Paket Data Selular Handphone',
    rekeningDompetDigital: 'Tidak',
    pmksTerdapat: 'Ada, PMKS Terdaftar',
    pmksJenis: 'Anak Terlantar / Yatim Piatu Rawan',
    jenisBantuanDiinginkan: 'Bantuan Sembako rutin bulanan',
    catatan: 'Pekerjaan ibu menggosok pakaian tetangga/buruh cuci harian. Balita Aditya perlu pantauan gizi puskesmas setempat.',
    fotoKK: 'placeholder_kk_b64_dummy_2',
    fotoRumahDepan: 'placeholder_depan_b64_dummy_2',
    fotoRumahDalam: 'placeholder_dalam_b64_dummy_2'
  }
];
