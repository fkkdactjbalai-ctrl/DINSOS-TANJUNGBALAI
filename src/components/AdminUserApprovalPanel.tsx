import React, { useState, useEffect } from 'react';
import { Users, Check, Trash2, Search, ShieldAlert, BadgeInfo, Sparkles, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { fetchAllUsersFromFirestore, saveUserToFirestore, deleteUserFromFirestore } from '../utils/syncService';

interface AdminUserApprovalPanelProps {
  onShowToast: (text: string, type: 'success' | 'info' | 'danger') => void;
  currentUser: string;
}

export default function AdminUserApprovalPanel({ onShowToast, currentUser }: AdminUserApprovalPanelProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [revealedPasswords, setRevealedPasswords] = useState<{ [key: string]: boolean }>({});

  const loadUsers = async () => {
    setLoading(true);
    try {
      const allUsers = await fetchAllUsersFromFirestore();
      // Sort users: Pending first, then newest registered
      const sorted = [...allUsers].sort((a, b) => {
        if (a.isApproved === b.isApproved) {
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        }
        return a.isApproved ? 1 : -1;
      });
      setUsers(sorted);
    } catch (err) {
      console.error(err);
      onShowToast('Gagal memuat database akun petugas.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleApprove = async (username: string, userObj: any) => {
    try {
      // Update local storage and firestore
      const updatedUser = { ...userObj, isApproved: true };
      const success = await saveUserToFirestore(username, updatedUser);
      if (success) {
        onShowToast(`Akun Petugas "${userObj.fullname || username}" telah disetujui!`, 'success');
        loadUsers();
      } else {
        onShowToast('Gagal memproses persetujuan akun.', 'danger');
      }
    } catch (err) {
      onShowToast('Terjadi kesalahan saat menyetujui akun.', 'danger');
    }
  };

  const handleDelete = async (username: string, name: string) => {
    if (username.toLowerCase() === currentUser.toLowerCase() || username.toLowerCase() === 'slrttanjungbalai') {
      onShowToast('Aksi Ditolak: Anda tidak dapat menghapus akun Anda sendiri!', 'danger');
      return;
    }

    if (!window.confirm(`Apakah Anda yakin ingin menghapus/menolak akun petugas "${name}" (${username})?`)) {
      return;
    }

    try {
      const success = await deleteUserFromFirestore(username);
      if (success) {
        onShowToast(`Akun "${name}" berhasil dihapus dari sistem.`, 'success');
        loadUsers();
      } else {
        onShowToast('Gagal menghapus akun petugas.', 'danger');
      }
    } catch (err) {
      onShowToast('Terjadi kesalahan saat menghapus akun.', 'danger');
    }
  };

  const togglePasswordReveal = (username: string) => {
    setRevealedPasswords(prev => ({
      ...prev,
      [username]: !prev[username]
    }));
  };

  const filteredUsers = users.filter(user => {
    const q = searchQuery.toLowerCase();
    const isMatched = (user.username || '').toLowerCase().includes(q) || 
                      (user.fullname || '').toLowerCase().includes(q) ||
                      (user.role || '').toLowerCase().includes(q);
    
    // Do not show the main admin itself if search is empty to keep focus on petugas
    return isMatched;
  });

  const pendingCount = users.filter(u => u.role === 'pendata' && !u.isApproved).length;

  return (
    <div id="admin-user-approval-section" className="bg-white rounded-3xl border border-slate-200/90 shadow-md overflow-hidden transition-all duration-300">
      {/* Panel Header */}
      <div className="p-6 sm:p-8 bg-indigo-950 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white/10 rounded-2xl">
            <Users className="h-6 w-6 text-indigo-300" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold">MANAJEMEN PERSETUJUAN AKUN PETUGAS DATA</h3>
            <p className="text-xs text-indigo-200 mt-0.5">
              Otorisasi pendaftaran dan pantau akses login untuk Petugas Lapangan pembuat kuesioner DTSEN.
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {pendingCount > 0 && (
            <span className="inline-flex items-center gap-1 bg-amber-500/30 text-amber-300 border border-amber-400/20 text-[10px] font-bold px-3 py-1.5 rounded-full select-none animate-pulse">
              <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
              {pendingCount} MENUNGGU PERSETUJUAN
            </span>
          )}
          <button
            type="button"
            onClick={loadUsers}
            disabled={loading}
            className="p-2.5 bg-white/15 hover:bg-white/20 transition-all rounded-xl text-white outline-none cursor-pointer"
            title="Refresh database petugas"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="p-6 sm:p-8 space-y-6">
        {/* Search Bar & Stats */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <span className="absolute left-3.5 top-3 text-slate-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari berdasarkan NIK, Nama, atau Otoritas..."
              className="w-full text-xs p-3 pl-10 rounded-2xl border border-slate-200 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none transition-all bg-slate-50 text-slate-800"
            />
          </div>

          <div className="flex items-center gap-4 text-slate-500 text-[11px] font-medium font-mono">
            <div>Total Terdaftar: <span className="font-bold text-slate-700">{users.length}</span></div>
            <div className="h-3 w-[1px] bg-slate-200" />
            <div>Aktif / Disetujui: <span className="font-bold text-emerald-600">{users.filter(u => u.isApproved).length}</span></div>
          </div>
        </div>

        {/* Table/List */}
        {loading ? (
          <div className="py-12 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
            <RefreshCw className="h-6 w-6 text-indigo-600 animate-spin" />
            <span>Memuat basis data petugas pendata...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center text-slate-450 text-xs">
            <BadgeInfo className="h-8 w-8 mx-auto mb-2 text-slate-300" />
            <p className="font-semibold text-slate-600">Tidak ada akun petugas ditemukan</p>
            <p className="text-[11px] mt-0.5">Silakan ganti kata pencarian atau tunggu pendaftaran baru.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-150">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-50/85 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest border-b border-slate-150">
                  <th className="py-3 px-4">Nama Lengkap &amp; Username/NIK</th>
                  <th className="py-3 px-4">Akses / Otoritas</th>
                  <th className="py-3 px-4">Sandi Akses</th>
                  <th className="py-3 px-4">Tanggal Daftar</th>
                  <th className="py-3 px-4">Status Akun</th>
                  <th className="py-3 px-4 text-center">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredUsers.map((user, idx) => {
                  const isMainAdmin = user.username?.toLowerCase() === 'slrttanjungbalai';
                  const isUserActive = !!user.isApproved;
                  
                  return (
                    <tr 
                      key={user.username || idx} 
                      className={`hover:bg-slate-50/50 transition-colors ${!isUserActive ? 'bg-amber-50/20' : ''}`}
                    >
                      <td className="py-4 px-4">
                        <div className="font-semibold text-slate-800">{user.fullname || 'PETUGAS'}</div>
                        <div className="font-mono text-[10.5px] text-slate-400 mt-0.5">{user.username}</div>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          user.role === 'admin' 
                            ? 'bg-indigo-100 text-indigo-950 font-mono' 
                            : 'bg-emerald-100 text-emerald-950'
                        }`}>
                          {user.role === 'admin' ? '🛡️ Admin' : '📋 Petugas Lapangan'}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-mono text-[11px] whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-500">
                          {revealedPasswords[user.username] ? (
                            <span>{user.password || '●●●●●●'}</span>
                          ) : (
                            <span>••••••</span>
                          )}
                          <button
                            type="button"
                            onClick={() => togglePasswordReveal(user.username)}
                            className="text-slate-400 hover:text-indigo-600 transition-colors p-1"
                            title="Tampilkan sandi"
                          >
                            {revealedPasswords[user.username] ? (
                              <EyeOff className="h-3.5 w-3.5" />
                            ) : (
                              <Eye className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-slate-500 text-[10.5px] whitespace-nowrap">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : '-'}
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        {user.role === 'admin' || isUserActive ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10.5px] px-2.5 py-1 rounded-full font-bold">
                            <Check className="h-3.5 w-3.5" />
                            Aktif / Disetujui
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 text-[10.5px] px-2.5 py-1 rounded-full font-bold animate-pulse">
                            <ShieldAlert className="h-3.5 w-3.5 animate-spin" />
                            Butuh Persetujuan
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          {user.role !== 'admin' && !isUserActive && (
                            <button
                              type="button"
                              onClick={() => handleApprove(user.username, user)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-1 text-[11px] font-semibold transition-all cursor-pointer shadow-xs"
                            >
                              <Check className="h-3 w-3" />
                              Setujui
                            </button>
                          )}
                          
                          {!isMainAdmin && (
                            <button
                              type="button"
                              onClick={() => handleDelete(user.username, user.fullname || user.username)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all rounded-lg cursor-pointer"
                              title="Tolak dan Hapus Akun"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Tips / Information */}
        <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl text-[11px] text-slate-500 leading-relaxed flex gap-2">
          <BadgeInfo className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" />
          <p>
            ℹ️ <b>Sistem Persetujuan Keamanan:</b> Untuk memastikan validitas input, setiap petugas data lapangan dilarang mengakses sistem dan sinkronisasi sebelum akun mereka disetujui secara manual. Administrator dapat melihat pasword cadangan petugas jika terjadi masalah login darurat di lapangan.
          </p>
        </div>
      </div>
    </div>
  );
}
