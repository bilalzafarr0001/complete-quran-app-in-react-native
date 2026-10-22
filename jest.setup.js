/* eslint-env jest */

// In-memory AsyncStorage.
jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map();
  const api = {
    getItem: jest.fn(async k => (store.has(k) ? store.get(k) : null)),
    setItem: jest.fn(async (k, v) => {
      store.set(k, v);
    }),
    removeItem: jest.fn(async k => {
      store.delete(k);
    }),
    getAllKeys: jest.fn(async () => [...store.keys()]),
    removeMany: jest.fn(async keys => keys.forEach(k => store.delete(k))),
    clear: jest.fn(async () => store.clear()),
    __store: store,
  };
  return { __esModule: true, default: api };
});

// GPS: tests set the position with Geolocation.__setPosition().
jest.mock('@react-native-community/geolocation', () => {
  let position = { coords: { latitude: 31.5204, longitude: 74.3587 } };
  return {
    __esModule: true,
    default: {
      setRNConfiguration: jest.fn(),
      requestAuthorization: jest.fn(ok => ok && ok()),
      getCurrentPosition: jest.fn((ok, fail) =>
        position ? ok(position) : fail({ code: 2 }),
      ),
      __setPosition: p => {
        position = p;
      },
    },
  };
});

// No real network in tests: anything not mocked behaves like being offline.
global.fetch = jest.fn(() => Promise.reject(new Error('offline (test)')));

// Notifee (adhan notifications): records scheduled triggers.
jest.mock('@notifee/react-native', () => {
  const triggers = new Map();
  const api = {
    createChannels: jest.fn(async () => {}),
    deleteChannel: jest.fn(async () => {}),
    getNotificationSettings: jest.fn(async () => ({
      authorizationStatus: 1,
      android: { alarm: 1 },
    })),
    requestPermission: jest.fn(async () => ({
      authorizationStatus: 1,
      android: { alarm: 1 },
    })),
    getTriggerNotificationIds: jest.fn(async () => [...triggers.keys()]),
    cancelTriggerNotifications: jest.fn(async ids =>
      ids.forEach(id => triggers.delete(id)),
    ),
    createTriggerNotification: jest.fn(async (n, t) => {
      triggers.set(n.id, { notification: n, trigger: t });
      return n.id;
    }),
    cancelNotification: jest.fn(async () => {}),
    onForegroundEvent: jest.fn(() => () => {}),
    onBackgroundEvent: jest.fn(),
    openAlarmPermissionSettings: jest.fn(async () => {}),
    openNotificationSettings: jest.fn(async () => {}),
    __triggers: triggers,
  };
  return {
    __esModule: true,
    default: api,
    AlarmType: {
      SET_AND_ALLOW_WHILE_IDLE: 1,
      SET_EXACT_AND_ALLOW_WHILE_IDLE: 3,
    },
    AndroidCategory: { ALARM: 'alarm', REMINDER: 'reminder' },
    AndroidImportance: { DEFAULT: 3, HIGH: 4 },
    AndroidNotificationSetting: { NOT_SUPPORTED: -1, DISABLED: 0, ENABLED: 1 },
    AndroidVisibility: { PUBLIC: 1 },
    AuthorizationStatus: { NOT_DETERMINED: -1, DENIED: 0, AUTHORIZED: 1 },
    EventType: { DISMISSED: 0, PRESS: 1, ACTION_PRESS: 2 },
    TriggerType: { TIMESTAMP: 0 },
  };
});

// Track player (Quran recitation): a tiny in-memory queue.
jest.mock('react-native-track-player', () => {
  let queue = [];
  let index = -1;
  const api = {
    setupPlayer: jest.fn(async () => {}),
    updateOptions: jest.fn(async () => {}),
    registerPlaybackService: jest.fn(),
    addEventListener: jest.fn(() => ({ remove() {} })),
    reset: jest.fn(async () => {
      queue = [];
      index = -1;
    }),
    add: jest.fn(async tracks => {
      queue.push(...tracks);
      if (index < 0) index = 0;
    }),
    skip: jest.fn(async i => {
      index = i;
    }),
    skipToNext: jest.fn(async () => {}),
    skipToPrevious: jest.fn(async () => {}),
    setRepeatMode: jest.fn(async () => {}),
    play: jest.fn(async () => {}),
    pause: jest.fn(async () => {}),
    seekTo: jest.fn(async () => {}),
    __state: () => ({ queue, index }),
  };
  return {
    __esModule: true,
    default: api,
    AppKilledPlaybackBehavior: { StopPlaybackAndRemoveNotification: 'stop' },
    Capability: {
      Play: 0,
      Pause: 1,
      SkipToNext: 2,
      SkipToPrevious: 3,
      SeekTo: 4,
      Stop: 5,
    },
    Event: {
      PlaybackError: 'playback-error',
      PlaybackActiveTrackChanged: 'playback-active-track-changed',
      RemotePlay: 'remote-play',
      RemotePause: 'remote-pause',
      RemoteStop: 'remote-stop',
      RemoteNext: 'remote-next',
      RemotePrevious: 'remote-previous',
      RemoteSeek: 'remote-seek',
    },
    RepeatMode: { Off: 0, Track: 1, Queue: 2 },
    useActiveTrack: () => undefined,
    useIsPlaying: () => ({ playing: false, bufferingDuringPlay: false }),
    useProgress: () => ({ position: 0, duration: 0, buffered: 0 }),
    useTrackPlayerEvents: () => {},
  };
});
