import { useMemo } from 'react';
import { 
  CloudCheck, 
  Sparkles, 
  Users, 
  HelpCircle,
  Database,
  ArrowUpRight,
  TrendingUp,
  FileCheck2
} from 'lucide-react';
import { SurveyData } from '../types';

interface QuickStatsProps {
  surveys: SurveyData[];
}

export default function QuickStats({ surveys }: QuickStatsProps) {
  // 1. Total KK Synced calculation
  const syncStats = useMemo(() => {
    const total = surveys.length;
    const synced = surveys.filter(s => s.synced).length;
    const percentage = total > 0 ? Math.round((synced / total) * 100) : 0;
    return {
      total,
      synced,
      percentage
    };
  }, [surveys]);

  // 2. New KK Today calculation
  const newTodayCount = useMemo(() => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    return surveys.filter(s => {
      if (!s.submittedAt) return false;
      // Extract YYYY-MM-DD from submittedAt
      const datePart = s.submittedAt.split('T')[0];
      return datePart === todayStr;
    }).length;
  }, [surveys]);

  // 3. Average Family Members calculation
  const avgFamilyMembers = useMemo(() => {
    const total = surveys.length;
    if (total === 0) return 0;
    
    const totalMembers = surveys.reduce((sum, s) => {
      const familyCount = s.anggotaKeluarga ? s.anggotaKeluarga.length : 0;
      return sum + familyCount;
    }, 0);
    
    // Round to 1 decimal place
    return Math.round((totalMembers / total) * 10) / 10;
  }, [surveys]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-2 non-printable">
      {/* 1. Total KK Synced Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5 flex flex-col justify-between hover:shadow-md transition-all relative overflow-hidden group">
        <div className="absolute right-0 top-0 h-16 w-16 bg-emerald-50/40 rounded-bl-full flex items-center justify-center transition-all group-hover:bg-emerald-50/70">
          <CloudCheck className="h-6 w-6 text-emerald-600" />
        </div>
        
        <div className="space-y-4">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">Status Sinkronisasi</span>
            <h4 className="text-sm font-extrabold text-slate-800">Total KK Tersinkron</h4>
          </div>
          
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 font-mono tracking-tight">
              {syncStats.synced}
            </span>
            <span className="text-xs font-bold text-slate-400 font-mono">
              / {syncStats.total} KK ({syncStats.percentage}%)
            </span>
          </div>
          
          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${syncStats.percentage}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-sm font-mono">
                {syncStats.total - syncStats.synced} Belum Sinkron
              </span>
              <span className="text-slate-400 font-medium">Sheets Cloud</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. New KK Today Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5 flex flex-col justify-between hover:shadow-md transition-all relative overflow-hidden group">
        <div className="absolute right-0 top-0 h-16 w-16 bg-indigo-50/40 rounded-bl-full flex items-center justify-center transition-all group-hover:bg-indigo-50/70">
          <Sparkles className="h-6 w-6 text-indigo-600 animate-pulse" />
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block font-sans">Hari Ini</span>
            <h4 className="text-sm font-extrabold text-slate-800">KK Baru Hari Ini</h4>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 font-mono tracking-tight">
              {newTodayCount}
            </span>
            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full flex items-center gap-0.5 font-mono">
              <TrendingUp className="h-3 w-3" />
              Sensus Hari Ini
            </span>
          </div>

          <div className="text-[10.5px] text-slate-500 leading-relaxed pt-2 border-t border-slate-150 flex items-center gap-1.5">
            <FileCheck2 className="h-4 w-4 text-slate-400 shrink-0" />
            <span>Entri data PMKS &amp; disabilitas terbaru masuk ke local storage.</span>
          </div>
        </div>
      </div>

      {/* 3. Average Family Members Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5 flex flex-col justify-between hover:shadow-md transition-all relative overflow-hidden group">
        <div className="absolute right-0 top-0 h-16 w-16 bg-amber-50/40 rounded-bl-full flex items-center justify-center transition-all group-hover:bg-amber-50/70">
          <Users className="h-6 w-6 text-amber-600" />
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block font-sans">Kepadatan Rumah Tangga</span>
            <h4 className="text-sm font-extrabold text-slate-800">Rata-rata Anggota Keluarga</h4>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 font-mono tracking-tight">
              {avgFamilyMembers}
            </span>
            <span className="text-xs font-bold text-slate-400">
              orang / KK
            </span>
          </div>

          <div className="text-[10.5px] text-slate-500 leading-relaxed pt-2 border-t border-slate-150 flex items-center gap-1.5">
            <Database className="h-4 w-4 text-slate-400 shrink-0" />
            <span>Rata-rata kepadatan jiwa per keluarga yang di-input di formulir.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
