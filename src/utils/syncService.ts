import { SurveyData, FamilyMember } from '../types';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  onSnapshot, 
  getDocFromServer,
  updateDoc,
  query,
  where
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
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    }, firebaseConfig.firestoreDatabaseId);
    auth = getAuth();
  } catch (error) {
    console.warn("Failed to initialize Firebase services. Falling back to offline client mode.", error);
  }
} else {
  // Silent fallback setup for types matching
  console.info("Firebase Firestore is currently unconfigured or using placeholder credentials. Operating in Offline/Local Mode.");
}

export { app, db, auth };

const quotaExceededKey = firebaseConfig && firebaseConfig.projectId 
  ? `dtsen_quota_exceeded_${firebaseConfig.projectId}` 
  : 'dtsen_quota_exceeded';

let firestoreQuotaExceeded = localStorage.getItem(quotaExceededKey) === 'true';
let quotaExceededCallback: ((val: boolean) => void) | null = null;

export function isFirestoreQuotaExceeded(): boolean {
  return firestoreQuotaExceeded;
}

export function setFirestoreQuotaExceeded(val: boolean) {
  if (firestoreQuotaExceeded !== val) {
    firestoreQuotaExceeded = val;
    localStorage.setItem(quotaExceededKey, val ? 'true' : 'false');
    if (quotaExceededCallback) {
      quotaExceededCallback(val);
    }
  }
}

export function registerQuotaExceededCallback(cb: (val: boolean) => void) {
  quotaExceededCallback = cb;
  cb(firestoreQuotaExceeded);
}

export function checkIfQuotaError(error: unknown): boolean {
  const errMsg = error instanceof Error ? error.message : String(error);
  if (
    errMsg.toLowerCase().includes('quota') ||
    errMsg.toLowerCase().includes('resource_exhausted') ||
    errMsg.toLowerCase().includes('resource exhausted') ||
    errMsg.toLowerCase().includes('exceeded') ||
    errMsg.toLowerCase().includes('limit')
  ) {
    setFirestoreQuotaExceeded(true);
    return true;
  }
  return false;
}

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
  checkIfQuotaError(error);
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

/**
 * Setup/initialization logic for the 'surveys' collection.
 * Creates an initial setup/metadata document to initialize the collection structure.
 */
export async function setupSurveysCollection(): Promise<boolean> {
  if (!isFirebaseConfigured || !db) return false;
  try {
    await ensureAuthenticated();
    const setupDocRef = doc(db, 'surveys', '_setup_metadata');
    await setDoc(setupDocRef, {
      initialized: true,
      appName: "DTSEN Tanjungbalai Survey System",
      migratedToFirestore: true,
      lastSetupAt: new Date().toISOString()
    }, { merge: true });
    console.info("Firestore 'surveys' collection setup complete.");
    return true;
  } catch (error) {
    console.warn("Unable to complete 'surveys' collection setup:", error);
    try {
      handleFirestoreError(error, OperationType.WRITE, 'surveys/_setup_metadata');
    } catch (e) {
      // Return false in case of unconfigured database/permissions
    }
    return false;
  }
}

// Dry-run connection validation and surveys collection setup
async function validateFirestoreConnection() {
  if (!isFirebaseConfigured || !db) return;
  try {
    await ensureAuthenticated();
    await getDocFromServer(doc(db, 'test', 'connection')).catch(() => {});
    await setupSurveysCollection();
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
  if (!isFirebaseConfigured || !db || firestoreQuotaExceeded) {
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
 * Crucial step of the migration from Google Apps Script fully to Firebase Firestore.
 * Supports delta sync (incremental pull) using sinceTimestamp parameter.
 */
export async function fetchSurveysFromGoogleAppsScript(
  url: string,
  sinceTimestamp?: string,
  role?: 'admin' | 'pendata' | null,
  fullname?: string
): Promise<{ success: boolean; surveys?: SurveyData[]; isDelta?: boolean; message: string }> {
  if (!isFirebaseConfigured || !db) {
    return {
      success: true,
      surveys: [],
      message: 'Sistem berjalan dalam mode offline lokal mandiri (tidak ada konfigurasi database cloud).'
    };
  }

  if (firestoreQuotaExceeded) {
    return {
      success: false,
      message: 'Quota limit exceeded. Batas kuota harian gratis untuk Google Firestore telah tercapai. Sistem berjalan sepenuhnya dalam Mode Offline Lokal.'
    };
  }

  try {
    await ensureAuthenticated();
    
    let surveysQuery;
    let isDelta = false;

    // Optimize: If user is "pendata", only query their own surveys to massively save reads!
    if (role === 'pendata' && fullname) {
      surveysQuery = query(
        collection(db, 'surveys'),
        where('namaPendata', '==', fullname)
      );
    } else {
      surveysQuery = collection(db, 'surveys');
    }

    const querySnapshot = await getDocs(surveysQuery);
    const surveysCol: SurveyData[] = [];
    querySnapshot.forEach((doc) => {
      // Safely filter out the '_setup_metadata' control document
      if (doc.id !== '_setup_metadata') {
        const docData = doc.data() as SurveyData;
        // In-memory Delta filtering to avoid composite indexes requirement
        if (sinceTimestamp && docData.syncedAt && docData.syncedAt <= sinceTimestamp) {
          return;
        }
        surveysCol.push(docData);
      }
    });

    if (sinceTimestamp) {
      isDelta = true;
    }

    const msg = isDelta
      ? `Berhasil memperbarui ${surveysCol.length} perubahan data sensus baru/terkini (Delta Sync) dari Firestore Cloud!`
      : `Berhasil menarik ${surveysCol.length} data sensus lengkap (Full Sync) dari Firestore Cloud!`;

    return {
      success: true,
      surveys: surveysCol,
      isDelta,
      message: msg
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
 * Registers a real-time event listener for 'surveys' to support multi-device real-time sync.
 * Ensures metadata control documents are filtered out, maintaining clean application state.
 */
export function subscribeToSurveys(
  role: 'admin' | 'pendata' | null,
  fullname: string,
  onUpdate: (surveys: SurveyData[]) => void
): () => void {
  if (!isFirebaseConfigured || !db || firestoreQuotaExceeded || !role) {
    console.info("Firebase Firestore is currently unconfigured, in offline mode, or quota is exceeded. Real-time active listener deferred.");
    return () => {};
  }

  let isUnsubscribed = false;
  let unsub: (() => void) | null = null;

  ensureAuthenticated().then(() => {
    if (isUnsubscribed) return;

    // Optimize: If user is "pendata", only listen to their own surveys to massively save reads!
    let surveysQuery;
    if (role === 'pendata' && fullname) {
      surveysQuery = query(
        collection(db, 'surveys'),
        where('namaPendata', '==', fullname)
      );
    } else {
      surveysQuery = collection(db, 'surveys');
    }

    unsub = onSnapshot(surveysQuery, (snapshot) => {
      const data: SurveyData[] = [];
      snapshot.forEach(doc => {
        if (doc.id !== '_setup_metadata') {
          const docData = doc.data() as any;
          // Filter out soft-deleted documents
          if (!docData.deleted) {
            data.push(docData as SurveyData);
          }
        }
      });
      onUpdate(data);
    }, (error) => {
      try {
        checkIfQuotaError(error);
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
 * Uses soft delete to allow delta/partial updates synchronization across clients.
 */
export async function deleteSurveyFromFirestore(id: string): Promise<boolean> {
  if (!isFirebaseConfigured || !db || firestoreQuotaExceeded) return true;

  try {
    await ensureAuthenticated();
    // Soft delete to propagate deletion to other clients during delta sync
    await setDoc(doc(db, 'surveys', id), {
      id,
      deleted: true,
      syncedAt: new Date().toISOString()
    }, { merge: true });
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
 * Deletes all surveys from Firebase Firestore 'surveys' collection.
 * Uses soft delete to allow delta/partial updates synchronization across clients.
 */
export async function clearAllSurveysFromFirestore(
  role?: 'admin' | 'pendata' | null,
  fullname?: string
): Promise<boolean> {
  if (!isFirebaseConfigured || !db || firestoreQuotaExceeded) return true;

  try {
    await ensureAuthenticated();
    
    // Optimize: If user is "pendata", only query and delete their own surveys!
    let deleteQuery;
    if (role === 'pendata' && fullname) {
      deleteQuery = query(collection(db, 'surveys'), where('namaPendata', '==', fullname));
    } else {
      deleteQuery = collection(db, 'surveys');
    }

    const querySnapshot = await getDocs(deleteQuery);
    const batchPromises: Promise<any>[] = [];
    querySnapshot.forEach((docSnap) => {
      if (docSnap.id !== '_setup_metadata') {
        batchPromises.push(
          setDoc(docSnap.ref, {
            deleted: true,
            syncedAt: new Date().toISOString()
          }, { merge: true })
        );
      }
    });
    await Promise.all(batchPromises);
    return true;
  } catch (error) {
    try {
      handleFirestoreError(error, OperationType.DELETE, 'surveys');
    } catch (errInfo) {
      console.warn("Firestore clear all issue ignored in offline mode:", errInfo);
    }
    return false;
  }
}

/**
 * Fetches a user document from Firestore's 'users' collection.
 * Supports online multi-device login validation and sync.
 */
export async function fetchUserFromFirestore(username: string): Promise<any | null> {
  const safeUsername = (username || '').toLowerCase().trim();
  if (!safeUsername) return null;

  if (!isFirebaseConfigured || !db || firestoreQuotaExceeded) {
    const offlineUsersJson = localStorage.getItem('dtsen_offline_users');
    const offlineUsers = offlineUsersJson ? JSON.parse(offlineUsersJson) : {};
    
    // Support name/username fallback in offline local storage too!
    const localUser = offlineUsers[safeUsername];
    if (localUser) return localUser;
    
    const matchedOffline = Object.values(offlineUsers).find((u: any) => 
      (u.username || '').toLowerCase().trim() === safeUsername ||
      (u.fullname || '').toLowerCase().trim() === safeUsername
    );
    return matchedOffline || null;
  }
  try {
    await ensureAuthenticated();
    
    // 1. Try direct fetch by document ID first (most efficient)
    let userDoc;
    try {
      userDoc = await getDocFromServer(doc(db, 'users', safeUsername));
    } catch (serverErr) {
      console.warn("Failed to fetch user directly from server, falling back to standard getDoc:", serverErr);
      userDoc = await getDoc(doc(db, 'users', safeUsername));
    }

    if (userDoc.exists()) {
      const data = userDoc.data();
      // Cache this user data locally
      try {
        const offlineUsersJson = localStorage.getItem('dtsen_offline_users');
        const offlineUsers = offlineUsersJson ? JSON.parse(offlineUsersJson) : {};
        offlineUsers[safeUsername] = { ...offlineUsers[safeUsername], ...data };
        localStorage.setItem('dtsen_offline_users', JSON.stringify(offlineUsers));
      } catch (cacheErr) {
        console.warn("Failed to cache fetched user locally:", cacheErr);
      }
      return data;
    }

    // 2. Fallback: If not found by document ID, search all users (e.g. if they logged in with Full Name instead of NIK)
    console.info(`User doc not found directly for "${safeUsername}". Trying fallback search across all users...`);
    const allUsers = await fetchAllUsersFromFirestore();
    const cleanStr = (str: string) => (str || '').toLowerCase().replace(/[\s\._\-]/g, '');
    const cleanSafeUsername = cleanStr(safeUsername);
    const matchedUser = allUsers.find(u => {
      const uName = (u.username || '').toLowerCase().trim();
      const uFull = (u.fullname || '').toLowerCase().trim();
      return uName === safeUsername || 
             uFull === safeUsername ||
             cleanStr(uName) === cleanSafeUsername ||
             cleanStr(uFull) === cleanSafeUsername;
    });

    if (matchedUser) {
      // Cache this user data locally too
      try {
        const offlineUsersJson = localStorage.getItem('dtsen_offline_users');
        const offlineUsers = offlineUsersJson ? JSON.parse(offlineUsersJson) : {};
        const safeMatchedUsername = (matchedUser.username || '').toLowerCase().trim();
        if (safeMatchedUsername) {
          offlineUsers[safeMatchedUsername] = { ...offlineUsers[safeMatchedUsername], ...matchedUser };
          localStorage.setItem('dtsen_offline_users', JSON.stringify(offlineUsers));
        }
      } catch (cacheErr) {
        console.warn("Failed to cache matched user locally:", cacheErr);
      }
      return matchedUser;
    }

    return null;
  } catch (error) {
    console.error("Error fetching user from Firestore:", error);
    checkIfQuotaError(error);
    
    // Fallback to offline local users
    const offlineUsersJson = localStorage.getItem('dtsen_offline_users');
    const offlineUsers = offlineUsersJson ? JSON.parse(offlineUsersJson) : {};
    const localUser = offlineUsers[safeUsername];
    if (localUser) {
      return localUser;
    }

    const cleanStr = (str: string) => (str || '').toLowerCase().replace(/[\s\._\-]/g, '');
    const cleanSafeUsername = cleanStr(safeUsername);
    const matchedOffline = Object.values(offlineUsers).find((u: any) => {
      const uName = (u.username || '').toLowerCase().trim();
      const uFull = (u.fullname || '').toLowerCase().trim();
      return uName === safeUsername || 
             uFull === safeUsername ||
             cleanStr(uName) === cleanSafeUsername ||
             cleanStr(uFull) === cleanSafeUsername;
    });
    if (matchedOffline) {
      return matchedOffline;
    }
    
    // Propagate the actual error if the user is not found locally, so the login UI knows it's a connection issue
    throw error;
  }
}

/**
 * Fetches a user document directly from the Cloud Firestore server without offline cache fallback.
 * Returns null if not found on the server, throws error if connection fails.
 */
export async function fetchUserDirectlyFromServer(username: string): Promise<any | null> {
  const safeUsername = (username || '').toLowerCase().trim();
  if (!safeUsername) return null;

  if (!isFirebaseConfigured || !db || firestoreQuotaExceeded) {
    return null;
  }

  await ensureAuthenticated();
  
  // 1. Try direct fetch by document ID first with source server
  let userDoc;
  try {
    userDoc = await getDocFromServer(doc(db, 'users', safeUsername));
  } catch (serverErr) {
    console.warn("Direct getDocFromServer failed, trying default getDoc:", serverErr);
    userDoc = await getDoc(doc(db, 'users', safeUsername));
  }

  if (userDoc.exists()) {
    const data = userDoc.data();
    // Sync to local cache
    try {
      const offlineUsersJson = localStorage.getItem('dtsen_offline_users');
      const offlineUsers = offlineUsersJson ? JSON.parse(offlineUsersJson) : {};
      offlineUsers[safeUsername] = { ...offlineUsers[safeUsername], ...data };
      localStorage.setItem('dtsen_offline_users', JSON.stringify(offlineUsers));
    } catch (cacheErr) {
      console.warn("Failed to cache fetched user locally:", cacheErr);
    }
    return data;
  }

  // 2. Fallback: Search across all users on server
  console.info(`User doc not found directly on server for "${safeUsername}". Trying fallback search...`);
  const querySnapshot = await getDocs(collection(db, 'users'));
  const allUsers: any[] = [];
  querySnapshot.forEach((docSnap) => {
    const data = docSnap.data();
    allUsers.push({
      ...data,
      username: data.username || docSnap.id
    });
  });

  const cleanStr = (str: string) => (str || '').toLowerCase().replace(/[\s\._\-]/g, '');
  const cleanSafeUsername = cleanStr(safeUsername);
  const matchedUser = allUsers.find(u => {
    const uName = (u.username || '').toLowerCase().trim();
    const uFull = (u.fullname || '').toLowerCase().trim();
    return uName === safeUsername || 
           uFull === safeUsername ||
           cleanStr(uName) === cleanSafeUsername ||
           cleanStr(uFull) === cleanSafeUsername;
  });

  if (matchedUser) {
    // Sync to local cache
    try {
      const offlineUsersJson = localStorage.getItem('dtsen_offline_users');
      const offlineUsers = offlineUsersJson ? JSON.parse(offlineUsersJson) : {};
      const safeMatchedUsername = (matchedUser.username || '').toLowerCase().trim();
      if (safeMatchedUsername) {
        offlineUsers[safeMatchedUsername] = { ...offlineUsers[safeMatchedUsername], ...matchedUser };
        localStorage.setItem('dtsen_offline_users', JSON.stringify(offlineUsers));
      }
    } catch (cacheErr) {
      console.warn("Failed to cache matched user locally:", cacheErr);
    }
    return matchedUser;
  }

  return null;
}

/**
 * Creates/registers a user document in Firestore.
 */
export async function saveUserToFirestore(username: string, userData: any): Promise<boolean> {
  const safeUsername = (username || '').toLowerCase().trim();
  if (!safeUsername) return false;

  const dataWithUsername = { ...userData, username: userData.username || safeUsername };

  // Always cache/save to local storage offline users
  try {
    const offlineUsersJson = localStorage.getItem('dtsen_offline_users');
    const offlineUsers = offlineUsersJson ? JSON.parse(offlineUsersJson) : {};
    offlineUsers[safeUsername] = { ...offlineUsers[safeUsername], ...dataWithUsername };
    localStorage.setItem('dtsen_offline_users', JSON.stringify(offlineUsers));
  } catch (e) {
    console.warn("Error caching user offline:", e);
  }

  if (!isFirebaseConfigured || !db || firestoreQuotaExceeded) {
    return true; // Saved locally
  }
  try {
    await ensureAuthenticated();
    await setDoc(doc(db, 'users', safeUsername), dataWithUsername, { merge: true });
    return true;
  } catch (error) {
    console.error("Error saving user to Firestore: ", error);
    checkIfQuotaError(error);
    handleFirestoreError(error, OperationType.WRITE, `users/${safeUsername}`);
    return false;
  }
}

/**
 * Fetches all users from Firestore or offline backup for admin control approval.
 */
export async function fetchAllUsersFromFirestore(): Promise<any[]> {
  if (!isFirebaseConfigured || !db || firestoreQuotaExceeded) {
    const offlineUsersJson = localStorage.getItem('dtsen_offline_users');
    const offlineUsers = offlineUsersJson ? JSON.parse(offlineUsersJson) : {};
    return Object.entries(offlineUsers).map(([key, value]: [string, any]) => {
      return { ...value, username: value.username || key };
    });
  }
  try {
    await ensureAuthenticated();
    const querySnapshot = await getDocs(collection(db, 'users'));
    const list: any[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      list.push({
        ...data,
        username: data.username || docSnap.id
      });
    });
    return list;
  } catch (error) {
    console.warn("Unable to fetch all users online, loading offline local list:", error);
    checkIfQuotaError(error);
    const offlineUsersJson = localStorage.getItem('dtsen_offline_users');
    const offlineUsers = offlineUsersJson ? JSON.parse(offlineUsersJson) : {};
    return Object.entries(offlineUsers).map(([key, value]: [string, any]) => {
      return { ...value, username: value.username || key };
    });
  }
}

/**
 * Delete a user account from Firestore 'users' collection (Admin only).
 */
export async function deleteUserFromFirestore(username: string): Promise<boolean> {
  const safeUsername = (username || '').toLowerCase();
  if (!safeUsername) return false;

  // Always delete locally as well
  try {
    const offlineUsersJson = localStorage.getItem('dtsen_offline_users');
    const offlineUsers = offlineUsersJson ? JSON.parse(offlineUsersJson) : {};
    delete offlineUsers[safeUsername];
    localStorage.setItem('dtsen_offline_users', JSON.stringify(offlineUsers));
  } catch (err) {
    console.warn("Error deleting user locally:", err);
  }

  if (!isFirebaseConfigured || !db || firestoreQuotaExceeded) {
    return true;
  }
  try {
    await ensureAuthenticated();
    await deleteDoc(doc(db, 'users', safeUsername));
    return true;
  } catch (error) {
    console.error("Error deleting user from Firestore:", error);
    checkIfQuotaError(error);
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
  
  // Backup locally always
  localStorage.setItem(`dtsen_draft_${username}`, JSON.stringify({ currentStep, draftData }));

  if (!isFirebaseConfigured || !db || firestoreQuotaExceeded) {
    return true;
  }
  try {
    await ensureAuthenticated();
    await setDoc(doc(db, 'users', username), {
      current_step: currentStep,
      draft_data: serialized,
      updated_at: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (error) {
    console.warn("Unable to save draft to Firestore, backed up locally:", error);
    checkIfQuotaError(error);
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

/**
 * Fetches all surveys directly from Firestore for cleanup and analysis.
 */
export async function fetchCloudSurveysForAnalysis(): Promise<SurveyData[]> {
  if (!isFirebaseConfigured || !db || firestoreQuotaExceeded) {
    return [];
  }
  try {
    await ensureAuthenticated();
    const querySnapshot = await getDocs(collection(db, 'surveys'));
    const list: SurveyData[] = [];
    querySnapshot.forEach((docSnap) => {
      if (docSnap.id !== '_setup_metadata') {
        list.push(docSnap.data() as SurveyData);
      }
    });
    return list;
  } catch (error) {
    console.warn("Unable to fetch cloud surveys for analysis:", error);
    checkIfQuotaError(error);
    return [];
  }
}

/**
 * Hard-deletes a list of surveys from Firestore to free up database space and quota.
 */
export async function hardDeleteSurveysFromFirestore(ids: string[]): Promise<{ success: boolean; count: number; error?: string }> {
  if (!isFirebaseConfigured || !db || firestoreQuotaExceeded) {
    return { success: false, count: 0, error: "Firebase tidak terkonfigurasi atau kuota terlampaui." };
  }
  try {
    await ensureAuthenticated();
    let deletedCount = 0;
    const promises = ids.map(async (id) => {
      await deleteDoc(doc(db, 'surveys', id));
      deletedCount++;
    });
    await Promise.all(promises);
    return { success: true, count: deletedCount };
  } catch (error) {
    console.error("Error hard deleting surveys from Firestore:", error);
    checkIfQuotaError(error);
    return { success: false, count: 0, error: (error as Error).message };
  }
}

