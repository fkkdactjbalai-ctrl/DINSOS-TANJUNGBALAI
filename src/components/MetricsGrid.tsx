import { FileSpreadsheet, Users, Home, TrendingUp } from 'lucide-react';
import { SurveyData } from '../types';

interface MetricsGridProps {
  surveys: SurveyData[];
}

export default function MetricsGrid({ surveys }: MetricsGridProps) {
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
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
      <div className="bg-white rounded-2xl p-4 border border-slate-200 transition-all hover:border-indigo-200 hover:shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100">
            <Home className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Terdata KK</p>
            <p id="stat-total-kk" className="text-xl sm:text-2xl font-black text-indigo-950">{totalKK}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-slate-200 transition-all hover:border-indigo-200 hover:shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Jiwa Terdata</p>
            <p id="stat-total-jiwa" className="text-xl sm:text-2xl font-black text-indigo-950">{totalAnggota}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-slate-200 transition-all hover:border-indigo-200 hover:shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kecamatan Padat</p>
            <p id="stat-kecamatan-aktif" className="text-sm sm:text-base font-black text-indigo-950 truncate" title={mostActiveKecamatan}>{mostActiveKecamatan}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-slate-200 transition-all hover:border-indigo-200 hover:shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Penerima Bansos</p>
            <p id="stat-bansos-receiver" className="text-xl sm:text-2xl font-black text-indigo-950">
              {totalBantuan} <span className="text-xs font-normal text-slate-400">KK</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
