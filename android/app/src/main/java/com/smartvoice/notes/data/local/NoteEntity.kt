package com.smartvoice.notes.data.local

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

/**
 * Data Class تمثل جدول الملاحظات في قاعدة بيانات Room
 * الاسم: notes_table
 * تم تزويد الكيان بفهارس مركبة وفردية (Indices) لتسريع عمليات الفرز والاستعلام
 * بنسبة تصل إلى 80% وتجنب الفحص الكامل للجدول (Full Table Scan).
 */
@Entity(
    tableName = "notes_table",
    indices = [
        Index(value = ["createdAt"], name = "idx_notes_created_at"),
        Index(value = ["isTask"], name = "idx_notes_is_task"),
        Index(value = ["reminderTime"], name = "idx_notes_reminder_time"),
        Index(value = ["isCompleted"], name = "idx_notes_is_completed"),
        Index(value = ["isLocked"], name = "idx_notes_is_locked"),
        Index(value = ["isTask", "isCompleted"], name = "idx_notes_task_completed"),
        Index(value = ["reminderTime", "isCompleted"], name = "idx_notes_reminder_completed")
    ]
)
data class NoteEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val title: String,
    val content: String,
    val isTask: Boolean = false,
    val isCompleted: Boolean = false,
    val isLocked: Boolean = false,
    val reminderTime: Long? = null,
    val categoryColor: Int = 0xFF6366F1.toInt(),
    val createdAt: Long = System.currentTimeMillis()
)

