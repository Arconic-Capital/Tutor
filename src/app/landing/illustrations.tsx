/* Isometric technical illustrations — Baseten-style line art in Cram's palette.
   Thin ink outlines, selective sky fills, dashed wireframes + connectors,
   mono-label tags, floating diamond confetti. No people, no ground blobs. */

const STROKE = "#2b2119";
const BLUE = "#2777c2";
const SKY = "#bfe0f5";
const PALE = "#eaf4fc";
const TAN = "#e8c9ab";
const MONO = "ui-monospace, 'SF Mono', Menlo, monospace";

const ISO_X = 0.866;
const ISO_Y = 0.5;

/** Isometric box. Top-back vertex at (0,0); a = length along right axis, b = along left axis, d = height. */
function IsoBox({
  x, y, a, b, d, top = "#fff", right = "#fff", left = "#fff",
  dashed = false, stroke = STROKE, cls = "",
}: {
  x: number; y: number; a: number; b: number; d: number;
  top?: string; right?: string; left?: string; dashed?: boolean; stroke?: string; cls?: string;
}) {
  const ax = a * ISO_X, ay = a * ISO_Y, bx = b * ISO_X, by = b * ISO_Y;
  const common = {
    stroke, strokeWidth: 1.4, strokeLinejoin: "round" as const,
    strokeDasharray: dashed ? "3 3" : undefined,
  };
  return (
    <g transform={`translate(${x} ${y})`} className={cls}>
      <path d={`M0 0 l${ax} ${ay} l${-bx} ${by} l${-ax} ${-ay} Z`} fill={dashed ? "none" : top} {...common} />
      <path d={`M${ax} ${ay} l0 ${d} l${-bx} ${by} l0 ${-d} Z`} fill={dashed ? "none" : right} {...common} />
      <path d={`M${ax - bx} ${ay + by} l0 ${d} l${-ax} ${-ay} l0 ${-d} Z`} fill={dashed ? "none" : left} {...common} />
    </g>
  );
}

/** Cylinder / disc. Centre of top ellipse at (x,y). */
function Disc({ x, y, r, d, top = SKY, side = "#fff", cls = "" }: { x: number; y: number; r: number; d: number; top?: string; side?: string; cls?: string }) {
  const ry = r * 0.5;
  return (
    <g transform={`translate(${x} ${y})`} className={cls}>
      <path d={`M${-r} 0 L${-r} ${d} A${r} ${ry} 0 0 0 ${r} ${d} L${r} 0`} fill={side} stroke={STROKE} strokeWidth="1.4" />
      <ellipse rx={r} ry={ry} fill={top} stroke={STROKE} strokeWidth="1.4" />
    </g>
  );
}

/** Mono-label tag, Baseten style. */
function Tag({ x, y, text, w, fill = PALE }: { x: number; y: number; text: string; w: number; fill?: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width={w} height="18" rx="2" fill={fill} stroke={SKY} strokeWidth="1" />
      <text x={w / 2} y="12.5" textAnchor="middle" fontSize="8.5" letterSpacing="0.06em" fontFamily={MONO} fill={STROKE}>{text}</text>
    </g>
  );
}

/** Iso diamond confetti. */
function Dia({ x, y, fill = SKY, s = 1, cls = "" }: { x: number; y: number; fill?: string; s?: number; cls?: string }) {
  return <path transform={`translate(${x} ${y}) scale(${s})`} d="M0 -3.5 L6 0 L0 3.5 L-6 0 Z" fill={fill} className={cls} />;
}

function Connector({ d, cls = "march" }: { d: string; cls?: string }) {
  return <path d={d} fill="none" stroke={STROKE} strokeWidth="1.1" strokeDasharray="2 5" strokeLinecap="round" className={cls} />;
}

/* ── WHY: the shared repository — central stacked discs fed by cubes ── */
export function IlloPodiumRace() {
  return (
    <svg viewBox="0 0 420 320" className="illo" role="img" aria-label="A shared knowledge base fed by notes, trials and essays">
      {/* confetti */}
      <Dia x={64} y={54} cls="illo-float-a" />
      <Dia x={330} y={38} fill={TAN} cls="illo-float-b" />
      <Dia x={388} y={150} cls="illo-float-c" />
      <Dia x={36} y={190} fill={TAN} s={0.8} cls="illo-float-b" />
      {/* the repository: two stacked discs */}
      <Disc x={210} y={128} r={64} d={26} top={SKY} cls="illo-float-b" />
      <Disc x={210} y={176} r={64} d={26} top={PALE} />
      <Tag x={152} y={64} w={116} text="SHARED REPOSITORY" />
      <Connector d="M210 82 L210 96" />
      {/* feeder cubes */}
      <IsoBox x={70} y={236} a={26} b={26} d={22} top={SKY} />
      <IsoBox x={196} y={262} a={26} b={26} d={22} dashed />
      <IsoBox x={318} y={240} a={26} b={26} d={22} top={BLUE} right={PALE} />
      <Tag x={40} y={296} w={62} text="NOTES" />
      <Tag x={168} y={300} w={62} text="TRIALS" />
      <Tag x={294} y={298} w={62} text="ESSAYS" />
      <Connector d="M96 238 Q140 214 168 202" />
      <Connector d="M222 260 Q216 240 212 226" />
      <Connector d="M320 240 Q286 220 256 206" />
      {/* count */}
      <Tag x={300} y={96} w={98} text="153 RESOURCES" fill="#fff" />
    </svg>
  );
}

/* ── STEP 1: contribute — cubes flow along a dashed path, get auto-filed ── */
export function IlloContribute() {
  return (
    <svg viewBox="0 0 320 240" className="illo" role="img" aria-label="Uploads flowing into the repository and filing themselves">
      <Dia x={48} y={36} cls="illo-float-a" />
      <Dia x={272} y={52} fill={TAN} s={0.8} cls="illo-float-c" />
      {/* incoming cubes */}
      <IsoBox x={38} y={92} a={20} b={20} d={17} dashed cls="illo-float-a" />
      <IsoBox x={104} y={64} a={20} b={20} d={17} top={SKY} cls="illo-float-b" />
      <IsoBox x={170} y={40} a={20} b={20} d={17} top={BLUE} right={PALE} cls="illo-float-c" />
      <Connector d="M60 130 Q130 130 200 138" />
      <Connector d="M126 102 Q170 116 204 132" />
      {/* destination: slab stack */}
      <IsoBox x={224} y={128} a={54} b={40} d={11} top={PALE} />
      <IsoBox x={224} y={148} a={54} b={40} d={11} top={SKY} />
      <IsoBox x={224} y={168} a={54} b={40} d={11} top="#fff" />
      <Tag x={166} y={216} w={128} text="AUTO-FILED → MODULE 5" />
    </svg>
  );
}

/* ── STEP 2: the best rises — middle cube elevated on a slab ── */
export function IlloRise() {
  return (
    <svg viewBox="0 0 320 240" className="illo" role="img" aria-label="The most used resource ranked first">
      <Dia x={160} y={30} fill={TAN} cls="illo-float-a" />
      <Dia x={44} y={70} s={0.8} cls="illo-float-c" />
      {/* raised winner */}
      <IsoBox x={132} y={116} a={44} b={44} d={12} top={PALE} />
      <IsoBox x={132} y={70} a={30} b={30} d={26} top={BLUE} right={SKY} cls="illo-float-b" />
      <Tag x={112} y={30} w={96} text="★ 32 · MOST USED" />
      <Connector d="M160 48 L160 62" />
      {/* runners-up */}
      <IsoBox x={44} y={140} a={24} b={24} d={20} top={SKY} />
      <IsoBox x={244} y={146} a={24} b={24} d={20} dashed />
      <Tag x={20} y={196} w={54} text="#2" />
      <Tag x={226} y={200} w={54} text="#3" />
      <Tag x={124} y={186} w={70} text="#1" fill={SKY} />
    </svg>
  );
}

/* ── STEP 3: legacy — one cohort's stack handed to the next ── */
export function IlloLegacy() {
  return (
    <svg viewBox="0 0 320 240" className="illo" role="img" aria-label="Each graduating class hands its knowledge to the next">
      <Dia x={160} y={40} cls="illo-float-a" />
      <Dia x={288} y={92} fill={TAN} s={0.8} cls="illo-float-b" />
      {/* class of 2026 stack */}
      <IsoBox x={72} y={96} a={42} b={32} d={10} top={SKY} />
      <IsoBox x={72} y={114} a={42} b={32} d={10} top={PALE} />
      <IsoBox x={72} y={132} a={42} b={32} d={10} top="#fff" />
      <Tag x={22} y={182} w={104} text="CLASS OF 2026" />
      {/* arrow */}
      <Connector d="M138 128 Q168 112 196 118" />
      <path d="M196 118 l-8 -1 m8 1 l-5 7" stroke={STROKE} strokeWidth="1.2" fill="none" strokeLinecap="round" />
      {/* class of 2027 stack — one layer taller, top filled */}
      <IsoBox x={218} y={78} a={42} b={32} d={10} top={BLUE} right={SKY} cls="illo-float-b" />
      <IsoBox x={218} y={96} a={42} b={32} d={10} top={SKY} />
      <IsoBox x={218} y={114} a={42} b={32} d={10} top={PALE} />
      <IsoBox x={218} y={132} a={42} b={32} d={10} top="#fff" />
      <Tag x={196} y={182} w={104} text="CLASS OF 2027" />
    </svg>
  );
}

/* ── AI layer: question in, cited answer out of the knowledge base ── */
export function IlloAsk() {
  return (
    <svg viewBox="0 0 380 300" className="illo" role="img" aria-label="Ask a question, get an answer cited to the syllabus">
      <Dia x={54} y={44} cls="illo-float-a" />
      <Dia x={330} y={210} fill={TAN} s={0.8} cls="illo-float-c" />
      {/* knowledge base */}
      <Disc x={190} y={170} r={56} d={22} top={SKY} />
      <Disc x={190} y={210} r={56} d={22} top={PALE} />
      {/* question tag descending */}
      <Tag x={44} y={58} w={148} text="WHY DOESN'T KEQ CHANGE?" fill="#fff" />
      <Connector d="M118 78 Q136 110 158 138" />
      {/* answer rising with citation */}
      <Connector d="M228 138 Q252 104 268 84" />
      <Tag x={222} y={52} w={120} text="ANSWER · CITED" fill={SKY} />
      <Tag x={244} y={76} w={98} text="CH12-12 · Q21" />
      {/* orbiting wireframe cube */}
      <IsoBox x={64} y={186} a={20} b={20} d={17} dashed cls="illo-float-b" />
      <IsoBox x={296} y={160} a={18} b={18} d={15} top={BLUE} right={PALE} cls="illo-float-a" />
    </svg>
  );
}

/* ── Voice: sound bars pulsing into the base ── */
export function IlloVoice() {
  return (
    <svg viewBox="0 0 340 220" className="illo" role="img" aria-label="Voice session with the tutor">
      <Dia x={300} y={44} cls="illo-float-a" />
      <Dia x={36} y={60} fill={TAN} s={0.8} cls="illo-float-b" />
      {/* equaliser bars, iso */}
      <IsoBox x={62} y={104} a={13} b={13} d={22} top={SKY} cls="wavebox-1" />
      <IsoBox x={96} y={84} a={13} b={13} d={48} top={BLUE} right={SKY} cls="wavebox-2" />
      <IsoBox x={130} y={96} a={13} b={13} d={32} top={SKY} cls="wavebox-3" />
      <IsoBox x={164} y={110} a={13} b={13} d={16} top={PALE} cls="wavebox-1" />
      <Tag x={52} y={182} w={132} text="VOICE SESSION · 04:32" />
      {/* listening base */}
      <Disc x={262} y={120} r={44} d={18} top={SKY} />
      <Connector d="M196 128 Q222 124 216 124" />
      <Connector d="M188 132 L216 128" />
      <Tag x={222} y={62} w={80} text="LISTENING" fill="#fff" />
      <Connector d="M262 84 L262 96" />
    </svg>
  );
}
