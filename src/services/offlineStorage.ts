import { Task, Section, Project } from "../types";

const DB_NAME = "todo-offline-db";
const DB_VERSION = 1;
const STORES = { TASKS: "tasks", SECTIONS: "sections", PROJECTS: "projects", PENDING: "pending" } as const;

export type ChangeOperation = "create" | "update" | "delete";
export type ChangeEntity = "task" | "section" | "project";

export interface PendingChange {
  id: string;
  entity: ChangeEntity;
  operation: ChangeOperation;
  entityId: string;
  data: any;
  timestamp: number;
}

let db: IDBDatabase | null = null;
let dbPromise: Promise<IDBDatabase> | null = null;

function initDB(): Promise<IDBDatabase> {
  if (db) return Promise.resolve(db);
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => { db = request.result; resolve(db); };
    request.onupgradeneeded = (e) => {
      const database = (e.target as IDBOpenDBRequest).result;
      Object.values(STORES).forEach(name => {
        if (!database.objectStoreNames.contains(name)) {
          const store = database.createObjectStore(name, { keyPath: "id" });
          if (name === STORES.PENDING) store.createIndex("timestamp", "timestamp");
        }
      });
    };
  });
  return dbPromise;
}

async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest | void
): Promise<T> {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const result = fn(store);
    if (result) {
      result.onsuccess = () => resolve(result.result);
      result.onerror = () => reject(result.error);
    } else {
      tx.oncomplete = () => resolve(undefined as T);
      tx.onerror = () => reject(tx.error);
    }
  });
}

// Generic cache operations
async function cacheAll<T extends { id: string }>(storeName: string, items: T[]): Promise<void> {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    store.clear();
    items.forEach(item => store.put(item));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getAll<T>(storeName: string): Promise<T[]> {
  return withStore<T[]>(storeName, "readonly", store => store.getAll());
}

async function putOne<T extends { id: string }>(storeName: string, item: T): Promise<void> {
  return withStore(storeName, "readwrite", store => { store.put(item); });
}

async function deleteOne(storeName: string, id: string): Promise<void> {
  return withStore(storeName, "readwrite", store => { store.delete(id); });
}

// Tasks
export const cacheTasks = (tasks: Task[]) => cacheAll(STORES.TASKS, tasks);
export const getCachedTasks = () => getAll<Task>(STORES.TASKS);
export const updateCachedTask = (task: Task) => putOne(STORES.TASKS, task);
export const deleteCachedTask = (id: string) => deleteOne(STORES.TASKS, id);

// Sections
export const cacheSections = (sections: Section[]) => cacheAll(STORES.SECTIONS, sections);
export const getCachedSections = () => getAll<Section>(STORES.SECTIONS);
export const updateCachedSection = (section: Section) => putOne(STORES.SECTIONS, section);
export const deleteCachedSection = (id: string) => deleteOne(STORES.SECTIONS, id);

// Projects
export const cacheProjects = (projects: Project[]) => cacheAll(STORES.PROJECTS, projects);
export const getCachedProjects = () => getAll<Project>(STORES.PROJECTS);

// Pending changes
export async function addPendingChange(change: Omit<PendingChange, "id" | "timestamp">): Promise<void> {
  const pendingChange: PendingChange = {
    ...change,
    id: `${change.entity}-${change.entityId}-${Date.now()}`,
    timestamp: Date.now(),
  };
  return putOne(STORES.PENDING, pendingChange);
}

export const getPendingChanges = () => getAll<PendingChange>(STORES.PENDING);
export const removePendingChange = (id: string) => deleteOne(STORES.PENDING, id);

export async function hasPendingChanges(): Promise<boolean> {
  return withStore<number>(STORES.PENDING, "readonly", store => store.count())
    .then(count => count > 0);
}
