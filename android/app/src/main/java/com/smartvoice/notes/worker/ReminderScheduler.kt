package com.smartvoice.notes.worker

import android.content.Context
import androidx.work.*
import java.util.concurrent.TimeUnit

/**
 * كلاس مساعد لإدارة وجدولة وإلغاء تنبيهات WorkManager
 * تم ضبط قيود التشغيل (Battery & Network Constraints) لتقليل استهلاك البطارية
 * بحيث تعمل المهام فقط عند توفر اتصال شبكة أو عند اتصال الجهاز بالشاحن وعدم انخفاض الطاقة.
 */
class ReminderScheduler(context: Context) {

    private val appContext: Context = context.applicationContext
    private val workManager = WorkManager.getInstance(appContext)

    /**
     * جدولة تنبيه لملاحظة في وقت مستقبلي محدد مع قيود الحفاظ على الطاقة والشبكة
     * @param noteId معرف الملاحظة لربط التنبيه بها
     * @param title عنوان الملاحظة ليظهر في الإشعار
     * @param content نص الملاحظة
     * @param reminderTimeMillis الوقت المستهدف بالمللي ثانية (Unix Timestamp)
     * @param requireCharging تشغيل التنبيه فقط عند توفر الشحن لتقليل استهلاك البطارية
     * @param requireNetwork تشغيل التنبيه فقط عند توفر اتصال بالشبكة
     */
    fun scheduleReminder(
        noteId: Long,
        title: String,
        content: String,
        reminderTimeMillis: Long,
        requireCharging: Boolean = true,
        requireNetwork: Boolean = true
    ) {
        val currentTime = System.currentTimeMillis()
        val initialDelay = reminderTimeMillis - currentTime

        // إذا كان الوقت قد مضى بالفعل، لا يتم الجدولة
        if (initialDelay <= 0) return

        // تجهيز البيانات لإرسالها للـ Worker
        val inputData = workDataOf(
            ReminderWorker.KEY_NOTE_ID to noteId,
            ReminderWorker.KEY_NOTE_TITLE to title,
            ReminderWorker.KEY_NOTE_CONTENT to content
        )

        // ضبط قيود العمل (Constraints) لتوفير البطارية والشبكة
        val constraintsBuilder = Constraints.Builder()
            .setRequiresBatteryNotLow(true) // تمنع الاستنزاف عند انخفاض البطارية

        if (requireCharging) {
            constraintsBuilder.setRequiresCharging(true) // تعمل فقط عند توصيل الشاحن
        }

        if (requireNetwork) {
            constraintsBuilder.setRequiredNetworkType(NetworkType.CONNECTED) // تتطلب اتصال بالإنترنت
        }

        val constraints = constraintsBuilder.build()

        // بناء طلب العمل لمرة واحدة مع تحديد مهلة البداية (Initial Delay)
        val reminderWorkRequest = OneTimeWorkRequestBuilder<ReminderWorker>()
            .setInitialDelay(initialDelay, TimeUnit.MILLISECONDS)
            .setConstraints(constraints)
            .setInputData(inputData)
            .addTag("reminder_tag_$noteId")
            .build()

        // تسجيل العمل كعمل فريد (Unique Work) لاستبدال أي تنبيه سابق لنفس الملاحظة
        workManager.enqueueUniqueWork(
            getUniqueWorkName(noteId),
            ExistingWorkPolicy.REPLACE,
            reminderWorkRequest
        )
    }

    /**
     * إلغاء التنبيه المجدول عند حذف الملاحظة أو إنجازها
     * @param noteId معرف الملاحظة
     */
    fun cancelReminder(noteId: Long) {
        workManager.cancelUniqueWork(getUniqueWorkName(noteId))
    }

    private fun getUniqueWorkName(noteId: Long): String {
        return "reminder_work_$noteId"
    }
}
