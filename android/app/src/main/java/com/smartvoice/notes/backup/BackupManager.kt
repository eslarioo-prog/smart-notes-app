package com.smartvoice.notes.backup

import android.content.Context
import android.net.Uri
import com.smartvoice.notes.data.local.AppDatabase
import com.smartvoice.notes.data.local.NoteEntity
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * كلاس لإدارة النسخ الاحتياطي واسترجاع بيانات Room Database
 * يعمل بالكامل مع Storage Access Framework (SAF) عبر معرّفات Uri
 * ويضمن تنفيذ كافة العمليات في خيط الخلفية Dispatchers.IO لتفادي أي تجميد للواجهة (Zero UI Freezes).
 */
class BackupManager(context: Context) {

    private val appContext: Context = context.applicationContext
    private val database: AppDatabase = AppDatabase.getDatabase(appContext)
    private val noteDao = database.noteDao

    /**
     * تصدير جميع ملاحظات وقاعدة بيانات Room كملف JSON مشفر ومنسق
     * @param targetUri مسار الملف المختار من قِبل المستخدم عبر SAF (Intent.ACTION_CREATE_DOCUMENT)
     * @return Result يحمل عدد الملاحظات التي تم نسخها احتياطياً
     */
    suspend fun exportBackup(targetUri: Uri): Result<Int> = withContext(Dispatchers.IO) {
        try {
            // جلب الملاحظات من Room Database عبر DAO
            val notes = noteDao.getAllNotes().first()

            val rootJson = JSONObject().apply {
                put("app", "Smart Voice Notes")
                put("version", 2)
                put("exportedAt", System.currentTimeMillis())
                put("exportDateFormatted", SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault()).format(Date()))
                put("notesCount", notes.size)

                val notesArray = JSONArray()
                for (note in notes) {
                    val noteObj = JSONObject().apply {
                        put("id", note.id)
                        put("title", note.title)
                        put("content", note.content)
                        put("isTask", note.isTask)
                        put("isCompleted", note.isCompleted)
                        put("isLocked", note.isLocked)
                        put("reminderTime", note.reminderTime ?: JSONObject.NULL)
                        put("categoryColor", note.categoryColor)
                        put("createdAt", note.createdAt)
                    }
                    notesArray.put(noteObj)
                }
                put("notes", notesArray)
            }

            // الكتابة إلى الملف عبر ContentResolver وتدفق OutputStream
            appContext.contentResolver.openOutputStream(targetUri, "wt")?.use { outputStream ->
                OutputStreamWriter(outputStream, Charsets.UTF_8).use { writer ->
                    writer.write(rootJson.toString(2))
                    writer.flush()
                }
            } ?: return@withContext Result.failure(Exception("تعذر فتح مسار الملف المختار للكتابة."))

            Result.success(notes.size)
        } catch (e: Exception) {
            e.printStackTrace()
            Result.failure(e)
        }
    }

    /**
     * استرجاع الملاحظات من ملف JSON وتخزينها في Room Database
     * @param sourceUri مسار الملف المختار من قِبل المستخدم عبر SAF (Intent.ACTION_OPEN_DOCUMENT)
     * @param replaceExisting استبدال الملاحظات الحالية أو إدراج الجديد منها
     * @return Result يحمل عدد الملاحظات المسترجعة بنجاح
     */
    suspend fun restoreBackup(sourceUri: Uri, replaceExisting: Boolean = true): Result<Int> = withContext(Dispatchers.IO) {
        try {
            val jsonStringBuilder = StringBuilder()

            // القراءة من الملف عبر ContentResolver وتدفق InputStream
            appContext.contentResolver.openInputStream(sourceUri)?.use { inputStream ->
                BufferedReader(InputStreamReader(inputStream, Charsets.UTF_8)).use { reader ->
                    var line = reader.readLine()
                    while (line != null) {
                        jsonStringBuilder.append(line)
                        line = reader.readLine()
                    }
                }
            } ?: return@withContext Result.failure(Exception("تعذر فتح ملف النسخة الاحتياطية للقراءة."))

            val rootJson = JSONObject(jsonStringBuilder.toString())
            val notesArray = rootJson.optJSONArray("notes")
                ?: return@withContext Result.failure(Exception("صيغة الملف غير متوافقة أو لا تحتوي على سجلات ملاحظات صالحة."))

            var restoredCount = 0

            for (i in 0 until notesArray.length()) {
                val item = notesArray.getJSONObject(i)
                val note = NoteEntity(
                    id = if (replaceExisting) item.optLong("id", 0L) else 0L,
                    title = item.optString("title", ""),
                    content = item.optString("content", ""),
                    isTask = item.optBoolean("isTask", false),
                    isCompleted = item.optBoolean("isCompleted", false),
                    isLocked = item.optBoolean("isLocked", false),
                    reminderTime = if (item.isNull("reminderTime")) null else item.optLong("reminderTime"),
                    categoryColor = item.optInt("categoryColor", 0xFF6366F1.toInt()),
                    createdAt = item.optLong("createdAt", System.currentTimeMillis())
                )

                noteDao.insertNote(note)
                restoredCount++
            }

            Result.success(restoredCount)
        } catch (e: Exception) {
            e.printStackTrace()
            Result.failure(e)
        }
    }
}
