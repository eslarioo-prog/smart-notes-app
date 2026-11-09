package com.smartvoice.notes.data.local

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import kotlinx.coroutines.flow.Flow

/**
 * Data Access Object (DAO) للتحكم في عمليات جدول notes_table
 * متوافق بالكامل مع Kotlin Coroutines و StateFlow/SharedFlow عبر Jetpack Compose
 */
@Dao
interface NoteDao {

    /**
     * إدراج ملاحظة جديدة أو استبدالها عند التعارض
     */
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertNote(note: NoteEntity): Long

    /**
     * تحديث ملاحظة موجودة
     */
    @Update
    suspend fun updateNote(note: NoteEntity)

    /**
     * حذف ملاحظة
     */
    @Delete
    suspend fun deleteNote(note: NoteEntity)

    /**
     * جلب جميع الملاحظات مرتبة تصاعدياً/تنازلياً حسب وقت الإنشاء
     * تعيد Flow لتحديث واجهات Jetpack Compose بشكل تلقائي لحظياً
     */
    @Query("SELECT * FROM notes_table ORDER BY createdAt DESC")
    fun getAllNotes(): Flow<List<NoteEntity>>

    /**
     * البحث في الملاحظات بالاسم أو المحتوى
     */
    @Query("SELECT * FROM notes_table WHERE title LIKE '%' || :query || '%' OR content LIKE '%' || :query || '%' ORDER BY createdAt DESC")
    fun searchNotes(query: String): Flow<List<NoteEntity>>

    /**
     * جلب ملاحظة فردية بواسطة المعرف ID
     */
    @Query("SELECT * FROM notes_table WHERE id = :id")
    fun getNoteById(id: Long): Flow<NoteEntity?>

    /**
     * جلب الملاحظات التي لها تذكير قادم مجدول (استعلام مفهرس بواسطة idx_notes_reminder_completed)
     */
    @Query("SELECT * FROM notes_table WHERE reminderTime IS NOT NULL AND reminderTime >= :currentTime AND isCompleted = 0 ORDER BY reminderTime ASC")
    fun getUpcomingReminders(currentTime: Long): Flow<List<NoteEntity>>

    /**
     * استعلام سريع مفهرس لجلب المهام فقط حسب حالة الإنجاز (يستخدم idx_notes_task_completed)
     */
    @Query("SELECT * FROM notes_table WHERE isTask = 1 AND isCompleted = :isCompleted ORDER BY createdAt DESC")
    fun getTasksByStatus(isCompleted: Boolean): Flow<List<NoteEntity>>

    /**
     * استعلام سريع مفهرس لجلب جميع المهام (يستخدم idx_notes_is_task)
     */
    @Query("SELECT * FROM notes_table WHERE isTask = 1 ORDER BY createdAt DESC")
    fun getAllTasks(): Flow<List<NoteEntity>>

    /**
     * استعلام سريع مفهرس لجلب الملاحظات فقط دون المهام (يستخدم idx_notes_is_task)
     */
    @Query("SELECT * FROM notes_table WHERE isTask = 0 ORDER BY createdAt DESC")
    fun getNotesOnly(): Flow<List<NoteEntity>>

    /**
     * استعلام لجلب الملاحظات المحمية بالبصمة (يستخدم idx_notes_is_locked)
     */
    @Query("SELECT * FROM notes_table WHERE isLocked = 1 ORDER BY createdAt DESC")
    fun getLockedNotes(): Flow<List<NoteEntity>>

    /**
     * تحديث حالة قفل الملاحظة بالبصمة
     */
    @Query("UPDATE notes_table SET isLocked = :isLocked WHERE id = :id")
    suspend fun updateLockStatus(id: Long, isLocked: Boolean)
}
