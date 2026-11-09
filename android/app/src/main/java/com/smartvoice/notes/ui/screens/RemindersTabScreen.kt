package com.smartvoice.notes.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Alarm
import androidx.compose.material.icons.filled.AlarmOff
import androidx.compose.material.icons.filled.NotificationsActive
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.smartvoice.notes.data.local.NoteEntity
import java.text.SimpleDateFormat
import java.util.*

/**
 * شاشة التنبيهات المجدولة المستقلة تماماً (Reminders Tab Screen)
 * تعرض التنبيهات النشطة والمستقبلية المرتبطة بمحرك WorkManager
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RemindersTabScreen(
    reminders: List<NoteEntity>,
    onReminderClick: (NoteEntity) -> Unit,
    onDeleteReminder: (NoteEntity) -> Unit,
    modifier: Modifier = Modifier
) {
    // تقليل إعادة التركيب غير الضروري عبر derivedStateOf لمنع إعادة تصفية القوائم في كل إطار
    val upcomingReminders by remember(reminders) {
        derivedStateOf {
            val now = System.currentTimeMillis()
            reminders.filter { (it.reminderTime ?: 0L) >= now }
        }
    }

    val pastReminders by remember(reminders) {
        derivedStateOf {
            val now = System.currentTimeMillis()
            reminders.filter { (it.reminderTime ?: 0L) < now }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("التنبيهات والمواعيد المجدولة", fontWeight = FontWeight.Bold) },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background
                )
            )
        },
        modifier = modifier
    ) { innerPadding ->
        if (reminders.isEmpty()) {
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Alarm,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.outline,
                        modifier = Modifier.size(56.dp)
                    )
                    Text(
                        text = "لا توجد تنبيهات مجدولة حالياً",
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.outline
                    )
                    Text(
                        text = "يمكنك ضبط تنبيه من داخل أي ملاحظة صوتية أو نصية",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.outline.copy(alpha = 0.7f)
                    )
                }
            }
        } else {
            LazyColumn(
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
            ) {
                // قسم التنبيهات القادمة
                if (upcomingReminders.isNotEmpty()) {
                    item {
                        Text(
                            text = "التنبيهات القادمة (${upcomingReminders.size})",
                            style = MaterialTheme.typography.labelLarge,
                            color = MaterialTheme.colorScheme.primary,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(bottom = 4.dp)
                        )
                    }

                    items(upcomingReminders, key = { it.id }) { reminder ->
                        ReminderCardItem(
                            reminder = reminder,
                            isPast = false,
                            onClick = { onReminderClick(reminder) },
                            onCancel = { onDeleteReminder(reminder) }
                        )
                    }
                }

                // قسم التنبيهات السابقة
                if (pastReminders.isNotEmpty()) {
                    item {
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            text = "تنبيهات سابقة (${pastReminders.size})",
                            style = MaterialTheme.typography.labelLarge,
                            color = MaterialTheme.colorScheme.outline,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(bottom = 4.dp)
                        )
                    }

                    items(pastReminders, key = { it.id }) { reminder ->
                        ReminderCardItem(
                            reminder = reminder,
                            isPast = true,
                            onClick = { onReminderClick(reminder) },
                            onCancel = { onDeleteReminder(reminder) }
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun ReminderCardItem(
    reminder: NoteEntity,
    isPast: Boolean,
    onClick: () -> Unit,
    onCancel: () -> Unit
) {
    val dateFormat = remember { SimpleDateFormat("EEEE, d MMMM yyyy - hh:mm a", Locale("ar")) }
    val formattedDate = remember(reminder.reminderTime) {
        if (reminder.reminderTime != null) dateFormat.format(Date(reminder.reminderTime)) else ""
    }

    Card(
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isPast) MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f)
            else MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.25f)
        ),
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
            modifier = Modifier.padding(14.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.weight(1f)
            ) {
                Icon(
                    imageVector = if (isPast) Icons.Default.AlarmOff else Icons.Default.NotificationsActive,
                    contentDescription = null,
                    tint = if (isPast) MaterialTheme.colorScheme.outline else MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(28.dp)
                )

                Spacer(modifier = Modifier.width(12.dp))

                Column {
                    Text(
                        text = reminder.title.ifEmpty { "تنبيه بدون عنوان" },
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )

                    Spacer(modifier = Modifier.height(2.dp))

                    Text(
                        text = formattedDate,
                        fontSize = 12.sp,
                        color = if (isPast) MaterialTheme.colorScheme.outline else MaterialTheme.colorScheme.primary
                    )
                }
            }

            IconButton(onClick = onCancel) {
                Icon(
                    imageVector = Icons.Default.AlarmOff,
                    contentDescription = "إلغاء التنبيه",
                    tint = MaterialTheme.colorScheme.error.copy(alpha = 0.8f)
                )
            }
        }
    }
}
