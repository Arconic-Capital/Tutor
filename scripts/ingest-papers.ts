/* Ingest official NESA material: for each seeded per-year exam-pack page,
   find its PDFs, download, extract text, and store in `documents`.
   PDFs are never re-hosted — text only, to power the tutor/predictor/marker. */
import "dotenv/config";
import { PDFParse } from "pdf-parse";
import { db } from "../src/db";
import { resources, documents } from "../src/db/schema";
import { isNotNull, and, eq, like } from "drizzle-orm";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Cram-ingest/1.0";
const MAX_PDF_BYTES = 30 * 1024 * 1024;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

function findPdfLinks(html: string, baseUrl: string): { href: string; label: string }[] {
  const out: { href: string; label: string }[] = [];
  const re = /<a[^>]+href="([^"]+\.pdf[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html))) {
    const href = new URL(m[1], baseUrl).toString();
    const label = m[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim().slice(0, 200);
    if (!out.some((o) => o.href === href)) out.push({ href, label });
  }
  return out;
}

function classify(label: string, href: string): string {
  const s = (label + " " + href).toLowerCase();
  if (s.includes("marking") || s.includes("guidelines")) return "guidelines_pdf";
  return "exam_pdf";
}

async function main() {
  // per-year pack pages only (year set, nsw.gov.au exam-paper URLs)
  const packs = await db
    .select()
    .from(resources)
    .where(and(eq(resources.kind, "link"), isNotNull(resources.year), like(resources.url, "%nsw.gov.au%hsc-exam-papers%")));

  const existing = new Set((await db.select({ u: documents.sourceUrl }).from(documents)).map((r) => r.u));
  console.log(`${packs.length} pack pages · ${existing.size} documents already ingested`);

  let pdfsDone = 0, pdfsSkipped = 0, errors = 0;
  for (const pack of packs) {
    if (!pack.url) continue;
    try {
      const html = await fetchText(pack.url);
      const links = findPdfLinks(html, pack.url);
      for (const { href, label } of links) {
        if (existing.has(href)) { pdfsSkipped++; continue; }
        try {
          const res = await fetch(href, { headers: { "User-Agent": UA } });
          if (!res.ok) throw new Error(`${res.status}`);
          const buf = Buffer.from(await res.arrayBuffer());
          if (buf.length > MAX_PDF_BYTES) throw new Error(`too large: ${buf.length}`);
          const parser = new PDFParse({ data: new Uint8Array(buf) });
          const parsed = await parser.getText();
          await parser.destroy();
          const text = parsed.text.replace(/\u00a0/g, " ").trim();
          if (text.length < 200) throw new Error(`extracted only ${text.length} chars`);
          await db.insert(documents).values({
            resourceId: pack.id,
            title: label || `${pack.title} (PDF)`,
            kind: classify(label, href),
            sourceUrl: href,
            text,
            textLength: text.length,
          });
          existing.add(href);
          pdfsDone++;
          console.log(`✓ ${pack.courseId} ${pack.year} · ${classify(label, href)} · ${text.length} chars · ${label.slice(0, 60)}`);
        } catch (e) {
          errors++;
          console.warn(`✗ pdf ${href}: ${(e as Error).message}`);
        }
        await sleep(400);
      }
      // page text (marker feedback lives in the HTML)
      const pageKey = pack.url + "#page";
      if (!existing.has(pageKey)) {
        const body = html
          .replace(/<script[\s\S]*?<\/script>/gi, " ")
          .replace(/<style[\s\S]*?<\/style>/gi, " ")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        if (body.length > 500) {
          await db.insert(documents).values({
            resourceId: pack.id,
            title: `${pack.title} — page notes & marker feedback`,
            kind: "page_text",
            sourceUrl: pageKey,
            text: body.slice(0, 400_000),
            textLength: Math.min(body.length, 400_000),
          });
          existing.add(pageKey);
        }
      }
    } catch (e) {
      errors++;
      console.warn(`✗ pack ${pack.url}: ${(e as Error).message}`);
    }
    await sleep(400);
  }
  console.log(`DONE · ${pdfsDone} PDFs ingested · ${pdfsSkipped} already had · ${errors} errors`);
  process.exit(0);
}

main();
