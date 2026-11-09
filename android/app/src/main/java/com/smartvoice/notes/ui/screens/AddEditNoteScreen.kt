package com.smartvoice.notes.ui.screens

import android.app.DatePickerDialog
import android.app.TimePickerDialog
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.smartvoice.notes.data.local.NoteEntity
import java.text.SimpleDateFormat
import java.util.*

// لوحة الألوان الهادئة للكروت (Pastel Colors Palette)
val NOTE_CARD_COLORS = listOf(
    Color(0xFFFFFFFF), // أبيض
    Color(0xFFFEF08A), // أصفر باستيل
    Color(0xFFA7F3D0), // نعناعي
    Color(0xFFFED7AA), // خوخي
    Color(0xFFE9D5FF), // لافندر
    Color(0xFFBAE6FD), // سماوي
    Color(0xFFFECDD3), // وردي
    Color(0xFFE2E8F0)  // رمادي هادئ
)

/**
 * شاشة إضافة وتعديل الملاحظات مع دعم الإملاء الصوتي واختيار الألوان وضبط المواعيد
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddEditNoteScreen(
    note: NoteEntity?,
    isRecording: Boolean,
    spokenText: String,
    onStartSpeech: () -> Unit,
    onStopSpeech: () -> Unit,
    onSaveNote: (title: String, content: String, isTask: Boolean, isLocked: Boolean, reminderTime: Long?, colorInt: Int) -> Unit,
    onBackClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current

    var title by remember { mutableStateOf(note?.title ?: "") }
    var content by remember { mutableStateOf(note?.content ?: "") }
    var isTask by remember { mutableStateOf(note?.isTask ?: false) }
    var isLocked by remember { mutableStateOf(note?.isLocked ?: false) }
    var reminderTime by remember { mutableStateOf(note?.reminderTime) }
    var selectedColor by remember {
        mutableStateOf(
            if (note?.categoryColor != null && note.categoryColor != 0) Color(note.categoryColor)
            else NOTE_CARD_COLORS[0]
        )
    }

    // تحسين الأداء: فحص إمكانية الحفظ بواسطة derivedStateOf لمنع إعادة التركيب غير الضروري
    val canSave by remember {
        derivedStateOf { title.isNotBlank() || content.isNotBlank() }
    }

    val reminderDateFormat = remember { SimpleDateFormat("d MMM, hh:mm a", Locale("ar")) }
    val formattedReminderText by remember(reminderTime) {
        derivedStateOf {
            reminderTime?.let { reminderDateFormat.format(Date(it)) } ?: "ضبط تذكير"
        }
    }

    // إدارة الذاكرة: تنظيف مراقب المايك وإيقاف التسجيل عند الخروج من الشاشة لمنع تسريب الذاكرة
    DisposableEffect(Unit) {
        onDispose {
            if (isRecording) {
                onStopSpeech()
            }
        }
    }

    // إضافة النص المفرغ صوتياً تلقائياً إلى خانة المحتوى
    LaunchedEffect(spokenText) {
        if (isRecording && spokenText.isNotBlank()) {
            content = if (content.isEmpty()) spokenText else "$content $spokenText"
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(if (note == null) "ملاحظة جديدة" else "تعديل الملاحظة") },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "رجوع")
                    }
                },
                actions = {
                    // زر الحفظ الرئيسي
                    IconButton(
                        onClick = {
                            if (canSave) {
                                onSaveNote(
                                    title.trim(),
                                    content.trim(),
                                    isTask,
                                    isLocked,
                                    reminderTime,
                                    selectedColor.toArgb()
                                )
                                onBackClick()
                            }
                        },
                        enabled = canSave
                    ) {
                        Icon(
                            imageVector = Icons.Default.Check,
                            contentDescription = "حفظ الملاحظة",
                            tint = if (canSave) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline.copy(alpha = 0.4f)
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = selectedColor.copy(alpha = 0.4f)
                )
            )
        },
        bottomBar = {
            // شريط الأدوات السفلي: المايك، منتقي الألوان، وضبط التنبيه
            Surface(
                color = MaterialTheme.colorScheme.surface,
                shadowElevation = 8.dp,
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 10.dp)
                ) {
                    // 1. شريط منتقي الألوان (Color Picker Palette)
                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 8.dp)
                    ) {
                        items(NOTE_CARD_COLORS) { color ->
                            val isSelected = selectedColor == color
                            Box(
                                modifier = Modifier
                                    .size(32.dp)
                                    .clip(CircleShape)
                                    .background(color)
                                    .border(
                                        width = if (isSelected) 2.5.dp else 1.dp,
                                        color = if (isSelected) MaterialTheme.colorScheme.primary else Color.LightGray,
                                        shape = CircleShape
                                    )
                                    .clickable { selectedColor = color }
                            )
                        }
                    }

                    Divider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))

                    // 2. أزرار التحكم السريعة: ضبط التذكير وتحويل الملاحظة لقائمة مهام
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 8.dp)
                    ) {
                        // زر موعد التذكير
                        OutlinedButton(
                            onClick = {
                                val calendar = Calendar.getInstance()
                                DatePickerDialog(
                                    context,
                                    { _, year, month, day ->
                                        TimePickerDialog(
                                            context,
                                            { _, hour, minute ->
                                                val scheduledCal = Calendar.getInstance().apply {
                                                    set(year, month, day, hour, minute, 0)
                                                }
                                                reminderTime = scheduledCal.timeInMillis
                                            },
                                            calendar.get(Calendar.HOUR_OF_DAY),
                                            calendar.get(Calendar.MINUTE),
                                            false
                                        ).show()
                                    },
                                    calendar.get(Calendar.YEAR),
                                    calendar.get(Calendar.MONTH),
                                    calendar.get(Calendar.DAY_OF_MONTH)
                                ).show()
                            },
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Icon(Icons.Default.Alarm, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = formattedReminderText,
                                fontSize = 12.sp
                            )
                        }

                        // Switch قفل الملاحظة بالبصمة (Biometric Lock Mode)
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Icon(
                                imageVector = if (isLocked) Icons.Default.Lock else Icons.Default.LockOpen,
                                contentDescription = null,
                                tint = if (isLocked) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline,
                                modifier = Modifier.size(16.dp)
                            )
                            Text(text = "قفل بالبصمة", fontSize = 11.sp, fontWeight = FontWeight.Medium)
                            Switch(
                                checked = isLocked,
                                onCheckedChange = { isLocked = it },
                                thumbContent = if (isLocked) {
                                    { Icon(Icons.Default.Fingerprint, contentDescription = null, modifier = Modifier.size(12.dp)) }
                                } else null
                            )
                        }

                        // Switch تحويل الملاحظة لمهمة (Checklist Mode)
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Text(text = "مهمة إنجاز", fontSize = 11.sp, fontWeight = FontWeight.Medium)
                            Switch(
                                checked = isTask,
                                onCheckedChange = { isTask = it },
                                thumbContent = if (isTask) {
                                    { Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(12.dp)) }
                                } else null
                            )
                        }
                    }
                }
            }
        },
        modifier = modifier
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(selectedColor.copy(alpha = 0.25f))
                .padding(innerPadding)
                .padding(horizontal = 20.dp, vertical = 12.dp)
                .verticalScroll(rememberScrollState())
        ) {
            // شريط إشارة التسجيل الصوتي المباشر داخل الشاشة
            if (isRecording) {
                Surface(
                    color = MaterialTheme.colorScheme.errorContainer,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 12.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Mic, contentDescription = null, tint = MaterialTheme.colorScheme.error)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "جارٍ الاستماع لإملائك الصوتي...",
                                color = MaterialTheme.colorScheme.onErrorContainer,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                        TextButton(onClick = onStopSpeech) {
                            Text("إيقاف", color = MaterialTheme.colorScheme.error, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }

            // 1. حقل العنوان بدون حدود (Frameless Title)
            TextField(
                value = title,
                onValueChange = { title = it },
                placeholder = {
                    Text(
                        "عنوان الملاحظة...",
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.outline
                    )
                },
                textStyle = MaterialTheme.typography.titleLarge.copy(
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold
                ),
                colors = TextFieldDefaults.colors(
                    focusedContainerColor = Color.Transparent,
                    unfocusedContainerColor = Color.Transparent,
                    disabledContainerColor = Color.Transparent,
                    focusedIndicatorColor = Color.Transparent,
                    unfocusedIndicatorColor = Color.Transparent
                ),
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(4.dp))

            // 2. حقل المحتوى بدون حدود مع زر المايك المدمج
            Box(modifier = Modifier.fillMaxWidth()) {
                TextField(
                    value = content,
                    onValueChange = { content = it },
                    placeholder = {
                        Text(
                            "اكتب هنا أو اضغط زر المايكروفون للإملاء بالصوت...",
                            fontSize = 15.sp,
                            color = MaterialTheme.colorScheme.outline
                        )
                    },
                    textStyle = MaterialTheme.typography.bodyLarge.copy(fontSize = 15.sp, lineHeight = 22.sp),
                    colors = TextFieldDefaults.colors(
                        focusedContainerColor = Color.Transparent,
                        unfocusedContainerColor = Color.Transparent,
                        disabledContainerColor = Color.Transparent,
                        focusedIndicatorColor = Color.Transparent,
                        unfocusedIndicatorColor = Color.Transparent
                    ),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 60.dp)
                )

                // زر المايك العائم داخل حقل المحتوى للإملاء الصوتي المباشر
                FloatingActionButton(
                    onClick = {
                        if (isRecording) onStopSpeech() else onStartSpeech()
                    },
                    containerColor = if (isRecording) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.primaryContainer,
                    contentColor = if (isRecording) Color.White else MaterialTheme.colorScheme.onPrimaryContainer,
                    shape = CircleShape,
                    modifier = Modifier
                        .align(Alignment.BottomEnd)
                        .padding(bottom = 12.dp, end = 4.dp)
                        .size(48.dp)
                ) {
                    Icon(
                        imageVector = if (isRecording) Icons.Default.Square else Icons.Default.Mic,
                        contentDescription = "إملاء صوتي"
                    )
                }
            }
        }
    }
}
