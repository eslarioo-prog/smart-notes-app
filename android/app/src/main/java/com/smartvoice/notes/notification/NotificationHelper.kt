package com.smartvoice.notes.notification

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

/**
 * كلاس مساعد لإدارة قناة الإشعارات (Notification Channel) وإظهار التنبيهات
 */
class NotificationHelper(private val context: Context) {

    companion object {
        const val CHANNEL_ID = "smart_notes_reminders_channel"
        const val CHANNEL_NAME = "Smart Notes Reminders"
        const val CHANNEL_DESCRIPTION = "قناة إشعارات التنبيهات المجدولة والمذكرات الصوتية"
    }

    init {
        createNotificationChannel()
    }

    /**
     * إنشاء قناة الإشعارات الخاصة بالتنبيهات (إلزامي في Android 8.0+)
     */
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
            val audioAttributes = AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_REMINDER)
                .build()

            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = CHANNEL_DESCRIPTION
                enableLights(true)
                enableVibration(true)
                setSound(soundUri, audioAttributes)
            }

            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }

    /**
     * إظهار الإشعار للمستخدم مع صوت واهتزاز وفتح التطبيق عند النقر
     */
    fun showNotification(notificationId: Int, title: String, content: String) {
        // نية فتح التطبيق عند النقر على الإشعار
        val intent = context.packageManager.getLaunchIntentForPackage(context.packageName)?.apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }

        val pendingIntent = PendingIntent.getActivity(
            context,
            notificationId,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
        )

        val soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)

        val builder = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info) // أو أيقونة R.drawable.ic_notification المخصصة
            .setContentTitle(title)
            .setContentText(content)
            .setStyle(NotificationCompat.BigTextStyle().bigText(content))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setAutoCancel(true)
            .setSound(soundUri)
            .setVibrate(longArrayOf(0, 300, 150, 300))
            .setContentIntent(pendingIntent)

        val notificationManager = NotificationManagerCompat.from(context)

        // التحقق من صلاحية POST_NOTIFICATIONS في Android 13+
        try {
            notificationManager.notify(notificationId, builder.build())
        } catch (e: SecurityException) {
            // تحدث إذا لم يمنح المستخدم إذن POST_NOTIFICATIONS
            e.printStackTrace()
        }
    }
}
