const SKETCHREF_STORAGE_KEYS = [
  'Sketchref_boards',
  'Sketchref_drawn',
  'Sketchref_indexeddb_migrated_v1',
  'Sketchref_skip_practiced_images',
  'Sketchref_duration',
  'Sketchref_order_mode',
  'Sketchref_practice_count',
  'Sketchref_locale',
  'theme',
] as const;

type StorageRecoveryMode = 'normal' | 'safe' | 'reset';

export const initializeStorageRecovery = (): StorageRecoveryMode => {
  if (typeof window === 'undefined') return 'normal';

  const params = new URLSearchParams(window.location.search);
  const shouldResetStorage = params.get('Sketchref_reset') === '1';
  const shouldUseSafeMode = shouldResetStorage || params.get('Sketchref_safe_mode') === '1';

  if (shouldResetStorage) {
    SKETCHREF_STORAGE_KEYS.forEach(key => {
      localStorage.removeItem(key);
    });
    indexedDB.deleteDatabase('Sketchref-db');
    params.delete('Sketchref_reset');
    params.delete('Sketchref_safe_mode');

    const search = params.toString();
    const nextUrl = `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`;
    window.history.replaceState(null, '', nextUrl);
  }

  return shouldResetStorage ? 'reset' : shouldUseSafeMode ? 'safe' : 'normal';
};

export const STORAGE_RECOVERY_MODE = initializeStorageRecovery();
export const shouldSkipPersistentStorage = STORAGE_RECOVERY_MODE !== 'normal';
