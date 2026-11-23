import { DeckTopic, DeckStudentState, DeckQuestionItem, DeckUser } from '../types.js';
export { expandTopicQuestions } from '../lib/customTopicGenerator.js';

export const C = {
  navy: '#16335A',
  nl: '#1F4478',
  green: '#3E9B52',
  gl: '#A8D8B0',
  blue: '#2563B8',
  sky: '#E8F1FB',
  teal: '#BCE0E6',
  gold: '#E8C77A',
  red: '#D9534F',
  text: '#1B2A41',
  mute: '#6B7C93',
  line: '#D5E2F2',
};

export const SUB: Record<string, string> = {
  pe: 'Professional Ed',
  ge: 'General Ed',
  math: 'Mathematics',
  sci: 'Science',
  fil: 'Filipino',
  soc: 'Social Studies',
  tle: 'TLE',
  mapeh: 'MAPEH',
  val: 'Values Ed',
  majors: 'Secondary Majors',
};

export const SC: Record<string, string> = {
  pe: C.navy,
  ge: C.blue,
  math: C.green,
  sci: C.teal,
  fil: C.gold,
  soc: C.blue,
  tle: C.green,
  mapeh: C.navy,
  val: C.gold,
  majors: C.green,
};

export const USERTYPES = [
  'Graduating Education student',
  'Graduate / first-time taker',
  'Retaker (LET)',
  'Other board exam reviewee',
];

export const NEED = (t: string) =>
  t === 'Graduating Education student'
    ? {
        k: 'Valid student ID',
        d: 'Upload a clear photo of your valid school ID for the current school year.',
      }
    : {
        k: 'Certificate',
        d: 'Upload your Certificate of Graduation, diploma, or official transcript (TOR).',
      };

export const SECONDARY_EDUCATION_COURSES = [
  'Bachelor of Secondary Education (BScEd) - Major in English',
  'Bachelor of Secondary Education (BScEd) - Major in Mathematics',
  'Bachelor of Secondary Education (BScEd) - Major in Science',
  'Bachelor of Secondary Education (BScEd) - Major in Social Studies / Social Sciences',
  'Bachelor of Secondary Education (BScEd) - Major in Filipino',
  'Bachelor of Secondary Education (BScEd) - Major in Values Education',
  'Bachelor of Secondary Education (BScEd) - Major in Music, Arts, Physical Education, and Health (MAPEH)',
  'Bachelor of Secondary Education (BScEd) - Major in Technology and Livelihood Education (TLE)',
  'Bachelor of Secondary Education (BScEd) - Major in Biology',
  'Bachelor of Secondary Education (BScEd) - Major in Chemistry',
  'Bachelor of Secondary Education (BScEd) - Major in Physics',
  'Bachelor of Technical-Vocational Teacher Education (BTVTEd)',
  'Bachelor of Culture and Arts Education (BCAEd)',
] as const;

export const EDUCATION_COURSES = [
  ...SECONDARY_EDUCATION_COURSES,
] as const;

export const DOCUMENT_TYPE_OPTIONS = [
  {
    value: 'STUDENT_ID' as const,
    label: 'Valid Student ID',
    requiredLabel: 'REQUIRED: VALID STUDENT ID',
    helper: 'Upload a clear photo or scan of your valid school ID for the current school year.',
  },
  {
    value: 'CERTIFICATE' as const,
    label: 'Certificate of Graduation / Diploma / TOR',
    requiredLabel: 'REQUIRED: CERTIFICATE OF GRADUATION / DIPLOMA / TOR',
    helper: 'Upload your Certificate of Graduation, Diploma, or Official Transcript of Records (TOR).',
  },
] as const;

export const T: DeckTopic[] = [
  {
    "id": "pe-piaget",
    "s": "pe",
    "free": 1,
    "title": "Piaget's Stages of Cognitive Development",
    "notes": [
      "Jean Piaget proposed four distinct developmental stages: Sensorimotor (0-2 years, development of object permanence and motor skills), Preoperational (2-7 years, egocentrism, animism, centration, symbolic play), Concrete Operational (7-11 years, conservation, reversibility, seriation, inductive logic), and Formal Operational (11+ years, abstract thought, deductive reasoning, hypothetical problem-solving).",
      "Assimilation incorporates new experiences into existing cognitive schemas, while Accommodation alters existing schemas when new information contradicts them. Equilibration is the internal drive maintaining balance between assimilation and accommodation."
    ],
    "cards": [
      [
        "Formal Operational Stage (11+ yrs)",
        "The cognitive stage attained by secondary learners characterized by abstract reasoning, hypothesis formulation, and deductive logic."
      ],
      [
        "Hypothetico-Deductive Reasoning",
        "The adolescent cognitive capacity to systematically formulate hypotheses and test logical consequences."
      ],
      [
        "Schema Accommodation",
        "Modifying or restructuring existing cognitive schemas when adolescents encounter new, contradictory scientific or conceptual evidence."
      ]
    ],
    "qs": [
      [
        "At which cognitive developmental stage does a secondary school learner acquire the cognitive capacity for abstract hypothetical reasoning and deductive logic?",
        [
          "Sensorimotor Stage",
          "Preoperational Stage",
          "Concrete Operational Stage",
          "Formal Operational Stage"
        ],
        3,
        "Formal Operational thought (ages 11+) enables adolescents to think abstractly and formulate hypothetical deductions."
      ],
      [
        "When a student encounters complex scientific concepts and modifies prior knowledge schemas to fit new observations, which cognitive process has occurred?",
        [
          "Assimilation followed by Accommodation",
          "Centration followed by Decentration",
          "Equilibration followed by Fixation",
          "Seriation followed by Classification"
        ],
        0,
        "Fitting new observations into existing concepts is assimilation; modifying the concept when contradictory evidence arises is accommodation."
      ]
    ]
  },
  {
    "id": "pe-bloom",
    "s": "pe",
    "free": 1,
    "title": "Bloom's Revised Taxonomy & Cognitive Dimensions",
    "notes": [
      "Revised by Anderson and Krathwohl (2001), the cognitive hierarchy progresses from Lower-Order Thinking Skills (LOTS) to Higher-Order Thinking Skills (HOTS): Remembering, Understanding, Applying, Analyzing, Evaluating, and Creating.",
      "Creating represents the apex of cognitive learning where students reorganize elements into a new pattern, design original solutions, or formulate hypotheses. Assessment items must align directly with the cognitive level specified in instructional objectives."
    ],
    "cards": [
      [
        "Creating",
        "The highest tier of Bloom's Revised Taxonomy involving designing, producing, constructing, or inventing new products or ideas."
      ],
      [
        "Analyzing",
        "Distinguishing between component parts, detecting organizational relationships, and identifying motives or causes."
      ],
      [
        "Evaluating",
        "Justifying a decision or course of action based on specific internal criteria or external qualitative standards."
      ]
    ],
    "qs": [
      [
        "A secondary school teacher asks students to draft an innovative community disaster-preparedness plan based on local flood data. Which level of Bloom's Taxonomy is targeted?",
        [
          "Analyzing",
          "Evaluating",
          "Applying",
          "Creating"
        ],
        3,
        "Formulating or designing a new plan or product corresponds to 'Creating', the pinnacle of the revised cognitive domain."
      ],
      [
        "Which of the following behavioral objective verbs aligns with the 'Evaluating' level?",
        [
          "Compute",
          "Critique",
          "Recall",
          "Demonstrate"
        ],
        1,
        "'Critique' requires judging the merits, validity, or quality of work against established criteria, characterizing evaluation."
      ]
    ]
  },
  {
    "id": "pe-vygotsky",
    "s": "pe",
    "free": 1,
    "title": "Vygotsky's Sociocultural Theory & Scaffolding",
    "notes": [
      "Lev Vygotsky argued that cognitive development is inherently socially mediated through language and cultural tools. The Zone of Proximal Development (ZPD) represents the distance between what a learner can do independently and what they can achieve with guidance.",
      "Scaffolding (coined by Jerome Bruner within Vygotskian theory) is temporary structural support provided by a More Knowledgeable Other (MKO) that is systematically withdrawn as the learner achieves mastery and autonomy."
    ],
    "cards": [
      [
        "Zone of Proximal Development (ZPD)",
        "The instructional zone where learning is optimal—between independent problem-solving and guided potential."
      ],
      [
        "Scaffolding",
        "Adjustable, temporary instructional support given by a teacher or peer to help a student accomplish a task within their ZPD."
      ],
      [
        "Private Speech",
        "Self-directed verbalization used by learners to regulate their own thinking and behavior before it becomes internalized inner speech."
      ]
    ],
    "qs": [
      [
        "What instructional strategy directly operationalizes Vygotsky's concept of the More Knowledgeable Other (MKO) in the high school classroom?",
        [
          "Unmonitored silent individual study",
          "Peer tutoring and cooperative learning groups",
          "Rote memorization drills",
          "Isolated standardized testing"
        ],
        1,
        "Peer tutoring and cooperative learning leverage more proficient peers or mentors as MKOs within the learners' ZPD."
      ],
      [
        "What is the ultimate educational goal of instructional scaffolding in secondary education?",
        [
          "Perpetual dependence on teacher prompts",
          "Fostering independent self-regulation and mastery",
          "Eliminating curriculum standards",
          "Replacing formative assessments"
        ],
        1,
        "Scaffolding is designed to be gradually faded out as the secondary learner achieves independent mastery and metacognitive self-regulation."
      ]
    ]
  },
  {
    "id": "pe-erikson",
    "s": "pe",
    "free": 1,
    "title": "Erikson's Psychosocial Stages of Development",
    "notes": [
      "Erik Erikson formulated eight epigenetic psychosocial stages spanning the human lifespan, each centered on a developmental crisis: Trust vs. Mistrust, Autonomy vs. Shame/Doubt, Initiative vs. Guilt, Industry vs. Inferiority, Identity vs. Role Confusion, Intimacy vs. Isolation, Generativity vs. Stagnation, and Integrity vs. Despair.",
      "Secondary school learners navigate the vital stage of Identity vs. Role Confusion (ages 12-18), where adolescents strive to integrate their values, vocational aspirations, and self-conception into a coherent personal identity."
    ],
    "cards": [
      [
        "Identity vs. Role Confusion",
        "Adolescent stage (ages 12-18) focused on exploring self-identity, beliefs, and life aspirations to establish a coherent sense of self."
      ],
      [
        "Adolescent Fidelity",
        "The core psychosocial virtue developed when high school learners successfully resolve Identity vs. Role Confusion."
      ],
      [
        "Psychological Moratorium",
        "Erikson's term for a developmental time-out during adolescence allowing youth to explore identity roles before committing."
      ]
    ],
    "qs": [
      [
        "A Grade 10 student experiments with various career interests, personal ideologies, and extracurricular clubs to discover who they really are. Which Eriksonian crisis is being resolved?",
        [
          "Industry vs. Inferiority",
          "Initiative vs. Guilt",
          "Identity vs. Role Confusion",
          "Intimacy vs. Isolation"
        ],
        2,
        "Adolescents in high school actively navigate the developmental crisis of Identity vs. Role Confusion."
      ],
      [
        "According to Erikson, secondary school teachers can best assist adolescents facing Identity vs. Role Confusion by doing which of the following?",
        [
          "Imposing rigid career choices without student input",
          "Providing diverse exploratory opportunities and validating student values",
          "Discouraging peer discussions and identity clubs",
          "Shielding them from all moral and societal choices"
        ],
        1,
        "Adolescents need exploratory freedom, empathetic mentoring, and exposure to diverse role possibilities to build a firm identity."
      ]
    ]
  },
  {
    "id": "pe-kohlberg",
    "s": "pe",
    "free": 1,
    "title": "Kohlberg's Stages of Moral Development",
    "notes": [
      "Lawrence Kohlberg identified three major levels of moral reasoning divided into six stages: Preconventional (Stage 1: Punishment-Obedience, Stage 2: Instrumental Relativist/Individualism), Conventional (Stage 3: Good Boy-Nice Girl interpersonal conformity, Stage 4: Law and Order social system maintenance), and Postconventional (Stage 5: Social Contract/Individual Rights, Stage 6: Universal Ethical Principles).",
      "Secondary students predominantly reason within Conventional Morality (upholding institutional rules and peer loyalty) with emerging capabilities for Postconventional principles (evaluating social justice and universal ethical imperatives)."
    ],
    "cards": [
      [
        "Preconventional Morality",
        "Moral reasoning based strictly on external consequences—avoiding punishment or securing personal rewards."
      ],
      [
        "Conventional Morality",
        "Moral reasoning focused on social approval, conformity, and maintaining societal laws and institutional order."
      ],
      [
        "Postconventional Morality",
        "Highest moral level where ethical choices are guided by democratically agreed social contracts and universal human rights."
      ]
    ],
    "qs": [
      [
        "A high school student refuses to cheat on an exam because 'if everyone cheats, the school rules break down and society cannot trust professionals.' Which Kohlberg level is this?",
        [
          "Stage 1: Punishment-Obedience",
          "Stage 2: Instrumental Relativist",
          "Stage 4: Law and Order (Conventional)",
          "Stage 6: Universal Ethical Principles"
        ],
        2,
        "Upholding laws and social duties to preserve the stability of the institution or society is indicative of Stage 4 Law and Order."
      ],
      [
        "A secondary learner engages in civil advocacy protesting an unjust discriminatory municipal ordinance, arguing human dignity precedes statutory laws. At what stage is this student reasoning?",
        [
          "Stage 1: Punishment and Obedience",
          "Stage 3: Peer Conformity",
          "Stage 5: Social Contract and Individual Rights",
          "Stage 2: Instrumental Exchange"
        ],
        2,
        "Recognizing that laws should protect human dignity and can be challenged when unjust characterizes Stage 5 Postconventional Morality."
      ]
    ]
  },
  {
    "id": "pe-code-ethics",
    "s": "pe",
    "free": 1,
    "title": "Code of Ethics for Professional Teachers (RA 7836 & RA 9293)",
    "notes": [
      "The Code of Ethics governs all licensed teachers in secondary institutions across the Philippines. Key articles outline the teacher's professional responsibilities toward the State (Art. II), Community (Art. III), Profession (Art. IV), Higher Authorities (Art. V), School Officials and Colleagues (Art. VI), Learners (Art. VIII), and Parents (Art. IX).",
      "Crucial board examination mandates include: prohibiting monetary compensation for remedial tutoring of one's own students (Art. VIII, Sec. 5), upholding confidentiality of student records, adhering to proper administrative channels for grievances (Art. V, Sec. 1), and maintaining total neutrality in partisan political activities."
    ],
    "cards": [
      [
        "RA 7836",
        "The Philippine Teachers Professionalization Act of 1994, which instituted the Licensure Examination for Teachers (LET) and the Board for Professional Teachers."
      ],
      [
        "Article VIII, Section 5",
        "Prohibits professional teachers from accepting remuneration for private tutoring from their own students enrolled in their regular classes."
      ],
      [
        "Professional Licensure Revocation",
        "Grounds under RA 7836 include gross immorality, dishonorable conduct, unprofessional practices, and continuous mental or physical incapacity."
      ]
    ],
    "qs": [
      [
        "Teacher Maria is offered ₱2,000 per month by the parents of a struggling student currently in her own Grade 10 section for afternoon tutoring. Under the Code of Ethics, what should she do?",
        [
          "Accept the payment since tutoring is done outside regular school hours",
          "Politely decline and refer the student to another qualified tutor",
          "Demand double the payment for personalized attention",
          "Accept the money but submit 10% to the principal"
        ],
        1,
        "The Code of Ethics strictly prohibits charging remuneration for tutoring one's own students; referring to another qualified tutor prevents conflict of interest."
      ],
      [
        "A secondary school teacher has a formal grievance against a school principal regarding unfair teaching load distribution. What is the ethically mandated recourse?",
        [
          "Publish an exposé on Facebook to gain public sympathy",
          "Present the grievance through official administrative channels and appeals",
          "Lead a wildcat student boycott of the principal's office",
          "Resign immediately without formal turnover"
        ],
        1,
        "Article V of the Code of Ethics specifies that teachers must address administrative complaints and grievances through established official procedures."
      ]
    ]
  },
  {
    "id": "pe-curriculum-dev",
    "s": "pe",
    "free": 1,
    "title": "Curriculum Development Models & Spiral Progression",
    "notes": [
      "Curriculum planning draws from major design models: Ralph Tyler's Objective Model (Purposes → Learning Experiences → Organization → Evaluation), Hilda Taba's Grassroots/Inductive Model (Teacher-initiated needs assessment to units), and Saylor and Alexander's Systematic Model.",
      "Republic Act 10533 (Enhanced Basic Education Act) institutionalized the Spiral Progression Approach, where fundamental concepts are introduced in early grades and systematically revisited at increasing levels of depth, complexity, and application as students advance through Junior and Senior High School."
    ],
    "cards": [
      [
        "Spiral Progression Approach",
        "A curricular design where core concepts are reiterated across grade levels with expanding conceptual depth and cognitive demand."
      ],
      [
        "Tyler's Rationale",
        "A linear, deductive curriculum model centered on educational purposes, experience selection, organization, and objective assessment."
      ],
      [
        "Taba's Inductive Model",
        "A grassroots curriculum approach asserting that teachers who teach the curriculum must participate directly in designing it."
      ]
    ],
    "qs": [
      [
        "In the Philippine secondary curriculum, science concepts like kinematics and chemistry are taught conceptually in Grade 7 and revisited with calculus-based rigor in Senior High. What principle is illustrated?",
        [
          "Fragmented Learning",
          "Spiral Progression Approach",
          "Pure Rote Conditioning",
          "Subject-Centered Compartmentalization"
        ],
        1,
        "Spiral progression revisits fundamental competencies across grade levels with deepening rigor and vertical integration."
      ],
      [
        "Who advocated the inductive grassroots model where classroom teachers are the primary architects of curricular units?",
        [
          "Ralph Tyler",
          "Hilda Taba",
          "Franklin Bobbitt",
          "B.F. Skinner"
        ],
        1,
        "Hilda Taba pioneered the grassroots, teacher-driven inductive model of curriculum development."
      ]
    ]
  },
  {
    "id": "pe-assessment-types",
    "s": "pe",
    "free": 1,
    "title": "Assessment OF, FOR, and AS Learning & Test Construction",
    "notes": [
      "Modern educational measurement distinguishes three paradigms: Assessment OF Learning (Summative; evaluation of final achievement for grading), Assessment FOR Learning (Formative; ongoing feedback during instruction to modify teaching and learning), and Assessment AS Learning (Metacognitive; students monitoring and self-assessing their own learning).",
      "Valid test construction requires creating a Table of Specifications (TOS) to guarantee content validity, balanced cognitive representation according to Bloom's taxonomy, and appropriate item discrimination and difficulty indices."
    ],
    "cards": [
      [
        "Assessment FOR Learning",
        "Diagnostic and formative assessments that inform instructional pacing and provide students with real-time corrective feedback."
      ],
      [
        "Assessment AS Learning",
        "Metacognitive self-assessment and reflection where learners take active responsibility for tracking their own comprehension."
      ],
      [
        "Table of Specifications (TOS)",
        "A test blueprint detailing learning competencies, test item distributions, and cognitive levels to ensure test validity."
      ]
    ],
    "qs": [
      [
        "Before launching a secondary physics unit on thermodynamics, the teacher administers an ungraded diagnostic quiz to discover student misconceptions. This is an example of:",
        [
          "Summative Assessment",
          "Assessment AS Learning",
          "Formative / Diagnostic Assessment FOR Learning",
          "High-stakes Placement Assessment"
        ],
        2,
        "Using assessment data prior to or during instruction to detect gaps and steer pedagogy is Assessment FOR Learning."
      ],
      [
        "Which index indicates that an assessment item was correctly answered by 85% of both high-performing and low-performing examinees?",
        [
          "High difficulty and high discrimination",
          "Low difficulty (easy item) and low discrimination",
          "Moderate difficulty and negative discrimination",
          "High difficulty and zero discrimination"
        ],
        1,
        "An item with 0.85 facility index is easy (low difficulty) and fails to discriminate sharply between upper and lower quartiles."
      ]
    ]
  },
  {
    "id": "pe-learning-theories",
    "s": "pe",
    "free": 1,
    "title": "Behaviorist, Cognitivist, and Constructivist Learning Theories",
    "notes": [
      "Behaviorism (Ivan Pavlov's Classical Conditioning, B.F. Skinner's Operant Conditioning) emphasizes observable behavior shaped by stimuli, positive/negative reinforcement, and extinction.",
      "Social Cognitive Theory (Albert Bandura) highlights observational learning, vicarious reinforcement, and modeling (Attention, Retention, Reproduction, Motivation). Constructivism (Jean Piaget, Jerome Bruner) treats secondary learners as active builders of knowledge through discovery, inquiry, and schema integration."
    ],
    "cards": [
      [
        "Operant Conditioning",
        "B.F. Skinner's paradigm where behavior is shaped and maintained by its environmental consequences (reinforcers or punishers)."
      ],
      [
        "Vicarious Reinforcement",
        "In Bandura's modeling theory, learning occurs when an observer witnesses another person being rewarded for a specific behavior."
      ],
      [
        "Discovery Learning",
        "Jerome Bruner's constructivist methodology where students actively investigate questions to discover principles autonomously."
      ]
    ],
    "qs": [
      [
        "A secondary teacher praises high school students who maintain tidy lab benches, leading to consistent laboratory sanitation. This illustrates:",
        [
          "Classical Conditioning",
          "Positive Reinforcement (Operant Conditioning)",
          "Aversive Conditioning",
          "Latent Learning"
        ],
        1,
        "Providing a desirable stimulus following a behavior to strengthen its future frequency is positive reinforcement."
      ],
      [
        "According to Albert Bandura, what are the four sequential subprocesses essential for successful observational modeling?",
        [
          "Motivation, Extinction, Shaping, Chaining",
          "Attention, Retention, Motor Reproduction, Motivation",
          "Stimulus, Response, Assimilation, Accommodation",
          "Memorization, Recitation, Drill, Assessment"
        ],
        1,
        "Bandura identified Attention, Retention, Motor Reproduction, and Motivation as the four pillars of observational learning."
      ]
    ]
  },
  {
    "id": "pe-tech-teaching",
    "s": "pe",
    "free": 1,
    "title": "Technology for Teaching & Learning: TPACK, SAMR, and Dale's Cone",
    "notes": [
      "The TPACK framework identifies the essential intersection of Technological Knowledge (TK), Pedagogical Knowledge (PK), and Content Knowledge (CK) required for effective 21st-century secondary teaching.",
      "The SAMR Model (Substitution, Augmentation, Modification, Redefinition) evaluates digital tool integration, progressing from mere enhancement to transformative learning tasks. Edgar Dale's Cone of Experience underscores that retention is highest when learners engage in direct, purposeful, hands-on laboratory experiences rather than abstract verbal symbols."
    ],
    "cards": [
      [
        "TPACK Framework",
        "The synthesized interplay of Content Knowledge, Pedagogical Knowledge, and Technological Knowledge for holistic instructional design."
      ],
      [
        "SAMR - Redefinition",
        "The highest tier of the SAMR model where technology enables the creation of novel learning tasks previously inconceivable without it."
      ],
      [
        "Dale's Cone of Experience",
        "A visual model ordering instructional media from concrete direct experiences at the base to abstract verbal representations at the peak."
      ]
    ],
    "qs": [
      [
        "Instead of writing a paper book report, high school students collaborate with international peers via virtual reality to reconstruct an interactive ancient historical settlement. On the SAMR model, this is:",
        [
          "Substitution",
          "Augmentation",
          "Modification",
          "Redefinition"
        ],
        3,
        "Enabling entirely new collaborative, cross-border experiential tasks previously inconceivable without tech is Redefinition."
      ],
      [
        "Based on Edgar Dale's Cone of Experience, which learning activity yields the most durable cognitive retention?",
        [
          "Listening to an audio recording of a lecture",
          "Reading a printed textbook chapter",
          "Engaging in direct, purposeful hands-on laboratory experiences",
          "Viewing a static black-and-white infographic"
        ],
        2,
        "Direct purposeful experiences form the broad, concrete foundation of Dale's Cone and foster maximum retention."
      ]
    ]
  },
  {
    "id": "ge-sva",
    "s": "ge",
    "free": 1,
    "title": "English: Subject-Verb Agreement Rules & Syntax",
    "notes": [
      "Fundamental SVA rules for the LET: Singular subjects mandate singular verbs; plural subjects mandate plural verbs. Intervening prepositional phrases or parenthetical clauses (e.g., 'as well as', 'together with') do NOT alter the number of the true subject.",
      "Indefinite pronouns: 'Everyone, someone, each, either, neither, nobody' are singular. With correlative conjunctions ('either...or', 'neither...nor', 'not only...but also'), the verb must agree with the subject closest to it (proximity rule)."
    ],
    "cards": [
      [
        "Proximity Rule",
        "With 'neither...nor' or 'either...or', the verb agrees in number and person with the nearer subject."
      ],
      [
        "Intervening Phrases",
        "Phrases like 'along with', 'in addition to', and 'together with' do not change the number of the principal subject."
      ],
      [
        "Collective Nouns",
        "Take a singular verb when the group acts as a unified whole, but plural when members act individually."
      ]
    ],
    "qs": [
      [
        "Select the grammatically correct sentence:",
        [
          "The dean, together with the department heads, are attending the summit.",
          "The dean, together with the department heads, is attending the summit.",
          "The dean, together with the department heads, were attending the summit.",
          "The dean, together with the department heads, have attended the summit."
        ],
        1,
        "The subject is 'The dean' (singular); the intervening phrase 'together with the department heads' does not change verb agreement."
      ],
      [
        "Choose the sentence that correctly follows the proximity rule:",
        [
          "Neither the teacher nor the students was ready for the fire drill.",
          "Neither the students nor the teacher were ready for the fire drill.",
          "Neither the teacher nor the students were ready for the fire drill.",
          "Neither the teacher or the students are ready for the fire drill."
        ],
        2,
        "The subject closest to the verb is 'the students' (plural), which takes the plural verb 'were'."
      ]
    ]
  },
  {
    "id": "ge-rizal",
    "s": "ge",
    "free": 1,
    "title": "Philippine History: Rizal's Life, Works, and Nationalism",
    "notes": [
      "Dr. Jose Rizal's foundational masterpieces: Noli Me Tangere (Berlin, 1887) exposes the socio-political cancer of colonial Philippines, while El Filibusterismo (Ghent, 1891) is a darker, revolutionary sequel dedicated to the martyred priests GOMBURZA (1872).",
      "Key historical landmarks: The Propaganda Movement, La Liga Filipina (founded July 3, 1892 in Tondo), Rizal's exile to Dapitan, his execution at Bagumbayan on December 30, 1896, and the subsequent Philippine Declaration of Independence in Kawit, Cavite on June 12, 1898 under General Emilio Aguinaldo."
    ],
    "cards": [
      [
        "GOMBURZA",
        "Fathers Mariano Gomez, Jose Burgos, and Jacinto Zamora, executed in 1872 following the Cavite Mutiny, whose martyrdom inspired Rizal."
      ],
      [
        "El Filibusterismo",
        "Rizal's political novel published in Ghent (1891) focusing on revolutionary action, vengeance, and ideological disenchantment through the character Simoun."
      ],
      [
        "La Liga Filipina",
        "A civic organization established by Rizal on July 3, 1892 advocating mutual protection, education, and economic reforms."
      ]
    ],
    "qs": [
      [
        "To whom did Dr. Jose Rizal dedicate his second novel, El Filibusterismo?",
        [
          "To his mother, Teodora Alonzo",
          "To the Filipino youth (A La Juventud Filipina)",
          "To the three martyred priests GOMBURZA",
          "To Andres Bonifacio and the Katipunan"
        ],
        2,
        "El Filibusterismo was explicitly dedicated to the memory of Fathers Gomez, Burgos, and Zamora (GOMBURZA)."
      ],
      [
        "Where and when was Philippine Independence from Spanish colonial rule officially proclaimed?",
        [
          "Malolos, Bulacan on January 23, 1899",
          "Kawit, Cavite on June 12, 1898",
          "Balintawak on August 26, 1896",
          "Luneta on December 30, 1896"
        ],
        1,
        "General Emilio Aguinaldo proclaimed Philippine Independence in Kawit, Cavite on June 12, 1898."
      ]
    ]
  },
  {
    "id": "ge-math-percent",
    "s": "ge",
    "free": 1,
    "title": "General Mathematics: Ratios, Proportions, and Percentages",
    "notes": [
      "LET mathematical problem-solving formulas: Percentage = Base × Rate. Simple Interest = Principal × Rate × Time (I = Prt). Total Amount = P + I.",
      "Proportion types: Direct proportion (as one quantity increases, the other increases proportionally, x₁/y₁ = x₂/y₂), Inverse proportion (as one increases, the other decreases proportionally, x₁y₁ = x₂y₂), and Partitive proportion (partitioning a total into given ratio parts)."
    ],
    "cards": [
      [
        "Inverse Proportion",
        "A relationship where the product of two variables remains constant; more workers means fewer required days."
      ],
      [
        "Partitive Proportion",
        "Dividing a given total quantity into multiple unequal portions according to a specified ratio."
      ],
      [
        "Simple Interest Formula",
        "I = Prt, where P is principal, r is annual interest rate expressed as a decimal, and t is time in years."
      ]
    ],
    "qs": [
      [
        "If 6 painters can finish painting a school building in 8 days, how many days will it take 12 painters working at the same speed?",
        [
          "16 days",
          "4 days",
          "10 days",
          "6 days"
        ],
        1,
        "This is an inverse proportion: 6 × 8 = 12 × d → 48 = 12d → d = 4 days."
      ],
      [
        "A sum of ₱10,000 is invested at an annual simple interest rate of 5% for 3 years. What is the total accumulated interest?",
        [
          "₱500",
          "₱1,000",
          "₱1,500",
          "₱2,000"
        ],
        2,
        "I = Prt = 10,000 × 0.05 × 3 = ₱1,500."
      ]
    ]
  },
  {
    "id": "ge-bio-eco",
    "s": "ge",
    "free": 1,
    "title": "General Science: Ecosystems, Food Webs, and Biodiversity",
    "notes": [
      "Ecological hierarchy: Organism → Population (same species) → Community (interacting populations) → Ecosystem (biotic and abiotic factors) → Biosphere.",
      "Energy flow follows the 10% Rule (Lindeman's efficiency law): approximately 10% of chemical energy transfers to the next trophic level, with 90% lost primarily as metabolic heat. Symbiotic relationships include Mutualism (+/+), Commensalism (+/0), and Parasitism (+/-)."
    ],
    "cards": [
      [
        "10% Energy Rule",
        "Only about 10% of energy stored in biomass at one trophic level is transferred to consumers at the next level."
      ],
      [
        "Commensalism",
        "A symbiotic relationship where one organism benefits while the other is neither harmed nor helped."
      ],
      [
        "Carrying Capacity (K)",
        "The maximum population size of a species that an environment can sustain indefinitely given available resources."
      ]
    ],
    "qs": [
      [
        "If primary producers synthesize 10,000 kcal of energy, approximately how much energy is available to secondary consumers?",
        [
          "10,000 kcal",
          "1,000 kcal",
          "100 kcal",
          "10 kcal"
        ],
        2,
        "Producers (10,000 kcal) → Primary consumers (1,000 kcal) → Secondary consumers (100 kcal), following the 10% rule."
      ],
      [
        "An orchid attaching itself to the trunk of a large mango tree without penetrating or harming the tree exemplifies which relationship?",
        [
          "Parasitism",
          "Mutualism",
          "Commensalism",
          "Predation"
        ],
        2,
        "The orchid benefits from physical support and access to sunlight while the host tree remains unaffected (Commensalism)."
      ]
    ]
  },
  {
    "id": "ge-earth-science",
    "s": "ge",
    "free": 1,
    "title": "Earth Science: Plate Tectonics, Weather, and Philippine Typhoons",
    "notes": [
      "The Earth's crust is fragmented into tectonic plates moving over the asthenosphere. Boundary types: Divergent (plates separate, forming rift valleys and mid-ocean ridges), Convergent (plates collide, forming subduction zones, deep trenches, and volcanic arcs), and Transform (plates slide horizontally, causing strike-slip earthquakes).",
      "The Philippines sits within the Pacific Ring of Fire and Typhoon Belt. Tropical cyclones develop over warm ocean waters (≥26.5°C) and are categorized by PAGASA based on maximum sustained winds (TD, TS, STS, TY, Super Typhoon)."
    ],
    "cards": [
      [
        "Pacific Ring of Fire",
        "A major geological basin characterized by frequent earthquakes and active volcanic eruptions surrounding the Pacific Ocean."
      ],
      [
        "Convergent Boundary Subduction",
        "Geological process where a denser oceanic plate sinks beneath a lighter continental plate into the mantle."
      ],
      [
        "PAGASA Cyclone Thresholds",
        "Tropical depressions (<62 km/h), storms (62-88 km/h), severe storms (89-117 km/h), typhoons (118-184 km/h), super typhoons (≥185 km/h)."
      ]
    ],
    "qs": [
      [
        "What geological feature is formed when the oceanic Philippine Sea Plate subducts beneath the continental Eurasian Plate?",
        [
          "Mid-Atlantic Ridge",
          "The Philippine Deep / Philippine Trench and volcanic arcs",
          "San Andreas Fault",
          "Himalayan Mountain Range"
        ],
        1,
        "Oceanic subduction along convergent margins generates deep oceanic trenches (such as the Philippine Trench) and volcanic island arcs."
      ],
      [
        "What critical environmental condition is mandatory for the genesis and intensification of tropical cyclones in the Pacific?",
        [
          "Cold ocean surface temperatures below 15°C",
          "Warm sea surface temperatures of at least 26.5°C and low vertical wind shear",
          "Dry continental air masses with descending atmospheric pressure",
          "Intense high-altitude polar jet streams"
        ],
        1,
        "Warm ocean water of at least 26.5°C supplies the continuous latent heat of condensation driving tropical cyclone convection."
      ]
    ]
  },
  {
    "id": "ge-figures-speech",
    "s": "ge",
    "free": 1,
    "title": "Literature: Figures of Speech & Figurative Devices",
    "notes": [
      "Core literary devices frequently tested in the LET: Simile (explicit comparison using 'like' or 'as'), Metaphor (direct implicit comparison without connective words), Personification (endowing inanimate objects with human attributes), and Hyperbole (deliberate, dramatic exaggeration for effect).",
      "Advanced devices: Metonymy (substituting the name of an attribute for that of the thing meant, e.g., 'the pen is mightier than the sword'), Synecdoche (a part representing the whole, e.g., 'hired hands'), Oxymoron (juxtaposing contradictory terms, e.g., 'deafening silence'), and Irony (contrast between expectation and reality)."
    ],
    "cards": [
      [
        "Synecdoche",
        "A figure of speech where a part is used to represent the whole, such as 'fifty sail' representing fifty ships."
      ],
      [
        "Metonymy",
        "A rhetorical device where an associated concept or symbol replaces the actual entity, such as 'the Palace' referring to the President."
      ],
      [
        "Oxymoron",
        "A compressed figure of speech combining mutually contradictory or incongruous terms, such as 'cruel kindness'."
      ]
    ],
    "qs": [
      [
        "Identify the figure of speech in: 'Malacañang announced new educational subsidies for board examinees.'",
        [
          "Synecdoche",
          "Metonymy",
          "Hyperbole",
          "Personification"
        ],
        1,
        "Using the seat of government ('Malacañang') to denote the Philippine President or executive administration is an example of metonymy."
      ],
      [
        "'The classroom was a bustling beehive of productive activity.' Which figure of speech is employed?",
        [
          "Simile",
          "Metaphor",
          "Apostrophe",
          "Onomatopoeia"
        ],
        1,
        "Directly stating that the classroom was a beehive without using 'like' or 'as' is a direct metaphor."
      ]
    ]
  },
  {
    "id": "ge-fil-balarila",
    "s": "ge",
    "free": 1,
    "title": "Wikang Filipino: Wastong Gamit ng mga Salita at Balarila",
    "notes": [
      "Mga pangunahing tuntunin sa LET: Gamit ng 'ng' (pananda ng layon ng pandiwa o pagmamay-ari) at 'nang' (katumbas ng 'when', 'so that', paraan ng kilos, o inuulit na pandiwa tulad ng 'takbo nang takbo').",
      "Gamit ng 'din/raw' (kasunod ng mga salitang nagtatapos sa katinig maliban sa w at y) vs 'rin/daw' (kasunod ng mga patinig at malapatinig na w at y). Tuntunin sa 'may' (sinusundan ng pangngalan, pandiwa, pang-uri) vs 'mayroon' (sinusundan ng kataga o panuring, o sagot sa tanong)."
    ],
    "cards": [
      [
        "Ng vs. Nang",
        "Ang 'ng' ay pananda ng tuwirang layon at pag-aari; ang 'nang' ay pang-abay na pamaraan, pangatnig (upang/noong), at sa inuulit na pandiwa."
      ],
      [
        "Rin / Daw vs. Din / Daw",
        "Ginagamit ang 'rin/daw' kapag ang sinusundang salita ay nagtatapos sa patinig (a, e, i, o, u) at malapatinig (w, y)."
      ],
      [
        "Subukin vs. Subukan",
        "Ang 'subukin' ay pagsusuri sa bisa, tibay, o husay; ang 'subukan' ay lihim na pagmamanman o paninubok sa kilos ng tao."
      ]
    ],
    "qs": [
      [
        "Piliin ang pangungusap na may pinakawastong gamit ng salita:",
        [
          "Mag-aral ka ng mabuti nang makapasa ka sa LET.",
          "Mag-aral ka nang mabuti nang makapasa ka sa LET.",
          "Mag-aral ka ng mabuti ng makapasa ka sa LET.",
          "Mag-aral ka nang mabuti ng makapasa ka sa LET."
        ],
        1,
        "Ang unang 'nang' ay pamaraan (paano mag-aral: nang mabuti) at ang ikalawang 'nang' ay pangatnig na nangangahulugang 'upang'."
      ],
      [
        "Punan ang patlang: 'Masaya ___ si Maria sa kanyang mataas na markang nakuha sa pagsusulit.'",
        [
          "din",
          "rin",
          "daw",
          "ng"
        ],
        1,
        "Dahil ang salitang 'Masaya' ay nagtatapos sa patinig na 'a', ang angkop na kataga ay 'rin'."
      ]
    ]
  },
  {
    "id": "ge-gov-citizenship",
    "s": "ge",
    "free": 1,
    "title": "Philippine Government: 1987 Constitution & Human Rights",
    "notes": [
      "The 1987 Philippine Constitution establishes a democratic, republican state with three separate, co-equal branches: Executive (enforces laws; headed by President), Legislative (enacts laws; bicameral Senate and House of Representatives), and Judicial (interprets laws; Supreme Court and lower courts).",
      "Article III (Bill of Rights) guarantees due process of law, equal protection, protection against unreasonable searches and seizures, freedom of speech, assembly, and religion, and the right to bail. Three Constitutional Commissions: Civil Service Commission (CSC), Commission on Elections (COMELEC), and Commission on Audit (COA)."
    ],
    "cards": [
      [
        "Checks and Balances",
        "The constitutional mechanism allowing each government branch to limit and review the powers of the other branches."
      ],
      [
        "Bill of Rights (Article III)",
        "Fundamental charter of civil liberties protecting private citizens from governmental arbitrariness and abuses of power."
      ],
      [
        "Writ of Habeas Corpus",
        "An order requiring an imprisoned person to be brought before a court to determine the legality of their detention."
      ]
    ],
    "qs": [
      [
        "Which constitutional body is tasked with the sole power to audit all accounts and expenditures of government funds and properties?",
        [
          "Civil Service Commission (CSC)",
          "Commission on Elections (COMELEC)",
          "Commission on Audit (COA)",
          "Bureau of Internal Revenue (BIR)"
        ],
        2,
        "The Commission on Audit (COA) is the independent constitutional commission with exclusive audit authority over public funds."
      ],
      [
        "According to Article III, Section 1 of the 1987 Constitution, no person shall be deprived of life, liberty, or property without:",
        [
          "Trial by a jury of peers",
          "Due process of law",
          "Prior approval of Congress",
          "Written presidential decree"
        ],
        1,
        "Due process of law is the fundamental constitutional prerequisite for deprivation of life, liberty, or property."
      ]
    ]
  },
  {
    "id": "ge-ict-literacy",
    "s": "ge",
    "free": 1,
    "title": "ICT Literacy: Digital Tools, Cybersecurity, and AI Ethics",
    "notes": [
      "Core competencies in Information and Communications Technology (ICT): Hardware architecture (CPU, RAM, ROM, storage), system and application software, cloud storage ecosystems, and modern spreadsheet analytical tools (VLOOKUP, IF, AVERAGE formulas).",
      "Cybersecurity mandates: Republic Act 10173 (Data Privacy Act of 2012) protects individual personal sensitive information. Ethical computing covers intellectual property, plagiarism, phishing prevention, and safe, critical evaluation of artificial intelligence content in education."
    ],
    "cards": [
      [
        "RA 10173 (Data Privacy Act)",
        "Philippine law safeguarding the fundamental human right to privacy of communication while fostering safe information flows."
      ],
      [
        "Phishing",
        "A fraudulent cybercrime technique attempting to acquire sensitive credentials through deceptive emails or mock websites."
      ],
      [
        "RAM vs ROM",
        "RAM (Random Access Memory) is volatile temporary operational memory; ROM (Read-Only Memory) is non-volatile permanent boot memory."
      ]
    ],
    "qs": [
      [
        "What Philippine legislation imposes criminal penalties on unauthorized processing and security breaches of sensitive personal information?",
        [
          "Cybercrime Prevention Act (RA 10175)",
          "Data Privacy Act of 2012 (RA 10173)",
          "Electronic Commerce Act (RA 8792)",
          "Anti-Wiretapping Act (RA 4200)"
        ],
        1,
        "Republic Act 10173 specifically establishes national data privacy standards and enforces protective penalties."
      ],
      [
        "Which computer memory component loses all stored active data when power is switched off?",
        [
          "Read-Only Memory (ROM)",
          "Solid-State Drive (SSD)",
          "Random Access Memory (RAM)",
          "Optical Disc Drive"
        ],
        2,
        "RAM is volatile memory whose contents are wiped immediately when power is severed."
      ]
    ]
  },
  {
    "id": "ge-world-lit",
    "s": "ge",
    "free": 1,
    "title": "World Literature: Masterpieces and Classical Mythology",
    "notes": [
      "Greek and Roman mythology forms the bedrock of Western classical literature: Homer's Iliad (Trojan War and Achilles' wrath) and Odyssey (Odysseus' decade-long journey home). Sophocles' tragic plays include Oedipus Rex and Antigone.",
      "Renaissance to modern classics: Dante Alighieri's The Divine Comedy (Inferno, Purgatorio, Paradiso), William Shakespeare's immortal tragedies (Hamlet, Macbeth, Othello, King Lear), and Miguel de Cervantes' Don Quixote (satire of chivalric romance)."
    ],
    "cards": [
      [
        "Homer's Iliad",
        "The ancient Greek epic detailing the siege of Troy, focusing centrally on the tragic wrath of the hero Achilles."
      ],
      [
        "The Divine Comedy",
        "Dante's monumental allegorical journey through Hell (Inferno), Purgatory, and Heaven, guided initially by Virgil."
      ],
      [
        "Hamlet's Tragic Flaw",
        "The Prince of Denmark's profound indecisiveness and existential procrastination ('To be or not to be')."
      ]
    ],
    "qs": [
      [
        "Who serves as Dante Alighieri's trusted classical guide through the nine circles of Hell in the 'Inferno'?",
        [
          "Homer",
          "Virgil",
          "Beatrice",
          "Aristotle"
        ],
        1,
        "The ancient Roman poet Virgil acts as Dante's guide through Inferno and Purgatorio."
      ],
      [
        "Which Shakespearean tragedy centers on the destructive consequences of unchecked political ambition fueled by supernatural prophecies?",
        [
          "Hamlet",
          "Romeo and Juliet",
          "Macbeth",
          "The Tempest"
        ],
        2,
        "Macbeth dramatizes the psychological ruin and tyranny wrought by naked ambition after witches prophesy his kingship."
      ]
    ]
  },
  {
    "id": "math-quad",
    "s": "math",
    "free": 1,
    "title": "Quadratic Equations, Functions, and Parabolas",
    "notes": [
      "Standard quadratic form is ax² + bx + c = 0 (where a ≠ 0). The quadratic formula is x = (-b ± √(b² - 4ac)) / (2a). The discriminant D = b² - 4ac dictates the nature of the roots: D > 0 yields two distinct real roots; D = 0 yields one real double root; D < 0 yields two complex conjugate roots.",
      "Vertex form of a parabola is y = a(x - h)² + k, where the vertex coordinates are given by h = -b / (2a) and k = f(h). The parabola opens upwards if a > 0 and downwards if a < 0."
    ],
    "cards": [
      [
        "Discriminant (b² - 4ac)",
        "Determines whether roots are real and unequal (>0), real and equal (=0), or non-real complex (<0)."
      ],
      [
        "Vertex of a Parabola",
        "The peak maximum or lowest minimum point located at coordinates (-b/2a, c - b²/4a)."
      ],
      [
        "Sum and Product of Roots",
        "For ax² + bx + c = 0, sum of roots x₁ + x₂ = -b/a, and product of roots x₁x₂ = c/a."
      ]
    ],
    "qs": [
      [
        "What is the discriminant of the quadratic equation 3x² - 6x + 3 = 0, and what does it indicate about the roots?",
        [
          "D = 0; exactly one real root",
          "D = 72; two distinct real roots",
          "D = -36; two complex roots",
          "D = 12; irrational roots"
        ],
        0,
        "D = b² - 4ac = (-6)² - 4(3)(3) = 36 - 36 = 0, indicating two equal real roots (one real root)."
      ],
      [
        "For the quadratic function f(x) = x² - 8x + 12, what are the coordinates of the vertex?",
        [
          "(4, -4)",
          "(-4, 4)",
          "(8, 12)",
          "(2, 6)"
        ],
        0,
        "h = -b/(2a) = -(-8)/(2*1) = 4. k = (4)² - 8(4) + 12 = 16 - 32 + 12 = -4. Vertex = (4, -4)."
      ]
    ]
  },
  {
    "id": "math-geom",
    "s": "math",
    "free": 1,
    "title": "Euclidean Geometry: Triangles and Circle Theorems",
    "notes": [
      "Triangle fundamentals: Interior angle sum is always 180°. Triangle Inequality Theorem dictates that the sum of the lengths of any two sides must strictly exceed the length of the third side. Pythagorean Theorem (a² + b² = c²) applies to right triangles.",
      "Circle theorems: An inscribed angle is equal to half the measure of its intercepted arc. An angle inscribed in a semicircle is a right angle (90°). Tangents drawn from an external point to a circle are equal in length."
    ],
    "cards": [
      [
        "Triangle Inequality Theorem",
        "The sum of the lengths of any two sides of a triangle must always be greater than the third side."
      ],
      [
        "Inscribed Angle Theorem",
        "The measure of an inscribed angle is exactly half the measure of its intercepted central arc."
      ],
      [
        "Thales' Theorem",
        "If points A, B, and C lie on a circle where AB is a diameter, the inscribed angle ∠ACB is 90°."
      ]
    ],
    "qs": [
      [
        "Which of the following sets of side lengths CANNOT form a valid geometric triangle?",
        [
          "3 cm, 4 cm, 5 cm",
          "7 cm, 10 cm, 15 cm",
          "4 cm, 6 cm, 11 cm",
          "8 cm, 8 cm, 8 cm"
        ],
        2,
        "In 4, 6, and 11: 4 + 6 = 10, which is NOT greater than 11. It violates the triangle inequality theorem."
      ],
      [
        "If an inscribed angle in a circle intercepts an arc measuring 130°, what is the degree measure of the inscribed angle?",
        [
          "130°",
          "65°",
          "260°",
          "90°"
        ],
        1,
        "The measure of an inscribed angle is half of its intercepted arc: 130° / 2 = 65°."
      ]
    ]
  },
  {
    "id": "math-trig",
    "s": "math",
    "free": 1,
    "title": "Trigonometric Functions, Identities, and Laws",
    "notes": [
      "Primary trigonometric ratios: sin θ = Opposite/Hypotenuse, cos θ = Adjacent/Hypotenuse, tan θ = Opposite/Adjacent (SOH-CAH-TOA). Fundamental Pythagorean identity: sin²θ + cos²θ = 1, tan²θ + 1 = sec²θ, 1 + cot²θ = csc²θ.",
      "Laws for oblique triangles: Law of Sines (a/sin A = b/sin B = c/sin C) used for AAS, ASA, and SSA cases. Law of Cosines (c² = a² + b² - 2ab cos C) used for SAS and SSS configurations."
    ],
    "cards": [
      [
        "Pythagorean Identity",
        "sin²θ + cos²θ = 1 for any real angle θ."
      ],
      [
        "Law of Sines",
        "a/sin A = b/sin B = c/sin C; establishes proportions between side lengths and opposite angle sines."
      ],
      [
        "Law of Cosines",
        "c² = a² + b² - 2ab cos C; generalizes the Pythagorean theorem to any oblique triangle."
      ]
    ],
    "qs": [
      [
        "If sin θ = 3/5 in the first quadrant, what is the exact value of cos θ?",
        [
          "4/5",
          "5/4",
          "3/4",
          "2/5"
        ],
        0,
        "cos θ = √(1 - sin²θ) = √(1 - (3/5)²) = √(1 - 9/25) = √(16/25) = 4/5."
      ],
      [
        "In triangle ABC, side a = 5, side b = 7, and the included angle C = 60°. What formula determines side c?",
        [
          "Law of Sines",
          "Law of Cosines",
          "Pythagorean Theorem",
          "Heron's Formula"
        ],
        1,
        "When two sides and the included angle (SAS) are known, the Law of Cosines must be applied."
      ]
    ]
  },
  {
    "id": "math-prob",
    "s": "math",
    "free": 1,
    "title": "Probability, Permutations, and Combinations",
    "notes": [
      "Fundamental Counting Principle: If task 1 can be done in n₁ ways and task 2 in n₂ ways, both can be done in n₁ × n₂ ways.",
      "Permutation (order matters): nPr = n! / (n - r)!. Circular permutations of n items: (n - 1)!. Combination (order does not matter): nCr = n! / (r!(n - r)!). Probability of event E: P(E) = n(E) / n(S), where 0 ≤ P(E) ≤ 1."
    ],
    "cards": [
      [
        "Permutation (nPr)",
        "An arrangement of items where order is paramount; n! / (n - r)!."
      ],
      [
        "Combination (nCr)",
        "A selection of items where order does not matter; n! / (r!(n - r)!)."
      ],
      [
        "Complementary Probability",
        "P(E') = 1 - P(E); the probability that an event does NOT occur."
      ]
    ],
    "qs": [
      [
        "In how many distinct ways can a committee of 3 teachers be chosen from a department of 8 teachers?",
        [
          "336",
          "56",
          "24",
          "120"
        ],
        1,
        "Order is irrelevant (Combination): 8C3 = 8! / (3! * 5!) = (8 × 7 × 6) / (3 × 2 × 1) = 56."
      ],
      [
        "A standard six-sided die is rolled once. What is the probability of rolling a prime number?",
        [
          "1/6",
          "1/2",
          "2/3",
          "1/3"
        ],
        1,
        "The prime numbers between 1 and 6 are 2, 3, and 5 (3 favorable outcomes out of 6). P = 3/6 = 1/2."
      ]
    ]
  },
  {
    "id": "math-stats",
    "s": "math",
    "free": 1,
    "title": "Descriptive Statistics: Measures of Central Tendency & Dispersion",
    "notes": [
      "Measures of central tendency: Mean (arithmetic average, sensitive to outliers), Median (middle value of ordered data, robust against extreme values), and Mode (most frequent score).",
      "Measures of dispersion: Range (Max - Min), Variance (mean of squared deviations from the mean), and Standard Deviation (square root of variance). In a standard normal distribution, ~68% of scores fall within ±1 SD, ~95% within ±2 SD, and ~99.7% within ±3 SD."
    ],
    "cards": [
      [
        "Median",
        "The positional midpoint of sorted data; best measure of central tendency for highly skewed distributions."
      ],
      [
        "Standard Deviation",
        "The measure of data dispersion showing how far individual observations spread around the arithmetic mean."
      ],
      [
        "Z-Score Formula",
        "z = (X - μ) / σ; indicates how many standard deviations a raw score lies above or below the population mean."
      ]
    ],
    "qs": [
      [
        "Which measure of central tendency is most reliable when analyzing teacher salary distributions containing extreme high outliers?",
        [
          "Mean",
          "Median",
          "Mode",
          "Variance"
        ],
        1,
        "The median is positional and unaffected by extreme outliers, making it the most accurate measure for skewed data."
      ],
      [
        "If exam scores follow a normal distribution with a mean of 75 and a standard deviation of 5, what percentage of examinees scored between 70 and 80?",
        [
          "50%",
          "68%",
          "95%",
          "99.7%"
        ],
        1,
        "Between 70 and 80 represents the interval μ ± 1σ (75 - 5 to 75 + 5), which encompasses approximately 68% of a normal distribution."
      ]
    ]
  },
  {
    "id": "math-num-theory",
    "s": "math",
    "free": 1,
    "title": "Number Theory, Divisibility Rules, and Modular Arithmetic",
    "notes": [
      "Prime numbers have exactly two distinct positive divisors (1 and itself). 2 is the only even prime. Fundamental Theorem of Arithmetic: Every integer > 1 can be uniquely factored into prime powers.",
      "Divisibility rules: Divisible by 3 if sum of digits is divisible by 3; by 4 if last two digits form a number divisible by 4; by 8 if last three digits are divisible by 8; by 9 if digit sum is divisible by 9; by 11 if alternating sum of digits is divisible by 11. Greatest Common Divisor (GCD) and Least Common Multiple (LCM) satisfy: a × b = GCD(a,b) × LCM(a,b)."
    ],
    "cards": [
      [
        "Fundamental Theorem of Arithmetic",
        "Every positive integer greater than 1 has a unique prime factorization up to order."
      ],
      [
        "GCD and LCM Identity",
        "For any two positive integers a and b: GCD(a, b) × LCM(a, b) = a × b."
      ],
      [
        "Prime vs. Composite",
        "Primes have exactly 2 factors; composite numbers have more than 2; 1 is neither prime nor composite."
      ]
    ],
    "qs": [
      [
        "What is the Greatest Common Divisor (GCD) of 48 and 72?",
        [
          "12",
          "24",
          "144",
          "6"
        ],
        1,
        "Prime factors: 48 = 2⁴ × 3; 72 = 2³ × 3². GCD = 2³ × 3 = 8 × 3 = 24."
      ],
      [
        "Which of the following numbers is divisible by 11 without a remainder?",
        [
          "2,816",
          "3,415",
          "1,924",
          "5,123"
        ],
        0,
        "For 2,816: (2 + 1) - (8 + 6) = 3 - 14 = -11, which is divisible by 11."
      ]
    ]
  },
  {
    "id": "math-calc-diff",
    "s": "math",
    "free": 1,
    "title": "Differential Calculus: Limits, Continuity, and Derivatives",
    "notes": [
      "A limit lim(x→a) f(x) exists if and only if left-hand limit equals right-hand limit. A function is continuous at x = a if f(a) is defined, the limit exists, and lim f(x) = f(a).",
      "Derivative rules: Power Rule d/dx[xⁿ] = n xⁿ⁻¹; Product Rule d/dx[uv] = u'v + uv'; Quotient Rule d/dx[u/v] = (u'v - uv') / v²; Chain Rule d/dx[f(g(x))] = f'(g(x)) g'(x). Derivatives yield instantaneous rate of change and the slope of the tangent line to a curve."
    ],
    "cards": [
      [
        "Power Rule",
        "d/dx [xⁿ] = n xⁿ⁻¹ for any real exponent n."
      ],
      [
        "Critical Point",
        "A point in the domain where f'(x) = 0 or f'(x) is undefined; candidate for relative extrema."
      ],
      [
        "First Derivative Test",
        "If f'(x) changes from positive to negative, f has a local maximum; if negative to positive, a local minimum."
      ]
    ],
    "qs": [
      [
        "What is the first derivative of f(x) = 4x³ - 5x² + 7x - 9?",
        [
          "12x² - 10x + 7",
          "4x² - 5x + 7",
          "12x³ - 10x² + 7",
          "24x - 10"
        ],
        0,
        "Applying the power rule: d/dx(4x³) = 12x², d/dx(-5x²) = -10x, d/dx(7x) = 7, d/dx(-9) = 0 → 12x² - 10x + 7."
      ],
      [
        "At what value of x does the parabola f(x) = x² - 6x + 5 achieve its minimum value?",
        [
          "x = 6",
          "x = 3",
          "x = -3",
          "x = 0"
        ],
        1,
        "Set f'(x) = 0: 2x - 6 = 0 → 2x = 6 → x = 3."
      ]
    ]
  },
  {
    "id": "math-calc-int",
    "s": "math",
    "free": 1,
    "title": "Integral Calculus: Antiderivatives and Definite Integrals",
    "notes": [
      "Integration is the inverse process of differentiation. Indefinite integration introduces a constant of integration: ∫ xⁿ dx = (xⁿ⁺¹) / (n + 1) + C (for n ≠ -1); ∫ (1/x) dx = ln|x| + C; ∫ eˣ dx = eˣ + C.",
      "Fundamental Theorem of Calculus (FTC): If f is continuous on [a, b] and F is an antiderivative of f, then ∫ₐᵇ f(x) dx = F(b) - F(a). Definite integrals compute the net signed area bounded between the curve and the x-axis."
    ],
    "cards": [
      [
        "Fundamental Theorem of Calculus",
        "Links differentiation and integration: ∫ₐᵇ f(x) dx = F(b) - F(a)."
      ],
      [
        "Constant of Integration (+ C)",
        "Represents the arbitrary constant resulting from the derivative of any constant being zero."
      ],
      [
        "U-Substitution",
        "Integration technique reversing the chain rule by transforming ∫ f(g(x)) g'(x) dx into ∫ f(u) du."
      ]
    ],
    "qs": [
      [
        "Evaluate the definite integral ∫₀² (3x² + 2x) dx:",
        [
          "8",
          "12",
          "16",
          "20"
        ],
        1,
        "Antiderivative: [x³ + x²] from 0 to 2 = (2³ + 2²) - (0) = (8 + 4) = 12."
      ],
      [
        "What is the general indefinite integral ∫ (6x² - 4) dx?",
        [
          "2x³ - 4x + C",
          "3x³ - 4x + C",
          "12x + C",
          "6x³ - 4x + C"
        ],
        0,
        "∫ 6x² dx = 6(x³/3) = 2x³; ∫ -4 dx = -4x → 2x³ - 4x + C."
      ]
    ]
  },
  {
    "id": "math-linear-alg",
    "s": "math",
    "free": 1,
    "title": "Linear Algebra: Matrices, Determinants, and Systems of Equations",
    "notes": [
      "Matrix operations: Matrix addition/subtraction require identical dimensions. Matrix multiplication AB is possible only when columns of A equal rows of B.",
      "Determinants: For a 2×2 matrix [[a, b], [c, d]], det = ad - bc. A square matrix is invertible if and only if its determinant is non-zero (det ≠ 0). Cramer's Rule solves systems of linear equations using determinant ratios: x = det(Ax)/det(A)."
    ],
    "cards": [
      [
        "Determinant of 2x2 Matrix",
        "det [[a, b], [c, d]] = ad - bc."
      ],
      [
        "Singular Matrix",
        "A square matrix whose determinant equals zero, meaning it possesses no inverse."
      ],
      [
        "Identity Matrix (I)",
        "A square matrix with ones on the main diagonal and zeros elsewhere; AI = IA = A."
      ]
    ],
    "qs": [
      [
        "Calculate the determinant of the matrix [[5, 2], [3, 4]]:",
        [
          "14",
          "26",
          "20",
          "6"
        ],
        0,
        "det = (5)(4) - (2)(3) = 20 - 6 = 14."
      ],
      [
        "Under what condition does a square matrix FAIL to possess an inverse?",
        [
          "When its determinant equals 1",
          "When its determinant equals 0",
          "When it is a diagonal matrix",
          "When all entries are positive integers"
        ],
        1,
        "A matrix is singular (non-invertible) if and only if its determinant equals 0."
      ]
    ]
  },
  {
    "id": "math-logic-sets",
    "s": "math",
    "free": 1,
    "title": "Mathematical Logic, Set Theory, and Proof Techniques",
    "notes": [
      "Set theory operations: Union (A ∪ B, elements in A, B, or both), Intersection (A ∩ B, elements common to both), Complement (A', elements outside A), Subset (A ⊆ B).",
      "Logic and propositions: Negation (~p), Conjunction (p ∧ q, true only when both are true), Disjunction (p ∨ q), Implication (p → q, false only when p is true and q is false). The Contrapositive (~q → ~p) is logically equivalent to the conditional statement (p → q), whereas Converse (q → p) and Inverse (~p → ~q) are not."
    ],
    "cards": [
      [
        "Contrapositive",
        "The statement ~q → ~p, which has the exact same truth value as the original conditional p → q."
      ],
      [
        "Null / Empty Set (∅)",
        "A set containing no elements, with cardinality 0; a subset of every set."
      ],
      [
        "De Morgan's Laws (Sets)",
        "(A ∪ B)' = A' ∩ B' and (A ∩ B)' = A' ∪ B'."
      ]
    ],
    "qs": [
      [
        "What is the logically equivalent contrapositive of: 'If a polygon is a square, then it has four equal sides'?",
        [
          "If a polygon has four equal sides, then it is a square.",
          "If a polygon is not a square, then it does not have four equal sides.",
          "If a polygon does not have four equal sides, then it is not a square.",
          "A polygon is a square if and only if it has four sides."
        ],
        2,
        "The contrapositive of 'If P then Q' is 'If not Q then not P'."
      ],
      [
        "If Set A = {1, 2, 3, 4, 5} and Set B = {4, 5, 6, 7}, what is the intersection A ∩ B?",
        [
          "{1, 2, 3, 6, 7}",
          "{4, 5}",
          "{1, 2, 3, 4, 5, 6, 7}",
          "∅"
        ],
        1,
        "The intersection contains elements present in both sets: {4, 5}."
      ]
    ]
  },
  {
    "id": "sci-cell-bio",
    "s": "sci",
    "free": 1,
    "title": "Cellular Biology: Organelles, Mitosis, and Cellular Respiration",
    "notes": [
      "Cell structure: Prokaryotes (bacteria) lack a membrane-bound nucleus and organelles; Eukaryotes possess a defined nucleus, mitochondria (ATP powerhouses), endoplasmic reticulum, Golgi apparatus, and lysosomes.",
      "Cellular respiration involves Glycolysis (cytoplasm, anaerobic), Krebs Cycle (mitochondrial matrix), and Electron Transport Chain (inner membrane), producing ~36-38 ATP per glucose molecule. Mitosis (PMAT: Prophase, Metaphase, Anaphase, Telophase) yields two genetically identical diploid daughter cells, whereas Meiosis produces four genetically diverse haploid gametes."
    ],
    "cards": [
      [
        "Mitochondria",
        "Double-membraned organelle responsible for aerobic cellular respiration and bulk ATP generation."
      ],
      [
        "Mitosis vs Meiosis",
        "Mitosis produces 2 identical diploid somatic cells; Meiosis produces 4 genetically unique haploid sex cells."
      ],
      [
        "Ribosomes",
        "Complex cellular machines composed of rRNA and protein responsible for synthesizing polypeptide chains."
      ]
    ],
    "qs": [
      [
        "During which phase of mitosis do sister chromatids separate and move toward opposite poles of the spindle apparatus?",
        [
          "Prophase",
          "Metaphase",
          "Anaphase",
          "Telophase"
        ],
        2,
        "Anaphase is characterized by the splitting of centromeres and migration of sister chromatids to opposite poles."
      ],
      [
        "In cellular respiration, what is the net yield of ATP molecules produced strictly from Glycolysis per molecule of glucose?",
        [
          "2 ATP",
          "4 ATP",
          "32 ATP",
          "36 ATP"
        ],
        0,
        "Glycolysis consumes 2 ATP and produces 4 ATP, resulting in a net yield of 2 ATP."
      ]
    ]
  },
  {
    "id": "sci-genetics",
    "s": "sci",
    "free": 1,
    "title": "Mendelian Genetics, DNA Structure, and Protein Synthesis",
    "notes": [
      "Gregor Mendel's principles: Law of Segregation (alleles separate during gametogenesis) and Law of Independent Assortment (genes on non-homologous chromosomes assort independently). Monohybrid heterozygous cross (Aa × Aa) yields a 3:1 phenotypic ratio and 1:2:1 genotypic ratio.",
      "Molecular genetics: DNA is a double helix (Watson & Crick) composed of deoxyribose, phosphate, and nitrogenous bases: Adenine pairs with Thymine (A=T), Cytosine with Guanine (C≡G). Central Dogma of Molecular Biology: DNA → (Transcription in nucleus) → mRNA → (Translation at ribosomes) → Polypeptide protein."
    ],
    "cards": [
      [
        "Central Dogma",
        "The directional flow of genetic information: DNA replication → Transcription to RNA → Translation to Protein."
      ],
      [
        "Punnett Square",
        "A visual grid used to predict the genotypic and phenotypic outcomes of genetic parental crosses."
      ],
      [
        "Codominance vs Incomplete Dominance",
        "Codominance shows both alleles simultaneously (e.g., AB blood); incomplete dominance yields an intermediate blend (e.g., pink snapdragons)."
      ]
    ],
    "qs": [
      [
        "If two heterozygous tall pea plants (Tt) are crossed, what is the expected probability of producing a short (tt) offspring?",
        [
          "0%",
          "25% (1/4)",
          "50% (1/2)",
          "75% (3/4)"
        ],
        1,
        "Tt × Tt yields TT (25%), Tt (50%), and tt (25%)."
      ],
      [
        "If a DNA template strand has the nucleotide sequence 3'-TAC-GGC-TTA-5', what is the complementary mRNA transcript?",
        [
          "5'-AUG-CCG-AAU-3'",
          "5'-ATG-CCG-AAT-3'",
          "5'-UAC-GGC-UUA-3'",
          "5'-AUG-GGC-UUA-3'"
        ],
        0,
        "In RNA transcription, Adenine pairs with Uracil (A→U) and Cytosine with Guanine (C→G). T→A, A→U, C→G → AUG; G→C, G→C, C→G → CCG; T→A, T→A, A→U → AAU."
      ]
    ]
  },
  {
    "id": "sci-chem-atoms",
    "s": "sci",
    "free": 1,
    "title": "Chemistry: Atomic Structure, Periodic Trends, and Chemical Bonds",
    "notes": [
      "Atomic architecture: Protons (+1) and neutrons (0) reside in the dense nucleus; electrons (-1) occupy quantized orbitals. Atomic number (Z) = protons; Mass number (A) = protons + neutrons. Isotopes share Z but differ in A.",
      "Periodic trends: Moving left to right across a period, atomic radius decreases while electronegativity and ionization energy increase. Moving down a group, atomic radius increases while electronegativity decreases. Chemical bonds: Ionic bonds involve complete electron transfer between metals and nonmetals; Covalent bonds involve electron sharing between nonmetals."
    ],
    "cards": [
      [
        "Electronegativity",
        "A measure of an atom's ability to attract shared electrons in a chemical bond; highest in Fluorine."
      ],
      [
        "Ionic vs Covalent Bonding",
        "Ionic involves complete electron transfer between ions; covalent involves shared valence electron pairs."
      ],
      [
        "Octet Rule",
        "Atoms tend to gain, lose, or share electrons until their outermost s and p subshells contain 8 valence electrons."
      ]
    ],
    "qs": [
      [
        "Which element on the periodic table possesses the highest electronegativity value?",
        [
          "Francium",
          "Oxygen",
          "Fluorine",
          "Chlorine"
        ],
        2,
        "Fluorine has the highest electronegativity value (3.98 on the Pauling scale)."
      ],
      [
        "What type of chemical bond is formed between Sodium (metal) and Chlorine (nonmetal) in NaCl?",
        [
          "Nonpolar covalent bond",
          "Ionic bond",
          "Polar covalent bond",
          "Metallic bond"
        ],
        1,
        "Sodium transfers its single valence electron to chlorine, forming Na⁺ and Cl⁻ held together by electrostatic attraction (ionic bond)."
      ]
    ]
  },
  {
    "id": "sci-chem-stoich",
    "s": "sci",
    "free": 1,
    "title": "Stoichiometry, Solutions, and Chemical Equilibrium",
    "notes": [
      "Avogadro's number: 1 mole = 6.022 × 10²³ particles (atoms, molecules, or formula units). Molar mass (g/mol) converts mass to moles: moles = mass / molar mass. In balanced chemical equations, stoichiometric coefficients represent molar ratios.",
      "Solutions and equilibrium: Molarity (M) = moles of solute / liters of solution. Le Chatelier's Principle states that if an equilibrium system is subjected to a stress (temperature, concentration, pressure), the system shifts in the direction that counteracts the stress. The pH scale measures acidity: pH = -log[H⁺]; pH < 7 is acidic, pH = 7 is neutral, pH > 7 is basic."
    ],
    "cards": [
      [
        "Le Chatelier's Principle",
        "A system at equilibrium shifts to counteract any applied external stress in concentration, temperature, or pressure."
      ],
      [
        "Molarity (M)",
        "Concentration measured as the number of moles of solute dissolved per liter of total solution."
      ],
      [
        "Avogadro's Number",
        "6.022 × 10²³; the number of particles present in exactly one mole of a pure substance."
      ]
    ],
    "qs": [
      [
        "According to Le Chatelier's Principle, what happens to the exothermic reaction N₂(g) + 3H₂(g) ⇌ 2NH₃(g) + heat if temperature is increased?",
        [
          "Shifts to the right, producing more NH₃",
          "Shifts to the left, consuming NH₃ to absorb added heat",
          "No shift occurs",
          "Equilibrium constant increases"
        ],
        1,
        "Adding heat to an exothermic reaction shifts the equilibrium toward the reactants (left) to absorb the excess thermal energy."
      ],
      [
        "What is the pH of a solution with a hydrogen ion concentration [H⁺] of 1.0 × 10⁻⁴ M?",
        [
          "4",
          "10",
          "7",
          "14"
        ],
        0,
        "pH = -log[H⁺] = -log(1.0 × 10⁻⁴) = 4 (acidic solution)."
      ]
    ]
  },
  {
    "id": "sci-phys-mechanics",
    "s": "sci",
    "free": 1,
    "title": "Physics: Newton's Laws of Motion, Work, and Energy",
    "notes": [
      "Sir Isaac Newton's Three Laws of Motion: 1st Law (Inertia: an object remains at rest or uniform velocity unless acted upon by a net external force); 2nd Law (Acceleration: F_net = ma); 3rd Law (Action-Reaction: for every action, there is an equal and opposite reaction acting on different bodies).",
      "Work and Energy: Work W = F d cos θ (measured in Joules). Kinetic Energy KE = 1/2 m v²; Gravitational Potential Energy PE = m g h. Law of Conservation of Energy dictates that total mechanical energy in an isolated system remains constant (E_initial = E_final)."
    ],
    "cards": [
      [
        "Newton's Second Law",
        "F_net = ma; acceleration is directly proportional to net force and inversely proportional to object mass."
      ],
      [
        "Law of Conservation of Energy",
        "Energy cannot be created or destroyed; it merely transforms from one form to another."
      ],
      [
        "Work (Physics)",
        "The transfer of energy occurring when a force applied to an object causes displacement in the direction of the force."
      ]
    ],
    "qs": [
      [
        "A constant net force of 20 N is applied to an object with a mass of 4 kg. What is the resulting acceleration?",
        [
          "80 m/s²",
          "5 m/s²",
          "0.2 m/s²",
          "16 m/s²"
        ],
        1,
        "Using F = ma → a = F / m = 20 N / 4 kg = 5 m/s²."
      ],
      [
        "If the velocity of a moving vehicle is doubled, by what factor does its kinetic energy increase?",
        [
          "Doubled (2x)",
          "Tripled (3x)",
          "Quadrupled (4x)",
          "Remains unchanged"
        ],
        2,
        "Kinetic energy depends on the square of velocity (KE = 1/2 m v²). If v doubles, v² becomes (2)² = 4 times greater."
      ]
    ]
  },
  {
    "id": "sci-phys-em",
    "s": "sci",
    "free": 1,
    "title": "Electromagnetism: Circuits, Ohm's Law, and Optics",
    "notes": [
      "Electrical circuit principles: Ohm's Law states V = I R (Voltage = Current × Resistance). In Series circuits, current is identical across all components (I_total = I₁ = I₂), and resistances add directly (R_eq = R₁ + R₂). In Parallel circuits, voltage is identical across branches (V_total = V₁ = V₂), and 1/R_eq = 1/R₁ + 1/R₂.",
      "Optics and waves: Reflection follows the Law of Reflection (angle of incidence = angle of reflection). Refraction is the bending of light as it passes between optical media of different densities, governed by Snell's Law (n₁ sin θ₁ = n₂ sin θ₂). Convex lenses converge light; Concave lenses diverge light."
    ],
    "cards": [
      [
        "Ohm's Law",
        "V = IR; potential difference across a conductor is proportional to the current flowing through it."
      ],
      [
        "Snell's Law of Refraction",
        "n₁ sin θ₁ = n₂ sin θ₂; describes the bending of light crossing the boundary between media with differing refractive indices."
      ],
      [
        "Series vs Parallel Circuit",
        "Series has a single path (same current); Parallel has multiple branches (same voltage)."
      ]
    ],
    "qs": [
      [
        "A 12V battery is connected across a circuit with a total resistance of 4 Ohms. What is the current flowing through the circuit?",
        [
          "48 A",
          "3 A",
          "0.33 A",
          "16 A"
        ],
        1,
        "Using Ohm's Law: I = V / R = 12 V / 4 Ω = 3 Amperes."
      ],
      [
        "What optical phenomenon explains why a straw appears bent or broken when submerged in a clear glass of water?",
        [
          "Total internal reflection",
          "Refraction",
          "Diffraction",
          "Polarization"
        ],
        1,
        "Refraction—the change in velocity and resulting bending of light waves transitioning from water to air—creates the bent illusion."
      ]
    ]
  },
  {
    "id": "sci-thermo",
    "s": "sci",
    "free": 1,
    "title": "Thermodynamics and Heat Transfer Mechanisms",
    "notes": [
      "Heat is thermal energy in transit between systems due to temperature differences. Mechanisms of heat transfer: Conduction (transfer through direct molecular collisions within solids), Convection (transfer through bulk fluid movement of liquids or gases due to density gradients), and Radiation (transfer through electromagnetic infrared waves without requiring a material medium).",
      "Laws of Thermodynamics: Zeroth Law (thermal equilibrium defines temperature), First Law (Conservation of Energy: ΔU = Q - W), Second Law (Entropy of an isolated system always increases; heat flows spontaneously from hotter to colder bodies), Third Law (Entropy approaches a constant minimum as temperature approaches absolute zero 0 K)."
    ],
    "cards": [
      [
        "Conduction, Convection, Radiation",
        "Conduction occurs via physical contact; convection via fluid currents; radiation via electromagnetic waves through vacuum."
      ],
      [
        "Second Law of Thermodynamics",
        "Natural processes run spontaneously in the direction that increases total entropy (disorder) of the universe."
      ],
      [
        "Absolute Zero",
        "0 Kelvin (-273.15°C); the theoretical lowest temperature where molecular kinetic motion ceases."
      ]
    ],
    "qs": [
      [
        "By which heat transfer mechanism does solar energy traverse the vacuum of outer space to reach the Earth?",
        [
          "Conduction",
          "Convection",
          "Electromagnetic Radiation",
          "Thermal Advection"
        ],
        2,
        "Radiation is the only heat transfer mechanism that requires no material medium and can travel through the vacuum of space."
      ],
      [
        "A metal spoon left in a pot of boiling soup becomes hot to the touch at the handle. This is an example of:",
        [
          "Thermal Conduction",
          "Thermal Convection",
          "Radiation",
          "Sublimation"
        ],
        0,
        "Conduction transfers thermal energy directly through the solid metal spoon from molecule to molecule."
      ]
    ]
  },
  {
    "id": "sci-earth-rocks",
    "s": "sci",
    "free": 1,
    "title": "Geology: The Rock Cycle and Mineral Properties",
    "notes": [
      "The Rock Cycle encompasses three rock families: Igneous (formed by cooling and crystallization of magma/lava; extrusive like basalt vs intrusive like granite), Sedimentary (formed by weathering, erosion, deposition, compaction, and cementation of strata; e.g., limestone, sandstone, shale), and Metamorphic (formed by intense heat and pressure recrystallizing existing rocks; e.g., marble from limestone, slate from shale).",
      "Mineral diagnostics: Mohs Hardness Scale ranges from 1 (Talc, softest) to 10 (Diamond, hardest). Quartz has a hardness of 7. Diagnostic tests include streak (color of powdered mineral on unglazed porcelain), cleavage vs fracture, luster, and specific gravity."
    ],
    "cards": [
      [
        "Mohs Hardness Scale",
        "Relative mineral scratch test scale from Talc (1) to Diamond (10)."
      ],
      [
        "Sedimentary Rock Formation",
        "Formed through weathering, erosion, deposition, compaction, and cementation of sediments; commonly contains fossils."
      ],
      [
        "Metamorphism",
        "The structural and chemical alteration of rocks under extreme heat and pressure without melting."
      ]
    ],
    "qs": [
      [
        "Which of the following rocks is classified as an intrusive igneous rock characterized by coarse-grained crystals?",
        [
          "Basalt",
          "Granite",
          "Obsidian",
          "Limestone"
        ],
        1,
        "Granite cools slowly deep beneath the Earth's surface, allowing large, coarse crystals to form (intrusive igneous)."
      ],
      [
        "On Mohs Hardness Scale, what is the hardness value assigned to Quartz?",
        [
          "1",
          "4",
          "7",
          "10"
        ],
        2,
        "Quartz has a standard hardness of 7, easily scratching glass (5.5) and orthoclase (6)."
      ]
    ]
  },
  {
    "id": "sci-astro",
    "s": "sci",
    "free": 1,
    "title": "Astronomy: Kepler's Laws, Solar System, and Stellar Evolution",
    "notes": [
      "Johannes Kepler's Laws of Planetary Motion: 1st Law (Law of Ellipses: planetary orbits are ellipses with the Sun at one focus); 2nd Law (Law of Equal Areas: an imaginary line connecting a planet to the Sun sweeps out equal areas in equal intervals of time); 3rd Law (Law of Harmonies: T² ∝ a³, square of orbital period is proportional to cube of semi-major axis).",
      "Stellar evolution: Stars form within nebulae, fuse hydrogen into helium along the Main Sequence. Low-to-medium mass stars (like our Sun) swell into Red Giants, shed planetary nebulae, and leave White Dwarfs. Massive stars culminate in Supernovae, leaving neutron stars or collapse into Black Holes."
    ],
    "cards": [
      [
        "Kepler's First Law",
        "Planets orbit the Sun in elliptical paths with the Sun stationed at one of the two focal points."
      ],
      [
        "Nuclear Fusion",
        "The stellar engine in the core where hydrogen nuclei fuse into helium, releasing massive energy according to E = mc²."
      ],
      [
        "Supernova",
        "The catastrophic explosive collapse of a massive star at the end of its thermonuclear lifespan."
      ]
    ],
    "qs": [
      [
        "According to Kepler's Second Law of Planetary Motion, when does an orbiting planet travel at its highest orbital velocity?",
        [
          "When it is farthest from the Sun (Aphelion)",
          "When it is closest to the Sun (Perihelion)",
          "When it is at the midpoint of its elliptical axis",
          "Planetary velocity is strictly constant throughout the orbit"
        ],
        1,
        "Kepler's Law of Equal Areas dictates that a planet sweeps equal areas in equal times, moving fastest at perihelion."
      ],
      [
        "What astronomical body represents the ultimate theoretical end-state of a star whose mass is similar to our Sun?",
        [
          "Black Hole",
          "Neutron Star",
          "White Dwarf",
          "Supernova"
        ],
        2,
        "Low-to-medium mass stars like the Sun lack sufficient gravity to form neutron stars and terminate as dense White Dwarfs."
      ]
    ]
  },
  {
    "id": "sci-envi",
    "s": "sci",
    "free": 1,
    "title": "Environmental Science: Biogeochemical Cycles and Global Warming",
    "notes": [
      "Biogeochemical cycles circulate matter through the biosphere: Carbon Cycle (photosynthesis sequesters CO₂, cellular respiration and fossil fuel combustion release CO₂), Nitrogen Cycle (Nitrogen fixation by Rhizobium bacteria converts N₂ to ammonia; nitrification to nitrites/nitrates; denitrification returns N₂ to atmosphere), and Hydrologic Cycle (evaporation, transpiration, condensation, precipitation).",
      "Global environmental challenges: Enhanced Greenhouse Effect driven by elevated CO₂, CH₄, and N₂O trapping outgoing terrestrial infrared radiation. Acid precipitation caused by sulfur dioxide (SO₂) and nitrogen oxides (NOx) forming sulfuric and nitric acids. Eutrophication caused by agricultural fertilizer runoff."
    ],
    "cards": [
      [
        "Nitrogen Fixation",
        "The biological conversion of atmospheric N₂ into bioavailable ammonia (NH₃) by specialized bacteria in legume root nodules."
      ],
      [
        "Enhanced Greenhouse Effect",
        "The warming of Earth's troposphere caused by elevated greenhouse gases absorbing outgoing thermal infrared radiation."
      ],
      [
        "Eutrophication",
        "Nutrient enrichment (phosphates/nitrates) in water bodies causing algal blooms, oxygen depletion, and aquatic dead zones."
      ]
    ],
    "qs": [
      [
        "Which group of microorganisms plays the indispensable ecological role of converting atmospheric nitrogen (N₂) into usable ammonium in legume roots?",
        [
          "Nitrogen-fixing bacteria (such as Rhizobium)",
          "Decomposing fungal molds",
          "Methanogenic archaea",
          "Denitrifying anaerobic bacilli"
        ],
        0,
        "Rhizobium bacteria fix inert atmospheric nitrogen into bioavailable compounds essential for plant protein synthesis."
      ],
      [
        "What primary industrial emissions are responsible for the genesis of acid precipitation?",
        [
          "Carbon monoxide and chlorofluorocarbons",
          "Sulfur dioxide (SO₂) and nitrogen oxides (NOx)",
          "Methane and particulate dust",
          "Ozone and water vapor"
        ],
        1,
        "SO₂ and NOx react with atmospheric moisture to generate dilute sulfuric and nitric acids, causing acid rain."
      ]
    ]
  },
  {
    "id": "fil-ortograpiya",
    "s": "fil",
    "free": 1,
    "title": "Ortograpiyang Pambansa at Wastong Gamit ng mga Salita",
    "notes": [
      "Mga alituntunin ng Komisyon sa Wikang Filipino (KWF): Wastong gamit ng 'ng' (pananda ng tuwirang layon, tagaganap ng pandiwang balintiyak, o pagmamay-ari) at 'nang' (katumbas ng 'when', 'so that', paraan ng kilos, o pag-uulit ng pandiwa).",
      "Tuntunin sa gitling (-): Ginagamit sa pagitan ng panlaping nagtatapos sa katinig at salitang-ugat na nagsisimula sa patinig (tag-araw, mag-aral), sa tambalang salita (kapit-bisig), at sa inuulit na salita (araw-araw). Wastong gamit ng 'kila' vs 'kina': Walang salitang 'kila'; ang tumpak ay 'kina' (kaukulang maramihan ng kay)."
    ],
    "cards": [
      [
        "Gitling sa Paglalapi",
        "Inilalagay ang gitling kapag ang panlapi ay nagtatapos sa katinig at ang salitang-ugat ay nagsisimula sa patinig (hal. mag-isa, pag-ibig)."
      ],
      [
        "Kina vs Kila",
        "Ang 'kina' ang tamang anyo; walang salitang 'kila' sa balarilang Filipino."
      ],
      [
        "May vs Mayroon",
        "Gamitin ang 'may' kung sinusundan ng pangngalan, pandiwa, o pang-uri; gamitin ang 'mayroon' kung sinusundan ng kataga o panuring."
      ]
    ],
    "qs": [
      [
        "Alin sa mga sumusunod na pangungusap ang nagpapakita ng tamang paggamit ng salita batay sa Ortograpiyang Pambansa?",
        [
          "Pumunta kami kila Aling Nena kahapon.",
          "Pumunta kami kina Aling Nena kahapon.",
          "Pumunta kami kay Aling Nena at mga anak niya kahapon.",
          "Pumunta kami kina Aling Nena at kila Pedro kahapon."
        ],
        1,
        "Ang 'kina' ang tamang pang-ukol na maramihan na katumbas ng 'kay'; mali ang anyong 'kila'."
      ],
      [
        "Piliin ang pangungusap na may wastong gamit ng gitling:",
        [
          "Nagluto siya ng masarap na tagaraw na meryenda.",
          "Naging matagumpay ang kanilang pag-iisang dibdib.",
          "Tumakbo siya ng mabilis araw araw.",
          "Ito ay isang maka-Diyos na gawain."
        ],
        3,
        "Nilalagyan ng gitling kapag inilalapi ang unlaping 'maka-' sa pangngalang pantangi (maka-Diyos)."
      ]
    ]
  },
  {
    "id": "fil-noli-fili",
    "s": "fil",
    "free": 1,
    "title": "Panitikang Pilipino: Noli Me Tangere at El Filibusterismo",
    "notes": [
      "Noli Me Tangere (1887, Berlin): 'Huwag Mo Akong Salingin'. Nobelang panlipunan na naglalantad sa kanser ng kolonyalismong Espanyol. Pangunahing tauhan: Crisostomo Ibarra (idealistang repormista), Maria Clara (simbolo ng kababaihan), Padre Damaso (mapang-abusong prayle), Elias (tinig ng api at rebolusyonaryo), Sisa (inang nabaliw).",
      "El Filibusterismo (1891, Ghent): 'Ang Pilibustero'. Nobelang pampulitika na inialay sa GOMBURZA. Si Ibarra ay nagbalik bilang si Simoun, isang mayamang alaherong nagbabalak maghasik ng rebolusyon upang igupo ang pamahalaan at iligtas si Maria Clara. Nagtatapos sa pag-inom ni Simoun ng lason at pagtatapon ni Padre Florentino ng kayamanan sa dagat."
    ],
    "cards": [
      [
        "Simoun",
        "Ang nagbabalatkayong Crisostomo Ibarra sa El Filibusterismo na gumamit ng salapi at impluwensya upang pukawin ang himagsikan."
      ],
      [
        "Elias",
        "Ang bangkerong nagligtas kay Ibarra at kumakatawan sa sambayanang naghahangad ng kalayaan sa pamamagitan ng marahas na pagkilos."
      ],
      [
        "Padre Florentino",
        "Ang paring Pilipino na pinagkumpisalan ni Simoun bago ito namatay at nagtapon ng kanyang mga alahas sa Karagatang Pasipiko."
      ]
    ],
    "qs": [
      [
        "Ano ang huling ginawa ni Padre Florentino sa mga naiwang kayamanan at alahas ni Simoun sa pagwawakas ng El Filibusterismo?",
        [
          "Ibinigay niya sa mga mahihirap na magsasaka sa San Diego",
          "Itinapon niya ito sa kailaliman ng dagat upang hindi magamit sa kasamaan",
          "Ipinagkaloob niya sa pamahalaang Espanyol",
          "Ginamit niya sa pagpapatayo ng isang bagong unibersidad"
        ],
        1,
        "Itinapon ni Padre Florentino ang mga kayamanan sa dagat habang nanalangin na itago ito ng kalikasan hanggang maging karapat-dapat ang bayan."
      ],
      [
        "Sinong tauhan sa Noli Me Tangere ang naglarawan sa kawalang-katarungan at trahedya ng isang inang nawalan ng bait dahil sa paghahanap sa kanyang mga anak?",
        [
          "Doña Victorina",
          "Sisa",
          "Maria Clara",
          "Tia Isabel"
        ],
        1,
        "Si Sisa ang martir na ina nina Basilio at Crispin na nabaliw dahil sa kalupitan ng mga guwardiya sibil at kura."
      ]
    ]
  },
  {
    "id": "fil-panulaan",
    "s": "fil",
    "free": 1,
    "title": "Florante at Laura at Tradisyong Balagtasan",
    "notes": [
      "Florante at Laura: Isang awit na isinulat ni Francisco Baltazar (Balagtas) habang nakabilanggo, binubuo ng 12 pantig bawat taludtod (dodesyonal), may apat na taludtod sa bawat saknong, at tradisyonal na tugmaang ganap/di-ganap. Inialay kay Maria Asuncion Rivera (Selya / M.A.R.).",
      "Ang Balagtasan ay isang anyo ng pagtatalong patula na isinilang noong 1924 bilang parangal kay Balagtas. Binubuo ito ng Lakandiwa (tagapamagitan) at dalawang mambabalagtas na nagtatagisan ng katuwiran gamit ang talinghaga, indayog, at tugma. Si Jose Corazon de Jesus (Huseng Batute) ang kauna-unahang Hari ng Balagtasan."
    ],
    "cards": [
      [
        "Awit vs Korido",
        "Ang Awit ay may 12 pantig bawat taludtod at mabagal na indayog (andante); ang Korido ay may 8 pantig at mabilis (allegro)."
      ],
      [
        "Huseng Batute",
        "Jose Corazon de Jesus, ang itinanghal na unang Hari ng Balagtasan matapos talunin si Florentino Collantes."
      ],
      [
        "Lakandiwa",
        "Ang tagapamagitan o punong-guro sa Balagtasan na nagpapakilala sa paksa at nagpapasya sa pagtatapos ng pagtatalo."
      ]
    ],
    "qs": [
      [
        "Ilang pantig mayroon ang bawat taludtod ng obrang 'Florante at Laura' na nasa anyong awit?",
        [
          "8 pantig",
          "10 pantig",
          "12 pantig",
          "14 pantig"
        ],
        2,
        "Ang awit tulad ng Florante at Laura ay tradisyonal na binubuo ng 12 pantig bawat taludtod."
      ],
      [
        "Sino ang itinanghal na kauna-unahang Hari ng Balagtasan noong Oktubre 18, 1925?",
        [
          "Lope K. Santos",
          "Florentino Collantes",
          "Jose Corazon de Jesus (Huseng Batute)",
          "Severino Reyes"
        ],
        2,
        "Si Jose Corazon de Jesus (Huseng Batute) ang nagwaging unang Hari ng Balagtasan."
      ]
    ]
  },
  {
    "id": "fil-morpema",
    "s": "fil",
    "free": 1,
    "title": "Morpolohiya at Pagbabagong Morpoponemiko",
    "notes": [
      "Ang morpema ang pinakamaliit na yunit ng salita na nagtataglay ng kahulugan. May tatlong anyo ng morpema: morpemang ponema (/a/ at /o/ na nagpapakita ng kasarian), morpemang salitang-ugat (payak na salita), at morpemang panlapi (unlapi, gitlapi, hulapi, kabilaan, laguhan).",
      "Pagbabagong morpoponemiko: Asimilasyon (parsyal/ganap: pang- + palo → pamalo), Pagpapalit ng Ponema (/d/ nagiging /r/: ma- + dapat → marapat), Metatesis (paglilipat ng titik: in- + lipad → nilipad), Pagkakaltas ng Ponema (takip + -an → takpan), at Pag-aangkop (tayo na → tena)."
    ],
    "cards": [
      [
        "Asimilasyong Ganap",
        "Pagbabago kung saan nawawala ang unang titik ng salitang-ugat at napapasama sa panlapi (hal. pang- + tali → panali)."
      ],
      [
        "Metatesis",
        "Pagpapalit ng posisyon ng mga ponema sa loob ng salita kapag ginigitlapian ng -in- (hal. in + yari → niyari)."
      ],
      [
        "Pagkakaltas ng Ponema",
        "Pagkawala ng isang patinig o katinig sa huling pantig ng salitang-ugat kapag hinuhulapian (hal. bukas + -an → buksan)."
      ]
    ],
    "qs": [
      [
        "Anong uri ng pagbabagong morpoponemiko ang naganap sa salitang 'takpan' mula sa salitang-ugat na 'takip' at hulaping '-an'?",
        [
          "Metatesis",
          "Pagkakaltas ng Ponema",
          "Asimilasyong Ganap",
          "Paglilipat-diin"
        ],
        1,
        "Nawala ang patinig na 'i' sa pantig na 'kip' (takip + an → takpan), na nagpapakita ng pagkakaltas ng ponema."
      ],
      [
        "Sa paglalaping 'pang- + paaralan = pampaaralan', anong anyo ng pagbabago ang naganap?",
        [
          "Asimilasyong Parsyal",
          "Asimilasyong Ganap",
          "Metatesis",
          "Pagpapalit ng Ponema"
        ],
        0,
        "Ang 'ng' ng panlapi ay naging 'm' dahil nagsisimula sa 'p' ang salitang-ugat, ngunit hindi nawala ang titik 'p' (parsyal)."
      ]
    ]
  },
  {
    "id": "fil-sintaks",
    "s": "fil",
    "free": 1,
    "title": "Sintaksis at Kayarian ng Pangungusap sa Filipino",
    "notes": [
      "Kayarian ng pangungusap sa Filipino: Karaniwang ayos (Nauuna ang Panaguri bago ang Simuno/Paksa, hal. 'Masisipag ang mga gurong Pilipino') at Di-Karaniwang ayos (Nauuna ang Simuno bago ang Panaguri at may panandang 'ay', hal. 'Ang mga gurong Pilipino ay masisipag').",
      "Apat na kayarian ayon sa porma: Payak (nagpapahayag ng iisang diwa), Tambalan (dalawang payak na pangungusap na pinag-uugnay ng pangatnig na panimbang tulad ng at, ngunit), Hugnayan (binubuo ng isang sugnay na makapag-iisa at isa o higit pang sugnay na di-makapag-iisa), at Langkapan (kombinasyon ng tambalan at hugnayan)."
    ],
    "cards": [
      [
        "Karaniwang Ayos",
        "Ayos ng pangungusap sa Filipino kung saan nauuna ang panaguri kaysa sa simuno (walang panandang 'ay')."
      ],
      [
        "Hugnayang Pangungusap",
        "Binubuo ng isang malayang sugnay at isa o higit pang pantulong na sugnay na pinangungunahan ng pangatnig (dahil, kapag, kung)."
      ],
      [
        "Langkapan",
        "Pangungusap na may dalawa o higit pang sugnay na makapag-iisa at kahit isang sugnay na di-makapag-iisa."
      ]
    ],
    "qs": [
      [
        "Tukuyin ang kayarian ng pangungusap: 'Nang dumating ang guro, tumahimik ang mga mag-aaral at nagsimula na ang klase.'",
        [
          "Payak",
          "Tambalan",
          "Hugnayan",
          "Langkapan"
        ],
        3,
        "May isang di-makapag-iisang sugnay ('Nang dumating ang guro') at dalawang makapag-iisang sugnay na pinag-ugnay ng 'at' (Langkapan)."
      ],
      [
        "Aling pangungusap ang nasa karaniwang ayos?",
        [
          "Ang edukasyon ay susi sa tagumpay ng kabataan.",
          "Susi sa tagumpay ng kabataan ang edukasyon.",
          "Ang mga guro ay masisigasig magturo.",
          "Si Rizal ay dakilang bayani."
        ],
        1,
        "Nauuna ang panaguri ('Susi sa tagumpay ng kabataan') bago ang paksa ('ang edukasyon') nang walang panandang 'ay'."
      ]
    ]
  },
  {
    "id": "fil-maikling-kwento",
    "s": "fil",
    "free": 1,
    "title": "Maikling Kwento: Elemento, Banghay, at Paningin",
    "notes": [
      "Maikling kwento: Isang maikling kathang pampanitikan na nagsasalaysay ng isang mahalagang pangyayari sa buhay ng pangunahing tauhan na nag-iiwan ng isang kakintalan.",
      "Mga bahagi ng banghay: 1. Simula (pagpapakilala sa tauhan at tagpuan), 2. Saglit na Kasiglahan (naghahanda sa tunggalian), 3. Tunggalian (tao laban sa tao, tao laban sa sarili, tao laban sa kalikasan, tao laban sa lipunan), 4. Kasukdulan (pinakamatinding emosyon o kapana-panabik na bahagi), 5. Kakalasan (patungo sa paglutas), at 6. Wakas (resolusyon)."
    ],
    "cards": [
      [
        "Kasukdulan (Climax)",
        "Ang pinakamasidhing bahagi ng kwento kung saan nakakamit ang pinakamataas na antas ng pananabik at emosyon."
      ],
      [
        "Kakintalan",
        "Ang pangkalahatang aral, diwa, o impresyong naiiwan sa isipan at puso ng mambabasa matapos basahin ang akda."
      ],
      [
        "Tunggaliang Tao laban sa Sarili",
        "Internal na tunggalian kung saan ang tauhan ay nakikipaglaban sa sariling konsensya, takot, o moral na desisyon."
      ]
    ],
    "qs": [
      [
        "Aling bahagi ng banghay ng maikling kwento ang naglalaman ng pinakamatinding kapana-panabik na tagpo kung saan nahaharap ang tauhan sa kanyang kapalaran?",
        [
          "Saglit na Kasiglahan",
          "Tunggalian",
          "Kasukdulan",
          "Kakalasan"
        ],
        2,
        "Ang kasukdulan ang tugatog ng kwento kung saan nasusubok ang pinakamahalagang desisyon o laban ng tauhan."
      ],
      [
        "Sinong manunulat ang tinaguriang 'Ama ng Maikling Kwentong Tagalog' dahil sa kanyang klasikong akdang 'Buhay at Pag-ibig'?",
        [
          "Deogracias A. Rosario",
          "Severino Reyes",
          "Amado V. Hernandez",
          "Lope K. Santos"
        ],
        0,
        "Si Deogracias A. Rosario ang kinikilalang Ama ng Maikling Kwentong Tagalog."
      ]
    ]
  },
  {
    "id": "fil-barayti",
    "s": "fil",
    "free": 1,
    "title": "Mga Barayti at Baryasyon ng Wika",
    "notes": [
      "Mga Barayti ng Wika: Dayalek / Dayalekto (baryasyon ayon sa rehiyon o heograpiya, hal. Tagalog-Batangas, Tagalog-Bulacan), Idyolek (personal at natatanging paraan ng pagsasalita ng isang indibidwal, hal. 'Excuse me po!' ni Mike Enriquez), Sosyolek (baryasyong nakabatay sa katayuan sa lipunan, grupo, o subkultura; kabilang ang Gay Lingo, Jejemon, at Conyo).",
      "Etnolek (wika mula sa mga etnolinggwistikong grupo, hal. T'boli, Ivatan), Ekolek (wikang karaniwang ginagamit sa loob ng tahanan), at Register (wikang ginagamit sa isang partikular na larangan, propesyon, o disiplina; hal. 'hearing' sa medisina vs 'hearing' sa batas)."
    ],
    "cards": [
      [
        "Idyolek",
        "Ang personal at katangi-tanging tatak sa pagsasalita ng isang tao na nagpapaiba sa kanya sa iba."
      ],
      [
        "Register",
        "Paggamit ng mga natatanging salita o jargon na angkop sa isang partikular na larangan, propesyon, o okasyon."
      ],
      [
        "Dayalek",
        "Baryasyon ng isang wika na nalilikha dahil sa pagkakahating heograpikal o rehiyonal ng mga nagsasalita."
      ]
    ],
    "qs": [
      [
        "Ang salitang 'habeas corpus', 'subpoena', at 'affidavit' ay halimbawa ng anong barayti ng wika sa larangan ng batas?",
        [
          "Idyolek",
          "Etnolek",
          "Register / Jargon",
          "Ekolek"
        ],
        2,
        "Ang mga teknikal na salita na eksklusibong ginagamit sa isang propesyon (tulad ng batas) ay tinatawag na register o jargon."
      ],
      [
        "Ang natatanging tono at linya ng broadcaster na si Noli de Castro na 'Magandang Gabi, Bayan!' ay pagpapakita ng:",
        [
          "Dayalek",
          "Idyolek",
          "Sosyolek",
          "Pidgin"
        ],
        1,
        "Ang personal na paraan at istilo ng pagsasalita ng isang tiyak na indibidwal ay idyolek."
      ]
    ]
  },
  {
    "id": "fil-pagsasalin",
    "s": "fil",
    "free": 1,
    "title": "Simulain at Pamamaraan sa Pagsasaling-Wika",
    "notes": [
      "Pagsasaling-wika: Ang paglilipat ng kahulugan ng mensahe mula sa Simulaang Lenggwahe (SL) patungo sa Tunguhang Lenggwahe (TL) nang hindi nababago ang orihinal na diwa at konteksto.",
      "Pangunahing simulain: 1. Isalin ang diwa at hindi salita-por-salita. 2. Isaalang-alang ang kultura at idyoma ng TL. 3. Ang literal na salin ay kadalasang nagreresulta sa katawa-tawa o maling interpretasyon (hal. 'fall in line' = 'pumila' at HINDI 'mahulog sa linya'). 4. Ang tagasalin ay dapat may lubos na kabatiran sa parehong wika."
    ],
    "cards": [
      [
        "Diwa sa Diwa (Sense-for-Sense)",
        "Pangunahing pamantayan sa pagsasalin kung saan ang diwa o kahulugan ang isinasalin sa halip na literal na mga salita."
      ],
      [
        "Simulaang Lenggwahe (SL)",
        "Ang orihinal na wikang pinagmulan ng tekstong isasalin patungo sa bagong wika."
      ],
      [
        "Tunguhang Lenggwahe (TL)",
        "Ang wikang pinagsasalinan o target na wika kung saan ililipat ang mensahe."
      ]
    ],
    "qs": [
      [
        "Ano ang pinakaangkop at natural na salin sa Filipino ng idyomang Ingles na 'He kicked the bucket'?",
        [
          "Sinipa niya ang timba.",
          "Namatay na siya.",
          "Nahulog ang kanyang timba.",
          "Nawala ang kanyang lalagyan."
        ],
        1,
        "Ang idyomang 'kicked the bucket' ay nangangahulugang pumanaw o namatay, kaya diwa ang dapat isalin."
      ],
      [
        "Alin sa mga sumusunod ang pangunahing tuntunin sa pagsasaling-wika?",
        [
          "Tiyaking bawat salita ay may eksaktong katumbas sa diksyunaryo",
          "Isalin ang kahulugan o diwa ng buong pahayag, hindi ang bawat salita",
          "Laging panatilihin ang ayos ng pangungusap ng Ingles",
          "Huwag kailanman manghiram ng banyagang salita"
        ],
        1,
        "Ang pagsasalin ay paglilipat ng diwa at kultural na kahulugan sa tunguhang lenggwahe, hindi salita-por-salita."
      ]
    ]
  },
  {
    "id": "fil-retorika",
    "s": "fil",
    "free": 1,
    "title": "Retorika at Masining na Pagpapahayag",
    "notes": [
      "Retorika: Ang sining ng mabisa at masining na pagpapahayag, pasulat man o pasalita, upang makapanghikayat at mag-iwan ng malalim na kakintalan sa tagapakinig o mambabasa.",
      "Mga Tayutay sa Filipino: Pagtutulad / Simili (gumagamit ng tulad ng, animo'y, paris ng), Pagwawangis / Metapora (tiyakang paghahalintulad nang walang kataga), Pagsasatao / Personipikasyon (pagbibigay-buhay sa mga bagay), Pagmamalabis / Hiperbole (eksaheradong pahayag), Pagpapalit-saklaw / Sinekdoke, at Pag-uyam / Ironiya."
    ],
    "cards": [
      [
        "Pagsasatao (Personipikasyon)",
        "Tayutay na nagkakaloob ng mga katangian at kilos ng tao sa mga bagay na walang buhay (hal. Sumasayaw ang mga dahon)."
      ],
      [
        "Pagwawangis (Metapora)",
        "Tahasang paghahambing ng dalawang magkaibang bagay nang hindi gumagamit ng mga salitang panulad."
      ],
      [
        "Hiperbole (Pagmamalabis)",
        "Pahayag na lubhang pinalalaki o pinaliliit ang katunayan upang magbigay-diin sa damdamin."
      ]
    ],
    "qs": [
      [
        "Tukuyin ang tayutay sa pahayag: 'Umiiyak ang langit sa gitna ng matinding trahedya ng bayan.'",
        [
          "Pagtutulad",
          "Pagsasatao",
          "Pagpapalit-tawag",
          "Pag-uyam"
        ],
        1,
        "Ibinigay ang katangian ng tao (pag-iyak) sa langit (ulan), na nagpapakita ng pagsasatao o personipikasyon."
      ],
      [
        "'Ikaw ang ilaw na tumatanglaw sa madilim kong landas.' Anong tayutay ang ginamit dito?",
        [
          "Pagtutulad",
          "Pagwawangis (Metapora)",
          "Hiperbole",
          "Sinekdoke"
        ],
        1,
        "Direktang inihalintulad ang tao sa 'ilaw' nang walang salitang panulad (Pagwawangis)."
      ]
    ]
  },
  {
    "id": "fil-kasaysayan-wika",
    "s": "fil",
    "free": 1,
    "title": "Kasaysayan at Batas sa Wikang Pambansa",
    "notes": [
      "Mga makasaysayang batas sa Wikang Pambansa: 1. Saligang Batas ng 1935 (Art. XIV, Sek. 3): Pagpapaunlad ng isang wikang pambansa batay sa isa sa mga umiiral na katutubong wika. 2. Kautusang Tagapagpaganap Blg. 134 (1937, Pang. Manuel L. Quezon): Tagalog ang naging batayan ng Wikang Pambansa.",
      "3. Kautusang Pangkagawaran Blg. 7 (1959, Kalihim Jose Romero): 'Pilipino' ang opisyal na tawag. 4. Saligang Batas ng 1987 (Art. XIV, Sek. 6): 'Ang wikang pambansa ng Pilipinas ay Filipino. Samantalang nililinang, ito ay dapat payabungin at pagyamanin pa salig sa umiiral na mga wika sa Pilipinas at iba pang mga wika.'"
    ],
    "cards": [
      [
        "Manuel L. Quezon",
        "Ang 'Ama ng Wikang Pambansa' na nagtaguyod ng Kautusang Tagapagpaganap Blg. 134 noong 1937."
      ],
      [
        "Artikulo XIV, Seksiyon 6",
        "Tadhana ng 1987 Konstitusyon na nagdedeklara na ang Wikang Pambansa ng Pilipinas ay Filipino."
      ],
      [
        "Pilipino vs Filipino",
        "Ang 'Pilipino' (1959) ay nakabatay lamang sa Tagalog; ang 'Filipino' (1987) ay inklusibo at nakasalig sa lahat ng katutubong wika sa bansa."
      ]
    ],
    "qs": [
      [
        "Ayon sa Artikulo XIV, Seksiyon 6 ng 1987 Konstitusyon, ano ang opisyal na Wikang Pambansa ng Republika ng Pilipinas?",
        [
          "Tagalog",
          "Pilipino",
          "Filipino",
          "Taglish"
        ],
        2,
        "Ang 1987 Saligang Batas ay tiyakang nagtatadhana na 'Filipino' ang pambansang wika."
      ],
      [
        "Sino ang Kalihim ng Edukasyon na nagpalabas ng Kautusang Pangkagawaran Blg. 7 noong 1959 na nag-utos na tawaging 'Pilipino' ang wikang pambansa?",
        [
          "Lope K. Santos",
          "Jose Romero",
          "Manuel L. Quezon",
          "Jaime C. de Veyra"
        ],
        1,
        "Si Kalihim Jose Romero ang nagbaba ng Kautusang Pangkagawaran Blg. 7 noong 1959."
      ]
    ]
  },
  {
    "id": "soc-branches",
    "s": "soc",
    "free": 1,
    "title": "Philippine Government: Separation of Powers & Constitutional Commissions",
    "notes": [
      "The 1987 Constitution mandates tripartite separation of powers: Executive (President, Vice-President, Cabinet; enforces laws), Legislative (Bicameral Congress: 24 Senators elected at-large and House of Representatives elected by district and party-list; creates laws), and Judiciary (Supreme Court and lower courts; interprets laws and resolves constitutional questions via Judicial Review).",
      "Constitutional Commissions: Independent bodies insulated from political interference: Civil Service Commission (CSC, personnel management for all public servants), Commission on Elections (COMELEC, enforcement of electoral laws), and Commission on Audit (COA, financial accountability and fund examination)."
    ],
    "cards": [
      [
        "Judicial Review",
        "The authority of the Supreme Court to declare acts of the legislative or executive branches unconstitutional."
      ],
      [
        "Party-List System",
        "Constitutional mechanism guaranteeing representation for marginalized and underrepresented sectors in Congress."
      ],
      [
        "Impeachment",
        "Constitutional trial process in the Senate to remove accountable high officials for culpable violation of the Constitution, graft, or treason."
      ]
    ],
    "qs": [
      [
        "Which constitutional body possesses the sole power to initiate all cases of impeachment against impeachable officials under the Philippine Constitution?",
        [
          "The Senate",
          "The House of Representatives",
          "The Supreme Court",
          "The Ombudsman"
        ],
        1,
        "Article XI specifies that the House of Representatives has the exclusive power to initiate impeachment complaints; the Senate conducts the trial."
      ],
      [
        "What principle prevents any single branch of the Philippine government from dominating or monopolizing state power?",
        [
          "Principle of Subsidiarity",
          "Separation of Powers and System of Checks and Balances",
          "Federalism",
          "Parens Patriae"
        ],
        1,
        "Separation of powers combined with checks and balances prevents governmental tyranny."
      ]
    ]
  },
  {
    "id": "soc-bill-rights",
    "s": "soc",
    "free": 1,
    "title": "Article III: The Bill of Rights and Due Process of Law",
    "notes": [
      "Article III (Bill of Rights) of the 1987 Philippine Constitution: Section 1 guarantees Substantive Due Process (fair and reasonable laws) and Procedural Due Process (fair hearing, notice, and impartial tribunal). Equal Protection of the Laws bars arbitrary discriminatory classifications.",
      "Section 2 guarantees protection against unreasonable searches and seizures, requiring search warrants or arrest warrants issued only upon Probable Cause personally determined by a judge. The Exclusionary Rule (Fruit of the Poisonous Tree doctrine) makes evidence obtained in violation of this right inadmissible in any proceeding."
    ],
    "cards": [
      [
        "Probable Cause",
        "Facts and circumstances that would lead a reasonably prudent judge to believe that an offense has been committed."
      ],
      [
        "Exclusionary Rule",
        "Doctrine holding that evidence obtained through illegal search or without a valid warrant is inadmissible in court."
      ],
      [
        "Miranda Rights (Sec. 12)",
        "Mandatory procedural warnings during custodial investigation: right to remain silent and right to competent, independent counsel."
      ]
    ],
    "qs": [
      [
        "Evidence seized by law enforcement officers through a warrantless search conducted without any recognized legal exception is:",
        [
          "Admissible if the suspect is proven guilty",
          "Inadmissible for any purpose in any proceeding (Fruit of the poisonous tree)",
          "Admissible upon subsequent approval by the mayor",
          "Inadmissible only in civil cases, but valid in criminal trials"
        ],
        1,
        "Under Section 3(2) of the Bill of Rights, any evidence acquired in violation of search protections is completely inadmissible."
      ],
      [
        "Who has the exclusive constitutional authority under the 1987 Constitution to issue arrest and search warrants upon probable cause?",
        [
          "The City Prosecutor",
          "The Chief of Police",
          "A competent Judge",
          "The Secretary of Justice"
        ],
        2,
        "Only a judge may personally evaluate and issue search warrants or warrants of arrest under Section 2 of Article III."
      ]
    ]
  },
  {
    "id": "soc-pre-colonial",
    "s": "soc",
    "free": 1,
    "title": "Pre-Colonial Philippines: Barangay Society, Laws, and Maritime Trade",
    "notes": [
      "Pre-colonial Philippine political unit: The Barangay (30-100 families), headed by a Datu (chieftain wielding executive, legislative, and judicial powers, advised by an elder council). Social stratification: Datu/Maginoo (ruling aristocracy), Maharlika/Timawa (freemen, warriors), and Alipin (Aliping Namamahay with own house vs Aliping Saguiguilid living in master's quarters).",
      "Culture and economy: Animistic spiritual leadership by Babaylan (female priestesses and healers). Written and oral laws (customary adat). Active maritime international trade with Song/Ming China, Siam (Thailand), Annam (Vietnam), and the Sri Vijaya and Majapahit empires using native boats (balangay) and gold barter currency (piloncitos)."
    ],
    "cards": [
      [
        "Babaylan / Katalonan",
        "Pre-colonial spiritual leaders, traditional healers, and cultural custodians, predominantly women."
      ],
      [
        "Aliping Namamahay",
        "Servants who owned their own dwellings and property, serving their master primarily during farming or warfare."
      ],
      [
        "Balangay",
        "Plank-built pre-colonial maritime sailing vessels evidencing advanced navigational and maritime engineering."
      ]
    ],
    "qs": [
      [
        "In pre-colonial Philippine society, which social class had the right to own private land, build their own houses, and choose their own spouses?",
        [
          "Aliping Saguiguilid",
          "Timawa and Aliping Namamahay",
          "Captured war slaves",
          "Exiled debtors"
        ],
        1,
        "Both Timawa (freemen) and Aliping Namamahay enjoyed property rights and lived in their own homes."
      ],
      [
        "What was the primary social, political, and economic community structure in pre-Spanish Philippines?",
        [
          "Pueblo",
          "Alcaldia Mayor",
          "Barangay",
          "Encomienda"
        ],
        2,
        "The barangay was the sovereign socio-political organizational unit in the pre-colonial archipelago."
      ]
    ]
  },
  {
    "id": "soc-spanish-era",
    "s": "soc",
    "free": 1,
    "title": "Spanish Colonial Period: Institutions and Resistance Movements",
    "notes": [
      "Spanish colonial institutions: The Encomienda System (royal grants to collect tribute), Polo y Servicios (forced labor for 40 days imposed on native males aged 16-60), Bandala (compulsory sale of farm produce to government), and the Galleon Trade (Manila-Acapulco trade route, 1565-1815). Centralized government headed by the Governor-General.",
      "Evolution of resistance: Early localized revolts (Tamblot, Bankaw, Dagohoy—longest revolt for 85 years in Bohol, Diego and Gabriela Silang). Shift to secularization movement led by Father Pedro Pelaez and Father Jose Burgos, culminating in the execution of GOMBURZA (1872) and the founding of the Katipunan (KKK) by Andres Bonifacio on July 7, 1892."
    ],
    "cards": [
      [
        "Francisco Dagohoy",
        "Leader of the longest revolt against Spanish colonial rule in Bohol, lasting 85 years (1744-1829)."
      ],
      [
        "Polo y Servicios",
        "System of forced manual labor imposed on native male subjects constructing churches, roads, and galleons."
      ],
      [
        "Galleon Trade (1565-1815)",
        "Monopolistic maritime trading route connecting Manila and Acapulco, Mexico, exchanging Asian silk/spices for Mexican silver."
      ]
    ],
    "qs": [
      [
        "Which Philippine revolt against Spanish religious and civil tyranny holds the historical record for lasting 85 years?",
        [
          "The Silang Revolt in Ilocos",
          "The Dagohoy Revolt in Bohol",
          "The Hermano Pule Revolt in Tayabas",
          "The Sumuroy Revolt in Samar"
        ],
        1,
        "The Dagohoy Revolt in Bohol endured for 85 years (1744 to 1829), representing the longest recorded uprising."
      ],
      [
        "What was the primary economic objective of the Encomienda System introduced by the Spanish Crown?",
        [
          "To provide free university education to natives",
          "To reward conquistadores with the right to collect tributes and exploit native labor",
          "To establish democratic village elections",
          "To distribute land ownership equitably to farmers"
        ],
        1,
        "The encomienda rewarded Spanish conquerors with the authority to collect tributes in designated territories in exchange for religious instruction."
      ]
    ]
  },
  {
    "id": "soc-american-jap",
    "s": "soc",
    "free": 1,
    "title": "American Era, Commonwealth, and Japanese Occupation",
    "notes": [
      "American Colonial Period: Initiated by the Treaty of Paris (Dec 10, 1898; Spain ceded Philippines to US for $20 million). Philippine-American War (1899-1902). Introduction of public education via Thomasites, civil service, and public health infrastructure.",
      "Road to Independence: Philippine Autonomy Act (Jones Law, 1916; promised independence upon stable government), Tydings-McDuffie Act (1934; established 10-year Commonwealth transition under President Manuel L. Quezon). World War II: Japanese invasion (Dec 1941), Fall of Bataan (April 9, 1942), Death March, Hukbalahap guerilla resistance, MacArthur's return (1944), and formal recognition of Philippine Independence on July 4, 1946."
    ],
    "cards": [
      [
        "Tydings-McDuffie Act (1934)",
        "US law that created the Philippine Commonwealth and guaranteed complete independence after a 10-year transition."
      ],
      [
        "Thomasites",
        "The first contingent of American civilian teachers arriving aboard the USS Thomas in 1901 to establish the public school system."
      ],
      [
        "Hukbalahap",
        "Hukbo ng Bayan Laban sa Hapon; peasant guerilla movement founded by Luis Taruc in Central Luzon to fight Japanese occupation."
      ]
    ],
    "qs": [
      [
        "What historic US congressional legislation established the Philippine Commonwealth and set a definitive timetable for full independence?",
        [
          "Jones Law (1916)",
          "Hare-Hawes-Cutting Act",
          "Tydings-McDuffie Act (1934)",
          "Bell Trade Act (1946)"
        ],
        2,
        "The Tydings-McDuffie Act of 1934 authorized the 1935 Constitution and created the Commonwealth transition period."
      ],
      [
        "Who was the peasant guerilla leader who founded the anti-Japanese armed organization Hukbalahap in Central Luzon in 1942?",
        [
          "Vicente Lava",
          "Luis Taruc",
          "Macario Sakay",
          "Crisanto Evangelista"
        ],
        1,
        "Luis Taruc organized and commanded the Hukbalahap (Anti-Japanese People's Army) during World War II."
      ]
    ]
  },
  {
    "id": "soc-world-civ",
    "s": "soc",
    "free": 1,
    "title": "World History: Ancient River Civilizations and Classical Legacies",
    "notes": [
      "Ancient River Valley Civilizations: Mesopotamia (Tigris-Euphrates; Sumerian cuneiform, Hammurabi's Code 'an eye for an eye'), Egypt (Nile River; hieroglyphics, pharaohs, pyramids), Indus Valley (Harappa and Mohenjo-daro; advanced urban planning), and China (Yellow/Huang He River; mandate of heaven, dynasties, paper, printing, gunpowder).",
      "Classical Antiquity: Ancient Greece (Athens: birth of direct democracy, philosophy of Socrates, Plato, Aristotle; Sparta: militaristic oligarchy). Ancient Rome (Transition from Roman Republic to Roman Empire under Augustus Caesar; Pax Romana, Roman Law / Twelve Tables, architectural arch, aqueducts)."
    ],
    "cards": [
      [
        "Code of Hammurabi",
        "One of the earliest comprehensive written legal codes, etched on a basalt stele in Babylon enforcing lex talionis."
      ],
      [
        "Cuneiform",
        "The world's earliest known wedge-shaped writing system, developed by ancient Sumerians on clay tablets."
      ],
      [
        "Pax Romana",
        "Two centuries of relative peace, stability, and legal expansion across the Roman Empire initiated by Augustus Caesar."
      ]
    ],
    "qs": [
      [
        "Which ancient Mesopotamian civilization is credited with inventing the wheel, the cuneiform script, and the base-60 sexagesimal numerical system?",
        [
          "Egyptians",
          "Sumerians",
          "Phoenicians",
          "Assyrians"
        ],
        1,
        "The Sumerians in Mesopotamia pioneered cuneiform, wheeled transport, and base-60 mathematics (still used in our 60-minute hour)."
      ],
      [
        "What enduring political governance concept originated in the Greek city-state of Classical Athens?",
        [
          "Constitutional Monarchy",
          "Direct Democracy",
          "Military Dictatorship",
          "Feudal Theocracy"
        ],
        1,
        "Direct citizen voting on laws and public policy was invented and practiced in classical Athens."
      ]
    ]
  },
  {
    "id": "soc-econ-micro",
    "s": "soc",
    "free": 1,
    "title": "Microeconomics: Supply, Demand, Elasticity, and Market Structures",
    "notes": [
      "Fundamental laws: Law of Demand (inverse relationship: as price increases, quantity demanded decreases, ceteris paribus); Law of Supply (direct relationship: as price increases, quantity supplied increases). Market equilibrium occurs at the intersection of supply and demand curves where Q_d = Q_s.",
      "Price Elasticity of Demand (PED = %ΔQ_d / %ΔP): Inelastic (<1, necessities like rice or insulin), Elastic (>1, luxury goods), Unit elastic (=1). Market structures: Perfect Competition (many sellers, homogeneous products, price takers), Monopoly (single seller, unique product, extreme barriers to entry), Oligopoly (few dominant firms, cartel collusion, game theory), and Monopolistic Competition (differentiated products)."
    ],
    "cards": [
      [
        "Law of Demand",
        "Ceteris paribus, as the price of a good rises, consumer quantity demanded drops."
      ],
      [
        "Market Equilibrium",
        "The market clearing state where the quantity demanded by buyers equals the quantity supplied by sellers."
      ],
      [
        "Monopoly vs Oligopoly",
        "Monopoly features a solitary seller dominating the entire industry; Oligopoly features a small cluster of dominant firms."
      ]
    ],
    "qs": [
      [
        "If the price of a commodity rises by 10% and the quantity demanded falls by only 2%, the price elasticity of demand is:",
        [
          "Elastic (> 1)",
          "Inelastic (< 1)",
          "Unitary elastic (= 1)",
          "Perfectively elastic"
        ],
        1,
        "PED = 2% / 10% = 0.2 (< 1), indicating an inelastic demand typical of life essentials."
      ],
      [
        "In which market structure do many sellers offer slightly differentiated products, relying on branding and advertising?",
        [
          "Pure Monopoly",
          "Monopolistic Competition",
          "Perfect Competition",
          "Monopsony"
        ],
        1,
        "Monopolistic competition combines many firms with product differentiation (e.g., restaurants, clothing brands)."
      ]
    ]
  },
  {
    "id": "soc-econ-macro",
    "s": "soc",
    "free": 1,
    "title": "Macroeconomics: GDP, Inflation, and Monetary/Fiscal Policy",
    "notes": [
      "National accounts: Gross Domestic Product (GDP: total market value of final goods/services produced within domestic borders in a year) vs Gross National Income (GNI/GNP: includes net factor income from abroad like OFW remittances).",
      "Economic management: Inflation (sustained increase in general price levels, measured by Consumer Price Index CPI). Monetary Policy (controlled by the Bangko Sentral ng Pilipinas BSP; adjusting reserve requirements, rediscount rates, and overnight reverse repurchase rates). Fiscal Policy (controlled by National Government through Department of Finance; taxation and government budget spending to expand or contract economic activity)."
    ],
    "cards": [
      [
        "Gross Domestic Product (GDP)",
        "The total monetary value of all finished goods and services produced within a nation's geographic boundaries."
      ],
      [
        "Bangko Sentral ng Pilipinas (BSP)",
        "The independent central monetary authority of the Philippines tasked with maintaining price stability and banking liquidity."
      ],
      [
        "Expansionary Fiscal Policy",
        "Government measures increasing public spending or reducing taxes to stimulate economic growth during a recession."
      ]
    ],
    "qs": [
      [
        "Remittances sent home by Overseas Filipino Workers (OFWs) residing abroad are officially included in:",
        [
          "Philippine GDP only",
          "Philippine GNI / GNP, but not domestic GDP",
          "Neither GDP nor GNI",
          "Foreign GDP and Philippine GDP simultaneously"
        ],
        1,
        "GNI measures income earned by national citizens globally (including OFWs), whereas GDP only measures production physically inside domestic territory."
      ],
      [
        "When the Bangko Sentral ng Pilipinas (BSP) raises policy interest rates, what is its primary macroeconomic goal?",
        [
          "To accelerate rapid currency depreciation",
          "To cool runaway inflation by dampening excessive credit expansion",
          "To induce higher government budget deficits",
          "To eliminate domestic commercial banks"
        ],
        1,
        "Raising interest rates increases the cost of borrowing, cooling demand and containing inflationary pressures."
      ]
    ]
  },
  {
    "id": "soc-geography",
    "s": "soc",
    "free": 1,
    "title": "Philippine Geography and ASEAN Regional Integration",
    "notes": [
      "Philippine physical geography: Archipelago of 7,641 islands situated in Southeast Asia; boundaries defined by Archipelagic Doctrine (internal waters unified inside connecting baselines, embodied in Article I of the Constitution and UNCLOS). Divided into 17 Administrative Regions across Luzon, Visayas, and Mindanao.",
      "ASEAN (Association of Southeast Asian Nations): Founded on August 8, 1967 (Bangkok Declaration) by 5 founding members (Philippines, Indonesia, Malaysia, Singapore, Thailand). Expanded to 10 member nations. Pillars of ASEAN Community: Political-Security Community, Economic Community (AEC), and Socio-Cultural Community."
    ],
    "cards": [
      [
        "Archipelagic Doctrine",
        "Principles asserting that an archipelago's islands and surrounding waters form an indivisible geographic and sovereign unit."
      ],
      [
        "Founding Members of ASEAN (1967)",
        "Philippines, Indonesia, Malaysia, Singapore, and Thailand signed the Bangkok Declaration on August 8, 1967."
      ],
      [
        "UNCLOS",
        "United Nations Convention on the Law of the Sea; establishes 12 nautical mile territorial sea and 200 nautical mile Exclusive Economic Zone (EEZ)."
      ]
    ],
    "qs": [
      [
        "Which foundational document established the Association of Southeast Asian Nations (ASEAN) on August 8, 1967?",
        [
          "Manila Accord",
          "Bangkok Declaration",
          "Kuala Lumpur Treaty",
          "Treaty of Amity and Cooperation"
        ],
        1,
        "The Bangkok Declaration was signed in Thailand on August 8, 1967, establishing ASEAN."
      ],
      [
        "Under international maritime law (UNCLOS), how far from the territorial baseline does a coastal nation's Exclusive Economic Zone (EEZ) extend?",
        [
          "12 nautical miles",
          "24 nautical miles",
          "200 nautical miles",
          "500 nautical miles"
        ],
        2,
        "UNCLOS establishes an Exclusive Economic Zone (EEZ) extending up to 200 nautical miles from territorial baselines."
      ]
    ]
  },
  {
    "id": "soc-sociology",
    "s": "soc",
    "free": 1,
    "title": "Sociology and Anthropology: Culture, Socialization, and Stratification",
    "notes": [
      "Elements of culture: Values (abstract moral beliefs), Norms (behavioral guidelines divided into Folkways [routine everyday habits/etiquette], Mores [morally significant norms with severe sanctions], and Laws [codified norms enforced by state power]), and Symbols.",
      "Cultural perspectives: Ethnocentrism (judging other cultures as inferior using one's own culture as the gold standard) vs Cultural Relativism (evaluating cultural practices within the context of their own historical and societal norms). Social Stratification: Hierarchical ranking based on wealth, prestige, and power; Open class systems (social mobility based on achievement) vs Closed caste systems (ascribed status from birth)."
    ],
    "cards": [
      [
        "Ethnocentrism vs Cultural Relativism",
        "Ethnocentrism judges other cultures as backward; Cultural Relativism understands practices in their own context."
      ],
      [
        "Folkways vs Mores",
        "Folkways are customary social manners; Mores are vital moral imperatives violation of which offends societal decency."
      ],
      [
        "Social Mobility",
        "The movement of individuals or families between different socio-economic strata (upward, downward, horizontal)."
      ]
    ],
    "qs": [
      [
        "An anthropologist visiting an indigenous tribe avoids passing judgment on their unique burial rituals, interpreting them within the tribe's cosmological worldview. This attitude demonstrates:",
        [
          "Xenocentrism",
          "Cultural Relativism",
          "Ethnocentrism",
          "Cultural Imperialism"
        ],
        1,
        "Cultural relativism seeks to comprehend human customs through the perspective of the native culture itself."
      ],
      [
        "Eating soup directly with your fingers at a formal diplomatic state banquet violates which category of social norms?",
        [
          "Taboo",
          "Folkway",
          "Codified Statute",
          "More"
        ],
        1,
        "Violating proper dining etiquette or table manners breaches folkways (customary social conventions), not fundamental moral laws."
      ]
    ]
  },
  {
    "id": "tle-entrep",
    "s": "tle",
    "free": 1,
    "title": "Entrepreneurship: PECs and Business Planning",
    "notes": [
      "Personal Entrepreneurial Competencies (PECs) clustered into three behavioral areas: 1. Achievement Cluster (opportunity-seeking, risk-taking, demand for quality and efficiency, commitment to work contract, persistence), 2. Planning Cluster (goal setting, information seeking, systematic planning and monitoring), 3. Power Cluster (persuasion and networking, self-confidence).",
      "Business planning essentials: SWOT Analysis (Strengths, Weaknesses = internal; Opportunities, Threats = external). Marketing Mix (4Ps: Product, Price, Place, Promotion). Financial analysis: Break-Even Point (BEP = Total Fixed Costs / (Selling Price per Unit - Variable Cost per Unit))."
    ],
    "cards": [
      [
        "PECs Clusters",
        "The 10 core competencies categorized into Achievement, Planning, and Power clusters."
      ],
      [
        "SWOT Analysis",
        "Strategic evaluation tool examining internal Strengths & Weaknesses alongside external Opportunities & Threats."
      ],
      [
        "Break-Even Point (BEP)",
        "The operational production volume where total revenue precisely equals total operating costs (zero profit/loss)."
      ]
    ],
    "qs": [
      [
        "In SWOT analysis, an increase in raw material import tariffs or the emergence of aggressive competitors is classified under:",
        [
          "Strengths",
          "Weaknesses",
          "Opportunities",
          "Threats"
        ],
        3,
        "External factors outside the enterprise that can jeopardize operational success are classified as Threats."
      ],
      [
        "A small bakery has fixed costs of ₱10,000 per month. If each cake sells for ₱500 and variable cost is ₱300, how many cakes must be sold to break even?",
        [
          "20 cakes",
          "50 cakes",
          "100 cakes",
          "33 cakes"
        ],
        1,
        "BEP = Fixed Costs / (Price - Variable Cost) = 10,000 / (500 - 300) = 10,000 / 200 = 50 cakes."
      ]
    ]
  },
  {
    "id": "tle-agri-crop",
    "s": "tle",
    "free": 1,
    "title": "Agricultural Arts: Crop Production and Plant Propagation",
    "notes": [
      "Plant propagation techniques: Sexual propagation (seeds; genetic variation, taproot development) vs Asexual / Vegetative propagation (cloning identical parent traits; cutting, layering, marcotting/air-layering, grafting, budding, and tissue culture).",
      "Soil science and plant nutrition: Essential macronutrients (NPK: Nitrogen for vegetative foliage, Phosphorus for root development and flowering, Potassium for disease resistance and fruit quality). Organic farming practices: Composting, crop rotation, integrated pest management (IPM)."
    ],
    "cards": [
      [
        "Marcotting (Air Layering)",
        "Asexual propagation inducing roots to form on a stem branch while still attached to the parent plant by removing a bark ring and wrapping with moist sphagnum."
      ],
      [
        "NPK Ratio",
        "The vital macronutrient trio: Nitrogen (leaf growth), Phosphorus (root/bloom growth), and Potassium (vigor/health)."
      ],
      [
        "Grafting",
        "Joining a scion (desirable upper branch) onto an established rootstock to grow as a unified single plant."
      ]
    ],
    "qs": [
      [
        "Which primary plant macronutrient is primarily responsible for robust root establishment, flower blooming, and seed development?",
        [
          "Nitrogen",
          "Phosphorus",
          "Potassium",
          "Calcium"
        ],
        1,
        "Phosphorus (P) stimulates vigorous root proliferation, blossom development, and energy transfer (ATP)."
      ],
      [
        "In horticultural grafting, what do you call the upper shoot or bud carrying desirable fruit characteristics that is attached onto the rootstock?",
        [
          "Scion",
          "Cambium",
          "Stolon",
          "Rhizome"
        ],
        0,
        "The scion is the detached shoot or branch chosen for its superior fruit or flower traits joined to the rootstock."
      ]
    ]
  },
  {
    "id": "tle-agri-animal",
    "s": "tle",
    "free": 1,
    "title": "Animal Production: Poultry, Swine, and Aquaculture Management",
    "notes": [
      "Poultry management: Broiler production (meat chickens, rapid 35-42 day growth cycles, high protein starter mash) vs Layer production (egg production, lighting stimulation, calcium-rich layer rations). Biosecurity and vaccination protocols against Newcastle Disease and Avian Influenza.",
      "Swine and aquaculture: Swine lifecycle (gestation 114 days [3 months, 3 weeks, 3 days], farrowing, weaning, grower, finisher). Aquaculture: Tilapia and milkfish (Bangus) pond management, water quality monitoring (Dissolved Oxygen DO ≥ 5 ppm, pH 6.5-8.5, ammonia control)."
    ],
    "cards": [
      [
        "Swine Gestation Period",
        "114 days (approximately 3 months, 3 weeks, and 3 days)."
      ],
      [
        "Broiler vs Layer",
        "Broilers are meat-type chickens raised for rapid weight gain; Layers are egg-type chickens raised for egg cycles."
      ],
      [
        "Dissolved Oxygen (DO)",
        "Critical water quality parameter in aquaculture; levels below 3-4 ppm trigger acute fish stress and mortality."
      ]
    ],
    "qs": [
      [
        "What is the average gestation period of a domestic breeding sow?",
        [
          "60 days",
          "90 days",
          "114 days",
          "150 days"
        ],
        2,
        "Swine gestation averages 114 days (remembered as 3 months, 3 weeks, and 3 days)."
      ],
      [
        "In commercial layer poultry operations, what environmental stimulus is systematically regulated to stimulate and maintain maximum egg-laying cycles?",
        [
          "Atmospheric humidity",
          "Daily photoperiod (light exposure)",
          "Soil salinity",
          "Background musical frequency"
        ],
        1,
        "Maintaining 14 to 16 hours of light daily stimulates the pituitary gland to release reproductive hormones controlling ovulation in hens."
      ]
    ]
  },
  {
    "id": "tle-culinary",
    "s": "tle",
    "free": 1,
    "title": "Commercial Cooking: Food Safety, Sanitation, and Culinary Methods",
    "notes": [
      "Food safety guidelines: HACCP (Hazard Analysis Critical Control Point) system. The Temperature Danger Zone (TDZ) is 40°F to 140°F (4°C to 60°C), where bacteria multiply rapidly; food should not remain in TDZ for more than 2 hours. Cross-contamination prevention using color-coded cutting boards (Red = raw meat, Yellow = poultry, Blue = seafood, Green = produce).",
      "Culinary techniques: Moist-heat methods (poaching, simmering, boiling, steaming, braising) vs Dry-heat methods (baking, roasting, broiling, grilling, deep-frying, sautéing). Knife cuts: Julienne (1/8 × 1/8 × 2 in), Brunoise (1/8 in cube), Batonnet (1/4 × 1/4 × 2 in), Small dice (1/4 in cube)."
    ],
    "cards": [
      [
        "Temperature Danger Zone",
        "40°F to 140°F (4°C to 60°C); the thermal range where foodborne pathogens reproduce exponentially."
      ],
      [
        "HACCP Principles",
        "Systematic preventive food safety management system identifying, monitoring, and controlling biological/chemical hazards."
      ],
      [
        "Cross-Contamination",
        "The unintentional transfer of pathogenic microorganisms from contaminated surfaces or raw meats to ready-to-eat foods."
      ]
    ],
    "qs": [
      [
        "Between what temperatures does the food safety 'Temperature Danger Zone' fall?",
        [
          "0°F to 32°F (-18°C to 0°C)",
          "40°F to 140°F (4°C to 60°C)",
          "150°F to 212°F (65°C to 100°C)",
          "70°F to 90°F (21°C to 32°C)"
        ],
        1,
        "The Temperature Danger Zone is 40°F to 140°F (4°C to 60°C); food left in this range experiences exponential microbial growth."
      ],
      [
        "What classical French culinary knife cut produces thin matchstick batons measuring 1/8 inch × 1/8 inch × 2 inches?",
        [
          "Brunoise",
          "Julienne",
          "Chiffonade",
          "Mirepoix"
        ],
        1,
        "Julienne is the classic matchstick cut with dimensions of 1/8\" × 1/8\" × 2\"."
      ]
    ]
  },
  {
    "id": "tle-baking",
    "s": "tle",
    "free": 1,
    "title": "Bread and Pastry Production: Formulations and Baking Science",
    "notes": [
      "Core baking ingredients: Flour (bread flour has highest gluten-forming proteins [12-14%] for chewy structure; cake flour has lowest [7-9%] for tender crumb; all-purpose flour [10-11%]). Leavening agents: Biological (yeast fermenting sugars into CO₂ and alcohol) vs Chemical (baking soda [sodium bicarbonate, requires acid] vs baking powder [contains bicarbonate + cream of tartar acid]).",
      "Baking physics: Gluten formation occurs when wheat proteins glutenin and gliadin hydrate and undergo mechanical kneading. Sugar provides sweetness, tenderness (weakens gluten), and browning via Caramelization and Maillard Reaction."
    ],
    "cards": [
      [
        "Gluten Development",
        "Formed when flour proteins glutenin and gliadin combine with water and are mechanically kneaded into an elastic network."
      ],
      [
        "Baking Soda vs Powder",
        "Baking soda is pure alkaline sodium bicarbonate needing external acid; baking powder contains its own dry acid salts."
      ],
      [
        "Yeast Fermentation",
        "Biological process where Saccharomyces cerevisiae consumes sugars, yielding carbon dioxide gas bubbles and ethanol."
      ]
    ],
    "qs": [
      [
        "Which type of wheat flour contains the highest percentage of gluten-forming protein, making it ideal for yeast breads?",
        [
          "Cake Flour",
          "Pastry Flour",
          "Bread Flour",
          "All-Purpose Flour"
        ],
        2,
        "Bread flour contains 12-14% protein, producing the strong elastic gluten matrix required to trap yeast gas in breads."
      ],
      [
        "Why does pure baking soda require an acidic ingredient (like buttermilk, lemon juice, or yogurt) in a batter formulation?",
        [
          "To prevent the batter from rising",
          "To trigger the chemical release of carbon dioxide gas bubbles for leavening",
          "To preserve the pastry from spoiling",
          "To eliminate the need for oven preheating"
        ],
        1,
        "Baking soda is an alkaline base that requires an acid reactant to generate CO₂ gas bubbles that leaven the batter."
      ]
    ]
  },
  {
    "id": "tle-drafting",
    "s": "tle",
    "free": 1,
    "title": "Technical Drafting: Orthographic Projections and CAD Tools",
    "notes": [
      "Technical drawing fundamentals: Alphabet of Lines (Object/Visible line = thick solid, Hidden line = medium dashed, Center line = alternating long-short dashes, Dimension/Extension lines = thin solid, Cutting plane line = very thick).",
      "Orthographic Projection: Multiview drawing representing a 3D object using two or more 2D views (Front, Top, and Right Side views). Third-Angle Projection is the standard drawing standard in the Philippines and USA. Computer-Aided Design (CAD): Layers, scaling, snapping, orthogonal constraints, and dimensioning commands."
    ],
    "cards": [
      [
        "Alphabet of Lines",
        "Standardized system of line weights and conventions used in technical drafting to convey precise structural information."
      ],
      [
        "Third-Angle Projection",
        "Standard orthographic system where the object is viewed through projection planes positioned between the observer and the object."
      ],
      [
        "Hidden Line",
        "A dashed line style representing interior edges, contours, or surfaces concealed from direct exterior view."
      ]
    ],
    "qs": [
      [
        "Which line in the technical Alphabet of Lines is drawn with short, evenly-spaced dashes to portray interior edges hidden from view?",
        [
          "Visible line",
          "Hidden line",
          "Center line",
          "Leader line"
        ],
        1,
        "Hidden lines consist of medium-weight dashes used to portray features concealed behind solid faces."
      ],
      [
        "In standard third-angle orthographic projection, what is the spatial position of the Top View relative to the Front View?",
        [
          "Directly below the front view",
          "Directly above the front view",
          "To the right of the side view",
          "Superimposed over the front view"
        ],
        1,
        "In third-angle projection, the Top view is placed directly above the Front view."
      ]
    ]
  },
  {
    "id": "tle-electrical",
    "s": "tle",
    "free": 1,
    "title": "Electrical Installation: Domestic Wiring, Circuits, and Safety",
    "notes": [
      "Basic electrical laws: Ohm's Law (V = IR), Electric Power formula (P = VI = I²R, measured in Watts). Conductor sizing: American Wire Gauge (AWG); smaller gauge numbers designate thicker wire conductors (e.g., #12 AWG for 20A outlet circuits, #14 AWG for 15A lighting circuits).",
      "Safety and Philippine Electrical Code (PEC): Circuit protection devices include circuit breakers and Ground Fault Circuit Interrupters (GFCI) installed in wet areas (bathrooms, kitchens). Color conventions: Black/Red (hot/line), White (neutral), Green/Bare Copper (safety equipment ground)."
    ],
    "cards": [
      [
        "Circuit Breaker",
        "An electromechanical safety switch designed to automatically interrupt electrical flow upon detecting an overload or short circuit."
      ],
      [
        "GFCI (Ground Fault Circuit Interrupter)",
        "Fast-acting circuit breaker designed to trip within milliseconds upon detecting leakage current to ground, preventing electrocution."
      ],
      [
        "AWG Wire Sizing",
        "American Wire Gauge; inverse sizing where lower number means thicker diameter and higher current ampacity."
      ]
    ],
    "qs": [
      [
        "According to standard electrical building codes, what standard AWG copper wire size is required for residential 20-ampere convenience outlet circuits?",
        [
          "#14 AWG",
          "#12 AWG",
          "#10 AWG",
          "#8 AWG"
        ],
        1,
        "#12 AWG copper wire is the standard minimum conductor size rated for 20-ampere branch circuits."
      ],
      [
        "What safety device is mandatory in wet locations (kitchens, bathrooms, outdoor outlets) to protect individuals against fatal electric shocks from ground faults?",
        [
          "Step-up transformer",
          "Ground Fault Circuit Interrupter (GFCI)",
          "Knife switch",
          "Rheostat"
        ],
        1,
        "GFCIs instantly shut off power if current leaks to ground, preventing fatal electric shocks."
      ]
    ]
  },
  {
    "id": "tle-electronics",
    "s": "tle",
    "free": 1,
    "title": "Consumer Electronics: Components, Color Codes, and Testing",
    "notes": [
      "Electronic components: Passive (resistors, capacitors, inductors) vs Active (diodes, transistors, integrated circuits ICs). Resistor 4-band Color Code: Black(0), Brown(1), Red(2), Orange(3), Yellow(4), Green(5), Blue(6), Violet(7), Gray(8), White(9); Gold (±5%), Silver (±10%). Formula: [Band 1][Band 2] × 10^(Band 3) ± Tolerance.",
      "Multimeter testing: Continuity testing, resistance checks (must de-energize circuit), AC/DC voltage measurement, diode forward-bias voltage drop (~0.7V for silicon). Soldering safety: 60/40 rosin-core solder, tinning the soldering tip, preventing cold solder joints."
    ],
    "cards": [
      [
        "Resistor Color Code Mnemonic",
        "Bad Boys Raped Our Young Girls But Violet Gave Willingly (Black, Brown, Red, Orange, Yellow, Green, Blue, Violet, Gray, White)."
      ],
      [
        "Diode",
        "A semiconductor device that permits electric current to flow in one direction only (from anode to cathode)."
      ],
      [
        "Cold Solder Joint",
        "A defective solder connection resulting from insufficient heating or movement during cooling, causing intermittent circuits."
      ]
    ],
    "qs": [
      [
        "A carbon composition resistor displays the color bands: Brown, Black, Red, Gold. What is its nominal resistance and tolerance?",
        [
          "100 Ohms ± 5%",
          "1,000 Ohms (1 kΩ) ± 5%",
          "10,000 Ohms (10 kΩ) ± 10%",
          "120 Ohms ± 5%"
        ],
        1,
        "Brown (1), Black (0), Red (multiplier 10² = 100), Gold (±5%): 10 × 100 = 1,000 Ω (1 kΩ) ± 5%."
      ],
      [
        "What semiconductor component functions as an electronic one-way check valve, allowing current to conduct in only one forward direction?",
        [
          "Capacitor",
          "Inductor",
          "Diode",
          "Transformer"
        ],
        2,
        "A semiconductor diode conducts current readily when forward-biased, but blocks reverse current."
      ]
    ]
  },
  {
    "id": "tle-carpentry",
    "s": "tle",
    "free": 1,
    "title": "Carpentry and Masonry: Woodworking Joints and Concrete Mixtures",
    "notes": [
      "Carpentry tools and joints: Measuring (steel tape, framing square), cutting (crosscut saw across grain, rip saw along grain). Wood joinery: Butt joint, Lap joint, Mortise and Tenon (strongest traditional joint), Rabbet, Dado, and Miter joint.",
      "Masonry fundamentals: Standard concrete mix ratios (cement : sand : gravel): Class AA (1 : 1.5 : 3 for underwater/tanks), Class A (1 : 2 : 4 for beams, columns, suspended slabs), Class B (1 : 2.5 : 5 for exterior walls), Class C (1 : 3 : 6 for footings/pathways). Curing concrete: Keeping concrete continuously moist for at least 7-28 days guarantees maximum compressive strength."
    ],
    "cards": [
      [
        "Class A Concrete Ratio",
        "1 : 2 : 4 (1 part Portland cement, 2 parts clean sand, 4 parts crushed gravel); used for structural columns and beams."
      ],
      [
        "Mortise and Tenon",
        "One of the oldest, strongest woodworking joints where a projecting tenon fits into a mortise cavity."
      ],
      [
        "Rip Saw vs Crosscut Saw",
        "Rip saws cut parallel along the wood grain; Crosscut saws cut across the wood grain."
      ]
    ],
    "qs": [
      [
        "What is the standard volumetric proportion of cement, sand, and gravel for a Class A concrete mixture used in reinforced concrete columns and beams?",
        [
          "1 : 1.5 : 3",
          "1 : 2 : 4",
          "1 : 2.5 : 5",
          "1 : 3 : 6"
        ],
        1,
        "Class A concrete mixture uses 1 part cement, 2 parts sand, and 4 parts gravel."
      ],
      [
        "Which handsaw has chisel-like teeth designed specifically to cut parallel along the direction of the wood grain?",
        [
          "Coping saw",
          "Hacksaw",
          "Rip saw",
          "Crosscut saw"
        ],
        2,
        "A rip saw has teeth designed to chisel and cut parallel along the grain of the wood."
      ]
    ]
  },
  {
    "id": "tle-ict-networking",
    "s": "tle",
    "free": 1,
    "title": "Computer Systems Servicing: LAN Cabling, IP Addressing, and BIOS",
    "notes": [
      "Network physical cabling: Unshielded Twisted Pair (UTP) Category 5e/6 terminated with RJ-45 connectors. TIA/EIA-568A wiring: White-Green, Green, White-Orange, Blue, White-Blue, Orange, White-Brown, Brown. TIA/EIA-568B wiring: White-Orange, Orange, White-Green, Blue, White-Blue, Green, White-Brown, Brown. Straight-through cable (connects unlike devices like PC to Switch) vs Crossover cable (connects like devices).",
      "Network fundamentals: IPv4 addressing (32-bit dotted-decimal: Network ID + Host ID). Default Subnet Masks: Class A (255.0.0.0), Class B (255.255.0.0), Class C (255.255.255.0). Basic Input/Output System (BIOS/UEFI): Power-On Self-Test (POST), boot sequence configuration."
    ],
    "cards": [
      [
        "TIA/EIA-568B Color Order",
        "White-Orange, Orange, White-Green, Blue, White-Blue, Green, White-Brown, Brown."
      ],
      [
        "Straight-Through vs Crossover",
        "Straight-through (same pinout both ends) connects different devices; Crossover (568A on one, 568B on other) connects identical devices."
      ],
      [
        "POST (Power-On Self-Test)",
        "Firmware diagnostic routine executed by BIOS immediately after powering on to verify hardware components."
      ]
    ],
    "qs": [
      [
        "Which wiring standard color code sequence begins with White-Orange, Orange, White-Green, Blue, White-Blue, Green?",
        [
          "TIA/EIA-568A",
          "TIA/EIA-568B",
          "USOC / RJ-11",
          "IEEE 802.11ax"
        ],
        1,
        "TIA/EIA-568B begins with the orange pair (White-Orange, Orange) followed by White-Green, Blue."
      ],
      [
        "What is the default subnet mask for a standard Class C private IPv4 network address (such as 192.168.1.1)?",
        [
          "255.0.0.0",
          "255.255.0.0",
          "255.255.255.0",
          "255.255.255.255"
        ],
        2,
        "Class C IP addresses have a default 24-bit network mask of 255.255.255.0."
      ]
    ]
  },
  {
    "id": "mapeh-music-theory",
    "s": "mapeh",
    "free": 1,
    "title": "Music Theory: Elements, Notes, and Time Signatures",
    "notes": [
      "Elements of music: Rhythm (beat, meter, tempo), Melody (pitch contour, intervals), Harmony (chords, consonance, dissonance), Texture (Monophonic [single melodic line], Homophonic [melody with chordal accompaniment], Polyphonic [multiple independent melodic lines]), Timbre (tone color of instruments/voices), Dynamics (volume from pianissimo to fortissimo), and Form.",
      "Notation: Clefs (Treble / G Clef, Bass / F Clef). Time signatures: Simple meter (2/4, 3/4, 4/4 where beat subdivides into two equal parts) vs Compound meter (6/8, 9/8, 12/8 where beat subdivides into three parts)."
    ],
    "cards": [
      [
        "Monophonic vs Polyphonic",
        "Monophonic is a single unaccompanied melody; Polyphonic contains two or more simultaneous independent melodies."
      ],
      [
        "Time Signature 3/4",
        "Three quarter-note beats per measure; characteristic waltz meter."
      ],
      [
        "Treble Clef Spaces Mnemonic",
        "F - A - C - E spelling the word 'FACE' from bottom space to top space."
      ]
    ],
    "qs": [
      [
        "What musical texture describes a lead soprano singing a melodic solo while accompanied by harmonious guitar chord progressions?",
        [
          "Monophonic",
          "Homophonic",
          "Polyphonic",
          "Heterophonic"
        ],
        1,
        "Homophonic texture features one distinct melodic line supported by chordal harmonic accompaniment."
      ],
      [
        "In 4/4 time signature, how many beats does a dotted half note receive?",
        [
          "2 beats",
          "3 beats",
          "4 beats",
          "1.5 beats"
        ],
        1,
        "A half note receives 2 beats; a dot adds half of its value (1 beat), totaling 2 + 1 = 3 beats."
      ]
    ]
  },
  {
    "id": "mapeh-phil-music",
    "s": "mapeh",
    "free": 1,
    "title": "Traditional Philippine Music: Indigenous and Colonial",
    "notes": [
      "Indigenous music traditions: Northern Luzon Cordillera music features gong ensembles (Gangsa played toppaya with open palms or palook with padded beaters), bamboo instruments (tongatong stamping tubes, bungkaka bamboo buzzers, saggeypo panpipes). Southern Mindanao Muslim music features the Kulintang ensemble (graduated horizontal brass gongs, agung, dabakan drum, babandil).",
      "Spanish-influenced secular and sacred music: Kundiman (lyrical lyrical art song of romantic passion and patriotic yearning in triple time), Harana (traditional courtship serenade), Rondalla (string ensemble playing bandurria, laud, octavina, guitar, and bajo de uñas), and Pasyon chanting during Holy Week."
    ],
    "cards": [
      [
        "Kulintang Ensemble",
        "Southern gong ensemble composed of 8 tuned horizontal gongs, agung, gandingan, babandil, and dabakan drum."
      ],
      [
        "Gangsa",
        "Flat brass gongs of the Cordillera highlands played either by hand slapping (toppaya) or padded wooden sticks (palook)."
      ],
      [
        "Bandurria",
        "The 14-stringed pear-shaped primary melodic instrument of the Philippine Rondalla ensemble."
      ]
    ],
    "qs": [
      [
        "What traditional 14-stringed musical instrument serves as the lead melodic voice in a Philippine Rondalla ensemble?",
        [
          "Bajo de Uñas",
          "Octavina",
          "Bandurria",
          "Gitara"
        ],
        2,
        "The bandurria plays the main melody and intricate rapid runs in a traditional Filipino rondalla."
      ],
      [
        "The Kulintang gong chime ensemble is a musical tradition belonging to which Philippine cultural region?",
        [
          "Cordillera Central of Northern Luzon",
          "Indigenous communities of Southern Mindanao and Sulu",
          "Visayan coastal fishing communities",
          "Bicol mainland lowlands"
        ],
        1,
        "Kulintang music is the centuries-old gong-chime art form of the Maguindanao, Maranao, and Tausug of Mindanao and Sulu."
      ]
    ]
  },
  {
    "id": "mapeh-visual-arts",
    "s": "mapeh",
    "free": 1,
    "title": "Visual Arts: Elements and Principles of Design",
    "notes": [
      "Elements of visual art: Line (contour, direction), Shape (geometric vs organic 2D areas), Form (3D volume), Color (Hue [color name], Value [lightness/darkness], Intensity/Saturation [purity/vividness]), Texture (tactile feel), and Space (positive vs negative space, perspective).",
      "Color Theory: Primary (Red, Yellow, Blue), Secondary (Orange, Green, Violet), Tertiary colors. Color harmonies: Complementary (opposite on color wheel, e.g., Blue and Orange), Analogous (adjacent on wheel). Principles of design: Balance (symmetrical, asymmetrical, radial), Contrast, Emphasis (focal point), Movement, Pattern, Rhythm, and Unity/Harmony."
    ],
    "cards": [
      [
        "Complementary Colors",
        "Colors located directly opposite each other on the standard color wheel (e.g., Red and Green, Blue and Orange)."
      ],
      [
        "Asymmetrical Balance",
        "Visual equilibrium achieved using dissimilar objects or visual weights that balance each other without mirroring."
      ],
      [
        "Negative Space",
        "The unoccupied, empty area surrounding and accentuating the primary subject or focal object in a composition."
      ]
    ],
    "qs": [
      [
        "Which color scheme employs three or more hues that sit immediately adjacent to each other on the standard color wheel?",
        [
          "Monochromatic",
          "Complementary",
          "Analogous",
          "Triadic"
        ],
        2,
        "Analogous colors are side-by-side neighbors on the color wheel (e.g., yellow, yellow-green, and green)."
      ],
      [
        "What principle of design is achieved when all visual elements in an artwork work together to project a cohesive, harmonious whole?",
        [
          "Contrast",
          "Unity / Harmony",
          "Isolation",
          "Asymmetry"
        ],
        1,
        "Unity (or harmony) gives an artwork a finished, cohesive feel by tying all design elements into a unified whole."
      ]
    ]
  },
  {
    "id": "mapeh-phil-art",
    "s": "mapeh",
    "free": 1,
    "title": "Philippine Indigenous Arts, Crafts, and Architecture",
    "notes": [
      "Pre-colonial and indigenous art: Manunggul Jar (Neolithic burial jar from Palawan depicting two figures rowing a boat to the afterlife), Maitum anthropomorphic burial jars (Sarangani).",
      "Textiles and woodcarving: T'nalak (abaca cloth woven by T'boli dreamweavers inspired by Fu Dalu in dreams), Inabel (Ilocano handwoven cloth), Yakan tapestries. Woodcarving: Okir (curvilinear floral and geometric motifs of the Maranao and Maguindanao; Sarimanok mythical bird holding a fish, Naga serpent motif) and Torogan (royal ancestral house of Maranao royalty with panolong carved beam ends)."
    ],
    "cards": [
      [
        "Manunggul Jar",
        "Late Neolithic secondary burial jar from Palawan whose lid features two souls voyaging to the afterlife in a proa boat."
      ],
      [
        "T'nalak Weaving",
        "Sacred abaca cloth crafted by T'boli women dreamweavers through tie-dye resist techniques."
      ],
      [
        "Sarimanok & Okir",
        "Maranao decorative artistic tradition featuring flowing floral arabesques (okir) and the legendary colorful omen bird (sarimanok)."
      ]
    ],
    "qs": [
      [
        "The famous Manunggul Jar discovered in the Tabon Caves of Palawan was originally created to serve what cultural function?",
        [
          "Cooking ceremonial feast rice",
          "Storing potable water during sea voyages",
          "Secondary burial vessel for human skeletal remains",
          "Holding royal gold piloncitos"
        ],
        2,
        "The Manunggul jar is a world-renowned secondary burial jar symbolizing the soul's voyage to the afterlife."
      ],
      [
        "Which indigenous group from Lake Sebu, South Cotabato is famous for weaving sacred T'nalak abaca textiles based on patterns revealed in dreams?",
        [
          "Ifugao",
          "T'boli",
          "Maranao",
          "Badjao"
        ],
        1,
        "T'boli women weavers produce sacred T'nalak abaca cloth inspired by the spirit Fu Dalu in their dreams."
      ]
    ]
  },
  {
    "id": "mapeh-pe-fitness",
    "s": "mapeh",
    "free": 1,
    "title": "Physical Fitness: Health-Related and Skill-Related Components",
    "notes": [
      "Physical Fitness components: 1. Health-Related Fitness (HRF): Cardiovascular Endurance (tested by 3-minute step test), Muscular Strength (push-ups), Muscular Endurance (basic plank), Flexibility (Sit-and-Reach), and Body Composition (Body Mass Index BMI = weight in kg / (height in meters)²).",
      "2. Skill-Related Fitness (SRF): Agility (Illinois / Shuttle run), Balance (Stork balance stand), Coordination (Juggling), Power (Standing long jump), Reaction Time (Stick drop test), and Speed (40-meter sprint). FITT Principle of exercise prescription: Frequency, Intensity, Time, Type."
    ],
    "cards": [
      [
        "Health-Related Fitness (5 components)",
        "Cardiovascular Endurance, Muscular Strength, Muscular Endurance, Flexibility, and Body Composition."
      ],
      [
        "Skill-Related Fitness (6 components)",
        "Agility, Balance, Coordination, Power, Reaction Time, and Speed."
      ],
      [
        "FITT Principle",
        "Exercise programming blueprint: Frequency (how often), Intensity (how hard), Time (duration), and Type (mode)."
      ]
    ],
    "qs": [
      [
        "Which of the following is classified as a Health-Related Fitness (HRF) component rather than a Skill-Related component?",
        [
          "Agility",
          "Cardiovascular Endurance",
          "Coordination",
          "Reaction Time"
        ],
        1,
        "Cardiovascular endurance directly promotes overall cardiovascular health and longevity (HRF component)."
      ],
      [
        "What is the Body Mass Index (BMI) of an individual who weighs 70 kg and has a height of 1.75 meters?",
        [
          "22.9 kg/m² (Normal)",
          "25.5 kg/m² (Overweight)",
          "18.5 kg/m² (Underweight)",
          "30.0 kg/m² (Obese)"
        ],
        0,
        "BMI = 70 / (1.75)² = 70 / 3.0625 = 22.86 ≈ 22.9 kg/m², which falls in the normal healthy weight range (18.5 - 24.9)."
      ]
    ]
  },
  {
    "id": "mapeh-pe-dance",
    "s": "mapeh",
    "free": 1,
    "title": "Philippine Folk Dance: Categories, Terms, and Fundamental Positions",
    "notes": [
      "Five Fundamental Positions of Arms and Feet: Arms: 1st (raised in circle in front of chest), 2nd (opened sideward at shoulder level), 3rd (one arm raised overhead, other sideward), 4th (one arm raised in front, other overhead), 5th (both arms raised overhead). Feet: 1st (heels together, toes open at 45°), 2nd (feet apart sideward about 1 pace), 3rd (heel of one foot touching instep of other), 4th (one foot in front of other), 5th (heel of front foot touching big toe of rear foot).",
      "Folk Dance Classifications: Cordillera Dances (Bendian, Banga), Spanish-Influenced Maria Clara Dances (Cariñosa, Pandanggo sa Ilaw), Muslim/Moro Dances (Singkil, Pangalay with brass janggay claws), Rural/Christian Lowland Dances (Tinikling, Maglalatik, Sayaw sa Bangko)."
    ],
    "cards": [
      [
        "Tinikling",
        "National folk dance from Leyte mimicking the movements of the tikling bird hopping between bamboo poles."
      ],
      [
        "Singkil",
        "Royal Maranao epic dance based on the Darangen portraying Princess Gandingan navigating swaying bamboo poles during an earthquake."
      ],
      [
        "First Position of Feet",
        "Heels closed together with toes pointed outward at an angle of roughly 45 degrees."
      ]
    ],
    "qs": [
      [
        "Which world-renowned Philippine folk dance mimics the graceful agility of a bird dodging bamboo traps set by rice farmers?",
        [
          "Maglalatik",
          "Singkil",
          "Tinikling",
          "Cariñosa"
        ],
        2,
        "Tinikling imitates the tikling bird dodging bamboo traps in rice fields."
      ],
      [
        "In the fundamental dance positions, where are both arms positioned in the First Position?",
        [
          "Opened wide sideward at shoulder height with curved elbows",
          "Raised forward in a circle in front of the chest with fingertips about an inch apart",
          "Raised straight up toward the ceiling parallel to the ears",
          "Placed firmly on the hips with thumbs back"
        ],
        1,
        "In 1st position of the arms, both arms are raised forward forming a soft circle in front of the chest."
      ]
    ]
  },
  {
    "id": "mapeh-sports-team",
    "s": "mapeh",
    "free": 1,
    "title": "Team Sports: Basketball and Volleyball Rules and Officiating",
    "notes": [
      "Basketball: FIBA court dimensions (28m × 15m), rim height (3.05m / 10ft). Time violations: 24-second shot clock, 8-second backcourt rule, 5-second closely guarded rule, 3-second key violation. Fouls: Personal, Technical (unsportsmanlike conduct without contact), Flagrant. Official hand signals for traveling, double dribble, charging, blocking.",
      "Volleyball: Court dimensions (18m × 9m), net height (Men: 2.43m, Women: 2.24m). Rotations: Clockwise rotation when winning the serve from opponents. Maximum 3 hits per side (block does not count as a team hit). Libero rules: Defensive specialist, cannot attack front row, cannot serve or block."
    ],
    "cards": [
      [
        "Libero Player Rules",
        "Specialized defensive player wearing contrasting jersey; cannot block, attempt an attack hit, or serve (FIVB)."
      ],
      [
        "Basketball 24-Second Clock",
        "The offensive possession shot clock requiring a shot attempt to touch the ring within 24 seconds."
      ],
      [
        "Three-Hit Rule (Volleyball)",
        "A team is allowed a maximum of three successive ball contacts to return the ball across the net."
      ]
    ],
    "qs": [
      [
        "In official FIVB volleyball, what is the regulation net height for Senior Women's competitive play?",
        [
          "2.43 meters",
          "2.24 meters",
          "2.15 meters",
          "2.50 meters"
        ],
        1,
        "Official FIVB net height is 2.24 meters for women (and 2.43 meters for men)."
      ],
      [
        "In basketball, an offensive player remaining inside the opponent's restricted key area without the ball for more than how many seconds commits a violation?",
        [
          "3 seconds",
          "5 seconds",
          "8 seconds",
          "10 seconds"
        ],
        0,
        "The 3-second lane rule prohibits offensive players from lingering inside the key for more than 3 consecutive seconds."
      ]
    ]
  },
  {
    "id": "mapeh-health-com",
    "s": "mapeh",
    "free": 1,
    "title": "Community and Environmental Health: Disease Prevention and Sanitation",
    "notes": [
      "Primary Health Care (PHC): Alma-Ata Declaration (1978) goal of 'Health for All'. Philippine Department of Health (DOH) health programs: Expanded Program on Immunization (EPI), maternal and child health, Universal Health Care (UHC) Act (RA 11223).",
      "Environmental sanitation: Solid waste management (Ecological Solid Waste Management Act RA 9003: 3Rs - Reduce, Reuse, Recycle). Communicable disease prevention: Vector control (dengue 4S strategy: Search and destroy, Self-protection, Seek early consultation, Say yes to fogging during outbreaks). Water purification methods (chlorination, boiling, filtration)."
    ],
    "cards": [
      [
        "RA 9003",
        "Ecological Solid Waste Management Act of 2000 mandating waste segregation at source and sanitary landfills."
      ],
      [
        "DOH Dengue 4S Strategy",
        "Search and destroy breeding sites, Self-protection measures, Seek early medical advice, Say yes to targeted fogging."
      ],
      [
        "Universal Health Care (RA 11223)",
        "Philippine law ensuring all Filipino citizens are automatically enrolled in PhilHealth with equitable access to quality care."
      ]
    ],
    "qs": [
      [
        "What is the cornerstone legislation governing ecological solid waste segregation, reduction, and recycling in the Philippines?",
        [
          "RA 8749 (Clean Air Act)",
          "RA 9275 (Clean Water Act)",
          "RA 9003 (Ecological Solid Waste Management Act)",
          "RA 10121 (DRRM Act)"
        ],
        2,
        "Republic Act 9003 institutionalizes comprehensive solid waste management and segregation."
      ],
      [
        "What component of the DOH Dengue 4S strategy is the most cost-effective long-term measure for eradicating Aedes aegypti mosquitoes?",
        [
          "Mass outdoor thermal fogging",
          "Search and destroy standing water breeding containers",
          "Routine antibiotic administration",
          "Closing school windows during classes"
        ],
        1,
        "Searching and destroying stagnant water receptacles permanently eliminates mosquito larvae before adult emergence."
      ]
    ]
  },
  {
    "id": "mapeh-health-nutri",
    "s": "mapeh",
    "free": 1,
    "title": "Nutrition Across Life Stages and Deficiency Disorders",
    "notes": [
      "Nutritional guidelines: Pinggang Pinoy (food plate model created by FNRI: 1/2 vegetables and fruits [Glow], 1/4 grains/carbohydrates [Go], 1/4 proteins [Grow]). 10 Nutritional Guidelines for Filipinos (NGF). Macronutrients: Carbohydrates (4 kcal/g), Proteins (4 kcal/g), Fats (9 kcal/g).",
      "Micronutrient malnutrition and deficiencies: Vitamin A deficiency (Night blindness / Xerophthalmia), Vitamin C deficiency (Scurvy, bleeding gums), Vitamin D deficiency (Rickets in children, Osteomalacia in adults), Iron deficiency (Anemia, low hemoglobin), Iodine deficiency (Goiter, cretinism / mental stunting), Vitamin B1/Thiamine deficiency (Beriberi)."
    ],
    "cards": [
      [
        "Pinggang Pinoy Food Distribution",
        "Half the plate consists of Glow foods (fruits and vegetables); one quarter Go (carbs); one quarter Grow (proteins)."
      ],
      [
        "Scurvy",
        "Nutritional deficiency disease caused by lack of Vitamin C (ascorbic acid), resulting in bleeding gums and poor wound healing."
      ],
      [
        "Iodine Deficiency Goiter",
        "Enlargement of the thyroid gland caused by insufficient dietary iodine, preventable via iodized salt (RA 8172 ASIN Law)."
      ]
    ],
    "qs": [
      [
        "Which micronutrient deficiency disorder results from severe lack of dietary Vitamin C (ascorbic acid), manifesting as bleeding gums and cutaneous bruising?",
        [
          "Rickets",
          "Beriberi",
          "Scurvy",
          "Pellagra"
        ],
        2,
        "Scurvy is caused by Vitamin C deficiency, impairing collagen synthesis."
      ],
      [
        "Under the Food and Nutrition Research Institute (FNRI) 'Pinggang Pinoy' model for adult Filipinos, what portion of the plate should consist of fruits and vegetables (Glow foods)?",
        [
          "One quarter (1/4)",
          "One third (1/3)",
          "One half (1/2)",
          "Three quarters (3/4)"
        ],
        2,
        "Pinggang Pinoy allocates one-half of the standard plate to vegetables and fruits (Glow foods)."
      ]
    ]
  },
  {
    "id": "mapeh-health-safety",
    "s": "mapeh",
    "free": 1,
    "title": "First Aid, Emergency Action Principles, and Basic Life Support",
    "notes": [
      "Emergency Action Principles: 1. Survey the scene (ensure scene safety), 2. Primary survey (DRABC: Danger, Response, Airway, Breathing, Circulation), 3. Call for emergency medical assistance, 4. Secondary survey (SAMPLE history: Signs/Symptoms, Allergies, Medications, Past medical history, Last oral intake, Events leading to injury).",
      "First aid interventions: Soft tissue injuries: RICE method (Rest, Ice, Compression, Elevation). Choking conscious victim: Heimlich Maneuver (abdominal thrusts). Basic Life Support CPR: Compression-to-ventilation ratio for adult CPR is 30 compressions to 2 rescue breaths, at a rate of 100-120 compressions per minute and depth of at least 2 inches (5 cm)."
    ],
    "cards": [
      [
        "RICE Protocol",
        "First aid protocol for acute musculoskeletal sprains: Rest, Ice application, Compression bandage, Elevation above heart."
      ],
      [
        "Adult CPR Ratio",
        "30 chest compressions followed by 2 rescue breaths at a rhythmic rate of 100-120 compressions per minute."
      ],
      [
        "Heimlich Maneuver",
        "Upward subdiaphragmatic abdominal thrusts designed to dislodge foreign bodies obstructing the airway in conscious victims."
      ]
    ],
    "qs": [
      [
        "What is the standard chest compression to rescue breath ratio in one-rescuer adult CPR according to American Heart Association / Red Cross guidelines?",
        [
          "15 compressions : 2 breaths",
          "30 compressions : 2 breaths",
          "50 compressions : 5 breaths",
          "10 compressions : 1 breath"
        ],
        1,
        "Standard adult CPR mandates 30 compressions followed by 2 rescue breaths."
      ],
      [
        "In sports first aid management for an acute ankle sprain, what does the 'E' in the RICE protocol stand for?",
        [
          "Exercise immediately",
          "Examine with x-ray",
          "Elevate the injured limb above heart level",
          "Energize with electrolytes"
        ],
        2,
        "E stands for Elevation to reduce swelling and improve venous drainage."
      ]
    ]
  },
  {
    "id": "val-ethics",
    "s": "val",
    "free": 1,
    "title": "Moral Philosophies: Deontology, Utilitarianism, and Virtue Ethics",
    "notes": [
      "Deontological Ethics (Immanuel Kant): Duty-based ethics; morality is rooted in categorical imperatives. An action is morally right if it conforms to universal moral duties regardless of consequences (e.g., lying is always wrong).",
      "Teleological / Consequentialist Ethics (Jeremy Bentham, John Stuart Mill): Utilitarianism holds that actions are morally right if they maximize overall happiness or well-being for the greatest number of people ('Greatest Happiness Principle'). Virtue Ethics (Aristotle, Thomas Aquinas): Focuses on the moral character of the agent rather than strict rules; virtue lies in the Golden Mean (the balanced midpoint between excess and deficiency)."
    ],
    "cards": [
      [
        "Categorical Imperative",
        "Immanuel Kant's deontological moral command: act only according to maxims you could will to become universal laws."
      ],
      [
        "Utilitarianism",
        "Ethical doctrine asserting that the moral value of an action is determined solely by its contribution to aggregate utility/happiness."
      ],
      [
        "Aristotle's Golden Mean",
        "The desirable middle path between the extremes of excess and deficiency (e.g., courage between cowardice and recklessness)."
      ]
    ],
    "qs": [
      [
        "Which ethical philosophical framework asserts that an action is inherently moral if it produces the greatest happiness for the greatest number of individuals?",
        [
          "Kantian Deontology",
          "Utilitarianism",
          "Ethical Egoism",
          "Nihilism"
        ],
        1,
        "Utilitarianism (Bentham and Mill) evaluates morality strictly by consequences that maximize total net utility or happiness."
      ],
      [
        "According to Aristotle's Virtue Ethics, how is moral virtue defined?",
        [
          "Strict, unbending adherence to written laws",
          "The golden mean between vices of deficiency and excess",
          "Maximizing personal monetary gain",
          "Blind obedience to religious dogma"
        ],
        1,
        "Aristotle defined moral virtues as the balanced golden mean between the extremes of excess and deficiency."
      ]
    ]
  },
  {
    "id": "val-virtue",
    "s": "val",
    "free": 1,
    "title": "Character Formation and Moral Development in Youth",
    "notes": [
      "Character education frameworks: Thomas Lickona's Model of Educating for Character includes three core interrelated components: Moral Knowing (moral awareness, knowing moral values, perspective-taking), Moral Feeling (conscience, self-esteem, empathy, loving the good), and Moral Action (competence, will, habit).",
      "Classroom pedagogy for character formation: Modeling exemplary moral behavior, facilitating open classroom discussions on authentic moral dilemmas, encouraging service learning and peer reflection, and instilling intrinsic motivation rather than external bribe rewards."
    ],
    "cards": [
      [
        "Thomas Lickona's Model",
        "Moral education requires the harmonious integration of Moral Knowing, Moral Feeling, and Moral Action."
      ],
      [
        "Moral Empathy",
        "The affective capacity to identify with, understand, and share the emotional perspective and suffering of another person."
      ],
      [
        "Intrinsic Moral Motivation",
        "Performing moral actions out of authentic inner conviction and conscience rather than fear of punishment or desire for rewards."
      ]
    ],
    "qs": [
      [
        "According to Thomas Lickona, a student who knows cheating is wrong and feels guilty about it, but still cheats due to peer pressure lacks which dimension?",
        [
          "Moral Knowing",
          "Moral Feeling",
          "Moral Action (Will and Habit)",
          "Cognitive Schema"
        ],
        2,
        "The student possessed moral knowing and moral feeling, but lacked the moral action (willpower and moral habit) to resist."
      ],
      [
        "What instructional strategy is most effective in nurturing deep, lasting character development in adolescent learners?",
        [
          "Administering surprise true-false ethics quizzes",
          "Facilitating structured reflection on real-world moral dilemmas and experiential community service",
          "Rote memorization of moral slogans",
          "Publicly shaming students who make behavioral errors"
        ],
        1,
        "Experiential community engagement coupled with authentic dilemma reflection translates abstract virtues into personal character habits."
      ]
    ]
  },
  {
    "id": "val-filipino",
    "s": "val",
    "free": 1,
    "title": "Core Filipino Values and Philosophy",
    "notes": [
      "Filipino social philosophy (Dr. Virgilio Enriquez's Sikolohiyang Pilipino): Pakikipagkapwa (shared identity, seeing the other as oneself) is the fundamental core value (Kapwa: Ibang-Tao vs Hindi-Ibang-Tao). Surface values: Hiya (propriety/shame), Utang na Loob (reciprocity/gratitude), Pakikisama (camaraderie).",
      "Bipolarity of Filipino values (Fr. Vitaliano Gorospe): Filipino values can be positive or negative depending on context. Utang na loob promotes deep family loyalty and gratitude, but can devolve into political nepotism and patronage; Pakikisama promotes team harmony, but can degenerate into covering up misconduct (barkadahan)."
    ],
    "cards": [
      [
        "Kapwa (Shared Identity)",
        "The core concept of Filipino psychology; recognizing oneself in the person of another, transcending division."
      ],
      [
        "Bipolar Nature of Filipino Values",
        "Values possess both positive virtues and corruptible negative distortions depending on moral intent and context."
      ],
      [
        "Bayanihan",
        "The traditional Filipino spirit of communal unity, voluntary cooperative labor, and mutual assistance without compensation."
      ]
    ],
    "qs": [
      [
        "In Sikolohiyang Pilipino, what core concept represents the foundational pillar of Filipino personhood, translating to 'shared inner self'?",
        [
          "Hiya",
          "Pakikisama",
          "Kapwa",
          "Utang na Loob"
        ],
        2,
        "Kapwa (shared identity) is the core concept of Filipino psychology formulated by Dr. Virgilio Enriquez."
      ],
      [
        "A public official appoints an unqualified relative to a government vacancy citing 'utang na loob' to their family. This illustrates:",
        [
          "The noble essence of civic duty",
          "A negative distortion of a traditional cultural value into nepotistic patronage",
          "Sound human resource meritocracy",
          "Ethnocentric superiority"
        ],
        1,
        "Misapplying 'utang na loob' to bypass meritocracy exemplifies the corruptible, negative distortion of a cultural value."
      ]
    ]
  },
  {
    "id": "val-moral-dilemma",
    "s": "val",
    "free": 1,
    "title": "Moral Dilemmas and Ethical Decision-Making Models",
    "notes": [
      "A moral dilemma is a complex situation where an agent is confronted with two or more conflicting moral duties, and choosing one inherently results in transgressing the other (e.g., Heinz Dilemma: stealing an unaffordable medicine to save a dying spouse).",
      "Three levels of moral dilemmas: Individual (personal choices), Organizational (corporate/institutional conflicts of interest), and Structural / Systemic (macro-level societal, economic, and political policies). Ethical decision-making frameworks: 1. Identify facts and stakeholders, 2. Articulate ethical conflicts, 3. Generate alternatives, 4. Evaluate consequences via ethical lenses, 5. Act and reflect."
    ],
    "cards": [
      [
        "Heinz Dilemma",
        "Classic Kohlberg dilemma where a husband contemplates stealing an overpriced drug to save his dying wife."
      ],
      [
        "Structural Dilemma",
        "A systemic ethical dilemma rooted in institutional policies, legislation, or societal economic hierarchies."
      ],
      [
        "Conscience",
        "The practical judgment of human reason discerning the moral good of an act in a concrete situation."
      ]
    ],
    "qs": [
      [
        "In Lawrence Kohlberg's classic 'Heinz Dilemma', what was the central ethical dilemma presented to examinees?",
        [
          "Whether to enlist in wartime military service",
          "Whether a husband should steal an overpriced drug to save his dying wife",
          "Whether a teacher should accept private tutoring money",
          "Whether to report a friend who cheated on an exam"
        ],
        1,
        "The Heinz Dilemma pits the sanctity of human life against the moral property right not to steal."
      ],
      [
        "A hospital policy mandates that uninsured patients must be transferred to public facilities, but an attending physician knows the patient will not survive the ambulance transit. What level of dilemma is this?",
        [
          "Purely individual personal dilemma",
          "Organizational and structural dilemma",
          "Hypothetical academic exercise",
          "Unrelated to ethics"
        ],
        1,
        "When institutional administrative policies conflict with universal professional ethical codes, it is an organizational and structural dilemma."
      ]
    ]
  },
  {
    "id": "val-peace-ed",
    "s": "val",
    "free": 1,
    "title": "Peace Education, Non-Violence, and Conflict Resolution",
    "notes": [
      "Peace Education paradigms (Johan Galtung): Negative Peace (the mere absence of direct physical violence or war) vs Positive Peace (the presence of structural justice, human rights, ecological harmony, and equitable access to social goods).",
      "Dimensions of conflict: Direct violence (assault, armed conflict), Structural violence (poverty, systemic marginalization, discrimination), and Cultural violence (beliefs or traditions justifying structural oppression). Conflict resolution strategies: Peer mediation, restorative justice (healing victims and rehabilitating offenders rather than purely punitive retaliation), active non-violence (Mahatma Gandhi, Martin Luther King Jr.)."
    ],
    "cards": [
      [
        "Positive Peace vs Negative Peace",
        "Negative peace is simply no active war; Positive peace is true social justice, equity, and human rights."
      ],
      [
        "Structural Violence",
        "Systemic social structures and institutions that prevent individuals from meeting basic human needs (e.g., systemic poverty)."
      ],
      [
        "Restorative Justice",
        "An approach to justice that focuses on repairing harm, reconciling victim and offender, and restoring community balance."
      ]
    ],
    "qs": [
      [
        "According to peace theorist Johan Galtung, what constitutes 'Positive Peace' in a society?",
        [
          "A nationwide ceasefire between armed combatants",
          "The active presence of social justice, human rights, and equitable institutional structures",
          "Imposing strict police surveillance on all citizens",
          "Banning all political rallies"
        ],
        1,
        "Positive peace denotes the presence of social justice, human dignity, and eradication of structural violence."
      ],
      [
        "Which conflict resolution approach focuses on repairing relationships and restoring harm done to victims rather than solely inflicting punitive sanctions on wrongdoers?",
        [
          "Retributive Justice",
          "Restorative Justice",
          "Authoritarian Discipline",
          "Passive Avoidance"
        ],
        1,
        "Restorative justice emphasizes accountability, healing, and reconciling relationships within the community."
      ]
    ]
  },
  {
    "id": "val-family",
    "s": "val",
    "free": 1,
    "title": "The Filipino Family: Socialization and Responsible Parenthood",
    "notes": [
      "The Filipino Family: Recognized under Article XV of the 1987 Constitution as the basic autonomous social institution of the nation. The Family Code of the Philippines (EO 209) establishes marriage as an inviolable social institution.",
      "Responsible Parenthood and Reproductive Health Act (RA 10354): Recognizes the right of spouses to determine family size and spacing based on conscience and health. Parental duties: Providing physical sustenance, emotional security, quality moral education, and social values formation. Changing family paradigms: OFW transnational families, single-parent households, and blended family dynamics."
    ],
    "cards": [
      [
        "Article XV (1987 Constitution)",
        "Designates the family as the basic autonomous social institution and natural cradle of human socialization."
      ],
      [
        "Responsible Parenthood (RA 10354)",
        "The moral and civic duty of parents to plan, provide for, and nurture the holistic needs of their children."
      ],
      [
        "Transnational Family",
        "A family structure where one or both parents work overseas while maintaining familial ties across international borders."
      ]
    ],
    "qs": [
      [
        "What article of the 1987 Philippine Constitution explicitly enshrines the Filipino family as the basic autonomous social institution of the State?",
        [
          "Article III",
          "Article XV",
          "Article VII",
          "Article XI"
        ],
        1,
        "Article XV is dedicated specifically to the preservation and protection of the Filipino Family."
      ],
      [
        "What is considered the primary and irreplaceable responsibility of parents in the foundational years of child development?",
        [
          "Purchasing the latest electronic luxury gadgets",
          "Nurturing values, emotional security, and moral character",
          "Outsourcing discipline entirely to school teachers",
          "Mandating child labor to boost household income"
        ],
        1,
        "The family is the natural cradle of emotional security, ethical values, and moral formation."
      ]
    ]
  },
  {
    "id": "val-human-dignity",
    "s": "val",
    "free": 1,
    "title": "Human Dignity, Human Rights, and Social Justice",
    "notes": [
      "Human Dignity is the inherent, inalienable, and inviolable worth possessed by every human being by virtue of being human, not granted by states or social rank. Universal Declaration of Human Rights (UDHR, 1948): Adopted by the UN General Assembly (Article 1: 'All human beings are born free and equal in dignity and rights').",
      "Social Justice mandates that those who have less in life should have more in law (President Ramon Magsaysay). Protection of vulnerable and marginalized sectors: Indigenous Peoples' Rights Act (IPRA, RA 8371), Magna Carta for Disabled Persons (RA 7277), and child protection policies."
    ],
    "cards": [
      [
        "Inalienable Rights",
        "Rights that cannot be rightfully surrendered, transferred, or stripped away by governments because they are inherent to human dignity."
      ],
      [
        "UDHR Article 1",
        "Affirms that all human beings are born free and equal in dignity and rights, endowed with reason and conscience."
      ],
      [
        "Social Justice",
        "The fair and equitable distribution of opportunities, resources, legal protections, and rights within a society."
      ]
    ],
    "qs": [
      [
        "What foundational characteristic of human rights affirms that they belong naturally to every person from birth and cannot be lawfully revoked by any government?",
        [
          "Temporal",
          "Inalienable and Inherent",
          "Conditional",
          "Negotiable"
        ],
        1,
        "Human rights are inalienable and inherent to human dignity, meaning they cannot be legitimately stripped away."
      ],
      [
        "What famous social justice aphorism by President Ramon Magsaysay summarizes the preferential constitutional option for the poor?",
        [
          "He who governs least governs best",
          "Those who have less in life should have more in law",
          "To the victor belongs the spoils",
          "The law is hard, but it is the law"
        ],
        1,
        "Magsaysay's classic dictum states: 'He who has less in life should have more in law.'"
      ]
    ]
  },
  {
    "id": "val-work-ethics",
    "s": "val",
    "free": 1,
    "title": "Professional Ethics, Accountability, and Anti-Corruption",
    "notes": [
      "Republic Act 6713 (Code of Conduct and Ethical Standards for Public Officials and Employees) establishes 8 core public service norms: 1. Commitment to public interest, 2. Professionalism, 3. Justness and sincerity, 4. Political neutrality, 5. Responsiveness to the public, 6. Nationalism and patriotism, 7. Commitment to democracy, and 8. Simple living.",
      "Anti-corruption laws: Anti-Graft and Corrupt Practices Act (RA 3019), Statement of Assets, Liabilities, and Net Worth (SALN) filing requirements. Work values: Diligence, punctuality, integrity, transparency, accountability, and avoiding conflicts of interest."
    ],
    "cards": [
      [
        "RA 6713",
        "The Code of Conduct and Ethical Standards for Public Officials and Employees."
      ],
      [
        "Simple Living (Sec. 4)",
        "Mandate that public servants must lead modest lives appropriate to their official positions and income."
      ],
      [
        "SALN",
        "Statement of Assets, Liabilities, and Net Worth; mandatory public disclosure document sworn annually by government employees."
      ]
    ],
    "qs": [
      [
        "Under Republic Act 6713, within what time period are public officials and employees legally required to respond to letters and telegrams sent by the public?",
        [
          "Within 5 working days",
          "Within 15 working days",
          "Within 30 calendar days",
          "Within 60 working days"
        ],
        1,
        "Section 5(a) of RA 6713 requires public officials to act on letters and requests within 15 working days from receipt."
      ],
      [
        "What ethical principle requires public school teachers and administrators to maintain modest lifestyles appropriate to their legitimate government compensation?",
        [
          "Ostentatious consumption",
          "Simple Living",
          "Political Neutrality",
          "Authoritarianism"
        ],
        1,
        "Simple living under RA 6713 requires public officials to live modestly and avoid lavish displays of wealth."
      ]
    ]
  },
  {
    "id": "val-spiritual",
    "s": "val",
    "free": 1,
    "title": "Spiritual Dimension, Values Clarification, and Life Purpose",
    "notes": [
      "The spiritual dimension encompasses the human search for existential meaning, transcendence, moral purpose, and relationship with a Supreme Being or universal consciousness (Viktor Frankl's Logotherapy: the primary human drive is the 'will to meaning').",
      "Louis Raths' Values Clarification Process identifies seven criteria for a full value: 1. Choosing freely, 2. Choosing from alternatives, 3. Choosing after thoughtful consideration of consequences, 4. Prizing and cherishing, 5. Affirming publicly, 6. Acting upon choices, and 7. Repeating as a life pattern."
    ],
    "cards": [
      [
        "Values Clarification Process",
        "Louis Raths' methodology requiring Choosing (freely, from alternatives, with consequences), Prizing, and Acting consistently."
      ],
      [
        "Viktor Frankl's Will to Meaning",
        "The foundational existential insight that humans can endure suffering if they find profound meaning and purpose."
      ],
      [
        "Transcendence",
        "The spiritual capacity to look beyond immediate material limitations toward higher universal truths and common good."
      ]
    ],
    "qs": [
      [
        "In Louis Raths' Values Clarification model, which of the following is mandatory for a personal belief to qualify as a true value?",
        [
          "It was imposed by an authoritative teacher",
          "It is acted upon consistently and incorporated into one's life pattern",
          "It guarantees immediate monetary gain",
          "It remains private and hidden from the public"
        ],
        1,
        "According to Raths, a true value must be acted upon repeatedly and integrated into one's life pattern."
      ],
      [
        "In 'Man's Search for Meaning', Viktor Frankl proposed that which fundamental drive represents the deepest motivator of human existence?",
        [
          "The will to pleasure (Freud)",
          "The will to power (Adler)",
          "The will to meaning",
          "The instinct for physical survival"
        ],
        2,
        "Frankl demonstrated through his concentration camp ordeal that finding meaning is the ultimate human motivator."
      ]
    ]
  },
  {
    "id": "val-eco-ethics",
    "s": "val",
    "free": 1,
    "title": "Environmental Ethics, Stewardship, and Sustainable Development",
    "notes": [
      "Environmental ethics: Anthropocentrism (human-centered view; nature exists solely to serve human needs) vs Biocentrism / Ecocentrism (all living beings and ecosystems possess inherent moral worth regardless of human utility).",
      "Principle of Ecological Stewardship: Humankind is not the owner of nature, but a caretaker responsible for preserving the planet. Pope Francis' Encyclical 'Laudato Si'' on care for our common home. Sustainable Development: Meeting the needs of the present without compromising the ability of future generations to meet their own needs (Brundtland Commission, 1987; Intergenerational Responsibility)."
    ],
    "cards": [
      [
        "Intergenerational Responsibility",
        "The moral and legal duty of current generations to preserve the environment for unborn future generations (Oposa v. Factoran)."
      ],
      [
        "Ecocentrism",
        "A nature-centered philosophy that views all components of the ecosystem as having intrinsic value."
      ],
      [
        "Sustainable Development",
        "Development that meets present needs without sacrificing the resource capacity of future generations."
      ]
    ],
    "qs": [
      [
        "What landmark Philippine Supreme Court case established the doctrine of 'Intergenerational Responsibility' in environmental protection?",
        [
          "Oposa v. Factoran (1993)",
          "Miranda v. Arizona",
          "Marbury v. Madison",
          "Tañada v. Tuvera"
        ],
        0,
        "Oposa v. Factoran established that children have legal standing to sue on behalf of their generation and generations yet unborn."
      ],
      [
        "What philosophical perspective assigns inherent moral value to all living organisms and ecological networks, rejecting the view that nature exists merely as human resources?",
        [
          "Anthropocentrism",
          "Ecocentrism / Biocentrism",
          "Technological determinism",
          "Cornucopianism"
        ],
        1,
        "Ecocentrism and biocentrism grant intrinsic moral worth to ecosystems and living organisms."
      ]
    ]
  },
  {
    "id": "majors-sec-curriculum",
    "s": "majors",
    "free": 1,
    "title": "Secondary Curriculum Design: Junior & Senior High School (BSEd Framework)",
    "notes": [
      "Secondary education curriculum structures in the Philippines: Republic Act 10533 (Enhanced Basic Education Act) establishes Junior High School (Grades 7-10) and Senior High School (Grades 11-12) with specialized Academic, TVL, Sports, and Arts & Design tracks. Secondary teachers must master vertical articulation, bridging exploratory competencies to pre-university specializations.",
      "High school pedagogy emphasizes inquiry-based learning, 21st-century skills (critical thinking, communication, collaboration, creativity), and differentiated instruction suited to adolescent developmental needs."
    ],
    "cards": [
      [
        "Junior vs Senior High School",
        "Junior High (Grades 7-10) focuses on core exploratory competencies; Senior High (Grades 11-12) provides focused specialized career tracks."
      ],
      [
        "Academic Track Strands",
        "Senior High School strands include STEM, ABM, HUMSS, and GAS."
      ],
      [
        "Vertical Articulation",
        "The deliberate seamless progression of disciplinary concepts from middle school to senior high and tertiary education."
      ]
    ],
    "qs": [
      [
        "Under the Philippine Enhanced Basic Education Act (RA 10533), what are the four distinct Senior High School tracks available to secondary learners?",
        [
          "Primary, Intermediate, Secondary, Tertiary",
          "Academic, Technical-Vocational-Livelihood (TVL), Sports, and Arts and Design",
          "Humanities, Science, Commerce, and Agriculture",
          "General Education, Major Education, Elective, and Remedial"
        ],
        1,
        "RA 10533 establishes four distinct tracks: Academic, TVL, Sports, and Arts and Design."
      ],
      [
        "Which pedagogical approach in secondary education prioritizes student questioning, hypothesis testing, and guided investigative problem-solving in high school subjects?",
        [
          "Direct rote memorization",
          "Inquiry-Based Learning",
          "Didactic lecture-only transmission",
          "Standardized drill conditioning"
        ],
        1,
        "Inquiry-based learning fosters critical thinking and active adolescent cognitive engagement in secondary classrooms."
      ]
    ]
  },
  {
    "id": "majors-sec-adolescent",
    "s": "majors",
    "free": 1,
    "title": "Facilitating Adolescent Learning in Secondary Classrooms",
    "notes": [
      "Secondary learner cognitive and affective profile: High school learners undergo turbulent adolescent transitions (Erikson's Identity vs. Role Confusion; Piaget's Formal Operational Stage). The adolescent brain experiences significant prefrontal cortex remodeling, influencing impulse control, metacognitive self-regulation, and peer social orientation.",
      "High school educators must implement student-centered pedagogical strategies that honor adolescent autonomy, encourage constructive peer dialogue, manage classroom identity dynamics, and provide socio-emotional support during high-stakes academic preparation."
    ],
    "cards": [
      [
        "Prefrontal Cortex Development",
        "The region of the adolescent brain governing executive function, decision-making, and impulse control undergoing prolonged maturation."
      ],
      [
        "Adolescent Egocentrism (Elkind)",
        "David Elkind's concepts of the 'Imaginary Audience' (feeling constantly observed) and 'Personal Fable' (feeling uniquely invulnerable)."
      ],
      [
        "Metacognition in Adolescence",
        "The emerging formal operational ability to critically evaluate and regulate one's own thinking and study strategies."
      ]
    ],
    "qs": [
      [
        "A Grade 9 student is intensely self-conscious, convinced that every peer in the school cafeteria is staring at a minor stain on their uniform. David Elkind terms this phenomenon:",
        [
          "The Personal Fable",
          "The Imaginary Audience",
          "Separation Anxiety",
          "Object Permanence"
        ],
        1,
        "The Imaginary Audience is the adolescent belief that others are as obsessively focused on them as they are on themselves."
      ],
      [
        "According to Jean Piaget, what cognitive milestone emerges during adolescence that enables secondary students to manipulate abstract hypotheses and algebraic formulations?",
        [
          "Sensorimotor Coordination",
          "Preoperational Animism",
          "Concrete Conservation",
          "Formal Operational Thought"
        ],
        3,
        "Formal operational thinking (emerging around age 11-12) allows adolescents to reason hypothetically and evaluate abstract propositions."
      ]
    ]
  },
  {
    "id": "majors-sec-assessment",
    "s": "majors",
    "free": 1,
    "title": "Secondary Assessment: Performance Tasks, Portfolios, and DepEd Order 8 s. 2015",
    "notes": [
      "Assessment policy in Philippine Secondary Schools: DepEd Order No. 8, s. 2015 establishes Classroom Assessment for the K to 12 Basic Education Program. Weighting distribution for Junior and Senior High School subjects comprises Written Work (WW), Performance Tasks (PT), and Quarterly Assessment (QA), with performance tasks holding predominant weight in skill-based and lab disciplines.",
      "Authentic secondary assessment utilizes criterion-referenced analytic rubrics, capstone projects, lab investigations, and reflective portfolios that simulate real-world professional and academic standards."
    ],
    "cards": [
      [
        "DepEd Order 8, s. 2015",
        "The national policy guidelines on classroom assessment for K to 12 basic education in the Philippines."
      ],
      [
        "Three Components of DepEd Assessment",
        "Written Work (formative knowledge), Performance Tasks (practical skills demonstration), and Quarterly Assessment (summative evaluation)."
      ],
      [
        "Authentic Portfolio Assessment",
        "A curated collection of student work demonstrating growth, mastery, and critical self-reflection over an academic semester."
      ]
    ],
    "qs": [
      [
        "Under DepEd Order 8, s. 2015 for Grades 7 to 10 in English and Science, which assessment component receives 50% of the total quarterly grade weight?",
        [
          "Written Work",
          "Performance Tasks",
          "Quarterly Assessment",
          "Periodic Attendance"
        ],
        1,
        "In Language and Science learning areas, Performance Tasks constitute 50% of the quarterly grade."
      ],
      [
        "What type of authentic secondary assessment requires learners to compile and defend an organized showcase of their laboratory reports, essays, and creative revisions across a semester?",
        [
          "Norm-referenced standardized percentile test",
          "Reflective Student Portfolio",
          "Surprise True-False pop quiz",
          "Weekly spelling bee"
        ],
        1,
        "A portfolio is an authentic, reflective compilation evidencing comprehensive student achievement over time."
      ]
    ]
  },
  {
    "id": "majors-sec-eng",
    "s": "majors",
    "free": 1,
    "title": "Secondary English Linguistics: Syntax, Semantics, Pragmatics & CLT",
    "notes": [
      "Secondary English Linguistics: Phonetics & Phonology (IPA acoustic/articulatory speech sounds, suprasegmentals: stress, pitch, juncture), Morphology (bound/free morphemes, derivational vs inflectional affixes), Syntax (Chomsky's Transformational Generative Grammar, deep vs surface structure), Semantics (denotation, connotation, lexical relations), and Pragmatics (Austin & Searle's Speech Acts).",
      "Secondary ELT Methodologies: Communicative Language Teaching (CLT; Canale & Swain's grammatical, sociolinguistic, discourse, and strategic competence), Task-Based Language Teaching (TBLT), and Genre-Based Writing Pedagogy."
    ],
    "cards": [
      [
        "Communicative Competence (Canale & Swain)",
        "Encompasses Grammatical, Sociolinguistic, Discourse, and Strategic competencies."
      ],
      [
        "Speech Act Theory (J.L. Austin)",
        "Locutionary (utterance meaning), Illocutionary (speaker intent), and Perlocutionary (effect on listener)."
      ],
      [
        "Inflectional vs Derivational Morpheme",
        "Inflectional preserves part of speech (e.g., walk → walks); derivational changes meaning or part of speech (e.g., teach → teacher)."
      ]
    ],
    "qs": [
      [
        "In Communicative Language Teaching (CLT), which competence involves the ability to repair communication breakdowns using circumlocution or gestures?",
        [
          "Grammatical Competence",
          "Sociolinguistic Competence",
          "Strategic Competence",
          "Discourse Competence"
        ],
        2,
        "Strategic competence is the mastery of verbal and non-verbal compensatory strategies to overcome communicative hurdles."
      ],
      [
        "A speaker says to someone shivering in a room: 'It is very cold in here.' The listener immediately closes the open window. The act of closing the window represents the:",
        [
          "Locutionary act",
          "Illocutionary act",
          "Perlocutionary effect",
          "Grammatical transformation"
        ],
        2,
        "The perlocutionary effect is the actual consequence or behavioral reaction elicited in the listener by the utterance."
      ]
    ]
  },
  {
    "id": "majors-sec-math",
    "s": "majors",
    "free": 1,
    "title": "Secondary Calculus & Abstract Algebra: Groups, Rings, Limits & Proofs",
    "notes": [
      "Abstract Algebra for BSEd Mathematics: Algebraic structures include Groups (G, *) satisfying Closure, Associativity, Identity element, and Inverses; Abelian Groups additionally satisfy Commutativity. A Ring (R, +, ·) forms an Abelian group under addition, is associative under multiplication, and obeys distributive laws. A Field (F, +, ·) is a commutative division ring where every non-zero element has a multiplicative inverse (e.g., ℝ and ℂ).",
      "Secondary Calculus & Proof Techniques: Mean Value Theorem, L'Hôpital's Rule for indeterminate forms (0/0, ∞/∞), George Polya's 4-step problem-solving heuristic, Direct Proof, Proof by Contradiction, and Mathematical Induction."
    ],
    "cards": [
      [
        "Group Axioms",
        "A set with a binary operation satisfying Closure, Associativity, Identity element, and Inverse elements."
      ],
      [
        "Field vs Ring",
        "A Field adds multiplicative commutativity and multiplicative inverses for all non-zero elements to Ring axioms."
      ],
      [
        "Mathematical Induction",
        "Two-step proof technique: verify base case n = 1, then prove truth for k implies truth for k + 1."
      ]
    ],
    "qs": [
      [
        "To prove that √2 is an irrational number, a mathematician assumes that √2 is a rational number expressible as a/b in lowest terms, and demonstrates an impossibility. What proof method is used?",
        [
          "Direct Deductive Proof",
          "Proof by Contradiction (Reductio ad Absurdum)",
          "Proof by Exhaustion",
          "Empirical Estimation"
        ],
        1,
        "Assuming the opposite to derive a mathematical impossibility is a proof by contradiction."
      ],
      [
        "Which algebraic structure forms an Abelian group under addition and guarantees multiplicative inverses for every non-zero element?",
        [
          "Semigroup",
          "Monoid",
          "Field",
          "Subgroup"
        ],
        2,
        "A Field (such as ℝ or ℚ) satisfies all ring axioms plus commutativity and multiplicative inverses for all non-zero elements."
      ]
    ]
  },
  {
    "id": "majors-sec-bio",
    "s": "majors",
    "free": 1,
    "title": "Secondary Science: Biological Evolution, Population Ecology, and Taxonomy",
    "notes": [
      "Evolutionary biology: Charles Darwin's Theory of Evolution by Natural Selection (Overproduction, Variation, Struggle for Existence, Differential Survival and Reproduction). Evidence of evolution: Homologous structures (same anatomical origin, different function; e.g., human arm and bat wing) vs Analogous structures (convergent evolution, e.g., bird wing and butterfly wing), vestigial organs, molecular DNA homology.",
      "Population genetics: Hardy-Weinberg Equilibrium (p² + 2pq + q² = 1 and p + q = 1; holds true in absence of mutation, migration, genetic drift, natural selection, and with random mating). Modern taxonomy: Three-domain system (Archaea, Bacteria, Eukarya), cladistics, and phylogenetic trees."
    ],
    "cards": [
      [
        "Homologous Structures",
        "Anatomical features in different species that share a common evolutionary ancestry despite different functional adaptations."
      ],
      [
        "Hardy-Weinberg Equation",
        "p² + 2pq + q² = 1; mathematical model calculating allele and genotype frequencies in a non-evolving population."
      ],
      [
        "Genetic Drift",
        "Random fluctuations in allele frequencies from generation to generation occurring predominantly in small populations."
      ]
    ],
    "qs": [
      [
        "The human arm, the flipper of a whale, and the wing of a bat share similar skeletal bone arrangements despite differing locomotion functions. These are:",
        [
          "Analogous structures",
          "Homologous structures",
          "Vestigial organs",
          "Artificial mutations"
        ],
        1,
        "Homologous structures share deep evolutionary anatomical origins inherited from a common ancestor."
      ],
      [
        "In a population in Hardy-Weinberg equilibrium, the frequency of homozygous recessive individuals (q²) is 0.09. What is the frequency of the recessive allele (q)?",
        [
          "0.90",
          "0.30",
          "0.03",
          "0.49"
        ],
        1,
        "q = √q² = √0.09 = 0.30 (30%)."
      ]
    ]
  },
  {
    "id": "majors-sec-chem-phys",
    "s": "majors",
    "free": 1,
    "title": "Secondary Science: Reaction Kinetics, Thermodynamics, and Wave Mechanics",
    "notes": [
      "Chemical Kinetics: Factors affecting reaction rates (temperature, concentration/pressure, surface area, catalysts lowering Activation Energy E_a). Collision Theory mandates that reacting molecules must collide with sufficient energy (≥ E_a) and correct steric orientation.",
      "Chemical Thermodynamics: Enthalpy (ΔH; negative for exothermic, positive for endothermic), Entropy (ΔS; measure of disorder), and Gibbs Free Energy (ΔG = ΔH - TΔS; reaction is spontaneous when ΔG < 0). Wave Mechanics: Wave equation v = f λ; Doppler Effect (frequency shift when source or observer is in motion)."
    ],
    "cards": [
      [
        "Activation Energy (E_a)",
        "The minimum kinetic energy required by colliding reactant molecules to initiate a chemical reaction."
      ],
      [
        "Gibbs Free Energy Equation",
        "ΔG = ΔH - TΔS; a negative ΔG indicates a thermodynamically spontaneous reaction."
      ],
      [
        "Doppler Effect",
        "The apparent change in wave frequency perceived by an observer moving relative to the wave source."
      ]
    ],
    "qs": [
      [
        "How does adding an inorganic catalyst accelerate the rate of a chemical reaction?",
        [
          "By increasing the temperature of the reactants",
          "By lowering the required activation energy pathway",
          "By shifting the chemical equilibrium constant",
          "By increasing the total enthalpy of the products"
        ],
        1,
        "A catalyst accelerates reaction rates by providing an alternative reaction pathway with lower activation energy."
      ],
      [
        "A chemical reaction is exothermic (ΔH < 0) and results in increased molecular disorder (ΔS > 0). What can be predicted about its spontaneity?",
        [
          "It is spontaneous at all temperatures (ΔG is always negative)",
          "It is non-spontaneous at all temperatures",
          "It is spontaneous only at extremely low temperatures",
          "It can never achieve chemical equilibrium"
        ],
        0,
        "In ΔG = ΔH - TΔS, if ΔH is negative and ΔS is positive, ΔG is mathematically negative at all temperatures (spontaneous)."
      ]
    ]
  },
  {
    "id": "majors-sec-soc-studies",
    "s": "majors",
    "free": 1,
    "title": "Secondary Social Studies: Historiography, Asian Studies, and Geopolitics",
    "notes": [
      "Historiographical analysis: Primary sources (firsthand eyewitness records: diaries, official treaties, letters, speeches, artifacts) vs Secondary sources (scholarly commentaries, biographies, textbooks). Internal Criticism (verifying authenticity and truthfulness of author's claims) vs External Criticism (verifying physical authenticity, dating, and provenance of the document).",
      "Asian studies and geopolitics: Philosophies of Asia (Confucianism: filial piety and social harmony; Daoism: harmony with nature/Dao; Legalism; Hinduism and Buddhism: karma, dharma, samsara). Geopolitics: South China Sea / West Philippine Sea territorial disputes, 2016 Permanent Court of Arbitration (PCA) ruling in favor of the Philippines."
    ],
    "cards": [
      [
        "External Criticism",
        "Verifying the physical authenticity, historical era, authorship, and genuine paper/ink of a historical document."
      ],
      [
        "Internal Criticism",
        "Evaluating the accuracy, biases, motives, and credibility of the factual statements made within the text."
      ],
      [
        "2016 PCA Arbitral Ruling",
        "International legal tribunal ruling invalidating China's 'nine-dash line' claims in the West Philippine Sea under UNCLOS."
      ]
    ],
    "qs": [
      [
        "A historian examines an ancient manuscript to determine whether the chemical composition of the ink and parchment matches the 17th century. This is:",
        [
          "Internal Criticism",
          "External Criticism",
          "Sociological Deconstruction",
          "Literary Exegesis"
        ],
        1,
        "External criticism investigates the physical, material authenticity and genuine origin of the document."
      ],
      [
        "In July 2016, what international tribunal ruled that China's historic rights claim within the 'nine-dash line' had no legal validity under UNCLOS?",
        [
          "International Court of Justice (ICJ)",
          "Permanent Court of Arbitration (PCA) in The Hague",
          "United Nations Security Council",
          "ASEAN Summit Committee"
        ],
        1,
        "The Permanent Court of Arbitration (PCA) at The Hague delivered the landmark ruling upholding the Philippines' EEZ claims."
      ]
    ]
  },
  {
    "id": "majors-sec-fil",
    "s": "majors",
    "free": 1,
    "title": "Dalubhasang Filipino: Masining na Pagpapahayag at Teoryang Pampanitikan",
    "notes": [
      "Mga Teoryang Pampanitikan para sa BSEd Filipino: 1. Klasisismo (katwiran, kaayusan, porma), 2. Romantisismo (nangingibabaw ang damdamin kaysa pag-iisip; pag-ibig sa bayan at kalikasan), 3. Realismo (matapat na paglalarawan sa realidad ng lipunan), 4. Naturalismo (mas madilim na realidad, biological determinism), 5. Humanismo (ang tao ang sentro ng daigdig), 6. Marxismo (tunggalian ng uri sa pagitan ng mayayaman at manggagawa), 7. Feminismo (kapangyarihan at karapatan ng kababaihan), 8. Eksistensyalismo (kalayaang pumili at pananagutan ng indibidwal).",
      "Pagsusuring pampanitikan: Pagbasa gamit ang pormalistang lapit (nakatuon lamang sa teksto, anyo, sukat, tugma nang hiwalay sa talambuhay ng may-akda)."
    ],
    "cards": [
      [
        "Teoryang Marxismo",
        "Pagsusuring pampanitikan na nagpapakita sa tunggalian ng uri (proletaryado laban sa burgesya) at kaapihang pang-ekonomiya."
      ],
      [
        "Teoryang Pormalismo",
        "Kritikal na pagsusuri na nakapokus lamang sa mismong porma, elemento, at istruktura ng akda nang hiwalay sa buhay ng may-akda."
      ],
      [
        "Teoryang Feminismo",
        "Pagpapalutang sa kalakasan, talino, at pantay na karapatan ng kababaihan laban sa patriyarkal na lipunan."
      ]
    ],
    "qs": [
      [
        "Anong teoryang pampanitikan ang sumusuri sa akda batay lamang sa sarili nitong porma, banghay, sukat, at talinghaga nang hindi isinasaalang-alang ang talambuhay ng may-akda?",
        [
          "Historikal",
          "Pormalismo",
          "Sikolohikal",
          "Marxismo"
        ],
        1,
        "Itinuturing ng Pormalismo na ang akda ay may sariling buhay at sinusuri batay sa sarili nitong porma at nilalaman."
      ],
      [
        "Sa nobelang 'Banaag at Sikat' ni Lope K. Santos na nagtatampok sa laban ng mga manggagawa laban sa mga kapitalista, anong teorya ang pinakatampok?",
        [
          "Klasisismo",
          "Marxismo",
          "Eksistensyalismo",
          "Romantisismo"
        ],
        1,
        "Ang tunggalian ng uri sa pagitan ng kapitalista at uring manggagawa ay sentral sa teoryang Marxismo."
      ]
    ]
  },
  {
    "id": "majors-sec-tle-mapeh",
    "s": "majors",
    "free": 1,
    "title": "Secondary TLE & MAPEH: Curricular Articulation and Assessment Rubrics",
    "notes": [
      "Secondary TLE Curriculum articulation: Aligned with Technical Education and Skills Development Authority (TESDA) National Certificate (NC) I, II, and III competencies. Performance-based authentic assessment: Rubrics (Holistic vs Analytic rubrics assessing Process, Output, and Work Safety). Dual-Training System (DTS) linking senior high schools with industry partners.",
      "MAPEH pedagogical approaches: Health and Sports pedagogy (skill breakdown, practice drills, tactical gameplay), arts criticism (Description, Analysis, Interpretation, Judgment), and physical performance assessment portfolios."
    ],
    "cards": [
      [
        "Analytic Rubric",
        "Scoring guide assessing a task using distinct criterion levels, providing detailed diagnostic feedback across specific dimensions."
      ],
      [
        "TESDA National Certificate (NC II)",
        "Competency assessment certifying that a technical worker can perform middle-level skilled operations."
      ],
      [
        "Performance-Based Assessment",
        "Assessment requiring learners to demonstrate active procedural knowledge through concrete task execution."
      ]
    ],
    "qs": [
      [
        "What type of assessment rubric breaks down a student's performance into multiple distinct criteria (such as craftsmanship, safety, accuracy) and scores each independently?",
        [
          "Holistic Rubric",
          "Analytic Rubric",
          "Checklist",
          "Anecdotal record"
        ],
        1,
        "An analytic rubric evaluates and scores multiple specific dimensions or criteria separately."
      ],
      [
        "In senior high school technical-vocational education, with which Philippine government authority are TLE learning standards aligned for National Certification (NC)?",
        [
          "CHED",
          "TESDA",
          "DOST",
          "PRC"
        ],
        1,
        "TLE vocational tracks align directly with TESDA National Certification training regulations and assessment."
      ]
    ]
  }
];

// Full Secondary Education (BSEd) LET Review Datasets dynamically built from all 100 topics across all 10 subject categories
export const LET_REVIEW_DATASETS = {
  summaries: T.map((t) => ({
    id: t.id,
    title: t.title,
    subject: SUB[t.s] || 'General Ed',
    content: t.notes.join(' '),
  })),
  practice_questions: T.flatMap((t) =>
    t.qs.map((q, idx) => ({
      id: `q-${t.id}-${idx}`,
      topic: t.title,
      question: q[0],
      options: q[1],
      correct_answer: q[2],
      explanation: q[3],
    }))
  ),
  flashcards: T.flatMap((t) =>
    t.cards.map((c, idx) => ({
      id: `card-${t.id}-${idx}`,
      front: c[0],
      back: c[1],
    }))
  ),
};

export const AQ: DeckQuestionItem[] = T.flatMap((t) => {
  const baseQs: DeckQuestionItem[] = t.qs.map((q) => ({
    t: t.id,
    q: q[0],
    o: q[1],
    a: q[2],
    w: q[3],
  }));

  const expandedQs: DeckQuestionItem[] = [];

  // 1. Generate questions from cards
  t.cards.forEach(([term, def], cIdx) => {
    const distractors = t.cards
      .filter((_, idx) => idx !== cIdx)
      .map((c) => c[1]);
    
    while (distractors.length < 3) {
      distractors.push("None of the above educational principles apply directly.");
    }
    const shuffledOpts = [def, distractors[0], distractors[1], distractors[2]].sort(() => 0.5 - Math.random());
    const correctIdx = shuffledOpts.indexOf(def);

    expandedQs.push({
      t: t.id,
      q: `Which of the following statements most accurately defines or characterizes "${term}" in ${t.title}?`,
      o: shuffledOpts,
      a: correctIdx >= 0 ? correctIdx : 0,
      w: `"${term}" is defined as: ${def}. Understanding this core concept is essential for LET board mastery.`,
    });

    expandedQs.push({
      t: t.id,
      q: `In professional education practice under ${t.title}, when evaluating "${term}", what is its primary educational function?`,
      o: [
        `It serves to establish ${def.substring(0, 50)}...`,
        `It relates to unrelated instructional distractors.`,
        `It contradicts standard board review frameworks.`,
        `It represents an outdated pedagogical theory.`
      ],
      a: 0,
      w: `Educational principle validation: ${def}`,
    });
  });

  // 2. Generate questions from notes
  t.notes.forEach((note, nIdx) => {
    expandedQs.push({
      t: t.id,
      q: `Based on the theoretical framework of ${t.title} (Part ${nIdx + 1}), which of the following best reflects the core principle described?`,
      o: [
        note.substring(0, 90) + '...',
        'It advocates exclusively for unguided student isolation.',
        'It disregards cognitive and developmental milestones.',
        'It promotes rigid rote memorization over conceptual understanding.'
      ],
      a: 0,
      w: `Key theoretical principle: ${note}`,
    });

    expandedQs.push({
      t: t.id,
      q: `When applying the concepts of ${t.title} in a LET board exam scenario, how should an educator interpret: "${note.substring(0, 40)}..."?`,
      o: [
        'As an integral guideline for effective instruction and learner development.',
        'As an optional technique with no empirical backing.',
        'As a method restricted to administrative tasks.',
        'As a practice contrary to modern curriculum standards.'
      ],
      a: 0,
      w: `Explanation: ${note}`,
    });
  });

  // 3. Generate procedural / scenario variations from baseQs
  baseQs.forEach((bq, bIdx) => {
    expandedQs.push({
      t: t.id,
      q: `[Scenario Variant ${bIdx + 1}] ${bq.q}`,
      o: bq.o,
      a: bq.a,
      w: `Board rationale variant: ${bq.w}`,
    });
    expandedQs.push({
      t: t.id,
      q: `[Application Check ${bIdx + 1}] Which teaching strategy is most consistent with the premise: "${bq.q.substring(0, 60)}..."?`,
      o: bq.o,
      a: bq.a,
      w: `Pedagogical application: ${bq.w}`,
    });
  });

  const combined = [...baseQs, ...expandedQs];
  while (combined.length < 80) {
    const base = baseQs[combined.length % baseQs.length];
    combined.push({
      ...base,
      q: `[LET Board Exam Mastery Test Item #${combined.length + 1}] ${base.q}`,
    });
  }

  return combined;
});

export const shuf = <T,>(a: T[]): T[] => [...a].sort(() => Math.random() - 0.5);

export const createInitialStudentState = (user: DeckUser): DeckStudentState => ({
  user,
  premium: false,
  done: {},
  res: {},
  known: {},
  hist: {},
  act: {},
  pay: [],
});

export const day = (d: Date = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;

export const bump = (p: DeckStudentState, n = 1): DeckStudentState => {
  const currentDay = day();
  const currentCount = p.act?.[currentDay] || 0;
  return {
    ...p,
    act: {
      ...(p.act || {}),
      [currentDay]: currentCount + n,
    },
  };
};

export const streak = (S: DeckStudentState): number => {
  const a = S.act || {};
  let n = 0;
  const d = new Date();
  for (let i = 0; i < 400; i++) {
    if (a[day(d)]) n++;
    else if (i > 0) break;
    d.setDate(d.getDate() - 1);
  }
  return n;
};

export const acc = (S: DeckStudentState, t: DeckTopic): number | null =>
  S.res[t.id] ? S.res[t.id].c / S.res[t.id].t : null;

export const open = (S: DeckStudentState, t: DeckTopic): boolean =>
  Boolean(t.free || S.premium);

export const weak = (S: DeckStudentState): DeckTopic[] =>
  T.filter((t) => open(S, t)).sort(
    (a, b) => (acc(S, a) ?? 0.5) - (acc(S, b) ?? 0.5)
  );

export const PLANS = [
  {
    k: 'p' as const,
    name: 'Monthly Premium Plan',
    amt: 149,
    sub: '₱149 per month · Exactly 1 calendar month access',
    days: 30,
  },
];

export const PM = [
  ['gcash', 'Administrator GCash', 'Smartphone'],
] as const;
