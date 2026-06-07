import { FileSpreadsheet, Users, Home, TrendingUp, Info } from 'lucide-react';
import { SurveyData } from '../types';

interface HeaderProps {
  surveys: SurveyData[];
}

export default function Header({ surveys }: HeaderProps) {
  // Compute metrics
  const totalKK = surveys.length;
  const totalAnggota = surveys.reduce((acc, curr) => acc + (curr.anggotaKeluarga?.length || 0), 0);
  
  // Count bantuan receivers
  const totalBantuan = surveys.reduce((acc, curr) => {
    const hasBantuan = curr.programBantuan && curr.programBantuan.length > 0 && !curr.programBantuan.includes('Tidak Menerima Program Bantuan');
    return acc + (hasBantuan ? 1 : 0);
  }, 0);

  // Find most active subdistrict
  const kecamantanCounts: Record<string, number> = {};
  surveys.forEach(s => {
    if (s.kecamatan) {
      kecamantanCounts[s.kecamatan] = (kecamantanCounts[s.kecamatan] || 0) + 1;
    }
  });
  let mostActiveKecamatan = '-';
  let maxCount = 0;
  Object.entries(kecamantanCounts).forEach(([kec, count]) => {
    if (count > maxCount) {
      maxCount = count;
      mostActiveKecamatan = kec;
    }
  });

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      {/* Mini top bar in Indigo-900 conforming exactly to geometric balance */}
      <div className="bg-indigo-900 text-white py-3 px-4 sm:px-6 lg:px-8 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-500 rounded flex items-center justify-center font-bold tracking-tight text-white select-none">
            TB
          </div>
          <div>
            <h1 className="font-bold tracking-tight text-sm sm:text-base flex items-center gap-2">
              PENDATAAN DTSEN <span className="font-normal opacity-70 hidden sm:inline">| Kota Tanjungbalai</span>
            </h1>
            <p className="text-[10px] text-indigo-200/80 leading-none">Sistem Pendataan Terpadu Sosiografis &amp; Ekonomi Kependudukan</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="text-right hidden sm:block">
            <p className="text-[9px] opacity-70 leading-none uppercase tracking-widest">Petugas Lapangan</p>
            <p className="text-xs font-semibold text-white">Budi Santoso (ID: 99281)</p>
          </div>
          <div className="h-8 w-8 rounded-full bg-indigo-700 border border-indigo-400 flex items-center justify-center font-bold text-xs">
            BS
          </div>
        </div>
      </div>

      {/* Main Container below Top Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        
        {/* Dashboard quick metrics standard across beautiful government portals */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 transition-all hover:border-indigo-200 hover:shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100">
                <Home className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Terdata KK</p>
                <p id="stat-total-kk" className="text-2xl font-extrabold text-indigo-950">{totalKK}</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 transition-all hover:border-indigo-200 hover:shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Jiwa Terdata</p>
                <p id="stat-total-jiwa" className="text-2xl font-extrabold text-indigo-950">{totalAnggota}</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 transition-all hover:border-indigo-200 hover:shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kecamatan Padat</p>
                <p id="stat-kecamatan-aktif" className="text-lg font-extrabold text-indigo-950 truncate max-w-[120px]">{mostActiveKecamatan}</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 transition-all hover:border-indigo-200 hover:shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Penerima Bansos</p>
                <p id="stat-bansos-receiver" className="text-2xl font-extrabold text-indigo-950">
                  {totalBantuan} <span className="text-xs font-normal text-slate-400">KK</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
