// Silence console noise in tests
global.console.warn = jest.fn();
global.console.error = jest.fn();

// Mock React Native modules that aren't available in Node
jest.mock('react-native', () => ({
  Platform: { OS: 'ios', select: (obj: any) => obj.ios },
  Alert: { alert: jest.fn() },
  NativeModules: {},
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
  clear: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-file-system', () => ({
  documentDirectory: '/mock/documents/',
  getInfoAsync: jest.fn().mockResolvedValue({ exists: false }),
  makeDirectoryAsync: jest.fn().mockResolvedValue(undefined),
  readAsStringAsync: jest.fn().mockResolvedValue('mock file content'),
  deleteAsync: jest.fn().mockResolvedValue(undefined),
  downloadAsync: jest.fn(),
  createDownloadResumable: jest.fn(() => ({
    downloadAsync: jest.fn().mockResolvedValue({ uri: '/mock/path/model.gguf' }),
    pauseAsync: jest.fn(),
  })),
  EncodingType: { UTF8: 'utf8', Base64: 'base64' },
}));

jest.mock('expo-sqlite', () => {
  // In-memory store shared across the "connection"
  const tables: Record<string, any[]> = {};
  let idCounters: Record<string, number> = {};

  const execAll = (sql: string) => {
    const stmts = sql.split(';').map(s => s.trim()).filter(Boolean);
    for (const stmt of stmts) {
      const match = stmt.match(/CREATE TABLE IF NOT EXISTS (\w+)/i);
      if (match) {
        if (!tables[match[1]]) {
          tables[match[1]] = [];
          idCounters[match[1]] = 0;
        }
      }
    }
  };

  const mockDb = {
    execAsync: jest.fn().mockImplementation(async (sql: string) => { execAll(sql); }),
    runAsync: jest.fn().mockImplementation(async (sql: string, ...args: any[]) => {
      const insert = sql.match(/INSERT INTO (\w+)/i);
      const update = sql.match(/UPDATE (\w+)/i);
      const del = sql.match(/DELETE FROM (\w+)/i);
      if (insert) {
        const table = insert[1];
        if (!tables[table]) { tables[table] = []; idCounters[table] = 0; }
        idCounters[table]++;
        return { lastInsertRowId: idCounters[table], changes: 1 };
      }
      return { lastInsertRowId: 0, changes: 1 };
    }),
    getAllAsync: jest.fn().mockImplementation(async (sql: string) => {
      const match = sql.match(/FROM (\w+)/i);
      if (match && tables[match[1]]) return tables[match[1]];
      return [];
    }),
    getFirstAsync: jest.fn().mockResolvedValue(null),
  };

  return {
    openDatabaseAsync: jest.fn().mockResolvedValue(mockDb),
  };
});

jest.mock('expo-notifications', () => ({
  requestPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  getPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  scheduleNotificationAsync: jest.fn().mockResolvedValue('mock-notification-id'),
  cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
  cancelAllScheduledNotificationsAsync: jest.fn().mockResolvedValue(undefined),
  getAllScheduledNotificationsAsync: jest.fn().mockResolvedValue([]),
  setNotificationHandler: jest.fn(),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  AndroidImportance: { MAX: 5 },
  setNotificationChannelAsync: jest.fn(),
  SchedulableTriggerInputTypes: { DATE: 'date', CALENDAR: 'calendar' },
}));

jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn(),
  isTaskRegisteredAsync: jest.fn().mockResolvedValue(false),
}));

jest.mock('expo-background-fetch', () => ({
  registerTaskAsync: jest.fn().mockResolvedValue(undefined),
  unregisterTaskAsync: jest.fn().mockResolvedValue(undefined),
  BackgroundFetchResult: { NewData: 'newData', NoData: 'noData', Failed: 'failed' },
}));

jest.mock('llama.rn', () => ({
  initLlama: jest.fn().mockResolvedValue({
    completion: jest.fn().mockResolvedValue({ text: 'Mock AI response' }),
    embedding: jest.fn().mockResolvedValue({ embedding: Array(768).fill(0.1) }),
    release: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock('expo-av', () => ({
  Audio: {
    requestPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
    setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
    Recording: {
      createAsync: jest.fn().mockResolvedValue({
        recording: {
          stopAndUnloadAsync: jest.fn().mockResolvedValue(undefined),
          getURI: jest.fn().mockReturnValue('/mock/audio.m4a'),
        },
      }),
      RecordingOptionsPresets: { HIGH_QUALITY: {} },
    },
  },
}));
