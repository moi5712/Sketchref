import type { Board, StoredImageAsset } from '../types';

const DB_NAME = 'Sketchref-db';
const DB_VERSION = 1;
const MIGRATION_KEY = 'Sketchref_indexeddb_migrated_v1';

const BOARDS_STORE = 'boards';
const DRAWN_STORE = 'drawnImages';
const DRAWING_STORE = 'drawingImages';
const UPLOADED_OVERLAY_STORE = 'uploadedOverlays';

type StoreName =
  | typeof BOARDS_STORE
  | typeof DRAWN_STORE
  | typeof DRAWING_STORE
  | typeof UPLOADED_OVERLAY_STORE;

interface DrawnImageRecord {
  boardId: string;
  images: string[];
}

const openDb = (): Promise<IDBDatabase> => (
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(BOARDS_STORE)) {
        db.createObjectStore(BOARDS_STORE, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(DRAWN_STORE)) {
        db.createObjectStore(DRAWN_STORE, { keyPath: 'boardId' });
      }

      if (!db.objectStoreNames.contains(DRAWING_STORE)) {
        const store = db.createObjectStore(DRAWING_STORE, { keyPath: 'id' });
        store.createIndex('boardId', 'boardId', { unique: false });
      }

      if (!db.objectStoreNames.contains(UPLOADED_OVERLAY_STORE)) {
        const store = db.createObjectStore(UPLOADED_OVERLAY_STORE, { keyPath: 'id' });
        store.createIndex('boardId', 'boardId', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  })
);

const withStore = async <T>(
  storeName: StoreName,
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T> | Promise<IDBRequest<T>>
): Promise<T> => {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    let request: IDBRequest<T>;

    transaction.oncomplete = () => db.close();
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };

    Promise.resolve(callback(store))
      .then(nextRequest => {
        request = nextRequest;
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      })
      .catch(error => reject(error));
  });
};

const getAll = <T>(storeName: StoreName): Promise<T[]> => (
  withStore<T[]>(storeName, 'readonly', store => store.getAll())
);

const put = <T>(storeName: StoreName, value: T): Promise<IDBValidKey> => (
  withStore<IDBValidKey>(storeName, 'readwrite', store => store.put(value))
);

const deleteByKey = (storeName: StoreName, key: IDBValidKey): Promise<undefined> => (
  withStore<undefined>(storeName, 'readwrite', store => store.delete(key))
);

const get = <T>(storeName: StoreName, key: IDBValidKey): Promise<T | undefined> => (
  withStore<T | undefined>(storeName, 'readonly', store => store.get(key))
);

const toHex = (buffer: ArrayBuffer) => (
  Array.from(new Uint8Array(buffer))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
);

const fallbackHash = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = Math.imul(31, hash) + value.charCodeAt(i) | 0;
  }
  return Math.abs(hash).toString(16);
};

export const getImageKey = async (imageUrl: string) => {
  if (typeof crypto === 'undefined' || !crypto.subtle) return fallbackHash(imageUrl);

  const bytes = new TextEncoder().encode(imageUrl);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return toHex(digest);
};

const getAssetId = (boardId: string, imageKey: string) => `${boardId}:${imageKey}`;

const getAsset = async (storeName: typeof DRAWING_STORE | typeof UPLOADED_OVERLAY_STORE, boardId: string, imageUrl: string) => {
  const imageKey = await getImageKey(imageUrl);
  return get<StoredImageAsset>(storeName, getAssetId(boardId, imageKey));
};

const saveAsset = async (
  storeName: typeof DRAWING_STORE | typeof UPLOADED_OVERLAY_STORE,
  boardId: string,
  imageUrl: string,
  dataUrl: string
) => {
  const imageKey = await getImageKey(imageUrl);
  const asset: StoredImageAsset = {
    id: getAssetId(boardId, imageKey),
    boardId,
    imageKey,
    imageUrl,
    dataUrl,
    updatedAt: Date.now(),
  };
  await put(storeName, asset);
};

const getBoardCreatedAt = (board: Board) => {
  const timestamp = Number(board.id.replace(/^custom-/, ''));
  return Number.isFinite(timestamp) ? timestamp : 0;
};

export const getBoards = async () => {
  const boards = await getAll<Board>(BOARDS_STORE);
  return boards.sort((a, b) => getBoardCreatedAt(b) - getBoardCreatedAt(a));
};

export const saveBoard = (board: Board) => put(BOARDS_STORE, board);

export const deleteBoard = (boardId: string) => deleteByKey(BOARDS_STORE, boardId);

export const getDrawnImagesMap = async () => {
  const records = await getAll<DrawnImageRecord>(DRAWN_STORE);
  return records.reduce<Record<string, string[]>>((map, record) => {
    map[record.boardId] = record.images;
    return map;
  }, {});
};

export const saveDrawnImages = (boardId: string, images: string[]) => (
  put(DRAWN_STORE, { boardId, images } satisfies DrawnImageRecord)
);

export const deleteDrawnImages = (boardId: string) => deleteByKey(DRAWN_STORE, boardId);

export const saveDrawingImage = (boardId: string, imageUrl: string, dataUrl: string) => (
  saveAsset(DRAWING_STORE, boardId, imageUrl, dataUrl)
);

export const getDrawingImage = (boardId: string, imageUrl: string) => (
  getAsset(DRAWING_STORE, boardId, imageUrl)
);

export const saveUploadedOverlay = (boardId: string, imageUrl: string, dataUrl: string) => (
  saveAsset(UPLOADED_OVERLAY_STORE, boardId, imageUrl, dataUrl)
);

export const getUploadedOverlay = (boardId: string, imageUrl: string) => (
  getAsset(UPLOADED_OVERLAY_STORE, boardId, imageUrl)
);

export const getPracticeAssetImageUrls = async (boardId: string) => {
  const [drawingAssets, uploadedOverlays] = await Promise.all([
    getAll<StoredImageAsset>(DRAWING_STORE),
    getAll<StoredImageAsset>(UPLOADED_OVERLAY_STORE),
  ]);

  return Array.from(new Set(
    [...drawingAssets, ...uploadedOverlays]
      .filter(asset => asset.boardId === boardId)
      .map(asset => asset.imageUrl)
  ));
};

const deleteAssetsForBoard = async (storeName: typeof DRAWING_STORE | typeof UPLOADED_OVERLAY_STORE, boardId: string) => {
  const db = await openDb();

  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const index = transaction.objectStore(storeName).index('boardId');
    const request = index.openKeyCursor(IDBKeyRange.only(boardId));

    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      cursor.delete();
      cursor.continue();
    };

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
};

export const deleteBoardData = async (boardId: string) => {
  await Promise.all([
    deleteBoard(boardId),
    deleteDrawnImages(boardId),
    deleteAssetsForBoard(DRAWING_STORE, boardId),
    deleteAssetsForBoard(UPLOADED_OVERLAY_STORE, boardId),
  ]);
};

export const migrateLocalStorageToIndexedDb = async () => {
  if (typeof window === 'undefined' || localStorage.getItem(MIGRATION_KEY) === 'true') return;

  const savedBoards = localStorage.getItem('Sketchref_boards');
  const savedDrawn = localStorage.getItem('Sketchref_drawn');

  try {
    const boards = savedBoards ? JSON.parse(savedBoards) as Board[] : [];
    const drawnMap = savedDrawn ? JSON.parse(savedDrawn) as Record<string, string[]> : {};

    await Promise.all(boards.map(board => saveBoard(board)));
    await Promise.all(Object.entries(drawnMap).map(([boardId, images]) => saveDrawnImages(boardId, images)));

    localStorage.setItem(MIGRATION_KEY, 'true');
    localStorage.removeItem('Sketchref_boards');
    localStorage.removeItem('Sketchref_drawn');
  } catch (error) {
    console.warn('Failed to migrate Sketchref localStorage data to IndexedDB', error);
  }
};
