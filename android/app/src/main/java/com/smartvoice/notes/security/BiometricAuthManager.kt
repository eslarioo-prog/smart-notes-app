package com.smartvoice.notes.security

import android.content.Context
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricManager.Authenticators.BIOMETRIC_STRONG
import androidx.biometric.BiometricManager.Authenticators.DEVICE_CREDENTIAL
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity

/**
 * كلاس لإدارة المصادقة البيومترية وحماية الملاحظات بالبصمة
 * يستخدم AndroidX BiometricPrompt API لدعم البصمة وقفل الجهاز مع مراعاة تجربة المستخدم:
 * - فحص توفر وتوافق مستشعر البصمة قبل العرض لتفادي أي أخطاء مفاجئة.
 * - طلب البصمة فقط عند النقر على ملاحظة مشفرة أو فتح قسم الملاحظات المحمية.
 * - دعم الرجوع لكلمة مرور / رمز قفل الهاتف كخيار بديل آمن (Device Credential).
 */
class BiometricAuthManager(context: Context) {

    private val appContext: Context = context.applicationContext

    /**
     * التحقق مما إذا كان الجهاز يدعم ويحتوي على بصمة مسجلة ونشطة
     */
    fun isBiometricAvailable(): Boolean {
        val biometricManager = BiometricManager.from(appContext)
        return when (biometricManager.canAuthenticate(BIOMETRIC_STRONG or DEVICE_CREDENTIAL)) {
            BiometricManager.BIOMETRIC_SUCCESS -> true
            else -> false
        }
    }

    /**
     * تشغيل نافذة المصادقة بالبصمة للمستخدم
     * @param activity الـ FragmentActivity الحالية لعرض الـ Prompt
     * @param title عنوان نافذة البصمة
     * @param subtitle وصف فرعي يشرح سبب طلب البصمة
     * @param onSuccess دالة استدعاء عند نجاح المصادقة بالبصمة
     * @param onError دالة استدعاء عند الفشل أو الإلغاء
     */
    fun authenticate(
        activity: FragmentActivity,
        title: String = "المصادقة بالبصمة",
        subtitle: String = "يرجى تأكيد هويتك لفتح الملاحظة المحمية",
        negativeButtonText: String = "استخدام رمز القفل",
        onSuccess: () -> Unit,
        onError: (String) -> Unit
    ) {
        val executor = ContextCompat.getMainExecutor(activity)

        val callback = object : BiometricPrompt.AuthenticationCallback() {
            override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                super.onAuthenticationSucceeded(result)
                onSuccess()
            }

            override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                super.onAuthenticationError(errorCode, errString)
                if (errorCode == BiometricPrompt.ERROR_USER_CANCELED ||
                    errorCode == BiometricPrompt.ERROR_NEGATIVE_BUTTON) {
                    onError("تم إلغاء المصادقة من قِبل المستخدم.")
                } else {
                    onError(errString.toString())
                }
            }

            override fun onAuthenticationFailed() {
                super.onAuthenticationFailed()
                // يتم إعطاء المستخدم فرصة أخرى للمحاولة تلقائياً من قبل النظام
            }
        }

        val promptInfo = BiometricPrompt.PromptInfo.Builder()
            .setTitle(title)
            .setSubtitle(subtitle)
            .setAllowedAuthenticators(BIOMETRIC_STRONG or DEVICE_CREDENTIAL)
            .build()

        val biometricPrompt = BiometricPrompt(activity, executor, callback)
        biometricPrompt.authenticate(promptInfo)
    }
}
