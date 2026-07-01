import { useState, useEffect } from 'react';
import { X, Printer, Phone, Calendar, User, Eye, Download, Users, FileText, ExternalLink } from 'lucide-react';
import { SurveyData } from '../types';
import { formatRupiah } from '../utils/csvExport';
import { generatePrintableHtml } from '../utils/printGenerator';

interface DetailModalProps {
  survey: SurveyData | null;
  onClose: () => void;
  autoPrint?: boolean;
  onPrinted?: () => void;
}

export default function DetailModal({ survey, onClose, autoPrint, onPrinted }: DetailModalProps) {
  const [showIframePrintAlert, setShowIframePrintAlert] = useState(false);

  const handlePrintClick = () => {
    if (!survey) return;

    const isIframe = window.self !== window.top;
    if (isIframe) {
      setShowIframePrintAlert(true);
      return;
    }

    try {
      const htmlContent = generatePrintableHtml(survey);
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);
      
      const printWindow = window.open(blobUrl, '_blank');
      if (!printWindow) {
        // Fallback using automatic trigger if popups are blocked by standard sandbox settings
        const link = document.createElement('a');
        link.href = blobUrl;
        link.target = '_blank';
        link.click();
      }
    } catch (error) {
      console.error('Print generation failed, fallback to native window print:', error);
      window.print();
    }
  };

  useEffect(() => {
    if (autoPrint && survey) {
      const timer = setTimeout(() => {
        handlePrintClick();
        if (onPrinted) onPrinted();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoPrint, survey, onPrinted]);

  if (!survey) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div 
        id="detail-modal-container"
        className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl relative border border-slate-100 flex flex-col my-8 max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-600" />
            <div>
              <h2 className="text-lg font-bold text-slate-800">Lembar Pendataan DTSEN Tanjungbalai</h2>
              <p className="text-xs text-slate-500">ID Data: {survey.id || 'N/A'}</p>
            </div>
          </div>
          <button 
            id="btn-close-modal"
            onClick={onClose} 
            className="p-1 px-2.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-8 flex-1">
          {/* Section 1: Lokasi */}
          <div>
            <h3 className="text-sm font-semibold tracking-wide text-slate-500 uppercase mb-3 flex items-center gap-2 border-b pb-1 dark:border-slate-100">
              <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
              Bagian 1: Data Petugas &amp; Lokasi Pendataan
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-1">
                <span className="text-[11px] text-slate-400 block uppercase font-mono">Nama Pendata / Petugas</span>
                <span className="text-sm font-semibold text-slate-800">{survey.namaPendata || '-'}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] text-slate-400 block uppercase font-mono">Status Pendataan</span>
                <span className={`inline-flex items-center text-xs font-extrabold px-2.5 py-0.5 rounded-full border ${
                  survey.statusPendataan === 'Bayi Baru Lahir (BBL)' ? 'bg-sky-50 text-sky-800 border-sky-100' :
                  survey.statusPendataan === 'Pembaharuan Desil' ? 'bg-amber-50 text-amber-800 border-amber-100' :
                  survey.statusPendataan === 'Pindah Wilayah' ? 'bg-purple-50 text-purple-800 border-purple-100' :
                  'bg-indigo-50 text-indigo-800 border-indigo-100'
                }`}>
                  {survey.statusPendataan || 'Usulan Baru'}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] text-slate-400 block uppercase font-mono">Nomor Kartu Keluarga</span>
                <span className="text-sm font-semibold text-slate-800 font-mono tracking-wider">{survey.noKK || '-'}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] text-slate-400 block uppercase font-mono">Nama Responden Utama</span>
                <span className="text-sm font-semibold text-slate-800">{survey.namaResponden || '-'}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] text-slate-400 block uppercase font-mono">Wilayah Kecamatan</span>
                <span className="text-sm font-semibold text-slate-800">{survey.kecamatan || '-'}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] text-slate-400 block uppercase font-mono">Wilayah Kelurahan / Desa</span>
                <span className="text-sm font-semibold text-slate-800">{survey.kelurahan || '-'}</span>
              </div>
              <div className="space-y-1 md:col-span-2 lg:col-span-3">
                <span className="text-[11px] text-slate-400 block uppercase font-mono">Alamat Lengkap KK</span>
                <span className="text-sm font-medium text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100 block whitespace-pre-wrap">
                  {survey.alamat || '-'}
                </span>
              </div>
              {survey.latitude && survey.longitude && (
                <div className="space-y-1 md:col-span-2 lg:col-span-3">
                  <span className="text-[11px] text-slate-400 block uppercase font-mono">Koordinat Lokasi GPS (Stempel Geotag)</span>
                  <div className="text-sm font-semibold text-emerald-800 bg-emerald-50 border border-emerald-100/80 p-2 rounded-lg inline-flex items-center gap-1.5 font-mono">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block animate-pulse" />
                    <span>LATITUDE: {survey.latitude}</span>
                    <span className="text-emerald-400">|</span>
                    <span>LONGITUDE: {survey.longitude}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Fisik Rumah */}
          <div>
            <h3 className="text-sm font-semibold tracking-wide text-slate-500 uppercase mb-3 flex items-center gap-2 border-b pb-1 dark:border-slate-100">
              <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
              Bagian 2: Kondisi Perumahan & Fasilitas Sanitasi
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-6">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Status Pemilikan Rumah</span>
                <span className="text-xs font-semibold text-slate-800">{survey.statusKepemilikanRumah}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Bukti Pemilikan Tanah</span>
                <span className="text-xs font-semibold text-slate-800">{survey.buktiKepemilikanTanah}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Luas Lantai</span>
                <span className="text-xs font-semibold text-slate-800">{survey.luasLantai} m²</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Jenis Lantai Terluas</span>
                <span className="text-xs font-semibold text-slate-800">{survey.jenisLantai}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Jenis Dinding Terluas</span>
                <span className="text-xs font-semibold text-slate-800">{survey.jenisDinding}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Jenis Atap Terluas</span>
                <span className="text-xs font-semibold text-slate-800">{survey.jenisAtap}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Sumber Air Minum Utama</span>
                <span className="text-xs font-semibold text-slate-800">{survey.sumberAirMinum}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Jarak Sumber Air</span>
                <span className="text-xs font-semibold text-slate-800">{survey.jarakAirMinum}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Penerangan & Daya Listrik</span>
                <span className="text-xs font-semibold text-slate-800">
                  {survey.sumberPenerangan} ({survey.dayaListrik})
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">No Meteran Listrik</span>
                <span className="text-xs font-semibold text-slate-800 font-mono">{survey.noMeteranPelanggan || '-'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Bahan Bakar Memasak</span>
                <span className="text-xs font-semibold text-slate-800">{survey.bahanBakarMemasak}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Fasilitas MCK & Kloset</span>
                <span className="text-xs font-semibold text-slate-800">
                  {survey.fasilitasBab} ({survey.jenisKloset})
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">TPA Tinja</span>
                <span className="text-xs font-semibold text-slate-800">{survey.pembuanganAkhirTinja}</span>
              </div>
            </div>
          </div>

          {/* Section 3 & 4: Anggota Keluarga Detail Sheet */}
          <div>
            <h3 className="text-sm font-semibold tracking-wide text-slate-500 uppercase mb-3 flex items-center gap-2 border-b pb-1 dark:border-slate-100">
              <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
              Bagian 3 & 4: Anggota Keluarga ({survey.anggotaKeluarga?.length || 0} Orang)
            </h3>
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 border-b border-slate-100">
                    <th className="p-3 font-semibold">No / Nama / NIK</th>
                    <th className="p-3 font-semibold">Informasi Dasar</th>
                    <th className="p-3 font-semibold">Pendidikan & Sekolah</th>
                    <th className="p-3 font-semibold">Pekerjaan & Ekonomi</th>
                    <th className="p-3 font-semibold">Status PMKS (Permensos)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {survey.anggotaKeluarga?.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3 align-top">
                        <div className="font-semibold text-slate-850">{m.nama || 'Tanpa Nama'}</div>
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">NIK: {m.nik || '-'}</div>
                        <span className="inline-block mt-1 px-1.5 py-0.5 text-[9px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 rounded">
                          {m.statusHubunganKK}
                        </span>
                      </td>
                      <td className="p-3 align-top space-y-1">
                        <div>
                          <span className="text-slate-400">JK:</span> {m.jenisKelamin}
                        </div>
                        <div>
                          <span className="text-slate-400">Umur:</span> {m.umur} Tahun
                        </div>
                        <div>
                          <span className="text-slate-400 font-mono text-[10px]">{m.tanggalLahir || '-'}</span>
                        </div>
                        {m.jenisKelamin === 'Perempuan' && (
                          <div className="text-[10px]">
                            <span className="text-slate-400">Hamil:</span>{' '}
                            <span className={`font-semibold ${m.sedangHamil === 'Ya' ? 'text-red-500' : 'text-slate-600'}`}>
                              {m.sedangHamil}
                            </span>
                          </div>
                        )}
                        <div className="text-[9px] text-slate-500">
                          ID Card: {m.kartuIdentitas?.join(', ') || '-'}
                        </div>
                      </td>
                      <td className="p-3 align-top space-y-1">
                        <div>
                          <span className="text-slate-400">Status:</span> {m.partisipasiSekolah}
                        </div>
                        <div>
                          <span className="text-slate-400">Terakhir:</span> {m.jenjangPendidikan}
                        </div>
                        <div>
                          <span className="text-slate-400">Kelas:</span> {m.kelasTertinggi}
                        </div>
                        <div>
                          <span className="text-slate-400">Ijazah:</span> {m.ijazahTertinggi}
                        </div>
                      </td>
                      <td className="p-3 align-top space-y-1">
                        <div>
                          <span className="text-slate-400">Bekerja:</span> {m.apakahBekerja} {m.apakahBekerja === 'Ya' && `(${m.jamBekerja} Jam/Minggu)`}
                        </div>
                        {m.apakahBekerja === 'Ya' && (
                          <>
                            <div className="truncate max-w-[200px]" title={m.lapanganUsaha}>
                              <span className="text-slate-400">Sektor:</span> {m.lapanganUsaha}
                            </div>
                            <div>
                              <span className="text-slate-400">Status:</span> {m.statusPekerjaan}
                            </div>
                            <div>
                              <span className="text-slate-400">Penghasilan:</span> {formatRupiah(m.penghasilanBulanan || 0)}/bln
                            </div>
                          </>
                        )}
                        <div>
                          <span className="text-slate-400">NPWP:</span> {m.memilikiNpwp}
                        </div>
                        {m.memilikiUsaha === 'Ya' && (
                          <div className="bg-indigo-50 text-[10px] p-1 rounded border border-indigo-100/50 mt-1">
                            <span className="font-semibold block text-indigo-800">Punya Sektor Usaha</span>
                            <span>Omzet: {formatRupiah(m.omzetBulanan)}/bln</span>
                          </div>
                        )}
                      </td>
                      <td className="p-3 align-top space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            m.isPmks === 'Ya' 
                              ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                              : 'bg-slate-100 text-slate-500'
                          }`}>
                            PMKS: {m.isPmks || 'Tidak'}
                          </span>
                        </div>
                        {m.isPmks === 'Ya' && m.pmksKategori && m.pmksKategori.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {m.pmksKategori.map((kategori, kIdx) => (
                              <span key={kIdx} className="bg-amber-50 text-amber-800 text-[10px] px-1.5 py-0.5 rounded border border-amber-100/50 block font-semibold">
                                • {kategori}
                              </span>
                            ))}
                            {m.jenisDisabilitas && (
                              <div className="w-full mt-1 p-1 bg-red-50 border border-red-100 rounded text-[9px] text-red-800 font-bold block">
                                Jenis Disabilitas: {m.jenisDisabilitas}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 5: Sosial, Aset, program */}
          <div>
            <h3 className="text-sm font-semibold tracking-wide text-slate-500 uppercase mb-3 flex items-center gap-2 border-b pb-1 dark:border-slate-100">
              <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
              Bagian 5: Kesehatan & Bantuan Sosial Keluarga
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/60 p-4 rounded-xl border border-slate-100">
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Pantauan Gizi Anak (Posyandu)</span>
                  <span className="text-xs font-semibold text-slate-800">{survey.kondisiGiziAnak}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Penyakit Kronis / Menahun</span>
                  <span className="text-xs font-semibold text-slate-800">{survey.penyakitKronis}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Asuransi Kesehatan Utama</span>
                  <span className="text-xs font-semibold text-slate-800">{survey.jaminanKesehatan}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Pendaftaran PMKS</span>
                  <span className="text-xs font-semibold text-indigo-800">
                    {survey.pmksTerdapat} {survey.pmksJenis && `(${survey.pmksJenis})`}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Rekening Bank / e-Wallet Aktif</span>
                  <span className="text-xs font-semibold text-slate-800">{survey.rekeningDompetDigital}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Hewan Ternak Yang Dimiliki</span>
                  <span className="text-xs font-semibold text-slate-800">{survey.jumlahTernak}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase mb-1">Menerima Program Bantuan Sosial</span>
                  <div className="flex flex-wrap gap-1">
                    {survey.programBantuan?.map((p, idx) => (
                      <span key={idx} className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-medium border border-slate-100">
                        {p === 'Lainnya' && survey.programBantuanLainnya ? `Lainnya: ${survey.programBantuanLainnya}` : p}
                      </span>
                    )) || 'Tidak Ada'}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase mb-1">Daftar Kepemilikan Aset Bergerak</span>
                  <div className="flex flex-wrap gap-1">
                    {survey.asetBergerak?.map((a, idx) => (
                      <span key={idx} className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-medium border border-indigo-100">
                        {a}
                      </span>
                    )) || 'Tidak Ada'}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase mb-1">Aset Tidak Bergerak (Properti)</span>
                  <div className="flex flex-wrap gap-1">
                    {survey.asetTidakBergerak?.map((a, idx) => (
                      <span key={idx} className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-medium border border-blue-100">
                        {a}
                      </span>
                    )) || 'Tidak Ada'}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Jenis Bantuan Yang Diinginkan Responden</span>
                  <span className="text-xs font-semibold text-slate-850 p-1.5 bg-amber-50 text-amber-800 rounded border border-amber-100 block mt-1">
                    {survey.jenisBantuanDiinginkan}
                  </span>
                </div>
              </div>

              <div className="md:col-span-2 border-t pt-3 border-slate-200">
                <span className="text-[10px] text-slate-400 block uppercase font-mono">Catatan Dan Evaluasi Petugas Lapangan</span>
                <p className="text-xs text-slate-600 italic whitespace-pre-wrap mt-1">
                  "{survey.catatan || 'Tidak ada catatan tambahan.'}"
                </p>
              </div>
            </div>
          </div>

          {/* Section 6: Dokumentasi */}
          <div>
            <h3 className="text-sm font-semibold tracking-wide text-slate-500 uppercase mb-3 flex items-center gap-2 border-b pb-1 dark:border-slate-100">
              <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
              Bagian 5: Dokumentasi Berkas DTSEN
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 block text-center uppercase mb-1">FOTO IDENTIFIKASI KK / KTP</span>
                <div className="h-40 bg-slate-50 rounded-xl border border-dashed border-slate-200 flex items-center justify-center overflow-hidden">
                  {survey.fotoKK && !survey.fotoKK.includes('dummy') ? (
                    <img src={survey.fotoKK} alt="Kartu Keluarga" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-3">
                      <div className="h-10 w-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-2">
                        <User className="h-5 w-5" />
                      </div>
                      <span className="text-[10px] text-slate-400 block">Identitas KK Terupload</span>
                      {survey.fotoKK && <span className="text-[9px] text-slate-500 bg-indigo-100 px-1 py-0.1 select-none">Mockup Berkas</span>}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 block text-center uppercase mb-1">FOTO RUMAH (TAMPAK DEPAN)</span>
                <div className="h-40 bg-slate-50 rounded-xl border border-dashed border-slate-200 flex items-center justify-center overflow-hidden">
                  {survey.fotoRumahDepan && !survey.fotoRumahDepan.includes('dummy') ? (
                    <img src={survey.fotoRumahDepan} alt="Rumah Depan" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-3">
                      <div className="h-10 w-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Users className="h-5 w-5" />
                      </div>
                      <span className="text-[10px] text-slate-400 block">Tampak Depan Rumah</span>
                      {survey.fotoRumahDepan && <span className="text-[9px] text-slate-500 bg-blue-100 px-1  py-0.1 select-none">Mockup Berkas</span>}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 block text-center uppercase mb-1">FOTO RUMAH (TAMPAK DALAM)</span>
                <div className="h-40 bg-slate-50 rounded-xl border border-dashed border-slate-200 flex items-center justify-center overflow-hidden">
                  {survey.fotoRumahDalam && !survey.fotoRumahDalam.includes('dummy') ? (
                    <img src={survey.fotoRumahDalam} alt="Rumah Dalam" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-3">
                      <div className="h-10 w-10 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Users className="h-5 w-5" />
                      </div>
                      <span className="text-[10px] text-slate-400 block">Tampak Interior Rumah</span>
                      {survey.fotoRumahDalam && <span className="text-[9px] text-slate-500 bg-amber-100 px-1 py-0.1 select-none">Mockup Berkas</span>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 rounded-b-2xl flex items-center justify-end gap-3">
          <button 
            id="btn-print-survey"
            onClick={handlePrintClick} 
            className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 py-2 px-4 rounded-xl hover:bg-slate-50 hover:text-slate-800 transition-colors cursor-pointer select-none"
          >
            <Printer className="h-4 w-4" />
            Cetak Formulir (PDF)
          </button>
          
          <button 
            id="btn-close-detail"
            onClick={onClose} 
            className="flex items-center gap-2 text-xs font-bold text-white bg-indigo-600 py-2 px-5 rounded-xl hover:bg-indigo-700 transition-colors cursor-pointer select-none shadow-md shadow-indigo-600/10"
          >
            Tutup Lembaran
          </button>
        </div>
      </div>

      {/* Print Helper Dialog (Shown when in iframe sandbox) */}
      {showIframePrintAlert && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6 border border-slate-100 space-y-4 text-left">
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
              Silakan klik tombol di bawah untuk membuka aplikasi di tab baru. Formulir data keluarga <strong>No KK {survey.noKK}</strong> akan otomatis terbuka dan mencetak langsung dengan rapi! Semua data aman dan tidak akan hilang.
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <a
                href={`${window.location.origin}${window.location.pathname}?action=print-survey&id=${survey.id}`}
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
                    const htmlContent = generatePrintableHtml(survey);
                    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
                    const blobUrl = URL.createObjectURL(blob);
                    const printWindow = window.open(blobUrl, '_blank');
                    if (!printWindow) {
                      const link = document.createElement('a');
                      link.href = blobUrl;
                      link.target = '_blank';
                      link.click();
                    }
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
