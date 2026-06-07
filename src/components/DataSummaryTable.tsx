import { useState } from 'react';
import { 
  Search, FileSpreadsheet, Eye, Edit2, Trash2, Database, MapPin, Calendar, 
  HelpCircle, Sparkles, SlidersHorizontal, AlertCircle, FileText,
  Cloud, CloudOff, RefreshCw, Settings, Code, Copy, ChevronDown, ChevronUp, 
  Check, ExternalLink, Info, CheckCircle2, CloudLightning
} from 'lucide-react';
import { SurveyData } from '../types';
import { exportSurveysToCSV } from '../utils/csvExport';
import { getGoogleAppsScriptTemplate } from '../utils/syncService';

interface DataSummaryTableProps {
  surveys: SurveyData[];
  onView: (survey: SurveyData) => void;
  onEdit: (survey: SurveyData) => void;
  onDelete: (id: string) => void;
  onLoadSeeds: () => void;
  onClearAll: () => void;
  
  // Sync endpoints & variables
  syncUrl: string;
  setSyncUrl: (url: string) => void;
  isAutoSync: boolean;
  setIsAutoSync: (enabled: boolean) => void;
  onSyncSurvey: (id: string) => Promise<{ success: boolean; message: string }>;
  onSyncAll: (unsyncedOnly: boolean) => Promise<{ success: boolean; count: number }>;
}

export default function DataSummaryTable({ 
  surveys, onView, onEdit, onDelete, onLoadSeeds, onClearAll,
  syncUrl, setSyncUrl, isAutoSync, setIsAutoSync, onSyncSurvey, onSyncAll
}: DataSummaryTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterKecamatan, setFilterKecamatan] = useState('Semua');

  // Cloud Sync state variables
  const [isSyncPanelOpen, setIsSyncPanelOpen] = useState(false);
  const [showGasCodeModal, setShowGasCodeModal] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [individualSyncingStatus, setIndividualSyncingStatus] = useState<Record<string, 'idle' | 'syncing' | 'success' | 'error'>>({});

  // Stats for the synchronization panel
  const totalLocal = surveys.length;
  const totalSynced = surveys.filter(s => s.synced).length;
  const totalUnsynced = totalLocal - totalSynced;

  // Filter logic
  const filteredSurveys = surveys.filter(s => {
    const matchesSearch = 
      s.noKK.includes(searchTerm) || 
      (s.namaResponden || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.namaPendata || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesKecamatan = filterKecamatan === 'Semua' || s.kecamatan === filterKecamatan;

    return matchesSearch && matchesKecamatan;
  });

  // Extract unique subdistricts (kecamatan) for filter list
  const kecamantanList = ['Semua', ...Array.from(new Set(surveys.map(s => s.kecamatan).filter(Boolean)))];

  const handleExport = () => {
    exportSurveysToCSV(filteredSurveys);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 space-y-6">
      
      {/* Table section title & controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 border-slate-50">
        <div>
          <h3 className="text-md font-bold text-slate-800 flex items-center gap-2">
            <Database className="h-5 w-5 text-indigo-600" />
            Tabel Ringkasan Database Hasil Pendataan ({filteredSurveys.length} KK Terdaftar)
          </h3>
          <p className="text-xs text-slate-500">Merekam data DTSEN yang tersimpan secara lokal pada browser Anda secara aman.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {surveys.length > 0 && (
            <>
              <button
                id="btn-export-csv"
                type="button"
                onClick={handleExport}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold px-4 py-2.5 flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/10 cursor-pointer select-none"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Ekspor ke CSV (Excel)
              </button>

              <button
                id="btn-clear-database"
                type="button"
                onClick={() => {
                  if (confirm('Apakah Anda yakin ingin menghapus seluruh basis data pendataan ini? Tindakan ini tidak bisa dibatalkan.')) {
                    onClearAll();
                  }
                }}
                className="bg-white hover:bg-red-50 border border-red-100 hover:border-red-200 text-red-650 text-red-600 rounded-xl text-xs font-semibold px-3 py-2.5 transition-all cursor-pointer select-none"
              >
                Kosongkan Database
              </button>
            </>
          )}

          {surveys.length === 0 && (
            <button
              id="btn-seed-data"
              type="button"
              onClick={onLoadSeeds}
              className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold px-4 py-2.5 flex items-center gap-1.5 transition-all shadow-md shadow-amber-600/10 cursor-pointer select-none"
            >
              <Sparkles className="h-4 w-4" />
              Inisialisasi Data Percontohan (Demo)
            </button>
          )}
        </div>
      </div>

      {/* Google Sheets Cloud Sync Management Center */}
      <div className="bg-slate-50/60 border border-slate-100 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
              <CloudLightning className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-2">
                Sinkronisasi Cloud &amp; Google Sheets
                <span className="text-[9px] bg-green-50 text-green-700 font-bold px-1.5 py-0.5 rounded border border-green-200">
                  DTSEN Aktif
                </span>
              </h4>
              <p className="text-[11px] text-slate-500">Hubungkan database lokal browser dengan Google Sheet spreadsheet melalui Google Apps Script.</p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              id="btn-toggle-sync-panel"
              type="button"
              onClick={() => setIsSyncPanelOpen(!isSyncPanelOpen)}
              className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:border-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all select-none cursor-pointer"
            >
              <Settings className="h-3.5 w-3.5 text-slate-500" />
              {isSyncPanelOpen ? 'Sembunyikan Pengaturan' : 'Pengaturan Sinkronisasi'}
              {isSyncPanelOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {/* Sync Summary Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="bg-white p-3 rounded-xl border border-slate-100 text-center">
            <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Total Data</span>
            <span className="text-lg font-extrabold text-slate-800">{totalLocal}</span>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-100 text-center">
            <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Tersinkronisasi</span>
            <span className="text-lg font-extrabold text-green-600 flex items-center justify-center gap-1">
              <Cloud className="h-4 w-4 text-green-500" /> {totalSynced}
            </span>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-100 text-center font-medium">
            <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Lokal Saja</span>
            <span className="text-lg font-extrabold text-amber-600 flex items-center justify-center gap-1">
              <CloudOff className="h-4 w-4 text-amber-500" /> {totalUnsynced}
            </span>
          </div>
          <div className="col-span-2 sm:col-span-1 flex items-center font-sans">
            <button
              id="btn-sync-all-unsynced"
              type="button"
              disabled={isSyncingAll || totalUnsynced === 0}
              onClick={async () => {
                setIsSyncingAll(true);
                await onSyncAll(true);
                setIsSyncingAll(false);
              }}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer select-none ${
                totalUnsynced === 0
                  ? 'bg-slate-200 text-slate-450 shadow-none cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/15'
              }`}
            >
              {isSyncingAll ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Cloud className="h-3.5 w-3.5" />
              )}
              {isSyncingAll ? 'Menyinkronkan...' : 'Sinkronkan Data Lokal'}
            </button>
          </div>
        </div>

        {/* Settings Detail Area Area */}
        {isSyncPanelOpen && (
          <div className="bg-white p-4 rounded-xl border border-slate-100 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              <div className="md:col-span-8 space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Web App Executable URL Google Apps Script:</label>
                <input
                  type="text"
                  value={syncUrl}
                  onChange={(e) => setSyncUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/..."
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 outline-hidden focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="md:col-span-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const fallbackDefault = 'https://script.google.com/macros/s/AKfycbzE3momFXoHolsyphCD6E95pJaeZO85H4CShW_WrmIGXID38ZdTByxgxJHXCpXI2xUQ6A/exec';
                    setSyncUrl(fallbackDefault);
                  }}
                  className="flex-1 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition-all cursor-pointer border border-slate-150 text-center"
                >
                  Reset Default URL
                </button>
                <button
                  type="button"
                  onClick={() => setShowGasCodeModal(true)}
                  className="flex-1 px-3 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/50 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer text-center"
                >
                  <Code className="h-3.5 w-3.5" />
                  Lihat Script
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 border-t pt-3 border-slate-50">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isAutoSync}
                  onChange={(e) => setIsAutoSync(e.target.checked)}
                  className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                />
                <span className="text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors">
                  Sinkronisasi Otomatis saat memasukkan Data Lapangan Baru (Direkomendasikan)
                </span>
              </label>
            </div>
            
            <div className="text-[11px] text-slate-400 bg-slate-50 border border-slate-100/50 p-3 rounded-lg flex gap-2">
              <Info className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-600">Bagaimana fitur ini bekerja?</p>
                <p className="mt-0.5 leading-relaxed">
                  Data pendataan akan dikirimkan langsung ke spreadsheet Google Sheet Anda melalui pemicu Apps Script Web App. 
                  Jika Anda kehilangan koneksi internet di lapangan, data tetap tersimpan di browser (offline-first) 
                  dan dapat disinkronkan kembali saat Anda terhubung lagi.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Grid of Search, Filters, Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search Input bar */}
        <div className="relative flex-1 max-w-md">
          <span className="absolute left-3 top-3 text-slate-400">
            <Search className="h-4 w-4" />
          </span>
          <input
            id="table-search"
            type="text"
            placeholder="Cari berdasarkan No KK, Nama Responden, atau Pendata..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs p-3 pl-10 rounded-xl border border-slate-200 outline-hidden transition-colors focus:border-slate-400"
          />
        </div>

        {/* Filter dropdown and reset info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Saring Kecamatan:
          </div>
          <select
            id="table-filter-kecamatan"
            value={filterKecamatan}
            onChange={(e) => setFilterKecamatan(e.target.value)}
            className="text-xs p-2.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700"
          >
            {kecamantanList.map((kec) => (
              <option key={kec} value={kec}>{kec}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Data Table */}
      {filteredSurveys.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 border border-slate-100 rounded-2xl space-y-3">
          <AlertCircle className="h-8 w-8 text-slate-400 mx-auto" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-700">Tidak ada data keluarga yang cocok</p>
            <p className="text-xs text-slate-500">Pastikan pencarian atau filter wilayah Kecamatan Anda sesuai, atau tambahkan data baru.</p>
          </div>
          {surveys.length === 0 && (
            <div className="pt-2">
              <button
                id="btn-seed-empty"
                type="button"
                onClick={onLoadSeeds}
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200/30 rounded-xl text-xs font-bold px-4 py-2 hover:scale-[1.01] transition-transform cursor-pointer"
              >
                Inisialisasi 2 Rumah Tangga Demo Sekarang
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                <th className="p-4">ID / Tanggal</th>
                <th className="p-4">Kartu Keluarga (KK)</th>
                <th className="p-4">Nama Responden</th>
                <th className="p-4">Lokasi Wilayah</th>
                <th className="p-4 text-center">Jumlah Jiwa</th>
                <th className="p-4 text-center border-l border-slate-50">Tindakan Lapangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 divide-y-slate-200">
              {filteredSurveys.map((survey) => (
                <tr key={survey.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 text-slate-500">
                    <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-slate-700">
                      {survey.id}
                      {survey.synced ? (
                        <span className="inline-flex items-center gap-0.5 text-[9px] bg-green-55 bg-green-50 text-green-700 font-bold px-1.5 py-0.2 rounded border border-green-200" title={`Tersinkronisasi pada: ${survey.syncedAt}`}>
                          <Cloud className="h-2.5 w-2.5" /> SYNC
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 text-[9px] bg-amber-50 text-amber-750 text-amber-700 font-bold px-1.5 py-0.2 rounded border border-amber-200" title="Penyimpanan Lokal Saja (Belum Sinkron)">
                          <CloudOff className="h-2.5 w-2.5" /> LOKAL
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {new Date(survey.submittedAt).toLocaleDateString('id-ID', {
                        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="font-mono text-xs font-semibold text-slate-800 tracking-wider block">
                      {survey.noKK}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Pendata: {survey.namaPendata || '-'}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="font-semibold text-slate-800 block text-sm">
                      {survey.namaResponden}
                    </span>
                    <span className="text-[10px] text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100/50 inline-block mt-0.5">
                      Bantuan: {survey.jenisBantuanDiinginkan}
                    </span>
                  </td>
                  <td className="p-4 text-slate-600">
                    <div className="flex items-center gap-1 font-semibold text-slate-700">
                      <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                      Kec. {survey.kecamatan}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5 pl-4">
                      Kel. {survey.kelurahan}
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <span className="font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-full text-xs">
                      {survey.anggotaKeluarga?.length || 0}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-1">Jiwa</span>
                  </td>
                  <td className="p-4 text-center border-l border-slate-50">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        id={`btn-sync-${survey.id}`}
                        type="button"
                        disabled={individualSyncingStatus[survey.id] === 'syncing'}
                        onClick={async () => {
                          setIndividualSyncingStatus(prev => ({ ...prev, [survey.id]: 'syncing' }));
                          const res = await onSyncSurvey(survey.id);
                          if (res.success) {
                            setIndividualSyncingStatus(prev => ({ ...prev, [survey.id]: 'success' }));
                          } else {
                            setIndividualSyncingStatus(prev => ({ ...prev, [survey.id]: 'error' }));
                          }
                        }}
                        title={survey.synced ? "Re-sync ke Google Sheets" : "Sync langsung ke Google Sheets"}
                        className={`p-2 rounded-lg transition-colors cursor-pointer ${
                          individualSyncingStatus[survey.id] === 'syncing' 
                            ? 'text-indigo-600 animate-spin'
                            : survey.synced 
                            ? 'text-green-600 hover:text-green-700 hover:bg-green-50' 
                            : 'text-amber-600 hover:text-amber-700 hover:bg-amber-50'
                        }`}
                      >
                        {individualSyncingStatus[survey.id] === 'syncing' ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Cloud className="h-4 w-4" />
                        )}
                      </button>

                      <button
                        id={`btn-view-${survey.id}`}
                        onClick={() => onView(survey)}
                        title="Lihat Detail Data"
                        className="p-2 text-slate-600 hover:text-indigo-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      >
                        <Eye className="h-4 w-4" />
                      </button>

                      <button
                        id={`btn-edit-${survey.id}`}
                        onClick={() => onEdit(survey)}
                        aria-label="Edit Data Pendataan"
                        title="Modifikasi Data"
                        className="p-2 text-slate-600 hover:text-blue-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>

                      <button
                        id={`btn-delete-${survey.id}`}
                        onClick={() => {
                          if (confirm(`Apakah Anda yakin ingin membuang data KK ${survey.noKK} atas nama ${survey.namaResponden}?`)) {
                            onDelete(survey.id);
                          }
                        }}
                        title="Hapus Rekaman"
                        className="p-2 text-slate-450 hover:text-red-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Dialog for Apps Script Code Template */}
      {showGasCodeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="bg-indigo-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code className="h-5 w-5 text-indigo-200" />
                <div>
                  <h3 className="text-sm font-bold">Panduan Integrasi Google Sheets DTSEN</h3>
                  <p className="text-[10px] text-indigo-200">Terapkan kode Google Apps Script ini pada spreadsheet Anda</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowGasCodeModal(false);
                  setCopiedScript(false);
                }}
                className="text-white hover:text-indigo-205 hover:bg-indigo-800 rounded-sm text-lg font-bold leading-none cursor-pointer p-1.5"
                aria-label="Tutup Dialog"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
              <div className="space-y-1.5 text-slate-600 leading-relaxed font-sans">
                <p className="font-bold text-slate-800">Langkah Pemasangan di Spreadsheet Google:</p>
                <ol className="list-decimal list-inside pl-1 space-y-1 text-slate-600">
                  <li>Buka atau buat file <b>Google Sheets</b> baru.</li>
                  <li>Beri nama spreadsheet Anda (misal: <code>DTSEN data</code>).</li>
                  <li>Pilih menu <b>Ekstensi</b> &raquo; klik <b>Apps Script</b>.</li>
                  <li>Hapus semua baris kode bawaan di editor, kemudian <b>tempel (paste)</b> kode script di bawah ini.</li>
                  <li>Klik tombol <b>Simpan</b> (ikon disket).</li>
                  <li>Klik <b>Terapkan (Deploy)</b> &raquo; pilih <b>Penerapan Baru (New deployment)</b>.</li>
                  <li>Klik roda gigi di samping 'Pilih jenis' &raquo; pilih <b>Aplikasi Web (Web app)</b>:
                    <ul className="list-disc list-inside pl-4 mt-1 space-y-1 text-[11px] text-slate-500">
                      <li><b>Jalankan sebagai</b>: Pilih <code>Diri Anda sendiri (Email Anda)</code></li>
                      <li><b>Siapa yang memiliki akses</b>: Wajib pilih <code>Siapa saja (Anyone)</code></li>
                    </ul>
                  </li>
                  <li>Klik <b>Terapkan</b> &raquo; Tekan tombol <b>Berikan Akses (Authorize Access)</b> &raquo; Masuk dan pilih 'Lanjutan' (Advanced) &raquo; Klik 'Buka Proyek Tanpa Judul (tidak aman)' demi memberikan otorisasi penulisan sel spreadsheet.</li>
                  <li><b>Salin URL Aplikasi Web</b> yang dihasilkan, lalu masukkan URL tersebut ke kolom isian URL Script di atas!</li>
                </ol>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">Kode Google Apps Script:</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(getGoogleAppsScriptTemplate());
                      setCopiedScript(true);
                      setTimeout(() => setCopiedScript(false), 3000);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold rounded-lg cursor-pointer transition-colors"
                  >
                    {copiedScript ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                    {copiedScript ? 'Tersalin' : 'Salin Kode'}
                  </button>
                </div>

                <textarea
                  readOnly
                  value={getGoogleAppsScriptTemplate()}
                  onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                  className="w-full h-48 p-3 bg-slate-900 text-slate-200 font-mono text-[10px] rounded-xl outline-hidden border border-slate-800 leading-relaxed select-all overflow-y-auto"
                />
              </div>
            </div>

            <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowGasCodeModal(false);
                  setCopiedScript(false);
                }}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Dipahami &amp; Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
