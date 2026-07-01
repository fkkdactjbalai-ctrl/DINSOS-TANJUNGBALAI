import React, { useState, useEffect } from 'react';
import { Shield, UserCheck, KeyRound, AlertCircle, Eye, EyeOff, Lock, HeartHandshake, UserPlus, LogIn, ChevronRight } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured, fetchUserFromFirestore, saveUserToFirestore, isFirestoreQuotaExceeded, registerQuotaExceededCallback } from '../utils/syncService';

interface LoginScreenProps {
  onLoginSuccess: (role: 'admin' | 'pendata', username: string, fullname: string) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [roleSelection, setRoleSelection] = useState<'admin' | 'pendata'>('pendata');
  const [quotaExceeded, setQuotaExceeded] = useState(isFirestoreQuotaExceeded());
  
  useEffect(() => {
    registerQuotaExceededCallback((val) => {
      setQuotaExceeded(val);
    });
  }, []);
  
  // Login fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // Register fields
  const [regUsername, setRegUsername] = useState('');
  const [regFullname, setRegFullname] = useState('');
  const [regPassword, setRegPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Automated background seeding of default system accounts to Cloud Firestore & Local storage
  useEffect(() => {
    const seedDefaultAccounts = async () => {
      try {
        const seedAdmin = {
          username: 'slrttanjungbalai',
          fullname: 'ADMINISTRATOR PPKS',
          password: 'SLRTKITO9102',
          role: 'admin',
          isApproved: true,
          created_at: new Date().toISOString()
        };

        const seedFasilitator = {
          username: 'fasilitator slrt',
          fullname: 'FASILITATOR SLRT',
          password: 'FS2026',
          role: 'pendata',
          isApproved: true,
          created_at: new Date().toISOString()
        };

        // Always save to offline local storage to ensure instant offline access
        try {
          const offlineUsersJson = localStorage.getItem('dtsen_offline_users');
          const offlineUsers = offlineUsersJson ? JSON.parse(offlineUsersJson) : {};
          let changed = false;
          
          if (!offlineUsers['slrttanjungbalai']) {
            offlineUsers['slrttanjungbalai'] = seedAdmin;
            changed = true;
          }
          if (!offlineUsers['fasilitator slrt']) {
            offlineUsers['fasilitator slrt'] = seedFasilitator;
            changed = true;
          }
          if (changed) {
            localStorage.setItem('dtsen_offline_users', JSON.stringify(offlineUsers));
          }
        } catch (e) {
          console.warn("Offline local seeding warning:", e);
        }

        // Always attempt online seeding to Cloud Firestore database if available and not already present
        if (isFirebaseConfigured && db) {
          try {
            const adminDocRef = doc(db, 'users', 'slrttanjungbalai');
            const adminSnap = await getDoc(adminDocRef);
            if (!adminSnap.exists()) {
              await saveUserToFirestore('slrttanjungbalai', seedAdmin);
            }
          } catch (adminErr) {
            console.warn("Check/seed admin document warning:", adminErr);
          }

          try {
            const fasilitatorDocRef = doc(db, 'users', 'fasilitator slrt');
            const fasilitatorSnap = await getDoc(fasilitatorDocRef);
            if (!fasilitatorSnap.exists()) {
              await saveUserToFirestore('fasilitator slrt', seedFasilitator);
            }
          } catch (fasilErr) {
            console.warn("Check/seed fasilitator document warning:", fasilErr);
          }
        }
      } catch (err) {
        console.warn("Background seeding warning:", err);
      }
    };

    seedDefaultAccounts();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    if (!username.trim()) {
      setError('Username / NIK wajib diisi!');
      return;
    }
    if (!password) {
      setError('Sandi pengaman wajib diisi!');
      return;
    }

    setIsLoading(true);
    try {
      if (isFirebaseConfigured) {
        // Online Firestore verification
        const userData = await fetchUserFromFirestore(username.trim().toLowerCase());
        if (userData) {
          if (userData.password === password) {
            if (userData.role !== roleSelection) {
              setError(`Akun terdaftar sebagai ${userData.role === 'admin' ? 'Administrator' : 'Petugas Pendata'}, bukan ${roleSelection === 'admin' ? 'Administrator' : 'Petugas Pendata'}!`);
              setIsLoading(false);
              return;
            }
            if (userData.role === 'pendata' && userData.isApproved === false) {
              setError('Akses Ditangguhkan: Pendaftaran Akun Anda belum disetujui oleh Administrator (SLRTTANJUNGBALAI). Silakan hubungi admin Anda.');
              setIsLoading(false);
              return;
            }
            onLoginSuccess(userData.role, userData.username, userData.fullname || userData.username.toUpperCase());
          } else {
            setError('Sandi Pengaman tidak valid untuk akun ini!');
          }
        } else {
          // Fallback check: default credentials for convenience
          if (roleSelection === 'admin' && username.trim().toLowerCase() === 'slrttanjungbalai' && password === 'SLRTKITO9102') {
            const seedAdmin = {
              username: 'slrttanjungbalai',
              fullname: 'ADMINISTRATOR PPKS',
              password: 'SLRTKITO9102',
              role: 'admin',
              isApproved: true,
              created_at: new Date().toISOString()
            };
            await saveUserToFirestore('slrttanjungbalai', seedAdmin);
            onLoginSuccess('admin', 'slrttanjungbalai', 'ADMINISTRATOR PPKS');
          } else if (roleSelection === 'pendata' && (username.trim().toLowerCase() === 'fasilitator slrt' || username.trim().toLowerCase() === 'fasilitatorslrt') && password === 'FS2026') {
            const seedPendata = {
              username: 'fasilitator slrt',
              fullname: 'FASILITATOR SLRT',
              password: 'FS2026',
              role: 'pendata',
              isApproved: true,
              created_at: new Date().toISOString()
            };
            await saveUserToFirestore('fasilitator slrt', seedPendata);
            onLoginSuccess('pendata', 'fasilitator slrt', 'FASILITATOR SLRT');
          } else if (roleSelection === 'pendata' && username.trim().toLowerCase() === 'pendata' && password === 'FS2026') {
            onLoginSuccess('pendata', 'pendata', 'PETUGAS LAPANGAN');
          } else {
            if (isFirestoreQuotaExceeded()) {
              setError('Mode Offline (Kuota Firebase Terlampaui): Akun Anda belum terdaftar di HP/PC ini. Silakan masuk menggunakan Akun Petugas Default -> Username: "fasilitator slrt" | Sandi: "FS2026".');
            } else {
              setError('Akun tidak ditemukan di cloud database. Silakan ganti tab ke "Daftar Akun" di atas terlebih dahulu.');
            }
          }
        }
      } else {
        // Offline / Local Mode verification
        const offlineUsersJson = localStorage.getItem('dtsen_offline_users');
        const offlineUsers = offlineUsersJson ? JSON.parse(offlineUsersJson) : {};
        const localUser = offlineUsers[username.trim().toLowerCase()];

        if (localUser) {
          if (localUser.password === password) {
            if (localUser.role !== roleSelection) {
              setError(`Akun lokal terdaftar sebagai ${localUser.role === 'admin' ? 'Admin' : 'Pendata'}!`);
              setIsLoading(false);
              return;
            }
            if (localUser.role === 'pendata' && localUser.isApproved === false) {
              setError('Akses Ditangguhkan: Akun Anda belum disetujui oleh Administrator (SLRTTANJUNGBALAI).');
              setIsLoading(false);
              return;
            }
            onLoginSuccess(localUser.role, localUser.username, localUser.fullname);
          } else {
            setError('Sandi Pengaman salah!');
          }
        } else {
          // Hardcoded fallback
          if (roleSelection === 'admin' && username.trim().toLowerCase() === 'slrttanjungbalai' && password === 'SLRTKITO9102') {
            onLoginSuccess('admin', 'slrttanjungbalai', 'ADMINISTRATOR PPKS');
          } else if (roleSelection === 'pendata' && (username.trim().toLowerCase() === 'fasilitator slrt' || username.trim().toLowerCase() === 'fasilitatorslrt') && password === 'FS2026') {
            onLoginSuccess('pendata', 'fasilitator slrt', 'FASILITATOR SLRT');
          } else if (roleSelection === 'pendata' && username.trim().toLowerCase() === 'pendata' && password === 'FS2026') {
            onLoginSuccess('pendata', 'pendata', 'PETUGAS LAPANGAN');
          } else {
            setError('Sandi Pengaman atau Username salah!');
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      
      // Fallback check: see if we can find them in local cached storage first!
      try {
        const offlineUsersJson = localStorage.getItem('dtsen_offline_users');
        const offlineUsers = offlineUsersJson ? JSON.parse(offlineUsersJson) : {};
        const localUser = offlineUsers[username.trim().toLowerCase()];
        
        if (localUser && localUser.password === password) {
          if (localUser.role !== roleSelection) {
            setError(`Akun lokal terdaftar sebagai ${localUser.role === 'admin' ? 'Admin' : 'Pendata'}!`);
            setIsLoading(false);
            return;
          }
          if (localUser.role === 'pendata' && localUser.isApproved === false) {
            setError('Akses Ditangguhkan: Akun lokal Anda belum disetujui oleh Administrator.');
            setIsLoading(false);
            return;
          }
          onLoginSuccess(localUser.role, localUser.username, localUser.fullname);
          return;
        }
      } catch (cacheErr) {
        console.warn("Unable to perform offline local cache fallback:", cacheErr);
      }

      setError('Koneksi terganggu atau kuota habis. Menggunakan bypass offline...');
      // Bypass offline for fast demo / recovery
      if (roleSelection === 'admin' && username.trim().toLowerCase() === 'slrttanjungbalai' && password === 'SLRTKITO9102') {
        onLoginSuccess('admin', 'slrttanjungbalai', 'ADMINISTRATOR PPKS');
      } else if (roleSelection === 'pendata' && (username.trim().toLowerCase() === 'fasilitator slrt' || username.trim().toLowerCase() === 'fasilitatorslrt') && password === 'FS2026') {
        onLoginSuccess('pendata', 'fasilitator slrt', 'FASILITATOR SLRT');
      } else if (roleSelection === 'pendata' && username.trim().toLowerCase() === 'pendata' && password === 'FS2026') {
        onLoginSuccess('pendata', 'pendata', 'PETUGAS LAPANGAN');
      } else {
        setError('Keamanan Sensus: Gagal menghubungi database cloud. Gunakan Akun Lapangan Default -> Username: "fasilitator slrt" | Sandi: "FS2026"');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const formattedUsername = regUsername.trim().toLowerCase();
    
    if (!formattedUsername) {
      setError('Username / NIK wajib diisi!');
      return;
    }
    if (!regFullname.trim()) {
      setError('Nama Lengkap Pendata wajib diisi!');
      return;
    }
    if (!regPassword) {
      setError('Sandi Pengaman baru wajib diisi!');
      return;
    }

    setIsLoading(true);
    try {
      const newUser = {
        username: formattedUsername,
        fullname: regFullname.trim(),
        password: regPassword,
        role: roleSelection,
        isApproved: roleSelection === 'admin',
        current_step: 0,
        draft_data: null,
        created_at: new Date().toISOString()
      };

      if (isFirebaseConfigured) {
        // Check if username/NIK already registered
        const existingUser = await fetchUserFromFirestore(formattedUsername);
        if (existingUser) {
          setError(`Username / NIK "${regUsername}" sudah terdaftar dalam sistem cloud!`);
          setIsLoading(false);
          return;
        }

        const successSave = await saveUserToFirestore(formattedUsername, newUser);
        if (successSave) {
          if (roleSelection === 'pendata') {
            setSuccess(`Registrasi Berhasil! Akun Petugas Pendata Anda saat ini MENUNGGU PERSETUJUAN dari Administrator (SLRTTANJUNGBALAI) sebelum dapat masuk.`);
          } else {
            setSuccess(`Pendaftaran Akun Administrator Sukses di Cloud! Silakan masuk.`);
          }
          setActiveTab('login');
          setUsername(regUsername);
          setPassword(regPassword);
        } else {
          setError('Gagal menyimpan pendaftaran ke Cloud Firestore.');
        }
      } else {
        // Local Mode database
        const offlineUsersJson = localStorage.getItem('dtsen_offline_users');
        const offlineUsers = offlineUsersJson ? JSON.parse(offlineUsersJson) : {};
        
        if (offlineUsers[formattedUsername]) {
          setError('NIK/Username sudah terdaftar lokal!');
          setIsLoading(false);
          return;
        }

        offlineUsers[formattedUsername] = newUser;
        localStorage.setItem('dtsen_offline_users', JSON.stringify(offlineUsers));
        if (roleSelection === 'pendata') {
          setSuccess('Registrasi Berhasil! Akun Petugas saat ini MENUNGGU PERSETUJUAN offline dari Administrator (SLRTTANJUNGBALAI).');
        } else {
          setSuccess('Pendaftaran Akun Offline Sukses! Silakan masuk.');
        }
        setActiveTab('login');
        setUsername(regUsername);
        setPassword(regPassword);
      }
    } catch (err: any) {
      console.error("Register Error details:", err);
      let errorMsg = 'Gagal memproses pendaftaran akun.';
      if (err && err.message) {
        try {
          const parsed = JSON.parse(err.message);
          if (parsed && parsed.error) {
            errorMsg = `Gagal menyimpan pendaftaran ke Cloud: ${parsed.error}`;
          } else {
            errorMsg = `Gagal menyimpan pendaftaran: ${err.message}`;
          }
        } catch (e) {
          errorMsg = `Gagal menyimpan pendaftaran ke Cloud: ${err.message}`;
        }
      }
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100/80 p-4 sm:p-6 lg:p-8 font-sans w-full">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden transform transition-all">
        {/* Header Banner */}
        <div className="bg-indigo-900 p-8 text-center text-white relative">
          <div className="absolute top-4 left-4 flex items-center gap-1.5 opacity-40 text-[10px] tracking-wider uppercase font-bold">
            <Lock className="h-3 w-3" />
            Secure Portal
          </div>
          <span className="absolute top-4 right-4 text-[9px] font-bold tracking-wider select-none font-mono">
            {quotaExceeded ? (
              <span className="bg-amber-500/30 text-amber-300 border border-amber-400/20 px-2 py-0.5 rounded-full">
                ⚠️ CLOUD QUOTA EXCEEDED (LOCAL MODE)
              </span>
            ) : isFirebaseConfigured ? (
              <span className="bg-emerald-500/30 text-emerald-300 border border-emerald-400/20 px-2 py-0.5 rounded-full">
                🟢 CLOUD SYNC ACTIVE
              </span>
            ) : (
              <span className="bg-rose-500/30 text-rose-300 border border-rose-400/20 px-2 py-0.5 rounded-full">
                🔴 LOCAL OFFLINE MODE
              </span>
            )}
          </span>
          
          <div className="mx-auto w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-xs mb-4">
            <HeartHandshake className="h-9 w-9 text-indigo-200 animate-pulse" />
          </div>

          <h2 className="text-xl font-extrabold tracking-tight">SENSUS INDUK DTSEN</h2>
          <p className="text-xs text-indigo-200/90 mt-1 max-w-xs mx-auto">
            Sistem Informasi Sosiografis &amp; Kesejahteraan Ekonomi Terpadu Pemkot Tanjungbalai
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 bg-slate-50/50">
          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
              setError(null);
              setSuccess(null);
            }}
            className={`flex-1 py-3 text-center text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'login'
                ? 'bg-white border-b-2 border-indigo-600 text-indigo-900 border-t border-t-slate-100 shadow-xs'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/30'
            }`}
          >
            <LogIn className="h-3.5 w-3.5" />
            Masuk Akun
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('register');
              setError(null);
              setSuccess(null);
            }}
            className={`flex-1 py-3 text-center text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'register'
                ? 'bg-white border-b-2 border-indigo-600 text-indigo-900 border-t border-t-slate-100 shadow-xs'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/30'
            }`}
          >
            <UserPlus className="h-3.5 w-3.5" />
            Daftar Akun Baru
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-8 space-y-5">
          {quotaExceeded && (
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 text-amber-800 rounded-2xl text-[11px] leading-relaxed flex items-start gap-2.5 animate-pulse-subtle">
              <AlertCircle className="h-4.5 w-4.5 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <span className="font-bold block text-amber-900">Mode Lokal Aktif (Kuota Cloud Terlampaui)</span>
                Sensus cloud sedang melebihi batas kuota gratis harian. 
                Sistem telah beralih sepenuhnya ke **Penyimpanan Lokal (Offline)**. Anda tetap bisa Masuk/Daftar Akun dan mendata dengan aman secara lokal di perangkat ini!
              </div>
            </div>
          )}
          {/* Role Choice */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
              PILIH AKSES OTORITAS
            </label>
            <div className="grid grid-cols-2 gap-2">
              {/* Option Pendata */}
              <button
                type="button"
                onClick={() => {
                  setRoleSelection('pendata');
                  setError(null);
                }}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  roleSelection === 'pendata' 
                    ? 'border-indigo-600 bg-indigo-50/40 text-indigo-900 shadow-xs' 
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <UserCheck className={`h-4.5 w-4.5 mb-1.5 ${roleSelection === 'pendata' ? 'text-indigo-600' : 'text-slate-400'}`} />
                <div>
                  <p className="text-[11px] font-bold">Petugas Pendata</p>
                  <p className="text-[9px] opacity-75">Akses Lapangan</p>
                </div>
              </button>

              {/* Option Admin */}
              <button
                type="button"
                onClick={() => {
                  setRoleSelection('admin');
                  setError(null);
                }}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  roleSelection === 'admin' 
                    ? 'border-indigo-600 bg-indigo-50/40 text-indigo-900 shadow-xs' 
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <Shield className={`h-4.5 w-4.5 mb-1.5 ${roleSelection === 'admin' ? 'text-indigo-600' : 'text-slate-400'}`} />
                <div>
                  <p className="text-[11px] font-bold">Administrator</p>
                  <p className="text-[9px] opacity-75">Akses Kontrol Penuh</p>
                </div>
              </button>
            </div>
          </div>

          {activeTab === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Username Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
                  USERNAME / NIK PETUGAS
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan Username atau NIK Sensus"
                  className="w-full text-xs p-3 rounded-xl border border-slate-250 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-hidden transition-all bg-slate-50 text-slate-800"
                />
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
                    SANDI PENGAMAN
                  </label>
                  <span className="text-[9px] text-slate-450 font-mono">
                    {roleSelection === 'admin' ? 'Bypass: SLRTKITO9102' : 'Bypass: FS2026'}
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-slate-400">
                    <KeyRound className="h-4 w-4" />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan sandi akses"
                    className="w-full text-xs p-3 pl-9 pr-9 rounded-xl border border-slate-250 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-hidden transition-all bg-slate-50 text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Error & Success Notification */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl flex items-start gap-2 text-[11px] leading-relaxed">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                  <p className="font-semibold">{error}</p>
                </div>
              )}

              {success && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-start gap-2 text-[11px] leading-relaxed">
                  <Lock className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                  <p className="font-semibold">{success}</p>
                </div>
              )}

              {/* Instructions */}
              <div className="bg-slate-50 border border-slate-150 p-3 rounded-xl text-[10px] text-slate-500 leading-relaxed">
                <p>📍 Sinkronisasi Multi-Perangkat otomatis diaktifkan untuk semua pengguna terdaftar. Anda dapat melanjutkan pengisian formulir draft terakhir dari perangkat manapun setelah masuk.</p>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-indigo-900 hover:bg-indigo-950 text-white font-bold rounded-xl text-xs tracking-wider uppercase transition-all shadow-lg shadow-indigo-900/10 cursor-pointer select-none disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isLoading ? 'Menghubungkan...' : 'Masuk Portal Sensus'}
                <ChevronRight className="h-4 w-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              {/* Reg NIK/Username */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
                  USERNAME / NIK BARU *
                </label>
                <input
                  type="text"
                  required
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  placeholder="Contoh: NIK (16-Digit) atau Nama Unik"
                  className="w-full text-xs p-3 rounded-xl border border-slate-250 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-hidden transition-all bg-slate-50 text-slate-800"
                />
              </div>

              {/* Reg Full name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
                  NAMA LENGKAP PENDATA *
                </label>
                <input
                  type="text"
                  required
                  value={regFullname}
                  onChange={(e) => setRegFullname(e.target.value)}
                  placeholder="Contoh: Ahmad Hermawan, S.Sos"
                  className="w-full text-xs p-3 rounded-xl border border-slate-250 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-hidden transition-all bg-slate-50 text-slate-800"
                />
              </div>

              {/* Reg Password */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
                  KATA SANDI PENGAMAN BARU *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-slate-400">
                    <KeyRound className="h-4 w-4" />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Buat sandi masuk yang aman"
                    className="w-full text-xs p-3 pl-9 pr-9 rounded-xl border border-slate-250 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-hidden transition-all bg-slate-50 text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Notification */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl flex items-start gap-2 text-[11px] leading-relaxed animate-fade-in">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                  <p className="font-semibold">{error}</p>
                </div>
              )}

              {/* Submit Reg */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs tracking-wider uppercase transition-all shadow-lg shadow-emerald-700/10 cursor-pointer select-none disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isLoading ? 'Mendaftarkan...' : 'Daftarkan Akun Sensus'}
                <UserCheck className="h-4 w-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
