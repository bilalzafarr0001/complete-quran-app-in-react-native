/**
 * @format
 */

import { AppRegistry } from 'react-native';
import TrackPlayer from 'react-native-track-player';
import App from './App';
import { name as appName } from './app.json';
import { handleAdhanEvent } from './src/noor/services/adhan';
import notifee from '@notifee/react-native';
import { PlaybackService } from './src/noor/services/playbackService';

// Adhan notification actions (e.g. "Stop adhan") while the app is closed.
notifee.onBackgroundEvent(handleAdhanEvent);

// Quran recitation: lock-screen / notification controls.
TrackPlayer.registerPlaybackService(() => PlaybackService);

AppRegistry.registerComponent(appName, () => App);
