package com.smartvoice.notes.ui

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.MicOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat

/**
 * دالة مساعدة للتحقق مما إذا كان إذن RECORD_AUDIO ممنوحاً بالفعل
 */
fun hasAudioPermission(context: Context): Boolean {
    return ContextCompat.checkSelfPermission(
        context,
        Manifest.permission.RECORD_AUDIO
    ) == PackageManager.PERMISSION_GRANTED
}

/**
 * مكون Jetpack Compose يطلب إذن الميكروفون وقت التشغيل (Runtime Permission)
 * وفقاً لمتطلبات Android 6.0+ (API 23+)
 */
@Composable
fun VoiceRecordWithPermission(
    isRecording: Boolean,
    onStartRecording: () -> Unit,
    onStopRecording: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    var permissionGranted by remember { mutableStateOf(hasAudioPermission(context)) }
    var showRationaleDialog by remember { mutableStateOf(false) }

    // Launcher لطلب الإذن من المستخدم
    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { isGranted: Boolean ->
        permissionGranted = isGranted
        if (isGranted) {
            onStartRecording()
        } else {
            showRationaleDialog = true
        }
    }

    // زر الميكروفون الذكي
    FloatingActionButton(
        onClick = {
            if (isRecording) {
                onStopRecording()
            } else {
                if (hasAudioPermission(context)) {
                    onStartRecording()
                } else {
                    // طلب إذن الميكروفون
                    permissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
                }
            }
        },
        containerColor = if (isRecording) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.primary,
        contentColor = Color.white,
        modifier = modifier
    ) {
        Icon(
            imageVector = if (isRecording) Icons.Default.MicOff else Icons.Default.Mic,
            contentDescription = if (isRecording) "إيقاف التسجيل" else "بدء التسجيل الصوتي"
        )
    }

    // حوار توضيحي إذا رفض المستخدم الإذن
    if (showRationaleDialog) {
        AlertDialog(
            onDismissRequest = { showRationaleDialog = false },
            title = { Text(text = "صلاحية الميكروفون مطلوبة") },
            text = {
                Text(text = "يحتاج التطبيق إلى إذن تسجيل الصوت (RECORD_AUDIO) لتحويل صوتك إلى مذكرات ومهام نصية وتنبيهات مجدولة.")
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        showRationaleDialog = false
                        permissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
                    }
                ) {
                    Text(text = "إعادة المحاولة")
                }
            },
            dismissButton = {
                TextButton(onClick = { showRationaleDialog = false }) {
                    Text(text = "إلغاء")
                }
            }
        )
    }
}
