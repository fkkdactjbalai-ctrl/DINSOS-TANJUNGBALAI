import React, { useState, useMemo } from 'react';
import { 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  ZAxis, 
  Tooltip, 
  ResponsiveContainer, 
  ReferenceLine,
  ReferenceDot
} from 'recharts';
import { 
  MapPin, Compass, Navigation, Globe, Info, 
  Search, RefreshCw, Layers, Map, SlidersHorizontal, AlertTriangle, Check
} from 'lucide-react';
import { SurveyData } from '../types';

interface GPSDistributionMapProps {
  surveys: SurveyData[];
  onViewSurvey?: (survey: SurveyData) => void;
}

// Coordinate Bounds for Kota Tanjungbalai
const TJ_BOUNDS = {
  minLat: 2.930,
  maxLat: 3.010,
  minLon: 99.770,
  maxLon: 99.850
};

// District center coordinates list for landmarks / reference pins
const KEC_LANDMARKS = [
  { id: 'kec_1', name: 'Datuk Bandar', lat: 2.964210, lon: 99.801240, color: '#6366f1' },
  { id: 'kec_2', name: 'Datuk Bandar Timur', lat: 2.955140, lon: 99.822350, color: '#8b5cf6' },
  { id: 'kec_3', name: 'Tanjungbalai Selatan', lat: 2.975410, lon: 99.803840, color: '#ec4899' },
  { id: 'kec_4', name: 'Tanjungbalai Utara', lat: 2.986150, lon: 99.799790, color: '#f43f5e' },
  { id: 'kec_5', name: 'Sei Tualang Raso', lat: 2.981840, lon: 99.815330, color: '#10b981' },
  { id: 'kec_6', name: 'Teluk Nibung', lat: 2.998410, lon: 99.832960, color: '#f59e0b' }
];

export default function GPSDistributionMap({ surveys, onViewSurvey }: GPSDistributionMapProps) {
  const [selectedKecamatan, setSelectedKecamatan] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedNode, setSelectedNode] = useState<SurveyData | null>(null);
  const [viewMode, setViewMode] = useState<'blueprint' | 'satellite' | 'grid'>('blueprint');

  // Filter & format coordinates data for Recharts
  const mappedData = useMemo(() => {
    return surveys
      .filter((s) => {
        // Enforce basic coordinate presence
        if (!s.latitude || !s.longitude) return false;
        
        const lat = parseFloat(s.latitude);
        const lon = parseFloat(s.longitude);
        
        if (isNaN(lat) || isNaN(lon)) return false;
        
        // Filter by kecamatan
        if (selectedKecamatan !== 'Semua' && s.kecamatan !== selectedKecamatan) return false;
        
        // Filter by search query (Responden name, KK, or pendata)
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const nameMatch = (s.namaResponden || '').toLowerCase().includes(q);
          const kkMatch = (s.noKK || '').toLowerCase().includes(q);
          const pendataMatch = (s.namaPendata || '').toLowerCase().includes(q);
          if (!nameMatch && !kkMatch && !pendataMatch) return false;
        }
        
        return true;
      })
      .map((s) => ({
        ...s,
        latNum: parseFloat(s.latitude || '0'),
        lonNum: parseFloat(s.longitude || '0'),
        size: s.anggotaKeluarga?.length * 20 || 30 // size based on family members count
      }));
  }, [surveys, selectedKecamatan, searchQuery]);

  // Compute stats
  const stats = useMemo(() => {
    const totalSurveys = surveys.length;
    const totalMapped = surveys.filter(s => s.latitude && s.longitude && !isNaN(parseFloat(s.latitude)) && !isNaN(parseFloat(s.longitude))).length;
    
    let avgLat = 0;
    let avgLon = 0;
    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLon = Infinity;
    let maxLon = -Infinity;

    if (mappedData.length > 0) {
      let sumLat = 0;
      let sumLon = 0;
      mappedData.forEach(d => {
        sumLat += d.latNum;
        sumLon += d.lonNum;
        if (d.latNum < minLat) minLat = d.latNum;
        if (d.latNum > maxLat) maxLat = d.latNum;
        if (d.lonNum < minLon) minLon = d.lonNum;
        if (d.lonNum > maxLon) maxLon = d.lonNum;
      });
      avgLat = sumLat / mappedData.length;
      avgLon = sumLon / mappedData.length;
    } else {
      // Default to Kota Tanjungbalai center if empty
      avgLat = 2.964210;
      avgLon = 99.801240;
      minLat = 2.955;
      maxLat = 2.985;
      minLon = 99.795;
      maxLon = 99.825;
    }

    return {
      totalSurveys,
      totalMapped,
      unmapped: totalSurveys - totalMapped,
      avgLat: avgLat.toFixed(6),
      avgLon: avgLon.toFixed(6),
      boundingBox: {
        minLat: minLat === Infinity ? '0' : minLat.toFixed(5),
        maxLat: maxLat === -Infinity ? '0' : maxLat.toFixed(5),
        minLon: minLon === Infinity ? '0' : minLon.toFixed(5),
        maxLon: maxLon === -Infinity ? '0' : maxLon.toFixed(5),
      }
    };
  }, [surveys, mappedData]);

  // Handle scatter dot click
  const handleNodeClick = (data: any) => {
    if (data && data.payload) {
      setSelectedNode(data.payload);
    }
  };

  // Get color depending on health or aid conditions
  const getNodeColor = (node: any) => {
    if (node.pmksTerdapat && node.pmksTerdapat.toLowerCase().includes('ada')) {
      return '#f43f5e'; // pmks / vulnerable: rose-500
    }
    if (node.kondisiGiziAnak && node.kondisiGiziAnak.toLowerCase().includes('kurang')) {
      return '#f59e0b'; // malnutrition risk: amber-500
    }
    return '#10b981'; // healthy / standard: emerald-500
  };

  // Unique kecamatan list
  const kecamatanOptions = useMemo(() => {
    const list = Array.from(new Set(surveys.map(s => s.kecamatan).filter(Boolean)));
    return ['Semua', ...list];
  }, [surveys]);

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden" id="gps-distribution-map-component">
      {/* Header Panel */}
      <div className="bg-slate-900 text-white p-6 relative overflow-hidden border-b border-slate-800">
        <div className="absolute right-0 top-0 opacity-10 select-none pointer-events-none transform translate-y-2 translate-x-4">
          <Globe className="h-44 w-44 text-emerald-400 stroke-[1]" />
        </div>
        
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg shrink-0">
              <Compass className="h-5 w-5 animate-spin-slow" />
            </span>
            <div className="flex flex-col sm:flex-row sm:items-center p-0.5 justify-between w-full">
              <div>
                <h3 className="text-base font-bold tracking-tight">PETA SOSIOGEOGRAFIS KOORDINAT DTSEN</h3>
                <p className="text-xs text-slate-400">Monitoring spasial sebaran keluarga di 6 Kecamatan Kota Tanjungbalai secara real-time.</p>
              </div>
              <div className="mt-2 sm:mt-0 bg-slate-800/80 border border-slate-700/60 text-slate-300 text-[10px] sm:text-xs font-mono py-1 px-3 rounded-xl flex items-center gap-2">
                <Globe className="h-3.5 w-3.5 text-blue-400" />
                <span>CENTROID: {stats.avgLat}°N , {stats.avgLon}°E</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Filter control */}
      <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-slate-500 font-semibold px-1 py-1">
            <SlidersHorizontal className="h-4 w-4" />
            <span>Filter Wilayah:</span>
          </div>
          <select
            value={selectedKecamatan}
            onChange={(e) => {
              setSelectedKecamatan(e.target.value);
              setSelectedNode(null);
            }}
            className="bg-white border rounded-xl px-3 py-2 font-medium text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 cursor-pointer text-xs"
          >
            {kecamatanOptions.map(kec => (
              <option key={kec} value={kec}>{kec}</option>
            ))}
          </select>

          {/* Theme switcher */}
          <div className="flex bg-slate-200/60 rounded-xl p-0.5 ml-2 border">
            <button
              onClick={() => setViewMode('blueprint')}
              className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer ${
                viewMode === 'blueprint' 
                  ? 'bg-slate-900 text-white shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Blueprint
            </button>
            <button
              onClick={() => setViewMode('satellite')}
              className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer ${
                viewMode === 'satellite' 
                  ? 'bg-slate-900 text-white shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Relief Gelap
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer ${
                viewMode === 'grid' 
                  ? 'bg-slate-900 text-white shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mesh Koordinat
            </button>
          </div>
        </div>

        {/* Search input */}
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama responden / no KK..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSelectedNode(null);
            }}
            className="w-full bg-white border rounded-xl pl-9 pr-3 py-2 text-xs text-slate-705 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-505"
          />
        </div>
      </div>

      {/* Main Layout containing Map and Info Tower Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-100 min-h-[460px]">
        
        {/* Left/Middle Column (Map Screen Container) */}
        <div className="lg:col-span-2 p-4 md:p-6 flex flex-col justify-between relative bg-slate-950 text-white font-mono h-[380px] sm:h-[460px]">
          
          {/* Map background style based on viewMode configuration */}
          <div className="absolute inset-0 select-none pointer-events-none opacity-20">
            {viewMode === 'blueprint' && (
              <div className="w-full h-full bg-[radial-gradient(#10b981_0.75px,transparent_0.75px)] [background-size:16px_16px]" />
            )}
            {viewMode === 'satellite' && (
              <div className="w-full h-full bg-[linear-gradient(rgba(139,92,246,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.06)_1px,transparent_1px)] [background-size:32px_32px]" />
            )}
            {viewMode === 'grid' && (
              <div className="w-full h-full bg-[linear-gradient(rgba(16,185,129,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.08)_1px,transparent_1px)] [background-size:24px_24px]" />
            )}
          </div>

          {/* Compass / HUD HUD elements overlay */}
          <div className="absolute top-4 left-4 z-10 bg-slate-900/90 border border-slate-800 text-[10px] p-2.5 rounded-xl space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>DTSEN RADAR SCANNER</span>
            </div>
            <div className="text-slate-400 text-[9px] uppercase tracking-wider">Tanjungbalai Radar</div>
          </div>

          <div className="absolute top-4 right-4 z-10 bg-slate-900/90 border border-slate-800 text-[10px] p-2.5 rounded-xl space-y-1 text-right">
            <span className="font-bold text-slate-300">Skor Kerapatan Spasial</span>
            <div className="text-emerald-400 font-bold">{mappedData.length} Mapped Nodes</div>
          </div>

          {/* Coordinates Range Info Overlay */}
          <div className="absolute bottom-4 left-4 z-10 text-[9px] text-slate-500 bg-slate-950/70 p-2 rounded-lg">
            <div>Lat Bounds: {TJ_BOUNDS.minLat}° ~ {TJ_BOUNDS.maxLat}°</div>
            <div>Lon Bounds: {TJ_BOUNDS.minLon}° ~ {TJ_BOUNDS.maxLon}°</div>
          </div>

          {/* Map Chart Area utilizing Recharts */}
          <div className="w-full h-full mt-8 select-none">
            {mappedData.length === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-center space-y-3 px-4">
                <MapPin className="h-10 w-10 text-slate-500 animate-bounce" />
                <div className="max-w-xs">
                  <p className="text-xs font-bold text-slate-300">Tidak Ada Koordinat Ditemukan</p>
                  <p className="text-[10px] text-slate-500">Keluarga untuk kriteria pencarian ini belum memiliki stamp Geotag GPS.</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="95%">
                <ScatterChart
                  margin={{ top: 20, right: 30, bottom: 20, left: 30 }}
                >
                  <XAxis 
                    type="number" 
                    dataKey="lonNum" 
                    name="Longitude" 
                    unit="°E" 
                    domain={[TJ_BOUNDS.minLon, TJ_BOUNDS.maxLon]} 
                    tickFormatter={(v) => v.toFixed(3)}
                    stroke="#475569"
                    style={{ fontSize: '9px', fontFamily: 'monospace' }}
                    label={{ value: 'LONGITUDE (°E)', position: 'bottom', fill: '#64748b', fontSize: 9, offset: 0 }}
                  />
                  <YAxis 
                    type="number" 
                    dataKey="latNum" 
                    name="Latitude" 
                    unit="°N" 
                    domain={[TJ_BOUNDS.minLat, TJ_BOUNDS.maxLat]}
                    tickFormatter={(v) => v.toFixed(3)}
                    stroke="#475569"
                    style={{ fontSize: '9px', fontFamily: 'monospace' }}
                    label={{ value: 'LATITUDE (°N)', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 9, offset: -10 }}
                  />
                  <ZAxis type="number" dataKey="size" range={[80, 260]} />
                  
                  {/* Tooltip config */}
                  <Tooltip 
                    cursor={{ strokeDasharray: '3 3', stroke: '#cbd5e1', strokeWidth: 1 }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload as SurveyData;
                        return (
                          <div className="bg-slate-900/95 border border-slate-750 text-white p-3 rounded-xl shadow-xl space-y-1.5 font-sans min-w-[200px] text-left">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-1 flex-wrap gap-1">
                              <span className="font-bold text-xs text-white uppercase">{data.namaResponden}</span>
                              <span className="text-[9px] font-mono bg-indigo-500/20 text-indigo-400 px-1 py-0.2 rounded font-semibold">{data.kecamatan.replace('Kecamatan ', '')}</span>
                            </div>
                            <div className="text-[10px] text-slate-300">
                              <p className="line-clamp-1"><span className="text-slate-500 font-medium">Alamat:</span> {data.alamat}</p>
                              <p className="font-mono mt-0.5 text-emerald-400"><span className="text-slate-500">Lat/Lon:</span> {parseFloat(data.latitude || '0').toFixed(6)}, {parseFloat(data.longitude || '0').toFixed(6)}</p>
                              <p className="mt-0.5"><span className="text-slate-500">Anggota:</span> {data.anggotaKeluarga?.length || 0} orang</p>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />

                  {/* Draw District Centers as references */}
                  {KEC_LANDMARKS.map(k => (
                    <ReferenceDot
                      key={k.id}
                      x={k.lon}
                      y={k.lat}
                      r={6}
                      fill="#1e293b"
                      stroke={k.color}
                      strokeWidth={1.5}
                    />
                  ))}

                  {/* Highlight selected node crosshair lines if any */}
                  {selectedNode && (
                    <>
                      <ReferenceLine 
                        x={parseFloat(selectedNode.longitude || '0')} 
                        stroke="#f43f5e" 
                        strokeWidth={1}
                        strokeDasharray="4 4"
                      />
                      <ReferenceLine 
                        y={parseFloat(selectedNode.latitude || '0')} 
                        stroke="#f43f5e" 
                        strokeWidth={1} 
                        strokeDasharray="4 4"
                      />
                    </>
                  )}

                  {/* Data Point scatter nodes */}
                  <Scatter 
                    name="Keluarga DTSEN" 
                    data={mappedData} 
                    onClick={handleNodeClick}
                    style={{ cursor: 'pointer' }}
                  >
                    {mappedData.map((entry, index) => {
                      const isSelected = selectedNode && selectedNode.id === entry.id;
                      const baseColor = getNodeColor(entry);
                      return (
                        <ReferenceDot
                          key={`node-${entry.id}-${index}`}
                          x={entry.lonNum}
                          y={entry.latNum}
                          r={isSelected ? 10 : 6}
                          fill={isSelected ? '#ffffff' : baseColor}
                          stroke={isSelected ? '#f43f5e' : 'rgba(255,255,255,0.7)'}
                          strokeWidth={isSelected ? 3.5 : 1}
                        />
                      );
                    })}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Quick legend scale */}
          <div className="flex flex-wrap items-center gap-3 border-t border-slate-900 pt-3 select-none text-[10px]">
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block" />
              <span>Standard</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 block" />
              <span>Risiko Gizi Balita</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 block" />
              <span>Kategori PMKS/Yatim Terlantar</span>
            </div>
            <div className="flex items-center gap-1 text-slate-500 border-l border-slate-800 pl-3">
              <span className="w-2 h-2 rounded-full border border-slate-500 bg-[#1e293b]" />
              <span className="italic"> Landmark Pusat Kecamatan</span>
            </div>
          </div>
        </div>

        {/* Right Column: Control Tower Panel */}
        <div className="p-5 flex flex-col justify-between space-y-4 bg-slate-50/50">
          
          {/* Header context */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
              <span>Menara Kontrol GPS</span>
              <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 font-mono py-0.5 px-2 rounded-full font-bold">
                {mappedData.length} Terpeta
              </span>
            </h4>
          </div>

          {/* Conditional selected node details */}
          <div className="flex-1 overflow-y-auto max-h-[290px] pr-1 space-y-3">
            {selectedNode ? (
              <div className="bg-white border rounded-2xl p-4 shadow-xs space-y-3.5 border-l-4 border-l-rose-500 animate-fadeIn">
                <div className="flex items-start justify-between gap-2 border-b pb-2">
                  <div>
                    <h5 className="text-sm font-bold text-slate-800">{selectedNode.namaResponden}</h5>
                    <span className="text-[10px] font-mono text-slate-400 select-all">No KK: {selectedNode.noKK}</span>
                  </div>
                  <button 
                    onClick={() => setSelectedNode(null)}
                    className="text-[10px] text-slate-405 hover:text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md font-bold cursor-pointer"
                  >
                    Clear Select
                  </button>
                </div>

                <div className="space-y-2.5 text-xs text-slate-650">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-slate-800">{selectedNode.kecamatan}</p>
                      <p className="text-[11px] text-slate-400">{selectedNode.kelurahan}, {selectedNode.alamat}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Navigation className="h-4 w-4 text-indigo-500 shrink-0" />
                    <div className="font-mono text-[11px] bg-indigo-50 text-indigo-800 py-1 px-2.5 rounded-lg border border-indigo-100/60 font-semibold inline-block">
                      Lat: {parseFloat(selectedNode.latitude || '0').toFixed(6)} | Lon: {parseFloat(selectedNode.longitude || '0').toFixed(6)}
                    </div>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl border space-y-1">
                    <p className="text-[10px] font-bold text-slate-450 uppercase tracking-wide">Poin Vital Sensus</p>
                    <p className="text-[11px]"><strong className="text-slate-800">Status Rumah:</strong> {selectedNode.statusKepemilikanRumah}</p>
                    <p className="text-[11px]"><strong className="text-slate-800">Bantuan Diinginkan:</strong> {selectedNode.jenisBantuanDiinginkan}</p>
                    <p className="text-[11px]"><strong className="text-slate-800">PMKS Kategori:</strong> {selectedNode.pmksTerdapat}</p>
                  </div>

                  {/* Actions associated */}
                  <div className="pt-1 flex gap-2">
                    {onViewSurvey && (
                      <button
                        onClick={() => onViewSurvey(selectedNode)}
                        className="flex-1 bg-slate-900 text-white rounded-xl py-2 px-3 text-xs font-bold text-center hover:bg-slate-800 cursor-pointer select-none"
                      >
                        Buka Profil Rekaman
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Visualizer statistics breakdown */}
                <div className="bg-white border p-4 rounded-2xl shadow-xs space-y-3">
                  <div className="flex items-center justify-between text-xs border-b pb-2">
                    <span className="font-bold text-slate-700">DTSEN Tanjungbalai GPS Matriks</span>
                    <Globe className="h-4 w-4 text-slate-400" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="bg-slate-50/50 p-2 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 block font-bold">TERPETAS GPS</span>
                      <strong className="text-xl text-emerald-600 font-extrabold">{stats.totalMapped}</strong>
                    </div>
                    <div className="bg-slate-50/50 p-2 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 block font-bold">LURING / NO GPS</span>
                      <strong className="text-xl text-amber-600 font-extrabold">{stats.unmapped}</strong>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-600 space-y-1 pt-1.5 border-t">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Lat Rentang Min/Max:</span>
                      <span className="font-mono text-slate-700 font-semibold">{stats.boundingBox.minLat} ~ {stats.boundingBox.maxLat}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Lon Rentang Min/Max:</span>
                      <span className="font-mono text-slate-700 font-semibold">{stats.boundingBox.minLon} ~ {stats.boundingBox.maxLon}</span>
                    </div>
                  </div>
                </div>

                {/* Hot map tip informational context */}
                <div className="bg-indigo-50/60 border border-indigo-100 p-3.5 rounded-2xl text-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-indigo-900">
                    <Info className="h-4 w-4 text-indigo-600 shrinkage-0" />
                    <span>Petunjuk Navigasi Spasial</span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Setiap simpul mewakili sebuah keluarga. Klik simpul bulat pada visualisator peta di sebelah kiri untuk me-load data sosioekonomi, melihat profil KK, dan melacak koordinat lapangan mereka secara interaktif.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Quick coordinates emulation for prototyping */}
          <div className="bg-white border p-3.5 rounded-2xl shadow-xs space-y-2">
            <h5 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Akurasi Validasi Geospasial</h5>
            <div className="text-[11.5px] text-slate-500 leading-relaxed">
              Titik koordinat didapat otomatis melalui integrasi <span className="font-semibold text-emerald-600">Dapatkan Geotag GPS</span> di Section 5 dari SurveyWizardForm, memastikan akurasi data luring sejalan dengan target sensus nasional.
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
