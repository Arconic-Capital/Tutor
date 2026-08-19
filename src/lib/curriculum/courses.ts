export type Stage = 5 | 6;
export type Category =
  | "english" | "mathematics" | "science" | "hsie"
  | "technology" | "creative-arts" | "pdhpe" | "languages" | "other";

export interface Course {
  id: string;            // stable slug, DB primary key
  name: string;
  stage: Stage;
  yearLevels: number[];  // stage 5: [9], [10] or [9,10]; stage 6: [11,12] or [12] for HSC-only extensions
  category: Category;
  syllabusNote?: string; // syllabus-version note per spec §3
  topics: string[];      // seeded topics/modules; empty = added later via admin
}

const c = (
  id: string, name: string, stage: Stage, yearLevels: number[],
  category: Category, topics: string[] = [], syllabusNote?: string,
): Course => ({ id, name, stage, yearLevels, category, topics, syllabusNote });

export const COURSES: Course[] = [
  // ── Stage 5 core (Years 9-10) ──
  c("english-s5", "English (Stage 5)", 5, [9, 10], "english", [], "New 7-10 syllabus from 2024"),
  c("maths-s5", "Mathematics (Stage 5)", 5, [9, 10], "mathematics", [], "New 7-10 syllabus from 2024"),
  c("science-s5", "Science (Stage 5)", 5, [9, 10], "science"),
  c("history-s5", "History (Stage 5)", 5, [9, 10], "hsie"),
  c("geography-s5", "Geography (Stage 5)", 5, [9, 10], "hsie"),
  c("pdhpe-s5", "PDHPE (Stage 5)", 5, [9, 10], "pdhpe"),
  // ── Stage 5 electives (SBHS menu) ──
  c("commerce", "Commerce", 5, [9, 10], "hsie"),
  c("drama-s5", "Drama (Stage 5)", 5, [9, 10], "creative-arts"),
  c("music-s5", "Music (Stage 5)", 5, [9, 10], "creative-arts"),
  c("photographic-digital-media", "Photographic and Digital Media", 5, [9, 10], "creative-arts"),
  c("visual-arts-s5", "Visual Arts (Stage 5)", 5, [9, 10], "creative-arts"),
  c("visual-design", "Visual Design", 5, [9, 10], "creative-arts"),
  c("design-technology-s5", "Design & Technology (Stage 5)", 5, [9, 10], "technology"),
  c("graphics-technology", "Graphics Technology", 5, [9, 10], "technology"),
  c("computing-games-simulations", "Computing Technology: Games and Simulations", 5, [10], "technology"),
  c("computing-software-mechatronics", "Computing Technology: Software Development & Mechatronics", 5, [10], "technology"),
  c("philosophy", "Philosophy", 5, [10], "other"),
  c("pass", "Physical Activity and Sports Studies", 5, [10], "pdhpe"),
  c("history-elective", "History (Elective)", 5, [10], "hsie"),
  c("geography-elective", "Geography (Elective)", 5, [10], "hsie"),
  c("chinese-s5", "Chinese (Stage 5)", 5, [9, 10], "languages"),
  c("french-s5", "French (Stage 5)", 5, [9, 10], "languages"),
  c("german-s5", "German (Stage 5)", 5, [9, 10], "languages"),
  c("japanese-s5", "Japanese (Stage 5)", 5, [9, 10], "languages"),
  c("latin-s5", "Latin (Stage 5)", 5, [9, 10], "languages"),
  c("classical-greek-s5", "Classical Greek (Stage 5)", 5, [9, 10], "languages"),
  // ── Stage 6 English ──
  c("english-advanced", "English Advanced", 6, [11, 12], "english", [
    "Reading to Write", "Narratives that Shape our World", "Critical Study of Literature",
    "Texts and Human Experiences", "Textual Conversations", "The Craft of Writing",
  ]),
  c("english-ext-1", "English Extension 1", 6, [11, 12], "english"),
  c("english-ext-2", "English Extension 2", 6, [12], "english"),
  // ── Stage 6 Mathematics ──
  c("maths-advanced", "Mathematics Advanced", 6, [11, 12], "mathematics", [
    "Functions", "Trigonometric Functions", "Calculus", "Exponential and Logarithmic Functions",
    "Statistical Analysis", "Financial Mathematics",
  ]),
  c("maths-ext-1", "Mathematics Extension 1", 6, [11, 12], "mathematics", [
    "Further Functions", "Polynomials", "Inverse Trigonometric Functions", "Further Calculus",
    "Combinatorics", "Proof by Induction", "Vectors", "Differential Equations", "Binomial Distribution",
  ]),
  c("maths-ext-2", "Mathematics Extension 2", 6, [12], "mathematics", [
    "Proof", "Vectors", "Complex Numbers", "Further Integration", "Mechanics",
  ]),
  // ── Stage 6 Science ──
  c("physics", "Physics", 6, [11, 12], "science", [
    "Kinematics", "Dynamics", "Waves and Thermodynamics", "Electricity and Magnetism",
    "Advanced Mechanics", "Electromagnetism", "The Nature of Light", "From the Universe to the Atom",
  ]),
  c("chemistry", "Chemistry", 6, [11, 12], "science", [
    "Properties and Structure of Matter", "Introduction to Quantitative Chemistry",
    "Reactive Chemistry", "Drivers of Reactions", "Equilibrium and Acid Reactions",
    "Acid/Base Reactions", "Organic Chemistry", "Applying Chemical Ideas",
  ]),
  c("biology", "Biology", 6, [11, 12], "science", [
    "Cells as the Basis of Life", "Organisation of Living Things", "Biological Diversity",
    "Ecosystem Dynamics", "Heredity", "Genetic Change", "Infectious Disease", "Non-infectious Disease",
  ]),
  c("investigating-science", "Investigating Science", 6, [11, 12], "science"),
  // ── Stage 6 HSIE ──
  c("ancient-history", "Ancient History", 6, [11, 12], "hsie"),
  c("modern-history", "Modern History", 6, [11, 12], "hsie"),
  c("history-ext", "History Extension", 6, [12], "hsie"),
  c("business-studies", "Business Studies", 6, [11, 12], "hsie"),
  c("economics", "Economics", 6, [11, 12], "hsie", [
    "Introduction to Economics", "Consumers and Business", "Markets", "Labour Markets",
    "Financial Markets", "Government and the Economy", "The Global Economy",
    "Australia's Place in the Global Economy", "Economic Issues", "Economic Policies and Management",
  ]),
  c("legal-studies", "Legal Studies", 6, [11, 12], "hsie"),
  c("geography-s6", "Geography (Stage 6)", 6, [11, 12], "hsie"),
  c("sor-1", "Studies of Religion I", 6, [11, 12], "hsie"),
  c("sor-2", "Studies of Religion II", 6, [11, 12], "hsie"),
  // ── Stage 6 Technology ──
  c("software-engineering", "Software Engineering", 6, [11, 12], "technology", [
    "Programming Fundamentals", "The Object-Oriented Paradigm", "Programming Mechatronics",
    "Secure Software Architecture", "Programming for the Web", "Software Automation",
    "Software Engineering Project",
  ], "New course, first HSC 2025 (replaced SDD)"),
  c("engineering-studies", "Engineering Studies", 6, [11, 12], "technology"),
  c("design-technology-s6", "Design and Technology (Stage 6)", 6, [11, 12], "technology"),
  // ── Stage 6 Creative Arts ──
  c("music-1", "Music 1", 6, [11, 12], "creative-arts"),
  c("music-2", "Music 2", 6, [11, 12], "creative-arts"),
  c("music-ext", "Music Extension", 6, [12], "creative-arts"),
  c("drama-s6", "Drama (Stage 6)", 6, [11, 12], "creative-arts"),
  c("visual-arts-s6", "Visual Arts (Stage 6)", 6, [11, 12], "creative-arts"),
  // ── Stage 6 PDHPE ──
  c("health-movement-science", "Health and Movement Science", 6, [11, 12], "pdhpe", [],
    "New course, first HSC 2025 (replaced PDHPE Stage 6)"),
  // ── Stage 6 Languages ──
  c("chinese-beginners", "Chinese Beginners", 6, [11, 12], "languages"),
  c("chinese-continuers", "Chinese Continuers", 6, [11, 12], "languages"),
  c("chinese-in-context", "Chinese in Context", 6, [11, 12], "languages"),
  c("chinese-ext", "Chinese Extension", 6, [12], "languages"),
  c("french-beginners", "French Beginners", 6, [11, 12], "languages"),
  c("french-continuers", "French Continuers", 6, [11, 12], "languages"),
  c("french-ext", "French Extension", 6, [12], "languages"),
  c("german-beginners", "German Beginners", 6, [11, 12], "languages"),
  c("german-continuers", "German Continuers", 6, [11, 12], "languages"),
  c("german-ext", "German Extension", 6, [12], "languages"),
  c("japanese-beginners", "Japanese Beginners", 6, [11, 12], "languages"),
  c("japanese-continuers", "Japanese Continuers", 6, [11, 12], "languages"),
  c("japanese-ext", "Japanese Extension", 6, [12], "languages"),
  c("latin-continuers", "Latin Continuers", 6, [11, 12], "languages"),
  c("latin-ext", "Latin Extension", 6, [12], "languages"),
  c("classical-greek-continuers", "Classical Greek Continuers", 6, [11, 12], "languages"),
  c("classical-greek-ext", "Classical Greek Extension", 6, [12], "languages"),
];
