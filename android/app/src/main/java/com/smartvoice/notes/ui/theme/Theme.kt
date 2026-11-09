package com.smartvoice.notes.ui.theme

import android.app.Activity
import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

/**
 * نظام الألوان الفاخر المخصص للوضع الداكن (Luxury Dark Color Scheme)
 * خلفية كحلي داكن + لمسات ذهبية ونحاسية فخمة
 */
private val LuxuryDarkColorScheme = darkColorScheme(
    primary = RoyalGoldPrimary,
    onPrimary = Color(0xFF1A1300),
    primaryContainer = Color(0xFF453600),
    onPrimaryContainer = GoldBright,

    secondary = CopperBronze,
    onSecondary = Color.White,
    secondaryContainer = Color(0xFF4A2511),
    onSecondaryContainer = CopperAccent,

    tertiary = GoldBright,
    onTertiary = Color.Black,

    background = MidnightNavyBackground,
    onBackground = TextPrimaryWhite,

    surface = DarkNavySurface,
    onSurface = TextPrimaryWhite,

    surfaceVariant = DarkNavyCard,
    onSurfaceVariant = TextSecondaryGold,

    outline = DarkNavyBorder,
    outlineVariant = Color(0xFF384766),

    error = CrimsonAlert,
    onError = Color.White
)

/**
 * نظام ألوان للوضع الفاتح بلمسات ذهبية متناسقة
 */
private val LuxuryLightColorScheme = lightColorScheme(
    primary = Color(0xFF9E7B15),
    onPrimary = Color.White,
    primaryContainer = Color(0xFFFDE89C),
    onPrimaryContainer = Color(0xFF2C2000),

    secondary = Color(0xFFA0522D),
    onSecondary = Color.White,

    background = Color(0xFFF8F9FD),
    onBackground = Color(0xFF0F172A),

    surface = Color.White,
    onSurface = Color(0xFF0F172A),

    surfaceVariant = Color(0xFFF1F5F9),
    onSurfaceVariant = Color(0xFF334155),

    outline = Color(0xFFCBD5E1)
)

/**
 * الـ Theme الرئيسي لتطبيق Smart Voice Notes
 * يفرض الثيم الداكن الفاخر (Midnight Navy & Gold) كإعداد أساسي
 */
@Composable
fun SmartVoiceNotesTheme(
    darkTheme: Boolean = true, // مفعل افتراضياً للثيم الداكن الفاخر
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) LuxuryDarkColorScheme else LuxuryLightColorScheme
    val view = LocalView.current

    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as? Activity)?.window
            if (window != null) {
                // تلوين شريط الحالة بنمط كحلي داكن فخم
                window.statusBarColor = colorScheme.background.toArgb()
                window.navigationBarColor = colorScheme.surface.toArgb()
                WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = !darkTheme
                WindowCompat.getInsetsController(window, view).isAppearanceLightNavigationBars = !darkTheme
            }
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        content = content
    )
}
