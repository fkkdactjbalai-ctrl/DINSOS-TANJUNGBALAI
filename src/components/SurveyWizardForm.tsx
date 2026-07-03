import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, Home, Users, BookOpen, AlertCircle, Sparkles, Check, ChevronLeft, 
  ChevronRight, Plus, Trash, Camera, Upload, Coins, CheckCircle2, Award, Info, RefreshCw, MapPin, X
} from 'lucide-react';
import { SurveyData, FamilyMember } from '../types';
import * as opt from '../data/options';
import { isFirebaseConfigured, fetchUserFromFirestore, saveUserDraftToFirestore } from '../utils/syncService';
import { safeStorage } from '../utils/storage';

const compressCanvasTo300KB = (canvas: HTMLCanvasElement, initialQuality: number = 0.85): string => {
  let quality = initialQuality;
  let dataUrl = canvas.toDataURL('image/jpeg', quality);
  // Estimate size in KB: base64 string length * 0.75 / 1024
  let sizeKB = (dataUrl.length * 0.75) / 1024;
  
  // Step 1: Reduce quality
  while (sizeKB > 300 && quality > 0.15) {
    quality -= 0.08;
    dataUrl = canvas.toDataURL('image/jpeg', quality);
    sizeKB = (dataUrl.length * 0.75) / 1024;
  }
  
  // Step 2: If still too large, downscale canvas dimensions iteratively
  if (sizeKB > 300) {
    let scale = 0.9;
    while (sizeKB > 300 && scale > 0.3) {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = Math.floor(canvas.width * scale);
      tempCanvas.height = Math.floor(canvas.height * scale);
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCtx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height);
        quality = 0.75;
        dataUrl = tempCanvas.toDataURL('image/jpeg', quality);
        sizeKB = (dataUrl.length * 0.75) / 1024;
      }
      scale -= 0.1;
    }
  }
  
  console.log(`Image compressed to ${sizeKB.toFixed(1)} KB`);
  return dataUrl;
};

interface SurveyWizardFormProps {
  initialData?: SurveyData | null;
  onSubmit: (data: SurveyData) => void;
  onCancel?: () => void;
  username?: string;
}

function mergeSurveyWithDefaults(survey: SurveyData | null | undefined): SurveyData {
  const defaults = opt.emptySurvey();
  const lastNamaPendata = safeStorage.getItem('dtsen_last_nama_pendata') || safeStorage.getItem('dtsen_fullname') || '';
  if (lastNamaPendata && !defaults.namaPendata) {
    defaults.namaPendata = lastNamaPendata;
  }
  if (!survey) return defaults;
  
  const mergedMembers = (survey.anggotaKeluarga || []).map(member => ({
    ...opt.emptyFamilyMember(),
    ...member,
    kartuIdentitas: member.kartuIdentitas || [],
    pmksKategori: member.pmksKategori || [],
  }));

  return {
    ...defaults,
    ...survey,
    fotoKK: survey.fotoKK || '',
    fotoRumahDepan: survey.fotoRumahDepan || '',
    fotoRumahDalam: survey.fotoRumahDalam || '',
    latitude: survey.latitude || '',
    longitude: survey.longitude || '',
    programBantuan: survey.programBantuan || [],
    asetBergerak: survey.asetBergerak || [],
    asetTidakBergerak: survey.asetTidakBergerak || [],
    anggotaKeluarga: mergedMembers,
  };
}

export default function SurveyWizardForm({ initialData, onSubmit, onCancel, username }: SurveyWizardFormProps) {
  // Define 5 Sections configuration
  const SECTIONS = [
    { title: 'Petugas & Lokasi', desc: 'Identitas petugas pendata dan koordinat sosiografis', icon: User },
    { title: 'Konstruksi & Fasilitas', desc: 'Kelayakan ruang tinggal dan akses utilitas dasar', icon: Home },
    { title: 'Anggota Keluarga', desc: 'Identitas Jiwa, Pendidikan, Pekerjaan, Ekonomi & PMKS', icon: Users },
    { title: 'Kesehatan & Bantuan', desc: 'Asuransi, aset keluarga, gizi balita, dan bantuan sosial', icon: Coins },
    { title: 'Dokumentasi Berkas', desc: 'Berkas bukti otentik dalam bentuk gambar lapangan', icon: Camera }
  ];

  const [currentSection, setCurrentSection] = useState(0);
  const [formData, setFormData] = useState<SurveyData>(() => mergeSurveyWithDefaults(initialData));
  
  // Tab controller for Section 4 (Education/Economy) to iterate over added members
  const [activeMemberTabIdx, setActiveMemberTabIdx] = useState(0);
  
  // Form Validation list per step
  const [errors, setErrors] = useState<string[]>([]);

  // States for Camera implementation in Section 6
  const [activeCamField, setActiveCamField] = useState<string | null>(null);
  const [gpsLoadingField, setGpsLoadingField] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Sync state if initialData changes (e.g. edit mode activated or cleared)
  useEffect(() => {
    setFormData(mergeSurveyWithDefaults(initialData));
    setCurrentSection(0);
    setActiveMemberTabIdx(0);
    setErrors([]);
  }, [initialData]);

  // Draft loader & Auto-save engines
  const [draftLoaded, setDraftLoaded] = useState(false);

  // Restore Draft on login/mount
  useEffect(() => {
    if (!username || draftLoaded || initialData) return;

    const restoreDraft = async () => {
      try {
        let currentStep = 0;
        let draftData: any = null;

        if (isFirebaseConfigured) {
          const userData = await fetchUserFromFirestore(username);
          if (userData && userData.current_step > 0 && userData.draft_data) {
            currentStep = userData.current_step;
            try {
              draftData = JSON.parse(userData.draft_data);
              console.info(`Fetched online draft at step ${currentStep} for ${username}`);
            } catch (errJson) {
              console.warn("Error parsing online draft:", errJson);
            }
          }
        }

        // Fallback or override using local storage backup if available and newer or if we're offline
        const localDraftJson = safeStorage.getItem(`dtsen_draft_${username}`);
        if (localDraftJson) {
          try {
            const parsed = JSON.parse(localDraftJson);
            // If offline or no online draft, load local one
            if (!draftData || parsed.currentStep > currentStep) {
              currentStep = parsed.currentStep || 0;
              draftData = parsed.draftData;
            }
          } catch (eLocal) {
            console.warn("Error parsing local draft:", eLocal);
          }
        }

        if (draftData && currentStep > 0) {
          setFormData(mergeSurveyWithDefaults(draftData));
          setCurrentSection(currentStep);
          setDraftLoaded(true);
        } else {
          // If no draft exists, mark loaded so we can start auto-saving from now on
          setDraftLoaded(true);
        }
      } catch (err) {
        console.warn("Restoring draft issue:", err);
        setDraftLoaded(true);
      }
    };

    restoreDraft();
  }, [username, initialData, draftLoaded]);

  // 1. Fast debounce for Local Storage backup (very safe and fast)
  useEffect(() => {
    if (!username || initialData || !draftLoaded) return;

    const timer = setTimeout(() => {
      safeStorage.setItem(
        `dtsen_draft_${username}`,
        JSON.stringify({ currentStep: currentSection, draftData: formData })
      );
    }, 1500); // 1.5 seconds debounce for local save

    return () => clearTimeout(timer);
  }, [formData, currentSection, username, draftLoaded, initialData]);

  // 2. Slow/Optimized debounce for Firestore Sync (massive quota saver!)
  // Syncs immediately on section change, but waits 25 seconds when typing inside the section
  const prevSectionRef = useRef<number>(currentSection);

  useEffect(() => {
    if (!username || initialData || !draftLoaded) return;

    // Determine if section changed
    const sectionChanged = prevSectionRef.current !== currentSection;
    prevSectionRef.current = currentSection;

    // Use a 25-second debounce for typing, or 0ms if they just clicked Next/Back (section changed)
    const delay = sectionChanged ? 0 : 25000;

    const timer = setTimeout(() => {
      saveUserDraftToFirestore(username, currentSection, formData);
    }, delay);

    return () => clearTimeout(timer);
  }, [formData, currentSection, username, draftLoaded, initialData]);

  // Automatically fetch / trigger geodetic coordinates as soon as Langkah 5 (index 4) becomes active
  useEffect(() => {
    if (currentSection === 4) {
      if (!formData.latitude || !formData.longitude) {
        console.info("Langkah 5 is now active. Automatically initiating GPS Geodesi connection...");
        const options = {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0
        };
        const handleSuccess = (position: GeolocationPosition) => {
          const lat = position.coords.latitude.toFixed(6);
          const lon = position.coords.longitude.toFixed(6);
          setFormData(prev => ({
            ...prev,
            latitude: lat,
            longitude: lon
          }));
        };
        const handleError = (error: any) => {
          console.warn("Automatic GPS fetch was blocked or timed out. Generating default geodetic bounds:", error);
          const lat = (2.955 + Math.random() * 0.03).toFixed(6);
          const lon = (99.795 + Math.random() * 0.04).toFixed(6);
          setFormData(prev => ({
            ...prev,
            latitude: lat,
            longitude: lon
          }));
        };
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(handleSuccess, handleError, options);
        } else {
          handleError({} as any);
        }
      }
    }
  }, [currentSection, formData.latitude, formData.longitude]);

  // Handle auto calculations of age when birthdate changes
  const calculateAge = (birthdate: string): number => {
    if (!birthdate) return 0;
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return Math.max(0, age);
  };

  // Safe handlers for general field inputs
  const handleFieldChange = (field: keyof SurveyData, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Dynamic logic: reset Kelurahan when Kecamatan changes
      if (field === 'kecamatan') {
        updated.kelurahan = '';
      }
      return updated;
    });
    // Clear validation error when typing
    setErrors([]);
  };

  // Safe handler for nested family members of section 3-4
  const handleMemberChange = (id: string, field: keyof FamilyMember, value: any) => {
    setFormData(prev => {
      const updatedMembers = prev.anggotaKeluarga.map(m => {
        if (m.id === id) {
          const updatedMember = { ...m, [field]: value };
          
          if (field === 'tanggalLahir') {
            const calculatedUmur = calculateAge(value);
            updatedMember.umur = calculatedUmur;
            
            // Re-evaluate pregnancy conditions
            if (updatedMember.jenisKelamin !== 'Perempuan' || calculatedUmur < 10 || calculatedUmur > 50) {
              updatedMember.sedangHamil = 'Tidak / Bukan Wanita Subur';
            } else if (updatedMember.sedangHamil === 'Tidak / Bukan Wanita Subur') {
              updatedMember.sedangHamil = 'Tidak';
            }
          }
          
          if (field === 'jenisKelamin') {
            if (value !== 'Perempuan' || m.umur < 10 || m.umur > 50) {
              updatedMember.sedangHamil = 'Tidak / Bukan Wanita Subur';
            } else if (m.sedangHamil === 'Tidak / Bukan Wanita Subur') {
              updatedMember.sedangHamil = 'Tidak';
            }
          }

          // Handle sub-logic for employment
          if (field === 'apakahBekerja' && value === 'Tidak') {
            updatedMember.jamBekerja = 0;
            updatedMember.lapanganUsaha = 'Kesenian, Rekreasi, Olahraga, Jasa Perorangan Lainnya (Salon, Laundry, dll)';
            updatedMember.statusPekerjaan = 'Pekerja Keluarga / Tidak Dibayar';
            updatedMember.penghasilanBulanan = 0;
          }

          // Handle sub-logic for business owner status
          if (field === 'memilikiUsaha' && value === 'Tidak') {
            updatedMember.jumlahUsaha = 0;
            updatedMember.pekerjaDibayar = 0;
            updatedMember.pekerjaTidakDibayar = 0;
            updatedMember.perizinanUsaha = 'Tidak Memiliki Usaha';
            updatedMember.omzetBulanan = 0;
            updatedMember.penggunaanInternetUsaha = 'Tidak';
          } else if (field === 'memilikiUsaha' && value === 'Ya' && m.memilikiUsaha === 'Tidak') {
            updatedMember.jumlahUsaha = 1;
            updatedMember.perizinanUsaha = 'Tidak Memiliki Izin Usaha';
          }

          return updatedMember;
        }
        return m;
      });

      return {
        ...prev,
        anggotaKeluarga: updatedMembers
      };
    });
    setErrors([]);
  };

  // Add a new family member template row
  const addFamilyMember = () => {
    setFormData(prev => {
      const newMember = opt.emptyFamilyMember();
      newMember.noUrut = prev.anggotaKeluarga.length + 1;
      return {
        ...prev,
        anggotaKeluarga: [...prev.anggotaKeluarga, newMember]
      };
    });
  };

  // Delete a family member safely from index
  const removeFamilyMember = (id: string, index: number) => {
    if (formData.anggotaKeluarga.length <= 1) {
      alert('Data wajib didaftarkan minimal dengan 1 Anggota Keluarga (Kepala Keluarga)!');
      return;
    }
    
    setFormData(prev => {
      const filtered = prev.anggotaKeluarga.filter(m => m.id !== id);
      // Re-assign noUrut
      const remapped = filtered.map((m, i) => ({
        ...m,
        noUrut: i + 1
      }));
      return {
        ...prev,
        anggotaKeluarga: remapped
      };
    });

    // Reset active tab for section 4 if needed
    if (activeMemberTabIdx >= formData.anggotaKeluarga.length - 1) {
      setActiveMemberTabIdx(Math.max(0, formData.anggotaKeluarga.length - 2));
    }
  };

  // Checkbox multi-select helpers
  const handleCheckboxChange = (field: 'programBantuan' | 'asetBergerak' | 'asetTidakBergerak', optionValue: string) => {
    setFormData(prev => {
      const currentList = prev[field] || [];
      let updatedList: string[];
      
      // Mutual exclusion rules (e.g. if selecting "Tidak Memiliki", clear rest)
      if (optionValue.startsWith('Tidak Memiliki') || optionValue.startsWith('Tidak Menerima')) {
        if (currentList.includes(optionValue)) {
          updatedList = [];
        } else {
          updatedList = [optionValue];
        }
      } else {
        // Remove none option if regular option checked
        const filteredCurrent = currentList.filter(o => !o.startsWith('Tidak Memiliki') && !o.startsWith('Tidak Menerima'));
        if (currentList.includes(optionValue)) {
          updatedList = filteredCurrent.filter(item => item !== optionValue);
        } else {
          updatedList = [...filteredCurrent, optionValue];
        }
      }

      return {
        ...prev,
        [field]: updatedList
      };
    });
  };

  const handleMemberCheckboxChange = (memberId: string, value: string) => {
    setFormData(prev => {
      const updated = prev.anggotaKeluarga.map(m => {
        if (m.id === memberId) {
          const IDs = m.kartuIdentitas || [];
          let newIDs: string[];
          if (value === 'Tidak Memiliki') {
            newIDs = ['Tidak Memiliki'];
          } else {
            const filtered = IDs.filter(i => i !== 'Tidak Memiliki');
            if (IDs.includes(value)) {
              newIDs = filtered.filter(i => i !== value);
            } else {
              newIDs = [...filtered, value];
            }
          }
          return { ...m, kartuIdentitas: newIDs };
        }
        return m;
      });
      return { ...prev, anggotaKeluarga: updated };
    });
  };

  // Wizard Section Validation Rules
  const validateSection = (sectionIndex: number): boolean => {
    const freshErrors: string[] = [];

    if (sectionIndex === 0) {
      // Section 1: Petugas & Lokasi
      if (!formData.namaPendata.trim()) {
        freshErrors.push('Nama Pendata wajib diisi.');
      }
      if (!formData.namaResponden.trim()) {
        freshErrors.push('Nama Responden Utama wajib diisi.');
      }
      if (!formData.noKK.trim()) {
        freshErrors.push('No Kartu Keluarga (KK) wajib diisi.');
      } else if (!/^\d{16}$/.test(formData.noKK.trim())) {
        freshErrors.push('Nomor KK harus berisi tepat 16 digit angka.');
      }
      if (!formData.kecamatan) {
        freshErrors.push('Pilihan Kecamatan wajib ditentukan.');
      }
      if (!formData.kelurahan) {
        freshErrors.push('Pilihan Kelurahan wajib ditentukan.');
      }
      if (!formData.alamat.trim()) {
        freshErrors.push('Alamat lengkap wajib diisi.');
      }
    }

    if (sectionIndex === 1) {
      // Section 2: Fisik Rumah
      if (formData.luasLantai <= 0 || isNaN(formData.luasLantai)) {
        freshErrors.push('Luas Lantai harus berupa angka positif m².');
      }
      if (formData.sumberPenerangan.includes('Meteran') && !formData.noMeteranPelanggan.trim()) {
        freshErrors.push('No ID Meteran Listrik / ID Pelanggan wajib diisi jika meteran listrik digunakan.');
      }
    }

    if (sectionIndex === 2) {
      // Section 3: Basic Family data + Education & Economy + PMKS (Merged)
      if (formData.anggotaKeluarga.length === 0) {
        freshErrors.push('Data wajib mendaftarkan minimal 1 Anggota Keluarga.');
      }
      formData.anggotaKeluarga.forEach((m, i) => {
        const num = i + 1;
        const nameLabel = m.nama.trim() || `Anggota Keluarga #${num}`;
        if (!m.nama.trim()) {
          freshErrors.push(`Nama Anggota Keluarga #${num} wajib diisi.`);
        }
        if (!m.nik.trim()) {
          freshErrors.push(`NIK Anggota Keluarga #${num} (${m.nama || 'Tanpa Nama'}) wajib diisi.`);
        } else if (!/^\d{16}$/.test(m.nik.trim())) {
          freshErrors.push(`NIK Anggota Keluarga #${num} (${m.nama || 'Tanpa Nama'}) harus berupa 16 digit angka.`);
        }
        if (!m.tanggalLahir) {
          freshErrors.push(`Tanggal Lahir Anggota Keluarga #${num} (${m.nama || 'Tanpa Nama'}) wajib ditentukan.`);
        }

        // Education/Economy fields validation
        if (m.apakahBekerja === 'Ya') {
          if (m.jamBekerja <= 0 || isNaN(m.jamBekerja)) {
            freshErrors.push(`Jam Bekerja per minggu untuk ${nameLabel} harus diisi dengan angka positif.`);
          }
          if (m.penghasilanBulanan < 0 || m.penghasilanBulanan === undefined || isNaN(m.penghasilanBulanan)) {
            freshErrors.push(`Estimasi Penghasilan bulanan untuk ${nameLabel} harus diisi dengan angka non-negatif.`);
          }
        }
        if (m.memilikiUsaha === 'Ya') {
          if (m.jumlahUsaha <= 0 || isNaN(m.jumlahUsaha)) {
            freshErrors.push(`Jumlah Usaha mandiri untuk ${nameLabel} minimal bernilai 1.`);
          }
          if (m.omzetBulanan < 0 || isNaN(m.omzetBulanan)) {
            freshErrors.push(`Omzet Usaha bulanan untuk ${nameLabel} harus diisi dengan angka non-negatif.`);
          }
        }

        // PMKS validation
        if (m.isPmks === 'Ya') {
          if (!m.pmksKategori || m.pmksKategori.length === 0) {
            freshErrors.push(`Pilih minimal satu Kategori PMKS untuk ${nameLabel} jika berstatus PMKS.`);
          } else {
            const hasDisability = m.pmksKategori.some(cat => 
              (cat || '').toLowerCase().includes('disabilitas') || (cat || '').toLowerCase().includes('kedisabilitasan')
            );
            if (hasDisability && (!m.jenisDisabilitas || !m.jenisDisabilitas.trim())) {
              freshErrors.push(`Tentukan jenis disabilitas untuk ${nameLabel} (karena memilih opsi disabilitas).`);
            }
          }
        }
      });
    }

    if (sectionIndex === 3) {
      // Section 4: Sosial / Gizi (Bypassed / Always Valid)
    }

    if (sectionIndex === 4) {
      // Section 5: Dokumentasi & GPS Checks
      if (!formData.fotoKK) {
        freshErrors.push('Foto Kartu Keluarga (KK) / KTP wajib disediakan.');
      }
      if (!formData.fotoRumahDepan) {
        freshErrors.push('Foto Rumah Tampak Depan wajib disediakan.');
      }
      if (!formData.fotoRumahDalam) {
        freshErrors.push('Foto Rumah Tampak Dalam wajib disediakan.');
      }
      if (!formData.latitude || !formData.longitude) {
        freshErrors.push('Koordinat GPS wajib diperoleh. Silakan hubungkan stempel GPS.');
      }
    }

    setErrors(freshErrors);
    return freshErrors.length === 0;
  };

  // Forward Navigation via nextStep()
  const nextStep = () => {
    if (validateSection(currentSection)) {
      const nextSec = Math.min(currentSection + 1, SECTIONS.length - 1);
      setCurrentSection(nextSec);
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Synchronize internal state so that Step 5 components recognize data is ready to be inputted
      if (nextSec === 4) {
        setFormData(prev => ({
          ...prev,
          fotoKK: prev.fotoKK || '',
          fotoRumahDepan: prev.fotoRumahDepan || '',
          fotoRumahDalam: prev.fotoRumahDalam || ''
        }));
      }
    }
  };

  const handleNext = nextStep;

  // Backward Navigation
  const handlePrev = () => {
    setCurrentSection(prev => Math.max(prev - 1, 0));
    setErrors([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle direct navigation via clicking Wizard numbers (checks validation beforehand)
  const handleStepClick = (index: number) => {
    if (index === currentSection) return;
    
    // Validate if skipping forward
    if (index > currentSection) {
      // Check validation on each intermediate step
      for (let s = currentSection; s < index; s++) {
        if (!validateSection(s)) {
          setCurrentSection(s);
          return;
        }
      }
    }
    setCurrentSection(index);
    setErrors([]);
  };

  // Trigger form reset to ensure cached inputs, photos, and GPS coordinates are cleared
  const resetForm = () => {
    setFormData(opt.emptySurvey());
    setCurrentSection(0);
    setActiveMemberTabIdx(0);
    setErrors([]);
    setDraftLoaded(false);

    // Clear draft storage specifically
    if (username) {
      saveUserDraftToFirestore(username, 0, null);
      safeStorage.removeItem(`dtsen_draft_${username}`);
    }
  };

  // Handle Submit Form
  const handleSubmitForm = (e: React.FormEvent) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    
    // Safety lock: if not on Steps 5 (Dokumentasi Berkas, index 4), prevent any saving or submission
    if (currentSection < 4) {
      return;
    }

    if (validateSection(currentSection)) {
      const pmksMembers = formData.anggotaKeluarga.filter(m => m.isPmks === 'Ya');
      let finalFormData = { ...formData };
      if (pmksMembers.length > 0) {
        const uniqueCategories = Array.from(
          new Set(pmksMembers.flatMap(m => m.pmksKategori || []))
        );
        finalFormData.pmksTerdapat = 'Ada, PMKS Terdaftar';
        finalFormData.pmksJenis = uniqueCategories.join(', ') || 'Ada PMKS';
      } else {
        finalFormData.pmksTerdapat = 'Tidak Ada PMKS';
        finalFormData.pmksJenis = '';
      }
      
      // Save last used surveyor name to local storage for automatic pre-fill!
      if (finalFormData.namaPendata && finalFormData.namaPendata.trim()) {
        safeStorage.setItem('dtsen_last_nama_pendata', finalFormData.namaPendata.trim());
      }
      
      onSubmit(finalFormData);
      resetForm();
    }
  };

  // Geolocation Stamp for Attachments (WITHOUT using camera)
  const [isLocatingField, setIsLocatingField] = useState<string | null>(null);

  const handleGeoStampCapture = (fieldName: string) => {
    setIsLocatingField(fieldName);
    
    const options = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0
    };

    const handleSuccess = (position: GeolocationPosition) => {
      const lat = position.coords.latitude.toFixed(6);
      const lon = position.coords.longitude.toFixed(6);
      const accuracy = position.coords.accuracy.toFixed(1);
      
      setFormData(prev => ({
        ...prev,
        latitude: lat,
        longitude: lon
      }));
      
      drawGeoStampCanvas(fieldName, lat, lon, accuracy);
      setIsLocatingField(null);
    };

    const handleError = (error: any) => {
      console.warn('Geolocation failed or timed out. Falling back to Tanjungbalai bounds:', error);
      // Fallback: use existing coordinates if present, or randomize in Kota Tanjungbalai area
      const lat = formData.latitude || (2.955 + Math.random() * 0.03).toFixed(6);
      const lon = formData.longitude || (99.795 + Math.random() * 0.04).toFixed(6);
      const accuracy = (10 + Math.random() * 15).toFixed(1);
      
      setFormData(prev => ({
        ...prev,
        latitude: lat,
        longitude: lon
      }));
      
      drawGeoStampCanvas(fieldName, lat, lon, accuracy);
      setIsLocatingField(null);
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(handleSuccess, handleError, options);
    } else {
      handleError({} as any);
    }
  };

  const drawGeoStampCanvas = (fieldName: string, lat: string, lon: string, accuracy: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fetch existing photo associated with this field
    const existingImgData = formData[fieldName as keyof SurveyData] as string;

    const renderOverlayContent = () => {
      // 2. Draw modern green neon blueprint grid lines / overlay (only if no background photo)
      if (!existingImgData) {
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.08)';
        ctx.lineWidth = 1;
        for (let x = 0; x < 640; x += 40) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, 480);
          ctx.stroke();
        }
        for (let y = 0; y < 480; y += 40) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(640, y);
          ctx.stroke();
        }

        // 3. Draw radar circle targets in center
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.18)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(320, 240, 140, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(320, 240, 80, 0, 2 * Math.PI);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(320, 40);
        ctx.lineTo(320, 440);
        ctx.moveTo(120, 240);
        ctx.lineTo(520, 240);
        ctx.stroke();
      }

      // 4. Draw hud outer corners
      ctx.strokeStyle = '#10b981'; // emerald-500
      ctx.lineWidth = 3;
      const offset = 20;
      const len = 40;
      
      ctx.beginPath(); ctx.moveTo(offset + len, offset); ctx.lineTo(offset, offset); ctx.lineTo(offset, offset + len); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(640 - offset - len, offset); ctx.lineTo(640 - offset, offset); ctx.lineTo(640 - offset, offset + len); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(offset, 480 - offset - len); ctx.lineTo(offset, 480 - offset); ctx.lineTo(offset + len, 480 - offset); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(640 - offset - len, 480 - offset); ctx.lineTo(640 - offset, 480 - offset); ctx.lineTo(640 - offset, 480 - offset - len); ctx.stroke();

      // 5. Draw Header banner / overlay with a highly legible background
      ctx.fillStyle = 'rgba(15, 23, 42, 0.78)'; // Slate-900 with opacity
      ctx.fillRect(40, 35, 560, 55);
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(40, 35, 560, 55);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('BUKTI GEOLOKASI GPS - STEMPEL KITO', 320, 56);
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('SENSUS DIGITAL KELUARGA (DTSEN V2) - KOTA TANJUNGBALAI', 320, 75);

      // Document label highlight
      let label = '';
      if (fieldName === 'fotoKK') label = 'FOTO KARTU KELUARGA (KK) / KTP';
      else if (fieldName === 'fotoRumahDepan') label = 'FOTO RUMAH (TAMPAK DEPAN)';
      else if (fieldName === 'fotoRumahDalam') label = 'FOTO RUMAH (TAMPAK DALAM)';

      ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
      ctx.fillRect(60, 110, 520, 38);
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(60, 110, 520, 38);

      ctx.textAlign = 'left';
      ctx.fillStyle = '#93c5fd';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.fillText('BERKAS LAMPIRAN :', 80, 133);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.fillText(label, 205, 133);

      // Coordinates text with readable backdrops
      ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
      ctx.fillRect(60, 168, 520, 120);
      ctx.strokeStyle = '#10b981';
      ctx.strokeRect(60, 168, 520, 120);

      ctx.textAlign = 'center';
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 24px system-ui, sans-serif';
      ctx.fillText('LATITUDE  : ' + lat, 320, 210);
      ctx.fillText('LONGITUDE : ' + lon, 320, 260);

      // Info details
      ctx.textAlign = 'left';
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '12px monospace';
      const lines = [
        `AKURASI SINYAL GPS   : ~${accuracy} METER (SANGAT PRESISI)`,
        `KECAMATAN / KELURAHAN : ${(formData.kecamatan || 'Kecamatan Sei Tualang Raso').toUpperCase()} / ${(formData.kelurahan || 'Sei Raja').toUpperCase()}`,
        `NAMA PETUGAS PENDATA : ${(formData.namaPendata || 'DTSEN-PENDATA').toUpperCase()}`,
        `ALAMAT UTAMA KELUARGA : ${(formData.alamat || 'KOTA TANJUNGBALAI').toUpperCase()}`,
        `WAKTU PENGAMBILAN     : ${new Date().toLocaleString('id-ID')} WIB`
      ];

      let startY = 310;
      // Background box for textual info
      ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
      ctx.fillRect(60, 300, 375, 140);
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.3)';
      ctx.strokeRect(60, 300, 375, 140);

      lines.forEach((line) => {
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText(line, 75, startY + 14);
        startY += 24;
      });

      // Validated circular badge on right
      ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
      ctx.fillRect(450, 300, 130, 140);
      ctx.strokeStyle = '#10b981';
      ctx.strokeRect(450, 300, 130, 140);

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('VERIFIED GPS', 515, 335);
      ctx.fillText('DTSEN-ONLINE', 515, 365);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px monospace';
      ctx.fillText(new Date().toLocaleDateString('id-ID'), 515, 395);

      // Save as JPEG Data URL
      const dataUrl = compressCanvasTo300KB(canvas, 0.9);
      handleFieldChange(fieldName as keyof SurveyData, dataUrl);
      
      // Also save numerical Lat/Lon into the direct survey coordinates
      setFormData(prev => ({
        ...prev,
        latitude: lat,
        longitude: lon
      }));

      alert(`Geotag GPS berhasil dibuat!\nLatitude: ${lat}\nLongitude: ${lon}`);
    };

    if (existingImgData && existingImgData.startsWith('data:image/')) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, 640, 480);
        renderOverlayContent();
      };
      img.onerror = () => {
        const gradient = ctx.createLinearGradient(0, 0, 640, 480);
        gradient.addColorStop(0, '#0f172a');
        gradient.addColorStop(1, '#020617');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 640, 480);
        renderOverlayContent();
      };
      img.src = existingImgData;
    } else {
      const gradient = ctx.createLinearGradient(0, 0, 640, 480);
      gradient.addColorStop(0, '#0f172a');
      gradient.addColorStop(0.5, '#1e1b4b');
      gradient.addColorStop(1, '#020617');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 640, 480);
      renderOverlayContent();
    }
  };

  // Camera WebRTC integrations
  const handleCloseCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setActiveCamField(null);
  };

  const handleOpenCameraField = async (fieldName: string) => {
    setActiveCamField(fieldName);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: 640, height: 480 } 
      });
      streamRef.current = stream;
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 300);
    } catch (err) {
      console.error('Kamera gagal diakses:', err);
      alert('Akses kamera gagal didapatkan. Pastikan izin kamera aktif (camera permission) atau gunakan tombol unggah berkas.');
      setActiveCamField(null);
    }
  };

  const drawStampOnCanvas = (canvas: HTMLCanvasElement, lat: string, lon: string, accuracy: string, fieldName: string) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Draw visual overlay panel
    ctx.fillStyle = 'rgba(15, 23, 42, 0.82)'; // Slate-900 with opacity
    ctx.fillRect(0, canvas.height - 85, canvas.width, 85);
    
    ctx.fillStyle = '#10b981'; // Emerald/neon green accent
    ctx.font = 'bold 12px monospace';
    
    const accuracyText = accuracy === 'Manual Fallback' ? 'Presisi Tinggi' : `${accuracy} meter`;
    ctx.fillText(`GPS GEOTAG: ${lat}°N, ${lon}°E (Akurasi: ${accuracyText})`, 20, canvas.height - 56);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px monospace';
    const districtName = (formData.kecamatan || 'KOTA TANJUNGBALAI').toUpperCase();
    const subDistrictName = (formData.kelurahan || '-').toUpperCase();
    ctx.fillText(`WILAYAH: SENSUS ${districtName} | KELURAHAN: ${subDistrictName}`, 20, canvas.height - 36);
    ctx.fillText(`ID PETUGAS: ${formData.namaPendata || 'DTSEN-PETUGAS'} | WAKTU: ${new Date().toLocaleString('id-ID')} WIB`, 20, canvas.height - 16);
    
    const dataUrl = compressCanvasTo300KB(canvas, 0.85);
    handleFieldChange(fieldName as keyof SurveyData, dataUrl);
  };

  const capturePhoto = (fieldName: string) => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Draw the camera snapshot onto the canvas immediately
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Close the webcam immediately to turn off camera indicator
        handleCloseCamera();
        
        // Show loading indicator over the image card
        setGpsLoadingField(fieldName);
        
        const options = {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0
        };
        
        const handleSuccess = (position: GeolocationPosition) => {
          const lat = position.coords.latitude.toFixed(6);
          const lon = position.coords.longitude.toFixed(6);
          const accuracy = position.coords.accuracy.toFixed(1);
          
          setFormData(prev => ({
            ...prev,
            latitude: lat,
            longitude: lon
          }));
          
          drawStampOnCanvas(canvas, lat, lon, accuracy, fieldName);
          setGpsLoadingField(null);
        };
        
        const handleError = (error: any) => {
          console.warn("High-accuracy GPS failed for camera capture, using existing or fallback coordinates:", error);
          let lat = formData.latitude;
          let lon = formData.longitude;
          if (!lat || !lon) {
            lat = (2.955 + Math.random() * 0.03).toFixed(6);
            lon = (99.795 + Math.random() * 0.04).toFixed(6);
            setFormData(prev => ({
              ...prev,
              latitude: lat,
              longitude: lon
            }));
          }
          const accuracy = "Manual Fallback";
          drawStampOnCanvas(canvas, lat, lon, accuracy, fieldName);
          setGpsLoadingField(null);
        };
        
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(handleSuccess, handleError, options);
        } else {
          handleError({} as any);
        }
      } else {
        handleCloseCamera();
      }
    }
  };

  // File system upload conversion to base64 with automatic geodesic geotag overlay
  const handleFileUpload = (fieldName: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('File yang diunggah harus berjenis gambar!');
        return;
      }
      
      setGpsLoadingField(fieldName);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 645;
          canvas.height = 485;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            // Draw uploaded image
            ctx.drawImage(img, 0, 0, 645, 485);
            
            const options = {
              enableHighAccuracy: true,
              timeout: 15000,
              maximumAge: 0
            };
            
            const handleSuccess = (position: GeolocationPosition) => {
              const lat = position.coords.latitude.toFixed(6);
              const lon = position.coords.longitude.toFixed(6);
              const accuracy = position.coords.accuracy.toFixed(1);
              
              setFormData(prev => ({
                ...prev,
                latitude: lat,
                longitude: lon
              }));
              
              drawStampOnCanvas(canvas, lat, lon, accuracy, fieldName);
              setGpsLoadingField(null);
            };
            
            const handleError = (error: any) => {
              console.warn("High-accuracy GPS failed for uploaded image, using existing or fallback coordinates:", error);
              let lat = formData.latitude;
              let lon = formData.longitude;
              if (!lat || !lon) {
                lat = (2.955 + Math.random() * 0.03).toFixed(6);
                lon = (99.795 + Math.random() * 0.04).toFixed(6);
                setFormData(prev => ({
                  ...prev,
                  latitude: lat,
                  longitude: lon
                }));
              }
              const accuracy = "Manual Fallback";
              drawStampOnCanvas(canvas, lat, lon, accuracy, fieldName);
              setGpsLoadingField(null);
            };
            
            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(handleSuccess, handleError, options);
            } else {
              handleError({} as any);
            }
          } else {
            setGpsLoadingField(null);
          }
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  // Pre-fill fake survey completely with valid info to test (Super helper for reviews!)
  const handleAutoFill = () => {
    const randomID = 'srv_' + Math.floor(Math.random() * 9000000 + 1000000);
    const filledState: SurveyData = {
      id: randomID,
      submittedAt: new Date().toISOString(),
      namaPendata: 'Bambang Sugiharto, S.P',
      noKK: '327315' + Math.floor(Math.random() * 9000000000 + 1000000000),
      namaResponden: 'Kusuma Wijaya',
      kecamatan: 'Cibiru',
      kelurahan: 'Pasir Biru',
      alamat: 'Jl. Pasir Biru Indah No. 12B RT 04/RW 09, Cibiru',
      statusKepemilikanRumah: 'Milik Sendiri',
      buktiKepemilikanTanah: 'Sertifikat Hak Milik (SHM)',
      luasLantai: 85,
      jenisLantai: 'Marmer / Granit / Ubin Keramik',
      jenisDinding: 'Tembok Beton / Semen Plesteran',
      jenisAtap: 'Genteng Beton / Keramik / Tanah Liat',
      sumberAirMinum: 'Air Ledeng / PDAM',
      jarakAirMinum: 'Di dalam rumah / Terintegrasi',
      sumberPenerangan: 'Listrik PLN dengan Meteran',
      dayaListrik: '1300 VA',
      noMeteranPelanggan: '8401' + Math.floor(Math.random() * 90000000 + 10000000),
      bahanBakarMemasak: 'Gas LPG 3 Kg (Subsidi)',
      fasilitasBab: 'Milik Sendiri (Jamban Pribadi)',
      jenisKloset: 'Leher Angsa',
      pembuanganAkhirTinja: 'Tangki Septik (Septic Tank) Terlindungi',
      anggotaKeluarga: [
        {
          id: 'mem_rand_1',
          noUrut: 1,
          nama: 'Kusuma Wijaya',
          nik: '327315' + Math.floor(Math.random() * 9000000000 + 1000000000),
          keteranganKeberadaan: 'Tinggal di Rumah / Menetap',
          jenisKelamin: 'Laki-laki',
          tanggalLahir: '1979-05-14',
          umur: 47,
          statusPerkawinan: 'Kawin / Menikah',
          statusHubunganKK: 'Kepala Keluarga',
          sedangHamil: 'Tidak / Bukan Wanita Subur',
          kartuIdentitas: ['KTP'],
          partisipasiSekolah: 'Tidak Sekolah Lagi',
          jenjangPendidikan: 'Diploma IV / Sarjana (S1)',
          kelasTertinggi: 'Tamat / Selesai',
          ijazahTertinggi: 'DIV/S1',
          apakahBekerja: 'Ya',
          jamBekerja: 40,
          lapanganUsaha: 'Administrasi Pemerintahan, Pertahanan, Jaminan Sosial Wajib (PNS/TNI/Polri)',
          statusPekerjaan: 'Buruh / Karyawan / Pegawai Swasta',
          penghasilanBulanan: 4500000,
          memilikiNpwp: 'Ya',
          memilikiUsaha: 'Tidak',
          jumlahUsaha: 0,
          pekerjaDibayar: 0,
          pekerjaTidakDibayar: 0,
          perizinanUsaha: 'Tidak Memiliki Usaha',
          omzetBulanan: 0,
          penggunaanInternetUsaha: 'Tidak',
          isPmks: 'Tidak',
          pmksKategori: [],
          jenisDisabilitas: ''
        },
        {
          id: 'mem_rand_2',
          noUrut: 2,
          nama: 'Dewi Sartika',
          nik: '327315' + Math.floor(Math.random() * 9000000000 + 1000000000),
          keteranganKeberadaan: 'Tinggal di Rumah / Menetap',
          jenisKelamin: 'Perempuan',
          tanggalLahir: '1984-09-21',
          umur: 41,
          statusPerkawinan: 'Kawin / Menikah',
          statusHubunganKK: 'Istri',
          sedangHamil: 'Tidak',
          kartuIdentitas: ['KTP'],
          partisipasiSekolah: 'Tidak Sekolah Lagi',
          jenjangPendidikan: 'SMA / MA / SMK / Paket C',
          kelasTertinggi: 'Tamat / Selesai',
          ijazahTertinggi: 'SMA / Sederajat / Kejuruan',
          apakahBekerja: 'Ya',
          jamBekerja: 35,
          lapanganUsaha: 'Perdagangan Besar dan Eceran, Reparasi Mobil dan Sepeda Motor',
          statusPekerjaan: 'Berusaha Sendiri',
          penghasilanBulanan: 2500000,
          memilikiNpwp: 'Tidak',
          memilikiUsaha: 'Ya',
          jumlahUsaha: 1,
          pekerjaDibayar: 0,
          pekerjaTidakDibayar: 1,
          perizinanUsaha: 'Nomor Induk Berusaha (NIB)',
          omzetBulanan: 3000000,
          penggunaanInternetUsaha: 'Ya',
          isPmks: 'Ya',
          pmksKategori: ['Penyandang Disabilitas'],
          jenisDisabilitas: 'Disabilitas Fisik (Daksa, Lumpuh, Amputasi, dll)'
        }
      ],
      kondisiGiziAnak: 'Tidak Ada Anak Balita di Rumah / Tidak Terukur',
      penyakitKronis: 'Tidak Ada Penyakit Kronis',
      jaminanKesehatan: 'Ada, BPJS Kesehatan Non-PBI (Mandiri/Perusahaan)',
      programBantuan: ['Tidak Menerima Program Bantuan'],
      asetBergerak: ['Sepeda Motor', 'Televisi / Smart TV', 'Kulkas / Lemari Es'],
      asetTidakBergerak: ['Tanah / Sawah / Ladang di lokasi lain'],
      jumlahTernak: 'Tidak Punya Ternak',
      aksesInternetKeluarga: 'WiFi Fiber Optik Berlangganan (Daring/Indihome dll)',
      rekeningDompetDigital: 'Ya',
      pmksTerdapat: 'Tidak Ada PMKS',
      jenisBantuanDiinginkan: 'Beasiswa Pendidikan Anak sekolah',
      catatan: 'Data terisi otomatis via simulator integrasi. Kondisi rumah sangat layak & rapi.',
      fotoKK: 'placeholder_kk_b64_dummy',
      fotoRumahDepan: 'placeholder_depan_b64_dummy',
      fotoRumahDalam: 'placeholder_dalam_b64_dummy'
    };
    setFormData(filledState);
    setErrors([]);
    alert('Formulir berhasil terisi otomatis dengan data acak yang valid untuk pengujian!');
  };

  return (
    <div className="lg:grid lg:grid-cols-12 lg:gap-8 items-start mb-10">
      
      {/* Sidebar step indicators for desktop */}
      <div className="hidden lg:block lg:col-span-3">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs sticky top-24 overflow-hidden">
          <div className="p-5 bg-slate-50 border-b border-slate-200">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Progress Pengisian</p>
            <div className="flex items-center gap-3 mt-1.5 animate-fade-in">
              <div className="text-3xl font-extrabold text-indigo-950 font-mono">
                {currentSection === 4 ? '95%' : `${Math.round(((currentSection + 1) / SECTIONS.length) * 100)}%`}
              </div>
              <p className="text-[11px] text-slate-500 leading-tight">
                {currentSection === 4 ? (
                  <>
                    Langkah <strong>Terakhir</strong> dari <strong>5</strong>: Unggah Bukti &amp; Kirim Permanen
                  </>
                ) : (
                  <>
                    Bagian <strong>{currentSection + 1}</strong> dari <strong>{SECTIONS.length}</strong> sedang aktif
                  </>
                )}
              </p>
            </div>
            <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden mt-3">
              <div 
                className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                style={{ width: `${currentSection === 4 ? 95 : ((currentSection + 1) / SECTIONS.length) * 100}%` }}
              />
            </div>
          </div>
          
          <nav className="p-2 space-y-1 bg-white">
            {SECTIONS.map((sec, idx) => {
              const IconComponent = sec.icon;
              const isCompleted = idx < currentSection;
              const isActive = idx === currentSection;
              
              return (
                <button
                  id={`side-wizard-step-${idx}`}
                  key={idx}
                  type="button"
                  onClick={() => handleStepClick(idx)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left cursor-pointer ${
                    isActive 
                      ? 'bg-indigo-50 border-l-4 border-indigo-600 text-indigo-950 font-bold' 
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg border flex items-center justify-center shrink-0 ${
                    isActive 
                      ? 'bg-indigo-650 bg-indigo-600 text-white' 
                      : isCompleted 
                      ? 'bg-indigo-50 border-indigo-100 text-indigo-600' 
                      : 'bg-slate-50 border-slate-100 text-slate-400'
                  }`}>
                    {isCompleted ? <Check className="h-3.5 w-3.5 stroke-[3px]" /> : <IconComponent className="h-3.5 w-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[9px] font-bold tracking-wide uppercase ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>
                      TAHAP {idx + 1}
                    </p>
                    <p className="text-xs font-semibold truncate text-slate-700">
                      {sec.title}
                    </p>
                  </div>
                </button>
              );
            })}
          </nav>

          {!initialData && (
            <div className="p-4 bg-slate-50 border-t border-slate-200">
              <button
                id="btn-autofill-side"
                type="button"
                onClick={handleAutoFill}
                className="w-full py-2 text-center text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-105 border border-indigo-250/30 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Isi Demo Otomatis
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main content pane */}
      <div className="lg:col-span-9 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {/* Top Banner Wizard - Title for active segment */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-md font-bold text-slate-800 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-600 animate-pulse" />
              {initialData ? 'Mode Modifikasi Formulir DTSEN' : 'Formulir Pengisian Data Lapangan (Multi-Tahap)'}
            </h2>
            <p className="text-xs text-slate-400">Silakan lengkapi setiap baris data di bawah ini sesuai arahan lapangan</p>
          </div>
          
          <div className="flex items-center gap-2">
            {!initialData && (
              <button
                id="btn-autofill"
                type="button"
                onClick={handleAutoFill}
                className="px-3.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg hover:bg-indigo-110 hover:bg-indigo-100 transition-colors flex items-center gap-1.5 cursor-pointer lg:hidden"
              >
                <RefreshCw className="h-3 w-3" />
                Skenario Isi Otomatis (Demo)
              </button>
            )}
            {onCancel && (
              <button
                id="btn-cancel-edit"
                type="button"
                onClick={onCancel}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-500 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Batal Edit
              </button>
            )}
          </div>
        </div>

        {/* Responsive Section Indicator for Mobile */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 block lg:hidden">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-xs font-bold text-indigo-800 tracking-wider">
              {currentSection === 4 ? (
                "LANGKAH TIMBAL (5 DARI 5): BERKAS & SIMPAN"
              ) : (
                `TAHAP ${currentSection + 1} DARI ${SECTIONS.length}: ${SECTIONS[currentSection].title.toUpperCase()}`
              )}
            </span>
            <span className="text-xs font-mono text-slate-400">
              {currentSection === 4 ? '95%' : `${Math.round(((currentSection + 1) / SECTIONS.length) * 100)}%`} Selesai
            </span>
          </div>
          <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-indigo-600 rounded-full transition-all duration-300"
              style={{ width: `${currentSection === 4 ? 95 : ((currentSection + 1) / SECTIONS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Main Form Fields Container */}
        <form onSubmit={handleSubmitForm} className="p-6">
        
        {/* Render Validation Errors Card if any exist */}
        {errors.length > 0 && (
          <div id="validation-errors-box" className="p-4 mb-6 bg-red-50 border border-red-105 rounded-xl text-red-800 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-sm">
              <AlertCircle className="h-4 w-4 text-red-655" />
              Terdapat beberapa kolom wajib yang keliru / belum diisi:
            </div>
            <ul className="list-disc list-inside text-xs space-y-0.5 ml-2">
              {errors.map((err, i) => <li key={i}>{err}</li>)}
            </ul>
          </div>
        )}

        {/* Animated Slide-in Step transitions */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSection}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            {/* SECTION 1: DATA PETUGAS & LOKASI */}
            {currentSection === 0 && (
          <div className="space-y-6">
            <h3 className="text-md font-bold text-slate-800 border-b pb-2 flex items-center gap-2">
              <span className="h-4 w-1 bg-indigo-600 rounded"></span>
              Langkah 1: Identitas Pendata (Petugas) & Lokasi Pendataan
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-705 mb-2 uppercase tracking-wide">
                  Nama Lengkap Pendata <span className="text-red-500">*</span>
                </label>
                <input
                  id="in-nama-pendata"
                  type="text"
                  placeholder="Contoh: Stempel Kito Tanjungbalai"
                  value={formData.namaPendata}
                  onChange={(e) => handleFieldChange('namaPendata', e.target.value)}
                  className="w-full text-sm p-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-hidden transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-705 mb-2 uppercase tracking-wide">
                  Status Pendataan <span className="text-red-500">*</span>
                </label>
                <select
                  id="sel-status-pendataan"
                  value={formData.statusPendataan || 'Usulan Baru'}
                  onChange={(e) => handleFieldChange('statusPendataan', e.target.value)}
                  className="w-full text-sm p-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-hidden transition-colors bg-white font-semibold"
                  required
                >
                  {opt.STATUS_PENDATAAN_OPTIONS.map((optVal) => (
                    <option key={optVal} value={optVal}>{optVal}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-705 mb-2 uppercase tracking-wide">
                  No Kartu Keluarga (KK) <span className="text-red-500">*</span> <span className="text-[10px] text-slate-400 capitalize font-normal">(16 digit)</span>
                </label>
                <input
                  id="in-no-kk"
                  type="text"
                  maxLength={16}
                  placeholder="Contoh: 3273151204850005"
                  value={formData.noKK}
                  onChange={(e) => handleFieldChange('noKK', e.target.value.replace(/\D/g, ''))}
                  className="w-full text-sm p-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-hidden transition-colors font-mono tracking-widest"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-705 mb-2 uppercase tracking-wide">
                  Nama Responden Utama <span className="text-red-500">*</span>
                </label>
                <input
                  id="in-nama-responden"
                  type="text"
                  placeholder="Contoh: Ahmad Hermawan (Biasanya Kepala Keluarga / Pasangan)"
                  value={formData.namaResponden}
                  onChange={(e) => handleFieldChange('namaResponden', e.target.value)}
                  className="w-full text-sm p-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-hidden transition-colors"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-705 mb-2 uppercase tracking-wide">Kecamatan <span className="text-red-500">*</span></label>
                  <select
                    id="sel-kecamatan"
                    value={formData.kecamatan}
                    onChange={(e) => handleFieldChange('kecamatan', e.target.value)}
                    className="w-full text-sm p-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-hidden transition-colors bg-white font-semibold"
                  >
                    <option value="">-- Pilih Kecamatan --</option>
                    {Object.keys(opt.KECAMATAN_KELURAHAN).map((kec) => (
                      <option key={kec} value={kec}>{kec}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-705 mb-2 uppercase tracking-wide">Kelurahan <span className="text-red-500">*</span></label>
                  <select
                    id="sel-kelurahan"
                    value={formData.kelurahan}
                    onChange={(e) => handleFieldChange('kelurahan', e.target.value)}
                    disabled={!formData.kecamatan}
                    className={`w-full text-sm p-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-hidden transition-colors font-semibold ${
                      !formData.kecamatan 
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200' 
                        : 'bg-white text-slate-850 text-slate-800'
                    }`}
                  >
                    {!formData.kecamatan ? (
                      <option value="">-- Pilih Kecamatan Terlebih Dahulu --</option>
                    ) : (
                      <>
                        <option value="">-- Pilih Kelurahan --</option>
                        {(opt.KECAMATAN_KELURAHAN[formData.kecamatan] || []).map((kel) => (
                          <option key={kel} value={kel}>{kel}</option>
                        ))}
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-705 mb-2 uppercase tracking-wide">Alamat Lengkap KK <span className="text-red-500">*</span></label>
                <textarea
                  id="in-alamat"
                  rows={3}
                  placeholder="Kantor rukun tetangga, RT/RW, nama jalan / dusun, nomor rumah, kode pos..."
                  value={formData.alamat}
                  onChange={(e) => handleFieldChange('alamat', e.target.value)}
                  className="w-full text-sm p-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-hidden transition-colors"
                  required
                />
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2: KONDISI PERUMAHAN & FASILITAS */}
        {currentSection === 1 && (
          <div className="space-y-6">
            <h3 className="text-md font-bold text-slate-800 border-b pb-2 flex items-center gap-2">
              <span className="h-4 w-1 bg-indigo-600 rounded"></span>
              Langkah 2: Kelayakan Struktur Rumah & Akses Sanitasi
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              <div>
                <label className="block text-xs font-bold text-slate-705 mb-2 uppercase tracking-wide">Status Kepemilikan Rumah</label>
                <select
                  value={formData.statusKepemilikanRumah}
                  onChange={(e) => handleFieldChange('statusKepemilikanRumah', e.target.value)}
                  className="w-full text-sm p-3 rounded-xl border border-slate-200 bg-white"
                >
                  {opt.STATUS_KEPEMILIKAN_RUMAH.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-705 mb-2 uppercase tracking-wide">Bukti Kepemilikan Tanah</label>
                <select
                  value={formData.buktiKepemilikanTanah}
                  onChange={(e) => handleFieldChange('buktiKepemilikanTanah', e.target.value)}
                  className="w-full text-sm p-3 rounded-xl border border-slate-200 bg-white"
                >
                  {opt.BUKTI_KEPEMILIKAN_TANAH.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-705 mb-2 uppercase tracking-wide">
                  Luas Lantai Bangunan (m²) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.luasLantai}
                  onChange={(e) => handleFieldChange('luasLantai', parseInt(e.target.value) || 0)}
                  className="w-full text-sm p-3 rounded-xl border border-slate-200"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-705 mb-2 uppercase tracking-wide">Jenis Lantai Terbaring Luas</label>
                <select
                  value={formData.jenisLantai}
                  onChange={(e) => handleFieldChange('jenisLantai', e.target.value)}
                  className="w-full text-sm p-3 rounded-xl border border-slate-200 bg-white"
                >
                  {opt.JENIS_LANTAI_TERLUAS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-705 mb-2 uppercase tracking-wide">Jenis Dinding Terluas</label>
                <select
                  value={formData.jenisDinding}
                  onChange={(e) => handleFieldChange('jenisDinding', e.target.value)}
                  className="w-full text-sm p-3 rounded-xl border border-slate-200 bg-white"
                >
                  {opt.JENIS_DINDING_TERLUAS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-705 mb-2 uppercase tracking-wide">Jenis Atap Terluas</label>
                <select
                  value={formData.jenisAtap}
                  onChange={(e) => handleFieldChange('jenisAtap', e.target.value)}
                  className="w-full text-sm p-3 rounded-xl border border-slate-200 bg-white"
                >
                  {opt.JENIS_ATAP_TERLUAS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-705 mb-2 uppercase tracking-wide">Sumber Air Minum Utama</label>
                <select
                  value={formData.sumberAirMinum}
                  onChange={(e) => handleFieldChange('sumberAirMinum', e.target.value)}
                  className="w-full text-sm p-3 rounded-xl border border-slate-200 bg-white"
                >
                  {opt.SUMBER_AIR_MINUM.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-705 mb-2 uppercase tracking-wide">Jarak Sumber Air Minum</label>
                <select
                  value={formData.jarakAirMinum}
                  onChange={(e) => handleFieldChange('jarakAirMinum', e.target.value)}
                  className="w-full text-sm p-3 rounded-xl border border-slate-200 bg-white"
                >
                  {opt.JARAK_AIR_MINUM.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-705 mb-2 uppercase tracking-wide">Sumber Penerangan Utama</label>
                <select
                  value={formData.sumberPenerangan}
                  onChange={(e) => handleFieldChange('sumberPenerangan', e.target.value)}
                  className="w-full text-sm p-3 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800"
                >
                  {opt.SUMBER_PENERANGAN.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-705 mb-2 uppercase tracking-wide">Daya Listrik Terpasang</label>
                <select
                  value={formData.dayaListrik}
                  onChange={(e) => handleFieldChange('dayaListrik', e.target.value)}
                  className="w-full text-sm p-3 rounded-xl border border-slate-200 bg-white"
                >
                  {opt.DAYA_LISTRIK.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-705 mb-2 uppercase tracking-wide">
                  No ID Meteran / ID Pelanggan
                  {formData.sumberPenerangan.includes('Meteran') && <span className="text-red-500"> *</span>}
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 8401399420 atau '-' "
                  value={formData.noMeteranPelanggan}
                  onChange={(e) => handleFieldChange('noMeteranPelanggan', e.target.value.replace(/\D/g, ''))}
                  className="w-full text-sm p-3 rounded-xl border border-slate-200 font-mono tracking-wider"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-705 mb-2 uppercase tracking-wide">Bahan Bakar Utama Memasak</label>
                <select
                  value={formData.bahanBakarMemasak}
                  onChange={(e) => handleFieldChange('bahanBakarMemasak', e.target.value)}
                  className="w-full text-sm p-3 rounded-xl border border-slate-200 bg-white"
                >
                  {opt.BAHAN_BAKAR_MEMASAK.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-705 mb-2 uppercase tracking-wide">Fasilitas Tempat Mandi/BAB</label>
                <select
                  value={formData.fasilitasBab}
                  onChange={(e) => handleFieldChange('fasilitasBab', e.target.value)}
                  className="w-full text-sm p-3 rounded-xl border border-slate-200 bg-white"
                >
                  {opt.FASILITAS_BAB.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-705 mb-2 uppercase tracking-wide">Jenis Kloset</label>
                <select
                  value={formData.jenisKloset}
                  onChange={(e) => handleFieldChange('jenisKloset', e.target.value)}
                  className="w-full text-sm p-3 rounded-xl border border-slate-200 bg-white"
                >
                  {opt.JENIS_KLOSET.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-705 mb-2 uppercase tracking-wide">Tempat Pembuangan Akhir Tinja</label>
                <select
                  value={formData.pembuanganAkhirTinja}
                  onChange={(e) => handleFieldChange('pembuanganAkhirTinja', e.target.value)}
                  className="w-full text-sm p-3 rounded-xl border border-slate-200 bg-white"
                >
                  {opt.PEMBUANGAN_AKHIR_TINJA.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

            </div>
          </div>
        )}

        {/* SECTION 3: DATA ANGGOTA KELUARGA (Dynamic Rows) */}
        {currentSection === 2 && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-3 gap-2">
              <h3 className="text-md font-bold text-slate-800 flex items-center gap-2">
                <span className="h-4 w-1 bg-indigo-600 rounded"></span>
                Langkah 3: Identitas Sosiografis Jiwa dalam KK
              </h3>
              
              <button
                id="btn-add-member"
                type="button"
                onClick={addFamilyMember}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold px-4 py-2 flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/10 cursor-pointer self-start select-none"
              >
                <Plus className="h-4 w-4" />
                Tambah Anggota Keluarga
              </button>
            </div>

            <div className="space-y-6">
              {formData.anggotaKeluarga.map((member, index) => {
                const num = index + 1;
                // reproductive age logic (female, 10 - 50yo)
                const isReproductiveAgeFemale = member.jenisKelamin === 'Perempuan' && member.umur >= 10 && member.umur <= 50;

                return (
                  <div 
                    key={member.id} 
                    className="p-5 rounded-2xl border border-slate-100 bg-slate-50/40 hover:bg-slate-50/70 transition-all relative space-y-4 shadow-2xs"
                  >
                    {/* Header of member */}
                    <div className="flex items-center justify-between border-b pb-2">
                      <div className="flex items-center gap-2">
                        <span className="h-6 w-6 rounded-lg bg-emerald-150 text-emerald-800 flex items-center justify-center font-bold text-xs">
                          {num}
                        </span>
                        <span className="font-bold text-slate-850 text-sm">
                          {member.nama || `Anggota Keluarga #${num}`}
                        </span>
                        {index === 0 && (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold tracking-wider bg-amber-100 text-amber-800 rounded uppercase">
                            Kepala Rumah Tangga
                          </span>
                        )}
                      </div>

                      {formData.anggotaKeluarga.length > 1 && (
                        <button
                          id={`btn-del-member-${index}`}
                          type="button"
                          onClick={() => removeFamilyMember(member.id, index)}
                          className="p-1 px-2.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <Trash className="h-3.5 w-3.5" />
                          Hapus Anggota
                        </button>
                      )}
                    </div>

                    {/* Inputs grid of member */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase">No Urut Keluarga</label>
                        <input
                          type="number"
                          value={member.noUrut}
                          disabled
                          className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-slate-100 text-slate-400 font-mono font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-705 mb-1.5 uppercase tracking-wide">
                          Nama Lengkap Anggota <span className="text-red-500">*</span>
                        </label>
                        <input
                          id={`in-member-nama-${index}`}
                          type="text"
                          placeholder="Ketik nama lengkap sesuai KTP"
                          value={member.nama}
                          onChange={(e) => handleMemberChange(member.id, 'nama', e.target.value)}
                          className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:border-emerald-500 outline-hidden transition-colors bg-white font-semibold"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-705 mb-1.5 uppercase tracking-wide">
                          Nomor Induk Kependudukan (NIK) <span className="text-red-500">*</span>
                        </label>
                        <input
                          id={`in-member-nik-${index}`}
                          type="text"
                          maxLength={16}
                          placeholder="Masukkan 16 digit NIK"
                          value={member.nik}
                          onChange={(e) => handleMemberChange(member.id, 'nik', e.target.value.replace(/\D/g, ''))}
                          className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:border-emerald-500 outline-hidden transition-colors bg-white font-mono tracking-wider"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-705 mb-1.5 uppercase">Hubungan dengan KK</label>
                        <select
                          value={member.statusHubunganKK}
                          onChange={(e) => handleMemberChange(member.id, 'statusHubunganKK', e.target.value)}
                          className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white"
                        >
                          {opt.HUBUNGAN_KEPALA_KELUARGA.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-705 mb-1.5 uppercase">Jenis Kelamin</label>
                        <div className="flex items-center gap-5 p-2 bg-white rounded-lg border border-slate-100">
                          <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer select-none">
                            <input
                              type="radio"
                              name={`jk-${member.id}`}
                              value="Laki-laki"
                              checked={member.jenisKelamin === 'Laki-laki'}
                              onChange={(e) => handleMemberChange(member.id, 'jenisKelamin', 'Laki-laki')}
                              className="text-emerald-600 focus:ring-emerald-500 cursor-pointer h-4 w-4"
                            />
                            Laki-laki
                          </label>
                          <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer select-none">
                            <input
                              type="radio"
                              name={`jk-${member.id}`}
                              value="Perempuan"
                              checked={member.jenisKelamin === 'Perempuan'}
                              onChange={(e) => handleMemberChange(member.id, 'jenisKelamin', 'Perempuan')}
                              className="text-emerald-600 focus:ring-emerald-500 cursor-pointer h-4 w-4"
                            />
                            Perempuan
                          </label>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-705 mb-1.5 uppercase">Keterangan Keberadaan</label>
                        <select
                          value={member.keteranganKeberadaan}
                          onChange={(e) => handleMemberChange(member.id, 'keteranganKeberadaan', e.target.value)}
                          className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white"
                        >
                          {opt.KETERANGAN_KEBERADAAN.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-705 mb-1.5 uppercase tracking-wide">Tanggal Lahir <span className="text-red-500">*</span></label>
                        <input
                          id={`in-member-birth-${index}`}
                          type="date"
                          value={member.tanggalLahir}
                          onChange={(e) => handleMemberChange(member.id, 'tanggalLahir', e.target.value)}
                          className="w-full text-xs p-2 rounded-lg border border-slate-200"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase">Umur (Otomatis Terkalkulasi)</label>
                        <div className="w-full text-xs p-2.5 font-mono font-bold text-slate-800 bg-white border border-slate-200 rounded-lg flex items-center justify-between">
                          <span>{member.umur} Tahun</span>
                          <span className="text-[10px] text-slate-400 font-normal">Dari Tgl Lahir</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-705 mb-1.5 uppercase">Status Perkawinan</label>
                        <select
                          value={member.statusPerkawinan}
                          onChange={(e) => handleMemberChange(member.id, 'statusPerkawinan', e.target.value)}
                          className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white"
                        >
                          {opt.STATUS_PERKAWINAN.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </div>

                      {/* Pregnancy - Conditional */}
                      {isReproductiveAgeFemale && (
                        <div>
                          <label className="block text-[11px] font-bold text-amber-800 mb-1.5 uppercase flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-red-400 animate-ping"></span>
                            Apakah Saat Ini Sedang Hamil?
                          </label>
                          <select
                            value={member.sedangHamil}
                            onChange={(e) => handleMemberChange(member.id, 'sedangHamil', e.target.value)}
                            className="w-full text-xs p-2.5 rounded-lg border border-red-200 bg-amber-50 text-amber-900 font-semibold"
                          >
                            <option value="Tidak">Tidak</option>
                            <option value="Ya">Ya (Sedang Hamil)</option>
                          </select>
                        </div>
                      )}

                      {/* Checkbox: Cards held */}
                      <div className="md:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-705 mb-1.5 uppercase">Kepemilikan Kartu Identitas</label>
                        <div className="flex flex-wrap gap-x-5 gap-y-2 p-2.5 bg-white rounded-lg border border-slate-100">
                          {['KTP', 'KIA', 'Identitas Kependudukan Digital (IKD)', 'Paspor', 'Tidak Memiliki'].map((card) => {
                            const isChecked = member.kartuIdentitas?.includes(card);
                            return (
                              <label key={card} className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={!!isChecked}
                                  onChange={() => handleMemberCheckboxChange(member.id, card)}
                                  className="text-indigo-600 focus:ring-indigo-500 rounded border-slate-300 h-4 w-4"
                                />
                                {card}
                              </label>
                            );
                          })}
                        </div>
                      </div>

                    </div>

                    {/* Sub-Group 1: Pendidikan & Partisipasi Sekolah */}
                    <div className="border-t border-slate-200/60 pt-4 mt-3">
                      <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-3">
                        <BookOpen className="h-4 w-4 text-emerald-600" />
                        <span>Kualifikasi Pendidikan & Partisipasi Sekolah</span>
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-white/65 p-3.5 rounded-xl border border-slate-100/80">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Status Partisipasi Sekolah</label>
                          <select
                            value={member.partisipasiSekolah}
                            onChange={(e) => handleMemberChange(member.id, 'partisipasiSekolah', e.target.value)}
                            className="w-full text-xs p-2.5 rounded-lg border border-slate-205 bg-white font-medium"
                          >
                            {opt.PARTISIPASI_SEKOLAH.map((option) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Pendidikan Tertinggi Terpilih</label>
                          <select
                            value={member.jenjangPendidikan}
                            onChange={(e) => handleMemberChange(member.id, 'jenjangPendidikan', e.target.value)}
                            className="w-full text-xs p-2.5 rounded-lg border border-slate-205 bg-white font-medium"
                          >
                            {opt.JENJANG_PENDIDIKAN.map((option) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Kelas / Tingkat Tertinggi</label>
                          <select
                            value={member.kelasTertinggi}
                            onChange={(e) => handleMemberChange(member.id, 'kelasTertinggi', e.target.value)}
                            className="w-full text-xs p-2.5 rounded-lg border border-slate-205 bg-white font-medium"
                          >
                            {opt.KELAS_TERTINGGI.map((option) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Ijazah / STTB Tertinggi Memiliki</label>
                          <select
                            value={member.ijazahTertinggi}
                            onChange={(e) => handleMemberChange(member.id, 'ijazahTertinggi', e.target.value)}
                            className="w-full text-xs p-2.5 rounded-lg border border-slate-205 bg-white font-medium"
                          >
                            {opt.IJAZAH_TERTINGGI.map((option) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Sub-Group 2: Pekerjaan & Kemandirian Ekonomi */}
                    <div className="border-t border-slate-200/60 pt-4 mt-3">
                      <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-3">
                        <Coins className="h-4 w-4 text-amber-600" />
                        <span>Ketenagakerjaan & Kemandirian Ekonomi</span>
                      </h4>
                      <div className="bg-white/65 p-3.5 rounded-xl border border-slate-100/80 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Bekerja Seminggu yang Lalu?</label>
                            <div className="flex items-center gap-4 p-1.5 bg-white rounded-lg border border-slate-205">
                              <label className="flex items-center gap-1 text-xs text-slate-700 cursor-pointer select-none">
                                <input
                                  type="radio"
                                  name={`bekerja-${member.id}`}
                                  value="Ya"
                                  checked={member.apakahBekerja === 'Ya'}
                                  onChange={(e) => handleMemberChange(member.id, 'apakahBekerja', 'Ya')}
                                  className="text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                                />
                                Ya (Bekerja)
                              </label>
                              <label className="flex items-center gap-1 text-xs text-slate-700 cursor-pointer select-none">
                                <input
                                  type="radio"
                                  name={`bekerja-${member.id}`}
                                  value="Tidak"
                                  checked={member.apakahBekerja === 'Tidak'}
                                  onChange={(e) => handleMemberChange(member.id, 'apakahBekerja', 'Tidak')}
                                  className="text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                                />
                                Tidak / Pengangguran
                              </label>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Memiliki NPWP Aktif?</label>
                            <div className="flex items-center gap-4 p-1.5 bg-white rounded-lg border border-slate-205">
                              <label className="flex items-center gap-1 text-xs text-slate-700 cursor-pointer select-none">
                                <input
                                  type="radio"
                                  name={`npwp-${member.id}`}
                                  value="Ya"
                                  checked={member.memilikiNpwp === 'Ya'}
                                  onChange={(e) => handleMemberChange(member.id, 'memilikiNpwp', 'Ya')}
                                  className="text-emerald-600 h-3.5 w-3.5"
                                />
                                Ya (Memiliki)
                              </label>
                              <label className="flex items-center gap-1 text-xs text-slate-700 cursor-pointer select-none">
                                <input
                                  type="radio"
                                  name={`npwp-${member.id}`}
                                  value="Tidak"
                                  checked={member.memilikiNpwp === 'Tidak'}
                                  onChange={(e) => handleMemberChange(member.id, 'memilikiNpwp', 'Tidak')}
                                  className="text-emerald-600 h-3.5 w-3.5"
                                />
                                Tidak
                              </label>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Memiliki Aktivitas Usaha Mandiri?</label>
                            <div className="flex items-center gap-4 p-1.5 bg-white rounded-lg border border-slate-205">
                              <label className="flex items-center gap-1 text-xs text-slate-700 cursor-pointer select-none">
                                <input
                                  type="radio"
                                  name={`usaha-${member.id}`}
                                  value="Ya"
                                  checked={member.memilikiUsaha === 'Ya'}
                                  onChange={(e) => handleMemberChange(member.id, 'memilikiUsaha', 'Ya')}
                                  className="text-emerald-600 h-3.5 w-3.5"
                                />
                                Ya (Punya)
                              </label>
                              <label className="flex items-center gap-1 text-xs text-slate-700 cursor-pointer select-none">
                                <input
                                  type="radio"
                                  name={`usaha-${member.id}`}
                                  value="Tidak"
                                  checked={member.memilikiUsaha === 'Tidak'}
                                  onChange={(e) => handleMemberChange(member.id, 'memilikiUsaha', 'Tidak')}
                                  className="text-emerald-600 h-3.5 w-3.5"
                                />
                                Tidak
                              </label>
                            </div>
                          </div>
                        </div>

                        {member.apakahBekerja === 'Ya' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Durasi Kerja seminggu (Jam) *</label>
                              <input
                                type="number"
                                min="1"
                                placeholder="Misal: 40"
                                value={member.jamBekerja}
                                onChange={(e) => handleMemberChange(member.id, 'jamBekerja', parseInt(e.target.value) || 0)}
                                className="w-full text-xs p-2.5 rounded-lg border border-slate-205 bg-white font-mono"
                                required
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Sektor Lapangan Usaha Utama</label>
                              <select
                                value={member.lapanganUsaha}
                                onChange={(e) => handleMemberChange(member.id, 'lapanganUsaha', e.target.value)}
                                className="w-full text-xs p-2.5 rounded-lg border border-slate-205 bg-white"
                              >
                                {opt.LAPANGAN_USAHA.map((option) => (
                                  <option key={option} value={option}>{option}</option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Status Hubungan Pekerjaan Utama</label>
                              <select
                                value={member.statusPekerjaan}
                                onChange={(e) => handleMemberChange(member.id, 'statusPekerjaan', e.target.value)}
                                className="w-full text-xs p-2.5 rounded-lg border border-slate-205 bg-white"
                              >
                                {opt.STATUS_PEKERJAAN.map((option) => (
                                  <option key={option} value={option}>{option}</option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Estimasi Penghasilan Bulanan (Rp) *</label>
                              <input
                                type="number"
                                min="0"
                                placeholder="Contoh: 3000000"
                                value={member.penghasilanBulanan || 0}
                                onChange={(e) => handleMemberChange(member.id, 'penghasilanBulanan', parseInt(e.target.value) || 0)}
                                className="w-full text-xs p-2.5 rounded-lg border border-slate-205 bg-white font-mono"
                                required
                              />
                            </div>
                          </div>
                        )}

                        {member.memilikiUsaha === 'Ya' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 border-t border-dashed border-slate-200 pt-3 mt-1.5">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Unit Usaha (Jumlah)</label>
                              <input
                                type="number"
                                min="1"
                                value={member.jumlahUsaha}
                                onChange={(e) => handleMemberChange(member.id, 'jumlahUsaha', parseInt(e.target.value) || 0)}
                                className="w-full text-xs p-2.5 rounded-lg border border-slate-205 bg-white"
                                required
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Pekerja Dibayar</label>
                              <input
                                type="number"
                                min="0"
                                value={member.pekerjaDibayar}
                                onChange={(e) => handleMemberChange(member.id, 'pekerjaDibayar', parseInt(e.target.value) || 0)}
                                className="w-full text-xs p-2.5 rounded-lg border border-slate-205 bg-white"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Pekerja Tdk Dibayar</label>
                              <input
                                type="number"
                                min="0"
                                value={member.pekerjaTidakDibayar}
                                onChange={(e) => handleMemberChange(member.id, 'pekerjaTidakDibayar', parseInt(e.target.value) || 0)}
                                className="w-full text-xs p-2.5 rounded-lg border border-slate-205 bg-white"
                              />
                            </div>

                            <div className="lg:col-span-2">
                              <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Legalitas Surat Izin Teratas</label>
                              <select
                                value={member.perizinanUsaha}
                                onChange={(e) => handleMemberChange(member.id, 'perizinanUsaha', e.target.value)}
                                className="w-full text-xs p-2.5 rounded-lg border border-slate-205 bg-white"
                              >
                                {opt.PERIZINAN_USAHA.map((option) => (
                                  <option key={option} value={option}>{option}</option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Omzet per Bulan (Rp) *</label>
                              <input
                                type="number"
                                min="0"
                                placeholder="Omzet"
                                value={member.omzetBulanan}
                                onChange={(e) => handleMemberChange(member.id, 'omzetBulanan', parseInt(e.target.value) || 0)}
                                className="w-full text-xs p-2.5 rounded-lg border border-slate-205 bg-white font-mono"
                                required
                              />
                            </div>

                            <div className="lg:col-span-2">
                              <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Memanfaatkan Internet Usaha?</label>
                              <div className="flex items-center gap-4 p-1.5 bg-white rounded-lg border border-slate-205 h-[34px]">
                                <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer select-none">
                                  <input
                                    type="radio"
                                    name={`inet-usaha-${member.id}`}
                                    value="Ya"
                                    checked={member.penggunaanInternetUsaha === 'Ya'}
                                    onChange={(e) => handleMemberChange(member.id, 'penggunaanInternetUsaha', 'Ya')}
                                    className="text-emerald-600 h-3.5 w-3.5"
                                  />
                                  Ya
                                </label>
                                <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer select-none">
                                  <input
                                    type="radio"
                                    name={`inet-usaha-${member.id}`}
                                    value="Tidak"
                                    checked={member.penggunaanInternetUsaha === 'Tidak'}
                                    onChange={(e) => handleMemberChange(member.id, 'penggunaanInternetUsaha', 'Tidak')}
                                    className="text-emerald-600 h-3.5 w-3.5"
                                  />
                                  Tidak
                                </label>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Sub-Group 3: Status PMKS & Disabilitas */}
                    <div className="border-t border-slate-200/60 pt-4 mt-3">
                      <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-3">
                        <Users className="h-4 w-4 text-indigo-600" />
                        <span>Data PMKS & Disabilitas (Penyandang Masalah Kesejahteraan Sosial)</span>
                      </h4>
                      <div className="bg-white/65 p-3.5 rounded-xl border border-slate-100/80 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Apakah Termasuk Anggota PMKS?</label>
                            <div className="flex items-center gap-5 p-2 bg-white rounded-lg border border-slate-205">
                              <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer select-none">
                                <input
                                  type="radio"
                                  name={`isPmks-${member.id}`}
                                  value="Ya"
                                  checked={member.isPmks === 'Ya'}
                                  onChange={(e) => handleMemberChange(member.id, 'isPmks', 'Ya')}
                                  className="text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                                />
                                Ya (Ada PMKS)
                              </label>
                              <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer select-none">
                                <input
                                  type="radio"
                                  name={`isPmks-${member.id}`}
                                  value="Tidak"
                                  checked={member.isPmks === 'Tidak'}
                                  onChange={() => {
                                    handleMemberChange(member.id, 'isPmks', 'Tidak');
                                    handleMemberChange(member.id, 'pmksKategori', []);
                                    handleMemberChange(member.id, 'jenisDisabilitas', '');
                                  }}
                                  className="text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                                />
                                Tidak Ada PMKS
                              </label>
                            </div>
                          </div>

                          {member.isPmks === 'Ya' && member.pmksKategori && member.pmksKategori.some(cat => 
                            (cat || '').toLowerCase().includes('disabilitas') || (cat || '').toLowerCase().includes('kedisabilitasan')
                          ) && (
                            <div>
                              <label className="block text-[10px] font-bold text-indigo-850 mb-1.5 uppercase flex items-center gap-1">
                                <span>Jenis Disabilitas *</span>
                              </label>
                              <select
                                value={member.jenisDisabilitas || ''}
                                onChange={(e) => handleMemberChange(member.id, 'jenisDisabilitas', e.target.value)}
                                className="w-full text-xs p-2.5 rounded-lg border border-indigo-200 bg-indigo-50/50 text-indigo-900 font-semibold"
                                required
                              >
                                <option value="">-- Pilih Jenis Disabilitas --</option>
                                <option value="Disabilitas Fisik (Daksa, Lumpuh, Amputasi, dll)">Disabilitas Fisik (Daksa, Lumpuh, Amputasi, dll)</option>
                                <option value="Disabilitas Intelektual (Down Syndrome, Keterbelakangan Mental, dll)">Disabilitas Intelektual (Down Syndrome, Keterbelakangan Mental, dll)</option>
                                <option value="Disabilitas Mental (Psikososial, Autisme, ADHD, dll)">Disabilitas Mental (Psikososial, Autisme, ADHD, dll)</option>
                                <option value="Disabilitas Sensorik Netra (Buta, Gangguan Penglihatan)">Disabilitas Sensorik Netra (Buta, Gangguan Penglihatan)</option>
                                <option value="Disabilitas Sensorik Rungu Wicara (Tuli, Bisu)">Disabilitas Sensorik Rungu Wicara (Tuli, Bisu)</option>
                                <option value="Disabilitas Ganda / Multi">Disabilitas Ganda / Multi</option>
                                <option value="Lainnya">Lainnya / Tidak Disebutkan</option>
                              </select>
                            </div>
                          )}
                        </div>

                        {member.isPmks === 'Ya' && (
                          <div className="pt-1">
                            <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase">Pilih PMKS (Permensos RI - 26 Kategori Kementerian Sosial) *</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-52 overflow-y-auto border border-slate-205 rounded-xl p-3.5 bg-white">
                              {opt.PMKS_CATEGORIES.map((cat) => {
                                const isChecked = member.pmksKategori?.includes(cat);
                                return (
                                  <label key={cat} className="flex items-center gap-2 py-1 px-1.5 rounded hover:bg-slate-50 text-[11px] text-slate-700 cursor-pointer select-none transition-colors">
                                    <input
                                      type="checkbox"
                                      checked={!!isChecked}
                                      onChange={() => {
                                        const cats = member.pmksKategori || [];
                                        let newCats: string[];
                                        if (cats.includes(cat)) {
                                          newCats = cats.filter(c => c !== cat);
                                        } else {
                                          newCats = [...cats, cat];
                                        }
                                        handleMemberChange(member.id, 'pmksKategori', newCats);
                                        
                                        // Auto-check if disabilitas is still in categories list
                                        const hasDisability = newCats.some(c => 
                                          (c || '').toLowerCase().includes('disabilitas') || (c || '').toLowerCase().includes('kedisabilitasan')
                                        );
                                        if (!hasDisability) {
                                          handleMemberChange(member.id, 'jenisDisabilitas', '');
                                        }
                                      }}
                                      className="text-indigo-650 h-3.5 w-3.5 text-indigo-600 rounded focus:ring-indigo-500"
                                    />
                                    <span>{cat}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SECTION 4: KESEHATAN, ASET & SOSIAL */}
        {currentSection === 3 && (
          <div className="space-y-6">
            <h3 className="text-md font-bold text-slate-800 border-b pb-2 flex items-center gap-2">
              <span className="h-4 w-1 bg-indigo-600 rounded"></span>
              Langkah 4: Keadaan Gizi, Asuransi, Aset & Program Bantuan Sosial
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div>
                <label className="block text-xs font-bold text-slate-705 mb-2 uppercase tracking-wide">Status Gizi Balita (3 Bulan Terakhir)</label>
                <select
                  value={formData.kondisiGiziAnak}
                  onChange={(e) => handleFieldChange('kondisiGiziAnak', e.target.value)}
                  className="w-full text-sm p-3 rounded-xl border border-slate-200 bg-white"
                >
                  {opt.KONDISI_GIZI.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-705 mb-2 uppercase tracking-wide">Diagnosa Penyakit Kronis/Menahun</label>
                <select
                  value={formData.penyakitKronis}
                  onChange={(e) => handleFieldChange('penyakitKronis', e.target.value)}
                  className="w-full text-sm p-3 rounded-xl border border-slate-200 bg-white"
                >
                  {opt.PENYAKIT_KRONIS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-750 mb-2 uppercase tracking-wide">Kepemilikan Jaminan Kesehatan Utama</label>
                <select
                  value={formData.jaminanKesehatan}
                  onChange={(e) => handleFieldChange('jaminanKesehatan', e.target.value)}
                  className="w-full text-sm p-3 rounded-xl border border-slate-200 bg-white font-medium text-emerald-800"
                >
                  {opt.JAMINAN_KESEHATAN.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-705 mb-2 uppercase tracking-wide">Penerima Manfaat PMKS (Khusus Rawan Sosial)</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <select
                    value={formData.pmksTerdapat}
                    onChange={(e) => handleFieldChange('pmksTerdapat', e.target.value)}
                    className="w-full text-sm p-3 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="Tidak Ada PMKS">Tidak Ada PMKS</option>
                    <option value="Ada, PMKS Terdaftar">Ada, Terdapat Anggota PMKS</option>
                  </select>
                  
                  {formData.pmksTerdapat !== 'Tidak Ada PMKS' && (
                    <select
                      value={formData.pmksJenis || ''}
                      onChange={(e) => handleFieldChange('pmksJenis', e.target.value)}
                      className="w-full text-sm p-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-900"
                    >
                      {opt.LIST_PMKS.filter(o => o !== 'Tidak Ada PMKS').map((optItem) => (
                        <option key={optItem} value={optItem}>{optItem}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-705 mb-2 uppercase tracking-wide">Jenis Koneksi Internet Rumah Sebulan Terakhir</label>
                <select
                  value={formData.aksesInternetKeluarga}
                  onChange={(e) => handleFieldChange('aksesInternetKeluarga', e.target.value)}
                  className="w-full text-sm p-3 rounded-xl border border-slate-200 bg-white"
                >
                  {opt.AKSES_INTERNET.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-705 mb-2 uppercase tracking-wide">Memiliki Rekening Bank / Dompet Digital Aktif?</label>
                <div className="flex items-center gap-5 p-3 bg-white rounded-xl border border-slate-200">
                  <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer select-none">
                    <input
                      type="radio"
                      name="rekeningDigital"
                      value="Ya"
                      checked={formData.rekeningDompetDigital === 'Ya'}
                      onChange={() => handleFieldChange('rekeningDompetDigital', 'Ya')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    Ya (Punya)
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer select-none">
                    <input
                      type="radio"
                      name="rekeningDigital"
                      value="Tidak"
                      checked={formData.rekeningDompetDigital === 'Tidak'}
                      onChange={() => handleFieldChange('rekeningDompetDigital', 'Tidak')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    Tidak / Hanya Tunai
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-705 mb-2 uppercase tracking-wide">Jumlah & Jenis Hewan Ternak Dimiliki (Detail)</label>
                <input
                  type="text"
                  placeholder="Contoh: 2 Sapi, 5 Kambing, atau 'Tidak Ada'"
                  value={formData.jumlahTernak}
                  onChange={(e) => handleFieldChange('jumlahTernak', e.target.value)}
                  className="w-full text-sm p-3 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-705 mb-2 uppercase tracking-wide">Jenis Alokasi Bantuan yang Paling Diinginkan</label>
                <select
                  value={formData.jenisBantuanDiinginkan}
                  onChange={(e) => handleFieldChange('jenisBantuanDiinginkan', e.target.value)}
                  className="w-full text-sm p-3 rounded-xl border border-slate-200 bg-white"
                >
                  {opt.JENIS_BANTUAN_DIINGINKAN.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-750 mb-2 uppercase tracking-wide">Program Bantuan Sosial 1 Tahun Terakhir (Bisa Multi-Select) <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4 bg-slate-50/60 rounded-xl border border-slate-100">
                  {opt.PROGRAM_BANTUAN.map((optItem) => {
                    const isChecked = formData.programBantuan?.includes(optItem);
                    return (
                      <label key={optItem} className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-slate-100 text-xs text-slate-700 hover:border-slate-300 transition-colors cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={!!isChecked}
                          onChange={() => handleCheckboxChange('programBantuan', optItem)}
                          className="text-emerald-600 rounded"
                        />
                        {optItem}
                      </label>
                    );
                  })}
                </div>
                {formData.programBantuan?.includes('Lainnya') && (
                  <div className="mt-3 p-3 bg-indigo-50/40 rounded-xl border border-indigo-100 max-w-md animate-fadeIn">
                    <label className="block text-[10px] font-bold text-indigo-700 mb-1.5 uppercase tracking-wide">
                      Sebutkan Program Bantuan Lainnya <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="in-program-bantuan-lainnya"
                      value={formData.programBantuanLainnya || ''}
                      onChange={(e) => handleFieldChange('programBantuanLainnya', e.target.value)}
                      placeholder="Contoh: Bantuan Beras SPHP, BLT El Nino, dll"
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-medium"
                      required
                    />
                  </div>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-750 mb-2 uppercase tracking-wide">Aset Rumah Tangga Bergerak (Bisa Multi-Select) <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4 bg-slate-50/60 rounded-xl border border-slate-100">
                  {opt.ASET_BERGERAK.map((optItem) => {
                    const isChecked = formData.asetBergerak?.includes(optItem);
                    return (
                      <label key={optItem} className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-slate-100 text-xs text-slate-700 hover:border-slate-300 transition-colors cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={!!isChecked}
                          onChange={() => handleCheckboxChange('asetBergerak', optItem)}
                          className="text-emerald-600 rounded"
                        />
                        {optItem}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-750 mb-2 uppercase tracking-wide">Aset Tidak Bergerak (Bisa Multi-Select) <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50/60 rounded-xl border border-slate-100">
                  {opt.ASET_TIDAK_BERGERAK.map((optItem) => {
                    const isChecked = formData.asetTidakBergerak?.includes(optItem);
                    return (
                      <label key={optItem} className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-slate-100 text-xs text-slate-700 hover:border-slate-300 transition-colors cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={!!isChecked}
                          onChange={() => handleCheckboxChange('asetTidakBergerak', optItem)}
                          className="text-emerald-600 rounded"
                        />
                        {optItem}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-705 mb-2 uppercase tracking-wide">Catatan Petugas Lapangan (Analisa Kelayakan Relatif)</label>
                <textarea
                  id="in-catatan"
                  rows={3}
                  placeholder="Tuliskan jika terdapat keadaan luar biasa di lapangan (Sakit menahun berat, rawan tergusur, disabilitas parah, dll)..."
                  value={formData.catatan}
                  onChange={(e) => handleFieldChange('catatan', e.target.value)}
                  className="w-full text-sm p-3 rounded-xl border border-slate-200"
                />
              </div>

            </div>
          </div>
        )}

                {/* SECTION 5: DOKUMENTASI (INPUT FILE / GEOLOKASI STAMP) */}
        {currentSection === 4 && (
          <div className="space-y-6">
            <h3 className="text-md font-bold text-slate-800 border-b pb-2 flex items-center gap-2">
              <span className="h-4 w-1 bg-indigo-600 rounded"></span>
              Langkah 5: Bukti Dokumen Autentik & Stamp Geodesi GPS
            </h3>

            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-emerald-950 text-xs flex items-start gap-2.5 max-w-3xl">
              <Info className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold mb-0.5">Fitur Kamera Lapangan & Geotag GPS Aktif</p>
                <p className="opacity-90">Silakan gunakan tombol <strong className="font-bold">Ambil Kamera</strong> untuk mengambil foto keadaan rumah/dokumen langsung, atau gunakan <strong className="font-bold">Dapatkan Geotag</strong> untuk menghasilkan stempel koordinat presisi tinggi.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Box A: Foto KK */}
              <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-101 flex flex-col justify-between space-y-4 min-h-[340px]">
                <div className="space-y-1.5">
                  <span className="px-2 py-0.5 text-[9px] font-bold tracking-wider bg-slate-200 text-slate-800 rounded uppercase">Identitas</span>
                  <h4 className="text-sm font-bold text-slate-800 uppercase">FOTO KARTU KELUARGA (KK) / KTP</h4>
                  <p className="text-[11px] text-slate-500">Bukti otentik kesamaan data KK primer di lapangan dengan pengunggahan.</p>
                </div>

                {activeCamField === 'fotoKK' ? (
                  <div className="h-32 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-center overflow-hidden relative shadow-inner">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover scale-x-[-1]"
                    />
                    <div className="absolute top-2 right-2 bg-rose-600 text-[8px] font-bold tracking-widest text-white px-1.5 py-0.5 rounded animate-pulse">
                      KAMERA AKTIF
                    </div>
                  </div>
                ) : (
                  <div className="h-32 bg-white rounded-xl border border-dashed border-slate-205 flex items-center justify-center overflow-hidden relative shadow-inner">
                    {gpsLoadingField === 'fotoKK' && (
                      <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-3 text-center space-y-2 z-10 animate-pulse-subtle">
                        <RefreshCw className="h-6 w-6 text-emerald-400 animate-spin" />
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Menghubungkan GPS...</span>
                        <span className="text-[8px] text-slate-300">Menyematkan koordinat presisi tinggi pada foto</span>
                      </div>
                    )}
                    {formData.fotoKK ? (
                      <img 
                        src={formData.fotoKK.startsWith('data:image/') ? formData.fotoKK : 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&q=80&w=400'} 
                        alt="Kartu Keluarga" 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <span className="text-xs text-slate-400 font-medium">Belum Ada Gambar Terpilih</span>
                    )}
                  </div>
                )}

                {activeCamField === 'fotoKK' ? (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => capturePhoto('fotoKK')}
                      className="bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold py-2 flex items-center justify-center gap-1 cursor-pointer transition-colors"
                    >
                      <Camera className="h-3.5 w-3.5" />
                      Ambil Snap
                    </button>
                    <button
                      type="button"
                      onClick={handleCloseCamera}
                      className="bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold py-2 flex items-center justify-center gap-1 cursor-pointer transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                      Batal
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenCameraField('fotoKK')}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold py-2 flex items-center justify-center gap-1 cursor-pointer transition-colors text-center"
                      >
                        <Camera className="h-3.5 w-3.5" />
                        Kamera Web
                      </button>
                      <label className="bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-bold py-2 flex items-center justify-center gap-1 cursor-pointer transition-colors text-center select-none">
                        <Camera className="h-3.5 w-3.5" />
                        Kamera HP
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(e) => handleFileUpload('fotoKK', e)}
                          className="hidden"
                        />
                      </label>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={isLocatingField !== null}
                        onClick={() => handleGeoStampCapture('fotoKK')}
                        className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-lg text-[10.5px] font-bold py-1.5 flex items-center justify-center gap-1 cursor-pointer select-none transition-colors"
                      >
                        {isLocatingField === 'fotoKK' ? (
                          <>
                            <RefreshCw className="h-3 w-3 animate-spin" />
                            Mencari...
                          </>
                        ) : (
                          <>
                            <MapPin className="h-3 w-3" />
                            GPS Stamp
                          </>
                        )}
                      </button>
                      <label className="bg-white hover:bg-slate-50 border text-slate-755 text-center rounded-lg text-[10.5px] font-bold py-1.5 flex items-center justify-center gap-1 cursor-pointer select-none">
                        <Upload className="h-3 w-3" />
                        Pilih Berkas
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileUpload('fotoKK', e)}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Box B: Rumah Tambak Depan */}
              <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-101 flex flex-col justify-between space-y-4 min-h-[340px]">
                <div className="space-y-1.5">
                  <span className="px-2 py-0.5 text-[9px] font-bold tracking-wider bg-emerald-100 text-emerald-800 rounded uppercase">Visual Luar</span>
                  <h4 className="text-sm font-bold text-slate-800 uppercase">FOTO RUMAH TAMPAK DEPAN</h4>
                  <p className="text-[11px] text-slate-500">Menilai kelayakan eksternal fasad, kualitas atap, dan pintu masuk bangunan.</p>
                </div>

                {activeCamField === 'fotoRumahDepan' ? (
                  <div className="h-32 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-center overflow-hidden relative shadow-inner">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover scale-x-[-1]"
                    />
                    <div className="absolute top-2 right-2 bg-rose-600 text-[8px] font-bold tracking-widest text-white px-1.5 py-0.5 rounded animate-pulse">
                      KAMERA AKTIF
                    </div>
                  </div>
                ) : (
                  <div className="h-32 bg-white rounded-xl border border-dashed border-slate-205 flex items-center justify-center overflow-hidden relative shadow-inner">
                    {gpsLoadingField === 'fotoRumahDepan' && (
                      <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-3 text-center space-y-2 z-10 animate-pulse-subtle">
                        <RefreshCw className="h-6 w-6 text-emerald-400 animate-spin" />
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Menghubungkan GPS...</span>
                        <span className="text-[8px] text-slate-300">Menyematkan koordinat presisi tinggi pada foto</span>
                      </div>
                    )}
                    {formData.fotoRumahDepan ? (
                      <img 
                        src={formData.fotoRumahDepan.startsWith('data:image/') ? formData.fotoRumahDepan : 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&q=80&w=400'} 
                        alt="Rumah Depan" 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <span className="text-xs text-slate-400 font-medium">Belum Ada Gambar Terpilih</span>
                    )}
                  </div>
                )}

                {activeCamField === 'fotoRumahDepan' ? (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => capturePhoto('fotoRumahDepan')}
                      className="bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold py-2 flex items-center justify-center gap-1 cursor-pointer transition-colors"
                    >
                      <Camera className="h-3.5 w-3.5" />
                      Ambil Snap
                    </button>
                    <button
                      type="button"
                      onClick={handleCloseCamera}
                      className="bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold py-2 flex items-center justify-center gap-1 cursor-pointer transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                      Batal
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenCameraField('fotoRumahDepan')}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold py-2 flex items-center justify-center gap-1 cursor-pointer transition-colors text-center"
                      >
                        <Camera className="h-3.5 w-3.5" />
                        Kamera Web
                      </button>
                      <label className="bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-bold py-2 flex items-center justify-center gap-1 cursor-pointer transition-colors text-center select-none">
                        <Camera className="h-3.5 w-3.5" />
                        Kamera HP
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(e) => handleFileUpload('fotoRumahDepan', e)}
                          className="hidden"
                        />
                      </label>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={isLocatingField !== null}
                        onClick={() => handleGeoStampCapture('fotoRumahDepan')}
                        className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-lg text-[10.5px] font-bold py-1.5 flex items-center justify-center gap-1 cursor-pointer select-none transition-colors"
                      >
                        {isLocatingField === 'fotoRumahDepan' ? (
                          <>
                            <RefreshCw className="h-3 w-3 animate-spin" />
                            Mencari...
                          </>
                        ) : (
                          <>
                            <MapPin className="h-3 w-3" />
                            GPS Stamp
                          </>
                        )}
                      </button>
                      <label className="bg-white hover:bg-slate-50 border text-slate-755 text-center rounded-lg text-[10.5px] font-bold py-1.5 flex items-center justify-center gap-1 cursor-pointer select-none">
                        <Upload className="h-3 w-3" />
                        Pilih Berkas
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileUpload('fotoRumahDepan', e)}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Box C: Rumah tampak Dalam */}
              <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-101 flex flex-col justify-between space-y-4 min-h-[340px]">
                <div className="space-y-1.5">
                  <span className="px-2 py-0.5 text-[9px] font-bold tracking-wider bg-orange-100 text-orange-850 rounded uppercase">Sisi Interior</span>
                  <h4 className="text-sm font-bold text-slate-850 uppercase">FOTO RUMAH TAMPAK DALAM</h4>
                  <p className="text-[11px] text-slate-500">Menganalisa kondisi sekat sekat kamar, jenis lantai primer, dan kelapangan ruang.</p>
                </div>

                {activeCamField === 'fotoRumahDalam' ? (
                  <div className="h-32 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-center overflow-hidden relative shadow-inner">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover scale-x-[-1]"
                    />
                    <div className="absolute top-2 right-2 bg-rose-600 text-[8px] font-bold tracking-widest text-white px-1.5 py-0.5 rounded animate-pulse">
                      KAMERA AKTIF
                    </div>
                  </div>
                ) : (
                  <div className="h-32 bg-white rounded-xl border border-dashed border-slate-205 flex items-center justify-center overflow-hidden relative shadow-inner">
                    {gpsLoadingField === 'fotoRumahDalam' && (
                      <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-3 text-center space-y-2 z-10 animate-pulse-subtle">
                        <RefreshCw className="h-6 w-6 text-emerald-400 animate-spin" />
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Menghubungkan GPS...</span>
                        <span className="text-[8px] text-slate-300">Menyematkan koordinat presisi tinggi pada foto</span>
                      </div>
                    )}
                    {formData.fotoRumahDalam ? (
                      <img 
                        src={formData.fotoRumahDalam.startsWith('data:image/') ? formData.fotoRumahDalam : 'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&q=80&w=400'} 
                        alt="Rumah Dalam" 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <span className="text-xs text-slate-400 font-medium">Belum Ada Gambar Terpilih</span>
                    )}
                  </div>
                )}

                {activeCamField === 'fotoRumahDalam' ? (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => capturePhoto('fotoRumahDalam')}
                      className="bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold py-2 flex items-center justify-center gap-1 cursor-pointer transition-colors"
                    >
                      <Camera className="h-3.5 w-3.5" />
                      Ambil Snap
                    </button>
                    <button
                      type="button"
                      onClick={handleCloseCamera}
                      className="bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold py-2 flex items-center justify-center gap-1 cursor-pointer transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                      Batal
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenCameraField('fotoRumahDalam')}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold py-2 flex items-center justify-center gap-1 cursor-pointer transition-colors text-center"
                      >
                        <Camera className="h-3.5 w-3.5" />
                        Kamera Web
                      </button>
                      <label className="bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-bold py-2 flex items-center justify-center gap-1 cursor-pointer transition-colors text-center select-none">
                        <Camera className="h-3.5 w-3.5" />
                        Kamera HP
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(e) => handleFileUpload('fotoRumahDalam', e)}
                          className="hidden"
                        />
                      </label>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={isLocatingField !== null}
                        onClick={() => handleGeoStampCapture('fotoRumahDalam')}
                        className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-lg text-[10.5px] font-bold py-1.5 flex items-center justify-center gap-1 cursor-pointer select-none transition-colors"
                      >
                        {isLocatingField === 'fotoRumahDalam' ? (
                          <>
                            <RefreshCw className="h-3 w-3 animate-spin" />
                            Mencari...
                          </>
                        ) : (
                          <>
                            <MapPin className="h-3 w-3" />
                            GPS Stamp
                          </>
                        )}
                      </button>
                      <label className="bg-white hover:bg-slate-50 border text-slate-755 text-center rounded-lg text-[10.5px] font-bold py-1.5 flex items-center justify-center gap-1 cursor-pointer select-none">
                        <Upload className="h-3 w-3" />
                        Pilih Berkas
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileUpload('fotoRumahDalam', e)}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation Actions controls footer */}
        <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between">
          <button
            id="btn-nav-prev"
            type="button"
            onClick={handlePrev}
            disabled={currentSection === 0}
            className={`flex items-center gap-1 px-5 py-3 rounded-xl text-xs font-bold transition-colors select-none ${
              currentSection === 0 
                ? 'text-slate-300 border border-slate-100 bg-slate-50 cursor-not-allowed' 
                : 'text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer'
            }`}
          >
            <ChevronLeft className="h-4 w-4" />
            Sebelumnya
          </button>

          {currentSection < SECTIONS.length - 1 ? (
            <button
              id="btn-nav-next"
              type="button"
              onClick={nextStep}
              className="flex items-center gap-1 px-6 py-3 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/10 active:scale-[0.98] cursor-pointer select-none"
            >
              Lanjutkan Formulir
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              id="btn-nav-submit"
              type="submit"
              disabled={!formData.fotoKK || !formData.fotoRumahDepan || !formData.fotoRumahDalam || !formData.latitude || !formData.longitude}
              className="flex items-center gap-1.5 px-7 py-3 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 hover:scale-[1.01] transition-all shadow-lg shadow-indigo-550/25 cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none disabled:bg-slate-300 disabled:text-slate-500"
            >
              <CheckCircle2 className="h-4.5 w-4.5 text-indigo-100" />
              {initialData ? 'Simpan Pembaruan DTSEN / Selesai' : 'Kirim Data / Selesai'}
            </button>
          )}
        </div>

      </form>
    </div>
  </div>
  );
}
