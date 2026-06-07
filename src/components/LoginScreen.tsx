import React, { useState } from 'react';
import { Shield, UserCheck, KeyRound, AlertCircle, Eye, EyeOff, Lock, HeartHandshake } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: (role: 'admin' | 'pendata') => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [roleSelection, setRoleSelection] = useState<'admin' | 'pendata'>('pendata');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (roleSelection === 'admin') {
      if (password === 'SLRTKITO9102') {
        onLoginSuccess('admin');
      } else {
        setError('Sandi Administrator tidak valid!');
      }
    } else if (roleSelection === 'pendata') {
      if (password === 'FS2026') {
        onLoginSuccess('pendata');
      } else {
        setError('Sandi Petugas Pendata tidak valid!');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100/80 p-4 sm:p-6 lg:p-8 font-sans">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden transform transition-all">
        {/* Header Banner */}
        <div className="bg-indigo-900 p-8 text-center text-white relative">
          <div className="absolute top-4 left-4 flex items-center gap-1.5 opacity-40 text-[10px] tracking-wider uppercase font-bold">
            <Lock className="h-3 w-3" />
            Secure Portal
          </div>
          
          <div className="mx-auto w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-xs mb-4">
            <HeartHandshake className="h-9 w-9 text-indigo-200 animate-pulse" />
          </div>

          <h2 className="text-xl font-extrabold tracking-tight">SENSUS INDUK DTSEN</h2>
          <p className="text-xs text-indigo-200/90 mt-1 max-w-xs mx-auto">
            Sistem Informasi Sosiografis &amp; Kesejahteraan Ekonomi Terpadu Pemkot Tanjungbalai
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          
          {/* Role Choice */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block">
              Pilih Akses Masuk
            </label>
            <div className="grid grid-cols-2 gap-2">
              {/* Option Pendata */}
              <button
                type="button"
                onClick={() => {
                  setRoleSelection('pendata');
                  setPassword('');
                  setError(null);
                }}
                className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  roleSelection === 'pendata' 
                    ? 'border-indigo-600 bg-indigo-50/40 text-indigo-900 shadow-xs' 
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <UserCheck className={`h-5 w-5 mb-2 ${roleSelection === 'pendata' ? 'text-indigo-600' : 'text-slate-400'}`} />
                <div>
                  <p className="text-xs font-bold">Petugas Pendata</p>
                  <p className="text-[10px] opacity-75 mt-0.5">Akses Lapangan</p>
                </div>
              </button>

              {/* Option Admin */}
              <button
                type="button"
                onClick={() => {
                  setRoleSelection('admin');
                  setPassword('');
                  setError(null);
                }}
                className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  roleSelection === 'admin' 
                    ? 'border-indigo-600 bg-indigo-50/40 text-indigo-900 shadow-xs' 
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <Shield className={`h-5 w-5 mb-2 ${roleSelection === 'admin' ? 'text-indigo-600' : 'text-slate-400'}`} />
                <div>
                  <p className="text-xs font-bold">Administrator</p>
                  <p className="text-[10px] opacity-75 mt-0.5">Akses Kontrol Penuh</p>
                </div>
              </button>
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label 
                htmlFor="login-password"
                className="text-xs font-bold text-slate-500 uppercase tracking-widest"
              >
                Sandi Pengaman
              </label>
              <span className="text-[10px] text-slate-400 font-mono">
                {roleSelection === 'admin' ? 'SLRTKITO***' : 'FS202***'}
              </span>
            </div>
            
            <div className="relative">
              <span className="absolute left-3.5 top-3.5 text-slate-400">
                <KeyRound className="h-4 w-4" />
              </span>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="--- Masukkan kata sandi ---"
                className="w-full text-xs p-3.5 pl-10 pr-10 rounded-xl border border-slate-200 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-hidden transition-all bg-slate-50 font-mono tracking-widest text-slate-800"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl flex items-start gap-2 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
              <p className="font-semibold leading-relaxed">{error}</p>
            </div>
          )}

          {/* Tips block */}
          <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl text-[10.5px] text-slate-500 leading-relaxed">
            {roleSelection === 'admin' ? (
              <p>🔑 Masuk sebagai <strong>Admin</strong> untuk mengunduh laporan CSV lengkap, menganalisis koordinat spasial, menyinkronkan ke Cloud Google Sheets, dan memelihara data.</p>
            ) : (
              <p>📝 Masuk sebagai <strong>Pendata</strong> untuk mencatat data baru secara dinamis di lapangan. Demi keamanan data primer, database histori disembunyikan/tidak terlihat dari akun pendata.</p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full py-3.5 px-4 bg-indigo-900 hover:bg-indigo-950 text-white font-bold rounded-xl text-xs tracking-wider uppercase transition-colors shadow-lg shadow-indigo-900/10 cursor-pointer select-none"
          >
            Masuk Portal Sensus
          </button>
        </form>
      </div>
    </div>
  );
}
