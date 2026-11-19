/**
 * BoardBuddy: LET Review App
 * React Native Community CLI – bare workflow
 *
 * Dependencies (no Expo packages):
 *   @react-navigation/native
 *   @react-navigation/native-stack
 *   react-native-screens
 *   react-native-safe-area-context
 *   @react-native-async-storage/async-storage
 *
 * Lab 4:
 *   • fetch() → Free Dictionary API (https://api.dictionaryapi.dev/api/v2/entries/en/{word})
 *   • AsyncStorage CRUD → saved notes persist across restarts
 *   • AsyncStorage auto-save → done[], mastered[], stats persist across restarts
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

/* =====================================================
   1. THEME
===================================================== */

const NAVY  = '#122B4E';
const GREEN = '#2E9E5B';
const BG    = '#EFF4F9';
const GRAY  = '#75889E';
const GOLD  = '#EBD289';
const BORDER = '#D5E2F0';

/* =====================================================
   2. APPLICATION DATA
===================================================== */

const TOPICS = [
  {
    id: 'piaget',
    title: "Piaget's Stages",
    subject: 'Professional Education',
    premium: false,
    color: NAVY,
    points: [
      'Sensorimotor (0-2): learns through senses and actions; object permanence develops.',
      'Preoperational (2-7): symbolic thinking and egocentrism.',
      'Concrete operational (7-11): logical thinking about concrete objects; conservation.',
      'Formal operational (12+): abstract and hypothetical reasoning.',
    ],
  },
  {
    id: 'bloom',
    title: "Bloom's Revised Taxonomy",
    subject: 'Professional Education',
    premium: false,
    color: NAVY,
    points: [
      'Remembering: recall facts.',
      'Understanding: explain ideas.',
      'Applying: use information in new situations.',
      'Analyzing: break information into parts and find relationships.',
      'Evaluating: justify a decision.',
      'Creating: put elements together to form something new (highest level).',
    ],
  },
  {
    id: 'vygotsky',
    title: "Vygotsky's Sociocultural Theory",
    subject: 'Professional Education',
    premium: false,
    color: NAVY,
    points: [
      'Learning is social and happens through interaction.',
      'Zone of Proximal Development (ZPD): gap between what a learner can do alone and with guidance.',
      'Scaffolding: temporary support that is removed as the learner improves.',
    ],
  },
  {
    id: 'validity',
    title: 'Validity and Reliability',
    subject: 'Professional Education',
    premium: true,
    color: NAVY,
    points: [
      'Validity: the test measures what it is supposed to measure.',
      'Reliability: the test gives consistent results.',
      'A test can be reliable but not valid, but it cannot be valid if it is not reliable.',
    ],
  },
  {
    id: 'rizal',
    title: 'Rizal and 1898',
    subject: 'General Education',
    premium: true,
    color: '#2B6CB0',
    points: [
      'Rizal was executed on December 30, 1896.',
      'The Philippine Revolution continued after his death.',
      '1898: Philippine independence was declared and the Spanish-American War ended Spanish rule.',
    ],
  },
  {
    id: 'sva',
    title: 'Subject-Verb Agreement',
    subject: 'English',
    premium: true,
    color: GREEN,
    points: [
      'A singular subject takes a singular verb.',
      'A plural subject takes a plural verb.',
      '"Each", "every", and "neither" take singular verbs.',
    ],
  },
];

const CARDS = [
  { id: 1, topic: 'vygotsky', term: 'Zone of Proximal Development',
    def: 'The gap between what a learner can do alone and what they can do with guidance.' },
  { id: 2, topic: 'piaget',   term: 'Object permanence',
    def: 'Knowing an object still exists even when it cannot be seen (sensorimotor stage).' },
  { id: 3, topic: 'piaget',   term: 'Conservation',
    def: 'Understanding that quantity stays the same despite a change in shape (concrete operational).' },
  { id: 4, topic: 'bloom',    term: 'Analyzing',
    def: 'Breaking information into parts and finding relationships (compare, differentiate).' },
  { id: 5, topic: 'bloom',    term: 'Creating',
    def: 'Putting elements together to form something new (design, compose, formulate).' },
  { id: 6, topic: 'vygotsky', term: 'Scaffolding',
    def: 'Temporary support given to a learner, removed as they become independent.' },
  { id: 7, topic: 'validity', term: 'Validity',
    def: 'The extent to which a test measures what it is meant to measure.' },
  { id: 8, topic: 'validity', term: 'Reliability',
    def: 'The consistency of test results over time.' },
  { id: 9, topic: 'rizal',    term: 'Rizal execution',
    def: 'December 30, 1896 at Bagumbayan.' },
  { id: 10, topic: 'sva',     term: 'Neither / Each',
    def: 'These indefinite pronouns take singular verbs.' },
  { id: 11, topic: 'piaget',  term: 'Egocentrism',
    def: 'Difficulty seeing a viewpoint other than your own (preoperational).' },
  { id: 12, topic: 'bloom',   term: 'Evaluating',
    def: 'Making judgments based on criteria and standards.' },
];

const FREE_CARD_LIMIT = 6;

const QUESTIONS = [
  { topic:'piaget',   q:'Object permanence develops in which stage?',
    options:['Sensorimotor','Preoperational','Concrete operational','Formal operational'], answer:0,
    why:'Infants learn that hidden objects still exist during the sensorimotor stage.' },
  { topic:'piaget',   q:'Conservation is mastered in which stage?',
    options:['Sensorimotor','Preoperational','Concrete operational','Formal operational'], answer:2,
    why:'Conservation appears at ages 7-11 (concrete operational).' },
  { topic:'bloom',    q:"Which is the highest level in Bloom's Revised Taxonomy?",
    options:['Evaluating','Creating','Analyzing','Applying'], answer:1,
    why:'In the revised taxonomy, Creating sits at the top.' },
  { topic:'bloom',    q:'Comparing and differentiating belongs to which level?',
    options:['Applying','Understanding','Analyzing','Remembering'], answer:2,
    why:'Analyzing means breaking information into parts and finding relationships.' },
  { topic:'vygotsky', q:'The gap between what a learner can do alone and with help is the:',
    options:['Schema','Zone of Proximal Development','Assimilation','Conservation'], answer:1,
    why:"That is Vygotsky's ZPD." },
  { topic:'vygotsky', q:'Temporary support that is gradually removed is called:',
    options:['Scaffolding','Drill','Egocentrism','Reinforcement'], answer:0,
    why:'Scaffolding supports learners until they can work independently.' },
  { topic:'validity', q:'A test that gives consistent results is:',
    options:['Valid','Reliable','Usable','Objective'], answer:1,
    why:'Reliability means consistency.' },
  { topic:'validity', q:'A test that measures what it should measure is:',
    options:['Valid','Reliable','Practical','Easy'], answer:0,
    why:'Validity means measuring what the test claims to measure.' },
  { topic:'rizal',    q:'When was Jose Rizal executed?',
    options:['1892','1896','1898','1901'], answer:1,
    why:'December 30, 1896.' },
  { topic:'rizal',    q:'Philippine independence was declared in:',
    options:['1896','1897','1898','1899'], answer:2,
    why:'June 12, 1898.' },
  { topic:'sva',      q:'Choose the correct sentence.',
    options:['Each of the boys are here.','Each of the boys is here.','Each of the boys be here.','Each of the boys were here.'], answer:1,
    why:'"Each" takes a singular verb.' },
  { topic:'sva',      q:'The teachers ___ in the room.',
    options:['is','was','are','has'], answer:2,
    why:'The plural subject "teachers" takes "are".' },
];

const ACCOUNTS_DEFAULT = [
  { email:'demo@boardbuddy.com',    password:'demo123', name:'Jhacel B. Delos Reyes', role:'Graduating Education student', premium:false },
  { email:'premium@boardbuddy.com', password:'demo123', name:'Premium Student',         role:'Retaker (LET)',                premium:true  },
];

/* =====================================================
   3. ASYNC STORAGE KEYS
===================================================== */

const SK = {
  DONE:     '@boardbuddy_done',
  MASTERED: '@boardbuddy_mastered',
  STATS:    '@boardbuddy_stats',
  NOTES:    '@boardbuddy_notes',
};

/* =====================================================
   4. APP STATE – CONTEXT (with AsyncStorage persistence)
===================================================== */

const AppCtx = createContext<any>(null);
const useApp = () => useContext(AppCtx);

function AppProvider({ children }: { children: React.ReactNode }) {
  const [accounts, setAccounts] = useState(ACCOUNTS_DEFAULT);
  const [user, setUser]         = useState<any>(null);
  const [done, setDone]         = useState<string[]>([]);
  const [mastered, setMastered] = useState<number[]>([]);
  const [stats, setStats]       = useState<Record<string, { right: number; wrong: number }>>({});
  const [hydrated, setHydrated] = useState(false);

  // ── Load persisted data once on mount ──────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [doneRaw, masteredRaw, statsRaw] = await Promise.all([
          AsyncStorage.getItem(SK.DONE),
          AsyncStorage.getItem(SK.MASTERED),
          AsyncStorage.getItem(SK.STATS),
        ]);
        if (doneRaw)     setDone(JSON.parse(doneRaw));
        if (masteredRaw) setMastered(JSON.parse(masteredRaw));
        if (statsRaw)    setStats(JSON.parse(statsRaw));
      } catch (_) {
        // first launch or corrupt data — start fresh
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  // ── Auto-save whenever values change (after hydration) ────────────────────
  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(SK.DONE, JSON.stringify(done)).catch(() => {});
  }, [done, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(SK.MASTERED, JSON.stringify(mastered)).catch(() => {});
  }, [mastered, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(SK.STATS, JSON.stringify(stats)).catch(() => {});
  }, [stats, hydrated]);

  // ── State helpers ──────────────────────────────────────────────────────────
  const recordAnswer = (topic: string, correct: boolean) => {
    setStats(prev => {
      const cur = prev[topic] || { right: 0, wrong: 0 };
      return { ...prev, [topic]: { right: cur.right + (correct ? 1 : 0), wrong: cur.wrong + (correct ? 0 : 1) } };
    });
  };

  const markDone = (id: string) =>
    setDone(prev => prev.includes(id) ? prev : [...prev, id]);

  const master = (id: number) =>
    setMastered(prev => prev.includes(id) ? prev : [...prev, id]);

  const resetProgress = async () => {
    setDone([]);
    setMastered([]);
    setStats({});
    await Promise.all([
      AsyncStorage.removeItem(SK.DONE),
      AsyncStorage.removeItem(SK.MASTERED),
      AsyncStorage.removeItem(SK.STATS),
    ]).catch(() => {});
  };

  const totals = Object.values(stats).reduce(
    (t, i) => ({ right: t.right + i.right, wrong: t.wrong + i.wrong }),
    { right: 0, wrong: 0 }
  );
  const answered = totals.right + totals.wrong;
  const weak = TOPICS.filter(t => stats[t.id] && stats[t.id].wrong > stats[t.id].right);

  return (
    <AppCtx.Provider value={{
      accounts, setAccounts,
      user, setUser,
      done, markDone,
      mastered, master,
      stats, recordAnswer,
      totals, answered, weak,
      resetProgress,
    }}>
      {children}
    </AppCtx.Provider>
  );
}

/* =====================================================
   5. SHARED UI COMPONENTS
===================================================== */

function Btn({ title, onPress, variant = 'green', style }: any) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        s.btn,
        variant === 'green'   && { backgroundColor: GREEN },
        variant === 'navy'    && { backgroundColor: NAVY },
        variant === 'outline' && { backgroundColor: '#fff', borderWidth: 2, borderColor: NAVY },
        style,
      ]}
    >
      <Text style={[s.btnText, variant === 'outline' && { color: NAVY }]}>{title}</Text>
    </TouchableOpacity>
  );
}

function Mascot({ size = 90 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.5 }}>🎓</Text>
    </View>
  );
}

const NAV_ITEMS = [
  { name: 'Home',       icon: '🏠' },
  { name: 'Summaries',  icon: '📄' },
  { name: 'Flashcards', icon: '🗂️', label: 'Cards' },
  { name: 'Practice',   icon: '✏️' },
  { name: 'Progress',   icon: '📊' },
  { name: 'Profile',    icon: '👤' },
];

function BottomNav({ navigation, active }: any) {
  return (
    <View style={s.bottomNav}>
      {NAV_ITEMS.map(item => (
        <TouchableOpacity
          key={item.name}
          style={s.navItem}
          onPress={() => navigation.navigate(item.name)}
          accessibilityRole="button"
          accessibilityLabel={item.label || item.name}
        >
          <Text style={{ fontSize: 20, opacity: active === item.name ? 1 : 0.5 }}>{item.icon}</Text>
          <Text style={[s.navLabel, active === item.name && { color: GREEN }]}>
            {item.label || item.name}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function MainScreen({ navigation, active, title, subtitle, children }: any) {
  return (
    <SafeAreaView style={s.screen} edges={['top', 'bottom']}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingBottom: 30 }}>
        <Text style={s.h1}>{title}</Text>
        {!!subtitle && <Text style={s.sub}>{subtitle}</Text>}
        <View style={{ height: 16 }} />
        {children}
      </ScrollView>
      <BottomNav navigation={navigation} active={active} />
    </SafeAreaView>
  );
}

function DetailScreen({ children }: any) {
  return (
    <SafeAreaView style={s.screen} edges={['bottom']}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

function PremiumTag() {
  return (
    <View style={s.tag}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: NAVY }}>🔒 Premium</Text>
    </View>
  );
}

/* =====================================================
   6. AUTHENTICATION SCREENS
===================================================== */

function LoginScreen({ navigation }: any) {
  const { accounts, setUser } = useApp();
  const [email, setEmail] = useState('');
  const [pw, setPw]       = useState('');

  const login = () => {
    const cleanEmail = email.trim().toLowerCase();
    const account = accounts.find(
      (a: any) => a.email.toLowerCase() === cleanEmail && a.password === pw
    );
    if (!account) return Alert.alert('Login failed', 'Wrong email or password.');
    setUser({ ...account, since: new Date().toLocaleDateString() });
    navigation.replace('Home');
  };

  return (
    <SafeAreaView style={[s.screen, { backgroundColor: NAVY }]} edges={['top', 'bottom']}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, alignItems: 'center' }}>
        <Mascot />
        <Text style={s.brand}>Board<Text style={{ color: GREEN }}>Buddy</Text></Text>
        <Text style={s.tagline}>Don't study alone. Study with a buddy.</Text>
        <Text style={[s.h2, { color: '#fff', marginTop: 24, alignSelf: 'center' }]}>Welcome back</Text>

        <TextInput style={s.input} placeholder="Email" placeholderTextColor="#8898AA"
          autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <TextInput style={s.input} placeholder="Password" placeholderTextColor="#8898AA"
          secureTextEntry value={pw} onChangeText={setPw} />

        <Btn title="Log in" onPress={login} style={{ alignSelf: 'stretch' }} />

        <Text style={s.hint}>demo@boardbuddy.com or premium@boardbuddy.com</Text>
        <Text style={s.hint}>password: demo123</Text>

        <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
          <Text style={[s.hint, { marginTop: 18, fontSize: 15 }]}>
            New to BoardBuddy?{' '}
            <Text style={{ color: GREEN, fontWeight: '700' }}>Sign up</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const ROLES = [
  'Graduating Education student',
  'Graduate / first-time taker',
  'Retaker (LET)',
  'Other board exam reviewee',
];

function SignUpScreen({ navigation }: any) {
  const { accounts, setAccounts, setUser } = useApp();
  const [name, setName] = useState('');
  const [role, setRole] = useState(ROLES[0]);
  const [email, setEmail] = useState('');
  const [pw, setPw]       = useState('');
  const [pw2, setPw2]     = useState('');

  const signUp = () => {
    const cleanName  = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanName || !cleanEmail || !pw || !pw2)
      return Alert.alert('Missing information', 'Please fill in all fields.');
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.'))
      return Alert.alert('Invalid email', 'Please enter a valid email address.');
    if (pw.length < 6)
      return Alert.alert('Weak password', 'Password needs at least 6 characters.');
    if (pw !== pw2) return Alert.alert('Passwords do not match');
    if (accounts.some((a: any) => a.email.toLowerCase() === cleanEmail))
      return Alert.alert('Email already registered');

    const account = { email: cleanEmail, password: pw, name: cleanName, role, premium: false };
    setAccounts((prev: any) => [...prev, account]);
    setUser({ ...account, since: new Date().toLocaleDateString() });
    navigation.replace('Home');
  };

  return (
    <SafeAreaView style={[s.screen, { backgroundColor: NAVY }]} edges={['top', 'bottom']}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24 }}>
        <View style={{ alignItems: 'center' }}>
          <Mascot size={70} />
          <Text style={s.brand}>Board<Text style={{ color: GREEN }}>Buddy</Text></Text>
        </View>

        <Text style={[s.h2, { color: '#fff' }]}>Create your account</Text>

        <TextInput style={s.input} placeholder="Full name" placeholderTextColor="#75889E"
          value={name} onChangeText={setName} />

        <Text style={{ color: GREEN, fontWeight: '700', marginBottom: 8 }}>I am a...</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 }}>
          {ROLES.map(item => (
            <TouchableOpacity key={item} onPress={() => setRole(item)}
              style={[s.roleChip, role === item && { backgroundColor: GREEN }]}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput style={s.input} placeholder="Email" placeholderTextColor="#75889E"
          autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <TextInput style={s.input} placeholder="Password" placeholderTextColor="#75889E"
          secureTextEntry value={pw} onChangeText={setPw} />
        <TextInput style={s.input} placeholder="Confirm password" placeholderTextColor="#75889E"
          secureTextEntry value={pw2} onChangeText={setPw2} />

        <Btn title="Sign up" onPress={signUp} />

        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[s.hint, { marginTop: 16 }]}>
            Already have an account?{' '}
            <Text style={{ color: GREEN, fontWeight: '700' }}>Log in</Text>
          </Text>
        </TouchableOpacity>
        <Text style={[s.hint, { fontSize: 12 }]}>Prototype: accounts are saved on this device only.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

/* =====================================================
   7. HOME DASHBOARD
===================================================== */

function HomeScreen({ navigation }: any) {
  const { user, done, answered, mastered, weak } = useApp();
  const first = (user?.name || 'Student').split(' ')[0];
  const pct  = Math.round((done.length / TOPICS.length) * 100);
  const next = weak[0] || TOPICS.find(t => !done.includes(t.id)) || TOPICS[0];
  const goal = Math.min(answered, 10);

  return (
    <MainScreen navigation={navigation} active="Home"
      title={`Hello, ${first}!`} subtitle="Too much to review? Start small today.">

      {/* Hero card */}
      <View style={[s.card, { backgroundColor: NAVY }]}>
        <Text style={{ color: '#A0C0DD', fontWeight: '700' }}>Your LET review</Text>
        <Text style={{ color: '#fff', fontSize: 44, fontWeight: '800' }}>{done.length}/{TOPICS.length}</Text>
        <Text style={{ color: '#fff', fontWeight: '700' }}>topics completed · {pct}%</Text>
      </View>

      {/* Mini stat cards */}
      <View style={{ flexDirection: 'row', marginBottom: 12 }}>
        {([[mastered.length,'cards mastered'],[answered,'answered'],[done.length,'topics done']] as [number,string][])
          .map(([num, lbl], idx) => (
            <View key={lbl} style={[s.stat, idx < 2 && { marginRight: 8 }]}>
              <Text style={s.statNum}>{num}</Text>
              <Text style={s.statLbl}>{lbl}</Text>
            </View>
          ))}
      </View>

      {/* Today's goal */}
      <View style={s.card}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={s.cardTitle}>Today's goal</Text>
          <Text style={{ color: GRAY, fontWeight: '700' }}>{goal}/10</Text>
        </View>
        <View style={s.barBg}><View style={[s.barFill, { width: `${goal * 10}%` as any }]} /></View>
        <Text style={s.muted}>Answer questions, review cards, or finish a topic to keep your streak.</Text>
      </View>

      {/* Study tools grid */}
      <Text style={s.h2}>Study tools</Text>
      <View style={s.grid}>
        {([
          ['📄','AI Summaries','Summaries'],
          ['🗂️','Flashcards','Flashcards'],
          ['✏️','Practice','Practice'],
          ['🤖','Study Assistant','StudyAssistant'],
        ] as [string,string,string][]).map(([icon, label, route]) => (
          <TouchableOpacity key={route} style={s.tool} onPress={() => navigation.navigate(route)}>
            <Text style={{ fontSize: 26 }}>{icon}</Text>
            <Text style={s.toolLbl}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Focus next */}
      <Text style={s.h2}>Focus next</Text>
      <TouchableOpacity style={s.card}
        onPress={() => navigation.navigate('SummaryDetail', { topicId: next.id })}>
        <Text style={s.cardTitle}>{next.title}</Text>
        <Text style={s.muted}>
          {weak.includes(next)
            ? 'Weak area. Review the summary again.'
            : 'Not started yet. Read the summary, then try practice.'}
        </Text>
      </TouchableOpacity>

      {/* Premium banner */}
      {!user?.premium ? (
        <View style={[s.card, { borderWidth: 2, borderColor: GOLD }]}>
          <Text style={s.cardTitle}>Premium · ₱149/month</Text>
          <Text style={s.muted}>Full review materials, unlimited flashcards, AI Study Assistant, mock board exams, and detailed analytics.</Text>
          <Btn title="See Premium" onPress={() => navigation.navigate('Premium')} style={{ marginTop: 12 }} />
        </View>
      ) : (
        <View style={[s.card, { borderWidth: 2, borderColor: '#F59E0B' }]}>
          <Text style={s.cardTitle}>Premium is active</Text>
          <Text style={s.muted}>Full materials, AI Study Assistant, personalized practice, and mock exams are unlocked.</Text>
        </View>
      )}
    </MainScreen>
  );
}

/* =====================================================
   8. AI SUMMARIES & TOPIC DETAILS
===================================================== */

function SummariesScreen({ navigation }: any) {
  const { user, done } = useApp();
  const [q, setQ]           = useState('');
  const [filter, setFilter] = useState('All');
  const filters = ['All', 'Professional Education', 'General Education', 'English'];

  const list = TOPICS.filter(t =>
    (filter === 'All' || t.subject === filter) &&
    t.title.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <MainScreen navigation={navigation} active="Summaries"
      title="AI Summaries" subtitle="Long reviewers, turned into short notes.">

      <TextInput style={[s.input, { backgroundColor: '#fff', color: NAVY }]}
        placeholder="Search topics..." placeholderTextColor="#8898AA" value={q} onChangeText={setQ} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        {filters.map(item => (
          <TouchableOpacity key={item} onPress={() => setFilter(item)}
            style={[s.chip, filter === item && { backgroundColor: NAVY }]}>
            <Text style={{ fontWeight: '700', color: filter === item ? '#fff' : NAVY }}>{item}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {list.length === 0 && <Text style={s.muted}>No topics found.</Text>}

      {list.map(topic => (
        <TouchableOpacity key={topic.id}
          style={[s.row, { borderLeftColor: topic.color }]}
          onPress={() =>
            topic.premium && !user?.premium
              ? navigation.navigate('Premium')
              : navigation.navigate('SummaryDetail', { topicId: topic.id })
          }>
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle}>{topic.title}</Text>
            <Text style={s.muted}>{topic.subject}</Text>
          </View>
          {topic.premium && !user?.premium
            ? <PremiumTag />
            : <Text style={{ color: done.includes(topic.id) ? GREEN : GRAY, fontWeight: '800' }}>
                {done.includes(topic.id) ? '✓' : '›'}
              </Text>}
        </TouchableOpacity>
      ))}
    </MainScreen>
  );
}

function SummaryDetailScreen({ route, navigation }: any) {
  const { topicId } = route.params || {};
  const topic = TOPICS.find(t => t.id === topicId);
  const { done, markDone } = useApp();

  if (!topic) {
    return (
      <DetailScreen>
        <Text style={s.h2}>Topic not found</Text>
        <Text style={s.muted}>This review topic is unavailable.</Text>
        <Btn title="Back to Summaries" onPress={() => navigation.navigate('Summaries')} />
      </DetailScreen>
    );
  }

  const isDone = done.includes(topic.id);

  return (
    <DetailScreen>
      <Text style={s.h1}>{topic.title}</Text>
      <Text style={[s.muted, { marginBottom: 14 }]}>{topic.subject}</Text>

      {topic.points.map((point, i) => (
        <View key={i} style={[s.row, { borderLeftColor: GREEN, alignItems: 'flex-start' }]}>
          <Text style={{ color: NAVY, fontSize: 15, flex: 1 }}>{point}</Text>
        </View>
      ))}

      <View style={{ flexDirection: 'row', marginVertical: 14 }}>
        <Btn title="Flashcards" variant="outline" style={{ flex: 1, marginRight: 8 }}
          onPress={() => navigation.navigate('Flashcards')} />
        <Btn title="Practice" variant="navy" style={{ flex: 1 }}
          onPress={() => navigation.navigate('Quiz', { topicId: topic.id })} />
      </View>

      <Btn
        title={isDone ? '✓ Completed' : 'Mark as done'}
        onPress={() => { markDone(topic.id); Alert.alert('Nice!', `${topic.title} marked as done.`); }}
      />
    </DetailScreen>
  );
}

/* =====================================================
   9. FLASHCARDS
===================================================== */

function FlashcardsScreen({ navigation }: any) {
  const { user, mastered, master } = useApp();
  const available = user?.premium ? CARDS : CARDS.slice(0, FREE_CARD_LIMIT);
  const [i, setI]     = useState(0);
  const [flip, setFlip] = useState(false);
  const card = available[i];

  const next = () => { setFlip(false); setI(prev => (prev + 1) % available.length); };

  return (
    <MainScreen navigation={navigation} active="Flashcards"
      title="Flashcards" subtitle={`${mastered.length} of ${CARDS.length} cards mastered`}>

      {!user?.premium && (
        <TouchableOpacity style={[s.card, { backgroundColor: GOLD }]}
          onPress={() => navigation.navigate('Premium')}>
          <Text style={{ fontWeight: '700', color: NAVY }}>
            Free plan: {FREE_CARD_LIMIT} of {CARDS.length} cards. Tap to unlock all.
          </Text>
        </TouchableOpacity>
      )}

      <Text style={s.muted}>Card {i + 1} of {available.length}</Text>

      <TouchableOpacity activeOpacity={0.9} onPress={() => setFlip(p => !p)}
        style={[s.flash, { backgroundColor: flip ? GREEN : NAVY }]}>
        <Text style={{ color: flip ? '#D7F0DD' : '#A0C0DD', fontWeight: '700', position: 'absolute', top: 16, left: 16 }}>
          {flip ? 'Definition' : 'Term'}
        </Text>
        <Text style={s.flashText}>{flip ? card.def : card.term}</Text>
        <Text style={{ color: flip ? '#D7F0DD' : '#82A3C7', fontWeight: '700', position: 'absolute', bottom: 16 }}>
          {flip ? 'Tap to see the term' : 'Tap to flip'}
        </Text>
      </TouchableOpacity>

      <View style={{ flexDirection: 'row' }}>
        <Btn title="Review again" variant="outline" style={{ flex: 1, marginRight: 8 }} onPress={next} />
        <Btn title="Got it" style={{ flex: 1 }} onPress={() => { master(card.id); next(); }} />
      </View>

      <Btn title="View related summary" variant="navy" style={{ marginTop: 10 }}
        onPress={() => navigation.navigate('SummaryDetail', { topicId: card.topic })} />
    </MainScreen>
  );
}

/* =====================================================
   10. PRACTICE QUIZ AND RESULTS
===================================================== */

function PracticeScreen({ navigation }: any) {
  const { user, stats, weak } = useApp();

  return (
    <MainScreen navigation={navigation} active="Practice"
      title="Practice" subtitle="Test your knowledge and recall.">

      {TOPICS.map(topic => {
        const st = stats[topic.id];
        const locked = topic.premium && !user?.premium;
        return (
          <TouchableOpacity key={topic.id} style={[s.row, { borderLeftColor: topic.color }]}
            onPress={() => locked
              ? navigation.navigate('Premium')
              : navigation.navigate('Quiz', { topicId: topic.id })}>
            <View style={{ flex: 1 }}>
              <Text style={s.cardTitle}>{topic.title}</Text>
              <Text style={s.muted}>{st ? `${st.right} right · ${st.wrong} wrong` : 'Not attempted'}</Text>
            </View>
            {locked ? <PremiumTag /> : <Text style={{ color: GREEN, fontSize: 18, fontWeight: '800' }}>▶</Text>}
          </TouchableOpacity>
        );
      })}

      <Text style={s.h2}>Premium</Text>

      <Btn variant="navy" title="Personalized practice (weak topics)" style={{ marginBottom: 10 }}
        onPress={() => {
          if (!user?.premium) return navigation.navigate('Premium');
          if (!weak.length) return Alert.alert('No weak topics yet', 'Take a practice set first so we can find them.');
          navigation.navigate('Quiz', { topicId: weak[0].id, personalized: true });
        }} />

      <Btn variant="navy" title="Mock board exam (5 min)"
        onPress={() => user?.premium
          ? navigation.navigate('Quiz', { topicId: null, mock: true })
          : navigation.navigate('Premium')} />
    </MainScreen>
  );
}

function QuizScreen({ route, navigation }: any) {
  const { topicId, mock } = route.params || {};
  const { recordAnswer, markDone } = useApp();
  const topic     = TOPICS.find(t => t.id === topicId);
  const questions = mock ? QUESTIONS : QUESTIONS.filter(q => q.topic === topicId);

  const [i, setI]       = useState(0);
  const [sel, setSel]   = useState<number | null>(null);
  const [score, setScore] = useState(0);

  if (questions.length === 0) {
    return (
      <DetailScreen>
        <Text style={s.h2}>No questions available</Text>
        <Text style={s.muted}>There are currently no practice questions for this topic.</Text>
        <Btn title="Back to Practice" onPress={() => navigation.navigate('Practice')} />
      </DetailScreen>
    );
  }

  const q = questions[i];
  const answered = sel !== null;

  const pick = (idx: number) => {
    if (answered) return;
    setSel(idx);
    const correct = idx === q.answer;
    if (correct) setScore(p => p + 1);
    recordAnswer(q.topic, correct);
  };

  const next = () => {
    if (i + 1 < questions.length) { setI(p => p + 1); setSel(null); return; }
    if (topic) markDone(topic.id);
    navigation.replace('Results', {
      title: mock ? 'Mock Board Exam' : topic?.title,
      score,
      total: questions.length,
      topicId,
    });
  };

  return (
    <DetailScreen>
      <Text style={s.muted}>Question {i + 1} of {questions.length}</Text>
      <View style={s.barBg}>
        <View style={[s.barFill, { width: `${((i + 1) / questions.length) * 100}%` as any }]} />
      </View>

      <View style={[s.card, { marginTop: 16 }]}>
        <Text style={[s.cardTitle, { fontSize: 18 }]}>{q.q}</Text>
      </View>

      {q.options.map((opt, idx) => {
        const correct = answered && idx === q.answer;
        const wrong   = answered && idx === sel && idx !== q.answer;
        return (
          <TouchableOpacity key={idx} onPress={() => pick(idx)} disabled={answered}
            style={[s.option,
              correct && { backgroundColor: '#E8F5E9', borderColor: GREEN },
              wrong   && { backgroundColor: '#FDEAEA', borderColor: '#E57373' }]}>
            <Text style={{ fontWeight: '700', color: NAVY, fontSize: 16 }}>{opt}</Text>
          </TouchableOpacity>
        );
      })}

      {answered && <Text style={[s.muted, { marginVertical: 10 }]}>{q.why}</Text>}
      {answered && (
        <Btn title={i + 1 < questions.length ? 'Next question' : 'See results'} onPress={next} />
      )}
      <Btn title="Quit" variant="outline" style={{ marginTop: 10 }} onPress={() => navigation.goBack()} />
    </DetailScreen>
  );
}

function ResultsScreen({ route, navigation }: any) {
  const { title, score, total, topicId } = route.params;
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;

  return (
    <DetailScreen>
      <View style={[s.card, { backgroundColor: NAVY, alignItems: 'center' }]}>
        <Text style={{ color: '#A0C0DD', fontWeight: '700' }}>{title}</Text>
        <Text style={{ color: '#fff', fontSize: 52, fontWeight: '800' }}>{score}/{total}</Text>
        <Text style={{ color: '#fff', fontWeight: '700' }}>
          {pct}% · {pct >= 75 ? 'Great job!' : 'Keep reviewing!'}
        </Text>
      </View>

      {topicId && (
        <Btn title="Review summary" variant="outline" style={{ marginBottom: 10 }}
          onPress={() => navigation.navigate('SummaryDetail', { topicId })} />
      )}
      <Btn title="Back to Practice" variant="navy" style={{ marginBottom: 10 }}
        onPress={() => navigation.navigate('Practice')} />
      <Btn title="View my progress" onPress={() => navigation.navigate('Progress')} />
    </DetailScreen>
  );
}

/* =====================================================
   11. PROGRESS TRACKER
===================================================== */

function ProgressScreen({ navigation }: any) {
  const { user, done, totals, stats, weak } = useApp();
  const pct = Math.round((done.length / TOPICS.length) * 100);
  const subjects = ['Professional Education', 'General Education', 'English'];

  return (
    <MainScreen navigation={navigation} active="Progress"
      title="My Progress" subtitle="Scores, completed topics, weak areas.">

      <View style={[s.card, { backgroundColor: NAVY }]}>
        <Text style={{ color: '#A0C0DD', fontWeight: '700' }}>Overall completion</Text>
        <Text style={{ color: '#fff', fontSize: 48, fontWeight: '800' }}>{pct}%</Text>
        <View style={[s.barBg, { backgroundColor: '#2D4A75' }]}>
          <View style={[s.barFill, { width: `${pct}%` as any }]} />
        </View>
      </View>

      {subjects.map(subject => {
        const subTopics  = TOPICS.filter(t => t.subject === subject);
        const completed  = subTopics.filter(t => done.includes(t.id)).length;
        const subPct     = subTopics.length > 0 ? (completed / subTopics.length) * 100 : 0;
        return (
          <View key={subject} style={s.card}>
            <Text style={s.cardTitle}>{subject}</Text>
            <View style={s.barBg}><View style={[s.barFill, { width: `${subPct}%` as any }]} /></View>
            <Text style={s.muted}>{completed} of {subTopics.length} topics done</Text>
          </View>
        );
      })}

      <View style={[s.card, { backgroundColor: '#E3F2E6' }]}>
        <Text style={s.cardTitle}>Weak areas</Text>
        {weak.length === 0
          ? <Text style={s.muted}>None yet. Take a practice set to find them.</Text>
          : weak.map((t: any) => (
            <TouchableOpacity key={t.id}
              onPress={() => navigation.navigate('SummaryDetail', { topicId: t.id })}>
              <Text style={{ color: '#D9534F', fontWeight: '700', marginTop: 6 }}>
                ✗ {t.title} ({stats[t.id]?.wrong ?? 0} wrong) ›
              </Text>
            </TouchableOpacity>
          ))}
      </View>

      {user?.premium ? (
        <View style={s.card}>
          <Text style={s.cardTitle}>Detailed analytics</Text>
          <Text style={s.muted}>Right answers: {totals.right} · Wrong answers: {totals.wrong}</Text>
        </View>
      ) : (
        <Btn variant="navy" title="Upgrade to Premium for analytics"
          onPress={() => navigation.navigate('Premium')} />
      )}
    </MainScreen>
  );
}

/* =====================================================
   12. USER PROFILE
===================================================== */

function ProfileScreen({ navigation }: any) {
  const { user, setUser, setAccounts, done, answered, mastered, resetProgress } = useApp();
  const [name, setName] = useState(user?.name || '');
  const [cur, setCur]   = useState('');
  const [nw, setNw]     = useState('');

  const initial = (user?.name || 'S')[0].toUpperCase();

  const saveName = () => {
    const cleanName = name.trim();
    if (!cleanName) return Alert.alert('Invalid name', 'Name cannot be empty.');
    const updatedUser = { ...user, name: cleanName };
    setUser(updatedUser);
    setAccounts((prev: any) => prev.map((a: any) =>
      a.email.toLowerCase() === user.email.toLowerCase() ? { ...a, name: cleanName } : a));
    Alert.alert('Saved', 'Your profile name has been updated.');
  };

  const updatePassword = () => {
    if (cur !== user?.password) return Alert.alert('Incorrect password', 'Your current password is incorrect.');
    if (nw.length < 6) return Alert.alert('Weak password', 'Your new password must contain at least 6 characters.');
    const updatedUser = { ...user, password: nw };
    setUser(updatedUser);
    setAccounts((prev: any) => prev.map((a: any) =>
      a.email.toLowerCase() === user.email.toLowerCase() ? { ...a, password: nw } : a));
    setCur(''); setNw('');
    Alert.alert('Success', 'Your password has been updated.');
  };

  const handleReset = () => {
    Alert.alert('Reset Progress', 'This will clear all completed topics, mastered cards, and quiz stats. Continue?',
      [{ text: 'Cancel', style: 'cancel' },
       { text: 'Reset', style: 'destructive', onPress: () => resetProgress() }]);
  };

  const handleLogout = () => {
    setUser(null);
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  return (
    <MainScreen navigation={navigation} active="Profile"
      title="My Profile" subtitle="Your account and study stats.">

      <View style={[s.card, { alignItems: 'center' }]}>
        <View style={s.avatar}>
          <Text style={{ color: '#fff', fontSize: 32, fontWeight: '800' }}>{initial}</Text>
        </View>
        <Text style={[s.h2, { marginTop: 8, marginBottom: 2 }]}>{user?.name}</Text>
        <Text style={s.muted}>{user?.email}</Text>
        <Text style={{ fontWeight: '700', color: NAVY }}>{user?.role}</Text>
        <View style={[s.tag, { backgroundColor: user?.premium ? '#EBD289' : '#DCE8F5', marginTop: 8 }]}>
          <Text style={{ fontWeight: '700', color: NAVY }}>{user?.premium ? '⭐ Premium' : 'Free plan'}</Text>
        </View>
        <Text style={[s.muted, { marginTop: 6 }]}>Member since {user?.since}</Text>
      </View>

      <View style={{ flexDirection: 'row', marginBottom: 12 }}>
        {([[done.length,'Topics done'],[answered,'Questions'],[mastered.length,'Cards mastered']] as [number,string][])
          .map(([num, lbl], idx) => (
            <View key={lbl} style={[s.stat, idx < 2 && { marginRight: 8 }]}>
              <Text style={s.statNum}>{num}</Text>
              <Text style={s.statLbl}>{lbl}</Text>
            </View>
          ))}
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle}>Edit profile</Text>
        <TextInput style={[s.input, { backgroundColor: BG, color: NAVY, marginTop: 8 }]}
          value={name} onChangeText={setName} />
        <Btn title="Save name" onPress={saveName} />
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle}>Change password</Text>
        <TextInput style={[s.input, { backgroundColor: BG, color: NAVY, marginTop: 8 }]}
          placeholder="Current password" placeholderTextColor="#8898AA" secureTextEntry value={cur} onChangeText={setCur} />
        <TextInput style={[s.input, { backgroundColor: BG, color: NAVY }]}
          placeholder="New password (6+ characters)" placeholderTextColor="#8898AA" secureTextEntry value={nw} onChangeText={setNw} />
        <Btn variant="navy" title="Update password" onPress={updatePassword} />
      </View>

      {!user?.premium && (
        <Btn title="Upgrade to Premium" onPress={() => navigation.navigate('Premium')} style={{ marginBottom: 10 }} />
      )}

      <Btn title="Reset Saved Progress" variant="outline" style={{ marginBottom: 10 }} onPress={handleReset} />
      <Btn title="Log out" variant="outline" onPress={handleLogout} />
    </MainScreen>
  );
}

/* =====================================================
   13. STUDY ASSISTANT
        Lab 4A: Free Dictionary API (fetch + error handling)
        Lab 4B: AsyncStorage CRUD for saved notes
===================================================== */

type DictEntry = {
  word: string;
  phonetic?: string;
  meanings: { partOfSpeech: string; definitions: { definition: string }[] }[];
};

type SavedNote = {
  id: string;
  word: string;
  phonetic: string;
  pos: string;
  definition: string;
  createdAt: string;
};

function StudyAssistantScreen({ navigation }: any) {
  const { user } = useApp();

  /* ── Dictionary API state ─────────────────────────── */
  const [query, setQuery]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState<DictEntry | null>(null);
  const [apiError, setApiError]     = useState('');
  const [lastQuery, setLastQuery]   = useState('');

  /* ── Saved notes state ────────────────────────────── */
  const [notes, setNotes]           = useState<SavedNote[]>([]);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [editText, setEditText]     = useState('');
  const [customWord, setCustomWord] = useState('');
  const [customDef, setCustomDef]   = useState('');

  /* ── Load notes from AsyncStorage on mount ─────────── */
  useEffect(() => {
    AsyncStorage.getItem(SK.NOTES)
      .then(raw => { if (raw) setNotes(JSON.parse(raw)); })
      .catch(() => {});
  }, []);

  /* ── Persist notes whenever they change ──────────────── */
  const persistNotes = useCallback(async (updated: SavedNote[]) => {
    setNotes(updated);
    await AsyncStorage.setItem(SK.NOTES, JSON.stringify(updated)).catch(() => {});
  }, []);

  /* ── Free Dictionary API fetch ───────────────────────
     GET https://api.dictionaryapi.dev/api/v2/entries/en/{word}
     No API key required.
  ─────────────────────────────────────────────────────── */
  const lookupWord = async (word?: string) => {
    const w = (word ?? query).trim();
    if (!w) return;
    setLastQuery(w);
    setLoading(true);
    setResult(null);
    setApiError('');

    try {
      const res = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(w)}`
      );

      if (res.status === 404) {
        setApiError(`No definition found for "${w}". Try another word.`);
        return;
      }

      if (!res.ok) {
        setApiError(`Server error (${res.status}). Please try again.`);
        return;
      }

      const data: DictEntry[] = await res.json();
      if (!data || data.length === 0) {
        setApiError('No data returned. Please try again.');
        return;
      }

      setResult(data[0]);
    } catch (err: any) {
      // Network / offline error
      const isOffline = err?.message?.toLowerCase().includes('network') ||
                        err?.message?.toLowerCase().includes('failed');
      setApiError(
        isOffline
          ? 'You appear to be offline. Check your connection and tap Retry.'
          : `Error: ${err?.message || 'Unknown error'}. Tap Retry.`
      );
    } finally {
      setLoading(false);
    }
  };

  /* ── CRUD helpers ─────────────────────────────────── */

  // CREATE: save a word from API result
  const saveFromResult = () => {
    if (!result) return;
    const firstMeaning = result.meanings?.[0];
    const note: SavedNote = {
      id: Date.now().toString(),
      word: result.word,
      phonetic: result.phonetic || '',
      pos: firstMeaning?.partOfSpeech || '',
      definition: firstMeaning?.definitions?.[0]?.definition || '(No definition provided)',
      createdAt: new Date().toLocaleString(),
    };
    persistNotes([note, ...notes]);
    Alert.alert('Saved!', `"${result.word}" added to My Saved Notes.`);
  };

  // CREATE: save a custom note
  const saveCustomNote = () => {
    if (!customWord.trim() || !customDef.trim())
      return Alert.alert('Fill in both fields', 'Word and definition are required.');
    const note: SavedNote = {
      id: Date.now().toString(),
      word: customWord.trim(),
      phonetic: '',
      pos: 'custom note',
      definition: customDef.trim(),
      createdAt: new Date().toLocaleString(),
    };
    persistNotes([note, ...notes]);
    setCustomWord(''); setCustomDef('');
    Alert.alert('Saved!', `"${customWord.trim()}" added to My Saved Notes.`);
  };

  // UPDATE: start editing
  const startEdit = (note: SavedNote) => {
    setEditingId(note.id);
    setEditText(note.definition);
  };

  // UPDATE: commit edit
  const commitEdit = async () => {
    if (!editText.trim()) return Alert.alert('Definition cannot be empty.');
    const updated = notes.map(n =>
      n.id === editingId ? { ...n, definition: editText.trim() } : n
    );
    await persistNotes(updated);
    setEditingId(null);
    setEditText('');
  };

  // DELETE: remove a note
  const deleteNote = (id: string) => {
    Alert.alert('Delete note', 'Remove this saved note?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => persistNotes(notes.filter(n => n.id !== id)) },
    ]);
  };

  /* ── Premium gate ────────────────────────────────── */
  if (!user?.premium) {
    return (
      <DetailScreen>
        <View style={[s.card, { alignItems: 'center', paddingVertical: 30 }]}>
          <Text style={{ fontSize: 40 }}>🔒</Text>
          <Text style={[s.h2, { marginTop: 8 }]}>Premium feature</Text>
          <Text style={[s.muted, { textAlign: 'center', marginBottom: 14 }]}>
            Unlock the Study Assistant with BoardBuddy Premium.
          </Text>
          <Btn title="See Premium" onPress={() => navigation.navigate('Premium')}
            style={{ alignSelf: 'stretch' }} />
        </View>
      </DetailScreen>
    );
  }

  /* ── Main UI ─────────────────────────────────────── */
  const firstMeaning = result?.meanings[0];

  return (
    <SafeAreaView style={s.screen} edges={['bottom']}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>

        {/* ── SECTION A: Dictionary Lookup ─────────────── */}
        <Text style={s.h1}>📖 Dictionary Lookup</Text>
        <Text style={[s.muted, { marginBottom: 12 }]}>
          Look up English & Education terms using the Free Dictionary API.
        </Text>

        <View style={{ flexDirection: 'row', marginBottom: 12 }}>
          <TextInput
            style={[s.input, { flex: 1, marginBottom: 0, backgroundColor: '#fff', color: NAVY }]}
            placeholder="Type a word (e.g. pedagogy)"
            placeholderTextColor="#8898AA"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => lookupWord()}
            autoCapitalize="none"
          />
          <TouchableOpacity onPress={() => lookupWord()}
            style={[s.send, { marginLeft: 8, borderRadius: 12, width: 56, height: 56 }]}>
            <Text style={{ color: '#fff', fontSize: 22 }}>🔍</Text>
          </TouchableOpacity>
        </View>

        {/* Loading spinner */}
        {loading && (
          <View style={{ alignItems: 'center', marginVertical: 20 }}>
            <ActivityIndicator size="large" color={NAVY} />
            <Text style={[s.muted, { marginTop: 8 }]}>Looking up "{lastQuery}"…</Text>
          </View>
        )}

        {/* Error state with Retry */}
        {!loading && !!apiError && (
          <View style={[s.card, { borderLeftWidth: 5, borderLeftColor: '#E57373' }]}>
            <Text style={{ color: '#C62828', fontWeight: '700', marginBottom: 8 }}>⚠️ {apiError}</Text>
            <Btn title="🔄 Retry" variant="outline"
              onPress={() => lookupWord(lastQuery)} />
          </View>
        )}

        {/* Result card */}
        {!loading && result && (
          <View style={[s.card, { borderLeftWidth: 5, borderLeftColor: NAVY }]}>
            <Text style={{ fontSize: 24, fontWeight: '800', color: NAVY }}>{result.word}</Text>

            {!!result.phonetic && (
              <Text style={{ color: GRAY, fontStyle: 'italic', marginBottom: 8 }}>{result.phonetic}</Text>
            )}

            {(result.meanings || []).slice(0, 2).map((m: any, mi: number) => (
              <View key={mi} style={{ marginBottom: 10 }}>
                <Text style={{ fontWeight: '700', color: GREEN, marginBottom: 4 }}>
                  {m.partOfSpeech}
                </Text>
                {(m.definitions || []).slice(0, 3).map((d: any, di: number) => (
                  <Text key={di} style={{ color: NAVY, fontSize: 14, marginBottom: 4 }}>
                    {di + 1}. {d.definition}
                  </Text>
                ))}
              </View>
            ))}

            <Btn title="💾 Save to My Notes" onPress={saveFromResult} style={{ marginTop: 4 }} />
          </View>
        )}

        {/* ── SECTION B: Add Custom Note ──────────────── */}
        <Text style={[s.h2, { marginTop: 8 }]}>✏️ Add Custom Note</Text>
        <View style={s.card}>
          <TextInput style={[s.input, { backgroundColor: BG, color: NAVY }]}
            placeholder="Word or term" placeholderTextColor="#8898AA"
            value={customWord} onChangeText={setCustomWord} />
          <TextInput style={[s.input, { backgroundColor: BG, color: NAVY, minHeight: 70, textAlignVertical: 'top' }]}
            placeholder="Your definition or note" placeholderTextColor="#8898AA"
            multiline value={customDef} onChangeText={setCustomDef} />
          <Btn title="➕ Add Note" onPress={saveCustomNote} />
        </View>

        {/* ── SECTION C: My Saved Notes ───────────────── */}
        <Text style={[s.h2, { marginTop: 8 }]}>📒 My Saved Notes ({notes.length})</Text>
        {notes.length === 0 && (
          <Text style={s.muted}>No saved notes yet. Look up a word or add a custom note above.</Text>
        )}

        {notes.map(note => (
          <View key={note.id} style={[s.card, { borderLeftWidth: 4, borderLeftColor: GREEN }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '800', color: NAVY, fontSize: 16 }}>{note.word}</Text>
                {!!note.phonetic && (
                  <Text style={{ color: GRAY, fontSize: 12, fontStyle: 'italic' }}>{note.phonetic}</Text>
                )}
                <Text style={{ color: GREEN, fontSize: 12, fontWeight: '700' }}>{note.pos}</Text>
              </View>
              <Text style={{ color: GRAY, fontSize: 11 }}>{note.createdAt}</Text>
            </View>

            {editingId === note.id ? (
              /* UPDATE: inline editor */
              <View style={{ marginTop: 8 }}>
                <TextInput
                  style={[s.input, { backgroundColor: BG, color: NAVY, minHeight: 60, textAlignVertical: 'top', marginBottom: 8 }]}
                  value={editText}
                  onChangeText={setEditText}
                  multiline
                  autoFocus
                />
                <View style={{ flexDirection: 'row' }}>
                  <Btn title="💾 Save" style={{ flex: 1, marginRight: 6 }} onPress={commitEdit} />
                  <Btn title="Cancel" variant="outline" style={{ flex: 1 }}
                    onPress={() => { setEditingId(null); setEditText(''); }} />
                </View>
              </View>
            ) : (
              /* READ: show definition + action buttons */
              <>
                <Text style={{ color: '#3D5068', fontSize: 14, marginTop: 6 }}>{note.definition}</Text>
                <View style={{ flexDirection: 'row', marginTop: 10 }}>
                  <TouchableOpacity onPress={() => startEdit(note)}
                    style={[s.iconBtn, { backgroundColor: '#DCE8F5' }]}>
                    <Text style={{ color: NAVY, fontWeight: '700', fontSize: 13 }}>✏️ Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteNote(note.id)}
                    style={[s.iconBtn, { backgroundColor: '#FDEAEA', marginLeft: 8 }]}>
                    <Text style={{ color: '#C62828', fontWeight: '700', fontSize: 13 }}>🗑️ Delete</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        ))}

      </ScrollView>
    </SafeAreaView>
  );
}

/* =====================================================
   14. PREMIUM AND PAYMENT SCREENS
===================================================== */

const PLAN = { name: 'Monthly Premium', price: 149 };
const METHODS = ['GCash', 'Maya', 'Credit / Debit card', 'Bank transfer (InstaPay)'];

function PremiumScreen({ navigation }: any) {
  const perks = [
    'Full review materials',
    'Unlimited flashcards',
    'AI Study Assistant',
    'Personalized practice questions',
    'Mock board exams',
    'Detailed progress analytics',
  ];
  return (
    <DetailScreen>
      <Text style={s.muted}>Step 1 of 3 · Choose a plan</Text>
      <View style={[s.card, { backgroundColor: NAVY, marginTop: 12 }]}>
        {perks.map(p => (
          <Text key={p} style={{ color: '#fff', fontWeight: '700', marginBottom: 8 }}>✓ {p}</Text>
        ))}
      </View>
      <View style={[s.card, { borderWidth: 2.5, borderColor: GREEN }]}>
        <Text style={s.cardTitle}>{PLAN.name} · ₱{PLAN.price}</Text>
        <Text style={s.muted}>₱{PLAN.price} per month · pay again to extend</Text>
      </View>
      <Btn title="Continue" onPress={() => navigation.navigate('Payment', { plan: PLAN })} />
    </DetailScreen>
  );
}

function PaymentScreen({ route, navigation }: any) {
  const { plan } = route.params;
  const [method, setMethod] = useState<string | null>(null);
  return (
    <DetailScreen>
      <Text style={s.muted}>Step 2 of 3 · Choose how to pay</Text>
      <Text style={[s.cardTitle, { marginVertical: 10 }]}>{plan.name} · ₱{plan.price}</Text>
      {METHODS.map(item => (
        <TouchableOpacity key={item} onPress={() => setMethod(item)}
          style={[s.option, method === item && { borderColor: GREEN, borderWidth: 2.5 }]}>
          <Text style={{ fontWeight: '700', color: NAVY, fontSize: 17 }}>{item}</Text>
        </TouchableOpacity>
      ))}
      <Btn title="Continue" style={{ marginTop: 10 }}
        onPress={() => method ? navigation.navigate('ReviewPay', { plan, method }) : Alert.alert('Choose a payment method')} />
      <Btn title="Back" variant="outline" style={{ marginTop: 10 }} onPress={() => navigation.goBack()} />
    </DetailScreen>
  );
}

function ReviewPayScreen({ route, navigation }: any) {
  const { plan, method } = route.params;
  const { user, setUser, setAccounts } = useApp();
  const [mobile, setMobile] = useState('');
  const needsMobile = method === 'GCash' || method === 'Maya';
  const [ref] = useState('BB-' + Math.floor(10000000 + Math.random() * 89999999));

  const pay = () => {
    const cleanMobile = mobile.replace(/\D/g, '');
    if (needsMobile && cleanMobile.length !== 11)
      return Alert.alert('Invalid mobile number', 'Please enter your 11-digit mobile number.');

    const until = new Date();
    until.setMonth(until.getMonth() + 1);
    const updatedUser = { ...user, premium: true };
    setUser(updatedUser);
    setAccounts((prev: any) => prev.map((a: any) =>
      a.email.toLowerCase() === user.email.toLowerCase() ? { ...a, premium: true } : a));

    navigation.reset({
      index: 1,
      routes: [
        { name: 'Home' },
        { name: 'Success', params: { plan, method, ref, until: until.toLocaleDateString(), date: new Date().toLocaleDateString() } },
      ],
    });
  };

  return (
    <DetailScreen>
      <Text style={s.muted}>Step 3 of 3 · Review and pay</Text>
      <View style={[s.card, { backgroundColor: NAVY, marginTop: 12 }]}>
        <Text style={{ color: '#A0C0DD', fontWeight: '700' }}>{plan.name}</Text>
        <Text style={{ color: '#fff', fontSize: 48, fontWeight: '800' }}>₱{plan.price}</Text>
        <Text style={{ color: '#fff', fontWeight: '700' }}>Paying with {method}</Text>
      </View>

      {needsMobile && (
        <View style={s.card}>
          <Text style={s.cardTitle}>{method} mobile number</Text>
          <TextInput style={[s.input, { backgroundColor: BG, color: NAVY, marginTop: 8 }]}
            placeholder="09XXXXXXXXX" placeholderTextColor="#8898AA"
            keyboardType="phone-pad" maxLength={11} value={mobile} onChangeText={setMobile} />
        </View>
      )}

      {method === 'Bank transfer (InstaPay)' && (
        <View style={s.card}>
          <Text style={s.cardTitle}>Send via InstaPay</Text>
          <Text style={s.muted}>Send ₱{plan.price} to BoardBuddy (sample account 0000-0000-00) and put this reference in the notes:</Text>
          <Text style={[s.h2, { marginTop: 8 }]}>{ref}</Text>
        </View>
      )}

      <Btn title={method === 'Bank transfer (InstaPay)' ? "I've paid (demo)" : `Pay ₱${plan.price}`} onPress={pay} />
      <Text style={[s.muted, { textAlign: 'center', marginTop: 10 }]}>
        Demo only: no real payment is made and card details are never saved.
      </Text>
      <Btn title="Back" variant="outline" style={{ marginTop: 10 }} onPress={() => navigation.goBack()} />
    </DetailScreen>
  );
}

function SuccessScreen({ route, navigation }: any) {
  const { plan, method, ref, until, date } = route.params;
  const rows = [
    ['Reference', ref], ['Item', plan.name], ['Method', method],
    ['Amount', `₱${plan.price}`], ['Date', date],
  ];
  return (
    <DetailScreen>
      <View style={[s.card, { alignItems: 'center' }]}>
        <View style={[s.avatar, { backgroundColor: GREEN }]}>
          <Text style={{ color: '#fff', fontSize: 32 }}>✓</Text>
        </View>
        <Text style={[s.h2, { marginTop: 10 }]}>You're Premium!</Text>
        <Text style={{ color: '#607289', fontWeight: '700' }}>Active until {until}</Text>
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle}>Receipt</Text>
        {rows.map(([lbl, val]) => (
          <View key={lbl} style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
            <Text style={s.muted}>{lbl}</Text>
            <Text style={{ fontWeight: '700', color: NAVY }}>{val}</Text>
          </View>
        ))}
      </View>

      <Btn title="Start reviewing" onPress={() => navigation.navigate('Home')} />
    </DetailScreen>
  );
}

/* =====================================================
   15. STACK NAVIGATION
===================================================== */

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <AppProvider>
      <NavigationContainer>
        <Stack.Navigator
          id={undefined}
          initialRouteName="Login"
          screenOptions={{
            headerStyle: { backgroundColor: BG },
            headerTintColor: NAVY,
            headerShadowVisible: false,
            headerTitleStyle: { fontWeight: '700' },
            headerBackTitle: 'Back',
          }}
        >
          {/* Auth */}
          <Stack.Screen name="Login"    component={LoginScreen}  options={{ headerShown: false }} />
          <Stack.Screen name="SignUp"   component={SignUpScreen} options={{ headerShown: false }} />

          {/* Main tabs */}
          <Stack.Screen name="Home"       component={HomeScreen}      options={{ headerShown: false }} />
          <Stack.Screen name="Summaries"  component={SummariesScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Flashcards" component={FlashcardsScreen}options={{ headerShown: false }} />
          <Stack.Screen name="Practice"   component={PracticeScreen}  options={{ headerShown: false }} />
          <Stack.Screen name="Progress"   component={ProgressScreen}  options={{ headerShown: false }} />
          <Stack.Screen name="Profile"    component={ProfileScreen}   options={{ headerShown: false }} />

          {/* Detail */}
          <Stack.Screen name="SummaryDetail"  component={SummaryDetailScreen} options={{ title: 'Summary' }} />
          <Stack.Screen name="Quiz"           component={QuizScreen}          options={{ title: 'Practice Quiz' }} />
          <Stack.Screen name="Results"        component={ResultsScreen}       options={{ title: 'Results', headerBackVisible: false }} />
          <Stack.Screen name="StudyAssistant" component={StudyAssistantScreen}options={{ title: 'Study Assistant' }} />

          {/* Payment */}
          <Stack.Screen name="Premium"   component={PremiumScreen}   options={{ title: 'BoardBuddy Premium' }} />
          <Stack.Screen name="Payment"   component={PaymentScreen}   options={{ title: 'Choose Payment' }} />
          <Stack.Screen name="ReviewPay" component={ReviewPayScreen} options={{ title: 'Review and Pay' }} />
          <Stack.Screen name="Success"   component={SuccessScreen}   options={{ title: 'Payment Received', headerBackVisible: false }} />
        </Stack.Navigator>
      </NavigationContainer>
    </AppProvider>
  );
}

/* =====================================================
   16. APPLICATION STYLES
===================================================== */

const s = StyleSheet.create({
  screen:    { flex: 1, backgroundColor: BG },
  h1:        { fontSize: 30, fontWeight: '800', color: NAVY },
  h2:        { fontSize: 22, fontWeight: '800', color: NAVY, marginTop: 8, marginBottom: 10 },
  sub:       { color: '#607289', fontSize: 14, marginTop: 2 },
  muted:     { color: GRAY, fontSize: 13, marginTop: 4 },
  brand:     { fontSize: 34, fontWeight: '800', color: '#fff', marginTop: 10 },
  tagline:   { color: '#fff', fontWeight: '700', marginTop: 4 },
  hint:      { color: '#A0B2C6', fontSize: 12, textAlign: 'center', marginTop: 8 },

  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
    alignSelf: 'stretch',
    color: NAVY,
  },

  btn: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 17 },

  card:      { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12 },
  cardTitle: { fontSize: 17, fontWeight: '800', color: NAVY },

  row: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 6,
  },

  stat:    { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 12, alignItems: 'center' },
  statNum: { fontSize: 26, fontWeight: '800', color: NAVY },
  statLbl: { fontSize: 11, fontWeight: '700', color: GRAY },

  barBg:  { height: 10, borderRadius: 5, backgroundColor: '#E0E8F0', marginVertical: 10, overflow: 'hidden' },
  barFill:{ height: 10, backgroundColor: GREEN, borderRadius: 5 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  tool: { width: '48%', backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 12, alignItems: 'center' },
  toolLbl: { fontWeight: '800', color: NAVY, marginTop: 6 },

  chip: { backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, marginRight: 8 },
  tag:  { backgroundColor: '#E8C76B', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },

  roleChip: {
    backgroundColor: '#1F4270',
    borderWidth: 1.5,
    borderColor: '#2C4D7D',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginRight: 8,
    marginBottom: 8,
  },

  flash: {
    borderRadius: 20,
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    marginVertical: 14,
    borderWidth: 4,
    borderColor: BORDER,
  },
  flashText: { color: '#fff', fontSize: 24, fontWeight: '800', textAlign: 'center' },

  option: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1.8,
    borderColor: BORDER,
  },

  avatar: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: NAVY,
    borderWidth: 4, borderColor: GREEN,
    alignItems: 'center', justifyContent: 'center',
  },

  bubble: { maxWidth: '85%', padding: 12, borderRadius: 14, marginBottom: 10 },

  send: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: GREEN,
    alignItems: 'center', justifyContent: 'center',
    marginLeft: 8,
  },

  iconBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },

  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingVertical: 8,
  },
  navItem:  { flex: 1, alignItems: 'center' },
  navLabel: { fontSize: 11, fontWeight: '700', color: GRAY, marginTop: 2 },
});
