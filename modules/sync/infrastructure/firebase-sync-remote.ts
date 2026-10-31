import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
  type Auth,
} from "firebase/auth";
import {
  collection,
  doc,
  getDocs,
  getFirestore,
  query,
  where,
  writeBatch,
  type Firestore,
} from "firebase/firestore";
import type { CloudLinkResult, SyncRemote } from "../ports/sync-remote.interface";
import type { SyncEnvelope, SyncEntityKind } from "../types/sync.types";

const KIND_TO_COLLECTION: Record<SyncEntityKind, string> = {
  settings: "settings",
  project: "projects",
  collection: "collections",
  savedRequest: "savedRequests",
  environmentVariable: "environmentVariables",
};

const COLLECTION_TO_KIND: Record<string, SyncEntityKind> = {
  settings: "settings",
  projects: "project",
  collections: "collection",
  savedRequests: "savedRequest",
  environmentVariables: "environmentVariable",
};

export type FirebaseWebConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
};

export function readFirebaseWebConfig(
  env: Record<string, string | undefined> = import.meta.env as Record<
    string,
    string | undefined
  >,
): FirebaseWebConfig | null {
  const apiKey = env.VITE_FIREBASE_API_KEY?.trim();
  const authDomain = env.VITE_FIREBASE_AUTH_DOMAIN?.trim();
  const projectId = env.VITE_FIREBASE_PROJECT_ID?.trim();
  if (!apiKey || !authDomain || !projectId) return null;
  return {
    apiKey,
    authDomain,
    projectId,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET?.trim() || undefined,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim() || undefined,
    appId: env.VITE_FIREBASE_APP_ID?.trim() || undefined,
  };
}

export function isFirebaseConfigured(
  env?: Record<string, string | undefined>,
): boolean {
  return readFirebaseWebConfig(env) != null;
}

export class FirebaseSyncRemote implements SyncRemote {
  private app: FirebaseApp | null = null;
  private auth: Auth | null = null;
  private db: Firestore | null = null;

  constructor(private readonly config: FirebaseWebConfig | null = readFirebaseWebConfig()) {}

  isConfigured(): boolean {
    return this.config != null;
  }

  private ensureClients(): { auth: Auth; db: Firestore } {
    if (!this.config) {
      throw new Error("Firebase is not configured. Set VITE_FIREBASE_* env vars.");
    }
    if (!this.app) {
      this.app = initializeApp(this.config);
      this.auth = getAuth(this.app);
      this.db = getFirestore(this.app);
    }
    return { auth: this.auth!, db: this.db! };
  }

  async linkAccount(email: string, password: string): Promise<CloudLinkResult> {
    const { auth } = this.ensureClients();
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const accessToken = await cred.user.getIdToken();
      return { cloudUserId: cred.user.uid, accessToken };
    } catch (error) {
      const code =
        error && typeof error === "object" && "code" in error
          ? String((error as { code: unknown }).code)
          : "";
      if (code === "auth/email-already-in-use") {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        const accessToken = await cred.user.getIdToken();
        return { cloudUserId: cred.user.uid, accessToken };
      }
      throw error;
    }
  }

  async ensureSession(): Promise<CloudLinkResult | null> {
    if (!this.isConfigured()) return null;
    const { auth } = this.ensureClients();
    const user = auth.currentUser;
    if (!user) return null;
    const accessToken = await user.getIdToken();
    return { cloudUserId: user.uid, accessToken };
  }

  async pull(cloudUserId: string, since: string | null): Promise<SyncEnvelope[]> {
    const { db } = this.ensureClients();
    const envelopes: SyncEnvelope[] = [];

    for (const [collectionName, kind] of Object.entries(COLLECTION_TO_KIND)) {
      const colRef = collection(db, "users", cloudUserId, collectionName);
      const snap = since
        ? await getDocs(query(colRef, where("updatedAt", ">", since)))
        : await getDocs(colRef);

      for (const document of snap.docs) {
        const data = document.data() as SyncEnvelope;
        envelopes.push({
          kind: (data.kind as SyncEntityKind) ?? kind,
          id: data.id ?? document.id,
          updatedAt: data.updatedAt,
          deletedAt: data.deletedAt ?? null,
          payload: data.payload ?? {},
        });
      }
    }

    return envelopes;
  }

  async push(cloudUserId: string, entities: SyncEnvelope[]): Promise<void> {
    if (entities.length === 0) return;
    const { db } = this.ensureClients();
    const batch = writeBatch(db);
    for (const entity of entities) {
      const colName = KIND_TO_COLLECTION[entity.kind];
      const ref = doc(db, "users", cloudUserId, colName, entity.id);
      batch.set(ref, {
        kind: entity.kind,
        id: entity.id,
        updatedAt: entity.updatedAt,
        deletedAt: entity.deletedAt,
        payload: entity.payload,
      });
    }
    await batch.commit();
  }

  async purgeRemote(cloudUserId: string, entities: SyncEnvelope[]): Promise<void> {
    if (entities.length === 0) return;
    const { db } = this.ensureClients();
    const batch = writeBatch(db);
    for (const entity of entities) {
      const colName = KIND_TO_COLLECTION[entity.kind];
      batch.delete(doc(db, "users", cloudUserId, colName, entity.id));
    }
    await batch.commit();
  }
}

/** Used when Firebase env is missing — SyncService treats isConfigured() as false. */
export class UnconfiguredSyncRemote implements SyncRemote {
  isConfigured(): boolean {
    return false;
  }

  async linkAccount(): Promise<CloudLinkResult> {
    throw new Error("Firebase is not configured");
  }

  async ensureSession(): Promise<CloudLinkResult | null> {
    return null;
  }

  async pull(): Promise<SyncEnvelope[]> {
    throw new Error("Firebase is not configured");
  }

  async push(): Promise<void> {
    throw new Error("Firebase is not configured");
  }

  async purgeRemote(): Promise<void> {
    throw new Error("Firebase is not configured");
  }
}

export function createDefaultSyncRemote(): SyncRemote {
  const config = readFirebaseWebConfig();
  return config ? new FirebaseSyncRemote(config) : new UnconfiguredSyncRemote();
}
