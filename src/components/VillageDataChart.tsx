import { useState, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { SurveyData } from '../types';
import { BarChart3, Map, MapPin, Layers, Award, Info } from 'lucide-react';
import { KECAMATAN_KELURAHAN } from '../data/options';

interface VillageDataChartProps {
  surveys: SurveyData[];
}

export default function VillageDataChart({ surveys }: VillageDataChartProps) {
  const [selectedKecamatan, setSelectedKecamatan] = useState<string>('Semua');

  // Compute subdistricts list
  const kecamatanList = useMemo(() => {
    return ['Semua', ...Object.keys(KECAMATAN_KELURAHAN)];
  }, []);

  // Compute chart data based on selected subdistrict
  const chartData = useMemo(() => {
    // Collect all villages to initialize count to 0 (so even villages with 0 surveys show up if filtered by kecamatan)
    const counts: Record<string, { name: string; kecamatan: string; count: number }> = {};

    // Initialize based on selection
    Object.entries(KECAMATAN_KELURAHAN).forEach(([kec, villages]) => {
      if (selectedKecamatan === 'Semua' || selectedKecamatan === kec) {
        villages.forEach(v => {
          counts[v] = { name: v, kecamatan: kec, count: 0 };
        });
      }
    });

    // Count surveys
    surveys.forEach(survey => {
      const kel = survey.kelurahan;
      if (kel) {
        if (counts[kel]) {
          counts[kel].count += 1;
        } else if (selectedKecamatan === 'Semua' || survey.kecamatan === selectedKecamatan) {
          // Fallback if there is a village not in the defined KECAMATAN_KELURAHAN
          counts[kel] = { 
            name: kel, 
            kecamatan: survey.kecamatan || 'Lainnya', 
            count: 1 
          };
        }
      }
    });

    // Convert to array
    let dataArray = Object.values(counts);

    // If 'Semua' is selected, filter out villages with 0 count to prevent cluttering the X-axis labels.
    // If a specific kecamatan is selected, show all its villages (even those with 0 surveys) to give a complete view.
    if (selectedKecamatan === 'Semua') {
      dataArray = dataArray.filter(item => item.count > 0);
    }

    // Sort by count (descending) then by name
    return dataArray.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [surveys, selectedKecamatan]);

  // Calculations for KPI widget
  const kpis = useMemo(() => {
    const totalFamilies = chartData.reduce((acc, curr) => acc + curr.count, 0);
    const activeVillagesCount = chartData.filter(item => item.count > 0).length;
    
    // Find village with the highest count
    let topVillage = '-';
    let topCount = 0;
    chartData.forEach(item => {
      if (item.count > topCount) {
        topCount = item.count;
        topVillage = item.name;
      }
    });

    return {
      totalFamilies,
      activeVillagesCount,
      topVillage,
      topCount
    };
  }, [chartData]);

  // Color palette helpers
  const getBarColor = (index: number) => {
    // Beautiful color ranges matching our premium Indigo / Slate theme
    const colors = [
      '#4338ca', // Indigo 700
      '#4f46e5', // Indigo 600
      '#6366f1', // Indigo 500
      '#818cf8', // Indigo 400
      '#06b6d4', // Cyan 500
      '#0d9488', // Teal 600
      '#10b981', // Emerald 500
    ];
    return colors[index % colors.length];
  };

  // Custom tooltips
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-3.5 rounded-xl border border-slate-800 shadow-xl text-xs font-sans space-y-1">
          <p className="font-bold text-[13px] border-b border-slate-800 pb-1 flex items-center gap-1.5 text-indigo-200">
            <MapPin className="h-3.5 w-3.5 text-indigo-400" />
            Kel. {data.name}
          </p>
          <p className="text-slate-400 font-medium">
            Kecamatan: <span className="text-white font-semibold">{data.kecamatan}</span>
          </p>
          <p className="text-slate-400 font-medium font-mono">
            Jumlah Keluarga: <span className="text-amber-400 font-extrabold text-sm">{data.count} KK</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6 non-printable transition-all hover:shadow-md">
      {/* Header element */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-start gap-3">
          <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600 shrink-0">
            <BarChart3 className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              SEBARAN KELUARGA DISABILITAS &amp; PMKS
              <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full font-bold uppercase">
                Recharts Live
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Visualisasi jumlah kartu keluarga (KK) sensus terdata berdasarkan pembagian kelurahan.
            </p>
          </div>
        </div>

        {/* Subdistrict Filter selector for chart */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          <label htmlFor="chart-filter-kecamatan" className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <Layers className="h-3.5 w-3.5 text-indigo-600" />
            Kecamatan:
          </label>
          <select
            id="chart-filter-kecamatan"
            value={selectedKecamatan}
            onChange={(e) => setSelectedKecamatan(e.target.value)}
            className="text-xs p-2.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 outline-hidden focus:ring-1 focus:ring-indigo-600 cursor-pointer"
          >
            {kecamatanList.map((kec) => (
              <option key={kec} value={kec}>{kec}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid of Chart + Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* KPI panel */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          {/* Total Terdata Card */}
          <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Map className="h-5 w-5" />
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Total Keluarga Sensus</p>
              <p className="text-lg font-black text-slate-900 font-mono">
                {kpis.totalFamilies} <span className="text-xs font-bold text-slate-400">KK</span>
              </p>
            </div>
          </div>

          {/* Active Villages count Card */}
          <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Layers className="h-5 w-5" />
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Kelurahan Terdata</p>
              <p className="text-lg font-black text-slate-900 font-mono">
                {kpis.activeVillagesCount} <span className="text-xs font-bold text-slate-400">Active</span>
              </p>
            </div>
          </div>

          {/* Top Village Card */}
          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-4.5 rounded-2xl text-white space-y-3 shadow-md relative overflow-hidden">
            <div className="absolute right-0 bottom-0 opacity-10 select-none pointer-events-none transform translate-x-4 translate-y-4">
              <Award className="h-20 w-20" />
            </div>
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-400" />
              <span className="text-[10px] text-indigo-200 uppercase tracking-widest font-extrabold">Kelurahan Tertinggi</span>
            </div>
            <div className="space-y-1">
              <p className="text-base font-extrabold tracking-tight truncate">
                {kpis.topVillage !== '-' ? `Kel. ${kpis.topVillage}` : 'Belum Ada Data'}
              </p>
              <p className="text-[10.5px] text-indigo-200/90 font-mono">
                Menyumbang <strong className="text-amber-400 font-extrabold">{kpis.topCount} KK</strong> sensus
              </p>
            </div>
          </div>

          {/* Guidelines info */}
          <div className="bg-amber-50 border border-amber-100 p-3.5 rounded-xl text-[10.5px] text-amber-800 leading-relaxed space-y-1.5">
            <p className="font-bold flex items-center gap-1">
              <Info className="h-3.5 w-3.5 shrink-0" />
              Catatan Lapangan:
            </p>
            <p className="opacity-90 font-medium">
              Jika grafik menampilkan label kelurahan yang padat, harap lakukan koordinasi lanjutan dengan dinas setempat untuk merencanakan alokasi bantuan sosial yang adil dan tepat sasaran.
            </p>
          </div>
        </div>

        {/* Bar Chart Panel */}
        <div className="lg:col-span-3 bg-slate-50/50 border border-slate-100 rounded-3xl p-4 sm:p-6 min-h-[350px] flex flex-col justify-between">
          {chartData.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
              <BarChart3 className="h-10 w-10 text-slate-300 animate-pulse" />
              <p className="text-xs font-bold text-slate-600 block uppercase">Tidak Ada Data Ditemukan</p>
              <p className="text-[11px] text-slate-400 max-w-sm">
                Belum ada berkas sensus terdaftar pada filter kelurahan kecamatan terpilih. Silakan ubah filter atau isi form di atas!
              </p>
            </div>
          ) : (
            <div className="w-full h-[320px] font-mono text-[11px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 20, right: 10, left: -20, bottom: 45 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: '#475569', fontSize: 9, fontWeight: 500 }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={{ stroke: '#cbd5e1' }}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={65}
                  />
                  <YAxis 
                    allowDecimals={false}
                    tick={{ fill: '#475569', fontSize: 10, fontWeight: 500 }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={{ stroke: '#cbd5e1' }}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9', opacity: 0.6 }} />
                  <Bar 
                    dataKey="count" 
                    radius={[6, 6, 0, 0]} 
                    maxBarSize={45}
                    animationDuration={1000}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getBarColor(index)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Chart visual legend indicator */}
          {chartData.length > 0 && (
            <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-[10px] text-slate-400 font-mono mt-2">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded-xs bg-indigo-600 sm:grow-0" />
                <span>Distribusi Sensus KK</span>
              </span>
              <span>Total: {chartData.length} Kelurahan Terplot</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
