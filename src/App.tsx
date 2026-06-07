import { useState, useEffect } from 'react';
import { Sparkles, Edit3, HeartHandshake, AlertCircle, BookmarkCheck, Database, LogOut, ShieldAlert } from 'lucide-react';
import { SurveyData } from './types';
import Header from './components/Header';
import SurveyWizardForm from './components/SurveyWizardForm';
import DataSummaryTable from './components/DataSummaryTable';
import DetailModal from './components/DetailModal';
import GPSDistributionMap from './components/GPSDistributionMap';
import { seedSurveys, emptySurvey } from './data/options';
import { sendSurveyToGoogleAppsScript } from './utils/syncService';
import LoginScreen from './components/LoginScreen';

export default function App() {
  const [userRole, setUserRole] = useState<'admin' | 'pendata' | null>(() => {
    return localStorage.getItem('dtsen_role') as 'admin' | 'pendata' | null;
  });
  const [surveys, setSurveys] = useState<SurveyData[]>([]);
  const [selectedSurvey, setSelectedSurvey] = useState<SurveyData | null>(null);
  const [editingSurvey, setEditingSurvey] = useState<SurveyData | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'danger' } | null>(null);

  const handleLoginSuccess = (role: 'admin' | 'pendata') => {
    localStorage.setItem('dtsen_role', role);
    setUserRole(role);
    showToast(`Berhasil masuk sebagai ${role === 'admin' ? 'Administrator' : 'Petugas Pendata'}!`, 'success');
  };

  const handleLogout = () => {
    localStorage.removeItem('dtsen_role');
    setUserRole(null);
  };

  const DEFAULT_SYNC_URL = 'https://script.google.com/macros/s/AKfycbzE3momFXoHolsyphCD6E95pJaeZO85H4CShW_WrmIGXID38ZdTByxgxJHXCpXI2xUQ6A/exec';
  const [syncUrl, setSyncUrl] = useState(() => {
    const stored = localStorage.getItem('dtsen_sync_url');
    // Auto-migrate from the old default to prevent user using outdated URL cached in browser
    if (!stored || stored.includes('AKfycbzxwm') || stored === 'https://script.google.com/macros/s/AKfycbzxwm476bHaoiVaYHUdI-VNm52JUxfcVjpK6vo-cYYJ3xMOMTirr9JmeYrYlcA_VlNt/exec') {
      localStorage.setItem('dtsen_sync_url', DEFAULT_SYNC_URL);
      return DEFAULT_SYNC_URL;
    }
    return stored;
  });
  const [isAutoSync, setIsAutoSync] = useState(() => {
    const stored = localStorage.getItem('dtsen_auto_sync');
    return stored === null ? true : stored === 'true';
  });

  const updateSyncUrl = (url: string) => {
    localStorage.setItem('dtsen_sync_url', url);
    setSyncUrl(url);
  };

  const updateAutoSync = (enabled: boolean) => {
    localStorage.setItem('dtsen_auto_sync', String(enabled));
    setIsAutoSync(enabled);
  };

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('sensus_surveys_v2');
    if (saved) {
      try {
        setSurveys(JSON.parse(saved));
      } catch (e) {
        console.error('Gagal memuat database DTSEN lokal:', e);
      }
    } else {
      // Pre-fill with empty array initially
      setSurveys([]);
    }
  }, []);

  // Show auto-dismiss toast alerts
  const showToast = (text: string, type: 'success' | 'info' | 'danger' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Helper to save surveys list to LocalStorage
  const saveToLocalStorage = (updatedList: SurveyData[]) => {
    localStorage.setItem('sensus_surveys_v2', JSON.stringify(updatedList));
    setSurveys(updatedList);
  };

  // Create or Update survey submission
  const handleSurveySubmit = (submittedData: SurveyData) => {
    let updatedSurveys: SurveyData[] = [];
    let finalSurveyToSync: SurveyData;
    let targetSurveyId: string;

    if (editingSurvey) {
      // Modify existing survey
      targetSurveyId = submittedData.id;
      updatedSurveys = surveys.map(s => {
        if (s.id === submittedData.id) {
          const entry = {
            ...submittedData,
            submittedAt: new Date().toISOString() // refresh submit date
          };
          finalSurveyToSync = entry;
          return entry;
        }
        return s;
      });
      showToast(`Data DTSEN KK ${submittedData.noKK} berhasil diperbarui di basis data!`, 'success');
      setEditingSurvey(null);
    } else {
      // Insert new survey
      const randomID = 'srv_' + Math.floor(Math.random() * 9000000 + 1000000);
      targetSurveyId = randomID;
      const newSurvey: SurveyData = {
        ...submittedData,
        id: randomID,
        submittedAt: new Date().toISOString()
      };
      finalSurveyToSync = newSurvey;
      updatedSurveys = [newSurvey, ...surveys];
      showToast(`Data DTSEN KK ${submittedData.noKK} berhasil tersimpan ke LocalStorage!`, 'success');
    }

    saveToLocalStorage(updatedSurveys);

    // Dynamic auto-sync with the Google Sheets script URL
    if (isAutoSync && syncUrl) {
      setTimeout(async () => {
        const res = await sendSurveyToGoogleAppsScript(syncUrl, finalSurveyToSync);
        if (res.success) {
          setSurveys(prev => {
            const nextList = prev.map(s => {
              if (s.id === targetSurveyId) {
                return { ...s, synced: true, syncedAt: new Date().toISOString() };
              }
              return s;
            });
            localStorage.setItem('sensus_surveys_v2', JSON.stringify(nextList));
            return nextList;
          });
          showToast(`Sinkronisasi awan sukses untuk KK ${finalSurveyToSync.noKK}!`, 'success');
        } else {
          showToast(`Data tersimpan! Gagal sinkron otomatis ke Google Sheets: ${res.message}`, 'info');
        }
      }, 600);
    }

    // Scroll smoothly to the summary database table for verification
    setTimeout(() => {
      const dbElement = document.getElementById('database-section');
      if (dbElement) {
        dbElement.scrollIntoView({ behavior: 'smooth' });
      }
    }, 400);
  };

  // Sync a single record manually
  const handleSyncSurvey = async (id: string, customUrl?: string): Promise<{ success: boolean; message: string }> => {
    const urlToUse = customUrl || syncUrl;
    const targetSurvey = surveys.find(s => s.id === id);
    if (!targetSurvey) return { success: false, message: 'Data tidak ditemukan' };

    const res = await sendSurveyToGoogleAppsScript(urlToUse, targetSurvey);
    if (res.success) {
      setSurveys(prev => {
        const nextList = prev.map(s => {
          if (s.id === id) {
            return { ...s, synced: true, syncedAt: new Date().toISOString() };
          }
          return s;
        });
        localStorage.setItem('sensus_surveys_v2', JSON.stringify(nextList));
        return nextList;
      });
      showToast(`Data KK ${targetSurvey.noKK} berhasil disinkronkan ke Google Sheets!`, 'success');
    } else {
      showToast(`Gagal menyinkronkan data KK ${targetSurvey.noKK}: ${res.message}`, 'danger');
    }
    return res;
  };

  // Sync all records manually
  const handleSyncAll = async (unsyncedOnly: boolean = true): Promise<{ success: boolean; count: number }> => {
    const toSync = unsyncedOnly ? surveys.filter(s => !s.synced) : surveys;
    if (toSync.length === 0) {
      showToast('Tidak ada data yang perlu disinkronkan.', 'info');
      return { success: true, count: 0 };
    }

    showToast(`Memulai sinkronisasi massal ${toSync.length} data ke Google Sheets...`, 'info');
    let successCount = 0;

    for (const s of toSync) {
      const res = await sendSurveyToGoogleAppsScript(syncUrl, s);
      if (res.success) {
        successCount++;
        // Update local object properties
        s.synced = true;
        s.syncedAt = new Date().toISOString();
      }
    }

    if (successCount > 0) {
      saveToLocalStorage([...surveys]);
      showToast(`Berhasil menyinkronkan ${successCount} data ke Google Sheets!`, 'success');
    } else {
      showToast('Sinkronisasi massal gagal. Periksa koneksi atau setelan URL script.', 'danger');
    }

    return { success: successCount === toSync.length, count: successCount };
  };

  // Trigger editing state and load data into form
  const handleEditTrigger = (survey: SurveyData) => {
    setEditingSurvey(survey);
    showToast(`Formulir di atas telah memuat data KK: ${survey.noKK}. Silakan lakukan penyesuaian.`, 'info');
    
    // Scroll cleanly up to the form wizard
    const formElement = document.getElementById('wizard-form-section');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Delete a survey from history
  const handleDeleteSurvey = (id: string) => {
    if (userRole === 'pendata') {
      showToast('Aksi ditolak: Petugas Pendata tidak diperbolehkan menghapus data!', 'danger');
      return;
    }
    const surveyToDelete = surveys.find(s => s.id === id);
    const updated = surveys.filter(s => s.id !== id);
    saveToLocalStorage(updated);
    showToast(`Rekaman DTSEN KK ${surveyToDelete?.noKK} telah dihapus dari kearsipan lokal.`, 'danger');
    
    // Stop editing if deleting the currently edited survey
    if (editingSurvey && editingSurvey.id === id) {
      setEditingSurvey(null);
    }
  };

  // Seed standard dummy data for testers and reviewers
  const handleLoadSeedData = () => {
    saveToLocalStorage(seedSurveys);
    showToast('Berhasil memuat 2 Data Keluarga Percontohan sebagai data simulasi!', 'info');
  };

  // Clear all surveys from database
  const handleClearAll = () => {
    saveToLocalStorage([]);
    setEditingSurvey(null);
    showToast('Seluruh data DTSEN di LocalStorage berhasil dikosongkan.', 'danger');
  };

  if (!userRole) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex flex-col justify-between selection:bg-indigo-100 selection:text-indigo-900 font-sans">
        {toastMessage && (
          <div className={`fixed bottom-5 right-5 z-50 p-4 rounded-xl shadow-xl flex items-center gap-3 max-w-sm animate-bounce text-xs font-semibold ${
            toastMessage.type === 'success' 
              ? 'bg-indigo-900 text-indigo-50 border border-indigo-750' 
              : 'bg-red-800 text-red-50 border border-red-750'
          }`}>
            <BookmarkCheck className="h-4 w-4 shrink-0" />
            <span>{toastMessage.text}</span>
          </div>
        )}
        <div className="flex-1 flex items-center justify-center">
          <LoginScreen onLoginSuccess={handleLoginSuccess} />
        </div>
        <footer className="py-6 text-center text-[11px] text-slate-400 font-medium">
          © 2026 Pemerintah Kota Tanjungbalai - Dinas Kependudukan &amp; Sosial
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 flex flex-col text-slate-800 font-sans selection:bg-indigo-100 selection:text-indigo-900 pb-16">
      
      {/* Dynamic Toast Alert Bar */}
      {toastMessage && (
        <div className={`fixed bottom-5 right-5 z-50 p-4 rounded-xl shadow-xl flex items-center gap-3 max-w-sm text-xs font-semibold ${
          toastMessage.type === 'success' 
            ? 'bg-indigo-800 text-indigo-50 border border-indigo-700' 
            : toastMessage.type === 'info' 
            ? 'bg-slate-800 text-white border border-slate-700' 
            : 'bg-red-800 text-red-50 border border-red-700'
        }`}>
          <BookmarkCheck className="h-4 w-4 shrink-0" />
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header Statistics Card */}
      <Header surveys={surveys} />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-12">
        
        {/* Welcome and guidelines section */}
        <div className="w-full bg-linear-to-r from-indigo-900 to-slate-900 text-white p-6 sm:p-8 rounded-3xl relative overflow-hidden shadow-md flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          {/* Background graphic touch */}
          <div className="absolute right-0 bottom-0 opacity-10 select-none pointer-events-none transform translate-y-12 translate-x-12 scale-150">
            <Database className="h-60 w-60" />
          </div>

          <div className="max-w-xl space-y-3 relative z-10">
            <span className="px-2 py-1 text-[10px] font-bold tracking-widest bg-indigo-700 rounded-md uppercase">
              Petunjuk Petugas Pendataan
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              Pendataan DTSEN Kota Tanjungbalai
            </h2>
            <p className="text-xs text-indigo-100 leading-relaxed font-light">
              Membantu Rukun Tetangga dan Dinas Kependudukan serta Sosial Kota Tanjungbalai merekam profil kesejahteraan, kepemilikan aset, 
              riwayat gizi balita, pendidikan, serta ketenagakerjaan jiwa-jiwa di berbagai kelurahan.
            </p>
            <div className="flex flex-wrap gap-x-5 gap-y-1 pt-2 font-mono text-[10px] text-indigo-200">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                Autosave Lokal
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                Kalkulasi Umur Otomatis
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                Live WebRTC snapshot
              </span>
            </div>
          </div>

          {/* User information & Logout actions */}
          <div className="relative z-10 shrink-0 bg-white/10 backdrop-blur-xs p-5 rounded-2xl border border-white/15 space-y-4 w-full md:max-w-xs">
            <div className="space-y-1">
              <p className="text-[10px] opacity-70 uppercase tracking-wider font-semibold text-indigo-300">Sesi Aktif</p>
              <div className="text-xs font-bold flex items-center gap-2 text-indigo-100">
                <span className={`inline-block h-2.5 w-2.5 rounded-full animate-pulse ${userRole === 'admin' ? 'bg-indigo-400' : 'bg-emerald-400'}`} />
                <span>{userRole === 'admin' ? 'Administrator (Full Access)' : 'Petugas Pendata (Akses Lapangan)'}</span>
              </div>
            </div>
            
            {userRole === 'pendata' && (
              <div className="text-[10px] text-indigo-200 leading-relaxed bg-black/20 p-2.5 rounded-xl border border-white/5 space-y-1">
                <p className="font-bold text-amber-300 flex items-center gap-1">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  Keamanan Data Aktif:
                </p>
                <p>Database histori aktif untuk pemantauan dan pengeditan, namun fungsi penghapusan dinonaktifkan demi keselamatan data.</p>
              </div>
            )}

            <button
              onClick={handleLogout}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-950/40 hover:bg-rose-900/80 text-indigo-200 hover:text-white font-bold text-[10.5px] uppercase cursor-pointer select-none border border-white/10 hover:border-rose-800 transition-all flex items-center justify-center gap-1.5 shadow-xs"
            >
              <LogOut className="h-3.5 w-3.5" />
              Keluar Sesi
            </button>
          </div>
        </div>

        {/* Wizard Form Section */}
        <section id="wizard-form-section" className="space-y-4">
          {editingSurvey && (
            <div className="p-3.5 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl flex items-center justify-between text-xs font-semibold">
              <span className="flex items-center gap-2">
                <Edit3 className="h-4 w-4 text-blue-600 animate-pulse" />
                <span>Sedang Memodifikasi DTSEN untuk No KK: <b>{editingSurvey.noKK}</b> (Responden: {editingSurvey.namaResponden})</span>
              </span>
              <button 
                onClick={() => {
                  setEditingSurvey(null);
                  showToast('Modifikasi sensor dibatalkan, mengembalikan ke forms baru.', 'info');
                }} 
                className="text-[11px] bg-white border text-slate-700 px-3 py-1 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Batal Edit
              </button>
            </div>
          )}

          <SurveyWizardForm 
            initialData={editingSurvey} 
            onSubmit={handleSurveySubmit} 
            onCancel={editingSurvey ? () => setEditingSurvey(null) : undefined}
          />
        </section>

        {/* Data summary table database */}
        <section id="database-section" className="pt-2">
          <DataSummaryTable 
            surveys={surveys}
            onView={setSelectedSurvey}
            onEdit={handleEditTrigger}
            onDelete={handleDeleteSurvey}
            onLoadSeeds={handleLoadSeedData}
            onClearAll={handleClearAll}
            userRole={userRole}
            syncUrl={syncUrl}
            setSyncUrl={updateSyncUrl}
            isAutoSync={isAutoSync}
            setIsAutoSync={updateAutoSync}
            onSyncSurvey={handleSyncSurvey}
            onSyncAll={handleSyncAll}
          />
        </section>

        {/* Peta Sebaran Georujukan Spasial Koordinat GPS Sensus */}
        <section id="spatial-map-section" className="pt-4 non-printable">
          <GPSDistributionMap 
            surveys={surveys}
            onViewSurvey={setSelectedSurvey}
          />
        </section>

      </main>

      {/* App Footer */}
      <footer className="mt-auto border-t border-slate-100 bg-white py-6 text-center text-xs text-slate-400 non-printable">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <HeartHandshake className="h-4 w-4 text-indigo-600" />
            <span className="font-semibold text-slate-500">Pendataan Terpadu DTSEN Kota Tanjungbalai</span>
          </div>
          <p>© 2026 Pemerintah Kota Tanjungbalai - Dinas Sosial &amp; Kependudukan</p>
        </div>
      </footer>

      {/* DTSEN Record Detail Modal Popup */}
      <DetailModal 
        survey={selectedSurvey} 
        onClose={() => setSelectedSurvey(null)} 
      />
    </div>
  );
}
