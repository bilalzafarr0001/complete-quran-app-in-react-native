import TrackPlayer, { Event } from 'react-native-track-player';

/**
 * Runs in the background (registered in index.js) and handles the
 * lock-screen / notification / headset controls.
 */
export async function PlaybackService() {
  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
  TrackPlayer.addEventListener(Event.RemoteStop, () => TrackPlayer.reset());
  TrackPlayer.addEventListener(Event.RemoteNext, () =>
    TrackPlayer.skipToNext().catch(() => {}),
  );
  TrackPlayer.addEventListener(Event.RemotePrevious, () =>
    TrackPlayer.skipToPrevious().catch(() => {}),
  );
  TrackPlayer.addEventListener(Event.RemoteSeek, e =>
    TrackPlayer.seekTo(e.position),
  );
}
