"use client";

import Link from "next/link";
import { useEffect } from "react";
import { IlloContribute, IlloRise, IlloLegacy, IlloAsk, IlloVoice, IlloPodiumRace } from "./illustrations";
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
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      els.forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("in")),
      { threshold: 0.25 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
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
          <p className="ld-kicker fade-1">The shared repository for Sydney High</p>
          <h1 className="fade-2">Every High student who ever sat the HSC, in your corner.</h1>
          <p className="ld-sub fade-3">
            One knowledge base, built by current and former High students together —
            notes, trials, essays, tricks. Searchable, askable, and getting smarter
            every year. So the next cohort starts where the last one finished.
          </p>
          <div className="ld-cta fade-4">
            <Link href="/signin" className="ld-btn solid">Sign in with your school email</Link>
            <span className="ld-meta">High students only · free</span>
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

      {/* the why */}
      <section className="ld-why-split reveal">
        <div>
          <p className="ld-kicker">Why this exists</p>
          <h2>The schools winning the HSC are the ones that share.</h2>
          <p className="ld-sub">
            North Sydney Boys overtook James Ruse to rank first in NSW — carried by a
            cohort culture of sharing everything. Right now their notes are scattered
            across the internet. High&apos;s don&apos;t have to be. One repository, owned by
            High students, compounding every single year.
          </p>
        </div>
        <IlloPodiumRace />
      </section>

      {/* how it compounds */}
      <section className="ld-steps">
        <div className="step reveal">
          <span className="step-n">1</span>
          <h3>Everyone contributes</h3>
          <p>Notes, summaries, essays, trial attempts — drop anything in. It files itself by subject, module and type.</p>
          <IlloContribute />
        </div>
        <div className="step reveal">
          <span className="step-n">2</span>
          <h3>The best rises</h3>
          <p>What the cohort actually uses ranks first — opens, saves, upvotes, comments. Duds sink. Errors get caught by the crowd.</p>
          <IlloRise />
        </div>
        <div className="step reveal">
          <span className="step-n">3</span>
          <h3>Every year starts ahead</h3>
          <p>Graduating students leave their notes behind. The AI studies all of it — so you can search, ask, quiz, and generate from decades of High knowledge.</p>
          <IlloLegacy />
        </div>
      </section>

      {/* the AI layer */}
      <section className="ld-why-split reverse reveal">
        <IlloAsk />
        <div>
          <p className="ld-kicker">Then the AI goes to work</p>
          <h2>Ask it anything. It answers from High&apos;s own knowledge.</h2>
          <p className="ld-sub">
            Every answer cites the syllabus dot point and the cohort resources it drew from.
            Turn any answer into flashcards, cheat sheets, predicted papers — marked
            against real NESA guidelines.
          </p>
        </div>
      </section>

      {/* stats strip */}
      <section className="ld-strip reveal">
        <div><b>40+</b><span>courses preloaded</span></div>
        <div><b>10 yrs</b><span>of past HSC papers</span></div>
        <div><b>Every</b><span>syllabus dot point</span></div>
        <div><b>153</b><span>official resources, day one</span></div>
      </section>

      {/* voice */}
      <section className="ld-voice reveal">
        <IlloVoice />
        <div>
          <h2>Talk to it.</h2>
          <p className="ld-sub">Voice mode for hands-free study — and real speaking-exam practice for French, Japanese, Chinese, German and Latin orals.</p>
        </div>
      </section>

      <footer className="ld-foot">
        <span><CramMark size={16} /> cram — by High students, for High students</span>
        <span className="ld-meta">Not affiliated with Sydney Boys High School or NESA. Past papers link to official NESA pages.</span>
      </footer>
    </div>
  );
}
