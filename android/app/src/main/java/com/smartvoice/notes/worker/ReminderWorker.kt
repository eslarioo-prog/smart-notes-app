package com.smartvoice.notes.worker

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.smartvoice.notes.notification.NotificationHelper

/**
 * Worker غير متزامن يستدعيه WorkManager عند حلول وقت التنبيه المجدول
 */
class ReminderWorker(
    context: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(context, workerParams) {

    companion object {
        const val KEY_NOTE_ID = "key_note_id"
        const val KEY_NOTE_TITLE = "key_note_title"
        const val KEY_NOTE_CONTENT = "key_note_content"
    }

    override suspend fun doWork(): Result {
        // استلام البيانات الممررة عبر inputData
        val noteId = inputData.getLong(KEY_NOTE_ID, 0L)
        val title = inputData.getString(KEY_NOTE_TITLE) ?: "تنبيه ملاحظة"
        val content = inputData.getString(KEY_NOTE_CONTENT) ?: "حان موعد مذكرتك المجدولة الآن."

        return try {
            // تشغيل NotificationHelper لإظهار الإشعار للمستخدم
            val notificationHelper = NotificationHelper(applicationContext)
            notificationHelper.showNotification(
                notificationId = if (noteId != 0L) noteId.toInt() else System.currentTimeMillis().toInt(),
                title = title,
                content = content
            )

            Result.success()
        } catch (e: Exception) {
            e.printStackTrace()
            Result.failure()
        }
    }
}
