import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Calendar, 
  Printer, 
  FileSpreadsheet, 
  TrendingUp, 
  Users, 
  Home, 
  Activity, 
  AlertTriangle,
  Award,
  CircleDot,
  Briefcase,
  Layers,
  Sparkles,
  Info,
  ExternalLink,
  ChevronRight,
  UserCheck
} from 'lucide-react';
import { SurveyData, FamilyMember } from '../types';

interface MonthlyReportPanelProps {
  surveys: SurveyData[];
  onViewSurvey: (survey: SurveyData) => void;
  userRole: 'admin' | 'pendata' | null;
}

export default function MonthlyReportPanel({ surveys, onViewSurvey, userRole }: MonthlyReportPanelProps) {
  // Current date for default selection (Local time metadata: July 2026)
  const [selectedMonth, setSelectedMonth] = useState<number>(() => {
    const params = new URLSearchParams(window.location.search);
    const m = params.get('month');
    return m ? Number(m) : 7; // July default
  });
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    const params = new URLSearchParams(window.location.search);
    const y = params.get('year');
    return y ? Number(y) : 2026; // 2026 default
  });

  const [autoPrintOnSelect, setAutoPrintOnSelect] = useState<boolean>(false);
  const isFirstRender = useRef<boolean>(true);

  const [showIframePrintAlert, setShowIframePrintAlert] = useState(false);

  const monthOptions = [
    { value: 1, label: 'Januari' },
    { value: 2, label: 'Februari' },
    { value: 3, label: 'Maret' },
    { value: 4, label: 'April' },
    { value: 5, label: 'Mei' },
    { value: 6, label: 'Juni' },
    { value: 7, label: 'Juli' },
    { value: 8, label: 'Agustus' },
    { value: 9, label: 'September' },
    { value: 10, label: 'Oktober' },
    { value: 11, label: 'November' },
    { value: 12, label: 'Desember' }
  ];

  const yearOptions = useMemo(() => {
    const years = new Set<number>([2025, 2026, 2027]);
    surveys.forEach(s => {
      if (s.submittedAt) {
        const y = new Date(s.submittedAt).getFullYear();
        if (!isNaN(y)) years.add(y);
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [surveys]);

  // Filter surveys based on selected month and year
  const monthlySurveys = useMemo(() => {
    return surveys.filter(s => {
      if (!s.submittedAt) return false;
      const d = new Date(s.submittedAt);
      return d.getFullYear() === selectedYear && (d.getMonth() + 1) === selectedMonth;
    });
  }, [surveys, selectedMonth, selectedYear]);

  // Compute stats for the selected month
  const stats = useMemo(() => {
    const totalKK = monthlySurveys.length;
    let totalJiwa = 0;
    let totalMale = 0;
    let totalFemale = 0;
    let totalPMKS = 0;
    let totalBantuan = 0;
    let totalUsulanBaru = 0;
    let totalIncome = 0;
    let totalWorking = 0;
    let hasUsaha = 0;

    // Age categories
    let ageBalita = 0; // 0-4
    let ageAnak = 0; // 5-11
    let ageRemaja = 0; // 12-25
    let ageDewasa = 0; // 26-59
    let ageLansia = 0; // >= 60

    // PMKS counts per category
    const pmksCategories: Record<string, number> = {};

    monthlySurveys.forEach(s => {
      if (s.statusPendataan === 'Usulan Baru') {
        totalUsulanBaru++;
      }

      // Social assistance programs check
      const hasAssistance = s.programBantuan && s.programBantuan.length > 0 && !s.programBantuan.includes('Tidak Menerima Program Bantuan');
      if (hasAssistance) {
        totalBantuan++;
      }

      const members = s.anggotaKeluarga || [];
      totalJiwa += members.length;

      members.forEach((m: FamilyMember) => {
        // Gender
        if (m.jenisKelamin === 'Laki-laki') totalMale++;
        else if (m.jenisKelamin === 'Perempuan') totalFemale++;

        // PMKS
        if (m.isPmks === 'Ya') {
          totalPMKS++;
          if (m.pmksKategori && Array.from(m.pmksKategori).length > 0) {
            m.pmksKategori.forEach(cat => {
              pmksCategories[cat] = (pmksCategories[cat] || 0) + 1;
            });
          }
        }

        // Employment & Income
        if (m.apakahBekerja === 'Ya') {
          totalWorking++;
        }
        if (m.penghasilanBulanan) {
          totalIncome += Number(m.penghasilanBulanan);
        }
        if (m.memilikiUsaha === 'Ya') {
          hasUsaha++;
        }

        // Age group
        const age = Number(m.umur) || 0;
        if (age <= 4) ageBalita++;
        else if (age <= 11) ageAnak++;
        else if (age <= 25) ageRemaja++;
        else if (age <= 59) ageDewasa++;
        else ageLansia++;
      });
    });

    const averageIncome = totalKK > 0 ? Math.round(totalIncome / totalKK) : 0;

    return {
      totalKK,
      totalJiwa,
      totalMale,
      totalFemale,
      totalPMKS,
      totalBantuan,
      totalUsulanBaru,
      averageIncome,
      totalWorking,
      hasUsaha,
      ageBalita,
      ageAnak,
      ageRemaja,
      ageDewasa,
      ageLansia,
      pmksCategories: Object.entries(pmksCategories).sort((a, b) => b[1] - a[1]).slice(0, 4)
    };
  }, [monthlySurveys]);

  // Village (Kelurahan) breakdown for the selected month
  const kelurahanBreakdown = useMemo(() => {
    const breakdown: Record<string, {
      kkCount: number;
      jiwaCount: number;
      maleCount: number;
      femaleCount: number;
      pmksCount: number;
      usulanCount: number;
    }> = {};

    monthlySurveys.forEach(s => {
      const kel = s.kelurahan || 'Lainnya';
      if (!breakdown[kel]) {
        breakdown[kel] = {
          kkCount: 0,
          jiwaCount: 0,
          maleCount: 0,
          femaleCount: 0,
          pmksCount: 0,
          usulanCount: 0
        };
      }

      breakdown[kel].kkCount++;
      if (s.statusPendataan === 'Usulan Baru') {
        breakdown[kel].usulanCount++;
      }

      const members = s.anggotaKeluarga || [];
      breakdown[kel].jiwaCount += members.length;

      members.forEach(m => {
        if (m.jenisKelamin === 'Laki-laki') breakdown[kel].maleCount++;
        else if (m.jenisKelamin === 'Perempuan') breakdown[kel].femaleCount++;

        if (m.isPmks === 'Ya') breakdown[kel].pmksCount++;
      });
    });

    return Object.entries(breakdown).map(([name, data]) => ({
      name,
      ...data
    })).sort((a, b) => b.kkCount - a.kkCount);
  }, [monthlySurveys]);

  // Triggers print action
  const handlePrintReport = () => {
    const isIframe = window.self !== window.top;
    if (isIframe) {
      setShowIframePrintAlert(true);
    } else {
      window.print();
    }
  };

  // Automatically trigger printing when selecting a new month or year if auto-print is enabled
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (autoPrintOnSelect) {
      const timer = setTimeout(() => {
        handlePrintReport();
      }, 500); // 500ms delay to let calculations and tables update and render fully
      return () => clearTimeout(timer);
    }
  }, [selectedMonth, selectedYear, autoPrintOnSelect]);

  // Export monthly aggregates & lists to a downloadable CSV
  const handleExportCSV = () => {
    if (monthlySurveys.length === 0) {
      alert('Tidak ada data untuk bulan terpilih untuk diekspor.');
      return;
    }

    const monthName = monthOptions.find(m => m.value === selectedMonth)?.label || 'Bulan';
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Header Info
    csvContent += `LAPORAN BULANAN SENSUS KELUARGA - ${monthName.toUpperCase()} ${selectedYear}\n`;
    csvContent += `Pemerintah Kota Tanjungbalai - Dinas Sosial dan Kependudukan\n\n`;

    // Summary Section
    csvContent += `RINGKASAN BULANAN\n`;
    csvContent += `Total KK Terdata,${stats.totalKK}\n`;
    csvContent += `Total Jiwa Terdata,${stats.totalJiwa}\n`;
    csvContent += `Laki-laki,${stats.totalMale}\n`;
    csvContent += `Perempuan,${stats.totalFemale}\n`;
    csvContent += `Jiwa PMKS,${stats.totalPMKS}\n`;
    csvContent += `Keluarga Penerima Bantuan Sosial,${stats.totalBantuan}\n`;
    csvContent += `Jumlah Usulan Baru,${stats.totalUsulanBaru}\n`;
    csvContent += `Rata-rata Pendapatan Keluarga (Rp),${stats.averageIncome}\n\n`;

    // Kelurahan Breakdown Table
    csvContent += `SEBARAN DATA PER KELURAHAN\n`;
    csvContent += `Kelurahan,Jumlah KK,Jumlah Jiwa,Laki-laki,Perempuan,Jiwa PMKS,Usulan Baru\n`;
    kelurahanBreakdown.forEach(k => {
      csvContent += `"${k.name}",${k.kkCount},${k.jiwaCount},${k.maleCount},${k.femaleCount},${k.pmksCount},${k.usulanCount}\n`;
    });
    csvContent += `\n`;

    // Detailed List
    csvContent += `DAFTAR RINCIAN DATA SENSUS BULAN INI\n`;
    csvContent += `No,Tanggal Sensus,No KK,Nama Responden,Alamat,Kelurahan,Jumlah Jiwa,Status PMKS,Usulan Baru,Status Sinkronisasi\n`;
    monthlySurveys.forEach((s, idx) => {
      const submittedDate = s.submittedAt ? new Date(s.submittedAt).toLocaleDateString('id-ID') : '-';
      const hasPmksStr = (s.anggotaKeluarga || []).some(m => m.isPmks === 'Ya') ? 'Ada PMKS' : 'Tidak Ada';
      const isPriority = s.statusPendataan === 'Usulan Baru' ? 'Ya' : 'Tidak';
      const isSyncedStr = s.synced ? 'Sudah Sinkron' : 'Belum Sinkron';
      csvContent += `${idx + 1},${submittedDate},'${s.noKK},"${s.namaResponden}","${s.alamat || ''}","${s.kelurahan || ''}",${s.anggotaKeluarga?.length || 0},"${hasPmksStr}","${isPriority}","${isSyncedStr}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Laporan_Sensus_${monthName}_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const currentMonthLabel = monthOptions.find(m => m.value === selectedMonth)?.label || '';

  return (
    <div id="monthly-report-section" className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6 transition-all hover:shadow-md">
      
      {/* Report Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 non-printable">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg">
              <Calendar className="h-5 w-5" />
            </span>
            <h2 className="text-lg font-black text-slate-800">Format Laporan Bulanan Sensus</h2>
          </div>
          <p className="text-xs text-slate-500">Agregasi, analisis parameter, sebaran kelurahan, dan cetak dokumen resmi bulanan.</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          <select 
            id="report-month-select"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="py-1.5 px-3 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            {monthOptions.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>

          <select 
            id="report-year-select"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="py-1.5 px-3 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            {yearOptions.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <button
            type="button"
            id="btn-toggle-auto-print"
            onClick={() => setAutoPrintOnSelect(!autoPrintOnSelect)}
            className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer border ${
              autoPrintOnSelect
                ? 'bg-amber-500/10 border-amber-300 text-amber-800 hover:bg-amber-500/20'
                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${autoPrintOnSelect ? 'bg-amber-500 animate-pulse' : 'bg-slate-300'}`} />
            Cetak Otomatis: <span className={autoPrintOnSelect ? 'text-amber-600 font-extrabold' : 'text-slate-400 font-normal'}>{autoPrintOnSelect ? 'AKTIF' : 'NON-AKTIF'}</span>
          </button>

          <button
            type="button"
            id="btn-print-report"
            onClick={handlePrintReport}
            className="py-1.5 px-3 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5 text-slate-500" />
            Cetak Laporan
          </button>

          <button
            type="button"
            id="btn-export-report-csv"
            onClick={handleExportCSV}
            className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Ekspor CSV
          </button>
        </div>
      </div>

      {/* FORMAL GOVERNMENT PRINT HEADER (Visible ONLY during print) */}
      <div className="hidden print:block text-center border-b-2 border-double border-slate-900 pb-4 mb-6">
        <h1 className="text-sm font-extrabold uppercase tracking-widest text-slate-900">Pemerintah Kota Tanjungbalai</h1>
        <h2 className="text-base font-black uppercase text-slate-900">Dinas Sosial dan Kependudukan</h2>
        <p className="text-[10px] text-slate-500 italic mt-0.5">Sekretariat Bersama Sensus Pendataan Terpadu DTSEN • Jl. Jenderal Sudirman No. 10 Tanjungbalai</p>
        <div className="text-xs font-bold uppercase tracking-wider bg-slate-100 py-1.5 mt-3 border border-slate-300">
          Laporan Bulanan Rekap Sensus Keluarga — {currentMonthLabel} {selectedYear}
        </div>
        <p className="text-[9px] text-slate-500 text-right mt-1.5 font-mono">Tanggal Cetak: {new Date().toLocaleDateString('id-ID')} {new Date().toLocaleTimeString('id-ID')}</p>
      </div>

      {/* Content Area */}
      {monthlySurveys.length === 0 ? (
        <div className="py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-3">
          <Calendar className="h-10 w-10 text-slate-300 mx-auto" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-slate-700">Data Kosong Pada Bulan Terpilih</h4>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">Tidak ada survei sensus KK yang terekam atau diserahkan selama bulan {currentMonthLabel} {selectedYear}.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Section A: Monthly Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* KK Surveyed */}
            <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex items-center gap-3">
              <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100 shrink-0">
                <Home className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">KK Terdata Baru</p>
                <p className="text-lg font-black text-indigo-950">{stats.totalKK} KK</p>
              </div>
            </div>

            {/* Total Soul */}
            <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex items-center gap-3">
              <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 shrink-0">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Jiwa Terdata</p>
                <p className="text-lg font-black text-indigo-950">
                  {stats.totalJiwa} Jiwa 
                  <span className="text-[9px] font-normal text-slate-400 block font-mono">L: {stats.totalMale} | P: {stats.totalFemale}</span>
                </p>
              </div>
            </div>

            {/* PMKS Souls */}
            <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex items-center gap-3">
              <div className="p-2.5 bg-rose-50 text-rose-700 rounded-xl border border-rose-100 shrink-0">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Jiwa Penyandang PMKS</p>
                <p className="text-lg font-black text-rose-950">{stats.totalPMKS} Jiwa</p>
              </div>
            </div>

            {/* Usulan Baru */}
            <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex items-center gap-3">
              <div className="p-2.5 bg-purple-50 text-purple-700 rounded-xl border border-purple-100 shrink-0">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Prioritas Usulan Baru</p>
                <p className="text-lg font-black text-indigo-950">{stats.totalUsulanBaru} KK</p>
              </div>
            </div>

          </div>

          {/* Section B: Grid and Detailed Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Table 1: Kelurahan Breakdown */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                <Layers className="h-4 w-4 text-slate-500 shrink-0" />
                <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Sebaran Kelurahan Bulan Ini</h3>
              </div>
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                      <th className="py-2 px-2.5">Kelurahan</th>
                      <th className="py-2 px-2.5 text-center">KK</th>
                      <th className="py-2 px-2.5 text-center">Total Jiwa</th>
                      <th className="py-2 px-2.5 text-center">P / L</th>
                      <th className="py-2 px-2.5 text-center text-rose-600">PMKS</th>
                      <th className="py-2 px-2.5 text-center text-indigo-600">Usulan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {kelurahanBreakdown.map((k) => (
                      <tr key={k.name} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-2 px-2.5 font-semibold text-slate-800">{k.name}</td>
                        <td className="py-2 px-2.5 text-center font-bold text-slate-700">{k.kkCount}</td>
                        <td className="py-2 px-2.5 text-center font-mono text-slate-500">{k.jiwaCount}</td>
                        <td className="py-2 px-2.5 text-center text-slate-400 font-mono">{k.femaleCount}P / {k.maleCount}L</td>
                        <td className="py-2 px-2.5 text-center font-bold text-rose-600">{k.pmksCount || '-'}</td>
                        <td className="py-2 px-2.5 text-center font-bold text-indigo-600">{k.usulanCount || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Table 2: Age & Social Breakdown */}
            <div className="space-y-4">
              
              {/* Demography Analysis */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                  <Activity className="h-4 w-4 text-slate-500 shrink-0" />
                  <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Struktur Kelompok Umur</h3>
                </div>
                
                <div className="grid grid-cols-5 gap-2 text-center text-[10px]">
                  <div className="p-2 bg-indigo-50/50 rounded-xl border border-indigo-100/30">
                    <p className="font-bold text-indigo-800">Balita</p>
                    <p className="text-[8px] text-slate-400">0 - 4 Thn</p>
                    <p className="text-sm font-black text-indigo-950 mt-1">{stats.ageBalita}</p>
                  </div>
                  <div className="p-2 bg-sky-50/50 rounded-xl border border-sky-100/30">
                    <p className="font-bold text-sky-800">Anak-anak</p>
                    <p className="text-[8px] text-slate-400">5 - 11 Thn</p>
                    <p className="text-sm font-black text-indigo-950 mt-1">{stats.ageAnak}</p>
                  </div>
                  <div className="p-2 bg-emerald-50/50 rounded-xl border border-emerald-100/30">
                    <p className="font-bold text-emerald-800">Remaja</p>
                    <p className="text-[8px] text-slate-400">12 - 25 Thn</p>
                    <p className="text-sm font-black text-indigo-950 mt-1">{stats.ageRemaja}</p>
                  </div>
                  <div className="p-2 bg-amber-50/50 rounded-xl border border-amber-100/30">
                    <p className="font-bold text-amber-800">Dewasa</p>
                    <p className="text-[8px] text-slate-400">26 - 59 Thn</p>
                    <p className="text-sm font-black text-indigo-950 mt-1">{stats.ageDewasa}</p>
                  </div>
                  <div className="p-2 bg-rose-50/50 rounded-xl border border-rose-100/30">
                    <p className="font-bold text-rose-800">Lansia</p>
                    <p className="text-[8px] text-slate-400">&gt;= 60 Thn</p>
                    <p className="text-sm font-black text-rose-950 mt-1">{stats.ageLansia}</p>
                  </div>
                </div>
              </div>

              {/* Economic indicators */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                  <Briefcase className="h-4 w-4 text-slate-500 shrink-0" />
                  <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Ekonomi &amp; Pemberdayaan</h3>
                </div>
                
                <div className="grid grid-cols-3 gap-3 text-[10.5px]">
                  <div className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/30">
                    <p className="text-[9px] text-slate-400 font-bold uppercase">Jiwa Bekerja</p>
                    <p className="text-sm font-extrabold text-slate-800 mt-0.5">{stats.totalWorking} Jiwa</p>
                    <p className="text-[8px] text-slate-400 mt-1 font-mono">
                      {stats.totalJiwa > 0 ? Math.round((stats.totalWorking / stats.totalJiwa) * 100) : 0}% Produktivitas
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/30">
                    <p className="text-[9px] text-slate-400 font-bold uppercase">Memiliki Usaha</p>
                    <p className="text-sm font-extrabold text-slate-800 mt-0.5">{stats.hasUsaha} Orang</p>
                    <p className="text-[8px] text-slate-400 mt-1">Sektor Mikro/Mandiri</p>
                  </div>
                  <div className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/30">
                    <p className="text-[9px] text-slate-400 font-bold uppercase">Rata Pendapatan</p>
                    <p className="text-sm font-extrabold text-emerald-700 mt-0.5">Rp {stats.averageIncome.toLocaleString('id-ID')}</p>
                    <p className="text-[8px] text-slate-400 mt-1">Per KK Sebulan</p>
                  </div>
                </div>
              </div>

              {/* Top PMKS Categories */}
              {stats.pmksCategories.length > 0 && (
                <div className="space-y-2.5">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Kategori PMKS Terdeteksi Dominan:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {stats.pmksCategories.map(([name, count]) => (
                      <span key={name} className="py-1 px-2.5 rounded-lg bg-rose-50 border border-rose-100 text-rose-800 text-[10px] font-bold flex items-center gap-1.5">
                        <CircleDot className="h-2.5 w-2.5 text-rose-500 shrink-0" />
                        {name} ({count} Jiwa)
                      </span>
                    ))}
                  </div>
                </div>
              )}

            </div>

          </div>

          {/* Section C: Detailed Registries List */}
          <div className="space-y-2.5 pt-2">
            <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
              <Award className="h-4 w-4 text-slate-500 shrink-0" />
              <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Rincian Log Sensus Sensus Masuk — {currentMonthLabel} {selectedYear}</h3>
            </div>
            
            <div className="overflow-x-auto custom-scrollbar border border-slate-150 rounded-xl">
              <table className="w-full text-left border-collapse text-[10.5px]">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                    <th className="py-2.5 px-3">No</th>
                    <th className="py-2.5 px-3">Tanggal Sensus</th>
                    <th className="py-2.5 px-3">Nomor KK</th>
                    <th className="py-2.5 px-3">Nama Kepala / Responden</th>
                    <th className="py-2.5 px-3">Alamat &amp; Kelurahan</th>
                    <th className="py-2.5 px-3 text-center">Jiwa</th>
                    <th className="py-2.5 px-3 text-center">PMKS</th>
                    <th className="py-2.5 px-3 text-center">Bantuan</th>
                    <th className="py-2.5 px-3 text-center non-printable">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {monthlySurveys.map((s, idx) => {
                    const hasPmks = (s.anggotaKeluarga || []).some(m => m.isPmks === 'Ya');
                    const hasBantuan = s.programBantuan && s.programBantuan.length > 0 && !s.programBantuan.includes('Tidak Menerima Program Bantuan');
                    return (
                      <tr key={s.id} className="hover:bg-slate-50/40 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-slate-400">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-500">
                          {s.submittedAt ? new Date(s.submittedAt).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-700 font-mono">{s.noKK}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">{s.namaResponden}</td>
                        <td className="py-2.5 px-3 text-slate-500 max-w-xs truncate">
                          {s.alamat ? `${s.alamat}, ` : ''} <span className="font-medium text-slate-700">{s.kelurahan}</span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-600 font-mono">{s.anggotaKeluarga?.length || 0}</td>
                        <td className="py-2.5 px-3 text-center">
                          {hasPmks ? (
                            <span className="inline-block px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-100 text-[9px] font-black uppercase">
                              PMKS
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {hasBantuan ? (
                            <span className="inline-block px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] font-black uppercase">
                              Penerima
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center non-printable">
                          <button
                            type="button"
                            onClick={() => onViewSurvey(s)}
                            className="py-1 px-2.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 hover:border-indigo-200 text-indigo-700 rounded-lg text-[9.5px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer mx-auto"
                          >
                            Rincian <ChevronRight className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* FOOTER PENGESAHAN DOKUMEN RESMI (Visible ONLY during print) */}
      <div className="hidden print:block pt-16 mt-8">
        <div className="grid grid-cols-2 text-center text-xs">
          <div className="space-y-16">
            <p>Mengetahui,<br /><span className="font-bold">Kepala Dinas Sosial Kota Tanjungbalai</span></p>
            <div>
              <p className="font-extrabold underline uppercase">Drs. H. Mulyadi, M.Si</p>
              <p className="text-[10px] text-slate-500 font-mono">NIP. 19741203 199903 1 002</p>
            </div>
          </div>
          <div className="space-y-16">
            <p>Tanjungbalai, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br /><span className="font-bold">Petugas Verifikator / Administrator</span></p>
            <div>
              <p className="font-extrabold underline uppercase">{userRole === 'admin' ? 'KHAIRUL ANAM, S.Sos' : 'PETUGAS SENSUS LAPANGAN'}</p>
              <p className="text-[10px] text-slate-500 font-mono">Sensus Pendataan Terpadu Kota Tanjungbalai</p>
            </div>
          </div>
        </div>
      </div>

      {/* Print Helper Dialog (Shown when in iframe sandbox) */}
      {showIframePrintAlert && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 non-printable">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6 border border-slate-100 space-y-4">
            <div className="flex items-center gap-2 text-indigo-600">
              <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                <Printer className="h-5 w-5 animate-pulse" />
              </span>
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Cetak Membutuhkan Tab Baru</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Karena Anda sedang membuka aplikasi di dalam <strong>Panel Pratinjau Google AI Studio</strong>, sistem keamanan browser membatasi cetak langsung (iFrame Sandbox).
            </p>
            <p className="text-xs text-slate-500 leading-relaxed">
              Silakan klik tombol di bawah untuk membuka aplikasi di tab baru. Laporan bulan <strong>{currentMonthLabel} {selectedYear}</strong> akan otomatis terbuka dan mencetak langsung dengan rapi! Semua data aman dan tidak akan hilang.
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <a
                href={`${window.location.origin}${window.location.pathname}?action=print-report&month=${selectedMonth}&year=${selectedYear}&role=${userRole || 'admin'}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowIframePrintAlert(false)}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-center font-bold text-xs shadow-xs hover:scale-[1.01] transition-all flex items-center justify-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Buka di Tab Baru &amp; Cetak
              </a>
              <button
                type="button"
                onClick={() => {
                  setShowIframePrintAlert(false);
                  try {
                    window.print();
                  } catch (e) {
                    alert("Cetak langsung dibatalkan oleh browser Anda. Silakan gunakan tombol 'Buka di Tab Baru'!");
                  }
                }}
                className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-center font-semibold text-[11px]"
              >
                Tetap Coba Cetak Langsung
              </button>
              <button
                type="button"
                onClick={() => setShowIframePrintAlert(false)}
                className="w-full py-2 px-4 bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 rounded-xl text-center font-semibold text-[11px]"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
