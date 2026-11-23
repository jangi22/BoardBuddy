import { T, SUB } from '../data/boardContent.js';
import { DeckTopic } from '../types.js';
import { formatTopicTitle, inferSubjectKey } from './customTopicGenerator.js';

export interface LocalCoachParams {
  question: string;
  studentName?: string;
  currentSubject?: string;
  currentTopic?: string;
}

interface CuratedCoachEntry {
  keywords: RegExp;
  reply: (name: string, normalizedQuestion: string, rawQuestion: string) => string;
}

function formatQuestionBlock(
  stem: string,
  options: string[],
  correctIdx: number,
  rationale: string,
  closingTip?: string
): string {
  const letters = ['A', 'B', 'C', 'D'];
  const formattedOpts = options
    .slice(0, 4)
    .map((opt, idx) => `${letters[idx]}. ${opt}`)
    .join('\n');
  const ansLetter = letters[correctIdx] || 'A';
  const ansText = options[correctIdx] || options[0] || '';
  const outro =
    closingTip ||
    `You're making awesome progress—drop your next question whenever you're ready!`;
  return (
    `**Sample Practice Question:**\n` +
    `${stem}\n` +
    `${formattedOpts}\n\n` +
    `**Correct Answer:** ${ansLetter}. ${ansText}\n` +
    `**Rationalization:** ${rationale}\n\n` +
    `${outro}`
  );
}

// Common spelling corrections + fuzzy vocabulary for LET / GenEd / ProfEd / Major queries
const FUZZY_CORRECTION_VOCAB: string[] = [
  'computer', 'computers', 'computing', 'babbage', 'lovelace', 'turing',
  'philosophy', 'philosopher', 'psychology', 'sociology', 'anthropology',
  'photosynthesis', 'respiration', 'mitosis', 'meiosis', 'genetics', 'evolution',
  'chemistry', 'stoichiometry', 'thermodynamics', 'electricity', 'magnetism',
  'quadratic', 'geometry', 'trigonometry', 'calculus', 'probability', 'statistics',
  'piaget', 'vygotsky', 'kohlberg', 'erikson', 'skinner', 'pavlov', 'thorndike',
  'bandura', 'bruner', 'ausubel', 'gardner', 'gagne', 'maslow', 'freud',
  'descartes', 'cartesian', 'rousseau', 'dewey', 'freire', 'montessori', 'froebel',
  'pestalozzi', 'herbart', 'socrates', 'plato', 'aristotle', 'confucius', 'aquinas',
  'linnaeus', 'mendel', 'darwin', 'pasteur', 'curie', 'newton', 'einstein',
  'galileo', 'kepler', 'euclid', 'pythagoras', 'archimedes', 'pascal', 'lavoisier',
  'mendeleev', 'wundt', 'watson', 'comte', 'herodotus', 'hippocrates', 'comenius',
  'rizal', 'bonifacio', 'mabini', 'balagtas', 'quezon', 'aguinaldo', 'marcos',
  'scaffolding', 'constructivism', 'behaviorism', 'cognitivism', 'pragmatism',
  'naturalism', 'idealism', 'realism', 'existentialism', 'essentialism', 'perennialism',
  'progressivism', 'reconstructionism', 'taxonomy', 'assessment', 'formative',
  'summative', 'diagnostic', 'curriculum', 'matatag', 'microeconomics', 'macroeconomics',
  'constitution', 'sovereignty', 'grammar', 'syntax', 'semantics', 'pragmatics',
  'phonology', 'morphology', 'literature', 'linguistics', 'multiplication',
];

const DIRECT_TYPO_MAP: Record<string, string> = {
  cumputer: 'computer',
  computor: 'computer',
  komputer: 'computer',
  compiter: 'computer',
  comuter: 'computer',
  fathr: 'father',
  fathe: 'father',
  mothr: 'mother',
  sino: 'who',
  anu: 'what',
  wat: 'what',
  wht: 'what',
  hw: 'how',
  wy: 'why',
  xplain: 'explain',
  expln: 'explain',
  defne: 'define',
  filipno: 'filipino',
  pilipino: 'filipino',
  sycology: 'psychology',
  psyc: 'psychology',
  pilosopy: 'philosophy',
  philosopy: 'philosophy',
  photosintesis: 'photosynthesis',
  fotosintesis: 'photosynthesis',
  mitosys: 'mitosis',
  meiosys: 'meiosis',
  descart: 'descartes',
  decartes: 'descartes',
  piage: 'piaget',
  piajet: 'piaget',
  vigotsky: 'vygotsky',
  vygotski: 'vygotsky',
  skiner: 'skinner',
  babage: 'babbage',
  babege: 'babbage',
  risal: 'rizal',
  bonifasio: 'bonifacio',
  aristotel: 'aristotle',
  kohlburg: 'kohlberg',
  ericson: 'erikson',
  erixon: 'erikson',
};

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (Math.abs(m - n) > 2) return 99;
  const dp: number[] = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = i - 1;
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = dp[j];
      if (a[i - 1] === b[j - 1]) {
        dp[j] = prev;
      } else {
        dp[j] = 1 + Math.min(prev, dp[j], dp[j - 1]);
      }
      prev = temp;
    }
  }
  return dp[n];
}

function normalizeQueryTypos(raw: string): string {
  return raw.replace(/[a-zA-Z]+/g, (token) => {
    const lower = token.toLowerCase();
    if (DIRECT_TYPO_MAP[lower]) {
      return DIRECT_TYPO_MAP[lower];
    }
    if (lower.length < 5) return token;
    if (FUZZY_CORRECTION_VOCAB.includes(lower)) return token;

    let bestMatch = token;
    let bestDist = 99;
    const maxAllowed = lower.length >= 7 ? 2 : 1;

    for (const candidate of FUZZY_CORRECTION_VOCAB) {
      if (candidate[0] !== lower[0]) continue;
      const dist = levenshtein(lower, candidate);
      if (dist <= maxAllowed && dist < bestDist) {
        bestDist = dist;
        bestMatch = candidate;
      }
    }
    return bestMatch;
  });
}

const ENTITY_AND_CONCEPT_ENTRIES: CuratedCoachEntry[] = [
  {
    keywords: /\b(father of (the )?(modern )?computer|charles babbage|ada lovelace|alan turing|analytical engine|difference engine)\b/i,
    reply: (name) =>
      `I've got you, ${name}! When someone asks about the **Father of the Computer**, that's **Charles Babbage**—let's lock in the whole computing pioneer trio for GenEd ICT & TLE:\n\n` +
      `**Core LET Concepts — Charles Babbage (1791–1871):**\n` +
      `• **Who He Is:** English mathematician, inventor, and mechanical engineer honored worldwide as the **"Father of the Computer"** for designing the first programmable mechanical computing machines.\n` +
      `• **Two Breakthrough Machines:**\n` +
      `  1. **Difference Engine** — designed to compute mathematical tables automatically without human error.\n` +
      `  2. **Analytical Engine** — featured memory (*store*), processor (*mill*), and punched-card input/output—the blueprint of modern computers!\n` +
      `• **Key Partners & Peers:** **Ada Lovelace** wrote the first algorithm for Babbage's Analytical Engine (making her the **First Computer Programmer**), while **Alan Turing** is the **Father of Theoretical Computer Science & Artificial Intelligence**.\n\n` +
      `**High-Yield Board Notes:**\n` +
      `• **Easy Mnemonic — "B-L-T":** **B**abbage = **B**uilt hardware concept | **L**ovelace = **L**ogic / First Programmer | **T**uring = **T**heory & AI (Turing Test).\n` +
      `• **GenEd ICT Tip:** Don't confuse **Charles Babbage** (Father of Computer) with **Tim Berners-Lee** (Inventor of the World Wide Web) or **John von Neumann** (Stored-Program Architecture).\n\n` +
      formatQuestionBlock(
        `Who is widely recognized as the "Father of the Computer" for conceptualizing the Difference Engine and the programmable Analytical Engine?`,
        [
          'Alan Turing',
          'Charles Babbage',
          'Tim Berners-Lee',
          'Blaise Pascal',
        ],
        1,
        `Go with **B**! **Charles Babbage** designed both the Difference Engine and the Analytical Engine, earning the title "Father of the Computer." Turing (A) pioneered theoretical computer science/AI, Berners-Lee (C) invented the World Wide Web, and Pascal (D) built an early mechanical adding calculator (Pascaline).`,
        `Great catch asking about computing history, ${name}—that's a classic GenEd ICT point in your bag!`
      ),
  },
  {
    keywords: /\b(father|mother|founder)\s+of\s+(modern\s+)?(history|medicine|biology|botany|genetics|evolution|microbiology|chemistry|physics|geometry|algebra|calculus|psychology|sociology|economics|kindergarten|education|katipunan|tagalog|national language|grammar|painting)\b/i,
    reply: (name, normQ) => {
      const q = normQ.toLowerCase();
      let title = 'Great Thinkers & Founders';
      let person = '';
      let summary = '';
      let mnemonic = '';
      let qStem = '';
      let opts: string[] = [];
      let ansIdx = 0;
      let rationale = '';

      if (/psychology/.test(q)) {
        title = 'Father of Psychology';
        person = 'Wilhelm Wundt (1832–1920)';
        summary =
          `• **Wilhelm Wundt** founded the first experimental psychology lab in Leipzig, Germany (1879), making him the **Father of Modern/Experimental Psychology**.\n` +
          `• Related LET favorites: **Sigmund Freud** = Father of **Psychoanalysis** (*Id, Ego, Superego*) | **Edward Thorndike** = Father of **Educational Psychology** | **John B. Watson** = Father of **Behaviorism**.`;
        mnemonic = `**Wundt** = First Lab (Experimental) | **Freud** = Psychoanalysis | **Thorndike** = Educational Psych.`;
        qStem = `Who established the world's first psychology laboratory in 1879 and is regarded as the "Father of Modern Psychology"?`;
        opts = ['Wilhelm Wundt', 'Sigmund Freud', 'B.F. Skinner', 'Carl Rogers'];
        ansIdx = 0;
        rationale = `**A** is right! **Wilhelm Wundt** separated psychology from philosophy by opening the first experimental lab in 1879.`;
      } else if (/biology|zoology/.test(q)) {
        title = 'Father of Biology';
        person = 'Aristotle (384–322 BCE)';
        summary =
          `• Ancient Greek philosopher **Aristotle** systematically classified hundreds of animals and observed living organisms, earning the title **Father of Biology** (and **Zoology** / **Formal Logic**).\n` +
          `• Don't mix him up with **Theophrastus** (Father of **Botany**) or **Carl Linnaeus** (Father of **Taxonomy**).`;
        mnemonic = `**A**ristotle = **A**nimals & Biology | **T**heophrastus = **T**rees/Plants (Botany) | **L**innaeus = **L**atin two-word Taxonomy.`;
        qStem = `Which ancient thinker is recognized as the "Father of Biology" and "Father of Zoology" for his systematic classification of organisms?`;
        opts = ['Theophrastus', 'Aristotle', 'Charles Darwin', 'Robert Hooke'];
        ansIdx = 1;
        rationale = `**B** is correct! **Aristotle** wrote foundational biological treatises classifying organisms, while his student Theophrastus (A) became the Father of Botany.`;
      } else if (/history/.test(q)) {
        title = 'Father of History';
        person = 'Herodotus (c. 484–425 BCE)';
        summary =
          `• **Herodotus**, a Greek historian who wrote *The Histories* (recording the Greco-Persian Wars), is the **Father of History**.\n` +
          `• Contrast him with **Thucydides**, often called the **Father of Scientific History** for evidence-based reporting without myth.`;
        mnemonic = `**Hero**dotus = Recorded **Heroic** wars (Father of History)!`;
        qStem = `Who is recognized in World History as the "Father of History" for authoring "The Histories"?`;
        opts = ['Herodotus', 'Homer', 'Socrates', 'Plutarch'];
        ansIdx = 0;
        rationale = `**A** is right! **Herodotus** systematically investigated and documented past events in *The Histories*.`;
      } else if (/medicine/.test(q)) {
        title = 'Father of Medicine';
        person = 'Hippocrates (c. 460–370 BCE)';
        summary =
          `• **Hippocrates** of Kos separated medicine from superstition, teaching that diseases have natural causes—giving us the **Hippocratic Oath** for physicians.`;
        mnemonic = `**Hippocrates** = **H**ealing & **H**ippocratic Oath!`;
        qStem = `Who is honored as the "Father of Medicine" for viewing illness as a natural process rather than supernatural punishment?`;
        opts = ['Galen', 'Hippocrates', 'Louis Pasteur', 'Andreas Vesalius'];
        ansIdx = 1;
        rationale = `**B** is correct! **Hippocrates** founded clinical observation and medical ethics (Hippocratic Oath).`;
      } else if (/economics/.test(q)) {
        title = 'Father of Economics';
        person = 'Adam Smith (1723–1790)';
        summary =
          `• Scottish philosopher **Adam Smith** wrote ***The Wealth of Nations*** (1776), introducing the **"Invisible Hand"** and **Laissez-Faire** free-market capitalism.\n` +
          `• In Macroeconomics, **John Maynard Keynes** is the **Father of Modern Macroeconomics** (advocating government spending during recessions).`;
        mnemonic = `**Adam Smith** = Wealth of Nations & Invisible Hand | **Keynes** = Macro & Gov't Spending.`;
        qStem = `Who authored "The Wealth of Nations" (1776) and is hailed as the "Father of Modern Economics"?`;
        opts = ['Karl Marx', 'John Maynard Keynes', 'Adam Smith', 'David Ricardo'];
        ansIdx = 2;
        rationale = `**C** is spot on! **Adam Smith** laid the foundation of classical economics and free markets.`;
      } else if (/sociology/.test(q)) {
        title = 'Father of Sociology';
        person = 'Auguste Comte (1798–1857)';
        summary =
          `• French philosopher **Auguste Comte** coined the term **"Sociology"** and advocated **Positivism** (studying society scientifically using observable facts).`;
        mnemonic = `**Comte** **C**oined Sociology & Positivism!`;
        qStem = `Who coined the term "sociology" and championed positivism in studying human society?`;
        opts = ['Emile Durkheim', 'Max Weber', 'Auguste Comte', 'Karl Marx'];
        ansIdx = 2;
        rationale = `**C** is correct! **Auguste Comte** coined *sociology* and proposed studying society via scientific positivism.`;
      } else if (/algebra/.test(q)) {
        title = 'Father of Algebra';
        person = 'Muhammad ibn Musa al-Khwarizmi';
        summary =
          `• Persian polymath **Al-Khwarizmi** wrote *Al-Jabr*, giving Algebra its name (and his Latinized name gave us the word **"Algorithm"**!).`;
        mnemonic = `**Al-Khwarizmi** -> **Al-Jabr (Algebra)** & **Algorithm**!`;
        qStem = `Whose mathematical treatise "Al-Jabr" gave Algebra its name and led to the term "algorithm"?`;
        opts = ['Euclid', 'Al-Khwarizmi', 'René Descartes', 'Blaise Pascal'];
        ansIdx = 1;
        rationale = `**B** is right! **Al-Khwarizmi** systematized solving linear and quadratic equations.`;
      } else if (/education|didactics|kindergarten/.test(q)) {
        title = 'Fathers of Modern Education & Kindergarten';
        person = 'John Amos Comenius & Friedrich Froebel';
        summary =
          `• **John Amos Comenius:** **"Father of Modern Education"**—authored *Orbis Pictus* (first illustrated children's textbook) and championed universal schooling.\n` +
          `• **Friedrich Froebel:** **"Father of Kindergarten"**—centered early childhood education on purposeful play.`;
        mnemonic = `**Comenius** = First picture book & Modern Ed | **Froebel** = Kindergarten!`;
        qStem = `Who is honored as the "Father of Modern Education" for advocating universal education and creating the first illustrated textbook ("Orbis Pictus")?`;
        opts = ['Friedrich Froebel', 'John Amos Comenius', 'Johann Herbart', 'John Locke'];
        ansIdx = 1;
        rationale = `**B** is right! **Comenius** pioneered universal, graded, illustrated instruction.`;
      } else if (/katipunan/.test(q)) {
        title = 'Founders & Parents of the Katipunan';
        person = 'Andrés Bonifacio & Melchora Aquino';
        summary =
          `• **Andrés Bonifacio** is the **Father of the Philippine Revolution** and *"Supremo"* of the **KKK (Katipunan)**.\n` +
          `• **Melchora Aquino ("Tandang Sora")** is honored as the **Mother of the Katipunan** for nursing and feeding wounded Katipuneros.`;
        mnemonic = `**Bonifacio** = Supremo/Father of Revolution | **Tandang Sora** = Mother of Katipunan!`;
        qStem = `Who is revered in Philippine History as the "Mother of the Katipunan" ("Grand Woman of the Revolution")?`;
        opts = ['Gabriela Silang', 'Melchora Aquino', 'Marcela Agoncillo', 'Gregoria de Jesus'];
        ansIdx = 1;
        rationale = `**B** is right! **Melchora Aquino (Tandang Sora)** sheltered and cared for Katipunan revolutionaries despite her advanced age.`;
      } else {
        title = 'Key Pioneers & Founders';
        person = 'Landmark GenEd / ProfEd Pioneers';
        summary =
          `• **Chemistry:** Antoine Lavoisier | **Genetics:** Gregor Mendel | **Taxonomy:** Carl Linnaeus | **Microbiology:** Antonie van Leeuwenhoek / Louis Pasteur.\n` +
          `• **Geometry:** Euclid | **Calculus:** Isaac Newton & Leibniz | **Modern Philosophy:** René Descartes.\n` +
          `• **Tagalog Grammar:** Lope K. Santos | **National Language:** Manuel L. Quezon | **Philippine Painting:** Damian Domingo.`;
        mnemonic = `Match the discipline directly to its pioneer: **Euclid** (Geometry), **Mendel** (Genetics), **Linnaeus** (Taxonomy), **Babbage** (Computer).`;
        qStem = `Who is recognized as the "Father of Modern Chemistry" for establishing the Law of Conservation of Mass?`;
        opts = ['Antoine Lavoisier', 'Dmitri Mendeleev', 'John Dalton', 'Robert Boyle'];
        ansIdx = 0;
        rationale = `**A** is correct! **Antoine Lavoisier** formulated the Law of Conservation of Mass and modern chemical nomenclature.`;
      }

      return (
        `Ooh, classic LET question, ${name}! When you're asked about the **${title}**, the name to lock in is **${person}**:\n\n` +
        `**Core LET Concepts — ${person}:**\n${summary}\n\n` +
        `**High-Yield Board Notes:**\n• ${mnemonic}\n\n` +
        formatQuestionBlock(qStem, opts, ansIdx, rationale, `Keep these "Father/Mother of X" facts in your quick-recall list, ${name}—easy points on GenEd!`)
      );
    },
  },
  {
    keywords: /\b(rene|ren[eé]|descartes|cartesian|cogito)\b/i,
    reply: (name) =>
      `Ooh, great question, ${name}! When someone brings up **René** in LET review, that's almost always **René Descartes**—let's lock him into memory together:\n\n` +
      `**Core LET Concepts — René Descartes (1596–1650):**\n` +
      `• Think of **René Descartes** as the French genius who earned two huge titles: **"Father of Modern Philosophy"** and **"Father of Analytic Geometry."**\n` +
      `• His big philosophical breakthrough was **Rationalism**—instead of trusting senses blindly, he doubted everything until he realized, *"Wait—I'm thinking right now, so I definitely exist!"* That gave us his iconic quote: **"Cogito, ergo sum"** (*"I think, therefore I am"*).\n` +
      `• He also introduced **Mind–Body Dualism**, viewing the thinking mind (*res cogitans*) and physical body (*res extensa*) as distinct.\n\n` +
      `**High-Yield Board Notes:**\n` +
      `• **Easy Mnemonic — "R-C-A":** **R**ené = **R**ationalism, **C**ogito ergo sum, **A**nalytic Geometry.\n` +
      `• **Favorite LET Contrast:** **Descartes = Reason/Innate Ideas (Rationalism)** vs. **John Locke = Sensory Experience / Tabula Rasa (Empiricism)**.\n` +
      `• **Math Bonus:** Every time you plot *(x, y)* on a graph, you're using his **Cartesian Coordinate Plane**!\n\n` +
      formatQuestionBlock(
        `Which famous philosophical statement by René Descartes establishes conscious thought and reason as the starting point of certain knowledge?`,
        [
          'Tabula rasa (the mind begins as a blank slate)',
          'Cogito, ergo sum ("I think, therefore I am")',
          'Esse est percipi ("To be is to be perceived")',
          'Education is a social process and life itself',
        ],
        1,
        `Go with **B**! Descartes used methodic doubt to strip away assumptions and concluded that doubting proves a thinking mind exists (*Cogito, ergo sum*). Option A is John Locke, C is George Berkeley, and D is John Dewey.`,
        `Keep that momentum going, ${name}—what thinker or LET concept should we tackle next?`
      ),
  },
  {
    keywords: /\b(freud|sigmund freud|id ego superego|psychoanalytic|psychoanalysis|oedipus|defense mechanism)\b/i,
    reply: (name) =>
      `I've got you, ${name}! **Sigmund Freud** is super fun to remember once you picture an angel, a referee, and a toddler:\n\n` +
      `**Core LET Concepts — Sigmund Freud (Father of Psychoanalysis):**\n` +
      `• **Id (Pleasure Principle):** The impulsive toddler part—wants instant gratification (*"I want it now!"*).\n` +
      `• **Ego (Reality Principle):** The calm referee balancing desires against real-world rules and consequences.\n` +
      `• **Superego (Moral Principle):** Your internal conscience/ideal values (*"Is this right or wrong?"*).\n` +
      `• Also known for **Psychosexual Stages** (*Oral -> Anal -> Phallic -> Latency -> Genital*) and **Defense Mechanisms** (*Repression, Projection, Rationalization, Displacement, Sublimation*).\n\n` +
      `**High-Yield Board Notes:**\n` +
      `• **Quick Picture:** **Id** = Impulsive | **Ego** = Executive Referee | **Superego** = Saintly Conscience.\n` +
      `• **Healthy Defense Hack:** **Sublimation** channels negative impulses into productive outlets (like boxing or painting!).\n\n` +
      formatQuestionBlock(
        `A student feels furious after failing a quiz, so instead of picking a fight, he channels his energy into winning his school's afternoon basketball practice. Which Freudian defense mechanism is shown?`,
        [
          'Projection',
          'Sublimation',
          'Regression',
          'Denial',
        ],
        1,
        `**B** is right! **Sublimation** redirects unacceptable impulses into socially positive, constructive activities like sports or art.`,
        `Easy recall with that referee image, right ${name}?`
      ),
  },
  {
    keywords: /\b(john locke|locke|tabula rasa|blank slate)\b/i,
    reply: (name) =>
      `I've got you, ${name}! **John Locke** is super straightforward once you picture a clean whiteboard:\n\n` +
      `**Core LET Concepts — John Locke (1632–1704):**\n` +
      `• Locke was an English Enlightenment philosopher and the champion of **Empiricism** (often called the **"Father of Liberalism"**).\n` +
      `• His signature idea is ***Tabula Rasa***—the mind starts out like a **"blank slate"** at birth, and **sensory experience + reflection** write our knowledge onto it.\n` +
      `• In Social Studies, he's also famous for natural rights (**Life, Liberty, and Property**) and government by **consent of the governed**.\n\n` +
      `**High-Yield Board Notes:**\n` +
      `• **Quick Picture Hack:** **L**ocke = **L**earner's mind is a blank chalkboard filled by **sensory lessons**.\n` +
      `• **Teaching Takeaway:** Since knowledge enters through the senses, Locke strongly supports hands-on experiments, realia, and visual demonstrations in class!\n\n` +
      formatQuestionBlock(
        `A Grade 7 Science teacher lets students handle real rock samples instead of just reading definitions, believing knowledge enters through sensory experience. Which philosopher's "tabula rasa" idea aligns with this?`,
        [
          'René Descartes',
          'Plato',
          'John Locke',
          'Immanuel Kant',
        ],
        2,
        `You nailed it with **C**! John Locke's Empiricism and *tabula rasa* mean learners construct knowledge from sensory input and experience—unlike Rationalists/Idealists like Descartes (A) and Plato (B).`,
        `Awesome work staying consistent today, ${name}! Ready for another philosopher or ProfEd drill?`
      ),
  },
  {
    keywords: /\b(rousseau|jean[- ]jacques|emile|social contract)\b/i,
    reply: (name) =>
      `Nice choice, ${name}! Let's chat through **Jean-Jacques Rousseau**—he's the ultimate "let kids grow naturally" thinker:\n\n` +
      `**Core LET Concepts — Jean-Jacques Rousseau (1712–1778):**\n` +
      `• Rousseau pioneered **Naturalism** in education—believing children are naturally good and shouldn't be forced into rigid, adult-style rote memorization too early.\n` +
      `• In his famous book ***Émile, or On Education***, he showed how learning should follow a child's natural curiosity and developmental pace.\n` +
      `• In politics, ***The Social Contract*** introduced the **"general will"** and people's sovereignty.\n\n` +
      `**High-Yield Board Notes:**\n` +
      `• **Recall Rhyme:** *Rousseau says, "Go with Nature's flow!"* (Think ***Émile*** = Naturalism).\n` +
      `• **Exam Clue:** Whenever a scenario highlights protecting a learner's natural curiosity and readiness without harsh pressure, **Rousseau** is your guy!\n\n` +
      formatQuestionBlock(
        `Which landmark work by Jean-Jacques Rousseau promotes child-centered education aligned with the learner's natural development?`,
        [
          'The Republic',
          'Émile, or On Education',
          'Pedagogy of the Oppressed',
          'Democracy and Education',
        ],
        1,
        `**B** is the winner! *Émile* is Rousseau's blueprint for naturalistic, developmentally respectful education. (A is Plato, C is Paulo Freire, and D is John Dewey.)`,
        `You're cruising right through Philosophy, ${name}! Want to jump to Dewey next?`
      ),
  },
  {
    keywords: /\b(john dewey|dewey|pragmatism|progressivism|learning by doing)\b/i,
    reply: (name) =>
      `Oh, you are going to love seeing **John Dewey** on the exam, ${name}—he's basically the patron saint of LET ProfEd:\n\n` +
      `**Core LET Concepts — John Dewey (1859–1952):**\n` +
      `• Dewey is the face of **Pragmatism** and **Educational Progressivism**.\n` +
      `• His golden rule is **"Learning by Doing"**—students truly grasp ideas when they investigate real problems, collaborate, and test solutions hands-on.\n` +
      `• As he famously put it: *"Education is not preparation for life; education is life itself."*\n\n` +
      `**High-Yield Board Notes:**\n` +
      `• **Memory Hook:** **DEWEY = DO-IT!** Anytime you see community projects, experiments, inquiry, and democratic group work, think **Dewey**.\n` +
      `• **Board Exam Secret:** On PRC situational questions, Progressive/Dewey-style choices (active, experiential, democratic) beat passive lecture choices almost every time!\n\n` +
      formatQuestionBlock(
        `Teacher Marco guides his Grade 9 class to conduct a local barangay water-quality survey and present practical solutions to barangay officials. Which philosopher's "learning by doing" principle does he model?`,
        [
          'John Dewey',
          'Robert Hutchins',
          'William Bagley',
          'B.F. Skinner',
        ],
        0,
        `**A** is spot on! John Dewey championed hands-on, real-world experiential learning and democratic citizenship. Hutchins (B) is Perennialism, Bagley (C) is Essentialism, and Skinner (D) is Behaviorism.`,
        `Keep it rolling, ${name}—you're thinking just like a future LPT!`
      ),
  },
  {
    keywords: /\b(paulo freire|freire|banking concept|banking education|pedagogy of the oppressed|conscientization)\b/i,
    reply: (name) =>
      `Great pick, ${name}! **Paulo Freire** is super memorable once you picture a piggy bank:\n\n` +
      `**Core LET Concepts — Paulo Freire (1921–1997):**\n` +
      `• Freire was a Brazilian educator who founded **Critical Pedagogy** in his classic book ***Pedagogy of the Oppressed***.\n` +
      `• He challenged the **"Banking Concept of Education"**, where teachers act like depositors stuffing static facts into silent, passive students.\n` +
      `• Instead, he championed **Problem-Posing Dialogue** and **Conscientization**—helping learners think critically about their world and transform society.\n\n` +
      `**High-Yield Board Notes:**\n` +
      `• **Catchy Hook:** *Freire = No Piggy-Bank Teaching!* Swap one-way lectures for **open dialogue + critical reflection (praxis)**.\n` +
      `• **Keyword Alert:** If a board item mentions *"banking system," "conscientization,"* or *"praxis,"* pick **Paulo Freire** immediately!\n\n` +
      formatQuestionBlock(
        `In "Pedagogy of the Oppressed," why does Paulo Freire reject the "banking concept of education"?`,
        [
          'It encourages too much student debate in class',
          'It treats learners as passive containers waiting to memorize teacher-deposited facts',
          'It integrates entrepreneurship skills into TLE classes',
          'It uses spiral progression across junior high subjects',
        ],
        1,
        `**B** hits the mark! Freire criticized passive "deposit-and-memorize" schooling because it silences learners instead of empowering critical dialogue and problem-posing thinking.`,
        `That's another solid point in your pocket, ${name}!`
      ),
  },
  {
    keywords: /\b(montessori|maria montessori|froebel|pestalozzi|herbart)\b/i,
    reply: (name) =>
      `Let's team up on these **4 Classic Education Pioneers**, ${name}—the LET loves matching their names to their signature ideas:\n\n` +
      `**Core LET Concepts:**\n` +
      `• **Maria Montessori:** Created the **Montessori Method** with a **prepared environment**, child-sized tools, and tactile self-correcting materials.\n` +
      `• **Friedrich Froebel:** Proud **"Father of Kindergarten"** (*"children's garden"*), showing that structured play, songs, and hands-on **"Gifts"** fuel growth.\n` +
      `• **Johann Heinrich Pestalozzi:** Taught that true education engages the **Head, Heart, and Hands** using real object lessons.\n` +
      `• **Johann Friedrich Herbart:** Gave us structured **5-Step Lesson Planning** (Preparation, Presentation, Association, Generalization, Application).\n\n` +
      `**High-Yield Board Notes:**\n` +
      `• **Speed Match Cheat Sheet:** *Montessori* = Prepared Environment | *Froebel* = Kindergarten | *Pestalozzi* = Head-Heart-Hands | *Herbart* = 5 Lesson Steps.\n\n` +
      formatQuestionBlock(
        `Which educator founded the first "Kindergarten" and designed educational play objects known as "Gifts" to nurture young learners?`,
        [
          'Maria Montessori',
          'Friedrich Froebel',
          'Johann Herbart',
          'John Locke',
        ],
        1,
        `**B** is right! **Friedrich Froebel** coined *Kindergarten* ("garden for children") and centered early learning on purposeful play and his geometric "Gifts."`,
        `Look how cleanly those four names click together now, ${name}!`
      ),
  },
  {
    keywords: /\b(marcus aurelius|stoic|stoicism|socrates|plato|aristotle|confucius|aquinas|immanuel kant|kant)\b/i,
    reply: (name, normQ) => {
      if (/\b(marcus aurelius|stoic|stoicism|meditations)\b/i.test(normQ)) {
        return (
          `Ooh, love that you asked about **Marcus Aurelius**, ${name}! He's actually a huge inspiration even for exam-week stress:\n\n` +
          `**Core LET Concepts — Marcus Aurelius (121–180 CE):**\n` +
          `• **Marcus Aurelius** was a Roman Emperor and one of history's most famous **Stoic philosophers**, best known for his personal journal ***Meditations***.\n` +
          `• Stoicism teaches the **Dichotomy of Control**: pour your energy into what *you* control (your attitude, preparation, and integrity) and stay calm about what you can't.\n` +
          `• He lived by the four Stoic virtues—**Wisdom, Courage, Justice, and Temperance**.\n\n` +
          `**High-Yield Board Notes:**\n` +
          `• **Easy Mnemonic — "STOIC":** **S**elf-control, **T**emperance, **O**bjective reason, **I**nner peace, **C**ivic duty.\n` +
          `• **LET GenEd / Values Ed Tip:** Stoicism is often contrasted with Hedonism (pleasure-seeking); Stoics prize **virtue and rational composure** above external comfort.\n\n` +
          formatQuestionBlock(
            `Which philosophy, lived and written about by Roman Emperor Marcus Aurelius in "Meditations," emphasizes rational self-mastery, duty, and peace of mind regardless of external hardships?`,
            ['Hedonism', 'Stoicism', 'Nihilism', 'Relativism'],
            1,
            `**B** is correct! **Stoicism** (Marcus Aurelius, Epictetus, Seneca) centers on virtue, resilience, and focusing only on what lies within our control.`,
            `Channel a little Stoic calm on exam day too, ${name}—you've got this!`
          )
        );
      }

      return (
        `Let's review the **All-Star Classical & Moral Philosophers**, ${name}—these show up across GenEd, ProfEd, and Values Ed:\n\n` +
        `**Core LET Concepts:**\n` +
        `• **Socrates:** Taught *"Know thyself"* and sparked critical thinking through the **Socratic Method** (guided questioning).\n` +
        `• **Plato:** Socrates' student, founder of *The Academy*, and Father of **Idealism** (eternal ideas/truths matter most).\n` +
        `• **Aristotle:** Plato's student, founder of *The Lyceum*, and Father of **Realism**, Biology, & formal logic.\n` +
        `• **Confucius:** Championed filial piety (*xiao*), harmony, and the **Silver Rule** (*"Don't do to others what you wouldn't want done to you"*).\n` +
        `• **Immanuel Kant:** Father of **Deontology** (**Categorical Imperative**—do your moral duty and always treat people with dignity, never just as tools).\n\n` +
        `**High-Yield Board Notes:**\n` +
        `• **Teacher-Student Chain — "S-P-A":** **S**ocrates taught **P**lato (Idealism), who taught **A**ristotle (Realism)!\n` +
        `• **Ethics Shortcut:** Duty-first rules = **Kant (Deontology)** | Greatest good for greatest number = **Mill & Bentham (Utilitarianism)**.\n\n` +
        formatQuestionBlock(
          `Instead of giving direct answers, a teacher asks probing follow-up questions so Grade 10 students uncover flaws in their own reasoning. Whose method is she using?`,
          ['Socrates', 'Thomas Hobbes', 'John Locke', 'B.F. Skinner'],
          0,
          `**A** is spot on! The **Socratic Method** uses purposeful questioning to awaken critical thinking and self-discovery.`,
          `Ready for another round whenever you are, ${name}!`
        )
      );
    },
  },
  {
    keywords: /\b(piaget|sensorimotor|preoperational|concrete operational|formal operational|object permanence|conservation|centration|egocentrism)\b/i,
    reply: (name) =>
      `Yes! Let's make sure **Jean Piaget's Cognitive Stages** are 100% locked in for you, ${name}:\n\n` +
      `**Core LET Concepts — Piaget's 4 Stages:**\n` +
      `• **Sensorimotor (0–2 yrs):** Babies explore with senses & hands and unlock **Object Permanence** (knowing a hidden toy still exists).\n` +
      `• **Preoperational (2–7 yrs):** Imagination & language explode, though kids still show **Egocentrism**, **Animism**, and **Centration** (getting tricked by one visual feature).\n` +
      `• **Concrete Operational (7–11 yrs):** Real-world logic clicks—they master **Conservation** (same liquid in tall vs. wide cups!), **Seriation**, and **Reversibility**.\n` +
      `• **Formal Operational (12+ yrs — Secondary Learners!):** Abstract reasoning, **Hypothetico-Deductive thinking**, and big-picture problem-solving.\n\n` +
      `**High-Yield Board Notes:**\n` +
      `• **Catchy Mnemonic — "Some People Can Fly" (S-P-C-F)!**\n` +
      `• **Schema Mechanics:** **Assimilation** = fitting new info into an old folder; **Accommodation** = creating/updating a folder when info doesn't fit.\n\n` +
      formatQuestionBlock(
        `A Grade 10 learner systematically tests variables in a Chemistry lab and debates abstract ethical dilemmas. Which Piagetian stage does this demonstrate?`,
        ['Sensorimotor Stage', 'Preoperational Stage', 'Concrete Operational Stage', 'Formal Operational Stage'],
        3,
        `**D** is correct! Once adolescents (12+) test hypotheses systematically and reason abstractly, they are operating in Piaget's **Formal Operational Stage**.`,
        `Easy points when you see high school abstract reasoning on the LET, ${name}!`
      ),
  },
  {
    keywords: /\b(scaffolding|zpd|zone of proximal|vygotsky|mko|more knowledgeable other|sociocultural)\b/i,
    reply: (name) =>
      `I've got a super clear way to remember **Vygotsky's ZPD vs. Scaffolding**, ${name}:\n\n` +
      `**Core LET Concepts:**\n` +
      `• **Zone of Proximal Development (ZPD):** That sweet spot between what a student can finish **all alone** and what they can conquer **with a little guidance** from a More Knowledgeable Other (MKO — teacher or skilled peer).\n` +
      `• **Scaffolding:** The **temporary training wheels** (hints, modeling, graphic organizers, sentence starters) you offer inside the ZPD—and gradually take off as confidence grows!\n` +
      `• Unlike Piaget's solo explorer view, Vygotsky taught that **social interaction and language** come *first* in learning.\n\n` +
      `**High-Yield Board Notes:**\n` +
      `• **Quick Analogy:** **ZPD** = the stretch goal; **Scaffolding** = the temporary ladder that fades away once they climb it!\n` +
      `• **Board Trigger Words:** Look for *guided practice, peer tutoring, think-aloud modeling,* and *"I do, We do, You do."*\n\n` +
      formatQuestionBlock(
        `Teacher Ana models how to solve a quadratic word problem, guides the class through two examples, offers hints during pair work, and then lets students solve solo. What Vygotskian strategy is this?`,
        ['Operant Extinction', 'Instructional Scaffolding', 'Schema Assimilation', 'Classical Conditioning'],
        1,
        `**B** is right! Providing structured support in the ZPD and gradually fading it away ("I do, We do, You do") is textbook **Instructional Scaffolding**.`,
        `You're getting sharper every question, ${name}!`
      ),
  },
  {
    keywords: /\b(ra\s*7836|ra\s*9293|7836|9293|philippine teachers professionalization|para-teacher|parateacher|licensure)\b/i,
    reply: (name) =>
      `Oh, **RA 7836 vs. RA 9293** is an absolute MUST-KNOW for every future LPT, ${name}! Let's make the numbers effortless:\n\n` +
      `**Core LET Concepts:**\n` +
      `• **RA 7836 (1994 — Philippine Teachers Professionalization Act):** Gave birth to the **Board for Professional Teachers (BPT)** under the PRC and made the LET mandatory.\n` +
      `• **RA 9293 (2004 — Amended RA 7836):** Updated three key rules you need at your fingertips:\n` +
      `  1. Non-education grads need **18 units** of ProfEd (upgraded from 10) to take the Secondary LET.\n` +
      `  2. **Para-Teacher Permit:** Examinees who score **70%–74.99%** can receive a 2-year renewable special permit to teach where teachers are scarce.\n` +
      `  3. **5-Year Inactive Refresher:** Licensed teachers away for **5+ consecutive years** must take **12 refresher units** (6 Pedagogy + 6 Content).\n\n` +
      `**High-Yield Board Notes:**\n` +
      `• **Number Hack:** **7836** = Birth of LET | **9293** = **18 units**, **70–74% para-teacher**, **5-yr / 12-unit** refresher!\n\n` +
      formatQuestionBlock(
        `Under RA 9293, a licensed BSEd graduate who left teaching for six straight years plans to return to a public high school. What is required before resuming practice?`,
        [
          'Retake the entire Licensure Examination for Teachers',
          'Complete 12 units of education courses (6 pedagogy + 6 content)',
          'Apply for a 70–74% Special Para-Teacher Permit',
          'Attend a single 1-day school orientation only',
        ],
        1,
        `**B** is correct! Section 2 of RA 9293 explicitly requires a **12-unit refresher course** (6 units pedagogy + 6 units content) after **five or more consecutive years** of inactivity.`,
        `Bookmark those numbers in your head, ${name}—they pay off big on exam day!`
      ),
  },
  {
    keywords: /\b(assessment\s+(for|as|of)|formative|summative|diagnostic|placement|authentic assessment|rubric)\b/i,
    reply: (name) =>
      `Let's make **Assessment FOR, AS, and OF Learning** effortless for you, ${name}!\n\n` +
      `**Core LET Concepts:**\n` +
      `• **Assessment FOR Learning (Formative & Diagnostic):** Happens *while* you're teaching so you can spot confusion early and tweak tomorrow's lesson (**not for final grades**).\n` +
      `• **Assessment AS Learning (Self & Peer Reflection):** Students step back and evaluate *their own* learning (think learning logs, self-check rubrics, peer feedback).\n` +
      `• **Assessment OF Learning (Summative):** Happens *after* instruction to measure mastery and compute grades (quarterly exams, final projects).\n\n` +
      `**High-Yield Board Notes:**\n` +
      `• **3-Word Cheat Code:** **FOR** = Teacher guides | **AS** = Student reflects | **OF** = Grade & certify!\n\n` +
      formatQuestionBlock(
        `After a lesson on photosynthesis, Ms. Cruz gives a quick ungraded 3-item exit ticket strictly to check misconceptions before tomorrow's review. What assessment purpose is this?`,
        [
          'Assessment OF Learning',
          'Assessment FOR Learning',
          'Norm-Referenced Placement Testing',
          'Summative Grading Evaluation',
        ],
        1,
        `**B** is the answer! Using an ungraded check *during* instruction to guide teaching adjustments is classic **Assessment FOR Learning (Formative)**.`,
        `See how clean that distinction is, ${name}? Ask away if you want to drill rubrics next!`
      ),
  },
  {
    keywords: /\b(board exam tip|test[- ]taking|let tip|study tip|strategy|rationaliz|distractor|pass the let)\b/i,
    reply: (name) =>
      `Pull up a chair, ${name}—here are my favorite **LET Test-Taking Hacks** that rescue examinees on tough items:\n\n` +
      `**Core LET Concepts — How PRC Writes Keys:**\n` +
      `• **The Ideal Teacher Mindset (ProfEd):** PRC keys reward the teacher who is **calm, democratic, empathetic, ethical, and learner-centered**—never harsh, sarcastic, or punitive.\n` +
      `• **Respect the Stem Qualifier:** Circle words like **FIRST**, **BEST**, **MOST**, or **EXCEPT**. Usually, **FIRST** means diagnosing the issue or talking privately with the student.\n` +
      `• **Alignment Wins:** Look for choices that tie lesson objectives, engaging activities, and fair assessment together.\n\n` +
      `**High-Yield Board Notes:**\n` +
      `• **Quick Check — "I-S-A-T":** **I**dealistic/Learner-first choice | **S**uspicious absolutes (*always/never/only*) are usually traps | **A**nswer the exact qualifier (*FIRST/EXCEPT*) | **T**wo opposite options often hide the right answer between them!\n\n` +
      formatQuestionBlock(
        `A Grade 8 learner keeps interrupting class discussions. Under best ProfEd classroom management practice, what should the teacher do FIRST?`,
        [
          'Escort the student straight to the principal for suspension',
          'Scold the student loudly in front of everyone as a warning',
          'Speak privately with the student after class to understand what is going on',
          'Subtract 10 points from the student\'s quarterly test score',
        ],
        2,
        `**C** is always the keyed first move! Start with calm, private, empathetic conversation to uncover root causes—and never use academic grades as punishment (D).`,
        `Keep that calm, topnotcher mindset, ${name}—you're doing amazing!`
      ),
  },
  {
    keywords: /\b(erikson|psychosocial|industry vs inferiority|identity vs role confusion|trust vs mistrust|autonomy|initiative|generativity|integrity)\b/i,
    reply: (name) =>
      `Let's zoom in on **Erik Erikson's Psychosocial Stages**, ${name}—especially the one tailored to high schoolers!\n\n` +
      `**Core LET Concepts — Erikson's 8 Life Crises:**\n` +
      `• **Stages 1–4 (Childhood):** Trust vs. Mistrust (*Hope*) -> Autonomy vs. Shame/Doubt (*Will*) -> Initiative vs. Guilt (*Purpose*) -> Industry vs. Inferiority (*Competence*).\n` +
      `• **Stage 5 — Identity vs. Role Confusion (12–18 yrs — HUGE for BSEd!):** Teenagers figure out *"Who am I, what do I believe, and where am I headed?"* Success builds **Fidelity**.\n` +
      `• **Stages 6–8 (Adulthood):** Intimacy vs. Isolation (*Love*) -> Generativity vs. Stagnation (*Care*) -> Integrity vs. Despair (*Wisdom*).\n\n` +
      `**High-Yield Board Notes:**\n` +
      `• **Secondary Focus:** Elementary = *Industry* (loving competence/skills); High School = *Identity* (values, career tracks, belonging).\n\n` +
      formatQuestionBlock(
        `A Grade 11 student explores different SHS tracks, joins clubs, and reflects deeply on her future career and personal values. Which Eriksonian stage is she experiencing?`,
        ['Industry vs. Inferiority', 'Identity vs. Role Confusion', 'Initiative vs. Guilt', 'Generativity vs. Stagnation'],
        1,
        `**B** is right! Adolescence (ages 12–18) centers on resolving **Identity vs. Role Confusion**, forming a coherent sense of self and direction.`,
        `Nice job, ${name}! Let me know which theorist you want to review next.`
      ),
  },
  {
    keywords: /\b(kohlberg|moral development|pre-conventional|preconventional|conventional|post-conventional|postconventional|heinz)\b/i,
    reply: (name) =>
      `Here's the easiest secret to acing **Kohlberg's Moral Stages**, ${name}:\n\n` +
      `**Core LET Concepts — 3 Levels, 6 Stages:**\n` +
      `• **Pre-Conventional ("About Me"):** (1) *Avoid punishment*; (2) *Scratch my back, I'll scratch yours*.\n` +
      `• **Conventional ("About Us / Rules"):** (3) *Good Boy / Nice Girl* (wants peer/teacher approval); (4) *Law & Order* (follows rules because rules keep order).\n` +
      `• **Post-Conventional ("Universal Principles"):** (5) *Social Contract* (laws should serve the common good); (6) *Universal Ethical Principles* (conscience & justice come first).\n\n` +
      `**High-Yield Board Notes:**\n` +
      `• **Golden LET Hack:** Don't just look at *what* the person did—read **WHY** they did it! That single word ("because...") gives away the exact stage.\n\n` +
      formatQuestionBlock(
        `A student refuses to share leaked test answers because "my friends and teacher trust me to be honest." Which Kohlberg stage best explains this reasoning?`,
        ['Stage 1: Obedience and Punishment', 'Stage 3: Good Boy / Nice Girl (Interpersonal Concordance)', 'Stage 5: Social Contract', 'Stage 6: Universal Ethical Principles'],
        1,
        `**B** is correct! Doing right to protect trust, approval, and good relationships with people around you is classic **Conventional Stage 3**.`,
        `Look for that "WHY" clue every time, ${name}—it works like magic!`
      ),
  },
  {
    keywords: /\b(bloom|taxonomy|remember|understand|apply|analyze|evaluate|create|anderson|krathwohl|affective|psychomotor)\b/i,
    reply: (name) =>
      `Let's lock in **Revised Bloom's Taxonomy**, ${name}—these verbs are pure LET gold!\n\n` +
      `**Core LET Concepts (Anderson & Krathwohl, 2001):**\n` +
      `• **Cognitive Ladder (LOTS -> HOTS):** **Remembering -> Understanding -> Applying -> Analyzing -> Evaluating -> Creating** (the very top!).\n` +
      `• **Affective Ladder (Krathwohl — Values/Attitudes):** Receiving -> Responding -> Valuing -> Organizing -> **Characterizing**.\n\n` +
      `**High-Yield Board Notes:**\n` +
      `• **Easy Revision Tip:** Revised Bloom switched old nouns into **action verbs** and crowned **Creating** above **Evaluating**.\n` +
      `• **Verb Spotting:** *Compare/Differentiate* = Analyzing | *Critique/Defend* = Evaluating | *Design/Formulate* = Creating.\n\n` +
      formatQuestionBlock(
        `Which lesson objective targets the HIGHEST level of Revised Bloom's Cognitive Taxonomy?`,
        [
          'State the law of conservation of energy.',
          'Compare mitosis and meiosis using a Venn diagram.',
          'Design an original low-cost solar water filter using recycled materials.',
          'Critique the reliability of a student research conclusion.',
        ],
        2,
        `**C** takes the crown! **Designing/Constructing** an original solution is **Creating**—higher than Evaluating (D), Analyzing (B), and Remembering (A).`,
        `Keep those Bloom verbs handy, ${name}—they pop up in curriculum AND assessment items!`
      ),
  },
  {
    keywords: /\b(difficulty index|discrimination index|item analysis|upper group|lower group|negative discrimination)\b/i,
    reply: (name) =>
      `Don't let test-analysis math intimidate you, ${name}—once you see the formulas, these are guaranteed points!\n\n` +
      `**Core LET Concepts:**\n` +
      `• **Difficulty Index (p) = (R_upper + R_lower) / N_total** — Ideal is **0.21–0.80** (sweet spot: **0.40–0.60**). Watch out: a **high *p*** means an **EASY** question!\n` +
      `• **Discrimination Index (D) = (R_upper - R_lower) / N_per_group** — Checks whether top scorers beat lower scorers on that item.\n\n` +
      `**High-Yield Board Notes:**\n` +
      `• **Quick Decision Rule:** **D >= +0.40** = Keeper! | **+0.20 to +0.39** = Good/Tweak | **Negative D (< 0)** = **THROW IT OUT!**\n\n` +
      formatQuestionBlock(
        `In an item analysis (20 students each in upper and lower groups), 6 upper-group students and 12 lower-group students got Item #14 right. What is the discrimination index and what should you do?`,
        ['D = +0.30; Keep the item', 'D = -0.30; Discard or reject the item', 'D = +0.45; Keep as an ideal item', 'D = -0.60; Make it a bonus item'],
        1,
        `**B** is right! D = (6 − 12) / 20 = **-0.30**. Whenever *D* is negative, the item misled strong students and favored guessing—always **discard/reject** it.`,
        `Clean math, zero stress, ${name}!`
      ),
  },
  {
    keywords: /\b(bruner|enactive|iconic|symbolic|spiral curriculum|discovery learning|ausubel|advance organizer|meaningful learning)\b/i,
    reply: (name) =>
      `Let's pair up **Jerome Bruner** and **David Ausubel**, ${name}—two cognitivist favorites you'll often see side by side:\n\n` +
      `**Core LET Concepts:**\n` +
      `• **Jerome Bruner:** Believed in **Discovery Learning** and the **Spiral Curriculum**, moving through **E-I-S Modes**: **Enactive** (action) -> **Iconic** (pictures) -> **Symbolic** (words/math symbols).\n` +
      `• **David Ausubel:** Championed **Meaningful Reception Learning**—giving students an **Advance Organizer** *before* a lesson to hook new facts onto what they already know.\n\n` +
      `**High-Yield Board Notes:**\n` +
      `• **Alliteration Trick:** **A**usubel = **A**dvance Organizer | **B**runer = **B**uilding through Discovery (**E-I-S** & Spiral).\n\n` +
      formatQuestionBlock(
        `Before introducing Macroeconomics, Teacher Leo shows a quick overview chart connecting familiar supply-and-demand concepts to upcoming national indicators. Whose "advance organizer" strategy is this?`,
        ['Jerome Bruner', 'David Ausubel', 'Ivan Pavlov', 'Edward Thorndike'],
        1,
        `**B** is correct! **David Ausubel** pioneered **Advance Organizers** to bridge prior knowledge with new organized concepts.`,
        `Easy to remember with that "A-A" trick, right ${name}?`
      ),
  },
  {
    keywords: /\b(skinner|pavlov|thorndike|bandura|operant|classical conditioning|reinforcement|punishment|law of effect|observational|bobo doll)\b/i,
    reply: (name) =>
      `Let's untangle the **Big 4 Learning Theorists** once and for all, ${name}:\n\n` +
      `**Core LET Concepts:**\n` +
      `• **Ivan Pavlov (Classical Conditioning):** *Automatic/involuntary* reflexes paired with a trigger (Bell + Food -> Salivation).\n` +
      `• **Edward Thorndike (Connectionism):** Trial-and-error learning powered by **Readiness, Exercise, and Effect**.\n` +
      `• **B.F. Skinner (Operant Conditioning):** *Voluntary* choices shaped by consequences (**Reinforcement** always *increases* behavior; **Punishment** *decreases* it).\n` +
      `• **Albert Bandura (Social Learning):** Learning by watching role models (**Bobo Doll**): *Attention -> Retention -> Reproduction -> Motivation*.\n\n` +
      `**High-Yield Board Notes:**\n` +
      `• **Classic LET Trap:** Canceling a weekend chore/worksheet because students aced a quiz is **Negative Reinforcement** (*removing* something annoying to *boost* good work)—NOT punishment!\n\n` +
      formatQuestionBlock(
        `After the whole class hits 90% on Thursday's mastery check, Teacher Jay waives Friday's extra homework drill. Which operant principle is he using?`,
        ['Positive Punishment', 'Negative Punishment', 'Negative Reinforcement', 'Classical Extinction'],
        2,
        `**C** is spot on! **Taking away** an unpleasant task (homework drill) to **reward and increase** great study effort is **Negative Reinforcement**.`,
        `Watch out for that negative-reinforcement trap on exam day, ${name}—now it won't catch you!`
      ),
  },
  {
    keywords: /\b(gardner|multiple intelligences|gagne|nine events|maslow|hierarchy of needs|bronfenbrenner|dweck|goleman)\b/i,
    reply: (name) =>
      `Here's a friendly rapid-fire review of these **Learner-Centered Psychologists**, ${name}:\n\n` +
      `**Core LET Concepts:**\n` +
      `• **Howard Gardner:** **Multiple Intelligences** (Linguistic, Logical-Math, Spatial, Kinesthetic, Musical, Interpersonal, Intrapersonal, Naturalist).\n` +
      `• **Abraham Maslow:** **Hierarchy of Needs**—hungry or anxious kids need physiological & emotional **Safety** before thriving at self-actualization.\n` +
      `• **Robert Gagné:** **Nine Events of Instruction** (starting with *Gain Attention -> Inform Objectives -> Stimulate Recall*).\n` +
      `• **Urie Bronfenbrenner:** **Ecological Systems** (Micro, Meso, Exo, Macro, Chrono).\n` +
      `• **Carol Dweck:** **Growth vs. Fixed Mindset** | **Daniel Goleman:** **Emotional Intelligence (EQ)**.\n\n` +
      `**High-Yield Board Notes:**\n` +
      `• **Gardner Tip:** **Inter**personal = connecting with others (*inter = between*); **Intra**personal = understanding yourself (*intra = within*).\n\n` +
      formatQuestionBlock(
        `A student shines in peer mediation and group projects, effortlessly motivating teammates, though she dislikes solo worksheets. Which Gardner intelligence stands out?`,
        ['Intrapersonal Intelligence', 'Interpersonal Intelligence', 'Naturalist Intelligence', 'Spatial Intelligence'],
        1,
        `**B** is right! **Interpersonal Intelligence** is all about reading social cues, collaborating, and leading people effectively.`,
        `You've got great instincts, ${name}!`
      ),
  },
  {
    keywords: /\b(code of ethics|ethical|ra 4670|magna carta|bp 232|ra 10533|matatag|ppst|ra 9155|ra 7610|ra 10627|ra 10912)\b/i,
    reply: (name) =>
      `Let's review the **Philippine Education Laws & Teacher Ethics** that appear constantly on the LET, ${name}:\n\n` +
      `**Core LET Concepts:**\n` +
      `• **Code of Ethics (PRC Res. 435):** Students' welfare comes **above everything else**; never accept gifts/favors tied to grades, and uphold professional dignity.\n` +
      `• **RA 4670 (Magna Carta for Public School Teachers):** Caps actual teaching at **6 hours/day** (**+25% overtime** beyond 6 hrs) and grants Study Leave (up to 1 yr at 60% pay after 7 years).\n` +
      `• **RA 10533 & MATATAG:** K–12 Enhanced Basic Ed; **MATATAG** decongests subjects so learners master core skills deeply.\n` +
      `• **RA 9155** (School-Based Governance), **RA 7610** (Child Protection), **RA 10627** (Anti-Bullying), **RA 10912** (CPD Law).\n\n` +
      `**High-Yield Board Notes:**\n` +
      `• **RA 4670 Numbers to Memorize:** **6** teaching hours | **25%** overtime | **7** years for Study Leave!\n\n` +
      formatQuestionBlock(
        `Under RA 4670 (Magna Carta for Public School Teachers), what is the maximum number of hours of actual classroom teaching per day without overtime pay?`,
        ['4 hours', '6 hours', '8 hours', '10 hours'],
        1,
        `**B** is right! Section 13 of RA 4670 sets actual classroom teaching at **6 hours a day**; extra teaching hours earn at least **25% overtime pay**.`,
        `Keep those numbers tucked away safely, ${name}!`
      ),
  },
  {
    keywords: /\b(jose rizal|rizal|noli me tangere|el filibusterismo|laong laan|dimasalang|ra 1425|bonifacio|mabini|balagtas|lope k\.? santos|nick joaquin|severino reyes|quezon)\b/i,
    reply: (name, normQ) => {
      if (/\b(rizal|noli|fili|laong|dimasalang|1425)\b/i.test(normQ)) {
        return (
          `Great topic, ${name}! Let's review **Dr. José Rizal**—an essential GenEd & Filipino favorite:\n\n` +
          `**Core LET Concepts — José Rizal (1861–1896):**\n` +
          `• **José Rizal** is our National Hero, ophthalmologist, polymath, and Propaganda Movement writer executed at Bagumbayan on **December 30, 1896**.\n` +
          `• His two powerhouse novels are ***Noli Me Tángere*** (Berlin, 1887 — dedicated to the Motherland) and ***El Filibusterismo*** (Ghent, 1891 — dedicated to **GOMBURZA**).\n` +
          `• **RA 1425 (Rizal Law):** Requires all schools to teach Rizal's life and unexpurgated novels.\n\n` +
          `**High-Yield Board Notes:**\n` +
          `• **Pen Name Shortcut:** **Laong Laan** (*Ever Prepared*) and **Dimasalang** (*Untouchable*) in *La Solidaridad*, plus **La Liga Filipina** (1892).\n\n` +
          formatQuestionBlock(
            `To whom did Dr. José Rizal dedicate his second novel, "El Filibusterismo" (1891)?`,
            [
              'The Spanish Governor-General',
              'Fathers Mariano Gomez, Jose Burgos, and Jacinto Zamora (GOMBURZA)',
              'His mother, Teodora Alonso',
              'Andrés Bonifacio and the Katipunan',
            ],
            1,
            `**B** is correct! Rizal dedicated *El Filibusterismo* to **GOMBURZA**, whose 1872 martyrdom deeply inspired Filipino nationalism (while *Noli* was dedicated to the Philippines).`,
            `Solid recall, ${name}! What hero or history topic is next on your list?`
          )
        );
      }

      return (
        `Let's run through our **Philippine Historical & Literary Icons**, ${name}:\n\n` +
        `**Core LET Concepts:**\n` +
        `• **Andrés Bonifacio:** *"Supremo"* of the **KKK** and Father of the Revolution (*Pag-ibig sa Tinubuang Lupa*).\n` +
        `• **Apolinario Mabini:** *"Brains of the Revolution"* & *"Sublime Paralytic"* (*El Verdadero Decálogo*).\n` +
        `• **Marcelo H. del Pilar (*Plaridel*):** *La Solidaridad* editor (*Dasalan at Tocsohan*).\n` +
        `• **Literary Pillars:** **Francisco Balagtas** (*Florante at Laura*), **Lope K. Santos** (*Balarila ng Wikang Pambansa*), and **Severino Reyes** (*"Lola Basyang" / Walang Sugat*).\n\n` +
        `**High-Yield Board Notes:**\n` +
        `• **Quick Match:** *Balagtas* = Prince of Tagalog Poets | *Lope K. Santos* = Father of Filipino Grammar | *Quezon* = Father of National Language.\n\n` +
        formatQuestionBlock(
          `Who is honored as the "Ama ng Balarilang Pambansa" (Father of National Language Grammar) for writing "Balarila ng Wikang Pambansa"?`,
          ['Severino Reyes', 'Lope K. Santos', 'Francisco Balagtas', 'Manuel L. Quezon'],
          1,
          `**B** is correct! **Lope K. Santos** authored *Balarila ng Wikang Pambansa* (while Quezon is Father of the National Language, Reyes is Lola Basyang, and Balagtas wrote *Florante at Laura*).`,
          `Love the energy today, ${name}!`
        )
      );
    },
  },
  {
    keywords: /\b(newton|einstein|galileo|darwin|mendel|pasteur|marie curie|curie|hooke|linnaeus|mendeleev|pythagoras|euclid|archimedes|pascal|kepler)\b/i,
    reply: (name) =>
      `Let's lock in these **Hall-of-Fame Scientists & Mathematicians**, ${name}:\n\n` +
      `**Core LET Concepts:**\n` +
      `• **Physics & Astronomy:** **Isaac Newton** (3 Laws of Motion & Gravity), **Albert Einstein** (Relativity, *E = mc²*), **Galileo Galilei** (telescope & heliocentrism), **Johannes Kepler** (Planetary Motion), **Archimedes** (buoyancy).\n` +
      `• **Biology & Chemistry:** **Charles Darwin** (Natural Selection), **Gregor Mendel** (Genetics), **Louis Pasteur** (Germ theory & pasteurization), **Robert Hooke** (named "cells"), **Carl Linnaeus** (Binomial Nomenclature), **Dmitri Mendeleev** (Periodic Table), **Marie Curie** (Radioactivity).\n` +
      `• **Math Legends:** **Euclid** (Geometry), **Pythagoras** (*a² + b² = c²*), **Blaise Pascal** (Pressure & Probability), **René Descartes** (Cartesian Plane).\n\n` +
      `**High-Yield Board Notes:**\n` +
      `• **Fast Flash:** *Hooke* = Cells | *Mendel* = Pea Plants/Genetics | *Linnaeus* = Two-word species names (*Homo sapiens*).\n\n` +
      formatQuestionBlock(
        `Who is known as the "Father of Taxonomy" for creating the two-part scientific naming system (binomial nomenclature)?`,
        ['Gregor Mendel', 'Charles Darwin', 'Carl Linnaeus', 'Robert Hooke'],
        2,
        `**C** is right! **Carl Linnaeus** introduced binomial nomenclature (*Genus species*). Mendel founded genetics, Darwin proposed natural selection, and Hooke coined "cell."`,
        `Boom—another GenEd Science point locked in, ${name}!`
      ),
  },
  {
    keywords: /\b(skew|mean|median|mode|standard deviation|variance|normal curve|percentile|stanine)\b/i,
    reply: (name) =>
      `Stats questions are way easier once you picture the curve's tail, ${name}! Let's break it down:\n\n` +
      `**Core LET Concepts:**\n` +
      `• **Positively Skewed (Tail points RIGHT):** Most students scored **LOW** (very hard test!). Order: **Mode < Median < Mean**.\n` +
      `• **Negatively Skewed (Tail points LEFT):** Most students scored **HIGH** (great mastery/easy test!). Order: **Mean < Median < Mode**.\n` +
      `• **Normal Bell Curve:** Perfectly balanced—**Mean = Median = Mode**.\n` +
      `• **Standard Deviation (SD):** Small SD = **Homogeneous** group (tightly bunched); Large SD = **Heterogeneous** group (spread out).\n\n` +
      `**High-Yield Board Notes:**\n` +
      `• **Buddy's Golden Rule:** *"Negatively skewed = Positively good teaching!"* And always pick **Median** when wild **outliers** skew the class.\n\n` +
      formatQuestionBlock(
        `After a Science unit exam, almost everyone scored near the top, leaving a long tail stretching to the left. How should you interpret this distribution?`,
        [
          'Positively skewed; the exam was too hard',
          'Negatively skewed; most learners mastered the lesson well',
          'A symmetrical normal curve with zero spread',
          'Bimodal with Mean greater than Mode',
        ],
        1,
        `**B** is right! A tail stretching **left** means a **negatively skewed** curve where the bulk of scores pile up at the **high** end.`,
        `See how easy that tail trick makes stats, ${name}?`
      ),
  },
  {
    keywords: /\b(gamification|game[- ]based learning|flipped classroom|blended learning|differentiated instruction|ubd|understanding by design|backward design|constructive alignment)\b/i,
    reply: (name, normQ) => {
      const q = normQ.toLowerCase();
      if (/gamification|game/.test(q)) {
        return (
          `Ooh, fun topic, ${name}! **Gamification in Learning** is super relevant for modern 21st-century classrooms:\n\n` +
          `**Core LET Concepts — Gamification:**\n` +
          `• **Gamification** applies game mechanics—like **points, badges, levels, streaks, quests, and leaderboards**—inside regular lessons to boost engagement and intrinsic motivation.\n` +
          `• Don't confuse **Gamification** (adding game elements to a lesson) with **Game-Based Learning** (learning *directly inside* a full educational game like Minecraft Education or Kahoot missions).\n` +
          `• In ProfEd EdTech, effective gamification ties rewards directly to **mastery of learning competencies**, never distracting from the objective!\n\n` +
          `**High-Yield Board Notes:**\n` +
          `• **Easy Distinction:** **Gamification** = Lesson + Game Elements (XP/Badges) | **Game-Based Learning** = Playing an actual educational game to learn.\n` +
          `• **Motivation Link:** Sparks **extrinsic hooks** (badges/streaks) that build toward **intrinsic mastery**.\n\n` +
          formatQuestionBlock(
            `A Grade 8 English teacher awards experience points (XP), mastery badges, and "Grammar Quest" levels as students complete standard writing tasks. Which instructional strategy is she using?`,
            [
              'Direct Rote Drill',
              'Gamification',
              'Norm-Referenced Tracking',
              'Classical Extinction',
            ],
            1,
            `**B** is right! Layering game elements (XP, badges, quests) onto normal classroom tasks to sustain engagement is **Gamification**.`,
            `Just like building your daily BoardBuddy streak, ${name}—keep leveling up!`
          )
        );
      }
      if (/flipped|blended/.test(q)) {
        return (
          `Nice one, ${name}! Let's lock in **Flipped Classroom & Blended Learning** for EdTech:\n\n` +
          `**Core LET Concepts:**\n` +
          `• **Flipped Classroom:** Flips traditional homework and lecture! Students watch short video lectures or read notes **at home first**, then spend **class time** doing active problem-solving, debates, and hands-on coaching.\n` +
          `• **Blended Learning:** Combines **face-to-face classroom instruction** with **online digital learning** (synchronous or asynchronous).\n\n` +
          `**High-Yield Board Notes:**\n` +
          `• **Why Teachers Flip:** Frees up precious class minutes for **HOTS (Applying, Analyzing, Creating)** while the teacher is right there to help!\n\n` +
          formatQuestionBlock(
            `Mr. Reyes assigns a 7-minute recorded math explanation to watch at home so his Grade 9 learners can spend the entire 50-minute class solving real problems with his guidance. What model is this?`,
            ['Flipped Classroom', 'Purely Asynchronous Modular', 'Traditional Expository Lecture', 'Summative Lab Testing'],
            0,
            `**A** is right! Moving direct content delivery home and dedicating face-to-face class time to active practice defines the **Flipped Classroom**.`,
            `You've got modern EdTech on lock, ${name}!`
          )
        );
      }
      return (
        `Great pedagogical pick, ${name}! Let's lock in **Backward Design (UbD) & Constructive Alignment**:\n\n` +
        `**Core LET Concepts:**\n` +
        `• **Understanding by Design (Wiggins & McTighe):** Plan lessons **backward** in 3 steps: (1) **Identify Desired Results**, (2) **Determine Acceptable Evidence (Assessment)**, (3) **Plan Learning Experiences**.\n` +
        `• **Constructive Alignment (John Biggs):** Objectives, learning tasks, and assessments must match seamlessly!\n` +
        `• **Differentiated Instruction (Carol Ann Tomlinson):** Tailor **Content, Process, Product, or Environment** to fit diverse learner readiness and interests.\n\n` +
        `**High-Yield Board Notes:**\n` +
        `• **UbD Golden Order:** **Goals -> Evidence -> Activities** (Assessment comes *before* picking daily activities!).\n\n` +
        formatQuestionBlock(
          `In Wiggins and McTighe's Understanding by Design (UbD) framework, what should a secondary teacher establish IMMEDIATELY after identifying desired learning goals?`,
          [
            'Daily seatwork worksheets',
            'Acceptable assessment evidence of student mastery',
            'Classroom seating charts',
            'Extracurricular club schedules',
          ],
          1,
          `**B** is correct! UbD places **determining acceptable assessment evidence** (Stage 2) right after desired results (Stage 1) before planning activities (Stage 3).`,
          `Strong curriculum thinking, ${name}!`
        )
      );
    },
  },
];

const STOP_WORDS = new Set([
  'who', 'whom', 'whose', 'what', 'when', 'where', 'which', 'why', 'how',
  'is', 'are', 'was', 'were', 'am', 'be', 'been', 'being',
  'do', 'does', 'did', 'done', 'doing',
  'can', 'could', 'would', 'should', 'will', 'shall', 'may', 'might', 'must',
  'have', 'has', 'had', 'having',
  'about', 'above', 'after', 'again', 'against', 'all', 'also', 'and', 'any',
  'because', 'before', 'below', 'between', 'both', 'but',
  'define', 'definition', 'describe', 'difference', 'discuss',
  'each', 'example', 'examples', 'explain', 'explanation',
  'few', 'for', 'from', 'give', 'help', 'here', 'her', 'hers', 'him', 'his',
  'into', 'its', 'just', 'know', 'known', 'like', 'make', 'many', 'mean',
  'meaning', 'more', 'most', 'much', 'name', 'need', 'not', 'now',
  'off', 'often', 'one', 'only', 'other', 'our', 'out', 'over', 'own',
  'people', 'person', 'please', 'role', 'same', 'she', 'some', 'someone',
  'stand', 'stands', 'such', 'summarize', 'summary', 'tell', 'than', 'that',
  'the', 'their', 'them', 'then', 'there', 'these', 'they', 'this', 'those',
  'through', 'tip', 'tips', 'understand', 'very', 'want', 'way', 'well',
  'with', 'you', 'your', 'yours',
  'learning', 'teaching', 'education', 'educational', 'theory', 'theories',
  'principle', 'principles', 'concept', 'concepts', 'student', 'students',
  'teacher', 'teachers', 'school', 'schools', 'lesson', 'lessons',
  'method', 'methods', 'approach', 'approaches', 'system', 'systems',
  'philippine', 'philippines', 'secondary', 'study', 'studies',
  'father', 'mother', 'founder', 'inventor', 'creator',
  'work', 'group', 'groups', 'social', 'rule', 'rules', 'type', 'types',
  'form', 'forms', 'element', 'elements', 'design', 'tool', 'tools',
  'safety', 'basic', 'modern', 'period', 'term', 'terms', 'life', 'care',
  'purpose', 'value', 'values', 'model', 'models', 'part', 'parts',
]);

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasWholeWord(text: string, word: string): boolean {
  const regex = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i');
  return regex.test(text);
}

function scoreTopicMatch(
  topic: DeckTopic,
  queryWords: string[],
  rawQueryLower: string,
  isWhoQuery: boolean
): number {
  if (queryWords.length === 0) return 0;

  const titleLower = topic.title.toLowerCase();
  const cardTermsLower = topic.cards.map((c) => c[0]).join(' ').toLowerCase();
  const cardDefsLower = topic.cards.map((c) => c[1]).join(' ').toLowerCase();
  const notesLower = topic.notes.join(' ').toLowerCase();

  let score = 0;
  let titleOrCardTermHits = 0;

  if (rawQueryLower.length >= 4 && titleLower.includes(rawQueryLower)) {
    score += 30;
    titleOrCardTermHits += 2;
  }

  for (const w of queryWords) {
    const inTitle = hasWholeWord(titleLower, w);
    const inCardTerm = hasWholeWord(cardTermsLower, w);
    const inCardDef = hasWholeWord(cardDefsLower, w);
    const inNotes = hasWholeWord(notesLower, w);

    if (inTitle) {
      score += 10;
      titleOrCardTermHits += 1;
    }
    if (inCardTerm) {
      score += 6;
      titleOrCardTermHits += 1;
    }
    if (inCardDef) score += 2;
    if (inNotes) score += 2;
  }

  if (titleOrCardTermHits === 0) return 0;
  if (isWhoQuery && score < 12) return 0;

  return score;
}

function extractSubjectPhrase(rawQuestion: string): string {
  return rawQuestion
    .trim()
    .replace(
      /^(who is|who was|who are|who were|sino si|what is|what are|what was|what were|explain|define|how does|how do|tell me about|can you explain|can you tell me about|help me with|teach me about|teach me)\s+/i,
      ''
    )
    .replace(/^(the|a|an)\s+/i, '')
    .replace(/[?!.]+$/g, '')
    .trim();
}

export function generateLocalBoardCoachReply({
  question,
  studentName,
  currentSubject,
}: LocalCoachParams): string {
  const name = (studentName || 'Future LPT').trim().split(' ')[0] || 'Future LPT';
  const cleanedQ = question.trim();
  const normalizedQ = normalizeQueryTypos(cleanedQ);
  const lowerNormQ = normalizedQ.toLowerCase();
  const isWhoQuery = /^\s*(who\s+(is|was|are|were)|sino\s+si)\b/i.test(normalizedQ);

  // 1. Typo-resilient curated LET figures, pioneers, laws, and concepts
  for (const entry of ENTITY_AND_CONCEPT_ENTRIES) {
    if (entry.keywords.test(lowerNormQ)) {
      return entry.reply(name, normalizedQ, cleanedQ);
    }
  }

  // 2. Fuzzy-normalized whole-word syllabus match in boardContent.ts (T)
  const words = lowerNormQ
    .split(/[^a-z0-9áéíóúñ-]+/i)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

  let bestTopic: DeckTopic | null = null;
  let bestScore = 0;

  for (const topic of T) {
    const score = scoreTopicMatch(topic, words, lowerNormQ, isWhoQuery);
    if (score > bestScore) {
      bestScore = score;
      bestTopic = topic;
    }
  }

  if (bestTopic && bestScore >= 8) {
    const subjectLabel = SUB[bestTopic.s] || currentSubject || 'Secondary Education';
    const corePoints = bestTopic.notes
      .slice(0, 3)
      .map((n) => `• ${n}`)
      .join('\n');
    const highYieldCards = bestTopic.cards
      .slice(0, 3)
      .map(([term, def]) => `• **${term}:** ${def}`)
      .join('\n');
    const sampleQ = bestTopic.qs?.[0];

    const questionBlock = sampleQ
      ? formatQuestionBlock(
          sampleQ[0],
          sampleQ[1],
          sampleQ[2],
          sampleQ[3],
          `Awesome focus on **${bestTopic.title}**, ${name}! Drop your next question whenever you're ready.`
        )
      : formatQuestionBlock(
          `Which statement accurately captures a core principle of ${bestTopic.title}?`,
          [
            bestTopic.cards[0]?.[1] || bestTopic.notes[0],
            'It relies strictly on unguided rote drills without real understanding.',
            'It ignores learner readiness and secondary curriculum goals.',
            'It skips formative feedback and authentic assessment.',
          ],
          0,
          `Go with **A**! It directly highlights the heart of **${bestTopic.title}** (${subjectLabel}).`,
          `Awesome focus on **${bestTopic.title}**, ${name}! Drop your next question whenever you're ready.`
        );

    return (
      `Great pick, ${name}! Let's break down **${bestTopic.title}** (${subjectLabel}) together like a true topnotcher:\n\n` +
      `**Core LET Concepts — ${bestTopic.title}:**\n${corePoints}\n\n` +
      `**High-Yield Board Notes:**\n${highYieldCards}\n\n` +
      questionBlock
    );
  }

  // 3. Context-specific study breakdown tailored directly to the exact normalized prompt (never generic placeholder boilerplate)
  const subjectPhrase = extractSubjectPhrase(normalizedQ) || normalizedQ;
  const formattedSubject = formatTopicTitle(subjectPhrase);
  const subjectKey = inferSubjectKey(subjectPhrase);
  const subjectLabel = currentSubject || SUB[subjectKey] || 'General & Professional Education';
  const focusWords = words.length > 0 ? words.slice(0, 3).map(formatTopicTitle).join(' & ') : formattedSubject;

  const coreConcepts = isWhoQuery
    ? `• **Who You're Studying (${formattedSubject}):** Whenever a question centers on **${formattedSubject}** in **${subjectLabel}**, pin down their signature milestone—whether that's a foundational discovery, law, literary masterpiece, or pedagogical breakthrough.\n` +
      `• **Context & Impact:** Examiners rarely ask for dry dates alone; they test *why* **${formattedSubject}** changed their field and how that legacy connects to modern teaching or general literacy.\n` +
      `• **Quick Anchor:** Pair **${formattedSubject}** with one unmistakable 3-word tag in your notes so it jumps off the page among distractors!`
    : `• **Unpacking "${formattedSubject}" (${subjectLabel}):** Focus on what makes **${focusWords}** distinct—how it works in practice, what problem it solves, and what closely related terms examiners like to contrast with it.\n` +
      `• **Why It Matters for Future LPTs:** In **${subjectLabel}**, questions about **${formattedSubject}** test conceptual accuracy rather than blind memorization—especially how you'd explain or apply **${formattedSubject}** clearly to high school learners.\n` +
      `• **Distractor Defense:** Watch out for choices that confuse **${formattedSubject}** with an opposite term or state an overly rigid, absolute rule.`;

  const highYieldNotes =
    `• **3-Step Recall Check for ${formattedSubject}:** (1) Define **${formattedSubject}** in one plain sentence; (2) Name one real-world classroom or historical example; (3) Spot its closest look-alike term so distractors can't trick you.\n` +
    `• **Exam Clue:** When two choices look similar on a **${formattedSubject}** item, eliminate extreme absolutes (*always/never*) and pick the option grounded in accurate principles and clear application.`;

  return (
    `I've got you, ${name}! Let's break down **${formattedSubject}** (${subjectLabel}) together right now:\n\n` +
    `**Core LET Concepts — ${formattedSubject}:**\n${coreConcepts}\n\n` +
    `**High-Yield Board Notes:**\n${highYieldNotes}\n\n` +
    formatQuestionBlock(
      `When tackling a board exam item focused on "${formattedSubject}" in ${subjectLabel}, which approach reflects the strongest mastery?`,
      [
        `Understanding the core meaning of ${formattedSubject} and applying it accurately in context`,
        `Memorizing isolated buzzwords about ${formattedSubject} without knowing how they apply`,
        `Choosing options that rely on rigid, unsupported generalizations`,
        `Skipping how ${formattedSubject} connects to real-world or classroom scenarios`,
      ],
      0,
      `Go with **A**! On the LET, true mastery of **${formattedSubject}** comes from grasping its exact meaning and knowing how to apply or contrast it cleanly under exam pressure.`,
      `Keep those questions coming, ${name}—you're building real mastery every single session!`
    )
  );
}
