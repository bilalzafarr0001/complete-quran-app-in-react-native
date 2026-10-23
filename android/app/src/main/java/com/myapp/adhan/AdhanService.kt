package com.myapp.adhan

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.ContentResolver
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.media.MediaPlayer
import android.net.Uri
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat
import com.myapp.R

/**
 * Plays the full adhan from res/raw on the ALARM audio stream, so it is heard
 * even when the phone is on silent/vibrate or notification volume is low, and
 * isn't cut short like long notification sounds are on many Android brands.
 * Runs as a foreground service with a "Stop adhan" notification.
 */
class AdhanService : Service() {
  private var player: MediaPlayer? = null
  private var focusRequest: AudioFocusRequest? = null
  private var current: AdhanAlarm? = null

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == ACTION_STOP) {
      finish(completed = false)
      return START_NOT_STICKY
    }
    val alarm = AdhanAlarm.fromIntent(intent)
    if (alarm == null) {
      stopSelf()
      return START_NOT_STICKY
    }
    try {
      ServiceCompat.startForeground(
          this,
          NOTIFICATION_ID,
          AdhanNotifications.playing(this, alarm),
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q)
              ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK
          else 0,
      )
    } catch (e: Exception) {
      AdhanNotifications.fallback(this, alarm)
      stopSelf()
      return START_NOT_STICKY
    }
    releasePlayer()
    current = alarm
    play(alarm)
    return START_NOT_STICKY
  }

  override fun onDestroy() {
    releasePlayer()
    super.onDestroy()
  }

  private fun play(alarm: AdhanAlarm) {
    val attrs =
        AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ALARM)
            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
            .build()
    try {
      val mp = MediaPlayer()
      player = mp
      mp.setAudioAttributes(attrs)
      mp.setWakeMode(applicationContext, PowerManager.PARTIAL_WAKE_LOCK)
      resources.openRawResourceFd(AdhanNotifications.soundRes(this, alarm)).use { afd ->
        mp.setDataSource(afd.fileDescriptor, afd.startOffset, afd.length)
      }
      mp.setOnCompletionListener { finish(completed = true) }
      mp.setOnErrorListener { _, _, _ ->
        finish(completed = true)
        true
      }
      mp.prepare()
      requestFocus(attrs)
      mp.start()
    } catch (e: Exception) {
      releasePlayer()
      ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
      AdhanNotifications.fallback(this, alarm)
      current = null
      stopSelf()
    }
  }

  /** Ends playback; after a full adhan, leaves a plain "time for prayer" notification. */
  private fun finish(completed: Boolean) {
    releasePlayer()
    val alarm = current
    current = null
    ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
    if (completed && alarm != null) AdhanNotifications.done(this, alarm)
    stopSelf()
  }

  /** Pauses Quran recitation or music while the adhan plays. */
  private fun requestFocus(attrs: AudioAttributes) {
    val am = getSystemService(Context.AUDIO_SERVICE) as AudioManager
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val req =
          AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
              .setAudioAttributes(attrs)
              .setOnAudioFocusChangeListener {}
              .build()
      focusRequest = req
      am.requestAudioFocus(req)
    } else {
      @Suppress("DEPRECATION")
      am.requestAudioFocus(null, AudioManager.STREAM_ALARM, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
    }
  }

  private fun releasePlayer() {
    player?.let {
      try {
        it.stop()
      } catch (_: Exception) {}
      it.release()
    }
    player = null
    val am = getSystemService(Context.AUDIO_SERVICE) as AudioManager
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      focusRequest?.let { am.abandonAudioFocusRequest(it) }
      focusRequest = null
    } else {
      @Suppress("DEPRECATION") am.abandonAudioFocus(null)
    }
  }

  companion object {
    private const val ACTION_PLAY = "com.myapp.adhan.PLAY"
    private const val ACTION_STOP = "com.myapp.adhan.STOP"
    private const val NOTIFICATION_ID = 6100

    fun start(context: Context, alarm: AdhanAlarm) {
      val intent = alarm.putInto(Intent(context, AdhanService::class.java).setAction(ACTION_PLAY))
      try {
        ContextCompat.startForegroundService(context, intent)
      } catch (e: Exception) {
        // Android 12+ can refuse to start it from the background (e.g. the
        // "Alarms & reminders" permission is off). Use a notification sound.
        AdhanNotifications.fallback(context, alarm)
      }
    }

    fun stop(context: Context) {
      try {
        context.startService(stopIntent(context))
      } catch (_: Exception) {}
    }

    internal fun stopIntent(context: Context) =
        Intent(context, AdhanService::class.java).setAction(ACTION_STOP)
  }
}

internal object AdhanNotifications {
  private const val CHANNEL_PLAYING = "noor-adhan-playing-v1"
  private const val CHANNEL_DONE = "noor-adhan-done-v1"
  // Backup channels play the adhan as the notification sound (alarm stream),
  // one per sound file. These two are from older versions and are removed.
  private val OLD_CHANNELS = listOf("noor-adhan-sound-v1", "noor-adhan-sound-fajr-v1")
  private const val COLOR = 0xFFA23E5C.toInt()
  // Not the service's id: removing the foreground notification is async and
  // would also remove a notification posted right after with the same id.
  private const val PRAYER_NOTIFICATION_ID = 6101

  /** The res/raw file to play: the alarm's chosen sound, else the full adhan. */
  fun soundRes(context: Context, alarm: AdhanAlarm): Int {
    val chosen =
        if (alarm.sound.isEmpty()) 0
        else context.resources.getIdentifier(alarm.sound, "raw", context.packageName)
    return if (chosen != 0) chosen else if (alarm.fajr) R.raw.adhan_fajr else R.raw.adhan
  }

  fun playing(context: Context, alarm: AdhanAlarm): Notification {
    ensureChannels(context)
    val stop =
        PendingIntent.getService(
            context,
            1,
            AdhanService.stopIntent(context),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    return base(context, CHANNEL_PLAYING, alarm)
        .setOngoing(true)
        .setSilent(true)
        .setCategory(NotificationCompat.CATEGORY_ALARM)
        .addAction(0, "Stop adhan", stop)
        // Swiping it away (allowed on Android 14+) also stops the adhan.
        .setDeleteIntent(stop)
        .build()
  }

  fun done(context: Context, alarm: AdhanAlarm) {
    ensureChannels(context)
    notify(
        context,
        base(context, CHANNEL_DONE, alarm)
            .setSilent(true)
            .setAutoCancel(true)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .build())
  }

  fun fallback(context: Context, alarm: AdhanAlarm) {
    ensureChannels(context)
    val res = soundRes(context, alarm)
    val channel = soundChannel(context, res)
    notify(
        context,
        base(context, channel, alarm)
            .setAutoCancel(true)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            // Android 7 has no channels: the sound is set on the notification.
            .setSound(soundUri(context, res), AudioManager.STREAM_ALARM)
            .build())
  }

  /** A backup channel whose notification sound is this adhan file. */
  private fun soundChannel(context: Context, res: Int): String {
    val name = context.resources.getResourceEntryName(res)
    val id = "noor-adhan-sound-$name-v1"
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O &&
        manager(context).getNotificationChannel(id) == null) {
      manager(context)
          .createNotificationChannel(
              NotificationChannel(id, "Adhan backup ($name)", NotificationManager.IMPORTANCE_HIGH)
                  .apply {
                    description = "Used only if Android blocks the adhan player"
                    lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                    setSound(
                        soundUri(context, res),
                        AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_ALARM)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                            .build())
                    enableVibration(true)
                  })
    }
    return id
  }

  private fun base(context: Context, channel: String, alarm: AdhanAlarm) =
      NotificationCompat.Builder(context, channel)
          .setSmallIcon(R.drawable.ic_stat_adhan)
          .setColor(COLOR)
          .setContentTitle(alarm.title)
          .setContentText(alarm.body)
          .setWhen(alarm.at)
          .setShowWhen(true)
          .setPriority(NotificationCompat.PRIORITY_HIGH)
          .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
          .setContentIntent(openApp(context))

  private fun openApp(context: Context): PendingIntent? {
    val launch = context.packageManager.getLaunchIntentForPackage(context.packageName) ?: return null
    return PendingIntent.getActivity(
        context, 0, launch, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  }

  private fun notify(context: Context, notification: Notification) {
    try {
      manager(context).notify(PRAYER_NOTIFICATION_ID, notification)
    } catch (_: SecurityException) {
      // Notification permission was denied.
    }
  }

  private fun soundUri(context: Context, res: Int): Uri =
      Uri.parse("${ContentResolver.SCHEME_ANDROID_RESOURCE}://${context.packageName}/$res")

  private fun ensureChannels(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    fun channel(id: String, name: String, desc: String, importance: Int) =
        NotificationChannel(id, name, importance).apply {
          description = desc
          lockscreenVisibility = Notification.VISIBILITY_PUBLIC
          setSound(null, null)
          enableVibration(false)
        }
    val manager = manager(context)
    OLD_CHANNELS.forEach { manager.deleteNotificationChannel(it) }
    manager.createNotificationChannels(
        listOf(
            channel(
                CHANNEL_PLAYING,
                "Adhan",
                "Shown while the adhan is playing",
                NotificationManager.IMPORTANCE_HIGH),
            channel(
                CHANNEL_DONE,
                "Prayer time",
                "After the adhan has finished",
                NotificationManager.IMPORTANCE_LOW),
        ))
  }

  private fun manager(context: Context) =
      context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
}
