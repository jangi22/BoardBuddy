# BoardBuddy: AI-Powered LET Review System 🎓

**BoardBuddy** is a comprehensive exam preparation platform tailored for Licensure Examination for Teachers (LET) reviewees. The project provides both a **Native Mobile Application (Android)** and a **Full-Stack Web & Windows Desktop Application**.

---

## 📁 Repository Structure

```
BoardBuddy/
├── android/                 # Native Android project (Bare React Native CLI)
├── App.tsx                  # Single-file React Native mobile app (16 screens)
├── index.js                 # React Native mobile entry point
├── README.md                # Project documentation & run guides
├── web/                     # Full-stack Web & Windows Desktop application
│   ├── src/                 # React 19 + TypeScript + Tailwind CSS UI
│   ├── server.ts            # Express backend with Supabase & Gemini AI integration
│   ├── vite.config.ts       # Vite bundler configuration
│   ├── Program.cs           # C# Windows GUI Launcher with Chromium App-Mode
│   └── package.json         # Web dependencies & scripts
└── .gitignore               # Multi-platform exclusions (node_modules, dist, *.exe, etc.)
```

---

## 🚀 How to Run Across Platforms

### 1. 📱 Android Mobile Application (`.apk` or Source)

#### Option A: Install Directly via APK (No Coding Setup Required)
- **Standalone Release APK:**
  - `android/app/build/outputs/apk/release/app-release.apk`
- **Installation:**
  1. Transfer the `.apk` file to any Android phone or tablet.
  2. Tap the file in **Downloads** / **Files** and select **Install** (allow "Install unknown apps" if prompted).
  3. Or drag and drop the `.apk` into any Android emulator (Android Studio Emulator, BlueStacks, LDPlayer).
  4. Via command line:
     ```bash
     adb install -r android/app/build/outputs/apk/release/app-release.apk
     ```

#### Option B: Run from React Native Source Code
1. **Prerequisites:** Node.js (v18+), JDK 17, Android Studio SDK.
2. **Commands:**
   ```bash
   # 1. Install dependencies
   npm install

   # 2. Start Metro bundler
   npx react-native start

   # 3. In a second terminal (with emulator/phone connected):
   npx react-native run-android
   ```

---

### 2. 💻 Windows Desktop Application (`.exe`)

- **Standalone Launcher:** `BoardBuddy.exe` (built from `web/Program.cs`)
- **Features:**
  - Automatically verifies or boots the local BoardBuddy server process.
  - Launches in Chromium/Edge App Mode (`--app=http://localhost:3000`) for a borderless, native desktop window without browser toolbars.
- **To compile from source (Windows C#):**
  ```bash
  cd web
  csc /target:winexe /out:BoardBuddy.exe /win32icon:public/app_icon.ico Program.cs
  ```

---

### 3. 🌐 Web Application (`web/`)

1. **Prerequisites:** Node.js (v18+) or Bun.
2. **Setup & Run:**
   ```bash
   cd web
   npm install
   # Set environment variables in .env (GEMINI_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY)
   npm run dev
   ```
3. Open `http://localhost:3000` in your web browser.

---

## 🔬 Networking & External API Integration (`fetch`)

Integrated into the **Study Assistant** view across both Mobile and Web platforms:
- **API Endpoint:** [Free Dictionary API](https://api.dictionaryapi.dev/api/v2/entries/en/)
  - Searches educational & pedagogical terms (e.g., *pedagogy*, *scaffolding*, *epistemology*, *metacognition*).
- **Data Displayed:**
  - Searched word & phonetic pronunciation guide.
  - Audio pronunciation playback.
  - Grammatical parts of speech tags (noun, verb, adjective).
  - Numbered, formatted definitions and examples.
- **Network Resilience:**
  - Loading spinner indicator during network requests.
  - Graceful handling of HTTP 404 (word not found) and offline connectivity errors.
  - Interactive `🔄 Retry` button to re-trigger failed requests.

---

## 💾 Data Persistence & CRUD

- **Mobile (AsyncStorage):**
  - **Auto-save:** Completed topics (`done[]`), mastered flashcards (`mastered[]`), and exam scores (`stats`).
  - **Personal Study Notes CRUD:** Create, Read, Update, and Delete notes with instant local persistence.
- **Web (Supabase PostgreSQL):**
  - Real-time student authentication, session tokens, exam attempts, verification, and payment tracking.

---

## 🔑 Demo Test Credentials

| Account Type | Email | Password | Access Level |
|---|---|---|---|
| **Free Student** | `demo@boardbuddy.com` | `demo123` | Free review topics, flashcards |
| **Premium Student** | `premium@boardbuddy.com` | `demo123` | Full access, Mock Exams, Study Assistant API |
| **Admin** | `admin@boardbuddy.com` | `admin123` | Student management, payment verification, quiz manager |
