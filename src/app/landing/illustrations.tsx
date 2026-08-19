/* Custom flat illustrations — undraw-style, in Cram's palette.
   Shared recipe: skin #e3b291, hair/dark #40342b, blues #2777c2 / #7db3e0 / #f0f6fc,
   ground ellipse #f3efe9. Faceless, no outlines, simple geometry. */

const INK = "#40342b";
const SKIN = "#e3b291";
const BLUE = "#2777c2";
const SKY = "#7db3e0";
const PALE = "#f0f6fc";
const LINE = "#d9e7f4";
const GROUND = "#f3efe9";

function Doc({ x, y, r = 0, w = 46, h = 58, cls = "" }: { x: number; y: number; r?: number; w?: number; h?: number; cls?: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r})`} className={cls}>
      <rect width={w} height={h} rx="6" fill="#fff" stroke={LINE} strokeWidth="1.5" />
      <rect x={w * 0.17} y={h * 0.19} width={w * 0.66} height="4" rx="2" fill={SKY} />
      <rect x={w * 0.17} y={h * 0.38} width={w * 0.5} height="4" rx="2" fill={LINE} />
      <rect x={w * 0.17} y={h * 0.57} width={w * 0.58} height="4" rx="2" fill={LINE} />
    </g>
  );
}

/* 1 — Everyone contributes: student at a desk, papers floating up into a shared stack */
export function IlloContribute() {
  return (
    <svg viewBox="0 0 400 300" className="illo" role="img" aria-label="A student at a laptop adding notes to a shared pile">
      <ellipse cx="200" cy="272" rx="168" ry="13" fill={GROUND} />
      {/* floating docs drifting to the stack */}
      <Doc x={64} y={54} r={-10} cls="illo-float-a" />
      <Doc x={150} y={26} r={4} cls="illo-float-b" />
      <g className="illo-float-c">
        <circle cx="262" cy="66" r="15" fill={PALE} />
        <path d="M262 74 v-15 m0 0 l-5.5 5.5 m5.5 -5.5 l5.5 5.5" stroke={BLUE} strokeWidth="3" strokeLinecap="round" fill="none" />
      </g>
      {/* the shared stack */}
      <g>
        <rect x="290" y="216" width="74" height="14" rx="6" fill={INK} />
        <rect x="296" y="200" width="62" height="14" rx="6" fill={BLUE} />
        <rect x="302" y="184" width="50" height="14" rx="6" fill={SKY} />
        <rect x="308" y="168" width="38" height="14" rx="6" fill={PALE} />
      </g>
      {/* desk */}
      <rect x="60" y="196" width="196" height="10" rx="5" fill={INK} />
      <rect x="74" y="206" width="8" height="64" rx="4" fill={INK} opacity="0.85" />
      <rect x="234" y="206" width="8" height="64" rx="4" fill={INK} opacity="0.85" />
      {/* laptop (back of screen faces viewer) */}
      <rect x="96" y="146" width="66" height="46" rx="6" fill={BLUE} />
      <circle cx="129" cy="169" r="6" fill={SKY} />
      <rect x="90" y="190" width="78" height="7" rx="3.5" fill={INK} />
      {/* seated student, side view, typing */}
      <circle cx="208" cy="118" r="15" fill={SKIN} />
      <path d="M193 116 a15 15 0 0 1 26 -9 q4 8 -2 8 q-14 -3 -20 4 z" fill={INK} />
      <rect x="188" y="132" width="38" height="50" rx="15" fill={SKY} />
      <rect x="168" y="146" width="42" height="10" rx="5" fill={SKY} transform="rotate(14 168 146)" />
      <circle cx="172" cy="158" r="5.5" fill={SKIN} />
      {/* legs + stool */}
      <rect x="192" y="178" width="34" height="12" rx="6" fill={INK} />
      <rect x="188" y="186" width="12" height="50" rx="6" fill={INK} />
      <rect x="214" y="196" width="10" height="52" rx="5" fill="#2b2119" />
      <rect x="206" y="236" width="30" height="34" rx="6" fill="none" />
      <rect x="222" y="188" width="8" height="80" rx="4" fill="#c9c2b8" />
    </svg>
  );
}

/* 2 — The best rises: podium of documents, winner has the star, hands voting up */
export function IlloRise() {
  return (
    <svg viewBox="0 0 400 300" className="illo" role="img" aria-label="Documents ranked on a podium, the most useful one first">
      <ellipse cx="200" cy="272" rx="168" ry="13" fill={GROUND} />
      {/* podium */}
      <rect x="70" y="212" width="80" height="46" rx="6" fill={PALE} />
      <rect x="160" y="184" width="80" height="74" rx="6" fill={SKY} />
      <rect x="250" y="228" width="80" height="30" rx="6" fill={PALE} />
      <text x="110" y="242" textAnchor="middle" fontSize="18" fontWeight="700" fill={BLUE} fontFamily="system-ui">2</text>
      <text x="200" y="226" textAnchor="middle" fontSize="18" fontWeight="700" fill="#fff" fontFamily="system-ui">1</text>
      <text x="290" y="250" textAnchor="middle" fontSize="18" fontWeight="700" fill={BLUE} fontFamily="system-ui">3</text>
      {/* docs on podium */}
      <Doc x={87} y={148} r={-4} />
      <g className="illo-float-b"><Doc x={177} y={112} w={50} h={64} /></g>
      <Doc x={268} y={166} r={5} />
      {/* winner's star */}
      <g className="illo-float-a">
        <circle cx="238" cy="104" r="15" fill={BLUE} />
        <path d="M238 96.5 l2.4 5 5.4 .7 -3.9 3.8 .9 5.4 -4.8 -2.6 -4.8 2.6 .9 -5.4 -3.9 -3.8 5.4 -.7 z" fill="#fff" />
      </g>
      {/* upvote hands */}
      <g transform="translate(48 96)">
        <rect x="0" y="18" width="12" height="26" rx="6" fill={SKIN} />
        <path d="M6 20 v-12 m0 0 l-5 5 m5 -5 l5 5" stroke={BLUE} strokeWidth="3.5" strokeLinecap="round" fill="none" />
      </g>
      <g transform="translate(338 120)">
        <rect x="0" y="18" width="12" height="26" rx="6" fill={SKIN} />
        <path d="M6 20 v-12 m0 0 l-5 5 m5 -5 l5 5" stroke={BLUE} strokeWidth="3.5" strokeLinecap="round" fill="none" />
      </g>
    </svg>
  );
}

/* 3 — Every year starts ahead: graduate handing the stack down to a younger student */
export function IlloLegacy() {
  return (
    <svg viewBox="0 0 400 300" className="illo" role="img" aria-label="A graduating student handing their notes to a younger student">
      <ellipse cx="200" cy="272" rx="168" ry="13" fill={GROUND} />
      {/* graduate (left, taller) */}
      <g>
        <circle cx="120" cy="96" r="16" fill={SKIN} />
        {/* grad cap */}
        <rect x="98" y="76" width="44" height="8" rx="3" fill={INK} transform="rotate(-4 120 80)" />
        <rect x="112" y="66" width="16" height="12" rx="2" fill={INK} />
        <circle cx="142" cy="82" r="3" fill={BLUE} />
        <rect x="141" y="82" width="2.5" height="16" rx="1" fill={BLUE} />
        {/* body */}
        <rect x="100" y="114" width="40" height="66" rx="16" fill={INK} />
        {/* arm extending right with stack */}
        <rect x="130" y="128" width="52" height="11" rx="5.5" fill={INK} />
        <circle cx="184" cy="133" r="6" fill={SKIN} />
        {/* legs */}
        <rect x="104" y="178" width="13" height="80" rx="6.5" fill="#2b2119" />
        <rect x="123" y="178" width="13" height="80" rx="6.5" fill="#2b2119" />
        <rect x="100" y="252" width="22" height="9" rx="4.5" fill={INK} />
        <rect x="120" y="252" width="22" height="9" rx="4.5" fill={INK} />
      </g>
      {/* the handed-down stack, mid-air between them */}
      <g className="illo-float-b">
        <rect x="176" y="106" width="52" height="11" rx="5" fill={SKY} />
        <rect x="180" y="94" width="44" height="11" rx="5" fill={BLUE} />
        <rect x="184" y="82" width="36" height="11" rx="5" fill={PALE} />
      </g>
      {/* younger student (right, shorter, reaching up) */}
      <g>
        <circle cx="272" cy="140" r="14" fill={SKIN} />
        <path d="M258 138 a14 14 0 0 1 24 -8 q4 7 -2 7 q-12 -3 -18 4 z" fill={INK} />
        <rect x="256" y="156" width="34" height="52" rx="14" fill={BLUE} />
        {/* arm reaching up-left */}
        <rect x="228" y="122" width="44" height="10" rx="5" fill={BLUE} transform="rotate(28 228 122)" />
        <circle cx="234" cy="128" r="5.5" fill={SKIN} />
        {/* legs */}
        <rect x="259" y="206" width="12" height="56" rx="6" fill="#2b2119" />
        <rect x="276" y="206" width="12" height="56" rx="6" fill="#2b2119" />
        <rect x="255" y="254" width="20" height="8" rx="4" fill={INK} />
        <rect x="273" y="254" width="20" height="8" rx="4" fill={INK} />
      </g>
      {/* small motion arcs */}
      <path d="M156 70 q30 -18 66 -4" stroke={LINE} strokeWidth="2.5" strokeDasharray="2 7" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/* 4 — Ask the AI: student chatting with the orb, cited answer coming back */
export function IlloAsk() {
  return (
    <svg viewBox="0 0 400 300" className="illo" role="img" aria-label="A student asking a question and getting a cited answer">
      <ellipse cx="200" cy="272" rx="168" ry="13" fill={GROUND} />
      {/* student sitting cross-legged with phone */}
      <g>
        <circle cx="120" cy="150" r="16" fill={SKIN} />
        <path d="M104 148 a16 16 0 0 1 28 -10 q5 9 -2 9 q-15 -4 -22 5 z" fill={INK} />
        <rect x="98" y="168" width="44" height="52" rx="17" fill={SKY} />
        {/* crossed legs */}
        <rect x="86" y="214" width="54" height="13" rx="6.5" fill="#2b2119" />
        <rect x="98" y="226" width="54" height="13" rx="6.5" fill="#2b2119" transform="rotate(-6 98 226)" />
        {/* arms holding phone */}
        <rect x="128" y="182" width="34" height="9" rx="4.5" fill={SKY} transform="rotate(-18 128 182)" />
        <rect x="152" y="160" width="18" height="30" rx="4" fill={INK} />
        <rect x="154.5" y="163" width="13" height="21" rx="2" fill={PALE} />
      </g>
      {/* the orb */}
      <g className="illo-float-a">
        <circle cx="278" cy="104" r="26" fill={BLUE} />
        <circle cx="270" cy="96" r="9" fill={SKY} opacity="0.85" />
        <circle cx="278" cy="104" r="36" fill="none" stroke={LINE} strokeWidth="2" strokeDasharray="3 8" />
      </g>
      {/* question bubble from student */}
      <g className="illo-float-c">
        <rect x="160" y="96" width="86" height="30" rx="14" fill="#fff" stroke={LINE} strokeWidth="1.5" />
        <path d="M176 126 l-6 10 12 -8 z" fill="#fff" stroke={LINE} strokeWidth="1.5" />
        <rect x="172" y="106" width="46" height="4.5" rx="2.25" fill={INK} opacity="0.8" />
        <rect x="172" y="114" width="30" height="4.5" rx="2.25" fill={LINE} />
      </g>
      {/* answer bubble from orb, with citation chip */}
      <g className="illo-float-b">
        <rect x="238" y="152" width="112" height="52" rx="14" fill={PALE} />
        <path d="M266 152 l4 -10 8 10 z" fill={PALE} />
        <rect x="250" y="164" width="80" height="4.5" rx="2.25" fill={BLUE} opacity="0.85" />
        <rect x="250" y="173" width="64" height="4.5" rx="2.25" fill={SKY} />
        <rect x="250" y="186" width="52" height="11" rx="5.5" fill="#fff" />
        <rect x="256" y="189.5" width="40" height="4" rx="2" fill={BLUE} opacity="0.7" />
      </g>
    </svg>
  );
}

/* 5 — Voice: headphones student speaking with sound waves to the orb */
export function IlloVoice() {
  return (
    <svg viewBox="0 0 400 220" className="illo" role="img" aria-label="A student practising a speaking exam with the voice tutor">
      <ellipse cx="200" cy="196" rx="150" ry="11" fill={GROUND} />
      {/* student head + headphones */}
      <g>
        <circle cx="120" cy="110" r="24" fill={SKIN} />
        <path d="M96 106 a24 24 0 0 1 42 -15 q7 13 -3 13 q-22 -5 -33 8 z" fill={INK} />
        <path d="M94 108 a26 26 0 0 1 52 0" fill="none" stroke={BLUE} strokeWidth="6" strokeLinecap="round" />
        <rect x="88" y="104" width="11" height="20" rx="5.5" fill={BLUE} />
        <rect x="141" y="104" width="11" height="20" rx="5.5" fill={BLUE} />
        <rect x="102" y="136" width="38" height="40" rx="15" fill={SKY} />
      </g>
      {/* sound waves */}
      <path d="M170 110 q8 0 8 0" stroke={SKY} strokeWidth="4" strokeLinecap="round" className="wave-1" />
      <path d="M186 102 q0 8 0 16" stroke={SKY} strokeWidth="4" strokeLinecap="round" fill="none" className="wave-1" />
      <path d="M202 94 q0 16 0 32" stroke={BLUE} strokeWidth="4" strokeLinecap="round" fill="none" className="wave-2" />
      <path d="M218 100 q0 10 0 20" stroke={SKY} strokeWidth="4" strokeLinecap="round" fill="none" className="wave-3" />
      {/* orb listening */}
      <g className="illo-float-a">
        <circle cx="286" cy="110" r="30" fill={BLUE} />
        <circle cx="277" cy="101" r="10" fill={SKY} opacity="0.85" />
        <circle cx="286" cy="110" r="41" fill="none" stroke={LINE} strokeWidth="2" strokeDasharray="3 8" />
      </g>
    </svg>
  );
}

/* 6 — Leaderboard: High climbing to the top (why section) */
export function IlloPodiumRace() {
  return (
    <svg viewBox="0 0 400 260" className="illo" role="img" aria-label="School rankings with High climbing to first">
      <ellipse cx="200" cy="240" rx="160" ry="12" fill={GROUND} />
      {/* bars */}
      <rect x="76" y="150" width="56" height="84" rx="8" fill={PALE} />
      <rect x="172" y="96" width="56" height="138" rx="8" fill={BLUE} className="grow-bar" />
      <rect x="268" y="170" width="56" height="64" rx="8" fill={PALE} />
      {/* flag on the winner */}
      <rect x="198" y="58" width="3" height="40" rx="1.5" fill={INK} />
      <path d="M201 60 h30 l-8 8 8 8 h-30 z" fill={SKY} />
      {/* tiny climbing figure on the winner bar */}
      <g>
        <circle cx="160" cy="132" r="9" fill={SKIN} />
        <path d="M151 130 a9 9 0 0 1 16 -5 q3 5 -1.5 5 q-8 -2 -12 3 z" fill={INK} />
        <rect x="151" y="142" width="19" height="30" rx="8" fill={SKY} />
        <rect x="162" y="120" width="26" height="7" rx="3.5" fill={SKY} transform="rotate(-32 162 120)" />
        <rect x="150" y="170" width="8" height="30" rx="4" fill="#2b2119" transform="rotate(14 150 170)" />
        <rect x="162" y="170" width="8" height="26" rx="4" fill="#2b2119" transform="rotate(-18 162 170)" />
      </g>
      <text x="104" y="212" textAnchor="middle" fontSize="15" fontWeight="700" fill={BLUE} fontFamily="system-ui">2</text>
      <text x="200" y="212" textAnchor="middle" fontSize="15" fontWeight="700" fill="#fff" fontFamily="system-ui">1</text>
      <text x="296" y="212" textAnchor="middle" fontSize="15" fontWeight="700" fill={BLUE} fontFamily="system-ui">3</text>
    </svg>
  );
}
