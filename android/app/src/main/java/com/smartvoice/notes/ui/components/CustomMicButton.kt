package com.smartvoice.notes.ui.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Square
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * زر مايكروفون تفاعلي يعطي استجابة بصرية (Ripple & Pulse Animation)
 * أثناء استماع الـ SpeechRecognizer
 */
@Composable
fun CustomMicButton(
    isRecording: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    size: Dp = 64.dp,
    activeColor: Color = Color(0xFFEF4444), // Red 500
    idleColor: Color = MaterialTheme.colorScheme.primary
) {
    // أنيميشن النبض والتوسع عند التسجيل
    val infiniteTransition = rememberInfiniteTransition(label = "MicPulseTransition")
    
    val pulseScale by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = if (isRecording) 1.35f else 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(800, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "PulseScale"
    )

    val waveAlpha by infiniteTransition.animateFloat(
        initialValue = 0.6f,
        targetValue = if (isRecording) 0f else 0f,
        animationSpec = infiniteRepeatable(
            animation = tween(1000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "WaveAlpha"
    )

    Box(
        contentAlignment = Alignment.Center,
        modifier = modifier.size(size * 1.5f)
    ) {
        // حلقة التموج الخارجية (Outer Ripple Wave)
        if (isRecording) {
            Box(
                modifier = Modifier
                    .size(size)
                    .scale(pulseScale)
                    .clip(CircleShape)
                    .background(activeColor.copy(alpha = 0.25f))
            )

            Box(
                modifier = Modifier
                    .size(size * 1.25f)
                    .scale(pulseScale * 1.15f)
                    .clip(CircleShape)
                    .background(activeColor.copy(alpha = waveAlpha))
            )
        }

        // الزر الدائري الرئيسي
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier
                .size(size)
                .clip(CircleShape)
                .background(if (isRecording) activeColor else idleColor)
                .clickable(
                    interactionSource = remember { MutableInteractionSource() },
                    indication = null,
                    onClick = onClick
                )
        ) {
            Icon(
                imageVector = if (isRecording) Icons.Default.Square else Icons.Default.Mic,
                contentDescription = if (isRecording) "إيقاف التسجيل" else "بدء التسجيل الصوتي",
                tint = Color.White,
                modifier = Modifier.size(size * 0.45f)
            )
        }
    }
}
