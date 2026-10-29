import { Dexie, type Table } from "dexie";

export interface CacheRecord {
  key: string;
  scope: string;
  data: unknown;
  updatedAt: number;
}

export interface PreferenceRecord {
  id: string;
  data: unknown;
  updatedAt: number;
}

export interface DraftRecord {
  id: string;
  title: string;
  data: unknown;
  updatedAt: number;
}

export class AppDatabase extends Dexie {
  preferences!: Table<PreferenceRecord, string>;
  cache!: Table<CacheRecord, [string, string]>;
  drafts!: Table<DraftRecord, string>;

  constructor() {
    super("PlaceIntelDB");
    this.version(1).stores({
      preferences: "id, updatedAt",
      cache: "[key+scope], key, scope, updatedAt",
      drafts: "id, title, updatedAt",
    });
  }
}

export const db = new AppDatabase();

export const getCachedPreferences = async <T = unknown>(
  key = "userPreferences",
): Promise<T | null> => {
  try {
    const record = await db.preferences.get(key);
    return (record?.data as T) ?? null;
  } catch (err) {
    console.warn("[dbService] getCachedPreferences error:", err);
    return null;
  }
};

export const setCachedPreferences = async <T = unknown>(
  data: T,
  key = "userPreferences",
): Promise<void> => {
  try {
    await db.preferences.put({
      id: key,
      data,
      updatedAt: Date.now(),
    });
  } catch (err) {
    console.error("[dbService] setCachedPreferences error:", err);
  }
};

export const getCacheItem = async <T = unknown>(
  key: string,
  scope = "global",
): Promise<T | null> => {
  try {
    const record = await db.cache.get([key, scope]);
    return (record?.data as T) ?? null;
  } catch (err) {
    console.warn("[dbService] getCacheItem error:", err);
    return null;
  }
};

export const setCacheItem = async <T = unknown>(
  key: string,
  data: T,
  scope = "global",
): Promise<void> => {
  try {
    await db.cache.put({
      key,
      scope,
      data,
      updatedAt: Date.now(),
    });
  } catch (err) {
    console.error("[dbService] setCacheItem error:", err);
  }
};

export const clearAppCache = async (): Promise<void> => {
  try {
    await db.cache.clear();
    await db.preferences.clear();
  } catch (err) {
    console.error("[dbService] clearAppCache error:", err);
  }
};
