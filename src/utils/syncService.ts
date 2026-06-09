import { SurveyData, FamilyMember } from '../types';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  onSnapshot, 
  getDocFromServer,
  updateDoc
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Detect whether the Firebase API key is a placeholder or invalid
export const isFirebaseConfigured = !!(
  firebaseConfig && 
  firebaseConfig.apiKey && 
  !firebaseConfig.apiKey.includes('Placeholder') &&
  !firebaseConfig.apiKey.includes('Fake')
);

let app: any = null;
let db: any = null;
let auth: any = null;

if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    auth = getAuth();
  } catch (error) {
    console.warn("Failed to initialize Firebase services. Falling back to offline client mode.", error);
  }
} else {
  // Silent fallback setup for types matching
  console.info("Firebase Firestore is currently unconfigured or using placeholder credentials. Operating in Offline/Local Mode.");
}

export { app, db, auth };

// Core Operation types for structured error telemetry
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

/**
 * Handles errors arising from Firestore security rule check failures, conformant with high-stakes skill mandates.
 */
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: auth ? {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider: any) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    } : {},
    operationType,
    path
  };
  if (isFirebaseConfigured) {
    console.error('Firestore Error: ', JSON.stringify(errInfo));
  } else {
    console.warn('Firestore Fallback (Offline Mode): ', errInfo.error);
  }
  throw new Error(JSON.stringify(errInfo));
}

// Active session verification guarantee helper
let isAuthPromise: Promise<any> | null = null;
export async function ensureAuthenticated() {
  if (!isFirebaseConfigured || !auth) {
    return { uid: 'offline_user', isAnonymous: true };
  }
  if (auth.currentUser) return auth.currentUser;
  if (!isAuthPromise) {
    isAuthPromise = signInAnonymously(auth).catch(err => {
      console.warn("Failed to sign in anonymously. Proceeding as unauthenticated user.", err);
      // Resolve instead of rethrowing, so Firestore operations can run under unauthenticated rules
      return { uid: 'unauthenticated_user', isAnonymous: true };
    });
  }
  return isAuthPromise;
}

// Dry-run connection validation as demanded by critical constraints
async function validateFirestoreConnection() {
  if (!isFirebaseConfigured || !db) return;
  try {
    await ensureAuthenticated();
    await getDocFromServer(doc(db, 'test', 'connection')).catch(() => {});
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Please check your Firebase configuration or network connections.");
    }
  }
}
validateFirestoreConnection();

export interface FlatSurveyPayload {
  id: string;
  submittedAt: string;
  namaPendata: string;
  noKK: string;
  namaResponden: string;
  kecamatan: string;
  kelurahan: string;
  alamat: string;
  statusKepemilikanRumah: string;
  buktiKepemilikanTanah: string;
  luasLantai: number;
  jenisLantai: string;
  jenisDinding: string;
  jenisAtap: string;
  sumberAirMinum: string;
  jarakAirMinum: string;
  sumberPenerangan: string;
  dayaListrik: string;
  noMeteranPelanggan: string;
  bahanBakarMemasak: string;
  fasilitasBab: string;
  jenisKloset: string;
  pembuanganAkhirTinja: string;
  kondisiGiziAnak: string;
  penyakitKronis: string;
  jaminanKesehatan: string;
  programBantuan: string;
  asetBergerak: string;
  asetTidakBergerak: string;
  jumlahTernak: string;
  aksesInternetKeluarga: string;
  rekeningDompetDigital: string;
  pmksTerdapat: string;
  pmksJenis: string;
  jenisBantuanDiinginkan: string;
  catatan: string;
  jumlahAnggotaKeluarga: number;
  daftarAnggotaKeluarga: string;
}

/**
 * Creates a flattened version of the survey, suitable for single-row spreadsheets.
 */
export function flattenSurvey(survey: SurveyData): FlatSurveyPayload {
  const memberSummaries = (survey.anggotaKeluarga || []).map(m => {
    return `${m.noUrut}. ${m.nama} (${m.nik}) [Hub: ${m.statusHubunganKK}, Umur: ${m.umur} thn, Kerja: ${m.apakahBekerja}]`;
  }).join('; ');

  return {
    id: survey.id,
    submittedAt: survey.submittedAt,
    namaPendata: survey.namaPendata || '',
    noKK: survey.noKK || '',
    namaResponden: survey.namaResponden || '',
    kecamatan: survey.kecamatan || '',
    kelurahan: survey.kelurahan || '',
    alamat: survey.alamat || '',
    statusKepemilikanRumah: survey.statusKepemilikanRumah || '',
    buktiKepemilikanTanah: survey.buktiKepemilikanTanah || '',
    luasLantai: Number(survey.luasLantai) || 0,
    jenisLantai: survey.jenisLantai || '',
    jenisDinding: survey.jenisDinding || '',
    jenisAtap: survey.jenisAtap || '',
    sumberAirMinum: survey.sumberAirMinum || '',
    jarakAirMinum: survey.jarakAirMinum || '',
    sumberPenerangan: survey.sumberPenerangan || '',
    dayaListrik: survey.dayaListrik || '',
    noMeteranPelanggan: survey.noMeteranPelanggan || '',
    bahanBakarMemasak: survey.bahanBakarMemasak || '',
    fasilitasBab: survey.fasilitasBab || '',
    jenisKloset: survey.jenisKloset || '',
    pembuanganAkhirTinja: survey.pembuanganAkhirTinja || '',
    kondisiGiziAnak: survey.kondisiGiziAnak || '',
    penyakitKronis: survey.penyakitKronis || '',
    jaminanKesehatan: survey.jaminanKesehatan || '',
    programBantuan: (survey.programBantuan || []).join(', '),
    asetBergerak: (survey.asetBergerak || []).join(', '),
    asetTidakBergerak: (survey.asetTidakBergerak || []).join(', '),
    jumlahTernak: survey.jumlahTernak || '',
    aksesInternetKeluarga: survey.aksesInternetKeluarga || '',
    rekeningDompetDigital: survey.rekeningDompetDigital || 'Tidak',
    pmksTerdapat: survey.pmksTerdapat || '',
    pmksJenis: survey.pmksJenis || '',
    jenisBantuanDiinginkan: survey.jenisBantuanDiinginkan || '',
    catatan: survey.catatan || '',
    jumlahAnggotaKeluarga: survey.anggotaKeluarga?.length || 0,
    daftarAnggotaKeluarga: memberSummaries,
  };
}

/**
 * Sends and registers a survey onto the Firebase Firestore 'surveys' collection.
 * Maintains structural interface for transparent client transitions.
 */
export async function sendSurveyToGoogleAppsScript(
  url: string, 
  survey: SurveyData
): Promise<{ success: boolean; message: string }> {
  if (!isFirebaseConfigured || !db) {
    // If not configured, just do optional backup request if URL is real
    if (url && url.trim().startsWith('http') && !url.includes('AKfycbzRkb2H') && !url.includes('AKfycbzE3mom')) {
      try {
        const payload = {
          action: 'save_dtsen_data',
          timestamp: new Date().toISOString(),
          flat: flattenSurvey(survey),
          raw: {
            ...survey,
            fotoKK: survey.fotoKK ? '[Ada Lampiran Berkas KK]' : '',
            fotoRumahDepan: survey.fotoRumahDepan ? '[Ada Lampiran Foto Depan]' : '',
            fotoRumahDalam: survey.fotoRumahDalam ? '[Ada Lampiran Foto Dalam]' : ''
          }
        };
        await fetch(url.trim(), {
          method: 'POST',
          mode: 'no-cors',
          redirect: 'follow',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8'
          },
          body: JSON.stringify(payload)
        });
        return {
          success: true,
          message: 'Berhasil tersimpan di penyimpanan lokal dan dikirim ke Spreadsheet.'
        };
      } catch (gasErr) {
        console.warn("Spreadsheet sheets backup sync unsuccessful:", gasErr);
      }
    }
    return {
      success: true,
      message: 'Berhasil disimpan dalam database offline lokal Anda.'
    };
  }

  try {
    await ensureAuthenticated();
    const surveyDocRef = doc(db, 'surveys', survey.id);

    const dataToSave = {
      ...survey,
      synced: true,
      syncedAt: new Date().toISOString()
    };

    await setDoc(surveyDocRef, dataToSave);

    // Optional legacy backup connection to GAS Sheet if user provided custom URL
    if (url && url.trim().startsWith('http') && !url.includes('AKfycbzRkb2H') && !url.includes('AKfycbzE3mom')) {
      try {
        const payload = {
          action: 'save_dtsen_data',
          timestamp: new Date().toISOString(),
          flat: flattenSurvey(survey),
          raw: {
            ...survey,
            fotoKK: survey.fotoKK ? '[Ada Lampiran Berkas KK]' : '',
            fotoRumahDepan: survey.fotoRumahDepan ? '[Ada Lampiran Foto Depan]' : '',
            fotoRumahDalam: survey.fotoRumahDalam ? '[Ada Lampiran Foto Dalam]' : ''
          }
        };
        await fetch(url.trim(), {
          method: 'POST',
          mode: 'no-cors',
          redirect: 'follow',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8'
          },
          body: JSON.stringify(payload)
        });
      } catch (gasErr) {
        console.warn("Spreadsheet sheets backup sync unsuccessful:", gasErr);
      }
    }

    return {
      success: true,
      message: 'Berhasil tersimpan dan tersinkronisasi di Firestore Cloud Database.'
    };
  } catch (error) {
    try {
      handleFirestoreError(error, OperationType.WRITE, `surveys/${survey.id}`);
    } catch (errInfo) {
      return {
        success: false,
        message: `Gagal sinkronisasi data cloud Firestore: ${(errInfo as Error).message}`
      };
    }
    return {
      success: false,
      message: 'Gagal menghubungi cloud database.'
    };
  }
}

/**
 * Loads all survey entries recorded across instruments from Firestore 'surveys'.
 */
export async function fetchSurveysFromGoogleAppsScript(
  url: string
): Promise<{ success: boolean; surveys?: SurveyData[]; message: string }> {
  if (!isFirebaseConfigured || !db) {
    return {
      success: true,
      surveys: [],
      message: 'Sistem berjalan dalam mode offline lokal mandiri (tidak ada konfigurasi database cloud).'
    };
  }

  try {
    await ensureAuthenticated();
    const querySnapshot = await getDocs(collection(db, 'surveys'));
    const surveysCol: SurveyData[] = [];
    querySnapshot.forEach((doc) => {
      surveysCol.push(doc.data() as SurveyData);
    });

    return {
      success: true,
      surveys: surveysCol,
      message: `Berhasil menarik ${surveysCol.length} data sensus langsung dari Firestore Cloud!`
    };
  } catch (error) {
    try {
      handleFirestoreError(error, OperationType.LIST, 'surveys');
    } catch (errInfo) {
      return {
        success: false,
        message: `Gagal sinkronisasi data cloud Firestore: ${(errInfo as Error).message}`
      };
    }
    return {
      success: false,
      message: 'Gagal menarik data dari database cloud.'
    };
  }
}

/**
 * Registers a real-time event listener for 'surveys' to support multi-device real-time sync
 */
export function subscribeToSurveys(onUpdate: (surveys: SurveyData[]) => void): () => void {
  if (!isFirebaseConfigured || !db) {
    console.info("Firebase Firestore is currently unconfigured or in offline mode. Real-time active listener deferred.");
    return () => {};
  }

  let isUnsubscribed = false;
  let unsub: (() => void) | null = null;

  ensureAuthenticated().then(() => {
    if (isUnsubscribed) return;
    unsub = onSnapshot(collection(db, 'surveys'), (snapshot) => {
      const data: SurveyData[] = [];
      snapshot.forEach(doc => {
        data.push(doc.data() as SurveyData);
      });
      onUpdate(data);
    }, (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'surveys');
      } catch (e) {
        console.warn("Real-time listener failed gracefully:", e);
      }
    });
  }).catch(err => {
    console.warn("Authentication for real-time subscription deferred in offline mode:", err);
  });

  return () => {
    isUnsubscribed = true;
    if (unsub) unsub();
  };
}

/**
 * Deletes a survey from Firebase Firestore 'surveys' collection.
 */
export async function deleteSurveyFromFirestore(id: string): Promise<boolean> {
  if (!isFirebaseConfigured || !db) return true;

  try {
    await ensureAuthenticated();
    await deleteDoc(doc(db, 'surveys', id));
    return true;
  } catch (error) {
    try {
      handleFirestoreError(error, OperationType.DELETE, `surveys/${id}`);
    } catch (errInfo) {
      console.warn("Firestore delete issue ignored in offline mode:", errInfo);
    }
    return false;
  }
}

/**
 * Fetches a user document from Firestore's 'users' collection.
 * Supports online multi-device login validation and sync.
 */
export async function fetchUserFromFirestore(username: string): Promise<any | null> {
  if (!isFirebaseConfigured || !db) return null;
  try {
    await ensureAuthenticated();
    const userDoc = await getDoc(doc(db, 'users', username));
    if (userDoc.exists()) {
      return userDoc.data();
    }
    return null;
  } catch (error) {
    console.warn("Error fetching user from Firestore:", error);
    return null;
  }
}

/**
 * Creates/registers a user document in Firestore.
 */
export async function saveUserToFirestore(username: string, userData: any): Promise<boolean> {
  if (!isFirebaseConfigured || !db) return false;
  try {
    await ensureAuthenticated();
    await setDoc(doc(db, 'users', username), userData, { merge: true });
    return true;
  } catch (error) {
    console.error("Error saving user to Firestore:", error);
    return false;
  }
}

/**
 * Saves survey progress/draft data to Firestore of a user under 'users' collection.
 */
export async function saveUserDraftToFirestore(
  username: string, 
  currentStep: number, 
  draftData: any
): Promise<boolean> {
  const serialized = draftData ? JSON.stringify(draftData) : null;
  
  if (!isFirebaseConfigured || !db) {
    // If not configured, save locally only
    localStorage.setItem(`dtsen_draft_${username}`, JSON.stringify({ currentStep, draftData }));
    return true;
  }
  try {
    await ensureAuthenticated();
    await setDoc(doc(db, 'users', username), {
      current_step: currentStep,
      draft_data: serialized,
      updated_at: new Date().toISOString()
    }, { merge: true });
    
    // Also backup locally always
    localStorage.setItem(`dtsen_draft_${username}`, JSON.stringify({ currentStep, draftData }));
    return true;
  } catch (error) {
    console.warn("Unable to save draft to Firestore, backed up locally:", error);
    localStorage.setItem(`dtsen_draft_${username}`, JSON.stringify({ currentStep, draftData }));
    return false;
  }
}

/**
 * Returns copy-paste template for Google Sheets integration as a secondary pipeline.
 */
export function getGoogleAppsScriptTemplate(): string {
  return `/**
 * GOOGLE APPS SCRIPT - SINKRONISASI INTERAKTIF DTSEN TANJUNGBALAI
 * 
 * Petunjuk Pemasangan:
 * 1. Buka Google Sheet baru, ganti nama Sheet menjadi "DTSEN_Data".
 * ...
 */`;
}
