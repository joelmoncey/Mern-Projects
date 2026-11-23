export const SSC_SUB_EXAM_PRESETS = [
  {
    label: 'All SSC',
    subExams: ['CGL', 'CHSL', 'CPO', 'MTS', 'GD', 'Stenographer', 'JE', 'JHT'],
  },
  {
    label: 'CGL + CHSL + CPO',
    subExams: ['CGL', 'CHSL', 'CPO'],
  },
  {
    label: 'CGL + CHSL + CPO + MTS + GD',
    subExams: ['CGL', 'CHSL', 'CPO', 'MTS', 'GD'],
  },
  {
    label: 'MTS + GD',
    subExams: ['MTS', 'GD'],
  },
  {
    label: 'CGL + CHSL',
    subExams: ['CGL', 'CHSL'],
  },
];

export const SSC_TAXONOMY_JSON_PRESET = [
  {
    exam: 'SSC',
    subExams: ['CGL', 'CHSL', 'CPO', 'MTS', 'GD', 'Stenographer', 'JE'],
    allowedLanguages: ['English', 'Hindi'],
    subject: 'General Intelligence & Reasoning',
    subSubjects: {
      'Verbal Reasoning': [
        'Analogy',
        'Classification',
        'Coding-Decoding',
        'Number & Alphabet Series',
        'Missing Number',
        'Syllogism',
        'Blood Relations',
        'Direction & Distance',
        'Order & Ranking',
        'Venn Diagrams',
        'Mathematical Operations',
      ],
      'Non-Verbal Reasoning': [
        'Mirror & Water Images',
        'Paper Folding & Cutting',
        'Embedded Figures',
        'Figure Series',
        'Cube & Dice',
        'Counting Figures',
      ],
    },
    customTag: 'ssc_core_reasoning',
  },
  {
    exam: 'SSC',
    subExams: ['CGL', 'CHSL', 'CPO'],
    allowedLanguages: ['English', 'Hindi'],
    subject: 'General Intelligence & Reasoning',
    subSubjects: {
      'Analytical Reasoning': [
        'Statement & Conclusion',
        'Statement & Assumption',
        'Cause & Effect',
        'Inequality',
        'Critical Thinking & Drawing Inferences',
      ],
    },
    customTag: 'ssc_tier2_reasoning',
  },
  {
    exam: 'SSC',
    subExams: ['CGL', 'CHSL', 'CPO', 'MTS', 'GD', 'Stenographer', 'JE'],
    allowedLanguages: ['English', 'Hindi'],
    subject: 'General Awareness',
    subSubjects: {
      'Static GK': [
        'Dance & Music',
        'Festivals & Fairs',
        'National Parks & Sanctuaries',
        'Books & Authors',
        'Awards & Honours',
        'Sports',
        'Important Days',
        'Monuments & Temples',
      ],
      History: [
        'Ancient India',
        'Medieval India',
        'Modern India (National Movement)',
      ],
      Polity: [
        'Constitution & Preamble',
        'Fundamental Rights & DPSP',
        'Parliament & President',
        'Judiciary',
        'Amendments & Articles',
        'Panchayati Raj & Local Government',
      ],
      Geography: [
        'Indian Rivers & Drainage',
        'Climate & Monsoon',
        'Soils & Agriculture',
        'Physiography & Minerals',
        'World Geography',
      ],
      'General Science': ['Physics', 'Chemistry', 'Biology'],
      Economics: [
        'Five-Year Plans & Budget',
        'Banking & RBI',
        'National Income & Inflation',
        'Census & Demographics',
      ],
      'Current Affairs': [
        'Schemes & Policies',
        'Appointments & Awards',
        'Summits, Sports & Defense',
        'Science & Tech',
      ],
    },
    customTag: 'ssc_core_gk',
  },
  {
    exam: 'SSC',
    subExams: ['CGL', 'CHSL', 'CPO', 'MTS', 'GD'],
    allowedLanguages: ['English', 'Hindi'],
    subject: 'Quantitative Aptitude',
    subSubjects: {
      Arithmetic: [
        'Percentage',
        'Profit, Loss & Discount',
        'Simple & Compound Interest',
        'Ratio & Proportion',
        'Mixture & Alligation',
        'Average',
        'Time & Work',
        'Pipe & Cistern',
        'Time, Speed & Distance',
        'Boats & Streams',
        'Number System',
        'LCM & HCF',
        'Simplification',
      ],
    },
    customTag: 'ssc_arithmetic_shared',
  },
  {
    exam: 'SSC',
    subExams: ['CGL', 'CHSL', 'CPO'],
    allowedLanguages: ['English', 'Hindi'],
    subject: 'Quantitative Aptitude',
    subSubjects: {
      'Advanced Maths': [
        'Algebra',
        'Trigonometry',
        'Height & Distance',
        'Geometry',
        'Mensuration (2D & 3D)',
        'Coordinate Geometry',
        'Data Interpretation',
        'Statistics & Probability',
      ],
    },
    customTag: 'ssc_advanced_maths',
  },
  {
    exam: 'SSC',
    subExams: ['CGL', 'CHSL', 'CPO', 'MTS', 'GD', 'Stenographer'],
    allowedLanguages: ['English'],
    subject: 'English Language',
    subSubjects: {
      Vocabulary: [
        'Synonyms & Antonyms',
        'One-Word Substitution',
        'Idioms & Phrases',
        'Spelling Correction',
      ],
      Grammar: [
        'Spot the Error',
        'Sentence Improvement',
        'Fill in the Blanks',
      ],
      Comprehension: [
        'Cloze Test',
        'Reading Comprehension',
        'Para Jumbles',
      ],
    },
    customTag: 'ssc_english_core',
  },
  {
    exam: 'SSC',
    subExams: ['CGL', 'CHSL', 'CPO', 'Stenographer'],
    allowedLanguages: ['English'],
    subject: 'English Language',
    subSubjects: {
      Grammar: ['Active & Passive Voice', 'Direct & Indirect Speech'],
    },
    customTag: 'ssc_english_advanced',
  },
  {
    exam: 'SSC',
    subExams: ['GD', 'JHT'],
    allowedLanguages: ['Hindi'],
    subject: 'General Hindi',
    subSubjects: {
      'Hindi Grammar & Vocabulary': [
        'Synonyms (Paryayvachi)',
        'Antonyms (Vilom Shabd)',
        'Idioms & Proverbs (Muhavare)',
        'Spelling Correction (Vartani Shuddhi)',
        'One-Word Substitution (Vakyansh)',
        'Sentence Correction (Vakya Shuddhi)',
        'Fill in the Blanks (Rikt Sthan)',
        'Reading Comprehension (Gadyansh)',
        'Sandhi & Samas',
      ],
    },
    customTag: 'ssc_gd_hindi',
  },
  {
    exam: 'SSC',
    subExams: ['CGL', 'CHSL'],
    allowedLanguages: ['English', 'Hindi'],
    subject: 'Computer Knowledge',
    subSubjects: {
      'Computer Fundamentals': [
        'CPU & Memory',
        'Networking & Internet',
        'MS Office (Word, Excel, PowerPoint)',
        'Keyboard Shortcuts & Cyber Security',
        'Operating Systems & Basics',
      ],
    },
    customTag: 'ssc_tier2_computer',
  },
  {
    exam: 'SSC',
    subExams: ['JE'],
    allowedLanguages: ['English', 'Hindi'],
    subject: 'Core Engineering',
    subSubjects: {
      'Engineering Branches': [
        'Civil Engineering',
        'Electrical Engineering',
        'Mechanical Engineering',
      ],
    },
    customTag: 'ssc_je_technical',
  },
  {
    exam: 'SSC',
    subExams: ['JHT'],
    allowedLanguages: ['English', 'Hindi'],
    subject: 'Translation & Bilingual Usage',
    subSubjects: {
      'Hindi & English Proficiency': [
        'Administrative Terminology',
        'Idioms & Phrases',
        'Translation & Comprehension',
        'Grammar & Sentence Structure',
      ],
    },
    customTag: 'ssc_jht_translation',
  },
];

export function extractSubExamsArray(item) {
  if (!item) return [];
  const raw = [
    ...(Array.isArray(item.subExams) ? item.subExams : []),
    ...(item.subExamName ? String(item.subExamName).split(',') : []),
  ];
  return Array.from(
    new Set(raw.map((s) => String(s || '').trim()).filter(Boolean))
  );
}

export function extractLanguagesArray(item) {
  if (!item) return ['English'];
  const source = item.allowedLanguages || item.languages;
  const raw = Array.isArray(source)
    ? source.flatMap((s) => String(s || '').split(','))
    : typeof source === 'string'
      ? source.split(',')
      : [];
  const cleaned = Array.from(
    new Set(raw.map((s) => s.trim()).filter(Boolean))
  );
  return cleaned.length > 0 ? cleaned : ['English'];
}
