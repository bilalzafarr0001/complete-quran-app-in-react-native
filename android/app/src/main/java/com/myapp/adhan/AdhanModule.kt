package com.myapp.adhan

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

/** JS API: `NativeModules.NoorAdhan` (see src/noor/services/adhan.ts). */
class AdhanModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  override fun getName() = NAME

  /** Replaces all scheduled adhans with [alarms]: [{id, at, fajr, title, body, sound}]. */
  @ReactMethod
  fun schedule(alarms: ReadableArray, promise: Promise) {
    try {
      val list =
          (0 until alarms.size()).mapNotNull { i ->
            alarms.getMap(i)?.let {
              AdhanAlarm(
                  it.getString("id") ?: return@let null,
                  it.getDouble("at").toLong(),
                  it.getBoolean("fajr"),
                  it.getString("title") ?: "",
                  it.getString("body") ?: "",
                  if (it.hasKey("sound")) it.getString("sound") ?: "" else "",
              )
            }
          }
      AdhanAlarms.replaceAll(reactApplicationContext, list)
      promise.resolve(list.size)
    } catch (e: Exception) {
      promise.reject("E_ADHAN_SCHEDULE", e)
    }
  }

  @ReactMethod
  fun cancelAll(promise: Promise) {
    try {
      AdhanAlarms.cancelAll(reactApplicationContext)
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("E_ADHAN_CANCEL", e)
    }
  }

  /** Plays an adhan after [delayMs], through the same alarm → service path. */
  @ReactMethod
  fun test(
      fajr: Boolean,
      sound: String,
      delayMs: Double,
      title: String,
      body: String,
      promise: Promise,
  ) {
    try {
      val at = System.currentTimeMillis() + delayMs.toLong()
      AdhanAlarms.setOnce(
          reactApplicationContext, AdhanAlarm("test-adhan", at, fajr, title, body, sound))
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("E_ADHAN_TEST", e)
    }
  }

  @ReactMethod
  fun stop(promise: Promise) {
    AdhanService.stop(reactApplicationContext)
    promise.resolve(null)
  }

  companion object {
    const val NAME = "NoorAdhan"
  }
}

class AdhanPackage : BaseReactPackage() {
  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
      if (name == AdhanModule.NAME) AdhanModule(reactContext) else null

  override fun getReactModuleInfoProvider() = ReactModuleInfoProvider {
    mapOf(
        AdhanModule.NAME to
            ReactModuleInfo(
                AdhanModule.NAME,
                AdhanModule::class.java.name,
                canOverrideExistingModule = false,
                needsEagerInit = false,
                isCxxModule = false,
                isTurboModule = false,
            ))
  }
}
