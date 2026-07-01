import { useState, useMemo, useEffect } from 'react';
import { 
  Search, FileSpreadsheet, Eye, Edit2, Trash2, Database, MapPin, Calendar, 
  HelpCircle, Sparkles, SlidersHorizontal, AlertCircle, FileText,
  Cloud, CloudOff, RefreshCw, Settings, Code, Copy, ChevronDown, ChevronUp, 
  Check, ExternalLink, Info, CheckCircle2, CloudLightning, Download, Printer,
  X, BookmarkCheck
} from 'lucide-react';
import { SurveyData } from '../types';
import { exportSurveysToCSV } from '../utils/csvExport';
import { getGoogleAppsScriptTemplate } from '../utils/syncService';
import { STATUS_PENDATAAN_OPTIONS } from '../data/options';

interface DataSummaryTableProps {
  surveys: SurveyData[];
  onView: (survey: SurveyData) => void;
  onEdit: (survey: SurveyData) => void;
  onDelete: (id: string) => void;
  onPrint: (survey: SurveyData) => void;
  onLoadSeeds: () => void;
  onClearAll: () => void;
  userRole?: 'admin' | 'pendata' | null;
  
  // Sync endpoints & variables
  syncUrl: string;
  setSyncUrl: (url: string) => void;
  isAutoSync: boolean;
  setIsAutoSync: (enabled: boolean) => void;
  onSyncSurvey: (id: string) => Promise<{ success: boolean; message: string }>;
  onSyncAll: (unsyncedOnly: boolean) => Promise<{ success: boolean; count: number }>;
  onPullCloudData?: (forceFull?: boolean) => Promise<void>;
  isPullingCloud?: boolean;

  // Optional lifted quick filter
  quickFilter?: 'all' | 'today' | 'unsynced' | 'pmks' | 'priority';
  setQuickFilter?: (val: 'all' | 'today' | 'unsynced' | 'pmks' | 'priority') => void;

  // Optional lifted search status
  hasSearched?: boolean;
  setHasSearched?: (val: boolean) => void;
}

const getStatusPendataanBadgeColorByValue = (val?: string) => {
  const status = val || 'Usulan Baru';
  if (status === 'Bayi Baru Lahir (BBL)') return 'bg-sky-50 text-sky-800 border-sky-105';
  if (status === 'Pembaharuan Desil') return 'bg-amber-55 bg-amber-50 text-amber-800 border-amber-100';
  if (status === 'Pindah Wilayah') return 'bg-purple-50 text-purple-800 border-purple-100';
  return 'bg-indigo-50 text-indigo-800 border-indigo-100'; // Default is Usulan Baru
};

export default function DataSummaryTable({ 
  surveys, onView, onEdit, onDelete, onPrint, onLoadSeeds, onClearAll, userRole,
  syncUrl, setSyncUrl, isAutoSync, setIsAutoSync, onSyncSurvey, onSyncAll,
  onPullCloudData, isPullingCloud = false,
  quickFilter: quickFilterProp,
  setQuickFilter: setQuickFilterProp,
  hasSearched: hasSearchedProp,
  setHasSearched: setHasSearchedProp
}: DataSummaryTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterKecamatan, setFilterKecamatan] = useState('Semua');
  const [filterKelurahan, setFilterKelurahan] = useState('Semua');
  const [filterSyncStatus, setFilterSyncStatus] = useState('Semua');
  const [filterStatusPendataan, setFilterStatusPendataan] = useState('Semua');
  
  // Committed states for SIKS-NG search flow (only applied when clicking 'Cari Data')
  const [activeSearchTerm, setActiveSearchTerm] = useState('');
  const [activeKecamatan, setActiveKecamatan] = useState('Semua');
  const [activeKelurahan, setActiveKelurahan] = useState('Semua');
  const [activeSyncStatus, setActiveSyncStatus] = useState('Semua');
  const [activeStatusPendataan, setActiveStatusPendataan] = useState('Semua');

  const [localHasSearched, setLocalHasSearched] = useState(false);
  const hasSearched = hasSearchedProp !== undefined ? hasSearchedProp : localHasSearched;
  const setHasSearched = setHasSearchedProp !== undefined ? setHasSearchedProp : setLocalHasSearched;
  
  const [localQuickFilter, setLocalQuickFilter] = useState<'all' | 'today' | 'unsynced' | 'pmks' | 'priority'>('all');
  const quickFilter = quickFilterProp !== undefined ? quickFilterProp : localQuickFilter;
  const setQuickFilter = setQuickFilterProp !== undefined ? setQuickFilterProp : setLocalQuickFilter;

  // Delta Sync choice state
  const [pullMode, setPullMode] = useState<'delta' | 'full'>(() => {
    return localStorage.getItem('dtsen_pull_mode') === 'full' ? 'full' : 'delta';
  });

  const changePullMode = (mode: 'delta' | 'full') => {
    setPullMode(mode);
    localStorage.setItem('dtsen_pull_mode', mode);
  };

  // Cloud Sync state variables
  const [isSyncPanelOpen, setIsSyncPanelOpen] = useState(false);
  const [showGasCodeModal, setShowGasCodeModal] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [individualSyncingStatus, setIndividualSyncingStatus] = useState<Record<string, 'idle' | 'syncing' | 'success' | 'error'>>({});

  // URL management states with Save URL action compatibility
  const [localUrl, setLocalUrl] = useState(syncUrl);
  const [isUrlSaved, setIsUrlSaved] = useState(false);
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);
  const [surveyIdToDelete, setSurveyIdToDelete] = useState<string | null>(null);

  useEffect(() => {
    setLocalUrl(syncUrl);
  }, [syncUrl]);

  const handleSaveUrl = () => {
    setSyncUrl(localUrl);
    setIsUrlSaved(true);
    setTimeout(() => {
      setIsUrlSaved(false);
    }, 2500);
  };

  const handleSearchSubmit = () => {
    setActiveSearchTerm(searchTerm);
    setActiveKecamatan(filterKecamatan);
    setActiveKelurahan(filterKelurahan);
    setActiveSyncStatus(filterSyncStatus);
    setActiveStatusPendataan(filterStatusPendataan);
    setHasSearched(true);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterKecamatan('Semua');
    setFilterKelurahan('Semua');
    setFilterSyncStatus('Semua');
    setFilterStatusPendataan('Semua');
    
    setActiveSearchTerm('');
    setActiveKecamatan('Semua');
    setActiveKelurahan('Semua');
    setActiveSyncStatus('Semua');
    setActiveStatusPendataan('Semua');
    
    setHasSearched(false);
    if (setQuickFilter) setQuickFilter('all');
  };

  // Stats for the synchronization panel
  const totalLocal = surveys.length;
  const totalSynced = surveys.filter(s => s.synced).length;
  const totalUnsynced = totalLocal - totalSynced;

  // Stats for the quick monitoring toolbar
  const todayStr = new Date().toDateString();
  const countAll = surveys.length;
  const countToday = surveys.filter(s => s.submittedAt && new Date(s.submittedAt).toDateString() === todayStr).length;
  const countUnsynced = surveys.filter(s => !s.synced).length;
  const countPmks = surveys.filter(s => (s.anggotaKeluarga || []).some(m => m.isPmks === 'Ya')).length;
  const countPriority = surveys.filter(s => s.statusPendataan === 'Usulan Baru').length;

  // Filter logic
  const filteredSurveys = surveys.filter(s => {
    const term = (activeSearchTerm || '').toLowerCase().trim();
    const matchesSearch = !term ||
      (s.noKK || '').toLowerCase().includes(term) || 
      (s.namaResponden || '').toLowerCase().includes(term) ||
      (s.namaPendata || '').toLowerCase().includes(term) ||
      (s.anggotaKeluarga || []).some(m => 
        (m.nama || '').toLowerCase().includes(term) || 
        (m.nik || '').toLowerCase().includes(term)
      );
    
    const matchesKecamatan = activeKecamatan === 'Semua' || s.kecamatan === activeKecamatan;
    
    const matchesKelurahan = activeKelurahan === 'Semua' || s.kelurahan === activeKelurahan;
    
    let matchesSync = true;
    if (activeSyncStatus === 'synced') matchesSync = !!s.synced;
    if (activeSyncStatus === 'unsynced') matchesSync = !s.synced;

    const matchesStatusPendataan = activeStatusPendataan === 'Semua' || 
      (s.statusPendataan || 'Usulan Baru') === activeStatusPendataan;

    let matchesQuickFilter = true;
    if (quickFilter === 'today') {
      matchesQuickFilter = s.submittedAt ? new Date(s.submittedAt).toDateString() === todayStr : false;
    } else if (quickFilter === 'unsynced') {
      matchesQuickFilter = !s.synced;
    } else if (quickFilter === 'pmks') {
      matchesQuickFilter = (s.anggotaKeluarga || []).some(m => m.isPmks === 'Ya');
    } else if (quickFilter === 'priority') {
      matchesQuickFilter = s.statusPendataan === 'Usulan Baru';
    }

    return matchesSearch && matchesKecamatan && matchesKelurahan && matchesSync && matchesStatusPendataan && matchesQuickFilter;
  });

  // Extract unique subdistricts (kecamatan) for filter list
  const kecamantanList = ['Semua', ...Array.from(new Set(surveys.map(s => s.kecamatan).filter(Boolean)))];

  // Extract unique villages (kelurahan) based on selected kecamatan
  const kelurahanList = useMemo(() => {
    const list = surveys
      .filter(s => filterKecamatan === 'Semua' || s.kecamatan === filterKecamatan)
      .map(s => s.kelurahan)
      .filter(Boolean);
    return ['Semua', ...Array.from(new Set(list))];
  }, [surveys, filterKecamatan]);

  const handleKecamatanChange = (val: string) => {
    setFilterKecamatan(val);
    setFilterKelurahan('Semua');
  };

  const handleExport = () => {
    exportSurveysToCSV(filteredSurveys);
  };

  const handleBackupData = () => {
    try {
      const dataStr = JSON.stringify(surveys, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `sensus_surveys_v2_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Gagal mencadangkan data:', e);
    }
  };

  const handleClearAllData = () => {
    setShowClearConfirmModal(true);
  };

  const handleDeleteRow = (id: string) => {
    setSurveyIdToDelete(id);
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
          {surveys.length > 0 && userRole === 'admin' && (
            <>
              <button
                id="btn-export-all-all-csv"
                type="button"
                onClick={() => exportSurveysToCSV(surveys)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold px-4 py-2.5 flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/10 cursor-pointer select-none"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Ekspor Semua Data ke CSV
              </button>

              <button
                id="btn-export-csv"
                type="button"
                onClick={handleExport}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold px-4 py-2.5 flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/10 cursor-pointer select-none"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Ekspor Hasil Saringan
              </button>

              <button
                id="btn-backup-json"
                type="button"
                onClick={handleBackupData}
                className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold px-4 py-2.5 flex items-center gap-1.5 transition-all shadow-md shadow-amber-600/10 cursor-pointer select-none"
              >
                <Download className="h-4 w-4" />
                Cadangkan Data (JSON)
              </button>

              <button
                id="btn-clear-database"
                type="button"
                onClick={handleClearAllData}
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
          <div className="col-span-2 sm:col-span-1 flex flex-col justify-center gap-1.5 font-sans">
            <button
              id="btn-sync-all-unsynced"
              type="button"
              disabled={isSyncingAll || totalUnsynced === 0}
              onClick={async () => {
                setIsSyncingAll(true);
                await onSyncAll(true);
                setIsSyncingAll(false);
              }}
              className={`w-full py-2 px-3 rounded-lg text-xs font-bold text-white transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer select-none ${
                totalUnsynced === 0
                  ? 'bg-slate-200 text-slate-400 shadow-none cursor-not-allowed'
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

            {userRole === 'admin' && onPullCloudData && (
              <div className="space-y-1 w-full">
                <button
                  id="btn-pull-cloud-data"
                  type="button"
                  disabled={isPullingCloud}
                  onClick={() => onPullCloudData(pullMode === 'full')}
                  className={`w-full py-2 px-3 rounded-lg text-xs font-bold border border-emerald-600 bg-white text-emerald-800 hover:bg-emerald-50 hover:border-emerald-700 transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer select-none`}
                >
                  {isPullingCloud ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                  ) : (
                    <Download className="h-3.5 w-3.5 text-emerald-600" />
                  )}
                  {isPullingCloud 
                    ? (pullMode === 'delta' ? 'Delta Sync...' : 'Full Sync...') 
                    : (pullMode === 'delta' ? 'Tarik Delta Data' : 'Tarik Sensus Penuh')
                  }
                </button>
                {localStorage.getItem('dtsen_last_sync_timestamp') && (
                  <span className="text-[9px] text-slate-400 block text-center font-mono">
                    Last: {new Date(localStorage.getItem('dtsen_last_sync_timestamp')!).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} ({pullMode === 'delta' ? 'Delta' : 'Penuh'})
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Settings Detail Area Area */}
        {isSyncPanelOpen && (
          <div className="bg-white p-4 rounded-xl border border-slate-100 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              <div className="md:col-span-8 space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Web App Executable URL Google Apps Script:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={localUrl}
                    onChange={(e) => {
                      const val = e.target.value;
                      setLocalUrl(val);
                      // Auto-save: Update the parent sync URL as the user types
                      setSyncUrl(val);
                      setIsUrlSaved(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSaveUrl();
                      }
                    }}
                    placeholder="https://script.google.com/macros/s/..."
                    className="flex-1 text-xs p-2.5 rounded-lg border border-slate-200 outline-hidden focus:border-indigo-500 font-mono"
                  />
                  <button
                    id="btn-save-sync-url"
                    type="button"
                    onClick={handleSaveUrl}
                    className={`px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      isUrlSaved 
                        ? 'bg-emerald-650 bg-emerald-600 text-white shadow-md shadow-emerald-200' 
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-100'
                    }`}
                  >
                    {isUrlSaved ? <Check className="h-3.5 w-3.5" /> : <Settings className="h-3.5 w-3.5 animate-pulse" />}
                    {isUrlSaved ? 'Tersimpan!' : 'Simpan URL'}
                  </button>
                </div>
              </div>

              <div className="md:col-span-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const fallbackDefault = 'https://script.google.com/macros/s/AKfycbwSZvmO0s3oWZSkMuEG7tvTZnIJMg6mSKkN9mWjVVNHQYfhd1Urvol18h5wtY8WMQ4IqQ/exec';
                    setLocalUrl(fallbackDefault);
                    setSyncUrl(fallbackDefault);
                    setIsUrlSaved(true);
                    setTimeout(() => setIsUrlSaved(false), 2000);
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

            {/* Delta vs Full Sync Mode Section */}
            <div className="border-t pt-3 border-slate-100 space-y-2.5">
              <span className="text-xs font-bold text-slate-700 block">Metode Sinkronisasi Unduh Data (Pull Cloud Database):</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div 
                  onClick={() => changePullMode('delta')} 
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    pullMode === 'delta' 
                      ? 'bg-emerald-50/50 border-emerald-300 text-slate-800 ring-2 ring-emerald-500/10' 
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="p-1 bg-emerald-100 text-emerald-700 rounded-lg">
                      <CloudLightning className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-xs font-bold text-slate-800">Delta Sinkronisasi (Rekomendasi)</span>
                  </div>
                  <p className="text-[10.5px] text-slate-500 mt-1.5 leading-relaxed">
                    Hanya mendownload data sensus yang dibuat atau dimodifikasi sejak sinkronisasi terakhir. 
                    <span className="font-semibold text-emerald-600"> Sangat hemat kuota baca (read ops) Firestore Anda</span> (Spark Plan harian).
                  </p>
                </div>

                <div 
                  onClick={() => changePullMode('full')} 
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    pullMode === 'full'
                      ? 'bg-amber-50/50 border-amber-300 text-slate-800 ring-2 ring-amber-500/10' 
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="p-1 bg-amber-100 text-amber-700 rounded-lg">
                      <Database className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-xs font-bold text-slate-800">Sinkronisasi Penuh (Full Sync)</span>
                  </div>
                  <p className="text-[10.5px] text-slate-500 mt-1.5 leading-relaxed">
                    Mendownload seluruh data dari nol. Berguna jika Anda baru saja menghapus cache database lokal peramban atau data tidak sinkron.
                  </p>
                </div>
              </div>
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
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-5">
        
        {/* Real-time Inputted Data Monitoring Toolbar */}
        <div className="space-y-3 bg-slate-50/50 p-4 rounded-xl border border-slate-200/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/50">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] sm:text-xs font-bold text-slate-700 tracking-wide uppercase flex items-center gap-1.5">
                ⚡ BAR TOOLBAR KHUSUS: PANTAU DATA MASUK (REAL-TIME)
              </span>
            </div>
            <div className="text-[9px] font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md shadow-3xs">
              Lokal + Cloud: {countAll} Entri Terinput
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {/* All Data Pill */}
            <button
              id="toolbar-filter-all"
              type="button"
              onClick={() => {
                setQuickFilter('all');
                setHasSearched(true);
              }}
              className={`flex items-center justify-between p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                quickFilter === 'all'
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-xs'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <Database className={`h-3.5 w-3.5 shrink-0 ${quickFilter === 'all' ? 'text-white' : 'text-indigo-600'}`} />
                <span className="text-[11px] font-bold truncate">Semua Data</span>
              </div>
              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-md shrink-0 ml-1 font-bold ${
                quickFilter === 'all' ? 'bg-indigo-800 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {countAll}
              </span>
            </button>

            {/* Inputted Today Pill */}
            <button
              id="toolbar-filter-today"
              type="button"
              onClick={() => {
                setQuickFilter('today');
                setHasSearched(true);
              }}
              className={`flex items-center justify-between p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                quickFilter === 'today'
                  ? 'bg-amber-600 border-amber-500 text-white shadow-xs'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <Sparkles className={`h-3.5 w-3.5 shrink-0 ${quickFilter === 'today' ? 'text-white' : 'text-amber-500'}`} />
                <span className="text-[11px] font-bold truncate">Hari Ini (Baru)</span>
              </div>
              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-md shrink-0 ml-1 font-bold ${
                quickFilter === 'today' ? 'bg-amber-800 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {countToday}
              </span>
            </button>

            {/* Unsynced Pill */}
            <button
              id="toolbar-filter-unsynced"
              type="button"
              onClick={() => {
                setQuickFilter('unsynced');
                setHasSearched(true);
              }}
              className={`flex items-center justify-between p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                quickFilter === 'unsynced'
                  ? 'bg-rose-600 border-rose-500 text-white shadow-xs'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <CloudOff className={`h-3.5 w-3.5 shrink-0 ${quickFilter === 'unsynced' ? 'text-white' : 'text-rose-500'}`} />
                <span className="text-[11px] font-bold truncate">Belum Sinkron</span>
              </div>
              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-md shrink-0 ml-1 font-bold ${
                quickFilter === 'unsynced' ? 'bg-rose-800 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {countUnsynced}
              </span>
            </button>

            {/* PMKS Pill */}
            <button
              id="toolbar-filter-pmks"
              type="button"
              onClick={() => {
                setQuickFilter('pmks');
                setHasSearched(true);
              }}
              className={`flex items-center justify-between p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                quickFilter === 'pmks'
                  ? 'bg-teal-600 border-teal-500 text-white shadow-xs'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <AlertCircle className={`h-3.5 w-3.5 shrink-0 ${quickFilter === 'pmks' ? 'text-white' : 'text-teal-500'}`} />
                <span className="text-[11px] font-bold truncate">Data PMKS</span>
              </div>
              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-md shrink-0 ml-1 font-bold ${
                quickFilter === 'pmks' ? 'bg-teal-800 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {countPmks}
              </span>
            </button>

            {/* Usulan Baru Pill */}
            <button
              id="toolbar-filter-priority"
              type="button"
              onClick={() => {
                setQuickFilter('priority');
                setHasSearched(true);
              }}
              className={`flex items-center justify-between p-2.5 rounded-lg border text-left transition-all cursor-pointer col-span-2 sm:col-span-1 ${
                quickFilter === 'priority'
                  ? 'bg-purple-600 border-purple-500 text-white shadow-xs'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <BookmarkCheck className={`h-3.5 w-3.5 shrink-0 ${quickFilter === 'priority' ? 'text-white' : 'text-purple-500'}`} />
                <span className="text-[11px] font-bold truncate">Usulan Baru</span>
              </div>
              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-md shrink-0 ml-1 font-bold ${
                quickFilter === 'priority' ? 'bg-purple-800 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {countPriority}
              </span>
            </button>
          </div>
        </div>

        {/* Label & Search Input Section */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label htmlFor="table-search" className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Search className="h-4 w-4 text-indigo-600" />
              Pencarian Data Sensus Keluarga
            </label>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
              <span>Mendukung pencarian dinamis & real-time</span>
            </div>
          </div>
          
          <div className="relative w-full">
            <span className="absolute left-4 top-4 text-slate-400">
              <Search className="h-5 w-5" />
            </span>
            <input
              id="table-search"
              type="text"
              placeholder="Masukkan Nomor KK, Nama Kepala Keluarga, NIK Anggota, atau Nama Petugas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs sm:text-sm p-4 pl-12 pr-12 rounded-xl border-2 border-slate-200 bg-slate-50/50 outline-hidden transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100 font-medium text-slate-800 placeholder-slate-400/80 shadow-xs"
            />
            {searchTerm ? (
              <button 
                onClick={() => setSearchTerm('')} 
                className="absolute right-4 top-4 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 p-1 rounded-full transition-all cursor-pointer"
                title="Bersihkan Pencarian"
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <span className="absolute right-4 top-4.5 text-[10px] font-bold text-indigo-600/70 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                Sensus
              </span>
            )}
          </div>

          {/* Quick Guidance Tags */}
          <div className="flex flex-wrap gap-1.5 pt-1 items-center">
            <span className="text-[10px] text-slate-400 font-semibold mr-1">Saring cepat:</span>
            <button 
              type="button"
              className="text-[9px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 font-bold border border-slate-200/50 cursor-pointer transition-colors" 
              onClick={() => {
                setSearchTerm('1274');
                setActiveSearchTerm('1274');
                setHasSearched(true);
              }}
            >
              # Nomor KK
            </button>
            <button 
              type="button"
              className="text-[9px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 font-bold border border-slate-200/50 cursor-pointer transition-colors" 
              onClick={() => {
                setSearchTerm('Eka');
                setActiveSearchTerm('Eka');
                setHasSearched(true);
              }}
            >
              # Nama Responden
            </button>
            <button 
              type="button"
              className="text-[9px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 font-bold border border-slate-200/50 cursor-pointer transition-colors" 
              onClick={() => {
                setSearchTerm('suryani');
                setActiveSearchTerm('suryani');
                setHasSearched(true);
              }}
            >
              # Anggota Keluarga
            </button>
          </div>
        </div>

        {/* Row 2: Grid of Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          {/* Kecamatan Saring */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <SlidersHorizontal className="h-3.5 w-3.5 text-indigo-600" />
              <span>Kecamatan</span>
            </label>
            <select
              id="table-filter-kecamatan"
              value={filterKecamatan}
              onChange={(e) => handleKecamatanChange(e.target.value)}
              className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 cursor-pointer shadow-2xs"
            >
              {kecamantanList.map((kec) => (
                <option key={kec} value={kec}>{kec}</option>
              ))}
            </select>
          </div>

          {/* Kelurahan Saring */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <MapPin className="h-3.5 w-3.5 text-indigo-600" />
              <span>Kelurahan</span>
            </label>
            <select
              id="table-filter-kelurahan"
              value={filterKelurahan}
              onChange={(e) => setFilterKelurahan(e.target.value)}
              className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 cursor-pointer shadow-2xs"
            >
              {kelurahanList.map((kel) => (
                <option key={kel} value={kel}>{kel}</option>
              ))}
            </select>
          </div>

          {/* Status Sinkronisasi Saring */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <RefreshCw className="h-3.5 w-3.5 text-indigo-600" />
              <span>Status Sinkronisasi</span>
            </label>
            <select
              id="table-filter-sync"
              value={filterSyncStatus}
              onChange={(e) => setFilterSyncStatus(e.target.value)}
              className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 cursor-pointer shadow-2xs"
            >
              <option value="Semua">Semua Status</option>
              <option value="synced">Tersinkronisasi (SYNC)</option>
              <option value="unsynced">Lokal Saja (LOKAL)</option>
            </select>
          </div>

          {/* Status Pendataan Saring */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <BookmarkCheck className="h-3.5 w-3.5 text-indigo-600" />
              <span>Status Sensus</span>
            </label>
            <select
              id="table-filter-status-pendataan"
              value={filterStatusPendataan}
              onChange={(e) => setFilterStatusPendataan(e.target.value)}
              className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 cursor-pointer shadow-2xs"
            >
              <option value="Semua">Semua Status</option>
              {STATUS_PENDATAAN_OPTIONS.map((optVal) => (
                <option key={optVal} value={optVal}>{optVal}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 3: Action Buttons (Cari & Reset Filter) */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            id="btn-reset-filters"
            type="button"
            onClick={handleResetFilters}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold border border-rose-200 transition-all cursor-pointer shadow-3xs"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Reset Filter</span>
          </button>
          
          <button
            id="btn-submit-search"
            type="button"
            onClick={handleSearchSubmit}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md cursor-pointer transition-all hover:translate-y-[-1px] active:translate-y-0"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Cari Data</span>
          </button>
        </div>
      </div>

      {/* Pending Sync Queue panel */}
      {surveys.filter(s => !s.synced).length > 0 && (
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-xs select-none">
              <CloudLightning className="h-4.5 w-4.5 text-amber-600 shrink-0" />
              <span>Antrean Tertunda / Gagal Sinkron ({surveys.filter(s => !s.synced).length} Rekaman)</span>
            </div>
            <span className="text-[10px] text-amber-700 bg-amber-100 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
              Pending Sync Queue
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
            {surveys.filter(s => !s.synced).map(survey => (
              <div 
                key={survey.id} 
                className="bg-white border border-amber-150 rounded-xl p-3 flex items-center justify-between shadow-xs transition-all hover:border-amber-300"
              >
                <div className="space-y-1">
                  <div className="font-semibold text-slate-800 line-clamp-1">{survey.namaResponden}</div>
                  <div className="font-mono text-[10px] text-slate-500 font-bold tracking-wider">KK: {survey.noKK}</div>
                  <div className="text-[9px] text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-100/50 inline-block">
                    Belum Sinkron
                  </div>
                </div>
                
                <button
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
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer select-none"
                >
                  {individualSyncingStatus[survey.id] === 'syncing' ? (
                    <>
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      Proses...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-3 w-3" />
                      Retry Sync
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Data Table */}
      {!hasSearched ? (
        <div className="text-center py-16 bg-white border border-slate-200/80 rounded-2xl space-y-3 shadow-3xs">
          <div className="mx-auto w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <div className="space-y-1 text-slate-600">
            <p className="text-sm font-semibold text-slate-800">Data Tidak Ditemukan</p>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Silakan tentukan kriteria pencarian di atas dan klik tombol <strong>Cari Data</strong>.
            </p>
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
      ) : filteredSurveys.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 border border-slate-100 rounded-2xl space-y-3">
          <AlertCircle className="h-8 w-8 text-slate-400 mx-auto" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-700">Data Tidak Ditemukan</p>
            <p className="text-xs text-slate-500">Pastikan pencarian atau filter wilayah Kecamatan Anda sesuai, atau tambahkan data baru.</p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-100 max-h-[400px] overflow-y-auto custom-scrollbar bg-white">
          <div className="w-full overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-10">
                <tr className="bg-white text-slate-500 font-semibold border-b border-slate-100">
                  <th className="sticky top-0 bg-white p-4 z-10">ID / Tanggal</th>
                  <th className="sticky top-0 bg-white p-4 z-10">Kartu Keluarga (KK)</th>
                  <th className="sticky top-0 bg-white p-4 z-10">Nama Responden</th>
                  <th className="sticky top-0 bg-white p-4 z-10">Lokasi Wilayah</th>
                  <th className="sticky top-0 bg-white p-4 z-10 text-center">Jumlah Jiwa</th>
                  <th className="sticky top-0 bg-white p-4 z-10 text-center border-l border-slate-50">Tindakan Lapangan</th>
                </tr>
              </thead>
            <tbody className="divide-y divide-slate-100 divide-y-slate-200">
              {filteredSurveys.map((survey) => (
                <tr 
                  key={survey.id} 
                  className={`hover:bg-slate-50/50 transition-colors ${
                    !survey.synced ? 'bg-amber-50/15 border-l-4 border-l-amber-500' : ''
                  }`}
                >
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
                    <span className={`inline-flex items-center mt-1 text-[9.5px] font-bold border rounded-md px-1.5 py-0.5 ${getStatusPendataanBadgeColorByValue(survey.statusPendataan)}`}>
                      {survey.statusPendataan || 'Usulan Baru'}
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
                        id={`btn-print-row-${survey.id}`}
                        onClick={() => onPrint(survey)}
                        title="Cetak Data Keluarga (Hardcopy)"
                        className="p-2 text-slate-600 hover:text-emerald-750 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      >
                        <Printer className="h-4 w-4" />
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
                        onClick={() => handleDeleteRow(survey.id)}
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
                  <li><b>Salin URL Aplikasi Web</b> yang dihasilkan, masukkan URL tersebut ke kolom isian URL Script di atas, lalu klik tombol <b>Simpan URL</b> (sistem juga akan melakukan penyimpanan otomatis saat Anda mengetik/menempelkan URL tersebut)!</li>
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

      {/* Modern Dialog Confirmation Modal for Clear All */}
      {showClearConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col p-6 space-y-4">
            <div className="flex items-center gap-2.5 text-red-600">
              <AlertCircle className="h-6 w-6 shrink-0" />
              <h3 className="text-sm font-bold text-slate-800">Kosongkan Seluruh Database</h3>
            </div>
            
            <p className="text-xs text-slate-600 leading-relaxed font-sans">
              Apakah Anda yakin ingin menghapus seluruh data hasil pendataan secara permanen? Tindakan ini akan mengosongkan penyimpanan lokal dan data cloud (jika tersambung) dan tidak dapat dibatalkan.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirmModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-705 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold cursor-pointer select-none"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowClearConfirmModal(false);
                  onClearAll();
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-red-200 cursor-pointer select-none"
              >
                Ya, Hapus Semua
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modern Dialog Confirmation Modal for Row Delete */}
      {surveyIdToDelete && (
        (() => {
          const rec = surveys.find(s => s.id === surveyIdToDelete);
          return (
            <div className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col p-6 space-y-4">
                <div className="flex items-center gap-2.5 text-red-600">
                  <Trash2 className="h-6 w-6 shrink-0" />
                  <h3 className="text-sm font-bold text-slate-800">Hapus Data Pendataan KK</h3>
                </div>
                
                <p className="text-xs text-slate-600 leading-relaxed font-sans">
                  Apakah Anda yakin ingin membuang rekaman data KK <b>{rec ? rec.noKK : ''}</b> atas nama <b>{rec ? rec.namaResponden : ''}</b> secara permanen dari server dan penyimpanan lokal Anda?
                </p>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSurveyIdToDelete(null)}
                    className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold cursor-pointer select-none"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onDelete(surveyIdToDelete);
                      setSurveyIdToDelete(null);
                    }}
                    className="px-4 py-2 bg-red-650 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-red-200 cursor-pointer select-none"
                  >
                    Ya, Hapus Data
                  </button>
                </div>
              </div>
            </div>
          );
        })()
      )}
    </div>
  );
}
