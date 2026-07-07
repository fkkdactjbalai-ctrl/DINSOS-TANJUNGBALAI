import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Edit3, HeartHandshake, AlertCircle, BookmarkCheck, Database, LogOut, ShieldAlert, LayoutDashboard, UserCheck, FileText, Map, CloudOff, RefreshCw, Download, Upload, Calendar } from 'lucide-react';
import { SurveyData } from './types';
import { safeStorage } from './utils/storage';
import Header from './components/Header';
import SurveyWizardForm from './components/SurveyWizardForm';
import DataSummaryTable from './components/DataSummaryTable';
import DetailModal from './components/DetailModal';
import GPSDistributionMap from './components/GPSDistributionMap';
import MonthlyReportPanel from './components/MonthlyReportPanel';
import { seedSurveys, emptySurvey } from './data/options';
import { 
  sendSurveyToGoogleAppsScript, 
  fetchSurveysFromGoogleAppsScript,
  subscribeToSurveys,
  deleteSurveyFromFirestore,
  clearAllSurveysFromFirestore,
  isFirebaseConfigured,
  isFirestoreQuotaExceeded,
  registerQuotaExceededCallback,
  fetchUserDirectlyFromServer,
  setFirestoreQuotaExceeded,
  fetchGlobalSyncUrl,
  saveGlobalSyncUrl
} from './utils/syncService';
import LoginScreen from './components/LoginScreen';
import VillageDataChart from './components/VillageDataChart';
import QuickStats from './components/QuickStats';
import AdminUserApprovalPanel from './components/AdminUserApprovalPanel';
import CloudCleanupPanel from './components/CloudCleanupPanel';
import MetricsGrid from './components/MetricsGrid';

interface UndoAction {
  type: 'delete_survey' | 'clear_all' | 'save_survey';
  payload: {
    survey?: SurveyData;
    index?: number;
    previousSurveys?: SurveyData[];
    savedId?: string;
  };
  message: string;
}

export default function App() {
  const [userRole, setUserRole] = useState<'admin' | 'pendata' | null>(() => {
    return safeStorage.getItem('dtsen_role') as 'admin' | 'pendata' | null;
  });
  const [username, setUsername] = useState<string>(() => {
    return safeStorage.getItem('dtsen_username') || '';
  });
  const [fullname, setFullname] = useState<string>(() => {
    return safeStorage.getItem('dtsen_fullname') || '';
  });
  const [surveys, setSurveys] = useState<SurveyData[]>([]);
  const [selectedSurvey, setSelectedSurvey] = useState<SurveyData | null>(null);
  const [editingSurvey, setEditingSurvey] = useState<SurveyData | null>(null);
  const [autoPrintActive, setAutoPrintActive] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'danger' } | null>(null);
  const [isPullingCloud, setIsPullingCloud] = useState(false);
  const [activeView, setActiveView] = useState<'dashboard' | 'manajemen_petugas' | 'formulir' | 'peta_spasial' | 'laporan_bulanan'>('dashboard');

  const activeSection = 
    activeView === 'dashboard' ? 'database-section' :
    activeView === 'manajemen_petugas' ? 'user-approval-panel-section' :
    activeView === 'formulir' ? 'wizard-form-section' :
    activeView === 'peta_spasial' ? 'spatial-map-section' :
    'monthly-report-section';

  const [quickFilter, setQuickFilter] = useState<'all' | 'today' | 'unsynced' | 'pmks' | 'priority'>('all');
  const [hasSearched, setHasSearched] = useState(false);
  const [lastAction, setLastAction] = useState<UndoAction | null>(null);
  const [isUndoToastVisible, setIsUndoToastVisible] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(isFirestoreQuotaExceeded());
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    const handleBeforePrint = () => setIsPrinting(true);
    const handleAfterPrint = () => setIsPrinting(false);

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  useEffect(() => {
    registerQuotaExceededCallback((val) => {
      setQuotaExceeded(val);
    });
  }, []);

  // Stats for the quick monitoring toolbar
  const todayStr = new Date().toDateString();
  const countAll = surveys.length;
  const countToday = surveys.filter(s => s.submittedAt && new Date(s.submittedAt).toDateString() === todayStr).length;
  const countUnsynced = surveys.filter(s => !s.synced).length;
  const countPmks = surveys.filter(s => (s.anggotaKeluarga || []).some(m => m.isPmks === 'Ya')).length;
  const countPriority = surveys.filter(s => s.statusPendataan === 'Usulan Baru').length;

  const scrollToSection = (id: string) => {
    if (id === 'database-section') {
      setActiveView('dashboard');
    } else if (id === 'user-approval-panel-section') {
      setActiveView('manajemen_petugas');
    } else if (id === 'wizard-form-section') {
      setActiveView('formulir');
    } else if (id === 'spatial-map-section') {
      setActiveView('peta_spasial');
    } else if (id === 'monthly-report-section') {
      setActiveView('laporan_bulanan');
    }
  };

  const handlePrint = (survey: SurveyData) => {
    setSelectedSurvey(survey);
    setAutoPrintActive(true);
  };

  const handleLoginSuccess = (role: 'admin' | 'pendata', uname: string, fname: string) => {
    safeStorage.setItem('dtsen_role', role);
    safeStorage.setItem('dtsen_username', uname);
    safeStorage.setItem('dtsen_fullname', fname);
    safeStorage.setItem('dtsen_last_nama_pendata', fname);
    
    setUserRole(role);
    setUsername(uname);
    setFullname(fname);
    showToast(`Selamat datang ${fname}! Berhasil masuk sebagai ${role === 'admin' ? 'Administrator' : 'Petugas Pendata'}.`, 'success');
  };

  const handleLogout = () => {
    safeStorage.removeItem('dtsen_role');
    safeStorage.removeItem('dtsen_username');
    safeStorage.removeItem('dtsen_fullname');
    setUserRole(null);
    setUsername('');
    setFullname('');
  };

  const DEFAULT_SYNC_URL = 'https://script.google.com/macros/s/AKfycbzhKQssWLHiL1If4NDk4k_PgP6VEbPtcv-SDCOHJsXugoQ6-q0_KPTRwLUOWRdGq8OV/exec';
  const [syncUrl, setSyncUrl] = useState(() => {
    const stored = safeStorage.getItem('dtsen_sync_url');
    // Auto-migrate from the old defaults to prevent user using outdated URL cached in browser
    if (
      !stored || 
      stored.includes('AKfycbzxwm') || 
      stored.includes('AKfycbzE3mom') || 
      stored.includes('AKfycbzRkb2H') ||
      stored.includes('AKfycbwSZvmO0s3oWZSkMuEG7tvTZnIJMg6mSKkN9mWjVVNHQYfhd1Urvol18h5wtY8WMQ4IqQ') ||
      stored === 'https://script.google.com/macros/s/AKfycbzRkb2HTPFyTc1XrlS77D5mtBmNRxs4RSD-67WQsjs4sDtwM_oLywREuwbKyWzSfvVvKA/exec' ||
      stored === 'https://script.google.com/macros/s/AKfycbzE3momFXoHolsyphCD6E95pJaeZO85H4CShW_WrmIGXID38ZdTByxgxJHXCpXI2xUQ6A/exec' ||
      stored === 'https://script.google.com/macros/s/AKfycbwSZvmO0s3oWZSkMuEG7tvTZnIJMg6mSKkN9mWjVVNHQYfhd1Urvol18h5wtY8WMQ4IqQ/exec'
    ) {
      safeStorage.setItem('dtsen_sync_url', DEFAULT_SYNC_URL);
      return DEFAULT_SYNC_URL;
    }
    return stored;
  });
  const [isAutoSync, setIsAutoSync] = useState(() => {
    const stored = safeStorage.getItem('dtsen_auto_sync');
    return stored === null ? true : stored === 'true';
  });

  const updateSyncUrl = async (url: string) => {
    safeStorage.setItem('dtsen_sync_url', url);
    setSyncUrl(url);
    if (userRole === 'admin') {
      try {
        const res = await saveGlobalSyncUrl(url, fullname || username || 'Admin');
        if (res.success) {
          showToast('URL Apps Script berhasil disimpan secara global di Firestore!', 'success');
        } else {
          showToast(`URL lokal disimpan, tapi gagal menyimpan ke Firestore secara global: ${res.error}`, 'danger');
        }
      } catch (err: any) {
        console.warn('Gagal menyimpan URL Apps Script ke Firestore:', err);
        showToast(`Gagal menyimpan URL ke Firestore: ${err?.message || err}`, 'danger');
      }
    }
  };

  const updateAutoSync = (enabled: boolean) => {
    safeStorage.setItem('dtsen_auto_sync', String(enabled));
    setIsAutoSync(enabled);
  };

  // Load from local storage on mount
  useEffect(() => {
    const saved = safeStorage.getItem('sensus_surveys_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setSurveys(parsed);
        } else {
          setSurveys([]);
        }
      } catch (e) {
        console.error('Gagal memuat database DTSEN lokal:', e);
        setSurveys([]);
      }
    } else {
      // Pre-fill with empty array initially
      setSurveys([]);
    }
  }, []);

  // Fetch global Apps Script URL from Firestore settings/global on startup
  useEffect(() => {
    let active = true;
    const loadGlobalSettings = async () => {
      if (isFirebaseConfigured) {
        try {
          const globalUrl = await fetchGlobalSyncUrl();
          if (globalUrl && active) {
            safeStorage.setItem('dtsen_sync_url', globalUrl);
            setSyncUrl(globalUrl);
            console.log('Successfully loaded global Apps Script URL from Firestore:', globalUrl);
          }
        } catch (error) {
          console.warn('Could not load global Apps Script URL from Firestore:', error);
        }
      }
    };
    loadGlobalSettings();
    return () => {
      active = false;
    };
  }, []);

  // Configure real-time active listener sync across devices
  useEffect(() => {
    if (!userRole) return;

    // Subscribe to Firestore changes to synchronize in real-time across devices
    const unsubscribe = subscribeToSurveys(userRole, fullname, (cloudSurveys) => {
      setSurveys(prev => {
        const mergedDict: { [id: string]: SurveyData } = {};
        const prevArray = Array.isArray(prev) ? prev : [];
        const cloudSurveysArray = Array.isArray(cloudSurveys) ? cloudSurveys : [];
        
        // Always preserve all local surveys to prevent any accidental data loss!
        prevArray.forEach(s => {
          if (s && s.id) {
            mergedDict[s.id] = s;
          }
        });

        // Merge/update with cloud items, marking them as synced
        cloudSurveysArray.forEach(s => {
          if (s && s.id) {
            mergedDict[s.id] = { ...s, synced: true };
          }
        });

        // Convert back to sorted list (newest first, based on submittedAt)
        const mergedList = Object.values(mergedDict).sort((a, b) => {
          const timeA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
          const timeB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
          return timeB - timeA;
        });

        safeStorage.setItem('sensus_surveys_v2', JSON.stringify(mergedList));
        return mergedList;
      });
    });

    return () => unsubscribe();
  }, [userRole, fullname]);

  // Format obscure Firestore error messages into clean, user-friendly language
  const formatErrorMessage = (message: string): string => {
    if (!message) return '';
    try {
      if (message.includes('{') && message.includes('}')) {
        const jsonStr = message.substring(message.indexOf('{'), message.lastIndexOf('}') + 1);
        const parsed = JSON.parse(jsonStr);
        if (parsed.error) {
          if (
            parsed.error.toLowerCase().includes('quota') || 
            parsed.error.toLowerCase().includes('resource_exhausted') || 
            parsed.error.toLowerCase().includes('limit')
          ) {
            return "Kuota harian Google Firestore tercapai (Batas Spark Plan). Sistem berjalan dalam Mode Offline Lokal.";
          }
          return parsed.error;
        }
      }
    } catch (e) {
      // Fallback
    }
    
    if (
      message.toLowerCase().includes('quota') || 
      message.toLowerCase().includes('resource_exhausted') || 
      message.toLowerCase().includes('limit')
    ) {
      return "Kuota harian Google Firestore tercapai (Batas Spark Plan). Sistem berjalan dalam Mode Offline Lokal.";
    }
    return message;
  };

  // Show auto-dismiss toast alerts
  const showToast = (text: string, type: 'success' | 'info' | 'danger' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const triggerUndo = () => {
    if (!lastAction) return;

    try {
      if (lastAction.type === 'delete_survey') {
        const { survey, index } = lastAction.payload;
        if (survey) {
          const updated = [...surveys];
          if (index !== undefined && index >= 0 && index <= surveys.length) {
            updated.splice(index, 0, survey);
          } else {
            updated.unshift(survey);
          }
          saveToLocalStorage(updated);
          
          if (isFirebaseConfigured) {
            sendSurveyToGoogleAppsScript(syncUrl, survey).catch(err => console.warn('Cloud undo restore issue:', err));
          }
          
          showToast(`Berhasil Membatalkan: Data KK ${survey.noKK} dikembalikan ke database.`, 'success');
        }
      } else if (lastAction.type === 'clear_all') {
        const { previousSurveys } = lastAction.payload;
        if (previousSurveys && previousSurveys.length > 0) {
          saveToLocalStorage(previousSurveys);
          
          if (isFirebaseConfigured) {
            previousSurveys.forEach(s => {
              sendSurveyToGoogleAppsScript(syncUrl, s).catch(err => console.warn('Cloud undo bulk restore issue:', err));
            });
          }
          
          showToast(`Berhasil Membatalkan: ${previousSurveys.length} data dikembalikan ke database.`, 'success');
        }
      } else if (lastAction.type === 'save_survey') {
        const { previousSurveys, savedId } = lastAction.payload;
        if (previousSurveys) {
          saveToLocalStorage(previousSurveys);
          
          if (savedId && isFirebaseConfigured) {
            deleteSurveyFromFirestore(savedId).catch(err => console.warn('Cloud undo save delete issue:', err));
          }
          
          showToast('Berhasil Membatalkan: Penyimpanan data berhasil dibatalkan.', 'info');
        }
      }
    } catch (error) {
      console.error('Error executing undo action:', error);
      showToast('Gagal memproses pembatalan aksi (Undo).', 'danger');
    }

    setLastAction(null);
    setIsUndoToastVisible(false);
  };

  const handleExportData = () => {
    try {
      const surveysData = safeStorage.getItem('sensus_surveys_v2') || '[]';
      const offlineUsersData = safeStorage.getItem('dtsen_offline_users') || '{}';
      
      const backupObject = {
        backupVersion: '2.0',
        exportedAt: new Date().toISOString(),
        surveys: JSON.parse(surveysData),
        offlineUsers: JSON.parse(offlineUsersData),
        appSettings: {
          syncUrl: safeStorage.getItem('dtsen_sync_url') || '',
          autoSync: safeStorage.getItem('dtsen_auto_sync') !== 'false'
        }
      };

      const dataStr = JSON.stringify(backupObject, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

      const exportFileDefaultName = `dtsen_sensus_backup_${new Date().toISOString().slice(0, 10)}.json`;

      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();

      showToast('Cadangan berhasil diekspor! Simpan file JSON ini di tempat aman.', 'success');
    } catch (e) {
      console.error('Export backup failed:', e);
      showToast('Gagal mengekspor cadangan data!', 'danger');
    }
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const file = event.target.files?.[0];
    if (!file) return;

    fileReader.onload = (e) => {
      try {
        const parsedData = JSON.parse(e.target?.result as string);
        
        // Validation checks
        if (!parsedData || typeof parsedData !== 'object') {
          throw new Error('Format JSON tidak valid.');
        }

        const restoredSurveys = parsedData.surveys;
        if (!Array.isArray(restoredSurveys)) {
          throw new Error('Data Sensus (surveys) tidak ditemukan atau formatnya salah.');
        }

        // Write to localStorage
        safeStorage.setItem('sensus_surveys_v2', JSON.stringify(restoredSurveys));
        setSurveys(restoredSurveys);

        if (parsedData.offlineUsers && typeof parsedData.offlineUsers === 'object') {
          safeStorage.setItem('dtsen_offline_users', JSON.stringify(parsedData.offlineUsers));
        }

        if (parsedData.appSettings) {
          if (parsedData.appSettings.syncUrl) {
            safeStorage.setItem('dtsen_sync_url', parsedData.appSettings.syncUrl);
            setSyncUrl(parsedData.appSettings.syncUrl);
          }
          if (parsedData.appSettings.autoSync !== undefined) {
            safeStorage.setItem('dtsen_auto_sync', String(parsedData.appSettings.autoSync));
            setIsAutoSync(parsedData.appSettings.autoSync);
          }
        }

        showToast(`Pemulihan Berhasil! Berhasil memuat ${restoredSurveys.length} data sensus dan akun pengguna offline.`, 'success');
        
        // Reset file input element
        if (event.target) {
          event.target.value = '';
        }
      } catch (err: any) {
        console.error('Import failed:', err);
        showToast(`Gagal memulihkan data: ${err?.message || 'File tidak valid'}`, 'danger');
      }
    };

    fileReader.readAsText(file);
  };

  // Prevent browser back button from exiting the app accidentally
  useEffect(() => {
    if (!userRole) return;

    // Push initial history state to trap back clicks
    window.history.pushState({ app: 'siks' }, '', window.location.href);

    const handlePopState = (e: PopStateEvent) => {
      // Re-push history state immediately to keep the trap alive
      window.history.pushState({ app: 'siks' }, '', window.location.href);

      // Custom undo/back behavior inside the app
      if (selectedSurvey) {
        setSelectedSurvey(null);
        showToast('Undo: Tampilan detail ditutup.', 'info');
      } else if (editingSurvey) {
        setEditingSurvey(null);
        showToast('Undo: Pengeditan dibatalkan.', 'info');
      } else if (lastAction) {
        triggerUndo();
      } else {
        const confirmExit = window.confirm("Apakah Anda yakin ingin keluar dari Aplikasi Sensus SIKS-NG Kota Tanjungbalai?");
        if (confirmExit) {
          window.removeEventListener('popstate', handlePopState);
          window.history.back();
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [userRole, selectedSurvey, editingSurvey, lastAction, surveys]);

  // Support auto-login if opening via deep-link printing triggers in a new tab
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roleParam = params.get('role');
    const unameParam = params.get('uname');
    const fnameParam = params.get('fname');

    if (roleParam && unameParam && fnameParam && !userRole) {
      safeStorage.setItem('dtsen_role', roleParam);
      safeStorage.setItem('dtsen_username', unameParam);
      safeStorage.setItem('dtsen_fullname', fnameParam);
      safeStorage.setItem('dtsen_last_nama_pendata', fnameParam);
      
      setUserRole(roleParam as 'admin' | 'pendata');
      setUsername(unameParam);
      setFullname(fnameParam);
    }
  }, [userRole]);

  // Support auto-printing and section navigation when loading via a deep-link
  useEffect(() => {
    if (!userRole || surveys.length === 0) return;

    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');

    if (action === 'print-survey') {
      const surveyId = params.get('id');
      const found = surveys.find(s => s.id === surveyId);
      if (found) {
        setSelectedSurvey(found);
        setAutoPrintActive(true);
        // Clear query parameters from address bar to keep things clean
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } else if (action === 'print-report') {
      // Switch view to the monthly report section
      setActiveView('laporan_bulanan');
      
      // Delay to let the charts & tables render and compute chosen stats
      const timer = setTimeout(() => {
        window.print();
        // Clear query parameters from address bar
        window.history.replaceState({}, document.title, window.location.pathname);
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [userRole, surveys]);

  // Automatic background synchronization for all unsynced surveys
  const syncingInProgressRef = useRef<Set<string>>(new Set());
  
  useEffect(() => {
    if ((!isFirebaseConfigured && !syncUrl) || !isAutoSync) return;

    const unsynced = surveys.filter(s => !s.synced);
    if (unsynced.length === 0) return;

    // Filter to only those not already in progress
    const toStart = unsynced.filter(s => !syncingInProgressRef.current.has(s.id));
    if (toStart.length === 0) return;

    // To prevent rapid successive firings, wait 1.5 seconds
    const timer = setTimeout(() => {
      toStart.forEach(async (s) => {
        // Mark as in-progress
        syncingInProgressRef.current.add(s.id);
        
        try {
          const res = await sendSurveyToGoogleAppsScript(syncUrl, s);
          if (res.success) {
            setSurveys(prev => {
              const prevArray = Array.isArray(prev) ? prev : [];
              const updated = prevArray.map(item => {
                if (item.id === s.id) {
                  return { ...item, synced: true, syncedAt: new Date().toISOString() };
                }
                return item;
              });
              safeStorage.setItem('sensus_surveys_v2', JSON.stringify(updated));
              return updated;
            });
            showToast(res.message || `Sinkronisasi latar otomatis sukses untuk KK ${s.noKK}!`, 'success');
          }
        } catch (err) {
          console.error(`Gagal sinkron latar KK ${s.noKK}:`, err);
        } finally {
          // Remove from in-progress so it can retry later if failed
          syncingInProgressRef.current.delete(s.id);
        }
      });
    }, 1500);

    return () => clearTimeout(timer);
  }, [surveys, syncUrl, isAutoSync]);

  // Helper to save surveys list to LocalStorage
  const saveToLocalStorage = (updatedList: SurveyData[]) => {
    safeStorage.setItem('sensus_surveys_v2', JSON.stringify(updatedList));
    setSurveys(updatedList);
  };

  // Create or Update survey submission
  const handleSurveySubmit = async (submittedData: SurveyData) => {
    // 2. Submit Data Protection: Check account validity in Cloud Firestore if configured
    if (isFirebaseConfigured && username) {
      try {
        const userData = await fetchUserDirectlyFromServer(username);
        if (!userData) {
          showToast("Gagal Mengirim Data: Akun Anda tidak terdaftar atau telah dihapus dari Cloud Database.", 'danger');
          return;
        }
      } catch (err) {
        console.warn("Account validity check failed due to network, continuing with caution:", err);
      }
    }

    const previous = [...surveys];
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
             synced: false,
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
      if (isFirebaseConfigured) {
        showToast(`Data DTSEN KK ${submittedData.noKK} berhasil disimpan! Memproses sinkronisasi ke cloud database...`, 'success');
      } else {
        showToast(`Data DTSEN KK ${submittedData.noKK} berhasil tersimpan ke LocalStorage!`, 'success');
      }
    }

    saveToLocalStorage(updatedSurveys);
    setSurveys(updatedSurveys);

    // Store for Undo
    setLastAction({
      type: 'save_survey',
      payload: { previousSurveys: previous, savedId: targetSurveyId },
      message: editingSurvey ? `Modifikasi data KK ${submittedData.noKK} disimpan.` : `Data baru KK ${submittedData.noKK} disimpan.`
    });
    setIsUndoToastVisible(true);

    // Write directly to Firestore or Sheets if online/configured
    sendSurveyToGoogleAppsScript(syncUrl, finalSurveyToSync).then(res => {
      if (res.success) {
        setSurveys(prev => {
          const prevArray = Array.isArray(prev) ? prev : [];
          const updated = prevArray.map(item => {
            if (item.id === targetSurveyId) {
              return { ...item, synced: true, syncedAt: new Date().toISOString() };
            }
            return item;
          });
          safeStorage.setItem('sensus_surveys_v2', JSON.stringify(updated));
          return updated;
        });
        if (res.message) {
          showToast(res.message, 'success');
        } else if (isFirebaseConfigured) {
          showToast(`Sinkronisasi cloud otomatis sukses untuk No KK ${finalSurveyToSync.noKK}!`, 'success');
        } else if (syncUrl && syncUrl.trim().startsWith('http')) {
          showToast(`Berhasil tersinkronisasi ke Google Sheets (Backup Utama) untuk No KK ${finalSurveyToSync.noKK}!`, 'success');
        }
      } else {
        showToast(`Tersimpan lokal. Antrean sinkronisasi cloud: ${formatErrorMessage(res.message)}`, 'info');
      }
    }).catch(err => {
      console.warn('Direct cloud/Sheets sync failed on submission:', err);
    });

    // Switch view to dashboard for verification
    setTimeout(() => {
      setActiveView('dashboard');
    }, 400);
  };

  // Sync a single record manually
  const handleSyncSurvey = async (id: string, customUrl?: string): Promise<{ success: boolean; message: string }> => {
    // 2. Submit Data Protection: Check account validity in Cloud Firestore if configured
    if (isFirebaseConfigured && username) {
      try {
        const userData = await fetchUserDirectlyFromServer(username);
        if (!userData) {
          showToast("Gagal Mengirim Data: Akun Anda tidak terdaftar atau telah dihapus dari Cloud Database.", 'danger');
          return { success: false, message: 'Akun Anda tidak terdaftar atau telah dihapus dari Cloud Database.' };
        }
      } catch (err) {
        console.warn("Account validity check failed during manual sync:", err);
      }
    }

    const urlToUse = customUrl || syncUrl;
    const targetSurvey = surveys.find(s => s.id === id);
    if (!targetSurvey) return { success: false, message: 'Data tidak ditemukan' };

    const res = await sendSurveyToGoogleAppsScript(urlToUse, targetSurvey);
    if (res.success) {
      setSurveys(prev => {
        const prevArray = Array.isArray(prev) ? prev : [];
        const nextList = prevArray.map(s => {
          if (s.id === id) {
            return { ...s, synced: true, syncedAt: new Date().toISOString() };
          }
          return s;
        });
        safeStorage.setItem('sensus_surveys_v2', JSON.stringify(nextList));
        return nextList;
      });
      showToast(res.message || `Data KK ${targetSurvey.noKK} berhasil disinkronkan ke Google Sheets!`, 'success');
    } else {
      showToast(`Gagal menyinkronkan data KK ${targetSurvey.noKK}: ${formatErrorMessage(res.message)}`, 'danger');
    }
    return res;
  };

  // Sync all records manually
  const handleSyncAll = async (unsyncedOnly: boolean = true): Promise<{ success: boolean; count: number }> => {
    // 2. Submit Data Protection: Check account validity in Cloud Firestore if configured
    if (isFirebaseConfigured && username) {
      try {
        const userData = await fetchUserDirectlyFromServer(username);
        if (!userData) {
          showToast("Gagal Mengirim Data: Akun Anda tidak terdaftar atau telah dihapus dari Cloud Database.", 'danger');
          return { success: false, count: 0 };
        }
      } catch (err) {
        console.warn("Account validity check failed during manual bulk sync:", err);
      }
    }

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

  // Pull all records from cloud database and merge locally
  const handlePullCloudData = async (forceFull: boolean = false) => {
    if (!isFirebaseConfigured && !syncUrl) {
      showToast('Gagal menarik data: Setelan cloud database atau URL Google Sheets belum dikonfigurasi.', 'danger');
      return;
    }
    
    setIsPullingCloud(true);
    
    const lastSync = forceFull ? undefined : (safeStorage.getItem('dtsen_last_sync_timestamp') || undefined);
    
    if (lastSync) {
      showToast(`Menghubungi cloud untuk memuat perubahan data baru sejak ${new Date(lastSync).toLocaleTimeString('id-ID')} (Delta Sync)...`, 'info');
    } else {
      showToast('Menghubungi cloud untuk memuat seluruh database lengkap (Full Sync)...', 'info');
    }
    
    const syncStartTime = new Date().toISOString();
    
    try {
      const res = await fetchSurveysFromGoogleAppsScript(syncUrl, lastSync, userRole, fullname);
      if (res.success && res.surveys) {
        const cloudSurveys = res.surveys;
        
        if (cloudSurveys.length === 0) {
          if (lastSync) {
            showToast('Tidak ada perubahan data sensus baru di cloud (Sudah Sinkron).', 'success');
          } else {
            showToast('Tidak ada data sensus yang tersedia di cloud database.', 'info');
          }
          // Still update last sync timestamp to avoid missing any edge updates
          safeStorage.setItem('dtsen_last_sync_timestamp', syncStartTime);
          setIsPullingCloud(false);
          return;
        }

        setSurveys(prev => {
          // Map local surveys into a dictionary by ID
          const mergedDict: { [id: string]: SurveyData } = {};
          const prevArray = Array.isArray(prev) ? prev : [];
          const cloudSurveysArray = Array.isArray(cloudSurveys) ? cloudSurveys : [];
          
          // Seed with current local state
          prevArray.forEach(s => {
            if (s && s.id) {
              mergedDict[s.id] = s;
            }
          });

          // Overwrite/insert or delete based on data fetched from Cloud
          cloudSurveysArray.forEach(s => {
            if (s && s.id) {
              if ((s as any).deleted) {
                delete mergedDict[s.id];
              } else {
                // Force status to be synced in local state since it came from cloud!
                mergedDict[s.id] = { ...s, synced: true };
              }
            }
          });

          // Convert back to sorted list (newest first, based on submittedAt)
          const mergedList = Object.values(mergedDict).sort((a, b) => {
            const timeA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
            const timeB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
            return timeB - timeA;
          });

          safeStorage.setItem('sensus_surveys_v2', JSON.stringify(mergedList));
          return mergedList;
        });

        // Store last sync time on success
        safeStorage.setItem('dtsen_last_sync_timestamp', syncStartTime);

        const successMsg = lastSync
          ? `Delta Sinkronisasi Sukses! Berhasil menyelaraskan ${cloudSurveys.length} perubahan data sensus baru.`
          : `Sinkronisasi Penuh Sukses! Berhasil menyelaraskan total ${cloudSurveys.length} data sensus dari cloud.`;
        showToast(successMsg, 'success');
      } else {
        const isQuota = res.message?.toLowerCase().includes('quota') || res.message?.toLowerCase().includes('resource_exhausted') || res.message?.toLowerCase().includes('limit');
        if (isQuota) {
          setQuotaExceeded(true);
          showToast(`Kuota harian Google Firestore tercapai (Batas Spark Plan). Sistem otomatis beralih ke Mode Offline Lokal agar Anda tetap dapat melakukan pendataan dengan aman!`, 'info');
        } else {
          showToast(`Gagal memuat data dari cloud: ${formatErrorMessage(res.message)}`, 'danger');
        }
      }
    } catch (err: any) {
      console.error('Failed to pull surveys:', err);
      const errMsg = err?.message || '';
      const isQuota = errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('resource_exhausted') || errMsg.toLowerCase().includes('limit');
      if (isQuota) {
        setQuotaExceeded(true);
        showToast(`Kuota harian Google Firestore tercapai (Batas Spark Plan). Sistem otomatis beralih ke Mode Offline Lokal agar Anda tetap dapat melakukan pendataan dengan aman!`, 'info');
      } else {
        showToast(`Gagal menyambung ke server cloud: ${formatErrorMessage(errMsg || 'Cek koneksi internet')}`, 'danger');
      }
    } finally {
      setIsPullingCloud(false);
    }
  };

  // Trigger editing state and load data into form
  const handleEditTrigger = (survey: SurveyData) => {
    setEditingSurvey(survey);
    showToast(`Formulir telah memuat data KK: ${survey.noKK}. Silakan lakukan penyesuaian.`, 'info');
    setActiveView('formulir');
  };

  // Delete a survey from history
  const handleDeleteSurvey = (id: string) => {
    const indexToDelete = surveys.findIndex(s => s.id === id);
    if (indexToDelete === -1) return;

    const surveyToDelete = surveys[indexToDelete];
    const updated = surveys.filter(s => s.id !== id);
    saveToLocalStorage(updated);
    
    // Also delete from Firestore
    deleteSurveyFromFirestore(id);

    // Store for Undo
    setLastAction({
      type: 'delete_survey',
      payload: { survey: surveyToDelete, index: indexToDelete },
      message: `Data KK ${surveyToDelete.noKK} berhasil dihapus.`
    });
    setIsUndoToastVisible(true);
    
    showToast(`Rekaman DTSEN KK ${surveyToDelete?.noKK} telah dihapus dari kearsipan lokal dan cloud database.`, 'danger');
    
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
    if (surveys.length === 0) {
      showToast('Database kearsipan sudah kosong.', 'info');
      return;
    }

    const previous = [...surveys];
    saveToLocalStorage([]);
    setEditingSurvey(null);
    clearAllSurveysFromFirestore(userRole, fullname);

    // Store for Undo
    setLastAction({
      type: 'clear_all',
      payload: { previousSurveys: previous },
      message: `${previous.length} rekaman data dikosongkan.`
    });
    setIsUndoToastVisible(true);
    
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

      {/* Interactive Floating Undo Banner */}
      {lastAction && isUndoToastVisible && (
        <div className="fixed bottom-5 left-5 z-50 p-4 bg-slate-900/95 border border-slate-700 text-white rounded-2xl shadow-2xl flex items-center justify-between gap-4 max-w-sm backdrop-blur-md animate-pulse-subtle">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-2.5 w-2.5 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400"></span>
            </span>
            <div className="truncate text-xs">
              <span className="text-slate-400 font-bold block text-[9px] uppercase tracking-wider">Aksi Terakhir</span>
              <span className="truncate font-medium text-slate-100">{lastAction.message}</span>
            </div>
          </div>
          <button
            id="floating-undo-btn"
            type="button"
            onClick={triggerUndo}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] rounded-xl transition-all cursor-pointer shadow-xs hover:scale-[1.03] active:scale-[0.97]"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Undo</span>
          </button>
        </div>
      )}

      {/* Header Statistics Card */}
      <Header />

      {quotaExceeded && (
        <div className="bg-amber-500 text-slate-950 px-4 py-3 sm:px-6 lg:px-8 border-b border-amber-600 shadow-sm non-printable">
          <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="h-5 w-5 text-slate-950 shrink-0 animate-bounce" />
              <div className="text-xs sm:text-sm font-semibold">
                <span className="font-extrabold">MODE LOKAL/OFFLINE AKTIF:</span> Kuota harian database cloud Google Firestore telah terlampaui atau koneksi terganggu. Semua data Anda dimuat &amp; disimpan secara mandiri dan aman di penyimpanan lokal peramban perangkat ini. Anda dapat terus melakukan pendataan dengan lancar!
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setFirestoreQuotaExceeded(false);
                  window.location.reload();
                }}
                className="px-3 py-1 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-all cursor-pointer shadow-xs whitespace-nowrap active:scale-95"
              >
                Coba Hubungkan Ulang
              </button>
              <div className="text-[10px] font-mono bg-slate-950/20 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider shrink-0">
                Offline Active
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-8 flex-1 w-full">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Sticky Sidebar: Petunjuk Petugas Pendataan */}
          <aside className="lg:col-span-4 lg:sticky lg:top-24 space-y-6 non-printable">
            <div className="w-full bg-linear-to-b from-indigo-900 to-slate-900 text-white p-6 sm:p-8 rounded-3xl relative overflow-hidden shadow-md flex flex-col gap-6">
              {/* Background graphic touch */}
              <div className="absolute right-0 bottom-0 opacity-10 select-none pointer-events-none transform translate-y-12 translate-x-12 scale-150">
                <Database className="h-60 w-60" />
              </div>

              <div className="space-y-3 relative z-10">
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
                <div className="flex flex-wrap gap-x-5 gap-y-1.5 pt-2 font-mono text-[10px] text-indigo-200">
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

              {/* Interactive Toolbar Menu Navigation (Sidebar Menu) */}
              <div className="relative z-10 shrink-0 space-y-2.5 w-full border-t border-b border-white/10 py-5 my-1 non-printable">
                <p className="text-[10px] opacity-70 uppercase tracking-widest font-bold text-indigo-300 px-1 mb-1">
                  Navigasi Fitur
                </p>
                
                {/* Menu 1: Dashboard & Ringkasan Data */}
                <button
                  onClick={() => setActiveView('dashboard')}
                  className={`w-full flex items-center justify-between py-2.5 px-3.5 rounded-xl text-left transition-all cursor-pointer select-none border text-xs font-semibold ${
                    activeView === 'dashboard'
                      ? 'bg-indigo-600/80 text-white border-indigo-500 shadow-xs'
                      : 'bg-white/5 hover:bg-white/10 text-indigo-200 hover:text-white border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <LayoutDashboard className="h-4 w-4 shrink-0" />
                    <span>Dashboard &amp; Ringkasan</span>
                  </div>
                  <span className="text-[9px] px-2 py-0.5 rounded-md bg-indigo-950/50 text-indigo-300 border border-indigo-800/50">
                    {surveys.length} KK
                  </span>
                </button>

                {/* Menu 2: Manajemen Akun Petugas */}
                <button
                  onClick={() => {
                    if (userRole === 'admin') {
                      setActiveView('manajemen_petugas');
                    } else {
                      showToast('Akses Terbatas: Menu Manajemen Akun hanya untuk Administrator.', 'danger');
                    }
                  }}
                  className={`w-full flex items-center justify-between py-2.5 px-3.5 rounded-xl text-left transition-all cursor-pointer select-none border text-xs font-semibold ${
                    userRole !== 'admin'
                      ? 'opacity-65 bg-slate-900/40 text-slate-400 border-transparent cursor-not-allowed'
                      : activeView === 'manajemen_petugas'
                      ? 'bg-indigo-600/80 text-white border-indigo-500 shadow-xs'
                      : 'bg-white/5 hover:bg-white/10 text-indigo-200 hover:text-white border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <UserCheck className="h-4 w-4 shrink-0" />
                    <span>Manajemen Akun Petugas</span>
                  </div>
                  {userRole !== 'admin' ? (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-950/30 text-rose-300 border border-rose-900/40 font-mono">
                      LOCK
                    </span>
                  ) : (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950/30 text-emerald-300 border border-emerald-900/40 font-mono">
                      ADMIN
                    </span>
                  )}
                </button>

                {/* BAR TOOLBAR KHUSUS: PANTAU DATA MASUK (REAL-TIME) */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-3 my-2 space-y-2.5">
                  <div className="flex items-center justify-between pb-1 border-b border-white/10">
                    <div className="flex items-center gap-1.5">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400"></span>
                      </span>
                      <span className="text-[9px] font-extrabold text-indigo-200 tracking-wider uppercase">
                        PANTAU DATA MASUK (REAL-TIME)
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    {/* Semua Data */}
                    <button
                      type="button"
                      onClick={() => {
                        setQuickFilter('all');
                        setHasSearched(true);
                        scrollToSection('database-section');
                      }}
                      className={`w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg text-left transition-all text-[10.5px] font-bold cursor-pointer border ${
                        quickFilter === 'all'
                          ? 'bg-indigo-600/90 text-white border-indigo-500 shadow-xs'
                          : 'bg-white/5 border-transparent text-indigo-200 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Database className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                        <span>Semua Data</span>
                      </div>
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-md font-bold shrink-0 ${
                        quickFilter === 'all' ? 'bg-indigo-800 text-white' : 'bg-white/15 text-indigo-200'
                      }`}>
                        {countAll}
                      </span>
                    </button>

                    {/* Hari Ini */}
                    <button
                      type="button"
                      onClick={() => {
                        setQuickFilter('today');
                        setHasSearched(true);
                        scrollToSection('database-section');
                      }}
                      className={`w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg text-left transition-all text-[10.5px] font-bold cursor-pointer border ${
                        quickFilter === 'today'
                          ? 'bg-amber-600/90 text-white border-amber-500 shadow-xs'
                          : 'bg-white/5 border-transparent text-indigo-200 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                        <span>Hari Ini (Baru)</span>
                      </div>
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-md font-bold shrink-0 ${
                        quickFilter === 'today' ? 'bg-amber-800 text-white' : 'bg-white/15 text-indigo-200'
                      }`}>
                        {countToday}
                      </span>
                    </button>

                    {/* Belum Sinkron */}
                    <button
                      type="button"
                      onClick={() => {
                        setQuickFilter('unsynced');
                        setHasSearched(true);
                        scrollToSection('database-section');
                      }}
                      className={`w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg text-left transition-all text-[10.5px] font-bold cursor-pointer border ${
                        quickFilter === 'unsynced'
                          ? 'bg-rose-600/90 text-white border-rose-500 shadow-xs'
                          : 'bg-white/5 border-transparent text-indigo-200 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <CloudOff className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                        <span>Belum Sinkron</span>
                      </div>
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-md font-bold shrink-0 ${
                        quickFilter === 'unsynced' ? 'bg-rose-800 text-white' : 'bg-white/15 text-indigo-200'
                      }`}>
                        {countUnsynced}
                      </span>
                    </button>

                    {/* Data PMKS */}
                    <button
                      type="button"
                      onClick={() => {
                        setQuickFilter('pmks');
                        setHasSearched(true);
                        scrollToSection('database-section');
                      }}
                      className={`w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg text-left transition-all text-[10.5px] font-bold cursor-pointer border ${
                        quickFilter === 'pmks'
                          ? 'bg-teal-600/90 text-white border-teal-500 shadow-xs'
                          : 'bg-white/5 border-transparent text-indigo-200 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-3.5 w-3.5 text-teal-400 shrink-0" />
                        <span>Data PMKS</span>
                      </div>
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-md font-bold shrink-0 ${
                        quickFilter === 'pmks' ? 'bg-teal-800 text-white' : 'bg-white/15 text-indigo-200'
                      }`}>
                        {countPmks}
                      </span>
                    </button>

                    {/* Usulan Baru */}
                    <button
                      type="button"
                      onClick={() => {
                        setQuickFilter('priority');
                        setHasSearched(true);
                        scrollToSection('database-section');
                      }}
                      className={`w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg text-left transition-all text-[10.5px] font-bold cursor-pointer border ${
                        quickFilter === 'priority'
                          ? 'bg-purple-600/90 text-white border-purple-500 shadow-xs'
                          : 'bg-white/5 border-transparent text-indigo-200 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <BookmarkCheck className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                        <span>Usulan Baru</span>
                      </div>
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-md font-bold shrink-0 ${
                        quickFilter === 'priority' ? 'bg-purple-800 text-white' : 'bg-white/15 text-indigo-200'
                      }`}>
                        {countPriority}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Menu 3: Formulir Pengisian Data (Multi-Tahap) */}
                <button
                  onClick={() => setActiveView('formulir')}
                  className={`w-full flex items-center justify-between py-2.5 px-3.5 rounded-xl text-left transition-all cursor-pointer select-none border text-xs font-semibold ${
                    activeView === 'formulir'
                      ? 'bg-indigo-600/80 text-white border-indigo-500 shadow-xs'
                      : 'bg-white/5 hover:bg-white/10 text-indigo-200 hover:text-white border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <FileText className="h-4 w-4 shrink-0" />
                    <span>Formulir Pengisian Data</span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-950/50 text-indigo-300 border border-indigo-800/50">
                    Sensus
                  </span>
                </button>

                {/* Menu 4: Peta Sosio-Geografis */}
                <button
                  onClick={() => setActiveView('peta_spasial')}
                  className={`w-full flex items-center justify-between py-2.5 px-3.5 rounded-xl text-left transition-all cursor-pointer select-none border text-xs font-semibold ${
                    activeView === 'peta_spasial'
                      ? 'bg-indigo-600/80 text-white border-indigo-500 shadow-xs'
                      : 'bg-white/5 hover:bg-white/10 text-indigo-200 hover:text-white border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Map className="h-4 w-4 shrink-0" />
                    <span>Peta Sosio-Geografis</span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-teal-950/50 text-teal-300 border border-teal-800/50">
                    GPS Map
                  </span>
                </button>

                {/* Menu 5: Format Laporan Bulanan */}
                <button
                  onClick={() => setActiveView('laporan_bulanan')}
                  className={`w-full flex items-center justify-between py-2.5 px-3.5 rounded-xl text-left transition-all cursor-pointer select-none border text-xs font-semibold ${
                    activeView === 'laporan_bulanan'
                      ? 'bg-indigo-600/80 text-white border-indigo-500 shadow-xs'
                      : 'bg-white/5 hover:bg-white/10 text-indigo-200 hover:text-white border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Calendar className="h-4 w-4 shrink-0 text-amber-400" />
                    <span>Laporan Bulanan Sensus</span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-950/50 text-amber-300 border border-amber-800/50">
                    Laporan
                  </span>
                </button>

                {/* Menu 5: Urungkan Aksi Terakhir (Undo Button) */}
                <button
                  type="button"
                  onClick={triggerUndo}
                  disabled={!lastAction}
                  className={`w-full flex items-center justify-between py-2.5 px-3.5 rounded-xl text-left transition-all select-none border text-xs font-bold ${
                    lastAction
                      ? 'bg-amber-500 text-slate-950 border-amber-400 cursor-pointer shadow-md hover:scale-[1.01] active:scale-[0.99]'
                      : 'bg-white/5 text-slate-500 border-transparent cursor-not-allowed opacity-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <RefreshCw className={`h-4 w-4 shrink-0 ${lastAction ? 'animate-spin-slow' : ''}`} />
                    <span>Urungkan Aksi Terakhir</span>
                  </div>
                  {lastAction ? (
                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-600 text-white animate-pulse">
                      READY
                    </span>
                  ) : (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-slate-600">
                      KOSONG
                    </span>
                  )}
                </button>
              </div>

              {/* Backup & Restore Local JSON Card */}
              <div className="relative z-10 shrink-0 bg-white/10 backdrop-blur-xs p-5 rounded-2xl border border-white/15 space-y-4 w-full non-printable">
                <div className="space-y-1">
                  <p className="text-[10px] opacity-70 uppercase tracking-widest font-extrabold text-amber-300">
                    Cadangan &amp; Pemulihan
                  </p>
                  <div className="text-[10.5px] text-indigo-200 leading-relaxed">
                    Simpan seluruh data sensus dan profil akun lokal Anda secara mandiri untuk mencegah kehilangan data jika peramban dibersihkan.
                  </div>
                </div>

                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={handleExportData}
                    className="flex-1 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-indigo-200 hover:text-white font-bold text-[10.5px] uppercase cursor-pointer select-none border border-white/10 transition-all flex items-center justify-center gap-1.5 shadow-xs active:scale-[0.98]"
                  >
                    <Download className="h-3.5 w-3.5 text-indigo-300" />
                    Ekspor
                  </button>
                  
                  <label className="flex-1 py-2 px-3 rounded-xl bg-indigo-600/80 hover:bg-indigo-500 text-white font-bold text-[10.5px] uppercase cursor-pointer select-none border border-indigo-500 text-center transition-all flex items-center justify-center gap-1.5 shadow-xs active:scale-[0.98]">
                    <Upload className="h-3.5 w-3.5" />
                    Impor
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportData}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* User information & Logout actions */}
              <div className="relative z-10 shrink-0 bg-white/10 backdrop-blur-xs p-5 rounded-2xl border border-white/15 space-y-4 w-full">
                <div className="space-y-1">
                  <p className="text-[10px] opacity-70 uppercase tracking-wider font-semibold text-indigo-300">Sesi Aktif</p>
                  <div className="text-xs font-bold flex items-center gap-2 text-indigo-100">
                    <span className={`inline-block h-2.5 w-2.5 rounded-full animate-pulse ${userRole === 'admin' ? 'bg-indigo-400' : 'bg-emerald-400'}`} />
                    <span>{userRole === 'admin' ? 'Administrator (Full Access)' : 'Petugas Pendata (Akses Lapangan)'}</span>
                  </div>
                </div>
                
                {userRole === 'pendata' && (
                  <div className="text-[10px] text-indigo-200 leading-relaxed bg-black/20 p-2.5 rounded-xl border border-white/5 space-y-1">
                    <p className="font-bold text-emerald-300 flex items-center gap-1">
                      <ShieldAlert className="h-3.5 w-3.5 text-emerald-400" />
                      Keamanan Data Aktif:
                    </p>
                    <p>Database histori aktif untuk pemantauan, pengeditan, serta alat penghapusan &amp; pengosongan data secara penuh.</p>
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
          </aside>

          {/* Right Main Content Area */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Dashboard View */}
            {(activeView === 'dashboard' || isPrinting) && (
              <div className="space-y-8 animate-fade-in">
                {/* Barisan Info Card (Metrics) */}
                <div className="non-printable">
                  <MetricsGrid surveys={surveys} />
                </div>

                {/* Data summary table database */}
                <section id="database-section" className="space-y-4">
                  <QuickStats surveys={surveys} />
                  <DataSummaryTable 
                    surveys={surveys}
                    onView={setSelectedSurvey}
                    onEdit={handleEditTrigger}
                    onDelete={handleDeleteSurvey}
                    onPrint={handlePrint}
                    onLoadSeeds={handleLoadSeedData}
                    onClearAll={handleClearAll}
                    userRole={userRole}
                    syncUrl={syncUrl}
                    setSyncUrl={updateSyncUrl}
                    isAutoSync={isAutoSync}
                    setIsAutoSync={updateAutoSync}
                    onSyncSurvey={handleSyncSurvey}
                    onSyncAll={handleSyncAll}
                    onPullCloudData={handlePullCloudData}
                    isPullingCloud={isPullingCloud}
                    quickFilter={quickFilter}
                    setQuickFilter={setQuickFilter}
                    hasSearched={hasSearched}
                    setHasSearched={setHasSearched}
                  />
                </section>

                {/* Visualisasi data Recharts sebaran KK per kelurahan */}
                <section id="chart-section" className="pt-2">
                  <VillageDataChart surveys={surveys} />
                </section>
              </div>
            )}

            {/* Admin User Approval Management Panel */}
            {userRole === 'admin' && (activeView === 'manajemen_petugas' || isPrinting) && (
              <section id="user-approval-panel-section" className="space-y-6 animate-fade-in">
                <AdminUserApprovalPanel onShowToast={showToast} currentUser={username} />
                <CloudCleanupPanel onShowToast={showToast} />
              </section>
            )}

            {/* Wizard Form Section */}
            {(activeView === 'formulir' || isPrinting) && (
              <section id="wizard-form-section" className="space-y-4 animate-fade-in">
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
                  username={username}
                />
              </section>
            )}

            {/* Peta Sebaran Georujukan Spasial Koordinat GPS Sensus */}
            {(activeView === 'peta_spasial' || isPrinting) && (
              <section id="spatial-map-section" className="pt-4 non-printable animate-fade-in">
                <GPSDistributionMap 
                  surveys={surveys}
                  onViewSurvey={setSelectedSurvey}
                />
              </section>
            )}

            {/* Format Laporan Bulanan Sensus Keluarga */}
            {(activeView === 'laporan_bulanan' || isPrinting) && (
              <section id="monthly-report-section-wrapper" className="pt-4 animate-fade-in">
                <MonthlyReportPanel 
                  surveys={surveys}
                  onViewSurvey={setSelectedSurvey}
                  userRole={userRole}
                />
              </section>
            )}

          </div>

        </div>
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
        onClose={() => {
          setSelectedSurvey(null);
          setAutoPrintActive(false);
        }} 
        autoPrint={autoPrintActive}
        onPrinted={() => setAutoPrintActive(false)}
      />
    </div>
  );
}
