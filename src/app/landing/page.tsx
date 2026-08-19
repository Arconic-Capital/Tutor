import Link from "next/link";
import "./landing.css";

export const metadata = { title: "Tutor — the HSC tutor that knows the syllabus" };

const SUBJECTS = [
  "Physics", "Chemistry", "Maths Ext 2", "English Advanced", "Economics",
  "Biology", "Maths Ext 1", "Modern History", "French", "Software Engineering",
  "Legal Studies", "Business Studies", "Japanese", "Latin", "Visual Arts",
];

export default function Landing() {
  return (
    <div className="ld">
      <nav className="ld-nav">
        <span className="ld-brand"><span className="ld-mark" />tutor</span>
        <Link href="/signin" className="ld-btn ghost">Sign in</Link>
      </nav>

      {/* hero */}
      <section className="ld-hero">
        <div className="ld-hero-copy">
          <p className="ld-kicker fade-1">Built for Sydney High students</p>
          <h1 className="fade-2">The HSC tutor that actually knows the syllabus.</h1>
          <p className="ld-sub fade-3">
            Every NESA dot point, ten years of past papers and your cohort&apos;s best
            notes — preloaded. Ask anything, get answers that cite the syllabus,
            and turn them into flashcards, cheat sheets and predicted papers.
          </p>
          <div className="ld-cta fade-4">
            <Link href="/signin" className="ld-btn solid">Sign in with your school email</Link>
            <span className="ld-meta">Students only · free</span>
          </div>
          <div className="ld-chips fade-4">
            <span className="chip float-a">“Quiz me on Equilibrium”</span>
            <span className="chip float-b">“Predict my Physics paper”</span>
            <span className="chip float-c">“Mark my Hamlet essay”</span>
          </div>
        </div>
        <div className="ld-hero-video fade-3">
          <div className="phone">
            <video src="/shs-video.mp4" autoPlay muted loop playsInline />
          </div>
          <div className="glow" aria-hidden />
        </div>
      </section>

      {/* subject marquee */}
      <div className="ld-marquee" aria-hidden>
        <div className="track">
          {[...SUBJECTS, ...SUBJECTS].map((s, i) => (
            <span key={i}>{s}</span>
          ))}
        </div>
      </div>

      {/* features */}
      <section className="ld-features">
        <div className="feat">
          <svg viewBox="0 0 48 48" className="fic" aria-hidden>
            <circle cx="24" cy="24" r="17" fill="none" stroke="var(--ld-line2)" strokeWidth="5" />
            <circle cx="24" cy="24" r="17" fill="none" stroke="var(--ld-blue)" strokeWidth="5"
              strokeDasharray="107" strokeDashoffset="30" strokeLinecap="round" className="ring-anim" />
          </svg>
          <h3>Syllabus, built in</h3>
          <p>Every NESA dot point for every subject Sydney High runs. Mastery fills as you quiz; your study plan writes itself.</p>
        </div>
        <div className="feat">
          <svg viewBox="0 0 48 48" className="fic" aria-hidden>
            <rect x="7" y="26" width="7" height="14" rx="2" fill="var(--ld-line2)" className="bar-1" />
            <rect x="20" y="18" width="7" height="22" rx="2" fill="var(--ld-blue-mid)" className="bar-2" />
            <rect x="33" y="8" width="7" height="32" rx="2" fill="var(--ld-blue)" className="bar-3" />
          </svg>
          <h3>Predict the paper</h3>
          <p>Ten years of HSC questions, analysed. See what your trial is likely to ask — then sit a generated paper in real HSC format.</p>
        </div>
        <div className="feat">
          <svg viewBox="0 0 48 48" className="fic" aria-hidden>
            <circle cx="24" cy="24" r="19" fill="var(--ld-blue-soft)" />
            <path d="M15 24.5 L21 31 L33 18" fill="none" stroke="var(--ld-blue)" strokeWidth="4.5"
              strokeLinecap="round" strokeLinejoin="round" className="tick-anim" />
          </svg>
          <h3>Marked like the HSC</h3>
          <p>Paste or photograph an answer. Get a band estimate and rubric feedback against real NESA marking guidelines.</p>
        </div>
      </section>

      {/* preloaded strip */}
      <section className="ld-strip">
        <div><b>40+</b><span>courses preloaded</span></div>
        <div><b>10 yrs</b><span>of past HSC papers</span></div>
        <div><b>Every</b><span>syllabus dot point</span></div>
        <div><b>Yours</b><span>cohort notes, ranked by use</span></div>
      </section>

      {/* voice */}
      <section className="ld-voice">
        <div className="orb" aria-hidden />
        <div>
          <h2>Talk to it.</h2>
          <p className="ld-sub">
            Voice mode for hands-free study — and real speaking-exam practice for
            French, Japanese, Chinese, German and Latin orals.
          </p>
        </div>
      </section>

      <footer className="ld-foot">
        <span><span className="ld-mark small" /> tutor — by students, for Sydney High</span>
        <span className="ld-meta">Not affiliated with Sydney Boys High School or NESA. Past papers link to official NESA pages.</span>
      </footer>
    </div>
  );
}
