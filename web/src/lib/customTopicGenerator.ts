import { DeckTopic, DeckQuestionItem } from '../types.js';

const CUSTOM_TOPICS_STORAGE_KEY = 'bb_custom_topics';
const memoryCacheByQuery = new Map<string, DeckTopic>();
const memoryCacheById = new Map<string, DeckTopic>();

const ACRONYMS = new Set([
  'RA', 'ICT', 'TLE', 'MAPEH', 'LET', 'BLEPT', 'BSED', 'DEPED', 'CHED', 'PRC',
  'PPST', 'NCBTS', 'ZPD', 'DNA', 'RNA', 'ATP', 'PH', 'HOTS', 'LOTS', 'OBE',
  'UBD', 'STEM', 'PISA', 'UNESCO', 'ASEAN', 'EDTECH', 'ESL', 'EFL', 'IQ', 'EQ',
  'ADHD', 'SPED', 'ALS', 'K12', 'MATATAG', 'BP', 'EO', 'PD', 'DO',
]);

export function formatTopicTitle(raw: string): string {
  const cleaned = raw.trim().replace(/\s+/g, ' ');
  if (!cleaned) return 'Board Exam Review Topic';
  return cleaned
    .split(' ')
    .map((word) => {
      const upper = word.toUpperCase();
      if (ACRONYMS.has(upper) || /^[A-Z]{2,5}\d*$/.test(word)) {
        return upper;
      }
      if (/^\d+$/.test(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

export function inferSubjectKey(topicName: string): string {
  const q = topicName.toLowerCase();
  if (/\b(piaget|vygotsky|kohlberg|erikson|bloom|bandura|skinner|pavlov|thorndike|bruner|ausubel|gardner|gagne|maslow|dewey|freire|montessori|scaffolding|zpd|pedagog|curriculum|assessment|rubric|taxonomy|lesson plan|classroom|ra 7836|ra 9293|ra 10533|ra 4670|bp 232|magna carta|code of ethics|teaching|learner|constructivis|behavioris|cognitivis|metacognit|matatag|ppst|ncbts|obtl|obe|ubd)\b/.test(q)) {
    return 'pe';
  }
  if (/\b(algebra|calculus|geometry|trigonometry|statistics|probability|matrix|matrices|derivative|integral|polynomial|equation|logarithm|vector|theorem|pythagor|euclid|number theory|math)\b/.test(q)) {
    return 'math';
  }
  if (/\b(cell|mitosis|meiosis|photosynthesis|respiration|genetics|dna|rna|evolution|ecology|chemistry|atom|molecule|stoichiometry|thermodynamics|physics|newton|kinematics|optics|electricity|magnetism|biology|earth|plate tectonics|astronomy|enzyme|osmosis)\b/.test(q)) {
    return 'sci';
  }
  if (/\b(wika|panitikan|balarila|retorika|tayutay|ponolohiya|morpolohiya|sintaks|semantika|pangungusap|pandiwa|pangngalan|pang-uri|maikling kwento|tula|nobela|dula|noli|el fili|balagtas|filipino|tagalog|komunikasyon|ortograpiya)\b/.test(q)) {
    return 'fil';
  }
  if (/\b(history|kasaysayan|constitution|economics|geography|sociology|anthropology|political|rizal|martial law|philippine|asia|world war|civilization|governance|macroeconomics|microeconomics|supply and demand|gdp|inflation|democracy|sovereignty)\b/.test(q)) {
    return 'soc';
  }
  if (/\b(ict|programming|algorithm|drafting|carpentry|masonry|plumbing|electronics|entrepreneur|accounting|cookery|baking|agriculture|horticulture|aquaculture|tle|industrial arts|home economics|computer)\b/.test(q)) {
    return 'tle';
  }
  if (/\b(music|melody|rhythm|harmony|tempo|arts|painting|sculpture|perspective|physical education|fitness|anatomy|kinesiology|sports|basketball|volleyball|first aid|nutrition|health|mapeh|dance)\b/.test(q)) {
    return 'mapeh';
  }
  if (/\b(ethics|values|virtue|moral|character|deontology|utilitarian|human dignity|empathy|citizenship|pagpapakatao|esp|philosophy of man)\b/.test(q)) {
    return 'val';
  }
  if (/\b(grammar|syntax|phonetics|phonology|semantics|pragmatics|linguistics|literature|poetry|shakespeare|figurative|discourse|rhetoric|reading comprehension|english|speech|morphology)\b/.test(q)) {
    return 'ge';
  }
  return 'majors';
}

export function expandTopicQuestions(t: DeckTopic): DeckQuestionItem[] {
  const baseQs: DeckQuestionItem[] = (t.qs || []).map((q) => ({
    t: t.id,
    q: q[0],
    o: q[1],
    a: q[2],
    w: q[3],
  }));

  const expandedQs: DeckQuestionItem[] = [];

  // 1. Generate questions from cards
  (t.cards || []).forEach(([term, def], cIdx) => {
    const distractors = t.cards
      .filter((_, idx) => idx !== cIdx)
      .map((c) => c[1]);

    while (distractors.length < 3) {
      distractors.push(`An unrelated instructional misconception outside ${t.title}.`);
    }
    // Deterministic rotation for fast, consistent option placement
    const shift = cIdx % 4;
    const opts = [def, distractors[0], distractors[1], distractors[2]];
    const rotated = opts.map((_, idx) => opts[(idx + shift) % 4]);
    const correctIdx = rotated.indexOf(def);

    expandedQs.push({
      t: t.id,
      q: `Which statement most accurately defines or characterizes "${term}" in ${t.title}?`,
      o: rotated,
      a: correctIdx >= 0 ? correctIdx : 0,
      w: `"${term}" in ${t.title} refers to: ${def}`,
    });

    expandedQs.push({
      t: t.id,
      q: `In Secondary Education practice under ${t.title}, what is the primary instructional role of "${term}"?`,
      o: [
        def,
        `To enforce unguided rote drills without conceptual checks.`,
        `To disregard curriculum alignment and learner readiness.`,
        `To eliminate formative feedback during secondary instruction.`,
      ].map((_, i, arr) => arr[(i + ((cIdx + 1) % 4)) % 4]),
      a: (4 - ((cIdx + 1) % 4)) % 4,
      w: `Board Rationale: ${term} — ${def}`,
    });
  });

  // 2. Generate questions from notes
  (t.notes || []).forEach((note, nIdx) => {
    const correctSnippet = note.length > 110 ? `${note.slice(0, 107).trim()}...` : note;
    const shift = nIdx % 4;
    const rawOpts = [
      correctSnippet,
      `It relies purely on passive memorization without secondary classroom application.`,
      `It discourages constructive alignment between competencies and evaluation.`,
      `It restricts student engagement and ignores developmental needs.`,
    ];
    const rotated = rawOpts.map((_, idx) => rawOpts[(idx + shift) % 4]);

    expandedQs.push({
      t: t.id,
      q: `According to the core principles of ${t.title} (Concept ${nIdx + 1}), which takeaway is most accurate for the LET board exam?`,
      o: rotated,
      a: rotated.indexOf(correctSnippet),
      w: `Key Board Concept (${t.title}): ${note}`,
    });

    const shift2 = (nIdx + 2) % 4;
    const rawOpts2 = [
      `Apply it as a learner-centered, evidence-based principle aligned with ${t.title}.`,
      `Treat it as an optional administrative procedure unrelated to pedagogy.`,
      `Replace active assessment with unverified subjective grading.`,
      `Avoid connecting ${t.title} concepts to real-world secondary competencies.`,
    ];
    const rotated2 = rawOpts2.map((_, idx) => rawOpts2[(idx + shift2) % 4]);

    expandedQs.push({
      t: t.id,
      q: `When applying ${t.title} in a board exam situational item ("${note.slice(0, 55).trim()}..."), how should a secondary teacher proceed?`,
      o: rotated2,
      a: rotated2.indexOf(rawOpts2[0]),
      w: `Application Rationale: ${note}`,
    });
  });

  // 3. Procedural & scenario variations from baseQs
  baseQs.forEach((bq, bIdx) => {
    expandedQs.push({
      t: t.id,
      q: `[Board Scenario ${bIdx + 1}] ${bq.q}`,
      o: bq.o,
      a: bq.a,
      w: `Board Exam Rationalization: ${bq.w}`,
    });
    expandedQs.push({
      t: t.id,
      q: `[Classroom Application ${bIdx + 1} · ${t.title}] ${bq.q}`,
      o: bq.o,
      a: bq.a,
      w: `Pedagogical Application: ${bq.w}`,
    });
  });

  const combined = [...baseQs, ...expandedQs];
  const fallbackPool = baseQs.length > 0 ? baseQs : expandedQs;

  while (combined.length < 75 && fallbackPool.length > 0) {
    const base = fallbackPool[combined.length % fallbackPool.length];
    combined.push({
      ...base,
      q: `[LET Mastery Drill #${combined.length + 1} · ${t.title}] ${base.q.replace(/^\[.*?\]\s*/, '')}`,
    });
  }

  return combined;
}

export interface CustomTopicOverrides {
  id?: string;
  title?: string;
  subject_key?: string;
  summary_points?: string[];
  notes?: string[];
  cards?: [string, string][];
  qs?: [string, string[], number, string][];
}

export function buildTopicSpecificSummary(
  rawTopic: string,
  overrides?: CustomTopicOverrides
): DeckTopic {
  const cleanTitle = formatTopicTitle(overrides?.title || rawTopic);
  const subjectKey = overrides?.subject_key || inferSubjectKey(`${rawTopic} ${cleanTitle}`);
  const id = overrides?.id || `ai-${rawTopic.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 32)}-${Date.now()}`;

  const defaultNotes: string[] = [
    `Core Definition (${cleanTitle}): ${cleanTitle} is a high-yield concept tested in the Philippine Licensure Examination for Teachers (LET / BLEPT) for Secondary Education. Examinees must understand both its foundational principles and practical classroom implications.`,
    `Theoretical & Conceptual Mechanics: Mastering ${cleanTitle} requires identifying its defining characteristics, key stages or components, and how it interacts with cognitive, affective, and psychomotor learning outcomes.`,
    `Secondary Classroom Application: In situational board exam items on ${cleanTitle}, always select teaching strategies that foster active inquiry, critical thinking, and developmentally appropriate scaffolding for adolescent learners.`,
    `Curriculum & Standards Alignment: Effective integration of ${cleanTitle} aligns lesson objectives, learning activities, and authentic assessment tasks under the DepEd MATATAG Secondary Curriculum and PPST domains.`,
    `Assessment & Diagnostic Feedback: When evaluating student mastery of ${cleanTitle}, prioritize formative checks, clear analytic rubrics, and timely constructive feedback over isolated rote testing.`,
    `LET Board Exam Rationalization Tip: Watch out for distractors that present ${cleanTitle} as rigid, teacher-centered, or disconnected from learner needs; PRC board items consistently favor ethical, inclusive, and evidence-based application.`,
  ];

  const rawNotes = overrides?.notes?.length
    ? overrides.notes
    : overrides?.summary_points?.length
    ? overrides.summary_points
    : defaultNotes;

  const generatedCards: [string, string][] = [
    [
      `Core Concept of ${cleanTitle}`,
      `The foundational definition, scope, and essential attributes of ${cleanTitle} as applied in Secondary Education LET competencies.`,
    ],
    [
      `Primary Purpose of ${cleanTitle}`,
      `To build meaningful conceptual mastery and support learner-centered instruction grounded in ${cleanTitle}.`,
    ],
    [
      `Classroom Application of ${cleanTitle}`,
      `Designing interactive, contextualized secondary lessons where students actively apply principles of ${cleanTitle}.`,
    ],
    [
      `Constructive Alignment in ${cleanTitle}`,
      `Ensuring learning objectives, teaching activities, and assessment tasks directly measure mastery of ${cleanTitle}.`,
    ],
    [
      `Formative Assessment for ${cleanTitle}`,
      `Using diagnostic checks, exit tickets, and guided questioning to monitor student comprehension of ${cleanTitle} in real time.`,
    ],
    [
      `Higher-Order Thinking (HOTS) & ${cleanTitle}`,
      `Prompting secondary students to analyze, evaluate, and synthesize scenarios involving ${cleanTitle} rather than mere recall.`,
    ],
    [
      `Differentiated Instruction for ${cleanTitle}`,
      `Adapting learning scaffolds, examples, and modalities of ${cleanTitle} to address diverse adolescent readiness and learning profiles.`,
    ],
    [
      `Common Misconception on ${cleanTitle}`,
      `Assuming ${cleanTitle} relies solely on passive memorization instead of active conceptual understanding and contextual application.`,
    ],
    [
      `Curriculum Alignment (MATATAG / K-12) & ${cleanTitle}`,
      `Connecting ${cleanTitle} to Philippine secondary education competencies, spiral progression, and 21st-century skills.`,
    ],
    [
      `Diagnostic Remediation in ${cleanTitle}`,
      `Identifying specific learner gaps in ${cleanTitle} early and providing targeted guided practice and corrective feedback.`,
    ],
    [
      `Professional Ethics & ${cleanTitle}`,
      `Upholding fairness, objectivity, and learner welfare (Code of Ethics, Article VIII) when teaching and assessing ${cleanTitle}.`,
    ],
    [
      `Collaborative Learning with ${cleanTitle}`,
      `Using structured peer discussions and problem-solving tasks so students articulate and defend concepts in ${cleanTitle}.`,
    ],
    [
      `Key LET Exam Clue for ${cleanTitle}`,
      `Look for options emphasizing learner engagement, conceptual clarity, and evidence-based pedagogy tailored to ${cleanTitle}.`,
    ],
    [
      `Authentic Performance Task on ${cleanTitle}`,
      `Evaluating ${cleanTitle} through real-world projects, rubrics, or portfolios that demonstrate applied competence.`,
    ],
    [
      `Metacognitive Reflection on ${cleanTitle}`,
      `Guiding students to self-assess their grasp of ${cleanTitle} and articulate strategies to improve their own learning.`,
    ],
  ];

  const mergedCards: [string, string][] = [
    ...(overrides?.cards || []),
    ...generatedCards,
  ];

  const generatedQs: [string, string[], number, string][] = [
    [
      `In the LET board exam, which statement best captures the core essence of ${cleanTitle} in secondary education?`,
      [
        `It centers on structured conceptual mastery and active, learner-centered application of ${cleanTitle}.`,
        `It relies exclusively on uncontextualized rote memorization without checking understanding.`,
        `It eliminates formative assessment in favor of single end-of-term grading.`,
        `It treats secondary learners as passive recipients with identical background knowledge.`,
      ],
      0,
      `${cleanTitle} requires conceptual clarity paired with active, learner-centered application and formative feedback.`,
    ],
    [
      `A secondary teacher wants to introduce ${cleanTitle} effectively to Grade 9 learners. Which instructional strategy is most appropriate?`,
      [
        `Dictate definitions silently for the entire period without examples.`,
        `Connect ${cleanTitle} to real-world contexts using guided inquiry and structured examples.`,
        `Skip diagnostic checks and immediately administer a high-stakes summative quiz.`,
        `Assign advanced independent derivations without prior scaffolding.`,
      ],
      1,
      `Connecting ${cleanTitle} to relatable contexts with guided inquiry promotes deeper retention and engagement.`,
    ],
    [
      `When applying constructive alignment to a lesson on ${cleanTitle}, what should a teacher verify first?`,
      [
        `Whether the classroom seating arrangement is alphabetical.`,
        `Whether students have memorized every textbook page number.`,
        `Whether the lesson objectives, learning activities, and assessment items all target ${cleanTitle} at the same cognitive level.`,
        `Whether homework is graded solely on neatness rather than ${cleanTitle} accuracy.`,
      ],
      2,
      `Constructive alignment guarantees that objectives, instruction, and assessment coherently measure ${cleanTitle}.`,
    ],
    [
      `During a class discussion on ${cleanTitle}, several students hold a common misconception. What is the best pedagogical response?`,
      [
        `Ignore the misconception and move immediately to the next chapter.`,
        `Penalize students publicly for giving incorrect initial answers.`,
        `Lower grading standards so every answer is marked correct.`,
        `Use targeted diagnostic questions and counter-examples to help learners reconstruct accurate understanding of ${cleanTitle}.`,
      ],
      3,
      `Addressing misconceptions through diagnostic questioning and guided counter-examples builds durable mastery of ${cleanTitle}.`,
    ],
    [
      `Which assessment task best measures Higher-Order Thinking Skills (HOTS) regarding ${cleanTitle}?`,
      [
        `Having students analyze a novel scenario and justify how ${cleanTitle} explains or solves the problem.`,
        `Asking students to spell the term "${cleanTitle}" ten times.`,
        `Having students copy a paragraph about ${cleanTitle} verbatim from the board.`,
        `Testing only whether students remember the chapter title of ${cleanTitle}.`,
      ],
      0,
      `Analyzing novel scenarios and justifying solutions corresponds to Bloom's higher cognitive levels (Analyze/Evaluate/Create).`,
    ],
    [
      `How can a teacher best differentiate instruction while teaching ${cleanTitle} in a diverse secondary classroom?`,
      [
        `Give every student the exact same timed worksheet regardless of readiness.`,
        `Provide tiered scaffolds, visual organizers, and varied practice tasks aligned to the same ${cleanTitle} competency.`,
        `Excuse struggling learners from learning ${cleanTitle} altogether.`,
        `Allow only top-performing students to participate in ${cleanTitle} activities.`,
      ],
      1,
      `Differentiated instruction maintains high expectations for ${cleanTitle} while adapting scaffolds and pathways to learner needs.`,
    ],
    [
      `Under the Philippine Professional Standards for Teachers (PPST) and DepEd curriculum guidelines, how should ${cleanTitle} be evaluated?`,
      [
        `Through unannounced pop quizzes used strictly as disciplinary punishment.`,
        `Solely through attendance records without measuring conceptual progress.`,
        `Using a balanced mix of formative checks and authentic/summative tools anchored to ${cleanTitle} competencies.`,
        `By comparing students against each other rather than against ${cleanTitle} standards.`,
      ],
      2,
      `PPST emphasizes criterion-referenced, formative, and authentic assessment aligned with learning competencies.`,
    ],
    [
      `Which classroom practice violates ethical teaching standards when assessing student performance in ${cleanTitle}?`,
      [
        `Sharing a clear analytic rubric before the ${cleanTitle} performance task.`,
        `Providing timely, specific feedback to help students improve their grasp of ${cleanTitle}.`,
        `Adjusting instructional pacing based on diagnostic quiz data on ${cleanTitle}.`,
        `Changing a student's ${cleanTitle} grade based on personal favoritism or non-academic gifts.`,
      ],
      3,
      `Article VIII of the Code of Ethics mandates that teachers evaluate learners strictly on merit and academic performance.`,
    ],
    [
      `If a formative check reveals that 65% of the class struggled with ${cleanTitle}, what should the teacher do next?`,
      [
        `Reteach the core concepts of ${cleanTitle} using a different modality and targeted scaffolding before advancing.`,
        `Proceed immediately to the final unit test as scheduled.`,
        `Blame the learners for not studying ${cleanTitle} on their own.`,
        `Discard the quiz results and assign extra unrelated seatwork.`,
      ],
      0,
      `Assessment FOR learning uses formative results to adjust instruction and provide timely remediation on ${cleanTitle}.`,
    ],
    [
      `Which collaborative activity best deepens secondary learners' mastery of ${cleanTitle}?`,
      [
        `Silent individual copying of glossary definitions of ${cleanTitle}.`,
        `Structured peer problem-solving where groups apply ${cleanTitle} to a real case and explain their reasoning.`,
        `Having one student complete the group project while others watch.`,
        `Unsupervised free time unrelated to ${cleanTitle}.`,
      ],
      1,
      `Structured collaborative tasks require learners to articulate, test, and refine their understanding of ${cleanTitle}.`,
    ],
    [
      `To foster metacognition (Assessment AS Learning) during a unit on ${cleanTitle}, a teacher should ask students to:`,
      [
        `Wait passively until report cards are released.`,
        `Memorize answers without knowing why they are correct.`,
        `Reflect on which aspects of ${cleanTitle} they understand well, identify errors, and set study strategies.`,
        `Copy a classmate's notes on ${cleanTitle} without reading them.`,
      ],
      2,
      `Assessment AS learning empowers students to self-monitor and regulate their own mastery of ${cleanTitle}.`,
    ],
    [
      `When tackling a difficult LET board question about ${cleanTitle}, which rationalization rule is most reliable?`,
      [
        `Choose the shortest option regardless of context.`,
        `Select options that emphasize teacher convenience over student learning.`,
        `Pick the answer that relies exclusively on punitive discipline or rote drill.`,
        `Eliminate extreme/rigid distractors and select the option that applies ${cleanTitle} ethically, accurately, and learner-centeredly.`,
      ],
      3,
      `LET Professional and Specialization questions consistently reward accurate application, ethics, and learner-centered pedagogy.`,
    ],
  ];

  const mergedQs: [string, string[], number, string][] = [
    ...(overrides?.qs || []),
    ...generatedQs,
  ];

  return {
    id,
    s: subjectKey,
    title: cleanTitle,
    notes: rawNotes,
    cards: mergedCards,
    qs: mergedQs,
  };
}

function loadCustomTopicsArray(): DeckTopic[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_TOPICS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is DeckTopic => Boolean(item && item.id && item.title));
      }
    }
    // Migrate seamlessly if older v1 map exists
    const legacyRaw = window.localStorage.getItem('bb_custom_ai_topics_v1');
    if (legacyRaw) {
      const legacyParsed = JSON.parse(legacyRaw);
      if (legacyParsed && typeof legacyParsed === 'object' && !Array.isArray(legacyParsed)) {
        const list = Object.entries(legacyParsed)
          .filter(([k, v]) => k.startsWith('id:') && v && (v as DeckTopic).id)
          .map(([, v]) => v as DeckTopic)
          .reverse();
        if (list.length > 0) {
          window.localStorage.setItem(CUSTOM_TOPICS_STORAGE_KEY, JSON.stringify(list));
          return list;
        }
      }
    }
    return [];
  } catch {
    return [];
  }
}

function persistCustomTopicsArray(topics: DeckTopic[]) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    // Keep newest 50 custom topics in persistent localStorage array
    window.localStorage.setItem(CUSTOM_TOPICS_STORAGE_KEY, JSON.stringify(topics.slice(0, 50)));
  } catch {
    // Ignore storage quota errors
  }
}

export function saveCustomTopic(queryKey: string, topic: DeckTopic): DeckTopic[] {
  const norm = queryKey.trim().toLowerCase();
  const titleNorm = topic.title.trim().toLowerCase();
  if (norm) memoryCacheByQuery.set(norm, topic);
  if (titleNorm) memoryCacheByQuery.set(titleNorm, topic);
  memoryCacheById.set(topic.id, topic);

  if (typeof window !== 'undefined') {
    const existing = loadCustomTopicsArray();
    const filtered = existing.filter(
      (item) => item.id !== topic.id && item.title.trim().toLowerCase() !== titleNorm
    );
    const updated = [topic, ...filtered];
    persistCustomTopicsArray(updated);
    return updated;
  }

  return [topic];
}

export function getCachedCustomTopic(queryKey: string): DeckTopic | null {
  const norm = queryKey.trim().toLowerCase();
  if (!norm) return null;
  if (memoryCacheByQuery.has(norm)) {
    return memoryCacheByQuery.get(norm)!;
  }
  const stored = loadCustomTopicsArray();
  const hit = stored.find((t) => t.title.trim().toLowerCase() === norm);
  if (hit) {
    memoryCacheByQuery.set(norm, hit);
    memoryCacheById.set(hit.id, hit);
    return hit;
  }
  return null;
}

export function getCustomTopicById(id: string | null | undefined): DeckTopic | null {
  if (!id) return null;
  if (memoryCacheById.has(id)) {
    return memoryCacheById.get(id)!;
  }
  const stored = loadCustomTopicsArray();
  const hit = stored.find((t) => t.id === id);
  if (hit) {
    memoryCacheById.set(id, hit);
    return hit;
  }
  return null;
}

export function getAllCustomTopics(): DeckTopic[] {
  const stored = loadCustomTopicsArray();
  if (stored.length > 0) {
    stored.forEach((t) => {
      memoryCacheById.set(t.id, t);
      memoryCacheByQuery.set(t.title.trim().toLowerCase(), t);
    });
    return stored;
  }
  return Array.from(memoryCacheById.values());
}
