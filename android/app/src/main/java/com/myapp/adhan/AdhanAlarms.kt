package com.myapp.adhan

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import org.json.JSONArray
import org.json.JSONObject

/** One scheduled adhan. `sound` names a res/raw file ("" = the full adhan). */
data class AdhanAlarm(
    val id: String,
    val at: Long,
    val fajr: Boolean,
    val title: String,
    val body: String,
    val sound: String = "",
) {
  fun toJson(): JSONObject =
      JSONObject()
          .put("id", id)
          .put("at", at)
          .put("fajr", fajr)
          .put("title", title)
          .put("body", body)
          .put("sound", sound)

  fun putInto(intent: Intent): Intent =
      intent
          .putExtra(EXTRA_ID, id)
          .putExtra(EXTRA_AT, at)
          .putExtra(EXTRA_FAJR, fajr)
          .putExtra(EXTRA_TITLE, title)
          .putExtra(EXTRA_BODY, body)
          .putExtra(EXTRA_SOUND, sound)

  companion object {
    private const val EXTRA_ID = "id"
    private const val EXTRA_AT = "at"
    private const val EXTRA_FAJR = "fajr"
    private const val EXTRA_TITLE = "title"
    private const val EXTRA_BODY = "body"
    private const val EXTRA_SOUND = "sound"

    fun fromJson(o: JSONObject) =
        AdhanAlarm(
            o.getString("id"),
            o.getLong("at"),
            o.getBoolean("fajr"),
            o.getString("title"),
            o.getString("body"),
            o.optString("sound", ""),
        )

    fun fromIntent(intent: Intent?): AdhanAlarm? {
      val id = intent?.getStringExtra(EXTRA_ID) ?: return null
      return AdhanAlarm(
          id,
          intent.getLongExtra(EXTRA_AT, 0L),
          intent.getBooleanExtra(EXTRA_FAJR, false),
          intent.getStringExtra(EXTRA_TITLE) ?: "",
          intent.getStringExtra(EXTRA_BODY) ?: "",
          intent.getStringExtra(EXTRA_SOUND) ?: "",
      )
    }
  }
}

/**
 * Schedules adhan alarms with AlarmManager. The list is kept in
 * SharedPreferences so it can be restored after a reboot or app update.
 */
object AdhanAlarms {
  private const val PREFS = "noor_adhan"
  private const val KEY = "alarms"
  private const val ACTION_FIRE = "com.myapp.adhan.FIRE"

  fun canScheduleExact(context: Context): Boolean =
      Build.VERSION.SDK_INT < Build.VERSION_CODES.S ||
          alarmManager(context).canScheduleExactAlarms()

  /** Cancels every stored alarm and schedules [alarms] instead. */
  @Synchronized
  fun replaceAll(context: Context, alarms: List<AdhanAlarm>) {
    load(context).forEach { cancel(context, it) }
    val now = System.currentTimeMillis()
    val future = alarms.filter { it.at > now }
    save(context, future)
    future.forEach { set(context, it) }
  }

  /** Re-arms stored alarms (after boot, update, or exact-alarm permission change). */
  @Synchronized
  fun restore(context: Context) {
    replaceAll(context, load(context))
  }

  @Synchronized
  fun cancelAll(context: Context) {
    replaceAll(context, emptyList())
  }

  /** Called once an alarm has fired, so it isn't restored again. */
  @Synchronized
  fun forget(context: Context, id: String) {
    save(context, load(context).filter { it.id != id })
  }

  /** Schedules a one-off alarm that isn't stored (the "Test adhan" button). */
  fun setOnce(context: Context, alarm: AdhanAlarm) = set(context, alarm)

  private fun set(context: Context, alarm: AdhanAlarm) {
    val am = alarmManager(context)
    val pi = pendingIntent(context, alarm, PendingIntent.FLAG_UPDATE_CURRENT) ?: return
    // Exact alarms fire on time in Doze and let the receiver start the
    // playback service from the background (Android 12+).
    if (canScheduleExact(context)) {
      am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, alarm.at, pi)
    } else {
      am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, alarm.at, pi)
    }
  }

  private fun cancel(context: Context, alarm: AdhanAlarm) {
    pendingIntent(context, alarm, PendingIntent.FLAG_NO_CREATE)?.let {
      alarmManager(context).cancel(it)
      it.cancel()
    }
  }

  private fun pendingIntent(context: Context, alarm: AdhanAlarm, flags: Int): PendingIntent? {
    val intent =
        alarm.putInto(
            Intent(context, AdhanAlarmReceiver::class.java)
                .setAction(ACTION_FIRE)
                // The data URI keeps each alarm's PendingIntent distinct.
                .setData(Uri.parse("noor-adhan://alarm/${Uri.encode(alarm.id)}")))
    return PendingIntent.getBroadcast(context, 0, intent, flags or PendingIntent.FLAG_IMMUTABLE)
  }

  private fun alarmManager(context: Context) =
      context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

  private fun load(context: Context): List<AdhanAlarm> {
    val raw = prefs(context).getString(KEY, null) ?: return emptyList()
    return try {
      val arr = JSONArray(raw)
      List(arr.length()) { AdhanAlarm.fromJson(arr.getJSONObject(it)) }
    } catch (e: Exception) {
      emptyList()
    }
  }

  private fun save(context: Context, alarms: List<AdhanAlarm>) {
    val arr = JSONArray()
    alarms.forEach { arr.put(it.toJson()) }
    prefs(context).edit().putString(KEY, arr.toString()).apply()
  }

  private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
}
