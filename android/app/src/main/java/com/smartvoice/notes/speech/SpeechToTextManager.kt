package com.smartvoice.notes.speech

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.util.Locale

/**
/**
 * كلاس مساعد لإدارة Android SpeechRecognizer API
 * يوفر StateFlow لمتابعة حالة التسجيل والنص والأخطاء ومتوافق مع Jetpack Compose
 * تم تحسينه لمنع تسريب الذاكرة (Memory Leak Prevention) عبر استخدام applicationContext
 * والتنظيف التلقائي للمراقبين (Listeners) عند تدمير أو مغادرة الشاشة.
 */
class SpeechToTextManager(context: Context) : RecognitionListener {

    private val appContext: Context = context.applicationContext
    private var speechRecognizer: SpeechRecognizer? = null

    // 1. حالة التسجيل (IsRecording)
    private val _isRecording = MutableStateFlow(false)
    val isRecording: StateFlow<Boolean> = _isRecording.asStateFlow()

    // 2. النص الناتج والمفرغ لحظياً (SpokenText)
    private val _spokenText = MutableStateFlow("")
    val spokenText: StateFlow<String> = _spokenText.asStateFlow()

    // 3. الأخطاء إن وجدت (Error)
    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    init {
        initRecognizer()
    }

    private fun initRecognizer() {
        try {
            if (SpeechRecognizer.isRecognitionAvailable(appContext)) {
                speechRecognizer = SpeechRecognizer.createSpeechRecognizer(appContext).apply {
                    setRecognitionListener(this@SpeechToTextManager)
                }
            } else {
                _error.value = "خدمة التعرف على الصوت غير مدعومة أو غير مفعلة على هذا الجهاز"
            }
        } catch (e: Exception) {
            _error.value = "تعذر تهيئة محرك الصوت: ${e.localizedMessage}"
        }
    }

    /**
     * بدء الاستماع والتسجيل الصوتي
     * @param languageCode رمز اللغة (مثال: "ar-SA" للعربية السعودية، أو "en-US")
     */
    fun startListening(languageCode: String = "ar-SA") {
        if (!SpeechRecognizer.isRecognitionAvailable(appContext)) {
            _error.value = "التعرف على الصوت غير متاح"
            return
        }

        if (speechRecognizer == null) {
            initRecognizer()
        }

        _error.value = null

        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, languageCode)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, languageCode)
            putExtra(RecognizerIntent.EXTRA_ONLY_RETURN_LANGUAGE_PREFERENCE, languageCode)
            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
            putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3)
            putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, appContext.packageName)
        }

        try {
            speechRecognizer?.startListening(intent)
            _isRecording.value = true
        } catch (e: Exception) {
            _isRecording.value = false
            _error.value = "تعذر بدء التسجيل: ${e.localizedMessage}"
        }
    }

    /**
     * إيقاف الاستماع
     */
    fun stopListening() {
        try {
            speechRecognizer?.stopListening()
        } catch (e: Exception) {
            _error.value = "خطأ أثناء إيقاف التسجيل: ${e.localizedMessage}"
        } finally {
            _isRecording.value = false
        }
    }

    /**
     * مسح النص الحالي
     */
    fun clearText() {
        _spokenText.value = ""
        _error.value = null
    }

    /**
     * تحرير موارد الـ Recognizer وتنظيف المراقبين لمنع تسريب الذاكرة (Memory Leak Prevention)
     * يتم استدعاؤه تلقائياً بواسطة DisposableEffect عند مغادرة أو تفكيك شاشات Compose
     */
    fun destroy() {
        try {
            speechRecognizer?.apply {
                stopListening()
                cancel()
                setRecognitionListener(null)
                destroy()
            }
        } catch (e: Exception) {
            // Ignored on teardown
        } finally {
            speechRecognizer = null
            _isRecording.value = false
        }
    }

    // --- تطبيق دوال RecognitionListener ---

    override fun onReadyForSpeech(params: Bundle?) {
        _isRecording.value = true
        _error.value = null
    }

    override fun onBeginningOfSpeech() {
        _isRecording.value = true
    }

    override fun onRmsChanged(rmsdB: Float) {
        // يمكن استخدام قيمة الصوت rmsdB لرسم موجات الصوت في واجهات Jetpack Compose
    }

    override fun onBufferReceived(buffer: ByteArray?) {}

    override fun onEndOfSpeech() {
        _isRecording.value = false
    }

    override fun onError(errorCode: Int) {
        _isRecording.value = false
        _error.value = getErrorMessage(errorCode)
    }

    override fun onResults(results: Bundle?) {
        _isRecording.value = false
        val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
        if (!matches.isNullOrEmpty()) {
            val bestResult = matches[0]
            _spokenText.value = if (_spokenText.value.isEmpty()) {
                bestResult
            } else {
                "${_spokenText.value} $bestResult"
            }
        }
    }

    override fun onPartialResults(partialResults: Bundle?) {
        val matches = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
        if (!matches.isNullOrEmpty()) {
            val partialText = matches[0]
            // تحديث النص اللحظي أثناء تحدث المستخدم
            if (partialText.isNotBlank()) {
                _spokenText.value = partialText
            }
        }
    }

    override fun onEvent(eventType: Int, params: Bundle?) {}

    private fun getErrorMessage(errorCode: Int): String {
        return when (errorCode) {
            SpeechRecognizer.ERROR_AUDIO -> "خطأ في التقاط الصوت (Audio recording error)"
            SpeechRecognizer.ERROR_CLIENT -> "خطأ في تطبيق العميل (Client side error)"
            SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "صلاحية الميكروفون RECORD_AUDIO غير ممنوحة"
            SpeechRecognizer.ERROR_NETWORK -> "خطأ في الاتصال بالشبكة (Network error)"
            SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "انتهت مهلة اتصال الشبكة (Network timeout)"
            SpeechRecognizer.ERROR_NO_MATCH -> "لم يتم التعرف على أي كلمات مطابقة، يرجى المحاولة ثانية"
            SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "خدمة التعرف على الصوت مشغولة حالياً"
            SpeechRecognizer.ERROR_SERVER -> "خطأ من خادم التعرف على الصوت (Server error)"
            SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "لم يتم رصد أي صوت لفترة، توقف الاستماع"
            else -> "حدث خطأ غير معروف في التعرف على الصوت (كود: $errorCode)"
        }
    }
}
