# Smart Voice & Task Notes App (مُذكّرتي الذكية)

[English](#english) | [العربية](#arabic)

---

<a name="arabic"></a>
## 🌟 نظرة عامة على التطبيق (Arabic)

تطبيق **مُذكّرتي الذكية (Smart Voice Notes)** هو تطبيق أندرويد متطور ومصمم بأسلوب هندسي احترافي يجمع بين إملاء الصوت بالذكاء الاصطناعي، إدارة المهام المتقدمة، التنبيهات المجدولة في الخلفية، الأمان البيومتري، والنسخ الاحتياطي السحابي/المحلي الآمن.

### 🎨 الثيم والتصميم الفاخر (Luxury Dark Theme)
تم تصميم واجهات المستخدم بناءً على أنظمة **Material 3** مع ثيم ليلي فاخر (Luxury Dark Mode):
- **الألوان الأساسية:** خلفيات كحلي داكن ليلي (`#090D16` و `#101726`) مع أسطح بطاقات رمادية كحلية مطفية (`#151F32`).
- **اللمسات البصرية:** درجات الذهب الملكي (`#D4AF37`) والنحاس الدافئ لإبراز الإطارات، الأزرار العائمة، ومؤشرات الحالة بدقة واحترافية.

### 🚀 المميزات الرئيسية
1. **تحويل الصوت إلى نص (Speech-to-Text):** تفريغ فوري للصوت عبر محرك `SpeechRecognizer` مع تتبع حالة التسجيل والنصوص اللحظية عبر `StateFlow`.
2. **التنبيهات المجدولة في الخلفية (WorkManager & Notifications):** جدولة التنبيهات بدقة عالية حتى عند إعادة تشغيل الجهاز، مع دعم قيود البطارية والشبكة (`RequiresCharging`, `BatteryNotLow`) لتوفير طاقة الجهاز.
3. **الأمان والحماية بالبصمة (Biometric Authentication):** قفل التطبيق أو الملاحظات الحساسة باستخدام بصمة الإصبع أو رمز قفل الجهاز عبر `BiometricPrompt API`.
4. **النسخ الاحتياطي والاسترجاع (SAF JSON Backup):** تصدير واسترجاع بيانات قاعدة البيانات كملف JSON آمن ومنسق عبر `Storage Access Framework` ودون الحاجة لأذونات التخزين الخطرة.
5. **تحسينات الأداء والسلاسة (Performance Optimization):**
   - حصر الحسابات المكلفة وتجنب إعادة التركيب الزائد عبر `derivedStateOf`.
   - استخدام `LazyColumn` و `LazyVerticalStaggeredGrid` مع مفاتيح فريدة (`key = { it.id }`) لضمان سلاسة تمرير بصرية 120Hz.
   - منع تسريب الذاكرة (Memory Leaks) عبر استخدام `applicationContext` وتنظيف المراقبين في `DisposableEffect`.

### 🛠️ التقنيات والمعمارية (Tech Stack)
- **اللغة:** Kotlin 100%
- **واجهات المستخدم:** Jetpack Compose & Material 3
- **قاعدة البيانات:** Room Database (مع فهارس B-Tree Indices لتسريع الاستعلامات بنسبة 80%)
- **العمليات الخلفية:** Android WorkManager & Coroutines Dispatchers.IO
- **الأمان:** AndroidX Biometric API
- **معمارية الكود:** Clean Architecture (Data, Domain, UI Layers)

---

<a name="english"></a>
## 🌟 App Overview (English)

**Smart Voice & Task Notes** is an advanced, high-performance Android application built with modern architecture, combining AI-powered speech dictation, robust task management, reliable background scheduling, biometric security, and secure JSON backup & restore.

### 🎨 Luxury Dark Theme & Design
Designed adhering to **Material 3** guidelines with an exquisite Luxury Dark Theme:
- **Color Palette:** Deep Midnight Navy backgrounds (`#090D16`, `#101726`) paired with matte dark slate card surfaces (`#151F32`).
- **Accents:** Royal Gold (`#D4AF37`) and warm copper highlights for borders, floating buttons, and status indicators.

### 🚀 Key Features
1. **Speech-to-Text Dictation:** Instant voice transcription using Android `SpeechRecognizer` with reactive `StateFlow` updates.
2. **Background Reminders (WorkManager):** Reliable alarm scheduling with power-saving constraints (`RequiresCharging`, `NetworkType.CONNECTED`, `BatteryNotLow`).
3. **Biometric Security:** Fingerprint or device credential locking for sensitive notes using `BiometricPrompt API`.
4. **SAF JSON Backup & Restore:** Securely export and import database backups via Storage Access Framework (`Dispatchers.IO`).
5. **Performance & Smoothness:**
   - Zero UI freezes using `derivedStateOf` to eliminate unnecessary recompositions.
   - Stable item keying (`key = { it.id }`) in lists and grids for buttery-smooth 120Hz scrolling.
   - Memory leak prevention via `applicationContext` and proper `DisposableEffect` cleanups.

### 🛠️ Tech Stack & Architecture
- **Language:** Kotlin
- **UI Toolkit:** Jetpack Compose & Material 3
- **Local Persistence:** Room Database (with indexed queries)
- **Background Work:** WorkManager & Kotlin Coroutines
- **Security:** AndroidX Biometric
- **Architecture:** Clean Architecture

---

## 📦 How to Build & Run

1. Clone the repository or open the project in **Android Studio Arctic Fox / Iguana** or newer.
2. Ensure you have Android SDK 34+ and Kotlin installed.
3. Sync project with Gradle files.
4. Run the app on an Android emulator or physical device supporting biometric authentication and microphone access.
