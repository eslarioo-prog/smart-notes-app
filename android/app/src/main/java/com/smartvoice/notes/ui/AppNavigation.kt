package com.smartvoice.notes.ui

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import com.smartvoice.notes.data.local.NoteEntity
import com.smartvoice.notes.ui.screens.AddEditNoteScreen
import com.smartvoice.notes.ui.screens.BackupRestoreScreen
import com.smartvoice.notes.ui.screens.MainNotesScreen
import com.smartvoice.notes.ui.screens.RemindersTabScreen
import com.smartvoice.notes.ui.screens.TasksTabScreen

/**
 * الوجهات الثابتة لشريط التنقل السفلي بدون أي تبويبات سحب (Zero Swipe Navigation)
 */
enum class AppTab(
    val titleAr: String,
    val selectedIcon: ImageVector,
    val unselectedIcon: ImageVector
) {
    NOTES("الملاحظات", Icons.Filled.StickyNote2, Icons.Outlined.StickyNote2),
    TASKS("المهام", Icons.Filled.Checklist, Icons.Outlined.Checklist),
    REMINDERS("التنبيهات", Icons.Filled.Alarm, Icons.Outlined.Alarm),
    BACKUP("النسخ والأمان", Icons.Filled.Security, Icons.Outlined.Security)
}

/**
 * الشاشة الحاوية الرئيسية (Main Root Scaffold)
 * تستخدم BottomNavigationBar ثابت بدون أي أشرطة سحب أو إيماءات منزلقة
 */
@Composable
fun MainRootScreen(
    notes: List<NoteEntity>,
    isRecording: Boolean,
    spokenText: String,
    onStartSpeech: () -> Unit,
    onStopSpeech: () -> Unit,
    onSaveNote: (NoteEntity) -> Unit,
    onDeleteNote: (NoteEntity) -> Unit,
    onToggleTaskComplete: (NoteEntity) -> Unit,
    modifier: Modifier = Modifier
) {
    // التبويب النشط حالياً (التحويل فوري بدون Swipeable Pager)
    var currentTab by remember { mutableStateOf(AppTab.NOTES) }
    
    // حالة شاشة التحرير
    var editingNote by remember { mutableStateOf<NoteEntity?>(null) }
    var isEditingOpen by remember { mutableStateOf(false) }

    if (isEditingOpen) {
        // شاشة إضافة / تعديل الملاحظة المستقلة
        AddEditNoteScreen(
            note = editingNote,
            isRecording = isRecording,
            spokenText = spokenText,
            onStartSpeech = onStartSpeech,
            onStopSpeech = onStopSpeech,
            onSaveNote = { title, content, isTask, isLocked, reminderTime, colorInt ->
                val newOrUpdated = (editingNote ?: NoteEntity(title = title, content = content)).copy(
                    title = title,
                    content = content,
                    isTask = isTask,
                    isLocked = isLocked,
                    reminderTime = reminderTime,
                    categoryColor = colorInt,
                    createdAt = editingNote?.createdAt ?: System.currentTimeMillis()
                )
                onSaveNote(newOrUpdated)
                isEditingOpen = false
                editingNote = null
            },
            onBackClick = {
                isEditingOpen = false
                editingNote = null
            }
        )
    } else {
        Scaffold(
            bottomBar = {
                // شريط التنقل السفلي الثابت (Material 3 NavigationBar)
                NavigationBar(
                    containerColor = MaterialTheme.colorScheme.surface,
                    tonalElevation = 8.dp
                ) {
                    AppTab.values().forEach { tab ->
                        val isSelected = currentTab == tab
                        NavigationBarItem(
                            selected = isSelected,
                            onClick = {
                                // التبديل المباشر بين الشاشات دون أي حركة سحب
                                currentTab = tab
                            },
                            icon = {
                                Icon(
                                    imageVector = if (isSelected) tab.selectedIcon else tab.unselectedIcon,
                                    contentDescription = tab.titleAr
                                )
                            },
                            label = { Text(text = tab.titleAr) },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = MaterialTheme.colorScheme.onPrimaryContainer,
                                indicatorColor = MaterialTheme.colorScheme.primaryContainer,
                                selectedTextColor = MaterialTheme.colorScheme.primary,
                                unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                                unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        )
                    }
                }
            },
            modifier = modifier
        ) { innerPadding ->
            // عرض الشاشة المستقلة المقابلة للتبويب المختار فورياً
            Box(modifier = Modifier.padding(innerPadding)) {
                when (currentTab) {
                    AppTab.NOTES -> {
                        // شاشة الملاحظات المستقلة تماماً
                        MainNotesScreen(
                            notes = notes,
                            isRecording = isRecording,
                            spokenText = spokenText,
                            onNoteClick = { note ->
                                editingNote = note
                                isEditingOpen = true
                            },
                            onAddNoteClick = {
                                editingNote = null
                                isEditingOpen = true
                            },
                            onMicClick = {
                                if (isRecording) onStopSpeech() else onStartSpeech()
                            },
                            onToggleTaskComplete = onToggleTaskComplete
                        )
                    }
                    AppTab.TASKS -> {
                        // شاشة المهام المستقلة تماماً
                        TasksTabScreen(
                            tasks = notes.filter { it.isTask },
                            onToggleTask = onToggleTaskComplete,
                            onAddTask = { taskText ->
                                onSaveNote(
                                    NoteEntity(
                                        title = taskText,
                                        content = "",
                                        isTask = true,
                                        isCompleted = false
                                    )
                                )
                            },
                            onDeleteTask = onDeleteNote
                        )
                    }
                    AppTab.REMINDERS -> {
                        // شاشة التنبيهات المجدولة المستقلة تماماً
                        RemindersTabScreen(
                            reminders = notes.filter { it.reminderTime != null },
                            onReminderClick = { note ->
                                editingNote = note
                                isEditingOpen = true
                            },
                            onDeleteReminder = { note ->
                                onSaveNote(note.copy(reminderTime = null))
                            }
                        )
                    }
                    AppTab.BACKUP -> {
                        // شاشة النسخ الاحتياطي والأمان بالبصمة
                        BackupRestoreScreen(
                            notes = notes,
                            onBackClick = { currentTab = AppTab.NOTES }
                        )
                    }
                }
            }
        }
    }
}
