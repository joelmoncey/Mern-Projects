/**
 * Structured SSC Exam Taxonomy Preset.
 * All subject, subSubject, and subTopic names are in clean English for selection,
 * including General Hindi sub-subjects and sub-topics.
 */
export const SSC_TAXONOMY_PRESET = [
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
      Grammar: [
        'Active & Passive Voice',
        'Direct & Indirect Speech',
      ],
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
      ],
    },
    customTag: 'ssc_jht_translation',
  },
  {
    exam: 'Kerala PSC',
    subExams: [
      'Degree Prelims',
      'Plus Two Prelims',
      'SSLC Prelims',
      'LDC',
      'LGS',
      'Police / CPO',
      'Secretariat / Univ Asst',
    ],
    allowedLanguages: ['Malayalam', 'English'],
    subject: 'General Knowledge',
    subSubjects: {
      'Kerala History & Renaissance': [
        'Arrival of Europeans & Travancore',
        'Social & Religious Reform Movements (Navothanam)',
        'National Movement & Aikya Kerala',
        'Kerala Post-1956 & Governance',
      ],
      'Kerala Geography & Culture': [
        'Physiography, Districts & Rivers',
        'Climate, Soil, Forests & Wildlife',
        'Agriculture, Minerals & Transport',
        'Arts, Festivals, Literature & Cinema',
      ],
      'Indian History & Geography': [
        'Ancient, Medieval & Modern India',
        'World History Basics',
        'Physical, Indian Geography & Map Basics',
      ],
      'Indian Constitution & Polity': [
        'Preamble, Fundamental Rights, DPSP & Duties',
        'Citizenship, Amendments & Panchayati Raj',
        'Parliament, Executive, Judiciary & Constitutional Bodies',
      ],
      'Economics & Social Welfare': [
        'Five-Year Plans, NITI Aayog, RBI & Budget',
        'Kerala Economy, Land Reforms & Social Welfare',
        'Human Rights & Protection Acts (SC/ST, Women, Children)',
      ],
    },
    customTag: 'kpsc_core_gk',
  },
  {
    exam: 'Kerala PSC',
    subExams: [
      'Degree Prelims',
      'Plus Two Prelims',
      'SSLC Prelims',
      'LDC',
      'LGS',
      'Police / CPO',
      'Secretariat / Univ Asst',
    ],
    allowedLanguages: ['Malayalam', 'English'],
    subject: 'General Science',
    subSubjects: {
      Physics: [
        "Units, Measurements, Motion & Newton's Laws",
        'Gravitation, Light, Sound, Heat & Electricity',
      ],
      Chemistry: [
        'Atom, Periodic Table, Acids, Bases & Salts',
        'Metals, Non-Metals, Alloys & Everyday Chemistry',
      ],
      'Biology & Public Health': [
        'Cell, Tissues, Human Body Systems & Nutrition',
        'Diseases, Immunity, Environment & Kerala Health Schemes',
      ],
    },
    customTag: 'kpsc_core_science',
  },
  {
    exam: 'Kerala PSC',
    subExams: [
      'Degree Prelims',
      'Plus Two Prelims',
      'SSLC Prelims',
      'LDC',
      'LGS',
      'Police / CPO',
      'Secretariat / Univ Asst',
    ],
    allowedLanguages: ['Malayalam', 'English'],
    subject: 'Current Affairs',
    subSubjects: {
      'Kerala, National & World': [
        'Awards, Honours & Sports',
        'Government Schemes, Summits & Appointments',
        'Science, Space & Defense Updates',
      ],
    },
    customTag: 'kpsc_current_affairs',
  },
  {
    exam: 'Kerala PSC',
    subExams: [
      'Degree Prelims',
      'Plus Two Prelims',
      'SSLC Prelims',
      'LDC',
      'LGS',
      'Police / CPO',
      'Secretariat / Univ Asst',
    ],
    allowedLanguages: ['Malayalam', 'English'],
    subject: 'Simple Arithmetic',
    subSubjects: {
      'Core Maths': [
        'Numbers, Fractions, Decimals & Exponents',
        'Percentage, Profit & Loss, Simple & Compound Interest',
        'Ratio & Proportion, Average, Time & Work, Time & Distance',
        'Mensuration & Progressions',
      ],
    },
    customTag: 'kpsc_arithmetic',
  },
  {
    exam: 'Kerala PSC',
    subExams: [
      'Degree Prelims',
      'Plus Two Prelims',
      'SSLC Prelims',
      'LDC',
      'LGS',
      'Police / CPO',
      'Secretariat / Univ Asst',
    ],
    allowedLanguages: ['Malayalam', 'English'],
    subject: 'Mental Ability & Reasoning',
    subSubjects: {
      'Logical & Analytical': [
        'Number & Alphabet Series',
        'Coding-Decoding, Analogy & Odd One Out',
        'Blood Relations, Direction, Ranking & Venn Diagrams',
        'Mathematical Signs, Clocks, Calendars & Non-Verbal Logic',
      ],
    },
    customTag: 'kpsc_reasoning',
  },
  {
    exam: 'Kerala PSC',
    subExams: [
      'Degree Prelims',
      'Plus Two Prelims',
      'SSLC Prelims',
      'LDC',
      'LGS',
      'Police / CPO',
      'Secretariat / Univ Asst',
    ],
    allowedLanguages: ['English'],
    subject: 'General English',
    subSubjects: {
      'Grammar & Usage': [
        'Tenses, Articles, Prepositions & Subject-Verb Agreement',
        'Active & Passive Voice, Direct & Indirect Speech',
        'Transformation of Sentences, Error Spotting & Fill in the Blanks',
      ],
      'Vocabulary & Comprehension': [
        'Synonyms, Antonyms, One-Word Substitution & Idioms',
        'Phrasal Verbs, Collective Nouns, Prefixes & Suffixes',
        'Spelling & Reading Comprehension',
      ],
    },
    customTag: 'kpsc_english_only',
  },
  {
    exam: 'Kerala PSC',
    subExams: [
      'Degree Prelims',
      'Plus Two Prelims',
      'SSLC Prelims',
      'LDC',
      'LGS',
      'Police / CPO',
      'Secretariat / Univ Asst',
    ],
    allowedLanguages: ['Malayalam'],
    subject: 'Malayalam',
    subSubjects: {
      'Malayalam Grammar & Vocabulary (Bhashayum Vyakaranavum)': [
        'Word & Sentence Correction, Antonyms (Padashuddhi, Vakyashuddhi & Vipareethapadangal)',
        'Synonyms, Homonyms & Idioms (Paryayapadangal, Nanarthangal & Shailikal)',
        'Sandhi, Samasam, Gender, Number & Tense',
        'Splitting/Joining Words & Proverbs (Pirichezhuthal, Cherthezhuthal & Pazhanchollukal)',
      ],
    },
    customTag: 'kpsc_malayalam_only',
  },
  {
    exam: 'Kerala PSC',
    subExams: ['LDC', 'Secretariat / Univ Asst', 'Degree Mains'],
    allowedLanguages: ['Malayalam', 'English'],
    subject: 'Computer Awareness',
    subSubjects: {
      'Fundamentals & ICT': [
        'Hardware, Memory, OS & Office Packages',
        'Networks, Internet, Cyber Laws & IT Act',
      ],
    },
    customTag: 'kpsc_computer',
  },
  {
    exam: 'Kerala PSC',
    subExams: ['Technical / Post-Specific', 'Degree Mains'],
    allowedLanguages: ['English'],
    subject: 'Core / Trade / Subject Paper',
    subSubjects: {
      'Post Syllabus': ['Discipline-Specific Core Topics'],
    },
    customTag: 'kpsc_post_specific',
  },
];

export const UPSC_RRB_TAXONOMY_PRESET = [
  {
    exam: 'UPSC',
    subExams: ['CSE Prelims'],
    allowedLanguages: ['English', 'Hindi'],
    subject: 'History & Art Culture',
    subSubjects: {
      'Indian Heritage & History': [
        'Ancient India & Indus Valley',
        'Medieval India & Bhakti/Sufi Movements',
        'Modern Indian History & National Movement',
        'Indian Art, Architecture, Literature & Culture',
      ],
    },
    customTag: 'upsc_history_culture',
  },
  {
    exam: 'UPSC',
    subExams: ['CSE Prelims'],
    allowedLanguages: ['English', 'Hindi'],
    subject: 'Geography',
    subSubjects: {
      'Indian & World Geography': [
        'Physical Geography & Geomorphology',
        'Climatology, Monsoon & Oceanography',
        'Indian Physiography, Rivers, Soils, Agriculture & Resources',
        'World Geography & Map Based Concepts',
      ],
    },
    customTag: 'upsc_geography',
  },
  {
    exam: 'UPSC',
    subExams: ['CSE Prelims'],
    allowedLanguages: ['English', 'Hindi'],
    subject: 'Polity & Governance',
    subSubjects: {
      'Constitution & Institutions': [
        'Constitutional Framework, Preamble, FR, DPSP & FD',
        'Union & State Executive, Parliament & State Legislatures',
        'Judiciary, Federalism, Panchayati Raj & Municipalities',
        'Constitutional & Non-Constitutional Bodies, Public Policy & Rights',
      ],
    },
    customTag: 'upsc_polity',
  },
  {
    exam: 'UPSC',
    subExams: ['CSE Prelims'],
    allowedLanguages: ['English', 'Hindi'],
    subject: 'Economy & Social Development',
    subSubjects: {
      'Macro & Development': [
        'National Income, Growth, Inflation & Monetary Policy (RBI)',
        'Fiscal Policy, Budget, Taxation & External Sector',
        'Agriculture, Industry, Infrastructure & Inclusive Growth',
        'Poverty, Demographics, Social Sector & Sustainable Development',
      ],
    },
    customTag: 'upsc_economy',
  },
  {
    exam: 'UPSC',
    subExams: ['CSE Prelims'],
    allowedLanguages: ['English', 'Hindi'],
    subject: 'Environment & Ecology',
    subSubjects: {
      'Ecology, Biodiversity & Climate': [
        'Ecosystems, Food Chains & Ecological Concepts',
        'Biodiversity, Protected Areas, Flora & Fauna',
        'Climate Change, Pollution, Environmental Laws & Conventions',
      ],
    },
    customTag: 'upsc_environment',
  },
  {
    exam: 'UPSC',
    subExams: ['CSE Prelims'],
    allowedLanguages: ['English', 'Hindi'],
    subject: 'Science & Technology',
    subSubjects: {
      'Core & Emerging Tech': [
        'General Science Fundamentals (Physics, Chemistry, Biology)',
        'Space (ISRO), Defense & Nuclear Tech',
        'IT, AI, Biotechnology, Nanotechnology & Health',
      ],
    },
    customTag: 'upsc_scitech',
  },
  {
    exam: 'UPSC',
    subExams: ['CSE Prelims'],
    allowedLanguages: ['English', 'Hindi'],
    subject: 'Current Events',
    subSubjects: {
      'National & International': [
        'Government Schemes, Bills & Policy Updates',
        'International Relations, Summits & Organizations',
        'Reports, Indices, Economy & Science Developments',
      ],
    },
    customTag: 'upsc_current_affairs',
  },
  {
    exam: 'UPSC',
    subExams: ['CSAT'],
    allowedLanguages: ['English', 'Hindi'],
    subject: 'Comprehension & Reasoning',
    subSubjects: {
      'CSAT Verbal & Logic': [
        'Reading Comprehension',
        'Logical Reasoning & Analytical Ability',
        'Decision Making & Problem Solving',
        'General Mental Ability',
      ],
    },
    customTag: 'upsc_csat_reasoning',
  },
  {
    exam: 'UPSC',
    subExams: ['CSAT'],
    allowedLanguages: ['English', 'Hindi'],
    subject: 'Basic Numeracy & Data Interpretation',
    subSubjects: {
      'Class X Numeracy': [
        'Numbers, Relations & Orders of Magnitude',
        'Percentages, Ratios, Averages & Basic Mensuration',
        'Data Interpretation (Charts, Graphs, Tables & Sufficiency)',
      ],
    },
    customTag: 'upsc_csat_numeracy',
  },
  {
    exam: 'RRB',
    subExams: ['NTPC', 'Group D', 'ALP', 'JE'],
    allowedLanguages: ['English', 'Hindi'],
    subject: 'General Awareness & Current Affairs',
    subSubjects: {
      'GK & Current Events': [
        'National & International Current Affairs',
        'Indian History, Art, Culture & Freedom Struggle',
        'Indian Polity, Constitution & Economy',
        'Indian & World Geography',
        'Static GK, Awards, Sports, Books, Abbreviations & Organizations',
      ],
    },
    customTag: 'rrb_core_gk',
  },
  {
    exam: 'RRB',
    subExams: ['NTPC', 'Group D', 'ALP', 'JE'],
    allowedLanguages: ['English', 'Hindi'],
    subject: 'General Science',
    subSubjects: {
      'Physics, Chemistry & Life Sciences': [
        'Physics (Up to 10th Standard)',
        'Chemistry (Up to 10th Standard)',
        'Life Sciences / Biology (Up to 10th Standard)',
      ],
    },
    customTag: 'rrb_general_science',
  },
  {
    exam: 'RRB',
    subExams: ['NTPC', 'Group D', 'ALP'],
    allowedLanguages: ['English', 'Hindi'],
    subject: 'Mathematics',
    subSubjects: {
      'Arithmetic, Algebra, Geometry & Stats': [
        'Number System, Decimals, Fractions, LCM, HCF & BODMAS',
        'Percentage, Ratio & Proportion, Average, Profit & Loss, SI & CI',
        'Time & Work, Pipes & Cistern, Time, Speed & Distance, Boats',
        'Elementary Algebra, Quadratic Equations, Geometry, Trigonometry & Mensuration',
        'Elementary Statistics & Data Interpretation',
      ],
    },
    customTag: 'rrb_maths',
  },
  {
    exam: 'RRB',
    subExams: ['NTPC', 'Group D', 'ALP', 'JE'],
    allowedLanguages: ['English', 'Hindi'],
    subject: 'General Intelligence & Reasoning',
    subSubjects: {
      'Reasoning & Analytical': [
        'Analogies, Number & Alphabet Series, Coding-Decoding',
        'Mathematical Operations, Similarities & Differences, Relationships',
        'Syllogism, Venn Diagrams, Puzzles & Seating Arrangement',
        'Direction Test, Statement-Conclusion, Assumptions & Decision Making',
        'Data Sufficiency, Inequalities & Data Interpretation',
      ],
    },
    customTag: 'rrb_reasoning',
  },
  {
    exam: 'RRB',
    subExams: ['NTPC', 'JE'],
    allowedLanguages: ['English', 'Hindi'],
    subject: 'Basics of Computers & Applications',
    subSubjects: {
      'Computer Basics': [
        'Computer Architecture, Input/Output & Storage Devices',
        'Operating Systems, MS Office, Networking & Internet',
        'Computer Virus & Data Representation',
      ],
    },
    customTag: 'rrb_computers',
  },
  {
    exam: 'RRB',
    subExams: ['JE'],
    allowedLanguages: ['English', 'Hindi'],
    subject: 'Basics of Environment & Pollution',
    subSubjects: {
      'Environment & Control': [
        'Basics of Environment, Acid Rain, Ozone Depletion & Global Warming',
        'Air, Water & Noise Pollution, Effects, Control & Waste Management',
      ],
    },
    customTag: 'rrb_environment',
  },
];

export const ALL_OFFICIAL_TAXONOMY_PRESET = [
  ...SSC_TAXONOMY_PRESET,
  ...UPSC_RRB_TAXONOMY_PRESET,
];

// Map common Hindi & Malayalam sub-subject / sub-topic names to English if pasted from raw JSON
const NON_ENGLISH_TO_ENGLISH_TOPIC_MAP = {
  // Hindi (SSC GD / JHT)
  'व्याकरण एवं शब्दावली': 'Hindi Grammar & Vocabulary',
  'पर्यायवाची शब्द': 'Synonyms (Paryayvachi)',
  'विलोम शब्द': 'Antonyms (Vilom Shabd)',
  'मुहावरे एवं लोकोक्तियां': 'Idioms & Proverbs (Muhavare)',
  'वर्तनी शुद्धि': 'Spelling Correction (Vartani Shuddhi)',
  'वाक्यांश के लिए एक शब्द': 'One-Word Substitution (Vakyansh)',
  'वाक्य शुद्धि': 'Sentence Correction (Vakya Shuddhi)',
  'रिक्त स्थान': 'Fill in the Blanks (Rikt Sthan)',
  'गद्यांश': 'Reading Comprehension (Gadyansh)',
  // Malayalam (Kerala PSC)
  'ഭാഷയും വ്യാകരണവും':
    'Malayalam Grammar & Vocabulary (Bhashayum Vyakaranavum)',
  'പദശുദ്ധി, വാക്യശുദ്ധി & വിപരീതപദങ്ങൾ':
    'Word & Sentence Correction, Antonyms (Padashuddhi, Vakyashuddhi & Vipareethapadangal)',
  'പര്യായപദങ്ങൾ, നാനാർത്ഥങ്ങൾ & ശൈലികൾ':
    'Synonyms, Homonyms & Idioms (Paryayapadangal, Nanarthangal & Shailikal)',
  'സന്ധി, സമാസം, ലിംഗം, വചനം & കാലം':
    'Sandhi, Samasam, Gender, Number & Tense',
  'പിരിച്ചെഴുതൽ, ചേർത്തെഴുതൽ & പഴഞ്ചൊല്ലുകൾ':
    'Splitting/Joining Words & Proverbs (Pirichezhuthal, Cherthezhuthal & Pazhanchollukal)',
};

export function normalizeEnglishTopicLabel(label) {
  const trimmed = String(label || '').trim();
  return NON_ENGLISH_TO_ENGLISH_TOPIC_MAP[trimmed] || trimmed;
}
