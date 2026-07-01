import React, { useState, useEffect } from 'react';
import { 
  Database, Trash2, Download, AlertTriangle, CheckCircle2, 
  RefreshCw, FileJson, Calendar, Info, Clock, Archive
} from 'lucide-react';
import { 
  fetchCloudSurveysForAnalysis, 
  hardDeleteSurveysFromFirestore,
  isFirebaseConfigured
} from '../utils/syncService';
import { SurveyData } from '../types';

interface CloudCleanupPanelProps {
  onShowToast: (text: string, type: 'success' | 'info' | 'danger') => void;
}

export default function CloudCleanupPanel({ onShowToast }: CloudCleanupPanelProps) {
  const [loading, setLoading] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [cloudSurveys, setCloudSurveys] = useState<SurveyData[]>([]);
  const [targetSurveys, setTargetSurveys] = useState<SurveyData[]>([]);
  const [monthsThreshold, setMonthsThreshold] = useState<number>(3); // Default 3 months
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [cleanupSuccessCount, setCleanupSuccessCount] = useState<number | null>(null);

  // Analyze cloud data
  const handleAnalyzeCloud = async () => {
    if (!isFirebaseConfigured) {
      onShowToast('Firebase tidak terkonfigurasi. Fitur ini hanya tersedia saat mode online aktif.', 'danger');
      return;
    }
    setLoading(true);
    setCleanupSuccessCount(null);
    try {
      const surveys = await fetchCloudSurveysForAnalysis();
      setCloudSurveys(surveys);
      
      // Filter by age
      const now = new Date();
      const filtered = surveys.filter(survey => {
        if (!survey.submittedAt) return false;
        const submitDate = new Date(survey.submittedAt);
        const ageInMs = now.getTime() - submitDate.getTime();
        const ageInMonths = ageInMs / (1000 * 60 * 60 * 24 * 30.44); // Average month length
        
        if (monthsThreshold === 0) return true; // Delete all
        return ageInMonths >= monthsThreshold;
      });

      setTargetSurveys(filtered);
      setAnalyzed(true);
      onShowToast(`Analisis Berhasil: Menemukan ${filtered.length} data sensus yang memenuhi kriteria.`, 'success');
    } catch (error) {
      console.error(error);
      onShowToast('Gagal menganalisis data cloud.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  // Run analysis when threshold changes if already analyzed once
  useEffect(() => {
    if (analyzed && cloudSurveys.length > 0) {
      const now = new Date();
      const filtered = cloudSurveys.filter(survey => {
        if (!survey.submittedAt) return false;
        const submitDate = new Date(survey.submittedAt);
        const ageInMs = now.getTime() - submitDate.getTime();
        const ageInMonths = ageInMs / (1000 * 60 * 60 * 24 * 30.44);
        
        if (monthsThreshold === 0) return true;
        return ageInMonths >= monthsThreshold;
      });
      setTargetSurveys(filtered);
    }
  }, [monthsThreshold, analyzed, cloudSurveys]);

  // Export & Download Backup JSON
  const handleDownloadBackup = () => {
    if (targetSurveys.length === 0) return;
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(targetSurveys, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      
      const thresholdLabel = monthsThreshold === 0 ? 'semua' : `${monthsThreshold}_bulan`;
      const dateLabel = new Date().toISOString().split('T')[0];
      downloadAnchorNode.setAttribute("download", `DTSEN_Backup_Cloud_Archive_${thresholdLabel}_${dateLabel}.json`);
      
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
      onShowToast('Arsip cadangan data berhasil diunduh ke perangkat Anda!', 'success');
    } catch (err) {
      console.error(err);
      onShowToast('Gagal membuat file cadangan data.', 'danger');
    }
  };

  // Perform permanent delete on Firestore
  const handleExecuteCleanup = async () => {
    setShowConfirmModal(false);
    if (targetSurveys.length === 0) return;
    
    setLoading(true);
    try {
      const idsToDelete = targetSurveys.map(s => s.id);
      const result = await hardDeleteSurveysFromFirestore(idsToDelete);
      
      if (result.success) {
        setCleanupSuccessCount(result.count);
        onShowToast(`Cloud Cleanup Berhasil: ${result.count} data sensus lawas telah dipurgasi dari Firestore.`, 'success');
        
        // Refresh local lists or statuses
        setCloudSurveys(prev => prev.filter(s => !idsToDelete.includes(s.id)));
        setTargetSurveys([]);
        setAnalyzed(false);
      } else {
        onShowToast(`Gagal melaksanakan pembersihan cloud: ${result.error || ''}`, 'danger');
      }
    } catch (error) {
      console.error(error);
      onShowToast('Terjadi kesalahan tidak terduga saat pembersihan cloud.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="cloud-cleanup-section" className="bg-white rounded-3xl border border-slate-200/90 shadow-md overflow-hidden transition-all duration-300">
      {/* Header */}
      <div className="p-6 sm:p-8 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-rose-500/10 rounded-2xl border border-rose-505/20 border-rose-500/20">
            <Archive className="h-6 w-6 text-rose-400 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold">DTSEN CLOUD CLEANUP &amp; DATABASE ARCHIVING</h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Pangkas ukuran Firestore Cloud untuk menjaga performa queri dan menghemat limit kuota harian.
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 sm:p-8 space-y-6">
        {/* Info Box */}
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 leading-relaxed flex gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
          <div>
            <span className="font-bold block mb-1">Penting untuk Diketahui (Aman &amp; Teruji):</span>
            <ul className="list-disc pl-4 space-y-1">
              <li>Pembersihan ini <b>hanya</b> menghapus data di database cloud Firestore.</li>
              <li>Data sensus yang ada di memori/browser lokal (Handphone / Laptop Admin) <b>TIDAK</b> akan terhapus dan tetap tersimpan sebagai arsip lokal mandiri.</li>
              <li>Mengurangi jumlah dokumen di cloud akan secara drastis menurunkan konsumsi kuota harian membaca/menulis (Read/Write) Firestore Anda.</li>
            </ul>
          </div>
        </div>

        {/* Configuration Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end bg-slate-50 p-6 rounded-2xl border border-slate-200">
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
              Batas Usia Data Sensus yang Akan Diarsipkan
            </label>
            <div className="relative">
              <select
                value={monthsThreshold}
                onChange={(e) => setMonthsThreshold(Number(e.target.value))}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-white focus:border-slate-800 focus:ring-1 focus:ring-slate-800 outline-none transition-all text-slate-800 font-medium cursor-pointer"
              >
                <option value={3}>Lebih dari 3 Bulan (Rekomendasi Default)</option>
                <option value={6}>Lebih dari 6 Bulan (Data Sangat Lawas)</option>
                <option value={1}>Lebih dari 1 Bulan (Sangat Agresif)</option>
                <option value={0}>Semua Data di Cloud (Bersihkan Total)</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAnalyzeCloud}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-slate-900 hover:bg-slate-850 hover:bg-black text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm select-none"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Menganalisis...' : 'Analisis Penyimpanan Cloud'}
            </button>
          </div>
        </div>

        {/* Analysis Results Display */}
        {analyzed && (
          <div className="space-y-4 border border-slate-200 rounded-2xl p-6 bg-white animate-fade-in">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Database className="h-4 w-4 text-indigo-500" />
              Hasil Analisis Basis Data Cloud
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-150">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Total Dokumen Cloud</span>
                <span className="text-xl font-extrabold text-slate-800">{cloudSurveys.length} <span className="text-xs text-slate-500 font-normal">KK</span></span>
              </div>
              <div className="p-4 bg-rose-50/50 rounded-xl border border-rose-100">
                <span className="text-[10px] font-bold text-rose-500 block uppercase">Memenuhi Syarat Cleanup</span>
                <span className="text-xl font-extrabold text-rose-600">{targetSurveys.length} <span className="text-xs text-rose-500 font-normal">KK</span></span>
              </div>
              <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100">
                <span className="text-[10px] font-bold text-emerald-600 block uppercase">Estimasi Penghematan</span>
                <span className="text-xl font-extrabold text-emerald-700">~{targetSurveys.length * 20} <span className="text-xs text-emerald-550 font-normal">KB / Siklus</span></span>
              </div>
            </div>

            {targetSurveys.length > 0 ? (
              <div className="space-y-4 pt-2">
                <div className="p-4 bg-indigo-50 border border-indigo-150 rounded-xl text-xs text-indigo-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex gap-2 items-start">
                    <FileJson className="h-5 w-5 shrink-0 text-indigo-500 mt-0.5" />
                    <div>
                      <span className="font-bold block">Backup Cadangan Tersedia!</span>
                      <span>Sangat disarankan mengunduh cadangan lokal file JSON di bawah ini sebagai arsip cadangan sebelum melakukan pembersihan cloud.</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadBackup}
                    className="shrink-0 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-sm select-none"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Unduh Arsip JSON
                  </button>
                </div>

                <div className="border border-slate-100 rounded-xl max-h-[180px] overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest border-b border-slate-100">
                        <th className="py-2.5 px-3">No. KK</th>
                        <th className="py-2.5 px-3">Responden</th>
                        <th className="py-2.5 px-3">Tanggal Input</th>
                        <th className="py-2.5 px-3">Kecamatan / Kelurahan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-[11px] text-slate-600 font-mono">
                      {targetSurveys.map((s, idx) => (
                        <tr key={s.id || idx} className="hover:bg-slate-50/50">
                          <td className="py-2 px-3 font-semibold text-slate-700">{s.noKK}</td>
                          <td className="py-2 px-3 font-sans">{s.namaResponden}</td>
                          <td className="py-2 px-3">
                            {s.submittedAt ? new Date(s.submittedAt).toLocaleDateString('id-ID', {
                              day: '2-digit', month: 'short', year: 'numeric'
                            }) : '-'}
                          </td>
                          <td className="py-2 px-3 font-sans">{s.kecamatan} / {s.kelurahan}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowConfirmModal(true)}
                    className="px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-rose-100 select-none"
                  >
                    <Trash2 className="h-4 w-4" />
                    Mulai Cloud Cleanup ({targetSurveys.length} Dokumen)
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-500 text-xs bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                <CheckCircle2 className="h-8 w-8 text-emerald-550 text-emerald-500 mx-auto mb-2" />
                <p className="font-semibold text-slate-700">Aman! Firestore Bersih</p>
                <p className="text-[10.5px] text-slate-450 mt-0.5">Tidak ada data di cloud yang berusia melebihi {monthsThreshold} bulan.</p>
              </div>
            )}
          </div>
        )}

        {cleanupSuccessCount !== null && (
          <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex flex-col sm:flex-row items-center gap-4 animate-fade-in">
            <CheckCircle2 className="h-10 w-10 text-emerald-600 shrink-0" />
            <div className="flex-1 space-y-1">
              <span className="font-bold text-sm block text-emerald-900">Proses Cloud Cleanup Berhasil!</span>
              <span>Sebanyak <b>{cleanupSuccessCount} dokumen sensus</b> telah berhasil dipurgasikan secara permanen dari Firestore Cloud Database. Penyimpanan Firestore Anda sekarang lebih bersih dan kuota harian kembali aman stabil!</span>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col p-6 space-y-4">
            <div className="flex items-center gap-2.5 text-rose-600">
              <AlertTriangle className="h-6 w-6 shrink-0 animate-bounce" />
              <h3 className="text-sm font-bold text-slate-800">Konfirmasi Pembersihan Cloud</h3>
            </div>
            
            <p className="text-xs text-slate-650 text-slate-600 leading-relaxed font-sans">
              Anda akan menghapus secara permanen <b>{targetSurveys.length} data sensus</b> dari Google Firestore Cloud Database yang telah berusia lebih dari <b>{monthsThreshold === 0 ? 'seluruhnya' : `${monthsThreshold} bulan`}</b>.
            </p>

            <p className="text-[10.5px] text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200 leading-relaxed">
              ⚠️ <b>PERINGATAN:</b> Aksi ini tidak dapat dibatalkan (Undo). Pastikan Anda telah mengunduh Arsip JSON cadangan jika Anda sewaktu-waktu membutuhkan data cloud ini kembali. Data pada perangkat lokal Admin saat ini tidak akan terpengaruh.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold cursor-pointer select-none"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteCleanup}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-rose-200 cursor-pointer select-none"
              >
                Ya, Bersihkan Cloud Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
