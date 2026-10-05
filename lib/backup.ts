// Backup and restore: exports every gymsync:* AsyncStorage value to a
// JSON file the user can share (Files, AirDrop, cloud drive), and imports
// it back. This is the safety net for sideload reinstalls, which wipe
// AsyncStorage. Values are stored raw (exact strings), so import is a
// byte-for-byte restore.

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import { Share } from 'react-native';

const PREFIX = 'gymsync:';
const BACKUP_APP = 'gymsync-ios';

interface BackupFile {
  app: string;
  version: 1;
  exportedAt: number;
  data: Record<string, string>;
}

/** Collects every gymsync-namespaced value and writes it to a JSON file. Returns the file URI. */
export async function exportBackup(): Promise<string> {
  const allKeys = await AsyncStorage.getAllKeys();
  const ours = allKeys.filter((key) => key.startsWith(PREFIX));
  const pairs = await AsyncStorage.multiGet(ours);
  const data: Record<string, string> = {};
  for (const [key, value] of pairs) {
    if (value !== null) data[key] = value;
  }
  const backup: BackupFile = {
    app: BACKUP_APP,
    version: 1,
    exportedAt: Date.now(),
    data,
  };
  const fileName = `gymsync-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const file = new File(Paths.cache, fileName);
  const writer = file.writableStream().getWriter();
  try {
    await writer.write(new TextEncoder().encode(JSON.stringify(backup)));
  } finally {
    await writer.close();
  }
  return file.uri;
}

/** Shares a previously exported backup file through the iOS share sheet. */
export async function shareBackupFile(uri: string): Promise<void> {
  await Share.share({ url: uri, title: 'GymSync backup' });
}

/** Lets the user pick a backup JSON file and returns its parsed contents, or null if cancelled. */
export async function pickBackupFile(): Promise<BackupFile | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets || result.assets.length === 0) return null;
  const parsed = (await new File(result.assets[0].uri).json()) as Partial<BackupFile>;
  if (
    parsed.app !== BACKUP_APP ||
    typeof parsed.data !== 'object' ||
    parsed.data === null
  ) {
    throw new Error('Not a GymSync backup file.');
  }
  const data = parsed.data as Record<string, unknown>;
  for (const key of Object.keys(data)) {
    if (!key.startsWith(PREFIX) || typeof data[key] !== 'string') {
      throw new Error('Backup file is corrupt or invalid.');
    }
  }
  return parsed as BackupFile;
}

/** Writes every value from a validated backup into AsyncStorage. */
export async function restoreBackup(backup: BackupFile): Promise<number> {
  const entries = Object.entries(backup.data);
  if (entries.length > 0) {
    await AsyncStorage.multiSet(entries);
  }
  return entries.length;
}
