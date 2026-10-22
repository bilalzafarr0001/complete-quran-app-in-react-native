package com.myapp.adhan

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** An adhan alarm went off: start playing it. */
class AdhanAlarmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val alarm = AdhanAlarm.fromIntent(intent) ?: return
    AdhanAlarms.forget(context, alarm.id)
    // A long-delayed alarm (e.g. phone was off) would play at the wrong time.
    if (System.currentTimeMillis() - alarm.at > MAX_LATE_MS) return
    AdhanService.start(context, alarm)
  }

  private companion object {
    const val MAX_LATE_MS = 30 * 60 * 1000L
  }
}

/** Alarms are cleared on reboot and app update; put them back. */
class AdhanRestoreReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    when (intent.action) {
      Intent.ACTION_BOOT_COMPLETED,
      Intent.ACTION_MY_PACKAGE_REPLACED,
      "android.app.action.SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED" ->
          AdhanAlarms.restore(context)
    }
  }
}
