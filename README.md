# BoardBuddy: LET Review App 🎓

**BoardBuddy** is a modern, clean mobile reviewer application tailored for Licensure Examination for Teachers (LET) reviewees. Built with **React Native Community CLI (Bare Workflow)** with zero Expo dependencies.

---

## 📱 How to Install & Run on Any System

Depending on whether someone just wants to **test the app directly** or **run it from source code**, choose the method below:

### Method 1: Install Directly via APK (No Coding Setup Required)
Mobile apps on Android use `.apk` files (the mobile equivalent of a Windows `.exe`):

1. **Locate the APK file:**
   - The compiled installer is located at:
     ```
     android/app/build/outputs/apk/debug/app-debug.apk
     ```
2. **Install on an Android Phone:**
   - Send `app-debug.apk` to the phone (via USB, Google Drive, or Bluetooth).
   - Tap the file on the phone and tap **Install** (allow "Install from unknown sources" if prompted).
3. **Or run on PC using any Android Emulator:**
   - Simply drag and drop `app-debug.apk` into **BlueStacks**, **LDPlayer**, or **Android Studio Emulator**, and the app installs instantly.

---

### Method 2: Run from Source Code (For Developers & Instructors)

#### 1. System Requirements
- **Node.js** (v18 or higher) — [Download Node.js](https://nodejs.org/)
- **Java Development Kit (JDK 17)** — [Download Microsoft OpenJDK 17](https://learn.microsoft.com/en-us/java/openjdk/download)
- **Android Studio** (for Android SDK Platform 34 and Emulator) — [Download Android Studio](https://developer.android.com/studio)

#### 2. Setup & Installation
Open PowerShell / Terminal and run:

```bash
# 1. Clone the repository
git clone https://github.com/jangi22/BoardBuddy.git
cd BoardBuddy

# 2. Install JavaScript dependencies
npm install

# 3. Start the Metro bundler
npx react-native start
```

#### 3. Run on Android
In a second terminal window (while Metro is running):

```bash
# With an Android device connected via USB or emulator open:
npx react-native run-android
```

---

## 🌟 Features & Screens (16 Total)

- **Authentication:** Login and SignUp screens with role selection and account persistence.
- **Home Dashboard:** Hero progress card, mini statistic metrics, daily goal streak bar, 2x2 study tools grid, and targeted focus recommendations.
- **AI Summaries:** Subject-filtered review topics (Professional Education, General Education, English) with short bullet-point study guides and "Mark as done" tracking.
- **Flashcards:** Interactive tap-to-flip cards (Term/Definition), mastery tracking, and related summary shortcuts.
- **Practice & Quizzes:** Topic-based practice sets and 5-minute Mock Board Exams with immediate question explanations and score calculation.
- **Progress Tracker:** Overall completion percentage, per-subject progress meters, and dynamic weak-area tracking.
- **User Profile:** Editable profile name, password updates, statistics overview, and saved progress reset.
- **Premium Upgrades:** Mock exams, unlimited cards, advanced analytics, and integrated checkout simulation (GCash, Maya, Card, InstaPay).

---

## 🔬 Lab 4 Requirements Implemented

### 1. External API Integration (`StudyAssistant` Screen)
- Powered by the **Free Dictionary API** (`https://api.dictionaryapi.dev/api/v2/entries/en/{word}`).
- Implemented with `fetch()`, `async/await`, and `try/catch`.
- Displays phonetic pronunciation, grammatical parts of speech, and numbered definitions.
- Visual loading states with `ActivityIndicator`.
- Comprehensive error handling for offline/network disconnects and "word not found" (404) with an interactive **Retry** button.

### 2. Local Data Storage & CRUD (`@react-native-async-storage/async-storage`)
- **Auto-Save App Progress:** Automatically persists completed topics (`done`), mastered flashcards (`mastered`), and quiz results (`stats`).
- **Full CRUD for Personal Study Notes:**
  - **Create:** Save looked-up dictionary terms directly or add custom study notes.
  - **Read:** Automatically loads saved study notes from storage on launch.
  - **Update:** Edit existing notes and definitions with in-place saving.
  - **Delete:** Remove individual notes with confirmation dialogs.

---

## 🔑 Demo Test Credentials

| Account Type | Email | Password | Access Level |
|---|---|---|---|
| **Free Plan** | `demo@boardbuddy.com` | `demo123` | Free topics, 6 flashcards limit |
| **Premium Plan** | `premium@boardbuddy.com` | `demo123` | All topics, Mock Exams, Study Assistant API & CRUD |
