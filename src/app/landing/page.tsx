"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import "./landing.css";

const SUBJECTS = [
  "Physics", "Chemistry", "Maths Ext 2", "English Advanced", "Economics",
  "Biology", "Maths Ext 1", "Modern History", "French", "Software Engineering",
  "Legal Studies", "Business Studies", "Japanese", "Latin", "Visual Arts",
];

function CramMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className="cram-mark">
      <rect x="4" y="16" width="24" height="9" rx="3" fill="#40342b" />
      <rect x="6.5" y="10" width="19" height="9" rx="3" fill="#2777c2" />
      <rect x="9" y="4" width="14" height="9" rx="3" fill="#7db3e0" />
    </svg>
  );
}

export default function Landing() {
  const explodeRef = useRef<HTMLDivElement>(null);
  const fanRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      explodeRef.current?.classList.add("static");
      fanRef.current?.classList.add("static");
      return;
    }
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        // progress 0→1 across each sticky scene
        for (const [ref, varName] of [
          [explodeRef, "--p"],
          [fanRef, "--q"],
        ] as const) {
          const el = ref.current;
          if (!el) continue;
          const r = el.getBoundingClientRect();
          const total = el.offsetHeight - window.innerHeight;
          const p = Math.min(1, Math.max(0, -r.top / Math.max(total, 1)));
          el.style.setProperty(varName, p.toFixed(4));
        }
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="ld">
      <nav className="ld-nav">
        <span className="ld-brand"><CramMark />cram</span>
        <Link href="/signin" className="ld-btn ghost">Sign in</Link>
      </nav>

      {/* hero */}
      <section className="ld-hero">
        <div className="ld-hero-copy">
          <p className="ld-kicker fade-1">Built for Sydney High students</p>
          <h1 className="fade-2">Every mark you can take, taken.</h1>
          <p className="ld-sub fade-3">
            Cram knows the syllabus — every NESA dot point, ten years of past papers
            and your cohort&apos;s best notes, preloaded. Ask anything. Get answers that
            cite the syllabus, then turn them into flashcards, cheat sheets and
            predicted papers.
          </p>
          <div className="ld-cta fade-4">
            <Link href="/signin" className="ld-btn solid">Sign in with your school email</Link>
            <span className="ld-meta">Students only · free</span>
          </div>
          <div className="ld-chips fade-4">
            <span className="chip float-a">&ldquo;Quiz me on Equilibrium&rdquo;</span>
            <span className="chip float-b">&ldquo;Predict my Physics paper&rdquo;</span>
            <span className="chip float-c">&ldquo;Mark my Hamlet essay&rdquo;</span>
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
          {[...SUBJECTS, ...SUBJECTS].map((s, i) => <span key={i}>{s}</span>)}
        </div>
      </div>

      {/* ── scroll scene 1: the app deconstructs ── */}
      <section className="explode" ref={explodeRef}>
        <div className="explode-sticky">
          <p className="scene-kicker">One app. <b>Scroll to pull it apart.</b></p>
          <div className="stack">
            <div className="layer l-repo">
              <span className="layer-label">Repository — every paper &amp; note, ranked by use</span>
              <div className="mini-card">
                <div className="mini-row"><i>📄</i> Equilibrium summary <em>★20</em></div>
                <div className="mini-row"><i>📝</i> SBHS 2023 trial <em>★32</em></div>
                <div className="mini-row"><i>🔗</i> 2024 HSC + guidelines <em>NESA</em></div>
              </div>
            </div>
            <div className="layer l-syl">
              <span className="layer-label">Syllabus — mastery per dot point</span>
              <div className="mini-card">
                <div className="mini-ring"><svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="15" fill="none" stroke="#eeece8" strokeWidth="5"/><circle cx="20" cy="20" r="15" fill="none" stroke="#2777c2" strokeWidth="5" strokeDasharray="94" strokeDashoffset="34" strokeLinecap="round" transform="rotate(-90 20 20)"/></svg><b>64%</b></div>
                <span className="mini-sub">Module 5 · Equilibrium</span>
              </div>
            </div>
            <div className="layer l-chat">
              <span className="layer-label">Tutor — answers that cite the syllabus</span>
              <div className="mini-card chatty">
                <div className="bub user">why doesn&apos;t Keq change?</div>
                <div className="bub ai">Keq is fixed at a given temperature — only the position shifts…<span className="src">CH12-12 · 2023 HSC Q21</span></div>
              </div>
            </div>
            <div className="layer l-flash">
              <span className="layer-label">Flashcards — made from your answers</span>
              <div className="mini-card flashy">Alkene → alcohol:<br />reagent + conditions?</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── scroll scene 2: flashcards fan out ── */}
      <section className="fan" ref={fanRef}>
        <div className="fan-sticky">
          <div className="fan-copy">
            <h2>Anything you learn becomes something you keep.</h2>
            <p className="ld-sub">Flashcards, cheat sheets, predicted papers, essay plans — generated from real cohort resources, saved back for everyone.</p>
          </div>
          <div className="fan-cards">
            <div className="fcard f1"><b>Flashcards</b><span>Organic pathways · 12</span></div>
            <div className="fcard f2"><b>Cheat sheet</b><span>Equilibrium one-pager</span></div>
            <div className="fcard f3"><b>Predicted paper</b><span>Physics trial · 87% match</span></div>
            <div className="fcard f4"><b>Marked essay</b><span>5/7 · mid band 5</span></div>
            <div className="fcard f5"><b>Quiz</b><span>Le Chatelier ×20</span></div>
          </div>
        </div>
      </section>

      {/* stats strip */}
      <section className="ld-strip">
        <div><b>40+</b><span>courses preloaded</span></div>
        <div><b>10 yrs</b><span>of past HSC papers</span></div>
        <div><b>Every</b><span>syllabus dot point</span></div>
        <div><b>153</b><span>official resources, day one</span></div>
      </section>

      {/* voice */}
      <section className="ld-voice">
        <div className="orb" aria-hidden />
        <div>
          <h2>Talk to it.</h2>
          <p className="ld-sub">Voice mode for hands-free study — and real speaking-exam practice for French, Japanese, Chinese, German and Latin orals.</p>
        </div>
      </section>

      <footer className="ld-foot">
        <span><CramMark size={16} /> cram — by students, for Sydney High</span>
        <span className="ld-meta">Not affiliated with Sydney Boys High School or NESA. Past papers link to official NESA pages.</span>
      </footer>
    </div>
  );
}
