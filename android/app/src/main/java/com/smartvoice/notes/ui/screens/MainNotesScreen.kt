package com.smartvoice.notes.ui.screens

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.staggeredgrid.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.smartvoice.notes.data.local.NoteEntity
import com.smartvoice.notes.ui.components.CustomMicButton
import java.text.SimpleDateFormat
import java.util.*

/**
 * الشاشة الرئيسية لتطبيق Smart Voice Notes
 * مع شريط علوي نظيف وخالٍ من الأزرار المزدحمة، وزر مايكروفون مستقل يوضع أسفل زر "ملاحظة جديدة"
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainNotesScreen(
    notes: List<NoteEntity>,
    isRecording: Boolean,
    spokenText: String,
    onNoteClick: (NoteEntity) -> Unit,
    onAddNoteClick: () -> Unit,
    onMicClick: () -> Unit,
    onToggleTaskComplete: (NoteEntity) -> Unit,
    modifier: Modifier = Modifier
) {
    var searchQuery by remember { mutableStateOf("") }

    // تحسين الأداء عبر derivedStateOf لتفادي إعادة التركيب غير الضروري أثناء الكتابة أو إعادة تصيير العناصر المحيطة
    val filteredNotes by remember(notes, searchQuery) {
        derivedStateOf {
            if (searchQuery.isBlank()) {
                notes
            } else {
                val q = searchQuery.trim()
                notes.filter { note ->
                    note.title.contains(q, ignoreCase = true) ||
                    note.content.contains(q, ignoreCase = true)
                }
            }
        }
    }

    // تنظيف المراقبين والميكروفون عند مغادرة الشاشة لمنع تسريب الذاكرة
    DisposableEffect(Unit) {
        onDispose {
            if (isRecording) {
                onMicClick()
            }
        }
    }

    Scaffold(
        topBar = {
            // شريط علوي نقي يحتوي على شريط البحث فقط لتقليل الازدحام في الأعلى
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(MaterialTheme.colorScheme.background)
                    .padding(horizontal = 16.dp, vertical = 8.dp)
            ) {
                SearchBar(
                    query = searchQuery,
                    onQueryChange = { searchQuery = it },
                    onSearch = {},
                    active = false,
                    onActiveChange = {},
                    placeholder = { Text("ابحث في ملاحظاتك وتفريغ الصوت...") },
                    leadingIcon = {
                        Icon(
                            imageVector = Icons.Default.Search,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary
                        )
                    },
                    trailingIcon = {
                        if (searchQuery.isNotEmpty()) {
                            IconButton(onClick = { searchQuery = "" }) {
                                Icon(Icons.Default.Close, contentDescription = "مسح")
                            }
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(24.dp),
                    colors = SearchBarDefaults.colors(
                        containerColor = MaterialTheme.colorScheme.surfaceVariant
                    )
                ) {}
            }
        },
        floatingActionButton = {
            // ترتيب الأزرار العائمة رأسياً: زر "ملاحظة جديدة" في الأعلى، وتحته مباشرة زر المايكروفون المستقل
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(14.dp),
                modifier = Modifier.padding(bottom = 12.dp, end = 4.dp)
            ) {
                // 1. زر إضافة ملاحظة نصية جديدة في الأعلى
                SmallFloatingActionButton(
                    onClick = onAddNoteClick,
                    containerColor = MaterialTheme.colorScheme.surfaceVariant,
                    contentColor = MaterialTheme.colorScheme.primary,
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier
                        .size(48.dp)
                        .border(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.3f), RoundedCornerShape(16.dp))
                ) {
                    Icon(
                        imageVector = Icons.Default.Add,
                        contentDescription = "ملاحظة جديدة",
                        modifier = Modifier.size(24.dp)
                    )
                }

                // 2. زر المايكروفون المستقل الموضوع مباشرة أسفل زر "ملاحظة جديدة"
                CustomMicButton(
                    isRecording = isRecording,
                    onClick = onMicClick,
                    size = 64.dp
                )
            }
        },
        modifier = modifier
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            if (filteredNotes.isEmpty()) {
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier.fillMaxSize()
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.padding(32.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.NoteAlt,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.outline.copy(alpha = 0.5f),
                            modifier = Modifier.size(64.dp)
                        )
                        Text(
                            text = if (searchQuery.isNotBlank()) "لا توجد نتائج تطابق بحثك" else "لا توجد ملاحظات مسجلة",
                            style = MaterialTheme.typography.titleMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Text(
                            text = "اضغط على زر الميكروفون بالأسفل لبدء تسجيل صوتي فوري",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.outline
                        )
                    }
                }
            } else {
                LazyVerticalStaggeredGrid(
                    columns = StaggeredGridCells.Fixed(2),
                    contentPadding = PaddingValues(12.dp),
                    horizontalItemSpacing = 10.dp,
                    verticalItemSpacing = 10.dp,
                    modifier = Modifier.fillMaxSize()
                ) {
                    items(filteredNotes, key = { it.id }) { note ->
                        NoteCardItem(
                            note = note,
                            onClick = { onNoteClick(note) },
                            onToggleComplete = { onToggleTaskComplete(note) }
                        )
                    }
                }
            }

            // لافتة نص الإملاء اللحظي أثناء تحدث المستخدم
            AnimatedVisibility(
                visible = isRecording && spokenText.isNotBlank(),
                enter = fadeIn() + slideInVertically(initialOffsetY = { it }),
                exit = fadeOut() + slideOutVertically(targetOffsetY = { it }),
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(bottom = 90.dp, start = 16.dp, end = 16.dp)
            ) {
                Surface(
                    color = MaterialTheme.colorScheme.surfaceVariant,
                    shape = RoundedCornerShape(16.dp),
                    shadowElevation = 8.dp,
                    border = CardDefaults.outlinedCardBorder().copy(brush = androidx.compose.ui.graphics.SolidColor(MaterialTheme.colorScheme.primary.copy(alpha = 0.4f))),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(14.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.GraphicEq,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.error,
                            modifier = Modifier.padding(end = 8.dp)
                        )
                        Text(
                            text = spokenText,
                            style = MaterialTheme.typography.bodyMedium,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }
            }
        }
    }
}

/**
 * كارت الملاحظة مع لمسات الإطار الذهبي والنحاسي في الوضع الداكن
 */
@Composable
fun NoteCardItem(
    note: NoteEntity,
    onClick: () -> Unit,
    onToggleComplete: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        modifier = modifier
            .fillMaxWidth()
            .border(
                width = 1.dp,
                color = MaterialTheme.colorScheme.outline.copy(alpha = 0.5f),
                shape = RoundedCornerShape(16.dp)
            )
            .clickable(onClick = onClick)
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            // شارة الحماية بالبصمة (Biometric Protected Note)
            if (note.isLocked) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .clip(RoundedCornerShape(6.dp))
                        .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.15f))
                        .padding(horizontal = 6.dp, vertical = 2.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Fingerprint,
                        contentDescription = "محمية بالبصمة",
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(13.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "محمية بالبصمة",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
            }

            if (note.title.isNotBlank()) {
                Text(
                    text = note.title,
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp,
                    color = MaterialTheme.colorScheme.primary,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    textDecoration = if (note.isCompleted) TextDecoration.LineThrough else TextDecoration.None
                )
            }

            if (note.content.isNotBlank()) {
                Text(
                    text = if (note.isLocked) "••••••••••••••••••••••••••••••••" else note.content,
                    fontSize = 13.sp,
                    color = if (note.isLocked) MaterialTheme.colorScheme.outline else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.85f),
                    maxLines = 6,
                    overflow = TextOverflow.Ellipsis,
                    lineHeight = 18.sp,
                    textDecoration = if (note.isCompleted) TextDecoration.LineThrough else TextDecoration.None
                )
            }

            if (note.isTask) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.padding(top = 4.dp)
                ) {
                    Checkbox(
                        checked = note.isCompleted,
                        onCheckedChange = { onToggleComplete() },
                        colors = CheckboxDefaults.colors(
                            checkedColor = MaterialTheme.colorScheme.primary
                        ),
                        modifier = Modifier.size(24.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = if (note.isCompleted) "مكتملة" else "قيد التنفيذ",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Medium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            if (note.reminderTime != null) {
                val dateFormat = remember { SimpleDateFormat("d MMM, hh:mm a", Locale("ar")) }
                val timeString = remember(note.reminderTime) { dateFormat.format(Date(note.reminderTime)) }

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .padding(top = 4.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.4f))
                        .padding(horizontal = 6.dp, vertical = 3.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Alarm,
                        contentDescription = "موعد التذكير",
                        tint = MaterialTheme.colorScheme.secondary,
                        modifier = Modifier.size(13.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = timeString,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.secondary
                    )
                }
            }
        }
    }
}
