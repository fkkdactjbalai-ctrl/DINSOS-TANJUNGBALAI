export default function Header() {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs non-printable">
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
            <p className="text-xs font-semibold text-white">Stempel Kito Tanjungbalai</p>
          </div>
          <div className="h-8 w-8 rounded-full bg-indigo-700 border border-indigo-400 flex items-center justify-center font-bold text-xs">
            SK
          </div>
        </div>
      </div>
    </header>
  );
}
