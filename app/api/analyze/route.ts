export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { defaultTemplates } from "@/lib/jd-templates"
import { isSimilarSkill, isRelatedSkill, findSkillInOntology, TAG_ONTOLOGY } from "@/lib/skill-ontology"
import { AgentOrchestrator, type AgentContext } from "@/lib/ai-agents"

// === PDF helpers (permanent fix) ===

// Always give pdf.js a Uint8Array (not Buffer/ArrayBuffer/string)
function asUint8(input: any): Uint8Array {
  if (input instanceof Uint8Array) return input;
  // @ts-ignore
  if (typeof Buffer !== "undefined" && Buffer.isBuffer?.(input)) {
    // view on the same memory — no copy
    // @ts-ignore
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  }
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  if (ArrayBuffer.isView(input)) {
    const v = input as ArrayBufferView;
    return new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
  }
  if (typeof input === "string") {
    // base64 support (if ever passed)
    // @ts-ignore
    const buf = typeof Buffer !== "undefined" ? Buffer.from(input, "base64") : Uint8Array.from(atob(input), c => c.charCodeAt(0));
    // @ts-ignore
    return buf instanceof Uint8Array ? buf : new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  }
  throw new Error("Unsupported input for PDF data.");
}

// Load pdf.js in a way that works with both v3 (legacy path) and v4 (main)
async function loadPdfjs() {
  try {
    // v3 preferred
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const mod = await import("pdfjs-dist/legacy/build/pdf.js");
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    mod.GlobalWorkerOptions.workerSrc = undefined; // disable worker in Node
    return mod as any;
  } catch {
    // v4 fallback
    const modAny: any = (await import("pdfjs-dist")).default ?? (await import("pdfjs-dist"));
    modAny.GlobalWorkerOptions.workerSrc = undefined; // disable worker in Node
    return modAny;
  }
}

function normalizeUrl(u: string) {
  if (!u) return u as any;
  let x = u.trim();
  if (x.startsWith("www.")) x = "https://" + x;
  return x.replace(/[),.]+$/g, "");
}

// --- LINKEDIN: constants + canonicalizer (ADD AFTER normalizeUrl) ---
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36";

const LINKEDIN_HOST = "linkedin.com";
const SNAPSHOT_BASE = process.env.LINKEDIN_SNAPSHOT_ENDPOINT?.replace(/\/+$/,"")
  || "https://r.jina.ai";

export function normalizeLinkedInUrl(input: string): string | null {
  try {
    if (!input) return null;
    let raw = input.trim();
    if (!/^https?:\/\//i.test(raw)) raw = "https://" + raw.replace(/^www\./i, "");
    const u = new URL(raw);
    if (!u.hostname.endsWith(LINKEDIN_HOST)) return null;

    u.hash = "";
    u.search = "";

    // accept: /in/<slug> or /pub/<slug> (optionally with locale/mwlite)
    const m = u.pathname.replace(/\/+$/,"")
      .match(/^\/(?:[a-z]{2,3}-?[A-Z]{0,2}\/)?(?:mwlite\/)?(?:in|pub)\/([^\/?#]+)/i);
    if (!m?.[1]) return null;

    const slug = decodeURIComponent(m[1]).toLowerCase();
    return `https://www.${LINKEDIN_HOST}/in/${slug}`;
  } catch {
    return null;
  }
}



export function isLinkedInProfileUrl(u: string): boolean {
  return !!normalizeLinkedInUrl(u);
}


export async function fetchLinkedInSnapshot(
  canonUrl: string,
  timeoutMs = 15000
): Promise<string | null> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${SNAPSHOT_BASE}/${canonUrl}`, {
      method: "GET",
      headers: {
        "Accept": "text/plain",
        "User-Agent": UA,
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
      },
      cache: "no-store",
      signal: controller.signal as any,
    });
    if (!res.ok) return null;
    const txt = (await res.text()).trim();
    if (
      !txt ||
      txt.length < 400 || // treat tiny pages as blocked
      /sign in|join linkedin|you're signed out|sign in to view/i.test(txt)
    ) return null;
    return txt;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function stripTagsToText(htmlOrText: string): string {
  const raw = htmlOrText || "";
  const looksHtml = /<html|<head|<\/\w+>|<meta|<title/i.test(raw);
  if (!looksHtml) return raw;
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "\n")
    .replace(/\u00A0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

export function parseLinkedInSnapshot(textOrHtml: string) {
  const out = {
    headline: "",
    description: "",
    location: "",
    skills: [] as string[],
    experience: [] as Array<{ company?: string; title?: string; description?: string }>,
    education: [] as Array<{ school?: string; degree?: string }>,
  };
  const text = stripTagsToText(textOrHtml);
  if (!text) return out;

  // Headline: use first strong line, trim LinkedIn suffix
  const first = (text.split(/\r?\n/).map(s => s.trim()).find(Boolean) || "");
  out.headline = first.replace(/\s*\|\s*LinkedIn.*$/i, "").trim();

  // About/Summary
  const about = /(?:^|\n)\s*(About|Summary)\s*\n([\s\S]{0,2000})/i.exec(text)?.[2] || "";
  if (about) {
    out.description = about
      .split(/\n\s*(Activity|Experience|Education|Licenses|Skills|Projects|Certifications)\b/i)[0]
      .replace(/\n{2,}/g, "\n")
      .trim();
  }

  // Location
  const loc = /\bLocation\s*[:\-]\s*([^\n]+)/i.exec(text)?.[1]
        || /\bBased in\s*[:\-]?\s*([^\n]+)/i.exec(text)?.[1];
  if (loc) out.location = loc.trim();

  // Skills
  const skillsBlock = /(?:^|\n)\s*(Top skills|Skills)\s*\n([\s\S]{0,1500})/i.exec(text)?.[2] || "";
  if (skillsBlock) {
    out.skills = Array.from(new Set(
      skillsBlock.split(/[\n·|,\u2022]+/g)
        .map(s => s.trim())
        .filter(s => s && s.length <= 50 && !/^skills?$/i.test(s))
    )).slice(0, 50);
  }

  // Experience
  const expBlock = /(?:^|\n)\s*Experience\s*\n([\s\S]{0,4000})/i.exec(text)?.[1] || "";
  if (expBlock) {
    const lines = expBlock.split(/\r?\n/).map(s => s.trim()).filter(Boolean).slice(0, 250);
    let current: { title?: string; company?: string; description?: string } | null = null;
    const isTitleLine = (l: string) => /\bat\b/i.test(l) || /—|–|-/.test(l);
    for (const l of lines) {
      if (isTitleLine(l)) {
        if (current && (current.title || current.company || current.description)) out.experience.push(current);
        let title = l, company = "";
        const atSplit = l.split(/\bat\b/i);
        if (atSplit.length >= 2) {
          title = atSplit[0].trim().replace(/[—–-]\s*$/, "");
          company = atSplit.slice(1).join(" at ").trim();
        } else {
          const ds = l.split(/[—–-]/);
          if (ds.length >= 2) { title = ds[0].trim(); company = ds.slice(1).join(" - ").trim(); }
        }
        current = { title, company, description: "" };
      } else if (current) {
        if (!current.description) current.description = l;
        else if (current.description.length < 400) current.description += " " + l;
      }
    }
    if (current && (current.title || current.company || current.description)) out.experience.push(current);
    out.experience = out.experience.slice(0, 10);
  }

  // Education
  const eduBlock = /(?:^|\n)\s*Education\s*\n([\s\S]{0,2500})/i.exec(text)?.[1] || "";
  if (eduBlock) {
    const lines = eduBlock.split(/\r?\n/).map(s => s.trim()).filter(Boolean).slice(0, 120);
    for (const l of lines) {
      const parts = l.split(/[—–-]/);
      if (parts.length >= 2) out.education.push({ school: parts[0].trim(), degree: parts.slice(1).join(" - ").trim() });
      else if (/university|college|institute/i.test(l)) out.education.push({ school: l, degree: "" });
      if (out.education.length >= 6) break;
    }
  }
  return out;
}

export async function getLinkedInProfile(rawUrl: string) {
  const canon = normalizeLinkedInUrl(rawUrl);
  if (!canon) return null;

  const snap = await fetchLinkedInSnapshot(canon, 15000);
  if (!snap) {
    return {
      type: "linkedin",
      data: {
        username: canon.split("/in/")[1] || "",
        url: canon,
        blocked: true,
        headline: "",
        description: "",
        location: "",
        skills: [],
        experience: [],
        education: []
      }
    };
  }

  const parsed = parseLinkedInSnapshot(snap);
  return {
    type: "linkedin",
    data: {
      username: canon.split("/in/")[1] || "",
      url: canon,
      blocked: false,
      headline: parsed.headline || "",
      description: parsed.description || "",
      location: parsed.location || "",
      skills: parsed.skills || [],
      experience: parsed.experience || [],
      education: parsed.education || []
    }
  };
}


// Parse Jina snapshot (plain text or stripped HTML) deterministically (no LLM)
function parseLinkedInTextSnapshot(textOrHtml: string) {
  const out = {
    headline: "",
    description: "",
    location: "",
    skills: [] as string[],
    experience: [] as Array<{ company?: string; title?: string; description?: string }>,
    education: [] as Array<{ school?: string; degree?: string }>
  };

  const raw = (textOrHtml || "").trim();
  if (!raw) return out;

  const looksHtml = /<html|<head|<meta|<\/\w+>/.test(raw);
  const stripTags = (s: string) =>
    s.replace(/<script[\s\S]*?<\/script>/gi, "")
     .replace(/<style[\s\S]*?<\/style>/gi, "")
     .replace(/<[^>]+>/g, "\n")
     .replace(/\u00A0/g, " ")
     .replace(/[ \t]+\n/g, "\n")
     .replace(/\n{2,}/g, "\n")
     .trim();

  const text = looksHtml ? stripTags(raw) : raw;

  // Headline/title
  const firstLine = (text.split(/\r?\n/).map(s => s.trim()).find(Boolean) || "");
  out.headline = firstLine.replace(/\s*\|\s*LinkedIn.*$/i, "").trim();

  // About / Summary
  const about = /(?:^|\n)\s*(About|Summary)\s*\n([\s\S]{0,2000})/i.exec(text)?.[2] || "";
  if (about) {
    out.description = about
      .split(/\n\s*(Activity|Experience|Education|Licenses|Skills|Projects|Certifications)\b/i)[0]
      .replace(/\n{2,}/g, "\n")
      .trim();
  }

  // Location
  const loc = /\bLocation\s*[:\-]\s*([^\n]+)/i.exec(text)?.[1]
           || /\bBased in\s*[:\-]?\s*([^\n]+)/i.exec(text)?.[1];
  if (loc) out.location = loc.trim();

  // Skills
  const skillsBlock = /(?:^|\n)\s*(Top skills|Skills)\s*\n([\s\S]{0,1500})/i.exec(text)?.[2] || "";
  if (skillsBlock) {
    out.skills = Array.from(new Set(
      skillsBlock.split(/[\n·|,\u2022]+/g)
        .map(s => s.trim())
        .filter(s => s && s.length <= 50 && !/^skills?$/i.test(s))
    )).slice(0, 50);
  }

  // Experience
  const expBlock = /(?:^|\n)\s*Experience\s*\n([\s\S]{0,4000})/i.exec(text)?.[1] || "";
  if (expBlock) {
    const lines = expBlock.split(/\r?\n/).map(s => s.trim()).filter(Boolean).slice(0, 250);
    let current: { title?: string; company?: string; description?: string } | null = null;
    const isTitleLine = (l: string) => /\bat\b/i.test(l) || /—|–|-/.test(l);

    for (const l of lines) {
      if (isTitleLine(l)) {
        if (current && (current.title || current.company || current.description)) out.experience.push(current);
        let title = l, company = "";
        const atSplit = l.split(/\bat\b/i);
        if (atSplit.length >= 2) {
          title = atSplit[0].trim().replace(/[—–-]\s*$/, "");
          company = atSplit.slice(1).join(" at ").trim();
        } else {
          const ds = l.split(/[—–-]/);
          if (ds.length >= 2) { title = ds[0].trim(); company = ds.slice(1).join(" - ").trim(); }
        }
        current = { title, company, description: "" };
      } else if (current) {
        if (!current.description) current.description = l;
        else if (current.description.length < 400) current.description += " " + l;
      }
    }
    if (current && (current.title || current.company || current.description)) out.experience.push(current);
    out.experience = out.experience.slice(0, 10);
  }

  // Education
  const eduBlock = /(?:^|\n)\s*Education\s*\n([\s\S]{0,2500})/i.exec(text)?.[1] || "";
  if (eduBlock) {
    const lines = eduBlock.split(/\r?\n/).map(s => s.trim()).filter(Boolean).slice(0, 120);
    for (const l of lines) {
      const parts = l.split(/[—–-]/);
      if (parts.length >= 2) out.education.push({ school: parts[0].trim(), degree: parts.slice(1).join(" - ").trim() });
      else if (/university|college|institute/i.test(l)) out.education.push({ school: l, degree: "" });
      if (out.education.length >= 6) break;
    }
  }

  return out;
}


// Use direct URL (user-provided or extracted), normalize, fetch+parse
async function getLinkedInProfileDataDirect(rawUrl: string) {
  try {
    const canon = normalizeLinkedInUrl(rawUrl);
    if (!canon) {
      console.warn(`[LinkedIn] Invalid URL: ${rawUrl}`);
      return null;
    }

    // Fetch LinkedIn profile snapshot
    const text = await fetchLinkedInSnapshot(canon, 15000); // 15s timeout

    // If fetch failed or returned blocked/empty content
    if (!text) {
      return {
        type: "linkedin",
        data: {
          username: canon.split("/in/")[1] || "",
          url: canon,
          blocked: true,
          headline: "",
          description: "",
          location: "",
          skills: [],
          experience: [],
          education: []
        }
      };
    }

    // Parse the snapshot
    const parsed = parseLinkedInTextSnapshot(text);

    // Return structured profile data
    return {
      type: "linkedin",
      data: {
        username: canon.split("/in/")[1] || "",
        url: canon,
        blocked: false,
        headline: parsed.headline || "",
        description: parsed.description || "",
        location: parsed.location || "",
        skills: Array.isArray(parsed.skills) ? parsed.skills : [],
        experience: Array.isArray(parsed.experience) ? parsed.experience : [],
        education: Array.isArray(parsed.education) ? parsed.education : []
      }
    };
  } catch (error: any) {
    console.error(`[LinkedIn] Error processing profile ${rawUrl}:`, error?.message || error);
    // Return minimal profile data on error
    const canon = normalizeLinkedInUrl(rawUrl);
    return canon ? {
      type: "linkedin",
      data: {
        username: canon.split("/in/")[1] || "",
        url: canon,
        blocked: true,
        headline: "",
        description: "",
        location: "",
        skills: [],
        experience: [],
        education: []
      }
    } : null;
  }
}


// Extract LinkedIn profile urls from free text (even if protocol-less or just username lines)
export function extractLinkedInFromText(text: string): string[] {
  const out = new Set<string>();
  if (!text) return [];

  // 1) Any linkedin URL variants that already include /in or /pub
  const urlLike = text.match(/(?:https?:\/\/)?(?:[\w-]+\.)?linkedin\.com\/(?:mwlite\/)?(?:in|pub)\/[A-Za-z0-9\-_%]+/gi) || [];
  for (const raw of urlLike) {
    const norm = normalizeLinkedInUrl(raw);
    if (norm) out.add(norm);
  }

  // 2) Lines like: "LinkedIn: jane-doe-123" or "LinkedIn – @jane-doe"
  const usernameLike = text.match(/(?:linkedin|linked\s*in)\s*[:\-–—]\s*@?([A-Za-z0-9](?:[A-Za-z0-9\-]{1,38})?)/gi) || [];
  for (const m of usernameLike) {
    const g = /[:\-–—]\s*@?([A-Za-z0-9](?:[A-Za-z0-9\-]{1,38})?)/i.exec(m);
    const user = g?.[1]?.trim();
    if (user) {
      const norm = normalizeLinkedInUrl(`https://linkedin.com/in/${user}`);
      if (norm) out.add(norm);
    }
  }

  return Array.from(out);
}



type JobRequirements = {
  jobTitle: string
  jobDescription: string
  requiredSkills: string[]
  minimumExperience: number
  educationLevel: string
}

type Candidate = {
  id: string
  name: string
  email: string
  phone: string
  location: string
  currentTitle: string
  yearsOfExperience: number
  educationLevel: string
  matchScore: number
  matchedSkills: string[]
  inferredSkills: string[]
  additionalSkills: string[]
  experience: Array<{
    title: string
    company: string
    period: string
    description: string
  }>
  aiAnalysis: string
  experiencePointsAvg?: number
  experiencePointsTotal?: number
  experienceImpactBonus?: number
  experienceHelpful?: boolean
  experienceMatchedSkills?: string[]
  experienceAnalysis?: string
  projects?: Array<{ title: string; description: string; helpfulness?: string; points?: number }>
  projectAnalysis?: string
  projectPoints?: number
  profileLinks?: Array<{ url: string; label?: string }>
  profileAnalysis?: string
  profilePoints?: number
  profilesWithAnalysis?: Array<{ url: string; type: string; data: any; points: number; analysis: string; details: string; matchedSkills?: string[]; contributionPoints?: number }>
  linkedInUrl?: string | null // LinkedIn URL for async analysis
  checklist?: Array<{
    id: string
    text: string
    must: boolean
    passed: boolean
    coverage: number
    matchedTags: string[]
    missingTags: string[]
    confidence?: number
    veryMustOk?: boolean
  }>
}

// export const runtime = "nodejs"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Rate limit tracking to avoid repeated failures
let lastRateLimitTime = 0
let consecutiveRateLimits = 0
const RATE_LIMIT_COOLDOWN = 60000 // 1 minute cooldown after rate limit
const MAX_CONSECUTIVE_RATE_LIMITS = 3 // After 3, skip AI for a while

function checkRateLimitCooldown(): boolean {
  const now = Date.now()
  if (now - lastRateLimitTime < RATE_LIMIT_COOLDOWN) {
    return false // Still in cooldown
  }
  return true // Can proceed
}

function recordRateLimit() {
  lastRateLimitTime = Date.now()
  consecutiveRateLimits++
  if (consecutiveRateLimits >= MAX_CONSECUTIVE_RATE_LIMITS) {
    console.warn(`Too many rate limits (${consecutiveRateLimits}), skipping AI calls for ${RATE_LIMIT_COOLDOWN / 1000}s`)
  }
}

function recordSuccess() {
  consecutiveRateLimits = 0 // Reset on success
}

// Comprehensive JSON cleaning utility
function cleanJsonString(jsonStr: string): string {
  // Remove trailing commas before } or ]
  jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1')
  
  // Fix unquoted keys (common in malformed JSON)
  jsonStr = jsonStr.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')
  
  // Convert single quotes to double quotes (but be careful with apostrophes)
  jsonStr = jsonStr.replace(/([{,]\s*)'/g, '$1"').replace(/':/g, '":').replace(/',/g, '",').replace(/'(\s*[}\]])/g, '"$1')
  
  // Remove comments
  jsonStr = jsonStr.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
  
  // Fix incomplete string values at end of lines
  jsonStr = jsonStr.replace(/:\s*"([^"]*?)$/gm, ': ""')
  
  // Remove extra commas in arrays
  jsonStr = jsonStr.replace(/,\s*,/g, ',')
  
  // Try to close unclosed strings (basic attempt)
  const openQuotes = (jsonStr.match(/"/g) || []).length
  if (openQuotes % 2 !== 0) {
    // Odd number of quotes, try to fix last one
    const lastQuoteIndex = jsonStr.lastIndexOf('"')
    if (lastQuoteIndex !== -1) {
      const afterLastQuote = jsonStr.substring(lastQuoteIndex + 1).trim()
      if (afterLastQuote && !afterLastQuote.match(/^[,}\]]/)) {
        jsonStr = jsonStr + '"'
      }
    }
  }
  
  return jsonStr
}

interface ExtractedContent {
  text: string
  links: Array<{ text: string; url: string }>
}

async function extractTextFromPdf(buffer: Buffer | Uint8Array): Promise<ExtractedContent> {
  const links: Array<{ text: string; url: string }> = [];
  const seen = new Set<string>();
  let text = "";
  const data = asUint8(buffer);

  // METHOD 1: Use pdf-lib to extract hyperlinks from annotations (/Annots → /A → /URI)
  try {
    const { PDFDocument, PDFName, PDFArray, PDFDict, PDFString, PDFHexString } = await import("pdf-lib");
    const uint8 = data;
    const pdfDoc = await PDFDocument.load(uint8);
    const pages = pdfDoc.getPages();

    const decodePdfString = (val: any): string => {
      try {
        if (val instanceof PDFString || val instanceof PDFHexString) {
          // @ts-ignore
          return val.decodeText ? val.decodeText() : String(val);
        }
        return String(val);
      } catch {
        return "";
      }
    };

    for (const page of pages) {
      const annotsRef = page.node.get(PDFName.of("Annots"));
      if (!annotsRef) continue;

      const annots = pdfDoc.context.lookup(annotsRef, PDFArray) as any;
      const size = annots?.size?.() ?? 0;

      for (let i = 0; i < size; i++) {
        const annotRef = annots.get(i);
        const annot = pdfDoc.context.lookup(annotRef, PDFDict) as any;
        const subtype = annot.get(PDFName.of("Subtype"));
        if (!subtype || String(subtype) !== "/Link") continue;

        // Action dict
        const A = annot.get(PDFName.of("A"));
        if (!A) continue;

        const action = pdfDoc.context.lookup(A, PDFDict) as any;
        const uriObj = action.get(PDFName.of("URI"));
        const raw = uriObj ? decodePdfString(uriObj) : "";

        let url = normalizeUrl(raw);
        if (!url) continue;

        try {
          const uobj = new URL(url);
          const norm = uobj.toString();
          if (!seen.has(norm)) {
            seen.add(norm);
            links.push({ text: "", url: norm });
          }
        } catch {
          /* skip invalid */
        }
      }
    }
  } catch (e: any) {
    console.warn("pdf-lib annotation parse failed:", e?.message || e);
  }

  // METHOD 2: Use pdfjs-dist for PRIMARY text extraction (for skills, checklist, experience)
  // This replaces pdf2json and uses pdfjs-dist for all text-based analysis
  try {
    const pdfjsLib = await loadPdfjs();
    const loadingTask = pdfjsLib.getDocument({
      data,
      disableWorker: true,
      useWorkerFetch: false,
      isEvalSupported: false,
      disableFontFace: true,
      verbosity: 0,
      cMapUrl: undefined,
      standardFontDataUrl: undefined,
    });

    const pdfDocument = await loadingTask.promise;
    const numPages = pdfDocument.numPages;
    const textLines: string[] = [];

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1 });
      const Util = (pdfjsLib as any).Util || (pdfjsLib as any).default?.Util;

      // Extract text content for skills, checklist, experience (PRIMARY text extraction)
      let itemsWithRects: Array<{ str: string; rect: [number, number, number, number] }> = [];
      try {
        const tc = await page.getTextContent({ includeMarkedContent: true });
        const pageText = tc.items.map((i: any) => i.str).join(" ");
        textLines.push(pageText);

        // Also store text with rectangles for link label matching (per page)
        if (Util) {
          itemsWithRects = (tc.items as any[]).map((it: any) => {
            const tx = Util.transform(viewport.transform, it.transform);
            const x = tx[4];
            const y = tx[5];
            const w = it.width || 0;
            const h = it.height || Math.abs(it.transform?.[3] || 0);
            const rect: [number, number, number, number] = [x, y - h, x + w, y];
            return { str: String(it.str || ""), rect };
          });
        }
      } catch {}

      // METHOD 3: Extract annotations (hyperlinks - links behind text)
      // This is used for profile section
      try {
        const annots = await page.getAnnotations({ intent: "display" });

        const overlap = (a: [number, number, number, number], b: [number, number, number, number]) =>
          !(b[0] > a[2] || b[2] < a[0] || b[1] > a[3] || b[3] < a[1]);

        for (const a of annots as any[]) {
          // Find URL from annotation
          let url = a?.url || a?.unsafeUrl || "";
          if (!url) continue;

          url = normalizeUrl(String(url));
          if (!url) continue;

          // Build rectangles for annotation area
          const rects: Array<[number, number, number, number]> = [];
          const toViewportRect = (pdfRect: number[]) => {
            const [x1, y1, x2, y2] = viewport.convertToViewportRectangle(pdfRect);
            return [Math.min(x1, x2), Math.min(y1, y2), Math.max(x1, x2), Math.max(y1, y2)] as [number, number, number, number];
          };

          if (Array.isArray(a.quadPoints) && a.quadPoints.length >= 8) {
            for (let i = 0; i < a.quadPoints.length; i += 8) {
              const q = a.quadPoints.slice(i, i + 8);
              const xs = [q[0], q[2], q[4], q[6]];
              const ys = [q[1], q[3], q[5], q[7]];
              rects.push(toViewportRect([Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]));
            }
          } else if (Array.isArray(a.rect) && a.rect.length === 4) {
            rects.push(toViewportRect(a.rect));
          }

          // Collect text that overlaps the annotation rect(s) - this is the link text behind which URL is hidden
          let label = "";
          if (Util && rects.length && itemsWithRects.length) {
            const pieces: string[] = [];
            for (const r of rects) {
              for (const it of itemsWithRects) {
                if (!it.str?.trim()) continue;
                if (overlap(r, it.rect)) pieces.push(it.str);
              }
            }
            label = pieces.join(" ").replace(/\s+/g, " ").trim();
          }

          // Add link with extracted label text
          try {
            const uobj = new URL(url);
            const norm = uobj.toString();
            if (!seen.has(norm)) {
              seen.add(norm);
              links.push({ text: label || "", url: norm });
            }
          } catch {
            /* skip invalid */
          }
        }
      } catch (e) {
        console.warn("pdfjs-dist getAnnotations failed:", (e as any)?.message || e);
      }
    }

    // Use pdfjs-dist extracted text as primary (for skills, checklist, experience)
    text = textLines.join("\n");
  } catch (e: any) {
    console.warn("pdfjs-dist text/hyperlink extraction failed:", e?.message || e);
  }

  // Fallback: Use pdf-parse if pdfjs-dist failed
  if (!text) {
    try {
      const pdfParseMod = await import("pdf-parse");
      const pdfParse = (pdfParseMod.default || pdfParseMod) as (b: Buffer | Uint8Array) => Promise<{ text: string }>;
      const parsed = await pdfParse(data);
      text = parsed.text || "";
    } catch (e) {
      console.warn("pdf-parse fallback also failed:", (e as any)?.message || e);
    }
  }

  // Regex fallback: Extract visible URLs from text
  if (text) {
    const urlPattern = /https?:\/\/[\w.-]+\.[\w./#?=&%~+-]+/gi;
    for (const m of text.matchAll(urlPattern)) {
      const u = normalizeUrl(m[0]);
      try {
        const uobj = new URL(u);
        if (!seen.has(uobj.toString())) {
          seen.add(uobj.toString());
          links.push({ text: "", url: uobj.toString() });
        }
      } catch {}
    }
  }

  return { text: text || "", links };
}




async function extractTextFromDocx(buffer: Buffer): Promise<ExtractedContent> {
  const mammoth = await import("mammoth")
  const links: Array<{ text: string; url: string }> = []
  const seenUrls = new Set<string>()
  let text = ''
  
  // METHOD 1: Convert to HTML and parse <a href> tags (primary method for hyperlinks)
  try {
    const htmlResult = await mammoth.convertToHtml({ buffer })
    
    if (htmlResult.value) {
      const html = htmlResult.value
      
      // Extract text from HTML (remove tags)
      text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      
      // Parse <a href> tags to extract hyperlinks
      const linkPattern = /<a\s+[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
      let match
      while ((match = linkPattern.exec(html)) !== null) {
        let url = match[1].trim()
        let linkText = match[2].trim()
        
        // Decode HTML entities in URL
        url = url.replace(/&amp;/g, '&').replace(/&nbsp;/g, '').trim()
        
        // Extract clean text from link (remove nested HTML tags)
        linkText = linkText.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim()
        
        // Validate URL format
        if (url && url.length > 3) {
          try {
            // Normalize URL
            if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('mailto:')) {
              url = 'https://' + url.replace(/^www\./, '')
            }
            const urlObj = new URL(url)
            const normalizedUrl = urlObj.toString()
            
            if (!seenUrls.has(normalizedUrl)) {
              seenUrls.add(normalizedUrl)
              links.push({ text: linkText || '', url: normalizedUrl })
            }
          } catch {
            // Skip invalid URLs
          }
        }
      }
    }
  } catch (htmlError) {
    console.warn("mammoth HTML conversion failed:", htmlError)
  }
  
  // METHOD 2: Fallback - Extract raw text if HTML conversion failed
  if (!text) {
    try {
      const textResult = await mammoth.extractRawText({ buffer })
      text = textResult.value || ''
    } catch (textError) {
      console.warn("mammoth text extraction failed:", textError)
    }
  }
  
  // METHOD 3: Parse DOCX XML directly as backup (if HTML didn't work)
  if (links.length === 0) {
    try {
      let JSZip
      try {
        JSZip = (await import("jszip")).default
      } catch (importError) {
        // jszip not available, skip
        throw new Error("JSZip not available")
      }
      const zip = await JSZip.loadAsync(buffer)
      
      // Get document.xml where hyperlinks are stored
      const documentXml = await zip.file("word/document.xml")?.async("string")
      const relationshipsXml = await zip.file("word/_rels/document.xml.rels")?.async("string")
      
      if (documentXml && relationshipsXml) {
        // Parse relationships to get link IDs to URLs mapping
        const relMap = new Map<string, string>()
        const relMatches = relationshipsXml.matchAll(/<Relationship[^>]+Id="([^"]+)"[^>]+Target="([^"]+)"[^>]*\/>/gi)
        for (const relMatch of relMatches) {
          const id = relMatch[1]
          let target = relMatch[2]
          // Decode XML entities
          target = target.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
          relMap.set(id, target)
        }
        
        // Parse document.xml to find hyperlinks
        // Hyperlinks can be in multiple formats:
        // 1. <w:hyperlink r:id="..."><w:r><w:t>text</w:t></w:r></w:hyperlink>
        // 2. <w:hyperlink w:anchor="..."><w:r><w:t>text</w:t></w:r></w:hyperlink>
        // 3. <w:hyperlink r:relationshipsId="..."><w:r><w:t>text</w:t></w:r></w:hyperlink>
        
        // Pattern 1: Hyperlinks with r:id (most common)
        const hyperlinkPatterns = [
          // Standard r:id
          /<w:hyperlink[^>]+r:id="([^"]+)"[^>]*>([\s\S]*?)<\/w:hyperlink>/gi,
          // Sometimes with namespace prefix variations
          /<hyperlink[^>]+r:id="([^"]+)"[^>]*>([\s\S]*?)<\/hyperlink>/gi,
          // RelationshipsId variation
          /<w:hyperlink[^>]+relationshipsId="([^"]+)"[^>]*>([\s\S]*?)<\/w:hyperlink>/gi
        ]
        
        for (const pattern of hyperlinkPatterns) {
          const hyperlinkMatches = documentXml.matchAll(pattern)
          for (const hlMatch of hyperlinkMatches) {
            const relId = hlMatch[1]
            const hyperlinkContent = hlMatch[2]
            
            // Extract text from hyperlink (handle multiple <w:t> tags)
            const textMatches = hyperlinkContent.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/gi)
            let linkText = ''
            for (const textMatch of textMatches) {
              linkText += textMatch[1]
            }
            linkText = linkText.trim()
            
            // Get URL from relationships
            const url = relMap.get(relId)
            if (url) {
              let finalUrl = url.trim()
              // Decode XML entities
              finalUrl = finalUrl.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
              
              // Validate and normalize URL
              if (finalUrl && finalUrl.length > 3) {
                try {
                  if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://') && !finalUrl.startsWith('mailto:')) {
                    finalUrl = 'https://' + finalUrl.replace(/^www\./, '')
                  }
                  const urlObj = new URL(finalUrl)
                  const normalizedUrl = urlObj.toString()
                  
                  if (!seenUrls.has(normalizedUrl)) {
                    seenUrls.add(normalizedUrl)
                    links.push({ text: linkText || '', url: normalizedUrl })
                  }
                } catch {
                  // Skip invalid URLs
                }
              }
            }
          }
        }
        
        // Also check for external hyperlinks (r:id might be missing, URL directly in hyperlink)
        const externalHyperlinkMatches = documentXml.matchAll(/<w:hyperlink[^>]+w:anchor="([^"]+)"[^>]*>([\s\S]*?)<\/w:hyperlink>/gi)
        for (const extMatch of externalHyperlinkMatches) {
          const anchor = extMatch[1]
          const hyperlinkContent = extMatch[2]
          
          const textMatches = hyperlinkContent.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/gi)
          let linkText = ''
          for (const textMatch of textMatches) {
            linkText += textMatch[1]
          }
          linkText = linkText.trim()
          
          // Check if anchor looks like a URL
          if (anchor && (anchor.startsWith('http://') || anchor.startsWith('https://') || anchor.includes('.com') || anchor.includes('.org'))) {
            let finalUrl = anchor.trim()
            if (!finalUrl.startsWith('http')) {
              finalUrl = 'https://' + finalUrl
            }
            try {
              const urlObj = new URL(finalUrl)
              const normalizedUrl = urlObj.toString()
              if (!seenUrls.has(normalizedUrl)) {
                seenUrls.add(normalizedUrl)
                links.push({ text: linkText || '', url: normalizedUrl })
              }
            } catch {}
          }
        }
      }
    } catch (xmlError) {
      // XML parsing failed, skip (we already have HTML parsing from METHOD 1)
      console.warn("Direct DOCX XML parsing failed:", xmlError)
    }
  }
  
  // METHOD 4: Regex fallback for visible URLs in text (if hyperlinks weren't captured)
  if (text && links.length === 0) {
    const urlPattern = /https?:\/\/[\w.-]+\.[\w./#?=&%~+-]+/gi
    const urlMatches = Array.from(text.matchAll(urlPattern))
    for (const match of urlMatches) {
      const url = match[0].trim()
      try {
        const urlObj = new URL(url)
        const normalizedUrl = urlObj.toString()
        if (!seenUrls.has(normalizedUrl) && urlObj.pathname.length > 1) {
          seenUrls.add(normalizedUrl)
          links.push({ text: '', url: normalizedUrl })
        }
      } catch {
        // Skip invalid URLs
      }
    }
  }
  
  // Ensure text is always defined (fallback to empty string if all methods failed)
  const finalText = text || ''
  
  return {
    text: finalText,
    links: links
  }
}

async function extractTextFromFile(file: File): Promise<ExtractedContent> {
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const fileName = file.name.toLowerCase()

  if (fileName.endsWith(".pdf")) {
    return await extractTextFromPdf(buffer)
  }
  if (fileName.endsWith(".docx")) {
    return await extractTextFromDocx(buffer)
  }
  return { text: '', links: [] }
}


async function analyzeWithOpenAI(resumeText: string, job: JobRequirements, jdTemplate: any) {
  // Build comprehensive JD context from template
  const jdItemsText = jdTemplate?.items?.map((item: any) => {
    return `- ${item.text || item.id} (Must: ${item.must ? 'YES' : 'NO'})${item.tags ? `\n  Required Tags: ${Array.isArray(item.tags) ? item.tags.join(', ') : ''}` : ''}${item.veryMust ? `\n  Critical Tags: ${Array.isArray(item.veryMust) ? item.veryMust.join(', ') : ''}` : ''}`
  }).join('\n') || ''

  const system = `You are an expert technical recruiter and resume analyst. Your task is to accurately analyze resumes against comprehensive job requirements.

CRITICAL RULES:
1. Only match skills/technologies that are EXPLICITLY mentioned in the resume text
2. Do NOT infer or guess skills that are not directly stated
3. Be very strict - only claim a skill is present if you find clear evidence in the resume
4. Return valid JSON only, no commentary or markdown
5. Extract accurate information from the resume text`

  const user = `Analyze this resume against the comprehensive job requirements below. Be VERY ACCURATE - only match skills that are explicitly mentioned in the resume.

JOB REQUIREMENTS:
Job Title: ${job.jobTitle}
Job Description: ${job.jobDescription}
Required Skills: ${job.requiredSkills.join(", ")}
Minimum Experience: ${job.minimumExperience} years
Education Level: ${job.educationLevel}

JD CHECKLIST ITEMS:
${jdItemsText}

RESUME TEXT:
"""
${resumeText}
"""

Return JSON with this EXACT structure (only include skills explicitly found in resume):
{
  "name": "string from resume",
  "email": "string from resume or empty",
  "phone": "string from resume or empty",
  "location": "string from resume or empty",
  "currentTitle": "string from resume or empty",
  "yearsOfExperience": number (calculate from work experience dates, sum all years from earliest to latest or present, be precise),
  "educationLevel": "string from resume",
  "matchedSkills": ["only skills explicitly found in resume that match required skills"],
  "additionalSkills": ["other technical skills found in resume that are not in required skills"],
  "experience": [
    {
      "title": "string",
      "company": "string",
      "period": "string",
      "description": "string"
    }
  ],
  "aiAnalysis": "detailed analysis of how well the candidate matches the job requirements"
}`

  for (let attempt = 0; attempt <= 2; attempt++) {
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Using cost-effective but accurate model
        temperature: 0.1, // Low temperature for consistency
        max_tokens: 2000,
        response_format: { type: "json_object" }, // Force JSON response
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      })

      const content = completion.choices?.[0]?.message?.content || ""
      let parsed: any
      try {
        let jsonStr = content.trim()
        // Remove markdown code blocks if present
        jsonStr = jsonStr.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '')
        jsonStr = cleanJsonString(jsonStr)
        parsed = JSON.parse(jsonStr)
        return parsed
      } catch (parseError: any) {
        console.warn("Failed to parse OpenAI JSON, trying to extract JSON block:", parseError?.message)
        // Try to find JSON block if direct parse fails
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          try {
            let jsonStr = cleanJsonString(jsonMatch[0])
            parsed = JSON.parse(jsonStr)
            return parsed
          } catch {
            // Fall through to return empty
          }
        }
        parsed = {}
        return parsed
      }
    } catch (e: any) {
      const isRateLimit = e?.status === 429 || 
                         e?.message?.includes("rate limit") ||
                         e?.message?.includes("Rate limit exceeded")
      if (isRateLimit && attempt < 2) {
        const delay = Math.pow(2, attempt) * 2000 // Exponential backoff
        console.warn(`OpenAI API rate limited, retrying in ${delay}ms... (attempt ${attempt + 1}/3)`)
        await new Promise((resolve) => setTimeout(resolve, delay))
        continue
      }
      console.warn("analyzeWithOpenAI failed, returning empty object", e?.message || e)
      return {}
    }
  }
  return {}
}

function computeMatchedSkills(required: string[], mentioned: string[]): string[] {
  const reqSet = new Set(required.map((s) => s.toLowerCase()))
  const got = new Set<string>()
  for (const m of mentioned) {
    const key = m.toLowerCase()
    if (reqSet.has(key)) got.add(m)
  }
  return Array.from(got)
}

// AI skill extraction function removed - using text-based extraction only

async function analyzeJDItemWithAI(
  resumeText: string,
  item: any,
  retries = 1
): Promise<{
  matched: string[]
  missing: string[]
  coverage: number
  veryMustOk: boolean
  semanticMatches: Record<string, number>
}> {
  const system = `You are an expert JD requirement analyzer. Analyze if specific job requirements are met in a resume.

CRITICAL RULES:
1. Only match tags that are EXPLICITLY mentioned in the resume
2. Be very strict - do NOT infer skills that are not directly stated
3. Return valid JSON only
4. Only include tags in "matched" array if they are clearly found in the resume text`

  const prompt = `Analyze if this JD requirement is met in the resume. Be VERY ACCURATE - only match tags explicitly mentioned.

JD Requirement: "${item.text}"
Required Tags: ${(item.tags || []).join(", ")}
Critical Tags (must have all): ${(item.veryMust || []).join(", ")}
Is this requirement mandatory: ${item.must ? 'YES' : 'NO'}

Resume Text:
"""
${resumeText}
"""

Return JSON with this EXACT structure:
{
  "matched": ["only tags explicitly found in resume that match required tags"],
  "missing": ["tags that are required but NOT found in resume"],
  "coverage": number between 0.0 and 1.0 (matched tags / total required tags),
  "veryMustOk": true/false (true only if ALL critical tags are found),
  "semanticMatches": {
    "tag_name": confidence number between 0.0 and 1.0 for each matched tag
  }
}`
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.1,
        max_tokens: 1000,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
      })
      const content = completion.choices?.[0]?.message?.content || ""
      let jsonStr = content.trim()
      // Remove markdown code blocks if present
      jsonStr = jsonStr.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '')
      
      // Try to find JSON block if direct parse fails
      if (!jsonStr.match(/^\{/)) {
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        if (jsonMatch) jsonStr = jsonMatch[0]
      }
      
      if (jsonStr) {
        try {
          jsonStr = cleanJsonString(jsonStr)
          const parsed = JSON.parse(jsonStr)
          return {
            matched: Array.isArray(parsed.matched) ? parsed.matched : [],
            missing: Array.isArray(parsed.missing) ? parsed.missing : (item.tags || []),
            coverage: typeof parsed.coverage === "number" ? Math.max(0, Math.min(1, parsed.coverage)) : 0,
            veryMustOk: parsed.veryMustOk !== false,
            semanticMatches: parsed.semanticMatches && typeof parsed.semanticMatches === 'object' ? parsed.semanticMatches : {},
          }
        } catch (parseError: any) {
          console.warn(`Failed to parse OpenAI JSON for ${item.id}, using fallback`, parseError?.message)
          return { matched: [], missing: item.tags || [], coverage: 0, veryMustOk: false, semanticMatches: {} }
        }
      }
    } catch (e: any) {
      const isRateLimit = e?.status === 429 || 
                         e?.message?.includes("rate limit") ||
                         e?.message?.includes("Rate limit exceeded")
      if (isRateLimit && attempt < retries) {
        const delay = Math.pow(2, attempt) * 2000
        console.warn(`OpenAI API rate limited for ${item.id}, retrying in ${delay}ms... (attempt ${attempt + 1}/${retries + 1})`)
        await new Promise((resolve) => setTimeout(resolve, delay))
        continue
      }
      console.warn(`AI JD item analysis failed for ${item.id}, using keyword fallback`, e?.message || e)
      break
    }
  }
  // Fallback: return empty matches, will use keyword matching
  return { matched: [], missing: item.tags || [], coverage: 0, veryMustOk: false, semanticMatches: {} }
}

// Helper function to send SSE progress update
function sendProgress(controller: ReadableStreamDefaultController, percentage: number, message: string, currentFile?: number, totalFiles?: number, stage?: string, aiThinking?: string) {
  const data = JSON.stringify({
    type: 'progress',
    percentage: Math.min(100, Math.max(0, Math.round(percentage))),
    message,
    currentFile,
    totalFiles,
    stage, // 'extract', 'ai', 'checklist', 'projects'
    aiThinking, // AI thinking message for gameified experience
  })
  controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`))
}

// Helper function to send final result
function sendResult(controller: ReadableStreamDefaultController, candidates: any[], meta: any) {
  const data = JSON.stringify({
    type: 'result',
    candidates,
    meta,
  })
  controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`))
}


// Helper function to close stream
function closeStream(controller: ReadableStreamDefaultController) {
  controller.close()
}

// Helper function to send error
function sendError(controller: ReadableStreamDefaultController, error: string) {
  const data = JSON.stringify({
    type: 'error',
    error,
  })
  controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`))
  controller.close()
}

export async function POST(req: NextRequest) {
  const startTime = Date.now()
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  // Create a ReadableStream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      try {
        console.log(`[${requestId}] /api/analyze invoked`)
        if (!process.env.OPENAI_API_KEY) {
          console.error(`[${requestId}] Missing OPENAI_API_KEY`)
          sendError(controller, "Missing OPENAI_API_KEY")
          return
        }

        sendProgress(controller, 2, "Initializing analysis...")
        
        const form = await req.formData()
        const jobStr = form.get("jobRequirements") as string | null
        const useAgenticAI = form.get("useAgenticAI") === "true" // Toggle for agentic AI
        
        if (!jobStr) {
          console.error(`[${requestId}] Missing jobRequirements`)
          sendError(controller, "jobRequirements missing")
          return
        }

        sendProgress(controller, 5, useAgenticAI ? "🤖 Initializing Agentic AI System..." : "Parsing job requirements...", undefined, undefined, "init", useAgenticAI ? "Initializing specialized AI agents..." : undefined)

        // Validate and parse job requirements
        let job: JobRequirements
        try {
          job = JSON.parse(jobStr) as JobRequirements
          // Validate required fields
          if (!job.jobTitle || !job.jobDescription || !Array.isArray(job.requiredSkills)) {
            sendError(controller, "Invalid job requirements: missing required fields")
            return
          }
          if (!job.minimumExperience || job.minimumExperience < 0) {
            job.minimumExperience = 0
          }
          if (!job.educationLevel) {
            job.educationLevel = "Bachelor's"
          }
        } catch (parseError: any) {
          sendError(controller, `Invalid job requirements JSON: ${parseError.message}`)
          return
        }

        const files = form.getAll("files") as File[]
        if (!files || files.length === 0) {
          sendError(controller, "No files uploaded")
          return
        }
        
        // Limit file count to prevent overload
        if (files.length > 20) {
          sendError(controller, "Too many files. Maximum 20 files allowed.")
          return
        }

        // Normalize role name (convert spaces to underscores, lowercase)
        const rawRoleKey = (job as any).role || "software_engineer"
        const roleKey = rawRoleKey
          .toString()
          .trim()
          .toLowerCase()
          .replace(/\s+/g, '_')
          .replace(/[^a-z0-9_]/g, '')
        console.log(`[${requestId}] Processing role: ${roleKey} (normalized from: ${rawRoleKey}), files: ${files.length}`)
        
        sendProgress(controller, 8, `Loading template for role: ${roleKey}...`, 0, files.length)
        
        const db = await (async () => {
      try {
        const mod = await import("@/lib/mongodb")
        return await mod.getDb()
      } catch {
        return null
      }
    })()
    // Get template with validation
    let template: any = defaultTemplates[roleKey] || null
    if (!template) {
      // Create minimal template if none exists
      template = {
        role: roleKey,
        weights: {},
        items: [],
      }
    }
    
    if (db) {
      try {
        const coll = db.collection("jd_templates")
        const doc = await coll.findOne({ role: roleKey })
        if (doc?.template && typeof doc.template === 'object') {
          // Validate template structure
          if (doc.template.items && Array.isArray(doc.template.items) && 
              doc.template.weights && typeof doc.template.weights === 'object') {
            template = doc.template
          }
        }
      } catch (dbError: any) {
        console.warn("Failed to fetch template from DB, using default:", dbError.message)
        // Continue with default template
      }
    }
    
    // Ensure template has required structure
    if (!template.items || !Array.isArray(template.items)) {
      template.items = []
    }
    if (!template.weights || typeof template.weights !== 'object') {
      template.weights = {}
    }

    function normalize(str: string): string {
      return str
        .toLowerCase()
        .replace(/[^a-z0-9\s/+.-]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    }
    function stem(token: string): string {
      return token.replace(/(ing|ed|es|s)$/i, "")
    }
    const SYNONYMS: Record<string, string[]> = {
      "ci/cd": ["cicd", "ci cd", "continuous integration", "continuous delivery", "continuous deployment"],
      kubernetes: ["k8s"],
      oauth2: ["oauth", "oAuth 2"],
      "api gateway": ["apigw", "api-gateway"],
      postgres: ["postgresql", "postgre"],
      aws: ["amazon web services"],
      authentication: ["auth", "login", "signin"],
      "unit test": ["unit testing", "unit-tests"],
    }
    // AI-powered project extractor: extracts ONLY actual projects, excludes roles/experience/tech
    async function extractProjects(text: string): Promise<Array<{ title: string; description: string }>> {
      if (!text) return []
      
      // First try AI extraction for accuracy
      if (checkRateLimitCooldown() && consecutiveRateLimits < MAX_CONSECUTIVE_RATE_LIMITS) {
        try {
          const user = `Extract ONLY personal/portfolio projects from this resume. EXCLUDE: job roles, work experience entries, company names, technologies list, skills, education, certifications, awards.

Return JSON array: [{"title": "Project Name", "description": "Brief project description"}]

Resume text:
"""
${text}
"""

Return ONLY actual projects (not work experience, not job titles, not technologies). If no projects found, return [].`
        
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          temperature: 0.1,
          max_tokens: 1000,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: 'You are a resume parser. Extract ONLY personal projects/portfolio items. Exclude work experience, job roles, technologies, skills, education.' },
            { role: 'user', content: user }
          ]
        })
        
        let content = completion.choices?.[0]?.message?.content || '{}'
        content = cleanJsonString(content.trim())
        const parsed = JSON.parse(content)
        
        let projects = []
        if (Array.isArray(parsed.projects)) {
          projects = parsed.projects
        } else if (Array.isArray(parsed)) {
          projects = parsed
        } else if (parsed.title && parsed.description) {
          projects = [parsed]
        }
        
        // Validate and clean extracted projects
        const valid = projects
          .filter((p: any) => p && typeof p === 'object' && p.title && typeof p.title === 'string')
          .map((p: any) => ({
            title: String(p.title || '').trim().slice(0, 120),
            description: String(p.description || '').trim().slice(0, 500)
          }))
          .filter((p: { title: string; description: string }) => {
            if (!p.title || p.title.length < 3) return false
            // Exclude common non-project patterns
            const titleLower = p.title.toLowerCase()
            const descLower = (p.description || '').toLowerCase()
            
            // Exclude job titles
            if (/\b(software engineer|developer|engineer|manager|lead|senior|junior|intern|student)\b/i.test(p.title)) return false
            // Exclude company names (often in ALL CAPS)
            if (/^[A-Z\s&]{10,}$/.test(p.title) && !p.description) return false
            // Exclude dates
            if (/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{4})\s*[-\–]\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{4}|present)/i.test(p.title)) return false
            // Exclude technology lists
            if (/^(technologies|tech stack|skills|tools|used|built with):?/i.test(p.title)) return false
            // Exclude if it mentions work experience keywords
            if (/\b(worked|employed|company|corporation|inc|llc|ltd)\b/i.test(p.title)) return false
            // Exclude education entries
            if (/\b(university|college|degree|bachelor|master|phd|education)\b/i.test(p.title)) return false
            
            return true
          })
          .slice(0, 10)
        
        if (valid.length > 0) {
          recordSuccess()
          return valid
        }
      } catch (e: any) {
        if (e?.status === 429 || e?.message?.includes('rate limit')) {
          recordRateLimit()
        }
      }
    }
    
    // Fallback: text-based extraction with strict filtering
    const t = text.replace(/\r/g, '\n')
    const sectionPattern = /(?:^|\n)\s*(PROJECTS?|PERSONAL\s+PROJECTS?|PROJECTS?\s+&\s+PORTFOLIO|OPEN\s+SOURCE|SIDE\s+PROJECTS?|PORTFOLIO)\s*(?:[:\-]|\n)/i
    const sectionMatch = t.match(sectionPattern)
    
    if (!sectionMatch) return []
    
    const searchStart = sectionMatch.index! + sectionMatch[0].length
    const nextSection = t.substring(searchStart).match(/\n\s*(EXPERIENCE|EDUCATION|SKILLS|CERTIFICATIONS|AWARDS|WORK\s+HISTORY|EMPLOYMENT|SUMMARY|OBJECTIVE|TECHNICAL)\s*(?:[:\-]|\n)/i)
    const searchEnd = nextSection ? searchStart + nextSection.index! : t.length
    
    const projectsSection = t.substring(searchStart, searchEnd)
    const lines = projectsSection.split(/\n/).map(l => l.trim()).filter(l => l.length > 0)
    
    const results: Array<{ title: string; description: string }> = []
    let current: { title: string; description: string } | null = null
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      // Skip feature bullets
      if (/^[-•*]\s*[a-z]/.test(line) && /^(built|used|implemented|developed|created|designed|wrote|tested|added|fixed|improved|utilized|applied)\b/i.test(line)) {
        if (current) {
          current.description += ' ' + line.replace(/^[-•*\s]+/, '')
          current.description = current.description.slice(0, 500)
        }
        continue
      }
      
      // Exclude non-project lines
      const excludePatterns = [
        /^(technologies?|tech stack|skills|tools|used|built with):?/i,
        /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{4})\s*[-\–]/i,
        /^(software engineer|developer|engineer|manager|lead|senior|junior)\b/i,
        /^\d+\.\d+\s*(years?|months?)/i,
        /^(university|college|degree|bachelor|master|phd)\b/i
      ]
      if (excludePatterns.some(p => p.test(line))) continue
      
      // Detect project title (capitalized, reasonable length, not all caps)
      const isTitle = /^[A-Z][a-z]/.test(line) && line.length >= 5 && line.length <= 80 && !/^[A-Z\s&]{10,}$/.test(line)
      
      if (isTitle && (!current || current.description.length > 20)) {
        if (current && (current.description || current.title.length > 15)) {
          results.push(current)
        }
        current = { title: line.slice(0, 100), description: '' }
      } else if (current && line.length > 10) {
        if (!current.description) {
          current.description = line
        } else {
          current.description += ' ' + line
        }
        current.description = current.description.slice(0, 500)
      }
    }
    
    if (current && (current.description || current.title.length > 15)) {
      results.push(current)
    }
    
    // Final filtering
    return results
      .filter(p => {
        const title = p.title.toLowerCase()
        return !/\b(engineer|developer|manager|lead|senior|junior|intern|student|technologies|tech stack|skills|university|college)\b/.test(title)
      })
      .slice(0, 10)
    }
    // Extract profile links (robust): supports protocol-less, markdown links, text mentions, hyperlinks from files, and dedup/cleanup
    function extractProfileLinks(text: string, extractedLinks?: Array<{ text: string; url: string }>): Array<{ url: string; label?: string }> {
      const results: Array<{ url: string; label?: string }> = []
      if (!text) return results
      const t = text.replace(/\r/g, ' ')
      const found = new Set<string>()
      const pushUrl = (raw: string, label?: string) => {
        if (!raw) return
        // strip surrounding punctuation
        let u = raw.trim().replace(/[),.]$/g, '')
        if (!/^https?:\/\//i.test(u)) u = 'https://' + u
        try {
          const url = new URL(u)
          // normalize
          url.hash = ''
          const norm = url.toString().replace(/\/$/, '')
          if (!found.has(norm)) {
            found.add(norm)
            results.push({ url: norm, label })
          }
        } catch {}
      }
      
      // ALWAYS search text for platform mentions with nearby URLs (handles hyperlinked and non-hyperlinked cases)
      // This is the key - we search the text directly for platform names and URLs nearby
      const platformKeywordsMap: Record<string, { domains: string[], patterns: RegExp[] }> = {
      'github': { 
        domains: ['github.com'], 
        patterns: [/\bgithub\b/gi, /\bgit\s*hub\b/gi] 
      },
      'linkedin': { 
        domains: ['linkedin.com'], 
        patterns: [/\blinkedin\b/gi, /\blinked\s*in\b/gi] 
      },
      'leetcode': { 
        domains: ['leetcode.com'], 
        patterns: [/\bleetcode\b/gi, /\bleet\s*code\b/gi] 
      },
      'geeksforgeeks': { 
        domains: ['geeksforgeeks.org'], 
        patterns: [/\bgeeksforgeeks\b/gi, /\bgeeks\s*for\s*geeks\b/gi, /\bgfg\b/gi] 
      },
      'hackerrank': { 
        domains: ['hackerrank.com'], 
        patterns: [/\bhackerrank\b/gi] 
      },
      'kaggle': { 
        domains: ['kaggle.com'], 
        patterns: [/\bkaggle\b/gi] 
      },
      'gitlab': { 
        domains: ['gitlab.com'], 
        patterns: [/\bgitlab\b/gi, /\bgit\s*lab\b/gi] 
      },
      'codeforces': { 
        domains: ['codeforces.com'], 
        patterns: [/\bcodeforces\b/gi] 
      }
    }
    
    // Split text into lines for better context matching
    const lines = t.split(/\r?\n/)

    // (ADD) Harvest LinkedIn from raw text early and push them
for (const ln of extractLinkedInFromText(t)) {
  // ensure they go through the same normalization/dedupe path
  pushUrl(ln, "linkedin");
}

    
    for (const [keyword, platform] of Object.entries(platformKeywordsMap)) {
      const domains = platform.domains
      const patterns = platform.patterns
      
      for (const pattern of patterns) {
        // Search entire text for platform mentions
        const mentions = Array.from(t.matchAll(pattern))
        for (const mention of mentions) {
          const mentionPos = mention.index || 0
          const mentionEnd = mentionPos + mention[0].length
          
          // STRICT: Only search within 80 characters after the mention ends (tighter window)
          const textAfter = t.substring(mentionEnd, Math.min(mentionEnd + 80, t.length))
          
          // Also check the same line for immediate matches (e.g., "GitHub: github.com/username")
          const lineIndex = t.substring(0, mentionPos).split(/\r?\n/).length - 1
          const currentLine = lines[lineIndex] || ''
          const mentionInLine = currentLine.indexOf(mention[0])
          const lineAfterMention = mentionInLine >= 0 ? currentLine.substring(mentionInLine + mention[0].length) : ''
          
          // Combine contexts but prefer immediate line matches
          const searchContext = (lineAfterMention.length > 0 && lineAfterMention.length < 100 ? lineAfterMention : textAfter)
          
          // STRICT: Only look for URLs that contain the platform domain
          // Build regex that specifically matches this platform's domain
          const domainPattern = domains.map(d => d.replace(/\./g, '\\.')).join('|')
          
          // Match URLs that MUST contain the platform domain (much stricter)
          const platformUrlPatterns = [
            // Protocol URLs with platform domain - must have path
            new RegExp(`https?://(?:www\\.)?(${domainPattern})/[\\w./#?=&%~+-]+`, 'gi'),
            // Protocol-less URLs with platform domain - must have path
            new RegExp(`(?:www\\.)?(${domainPattern})/[\\w./#?=&%~+-]+`, 'gi')
          ]
          
          for (const urlPattern of platformUrlPatterns) {
            const urlMatches = Array.from(searchContext.matchAll(urlPattern))
            for (const urlMatch of urlMatches) {
              const rawUrl = urlMatch[0].trim()
              // Skip if URL is too short or doesn't look like a profile URL
              if (rawUrl.length < 10) continue
              
              // Skip if it's just the domain without a path (not a profile)
              // Our regex already requires a path, but double-check
              if (!rawUrl.includes('/') || rawUrl.match(/^(?:https?:\/\/)?(?:www\.)?[\w.-]+\.(?:com|org)(?:\/?)$/i)) {
                continue
              }
              
              try {
                // Validate URL and ensure it matches the platform domain
                const testUrl = rawUrl.startsWith('http') ? rawUrl : 'https://' + rawUrl
                const urlObj = new URL(testUrl)
                const hostname = urlObj.hostname.toLowerCase().replace(/^www\./, '')
                
                // STRICT: Only accept if hostname exactly matches one of the platform domains
                if (domains.some(d => hostname === d.replace(/^www\./, ''))) {
                  // Additional validation: Check if it looks like a profile URL (has path)
                  const path = urlObj.pathname
                  if (path && path.length > 1) { // Path like /username or /in/username
                    pushUrl(testUrl, keyword)
                  }
                }
              } catch {
                // Try adding protocol if URL constructor failed
                try {
                  const testUrl2 = 'https://' + rawUrl
                  const urlObj2 = new URL(testUrl2)
                  const hostname2 = urlObj2.hostname.toLowerCase().replace(/^www\./, '')
                  if (domains.some(d => hostname2 === d.replace(/^www\./, ''))) {
                    const path2 = urlObj2.pathname
                    if (path2 && path2.length > 1) {
                      pushUrl(testUrl2, keyword)
                    }
                  }
                } catch {}
              }
            }
          }
        }
      }
    }
    
    // PRIORITY: Handle extracted hyperlinks from files FIRST (most reliable - actual hyperlinks)
    // These are hyperlinks where text like "Github" is linked to a URL
    if (extractedLinks && extractedLinks.length > 0) {
      // Platform name patterns to match against link text - more lenient matching
      const platformPatterns: Array<{ pattern: RegExp; name: string; domains: string[] }> = [
        { 
          pattern: /^(github|git\s*hub|gh|git\s+hub)$/i, 
          name: 'github', 
          domains: ['github.com'] 
        },
        { 
          pattern: /^(linkedin|linked\s*in|li|linked\s+in)$/i, 
          name: 'linkedin', 
          domains: ['linkedin.com'] 
        },
        { 
          pattern: /^(leetcode|leet\s*code|lc|leet\s+code)$/i, 
          name: 'leetcode', 
          domains: ['leetcode.com'] 
        },
        { 
          pattern: /^(geeksforgeeks|geeks\s*for\s*geeks|gfg|geeks\s+for\s+geeks)$/i, 
          name: 'geeksforgeeks', 
          domains: ['geeksforgeeks.org'] 
        },
        { 
          pattern: /^(hackerrank|hr)$/i, 
          name: 'hackerrank', 
          domains: ['hackerrank.com'] 
        },
        { 
          pattern: /^(kaggle)$/i, 
          name: 'kaggle', 
          domains: ['kaggle.com'] 
        },
        { 
          pattern: /^(gitlab|git\s*lab|gl|git\s+lab)$/i, 
          name: 'gitlab', 
          domains: ['gitlab.com'] 
        },
        { 
          pattern: /^(codeforces|cf)$/i, 
          name: 'codeforces', 
          domains: ['codeforces.com'] 
        }
      ]
      
      // Match links with text that matches platform names (this handles hyperlinked "Github" text)
      for (const link of extractedLinks) {
        let linkText = (link.text || '').trim()
        let linkUrl = (link.url || '').trim()
        
        if (!linkUrl) continue
        
        // Normalize and validate URL first
        try {
          // Ensure URL has protocol
          if (!linkUrl.startsWith('http://') && !linkUrl.startsWith('https://') && !linkUrl.startsWith('mailto:')) {
            linkUrl = 'https://' + linkUrl
          }
          // Validate URL format
          const urlObj = new URL(linkUrl)
          const hostname = urlObj.hostname.toLowerCase().replace(/^www\./, '')
          const path = urlObj.pathname || ''
          
          // Skip if it's just homepage (no path or minimal path)
          if (path === '/' || path === '') continue
          
          // Normalize link text - remove extra whitespace, handle case
          linkText = linkText.toLowerCase().replace(/\s+/g, ' ').trim()
          
          // Check if the link text matches a platform name
          let matched = false
          for (const platform of platformPatterns) {
            // Test if link text contains platform name (case-insensitive, allows partial match)
            const linkTextLower = linkText.toLowerCase()
            const platformNameLower = platform.name.toLowerCase()
            let canonical = normalizeLinkedInUrl(linkUrl);

            
if (canonical) {
  // Only if link text says LinkedIn OR URL itself is clearly a profile
  const saysLinkedIn = /(^|\b)(linkedin|linked\s*in)\b/i.test(linkText || "");
  if (saysLinkedIn || canonical) {
    pushUrl(canonical, linkText || "linkedin");
    continue;
  }
}
          }
          
          // If link text didn't match but URL matches a platform domain, use it (but be careful)
          if (!matched) {
            for (const platform of platformPatterns) {
              const platformDomain = platform.domains[0].replace(/^www\./, '')
              if (hostname === platformDomain || hostname.includes(platformDomain)) {
                // URL domain matches platform - this could be valid even without link text match
                // Only add if it's a profile URL (has meaningful path)
                if (path && path.length > 1 && path !== '/') {
                  pushUrl(linkUrl, linkText || platform.name)
                  break
                }
              }
            }
          }
        } catch (urlError) {
          // URL parsing failed - skip this link
          continue
        }
      }
    }
    
    // 1) Markdown links [text](url)
    const md = t.matchAll(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/gi)
    for (const m of md) pushUrl(m[2], m[1])
    
    // 2) Protocol URLs
    const proto = t.matchAll(/https?:\/\/[\w.-]+\.[\w./#?=&%~+-]+/gi)
    for (const m of proto) pushUrl(m[0])
    
    // 3) Protocol-less domains (www. or bare domain)
    const bare = t.matchAll(/(?:\bwww\.|\b)[a-z0-9][a-z0-9.-]+\.[a-z]{2,}(?:\/[\w./#?=&%~+-]+)?/gi)
    for (const m of bare) pushUrl(m[0])
    
    // 4) Text-based profile mentions: "Github: username", "LinkedIn - username", "GitHub Profile: username", etc.
    const profilePatterns = [
      // GitHub variations - handle "Github:", "GitHub Profile:", "Github Account:", etc.
      { pattern: /(?:github|git\s*hub)(?:\s+(?:profile|account|username|id|handle))?[\s:|\-–—]+\s*[@\/]?([a-zA-Z0-9](?:[a-zA-Z0-9]|-(?!-))*[a-zA-Z0-9]?)/gi, baseUrl: 'https://github.com/' },
      // LinkedIn variations - handle "LinkedIn:", "LinkedIn Profile:", "LinkedIn Account:", etc.
      { pattern: /(?:linkedin|linked\s*in)(?:\s+(?:profile|account|username|id|handle))?[\s:|\-–—]+\s*[@\/]?([a-zA-Z0-9](?:[a-zA-Z0-9]|-(?!-))*[a-zA-Z0-9]?)/gi, baseUrl: 'https://linkedin.com/in/' },
      // LeetCode variations
      { pattern: /(?:leetcode|leet\s*code)(?:\s+(?:profile|account|username|id|handle))?[\s:|\-–—]+\s*[@\/]?([a-zA-Z0-9](?:[a-zA-Z0-9]|-(?!-))*[a-zA-Z0-9]?)/gi, baseUrl: 'https://leetcode.com/u/' },
      // GeeksforGeeks variations
      { pattern: /(?:geeksforgeeks|geeks\s*for\s*geeks|gfg)(?:\s+(?:profile|account|username|id|handle))?[\s:|\-–—]+\s*[@\/]?([a-zA-Z0-9](?:[a-zA-Z0-9]|-(?!-))*[a-zA-Z0-9]?)/gi, baseUrl: 'https://geeksforgeeks.org/user/' },
      // HackerRank
      { pattern: /(?:hackerrank)(?:\s+(?:profile|account|username|id|handle))?[\s:|\-–—]+\s*[@\/]?([a-zA-Z0-9](?:[a-zA-Z0-9]|-(?!-))*[a-zA-Z0-9]?)/gi, baseUrl: 'https://hackerrank.com/' },
      // Codeforces
      { pattern: /(?:codeforces)(?:\s+(?:profile|account|username|id|handle))?[\s:|\-–—]+\s*[@\/]?([a-zA-Z0-9](?:[a-zA-Z0-9]|-(?!-))*[a-zA-Z0-9]?)/gi, baseUrl: 'https://codeforces.com/profile/' },
      // Kaggle
      { pattern: /(?:kaggle)(?:\s+(?:profile|account|username|id|handle))?[\s:|\-–—]+\s*[@\/]?([a-zA-Z0-9](?:[a-zA-Z0-9]|-(?!-))*[a-zA-Z0-9]?)/gi, baseUrl: 'https://kaggle.com/' },
      // GitLab
      { pattern: /(?:gitlab|git\s*lab)(?:\s+(?:profile|account|username|id|handle))?[\s:|\-–—]+\s*[@\/]?([a-zA-Z0-9](?:[a-zA-Z0-9]|-(?!-))*[a-zA-Z0-9]?)/gi, baseUrl: 'https://gitlab.com/' }
    ]
    
    for (const { pattern, baseUrl } of profilePatterns) {
      const matches = Array.from(t.matchAll(pattern))
      for (const match of matches) {
        const username = match[1]?.trim()
        if (username && username.length >= 2 && username.length <= 40) {
          try {
            const fullUrl = baseUrl + username
            pushUrl(fullUrl)
          } catch {}
        }
      }
    }
    
    // Also check for direct platform mentions with @username format
    const atMentions = t.matchAll(/(github|linkedin|leetcode|geeksforgeeks|gfg|hackerrank|kaggle|gitlab)(?:\s+(?:profile|account))?[\s:|\-–—]*@([a-zA-Z0-9](?:[a-zA-Z0-9]|-(?!-))*[a-zA-Z0-9]?)/gi)
    for (const match of atMentions) {
      const platform = match[1]?.toLowerCase()
      const username = match[2]?.trim()
      if (platform && username) {
        const platformUrls: Record<string, string> = {
          'github': `https://github.com/${username}`,
          'linkedin': `https://linkedin.com/in/${username}`,
          'leetcode': `https://leetcode.com/u/${username}`,
          'geeksforgeeks': `https://geeksforgeeks.org/user/${username}`,
          'gfg': `https://geeksforgeeks.org/user/${username}`,
          'hackerrank': `https://hackerrank.com/${username}`,
          'kaggle': `https://kaggle.com/${username}`,
          'gitlab': `https://gitlab.com/${username}`
        }
        const url = platformUrls[platform]
        if (url) pushUrl(url)
      }
    }
    
    // Also handle cases where platform name appears on one line and username on the next line
    // Pattern: "Github\nusername" or "LinkedIn\nusername"
    const multilinePatterns = [
      { pattern: /(?:github|git\s*hub)[\s:|\-–—]*\n\s*([a-zA-Z0-9](?:[a-zA-Z0-9]|-(?!-))*[a-zA-Z0-9]?)/gi, baseUrl: 'https://github.com/' },
      { pattern: /(?:linkedin|linked\s*in)[\s:|\-–—]*\n\s*([a-zA-Z0-9](?:[a-zA-Z0-9]|-(?!-))*[a-zA-Z0-9]?)/gi, baseUrl: 'https://linkedin.com/in/' },
      { pattern: /(?:leetcode|leet\s*code)[\s:|\-–—]*\n\s*([a-zA-Z0-9](?:[a-zA-Z0-9]|-(?!-))*[a-zA-Z0-9]?)/gi, baseUrl: 'https://leetcode.com/u/' },
      { pattern: /(?:geeksforgeeks|geeks\s*for\s*geeks|gfg)[\s:|\-–—]*\n\s*([a-zA-Z0-9](?:[a-zA-Z0-9]|-(?!-))*[a-zA-Z0-9]?)/gi, baseUrl: 'https://geeksforgeeks.org/user/' },
      { pattern: /(?:hackerrank)[\s:|\-–—]*\n\s*([a-zA-Z0-9](?:[a-zA-Z0-9]|-(?!-))*[a-zA-Z0-9]?)/gi, baseUrl: 'https://hackerrank.com/' },
      { pattern: /(?:kaggle)[\s:|\-–—]*\n\s*([a-zA-Z0-9](?:[a-zA-Z0-9]|-(?!-))*[a-zA-Z0-9]?)/gi, baseUrl: 'https://kaggle.com/' },
      { pattern: /(?:gitlab|git\s*lab)[\s:|\-–—]*\n\s*([a-zA-Z0-9](?:[a-zA-Z0-9]|-(?!-))*[a-zA-Z0-9]?)/gi, baseUrl: 'https://gitlab.com/' }
    ]
    
    for (const { pattern, baseUrl } of multilinePatterns) {
      const matches = Array.from(t.matchAll(pattern))
      for (const match of matches) {
        const username = match[1]?.trim()
        if (username && username.length >= 2 && username.length <= 40) {
          try {
            const fullUrl = baseUrl + username
            pushUrl(fullUrl)
          } catch {}
        }
      }
    }

    // Filter to relevant hosts or portfolio heuristics
    const allowHosts = [
      'github.com','gitlab.com','bitbucket.org',
      'leetcode.com','codeforces.com','hackerrank.com','kaggle.com','geeksforgeeks.org',
      'linkedin.com','medium.com','dev.to','stackshare.io','stackoverflow.com',
      'behance.net','dribbble.com','figma.com',
      'vercel.app','netlify.app'
    ]
    const portfolioTlds = ['.dev','.app','.io','.me','.ai','.sh','.tech']
    const portfolioKeywords = ['portfolio','projects','work','resume','cv']

    // (ADD) Canonicalize LinkedIn URLs before filtering
for (const r of results) {
  const ln = normalizeLinkedInUrl(r.url);
  if (ln) r.url = ln;
}


    const filtered = results.filter(({ url }) => {
      try {
        const u = new URL(url)
        const host = u.host.toLowerCase()
        if (allowHosts.some(h => host.endsWith(h))) return true
        if (portfolioTlds.some(tld => host.endsWith(tld))) return true
        const path = (u.pathname || '').toLowerCase()
        if (portfolioKeywords.some(k => path.includes(k))) return true
        return false
      } catch { return false }
    })

    // Only keep LinkedIn profile URLs (drop jobs/company/etc.)
const onlyProfiles = filtered.filter(({ url }) => {
  try {
    const u = new URL(url);
    return !u.hostname.includes("linkedin.com") || /^\/(?:in|pub)\//i.test(u.pathname);
  } catch { return false; }
});
return onlyProfiles.slice(0, 20);
  }
  
    // Fetch profile data from different platforms
    // Filter out malware/spam links
    function isMaliciousLink(url: string): boolean {
      try {
        const urlObj = new URL(url)
        const host = urlObj.hostname.toLowerCase()
        const maliciousPatterns = [
          /bit\.ly/i, /tinyurl\.com/i, /t\.co/i, /goo\.gl/i, /short\.link/i,
          /malware/i, /virus/i, /phishing/i, /spam/i,
          /free-download/i, /click-here/i, /urgent/i,
        ]
        const maliciousTlds = ['.tk', '.ml', '.ga', '.cf', '.gq']
        // Check if URL contains malicious patterns
        if (maliciousPatterns.some(pattern => pattern.test(url) || pattern.test(host))) {
          return true
        }
        // Check for suspicious TLDs
        if (maliciousTlds.some(tld => host.endsWith(tld))) {
          return true
        }
        // Check for IP addresses (suspicious)
        const ipPattern = /^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$/
        if (ipPattern.test(host)) {
          return true
        }
        return false
      } catch {
        // If URL parsing fails, check for obvious spam patterns
        const spamPatterns = [/malware/i, /virus/i, /phishing/i, /spam/i, /free-download/i]
        return spamPatterns.some(pattern => pattern.test(url))
      }
    }

    // --- LinkedIn helpers (insert after isMaliciousLink) ---
// Put near your other helpers (replaces getGithubPublicContrib)
const GITHUB_TOKEN =
  process.env.GITHUB_TOKEN ||
  process.env.GH_TOKEN ||
  process.env.GITHUB_PERSONAL_ACCESS_TOKEN;

/**
 * Returns GitHub "Total contributions" for the last year (the number shown on the profile).
 * Order of attempts:
 * 1) GraphQL (accurate, requires token) → contributionCalendar.totalContributions
 * 2) Jina snapshot scrape (r.jina.ai/https://github.com/<user>) → robust text scrape
 * 3) Raw HTML scrape (last resort)
 */
// Returns year-by-year contributions for the last 3 years
// Returns: { year0: number, year1: number, year2: number, total: number }
async function getGithubContributionsByYear(username: string): Promise<{ year0: number; year1: number; year2: number; total: number; years: Array<{ year: number; contributions: number }> }> {
  const y0 = new Date().getUTCFullYear();      // current year
  const years = [y0, y0 - 1, y0 - 2];

  const toISO = (y: number) => ({
    from: `${y}-01-01T00:00:00Z`,
    to:   `${y}-12-31T23:59:59Z`,
  });

  // 1) GraphQL (accurate, supports exact year windows)
  if (typeof GITHUB_TOKEN === "string" && GITHUB_TOKEN) {
    try {
      const vars = Object.fromEntries(
        years.flatMap((y, i) => {
          const { from, to } = toISO(y);
          return [[`y${i}s`, from], [`y${i}e`, to]];
        })
      );

      const query = `
        query($login: String!,
              $y0s: DateTime!, $y0e: DateTime!,
              $y1s: DateTime!, $y1e: DateTime!,
              $y2s: DateTime!, $y2e: DateTime!) {
          user(login: $login) {
            y0: contributionsCollection(from: $y0s, to: $y0e) { contributionCalendar { totalContributions } }
            y1: contributionsCollection(from: $y1s, to: $y1e) { contributionCalendar { totalContributions } }
            y2: contributionsCollection(from: $y2s, to: $y2e) { contributionCalendar { totalContributions } }
          }
        }
      `;

      const res = await fetch("https://api.github.com/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GITHUB_TOKEN}`,
          "User-Agent": "rolefit-ai/1.0",
        },
        body: JSON.stringify({
          query,
          variables: { login: username, ...vars },
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const u = json?.data?.user;
        if (u) {
          const year0 = Number(u.y0?.contributionCalendar?.totalContributions) || 0;
          const year1 = Number(u.y1?.contributionCalendar?.totalContributions) || 0;
          const year2 = Number(u.y2?.contributionCalendar?.totalContributions) || 0;
          const total = year0 + year1 + year2;
          
          if (Number.isFinite(total)) {
            return {
              year0,
              year1,
              year2,
              total,
              years: [
                { year: y0, contributions: year0 },
                { year: y0 - 1, contributions: year1 },
                { year: y0 - 2, contributions: year2 }
              ]
            };
          }
        }
      }
    } catch {
      // fall through to fallback
    }
  }

  // 2) Public SVG fallback (no auth): sum <rect data-count="..."> across each year
  async function yearTotalFromSVG(y: number): Promise<number> {
    const url = `https://github.com/users/${encodeURIComponent(
      username
    )}/contributions?from=${y}-01-01&to=${y}-12-31`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "text/html",
        "Cache-Control": "no-cache",
      },
    });
    if (!res.ok) throw new Error(`SVG fetch ${y} failed: ${res.status}`);
    const svg = await res.text();

    let total = 0;
    const re = /data-count="(\d+)"/g;
    for (const m of svg.matchAll(re)) {
      total += Number(m[1] || 0);
    }
    if (!Number.isFinite(total)) throw new Error("no counts found");
    return total;
  }

  try {
    const parts = await Promise.all(years.map((y) => yearTotalFromSVG(y)));
    const year0 = parts[0] || 0;
    const year1 = parts[1] || 0;
    const year2 = parts[2] || 0;
    const total = year0 + year1 + year2;
    
    if (Number.isFinite(total)) {
      return {
        year0,
        year1,
        year2,
        total,
        years: [
          { year: y0, contributions: year0 },
          { year: y0 - 1, contributions: year1 },
          { year: y0 - 2, contributions: year2 }
        ]
      };
    }
  } catch {
    // last resort below
  }

  // 3) Very last resort: try the profile overview pages and add the per-year headline numbers
  try {
    const patterns = [
      /([\d,]+)\s+contributions?\s+in\s+(\d{4})/i,
      />\s*([\d,]+)\s+contributions?\s+in\s+(\d{4})[^<]*</i,
    ];
    async function yearTotalFromOverview(y: number): Promise<{ year: number; contributions: number }> {
      const url = `https://github.com/${encodeURIComponent(
        username
      )}?tab=overview&from=${y}-12-01&to=${y}-12-31`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0",
          "Accept": "text/html,application/xhtml+xml",
          "Cache-Control": "no-cache",
        },
      });
      if (!res.ok) throw new Error(`overview fetch ${y} failed: ${res.status}`);
      const html = await res.text();
      for (const re of patterns) {
        const m = html.match(re);
        if (m?.[1] && m?.[2] && parseInt(m[2]) === y) {
          return { year: y, contributions: parseInt(m[1].replace(/,/g, ""), 10) || 0 };
        }
      }
      throw new Error("no headline match");
    }

    const parts = await Promise.allSettled(years.map((y) => yearTotalFromOverview(y)));
    const contributions = parts
      .filter(p => p.status === "fulfilled")
      .map((p: any) => p.value as { year: number; contributions: number });
    
    if (contributions.length > 0) {
      const year0 = contributions.find(c => c.year === y0)?.contributions || 0;
      const year1 = contributions.find(c => c.year === y0 - 1)?.contributions || 0;
      const year2 = contributions.find(c => c.year === y0 - 2)?.contributions || 0;
      const total = year0 + year1 + year2;
      
      if (Number.isFinite(total) && total > 0) {
        return {
          year0,
          year1,
          year2,
          total,
          years: contributions
        };
      }
    }
  } catch {
    // ignore
  }

  // If everything fails
  return {
    year0: 0,
    year1: 0,
    year2: 0,
    total: 0,
    years: [
      { year: y0, contributions: 0 },
      { year: y0 - 1, contributions: 0 },
      { year: y0 - 2, contributions: 0 }
    ]
  };
}



// ESM-safe axios import every time we need it
async function importAxios() {
  const { default: axios } = await import("axios");
  return axios;
}

// Fetch a text snapshot via Jina (much more reliable for LinkedIn public pages)
async function fetchViaJina(url: string): Promise<string> {
  const axios = await importAxios();
  const res = await axios.get("https://r.jina.ai/" + url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      "Accept": "text/plain;q=1.0,*/*;q=0.8",
    },
    timeout: 20000,
    validateStatus: () => true,
  });
  return (res.data ? String(res.data) : "").trim();
}

// Very small HTML/text parser for public LinkedIn snapshot
// Very small HTML/text parser for public LinkedIn snapshot (works for HTML OR plain text)
function parseLinkedInSnapshot(textOrHtml: string): {
  headline: string;
  description: string;
  location: string;
  skills: string[];
  experience: Array<{ company?: string; title?: string; description?: string }>;
  education: Array<{ school?: string; degree?: string }>;
} {
  const out = {
    headline: "",
    description: "",
    location: "",
    skills: [] as string[],
    experience: [] as Array<{ company?: string; title?: string; description?: string }>,
    education: [] as Array<{ school?: string; degree?: string }>,
  };

  const raw = (textOrHtml || "").trim();
  if (!raw) return out;

  const isHtml = /<html|<head|<meta|<title|<\/\w+>/i.test(raw);

  const stripTags = (s: string) =>
    s
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, "\n")
      .replace(/\u00A0/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{2,}/g, "\n")
      .trim();

  // Prefer HTML text if HTML; otherwise treat as plain text as-is.
  const text = isHtml ? stripTags(raw) : raw;

  // ---------- Headline / title ----------
  const pick = (re: RegExp) => re.exec(raw)?.[1]?.trim() || "";

  let headline =
    (isHtml && pick(/property="og:title"[^>]*content="([^"]+)"/i)) ||
    (isHtml && pick(/<title[^>]*>([^<]+)<\/title>/i)) ||
    ""; // last fallback from text below

  if (headline) {
    headline = headline.replace(/\s*\|\s*LinkedIn.*$/i, "").trim();
  } else {
    // Plain-text fallback: first non-empty line often contains "Name – Headline"
    const firstLine = (text.split("\n").map(s => s.trim()).find(Boolean) || "");
    headline = firstLine.replace(/\s*\|\s*LinkedIn.*$/i, "").trim();
  }

  out.headline = headline;

  // ---------- Summary / About ----------
  const aboutSec =
    (/(?:^|\n)\s*(About|Summary)\s*\n([\s\S]{0,2000})/i.exec(text)?.[2] || "")
      .split(/\n(?=[A-Z][A-Za-z ]{2,20}\s*$)/)[0] // stop at next ALL-CAPS-ish heading style
      .trim();

  out.description = aboutSec || "";

  // ---------- Location ----------
  // Try HTML-ish first:
  out.location =
    (isHtml && pick(/"location"\s*:\s*"([^"]+)"/i)) ||
    (isHtml && pick(/<span[^>]*class="[^"]*location[^"]*"[^>]*>([^<]+)<\/span>/i)) ||
    // Plain text variants:
    (/\bLocation\s*[:\-]\s*([^\n]+)\n/i.exec(text)?.[1]?.trim() ||
      /\bBased in\s*[:\-]?\s*([^\n]+)\n/i.exec(text)?.[1]?.trim() ||
      "");

  // ---------- Skills ----------
  // Handle "Skills" or "Top skills" sections in text. Stop on next major section keyword.
  const skillsBlock =
    (/(?:^|\n)\s*(Top skills|Skills)\s*\n([\s\S]{0,1500})/i.exec(text)?.[2] || "")
      .split(/\n\s*(Activity|Experience|Education|Licenses|Projects|Certifications|Publications)\b/i)[0] || "";

  if (skillsBlock) {
    const rawSkills = skillsBlock
      .replace(/Endorsements?.*/gi, "")
      .split(/[\n·|,\u2022]+/g)
      .map(s => s.trim())
      .filter(s => s && s.length <= 50 && !/^skills?$/i.test(s) && !/^\d+$/.test(s));

    out.skills = Array.from(new Set(rawSkills)).slice(0, 50);
  } else {
    out.skills = [];
  }

  // ---------- Experience ----------
  // Grab the Experience section and chunk it into roles.
  const expSec =
    (/(?:^|\n)\s*Experience\s*\n([\s\S]{0,4000})/i.exec(text)?.[1] || "")
      .split(/\n\s*(Education|Licenses|Projects|Skills|Activity|Volunteer)\b/i)[0] || "";

  if (expSec) {
    const lines = expSec.split("\n").map(s => s.trim()).filter(Boolean);
    let current: { title?: string; company?: string; description?: string } | null = null;

    const isTitleLine = (l: string) =>
      // Heuristics: "Senior X at Company", "Title — Company", "Title – Company"
      /\bat\b/.test(l) || /—|–|-/.test(l);

    for (const l of lines) {
      if (isTitleLine(l)) {
        // push previous
        if (current && (current.title || current.company || current.description)) {
          out.experience.push({ ...current });
        }
        // split title/company
        let title = l;
        let company = "";
        const atSplit = l.split(/\bat\b/i);
        if (atSplit.length >= 2) {
          title = atSplit[0].trim().replace(/[—–-]\s*$/,'');
          company = atSplit.slice(1).join(" at ").trim();
        } else {
          const dashSplit = l.split(/[—–-]/);
          if (dashSplit.length >= 2) {
            title = dashSplit[0].trim();
            company = dashSplit.slice(1).join(" - ").trim();
          }
        }
        current = { title, company, description: "" };
      } else if (current) {
        // likely dates/location/desc line; keep short
        if (!current.description) current.description = l;
        else if (current.description.length < 400) current.description += " " + l;
      }
    }
    if (current && (current.title || current.company || current.description)) {
      out.experience.push({ ...current });
    }
    out.experience = out.experience.slice(0, 10);
  }

  // ---------- Education ----------
  const eduSec =
    (/(?:^|\n)\s*Education\s*\n([\s\S]{0,2500})/i.exec(text)?.[1] || "")
      .split(/\n\s*(Experience|Licenses|Projects|Skills|Activity|Volunteer)\b/i)[0] || "";

  if (eduSec) {
    const lines = eduSec.split("\n").map(s => s.trim()).filter(Boolean);
    for (const l of lines) {
      // Simple heuristic: "School — Degree", "School - Degree"
      const parts = l.split(/[—–-]/);
      if (parts.length >= 2) {
        const school = parts[0].trim();
        const degree = parts.slice(1).join(" - ").trim();
        if (school && degree) out.education.push({ school, degree });
      } else if (/university|college|institute/i.test(l)) {
        out.education.push({ school: l, degree: "" });
      }
      if (out.education.length >= 6) break;
    }
  }

  return out;
}



    async function fetchProfileData(url: string): Promise<{ type: string; data: any } | null> {
      try {
        // Normalize URL first
        let normalizedUrl = url.trim()
        if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
          normalizedUrl = 'https://' + normalizedUrl
        }
        
        // Filter out malicious/spam links
        if (isMaliciousLink(normalizedUrl)) {
          console.warn(`Filtered malicious/spam link: ${normalizedUrl}`)
          return null
        }
        
        const urlObj = new URL(normalizedUrl)
        const host = urlObj.hostname.toLowerCase()
        const pathname = urlObj.pathname || ''
      
      // GitHub
      if (host.includes('github.com')) {
        // Match: github.com/username or github.com/@username
        const match = pathname.match(/^\/(?:@)?([a-zA-Z0-9](?:[a-zA-Z0-9]|-(?!-))*[a-zA-Z0-9]?)/i)
        if (match && match[1]) {
          const username = match[1].split('/')[0] // Take first part in case of /username/repo
          
          // Filter out generic/platform names that are not real usernames
          const invalidUsernames = ['github', 'github.com', 'www', 'about', 'features', 'blog', 'enterprise', 'pricing', 'support', 'login', 'signup', 'jobs', 'marketplace', 'explore', 'topics', 'trending', 'collections', 'events', 'sponsors', 'settings', 'new', 'organizations', 'repositories', 'stars', 'gists', 'leetcode', 'linkedin', 'geeksforgeeks', 'hackerrank', 'profile', 'profiles', 'javascript-centric']
          if (username && username !== 'www' && !username.includes('.') && !invalidUsernames.includes(username.toLowerCase())) {
            try {
              const response = await fetch(`https://api.github.com/users/${username}`, {
                headers: { 'Accept': 'application/vnd.github.v3+json' }
              })
              if (response.ok) {
                const userData = await response.json()
                const reposRes = await fetch(`https://api.github.com/users/${username}/repos?per_page=100&sort=updated`, {
                  headers: { 'Accept': 'application/vnd.github.v3+json' }
                })
                const repos = reposRes.ok ? await reposRes.json() : []
                
                // Get actual contributions from GitHub profile page (scrape contribution graph)
                let totalContributions = 0
                try {
                  // Scrape GitHub profile page to get actual contribution count
                  const profilePageRes = await fetch(`https://github.com/${username}`, {
                    headers: {
                      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                      'Accept-Language': 'en-US,en;q=0.9',
                      'Cache-Control': 'no-cache'
                    }
                  })
                  if (profilePageRes.ok) {
                    const html = await profilePageRes.text()
                    
                    // Pattern 1: Look for the exact contribution text format from GitHub
                    // GitHub displays: "134 contributions in 2024" or "X contributions in YYYY"
                    // Also: "X contributions in the last year"
                    const yearContribPatterns = [
                      // Exact match: "134 contributions in 2024" (from image example)
                      /(\d{1,6})\s+contributions?\s+in\s+\d{4}/i,
                      // "X contributions in the last year"
                      /(\d{1,6})\s+contributions?\s+in\s+(?:the\s+)?last\s+year/i,
                      // Inside HTML tags: >134 contributions in 2024<
                      />\s*(\d{1,6})\s+contributions?\s+in\s+\d{4}/i,
                      // In heading tags
                      /<h[1-6][^>]*>\s*(\d{1,6})\s+contributions?\s+in/i,
                      // In span or div with contribution text
                      /<(?:span|div|p)[^>]*>\s*(\d{1,6})\s+contributions?\s+in[^<]*<\/(?:span|div|p)>/i,
                      // General pattern with any tag
                      />(\d{1,6})\s+contributions?\s+in[^<]*</i,
                      // Pattern with commas: "1,234 contributions in 2024"
                      /([\d,]+)\s+contributions?\s+in\s+\d{4}/i
                    ]
                    
                    for (const pattern of yearContribPatterns) {
                      const match = html.match(pattern)
                      if (match && match[1]) {
                        // Remove commas and parse
                        const numStr = match[1].replace(/,/g, '').trim()
                        totalContributions = parseInt(numStr) || 0
                        if (totalContributions > 0) {
                          console.log(`GitHub contributions found: ${totalContributions} (pattern matched)`)
                          break
                        }
                      }
                    }
                    
                    // Pattern 2: Look in specific GitHub contribution graph section
                    // GitHub wraps contribution count in specific containers
                    if (totalContributions === 0) {
                      const contribSectionMatch = html.match(/<h2[^>]*class="[^"]*contributions?[^"]*"[^>]*>[\s\S]*?(\d{1,6})\s+contributions?[\s\S]*?<\/h2>/i)
                      if (contribSectionMatch && contribSectionMatch[1]) {
                        totalContributions = parseInt(contribSectionMatch[1].replace(/,/g, '')) || 0
                        if (totalContributions > 0) console.log(`GitHub contributions found in h2: ${totalContributions}`)
                      }
                    }
                    
                    // Pattern 3: Look in data attributes (GitHub stores contribution data)
                    if (totalContributions === 0) {
                      // Look for data-year attributes with contribution counts
                      const yearDataMatch = html.match(/data-year="\d{4}"[^>]*>[\s\S]*?(\d{1,6})\s+contributions?/i)
                      if (yearDataMatch && yearDataMatch[1]) {
                        totalContributions = parseInt(yearDataMatch[1].replace(/,/g, '')) || 0
                        if (totalContributions > 0) console.log(`GitHub contributions found in data attributes: ${totalContributions}`)
                      }
                    }
                    
                    // Pattern 4: Look for contribution count in JSON data structures
                    if (totalContributions === 0) {
                      // Try all JSON script tags
                      const jsonMatches = html.match(/<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/gi)
                      if (jsonMatches) {
                        for (const jsonScript of jsonMatches) {
                          try {
                            const jsonContent = jsonScript.replace(/<script[^>]*>|<\/script>/gi, '')
                            const parsed = JSON.parse(jsonContent)
                            // Search for contribution-related data more aggressively
                            const searchContrib = (obj: any, depth = 0): number => {
                              if (depth > 15) return 0 // Prevent infinite recursion
                              if (typeof obj === 'number' && obj >= 0 && obj <= 1000000) {
                                // Could be a contribution count (reasonable range)
                                return obj
                              }
                              if (typeof obj === 'object' && obj !== null) {
                                // Check common keys that GitHub might use
                                const contribKeys = [
                                  'contributions', 'totalContributions', 'contributionCount', 
                                  'total', 'count', 'year', 'totalContributions'
                                ]
                                for (const key of contribKeys) {
                                  if (obj[key] !== undefined) {
                                    if (typeof obj[key] === 'number' && obj[key] > 0 && obj[key] <= 1000000) {
                                      return obj[key]
                                    } else if (typeof obj[key] === 'string') {
                                      const numMatch = obj[key].match(/(\d{1,6})/)
                                      if (numMatch) {
                                        const num = parseInt(numMatch[1].replace(/,/g, ''))
                                        if (num > 0 && num <= 1000000) return num
                                      }
                                    }
                                  }
                                }
                                // Search recursively in arrays and objects
                                if (Array.isArray(obj)) {
                                  for (const item of obj) {
                                    const result = searchContrib(item, depth + 1)
                                    if (result > 0) return result
                                  }
                                } else {
                                  for (const key in obj) {
                                    if (key.toLowerCase().includes('contribut') || 
                                        key.toLowerCase().includes('activity') ||
                                        key.toLowerCase().includes('total')) {
                                      const result = searchContrib(obj[key], depth + 1)
                                      if (result > 0) return result
                                    }
                                  }
                                }
                              }
                              return 0
                            }
                            const contribCount = searchContrib(parsed)
                            if (contribCount > 0) {
                              totalContributions = contribCount
                              console.log(`GitHub contributions found in JSON: ${totalContributions}`)
                              break
                            }
                          } catch {}
                        }
                      }
                    }
                    
                    // Pattern 5: Sum contributions from calendar tooltips (fallback estimation)
                    // This is less accurate but can work if the exact count isn't found
                    if (totalContributions === 0) {
                      const tooltipMatches = html.match(/title="[^"]*(\d+)\s+contributions?/gi)
                      if (tooltipMatches && tooltipMatches.length > 0) {
                        // Sum all contributions mentioned in tooltips
                        let tooltipSum = 0
                        const uniqueContributions = new Set<number>()
                        tooltipMatches.forEach((tooltip: string) => {
                          const numMatch = tooltip.match(/(\d+)\s+contributions?/i)
                          if (numMatch) {
                            const num = parseInt(numMatch[1])
                            if (num > 0 && num < 100) { // Daily contributions should be reasonable
                              uniqueContributions.add(num)
                              tooltipSum += num
                            }
                          }
                        })
                        // If we have a reasonable sum (not too high), use it
                        if (tooltipSum > 0 && tooltipSum < 10000) {
                          totalContributions = tooltipSum
                          console.log(`GitHub contributions estimated from tooltips: ${totalContributions}`)
                        }
                      }
                    }
                  }
                } catch (e: any) {
                  console.error('GitHub contribution scraping error:', e.message)
                }
                
                // Fallback: Calculate from recent activity if scraping failed
                if (totalContributions === 0 && repos && repos.length > 0) {
                  // Use commits from recent repos as proxy
                  let recentCommits = 0
                  const recentRepos = repos.slice(0, 5) // Check top 5 repos
                  for (const repo of recentRepos) {
                    if (repo.updated_at) {
                      const updatedDate = new Date(repo.updated_at)
                      const sixMonthsAgo = new Date()
                      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
                      if (updatedDate > sixMonthsAgo) {
                        recentCommits += 10 // Estimate commits per active repo
                      }
                    }
                  }
                  if (recentCommits > 0) {
                    totalContributions = recentCommits * 12 // Extrapolate to year
                  } else {
                    totalContributions = userData.public_repos * 5 // Conservative fallback
                  }
                }
                
                // Ensure minimum value
                if (totalContributions === 0) {
                  totalContributions = userData.public_repos || 0
                }
                
                // Calculate total stars from repos
                const totalStars = repos.reduce((sum: number, r: any) => sum + (r.stargazers_count || 0), 0)
                const contributionsData = await getGithubContributionsByYear(username);
                console.log(`[${requestId}] GitHub contributions by year:`, contributionsData)
                
                return {
                  type: 'github',
                  data: {
                    username,
                    name: userData.name || username,
                    bio: userData.bio || '',
                    public_repos: userData.public_repos || 0,
                    followers: userData.followers || 0,
                    following: userData.following || 0,
                    total_contributions: contributionsData.total,
                    contributions_by_year: contributionsData.years,
                    year0_contributions: contributionsData.year0,
                    year1_contributions: contributionsData.year1,
                    year2_contributions: contributionsData.year2,
                    repos: repos.slice(0, 20).map((r: any) => ({
                      name: r.name,
                      description: r.description || '',
                      stars: r.stargazers_count || 0,
                      language: r.language || '',
                      updated: r.updated_at
                    })),
                    total_stars: totalStars
                  }
                }
              }
            } catch (e: any) {
              // Return basic info even if API fails
              return {
                type: 'github',
                data: {
                  username,
                  url: `https://github.com/${username}`
                }
              }
            }
          }
        }
      }
      
            // LinkedIn (single-path): canonicalize -> snapshot -> parse
            if (host.includes("linkedin.com")) {
              const prof = await getLinkedInProfile(normalizedUrl);
              return prof; // may be blocked:true; that's OK and safe
            }
      



      
      // LeetCode - extract username and scrape problem statistics
      if (host.includes('leetcode.com')) {
        // Match: leetcode.com/u/username, leetcode.com/profile/username
        let username = ''
        const match = pathname.match(/\/(?:u|profile)\/([^\/\?\s]+)/i)
        if (match && match[1]) {
          username = match[1].split('?')[0]
        } else {
          // Also try direct username in path: leetcode.com/username
          const directMatch = pathname.match(/^\/([a-zA-Z0-9](?:[a-zA-Z0-9]|-(?!-))*[a-zA-Z0-9]?)(?:\/|$)/i)
          if (directMatch && directMatch[1] && !['problems', 'contest', 'articles', 'explore', 'discuss'].includes(directMatch[1].toLowerCase())) {
            username = directMatch[1]
          }
        }
        
        // Filter out generic/platform names
        const invalidUsernames = ['leetcode', 'leetcode.com', 'www', 'problems', 'contest', 'articles', 'explore', 'discuss', 'login', 'signup', 'jobs', 'support', 'github', 'linkedin', 'geeksforgeeks', 'hackerrank', 'profile', 'profiles', 'geeksforgeeks', 'javascript-centric']
        if (username && !invalidUsernames.includes(username.toLowerCase())) {
          const profileUrl = `https://leetcode.com/u/${username}`
          let profileData: any = { username, url: profileUrl }
          
          // Try to scrape LeetCode profile for problem statistics
          try {
            // LeetCode uses GraphQL API - try to fetch stats
            const graphqlQuery = {
              query: `
                query userProfile($username: String!) {
                  matchedUser(username: $username) {
                    username
                    submitStats: submitStatsGlobal {
                      acSubmissionNum {
                        difficulty
                        count
                        submissions
                      }
                    }
                  }
                }
              `,
              variables: { username }
            }
            
            const apiRes = await fetch('https://leetcode.com/graphql', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0'
              },
              body: JSON.stringify(graphqlQuery)
            })
            
            if (apiRes.ok) {
              const data = await apiRes.json()
              if (data?.data?.matchedUser?.submitStats) {
                const stats = data.data.matchedUser.submitStats.acSubmissionNum
                profileData.total_solved = stats.find((s: any) => s.difficulty === 'All')?.count || 0
                profileData.easy_solved = stats.find((s: any) => s.difficulty === 'Easy')?.count || 0
                profileData.medium_solved = stats.find((s: any) => s.difficulty === 'Medium')?.count || 0
                profileData.hard_solved = stats.find((s: any) => s.difficulty === 'Hard')?.count || 0
              }
            }
          } catch {}
          
          return {
            type: 'leetcode',
            data: profileData
          }
        }
      }
      
      // GeeksforGeeks - extract username and scrape problem statistics
      if (host.includes('geeksforgeeks.org')) {
        const match = pathname.match(/\/(?:user|profile)\/([^\/\?\s]+)/i)
        if (match && match[1]) {
          const username = match[1].split('?')[0]
          // Filter out generic/platform names
          const invalidUsernames = ['geeksforgeeks', 'geeksforgeeks.org', 'www', 'practice', 'contribute', 'explore', 'login', 'signup', 'github', 'linkedin', 'leetcode', 'hackerrank', 'profile', 'profiles', 'javascript-centric', 'javascript', 'centric']
          // Also filter if username looks like generic text (all caps common words)
          const isGeneric = invalidUsernames.includes(username.toLowerCase()) || 
                           (username === username.toUpperCase() && username.length < 15) ||
                           username.toLowerCase() === 'user' ||
                           username.toLowerCase() === 'username'
          if (isGeneric) {
            return null
          }
          const profileUrl = `https://geeksforgeeks.org/user/${username}`
          let profileData: any = { username, url: profileUrl }
          
          // Try to scrape GeeksforGeeks profile for problem statistics
          try {
            const htmlRes = await fetch(profileUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html'
              }
            })
            if (htmlRes.ok) {
              const html = await htmlRes.text()
              
              // Extract total problems solved - look for "Problem Solved" or "Problems Solved"
              const totalSolvedMatch = html.match(/(?:problem|problems)\s+solved[^0-9]*(\d+)/i)
              if (totalSolvedMatch) {
                profileData.total_solved = parseInt(totalSolvedMatch[1]) || 0
              }
              
              // Extract difficulty breakdown - look for patterns like "EASY (318)", "MEDIUM (256)", "HARD (21)"
              const easyMatch = html.match(/EASY\s*\((\d+)\)/i) || html.match(/(?:easy)[^0-9]*\((\d+)\)/i)
              if (easyMatch) {
                profileData.easy_solved = parseInt(easyMatch[1]) || 0
              }
              
              const mediumMatch = html.match(/MEDIUM\s*\((\d+)\)/i) || html.match(/(?:medium)[^0-9]*\((\d+)\)/i)
              if (mediumMatch) {
                profileData.medium_solved = parseInt(mediumMatch[1]) || 0
              }
              
              const hardMatch = html.match(/HARD\s*\((\d+)\)/i) || html.match(/(?:hard)[^0-9]*\((\d+)\)/i)
              if (hardMatch) {
                profileData.hard_solved = parseInt(hardMatch[1]) || 0
              }
              
              // Also try to extract from the coding score section
              const codingScoreMatch = html.match(/coding\s+score[^0-9]*(\d+)/i)
              if (codingScoreMatch) {
                profileData.coding_score = parseInt(codingScoreMatch[1]) || 0
              }
              
              // If total solved is 0 but we have individual counts, sum them
              if (profileData.total_solved === 0 && (profileData.easy_solved || profileData.medium_solved || profileData.hard_solved)) {
                profileData.total_solved = (profileData.easy_solved || 0) + (profileData.medium_solved || 0) + (profileData.hard_solved || 0)
              }
            }
          } catch {}
          
          return {
            type: 'geeksforgeeks',
            data: profileData
          }
        }
      }
      
      // HackerRank
      if (host.includes('hackerrank.com')) {
        const match = pathname.match(/^\/([a-zA-Z0-9](?:[a-zA-Z0-9]|-(?!-))*[a-zA-Z0-9]?)(?:\/|$)/i)
        if (match && match[1] && !['dashboard', 'challenges', 'leaderboard'].includes(match[1].toLowerCase())) {
          return {
            type: 'hackerrank',
            data: {
              username: match[1],
              url: `https://hackerrank.com/${match[1]}`
            }
          }
        }
      }
      
      // Kaggle
      if (host.includes('kaggle.com')) {
        const match = pathname.match(/^\/([a-zA-Z0-9](?:[a-zA-Z0-9]|-(?!-))*[a-zA-Z0-9]?)(?:\/|$)/i)
        if (match && match[1] && !['datasets', 'code', 'discussions', 'competitions'].includes(match[1].toLowerCase())) {
          return {
            type: 'kaggle',
            data: {
              username: match[1],
              url: `https://kaggle.com/${match[1]}`
            }
          }
        }
      }
      
      // GitLab
      if (host.includes('gitlab.com')) {
        const match = pathname.match(/^\/([a-zA-Z0-9](?:[a-zA-Z0-9]|-(?!-))*[a-zA-Z0-9]?)(?:\/|$)/i)
        if (match && match[1] && !['explore', 'projects', 'groups'].includes(match[1].toLowerCase())) {
          return {
            type: 'gitlab',
            data: {
              username: match[1],
              url: `https://gitlab.com/${match[1]}`
            }
          }
        }
      }
      
      // Other platforms - return with original URL
      return {
        type: 'other',
        data: { url: normalizedUrl }
      }
    } catch {
      return null
    }
  }
  
    // Match profile skills/data against JD required skills
    function matchJDSkills(profileData: { type: string; data: any }, job: JobRequirements): string[] {
      const matchedSkills: string[] = []
      const requiredSkills = (job.requiredSkills || []).map(s => normalize(s))
      
      if (profileData.type === 'github') {
        const d = profileData.data
        // Match languages and technologies from repos
        const repoLanguages = (d.repos || []).map((r: any) => r.language).filter(Boolean).map((l: string) => normalize(l))
        requiredSkills.forEach(reqSkill => {
          const reqNorm = normalize(reqSkill)
          if (repoLanguages.some((lang: string) => lang.includes(reqNorm) || reqNorm.includes(lang))) {
            matchedSkills.push(reqSkill)
          }
        })
        // Match from bio
        if (d.bio) {
          requiredSkills.forEach(reqSkill => {
            if (normalize(d.bio).includes(normalize(reqSkill))) {
              if (!matchedSkills.includes(reqSkill)) matchedSkills.push(reqSkill)
            }
          })
        }
      } else if (profileData.type === 'linkedin') {
        const d = profileData.data
        // Match LinkedIn skills against JD
        if (d.skills && Array.isArray(d.skills)) {
          const profileSkills = d.skills.map((s: string) => normalize(s))
          requiredSkills.forEach(reqSkill => {
            const reqNorm = normalize(reqSkill)
            if (profileSkills.some((ps: string) => ps.includes(reqNorm) || reqNorm.includes(ps))) {
              matchedSkills.push(reqSkill)
            }
          })
        }
      } else if (profileData.type === 'leetcode' || profileData.type === 'geeksforgeeks') {
        // Coding platforms - match if JD requires algorithms, data structures, problem-solving
        const codingKeywords = ['algorithm', 'data structure', 'problem solving', 'competitive programming', 'leetcode', 'coding']
        requiredSkills.forEach(reqSkill => {
          const reqNorm = normalize(reqSkill)
          if (codingKeywords.some(keyword => reqNorm.includes(normalize(keyword)))) {
            matchedSkills.push(reqSkill)
          }
        })
      }
      
      return [...new Set(matchedSkills)] // Dedupe
    }

    // Analyze individual profile against JD
    async function analyzeProfile(profileUrl: string, profileData: { type: string; data: any }, job: JobRequirements): Promise<{ points: number; analysis: string; details: string; matchedSkills: string[] }> {
    try {
      // Match JD skills first
      const matchedSkills = matchJDSkills(profileData, job)
      
      if (checkRateLimitCooldown() && consecutiveRateLimits < MAX_CONSECUTIVE_RATE_LIMITS) {
        let prompt = ''
        let context = ''
        
        if (profileData.type === 'github') {
          const d = profileData.data
          context = `GitHub Profile:
- Username: ${d.username}
- Name: ${d.name}
- Bio: ${d.bio || 'N/A'}
- Public Repositories: ${d.public_repos}
- Total Contributions: ${d.total_contributions || 0}
- Stars Received: ${d.total_stars}
- Followers: ${d.followers}
- Following: ${d.following}
- Top Repositories: ${d.repos?.slice(0, 5).map((r: any) => `${r.name} (${r.stars} stars, ${r.language || 'N/A'})`).join(', ') || 'N/A'}
- Technologies Used: ${[...new Set((d.repos || []).map((r: any) => r.language).filter(Boolean))].join(', ') || 'N/A'}`
          prompt = `Analyze this GitHub profile against the JD requirements. Consider repository quality, contribution activity (${d.total_contributions || 0} total contributions), relevant technologies, and overall coding profile.`
        } else if (profileData.type === 'linkedin') {
          const d = profileData.data
          
          // Console log LinkedIn data being analyzed
          console.log('=== Analyzing LinkedIn Profile ===')
          console.log('Profile Data:', JSON.stringify(d, null, 2))
          console.log('Job Requirements:', JSON.stringify({
            requiredSkills: job.requiredSkills?.slice(0, 10),
            jobDescription: job.jobDescription?.substring(0, 200)
          }, null, 2))
          
          const skillsList = d.skills && d.skills.length > 0 ? d.skills.slice(0, 50).join(', ') : 'None found'
          const experienceList = d.experience && d.experience.length > 0 
            ? d.experience.map((exp: any, idx: number) => `${idx + 1}. ${exp.title || 'N/A'} at ${exp.company || 'N/A'}${exp.description ? ` - ${exp.description.substring(0, 100)}` : ''}`).join('\n')
            : 'None found'
          const educationList = d.education && d.education.length > 0
            ? d.education.map((edu: any, idx: number) => `${idx + 1}. ${edu.degree || 'N/A'} from ${edu.school || 'N/A'}`).join('\n')
            : 'None found'
          
          // Build comprehensive context
          const jobSkillsList = job.requiredSkills && job.requiredSkills.length > 0 
            ? job.requiredSkills.slice(0, 30).join(', ')
            : 'Not specified'
          
          context = `COMPLETE LINKEDIN PROFILE INFORMATION:

BASIC INFORMATION:
- LinkedIn Username: ${d.username}
- Profile URL: ${d.url || profileUrl}
- Professional Headline/Title: ${d.headline || 'Not provided'}
- Profile Summary/Description: ${d.description || 'Not provided'}
- Location: ${d.location || 'Not provided'}

SKILLS (${d.skills?.length || 0} total):
${d.skills && d.skills.length > 0 ? d.skills.map((s: string, idx: number) => `${idx + 1}. ${s}`).join('\n') : 'No skills found'}

WORK EXPERIENCE (${d.experience?.length || 0} positions):
${experienceList}

EDUCATION (${d.education?.length || 0} entries):
${educationList}

JOB DESCRIPTION REQUIREMENTS:
Required Skills: ${jobSkillsList}
Job Description: ${job.jobDescription ? job.jobDescription.substring(0, 800) : 'Not provided'}
Required Experience Level: ${(job as any).experienceLevel || 'Not specified'}
Required Education: ${(job as any).education || 'Not specified'}

TASK:
Analyze this LinkedIn profile comprehensively and determine its importance and relevance to the job description.`
          
          prompt = `You are an expert technical recruiter analyzing a LinkedIn profile against a Job Description (JD).

LINKEDIN PROFILE COMPLETE DATA:
${context}

ANALYSIS REQUIREMENTS:
Provide a comprehensive analysis that includes:

1. PROFILE COMPLETENESS ASSESSMENT:
   - How complete is this LinkedIn profile? (Skills, experience, education, headline, description)
   - Rate the profile quality and professionalism (1-10)
   - Note any missing critical information

2. SKILLS MATCHING ANALYSIS:
   - List all skills from the profile that match JD requirements
   - Identify the percentage of JD skills covered
   - Highlight which required skills are missing
   - Rate skill relevance (1-10)

3. EXPERIENCE RELEVANCE:
   - Analyze if the candidate's work experience aligns with JD requirements
   - Assess if job titles and companies indicate relevant background
   - Determine if experience level matches JD expectations
   - Rate experience relevance (1-10)

4. EDUCATION RELEVANCE:
   - Check if education matches or exceeds JD requirements
   - Assess if educational background is relevant for the role
   - Rate education relevance (1-10)

5. OVERALL JD ALIGNMENT & IMPORTANCE:
   - Provide an overall assessment of how well this LinkedIn profile matches the JD
   - Explain the IMPORTANCE of this LinkedIn profile for evaluating this candidate
   - Highlight key strengths that make this profile valuable
   - Identify critical gaps or concerns
   - Rate overall fit (1-10)

6. RECOMMENDATION:
   - Should this LinkedIn profile influence the hiring decision? Why or why not?
   - What specific information from LinkedIn is most valuable for the JD?
   - What additional information would be helpful to gather?

Provide a detailed, structured analysis (8-10 sentences) that clearly explains:
- The complete information available in the LinkedIn profile
- How each aspect (skills, experience, education) relates to the JD
- The IMPORTANCE and VALUE of this LinkedIn profile for making a hiring decision
- Specific recommendations based on the profile analysis

Return your analysis in this JSON format:
{
  "points": <0-4, where 0=not relevant, 4=highly relevant>,
  "analysis": "<detailed analysis explaining importance and JD alignment>",
  "details": "<summary of key profile information>"
}`
        } else if (profileData.type === 'leetcode') {
          const d = profileData.data
          context = `LeetCode Profile:
- Username: ${d.username}
- Total Problems Solved: ${d.total_solved || 0}
- Easy Problems: ${d.easy_solved || 0}
- Medium Problems: ${d.medium_solved || 0}
- Hard Problems: ${d.hard_solved || 0}
- Profile URL: ${d.url}`
          prompt = `Analyze this LeetCode profile against the JD. Consider problem-solving skills (${d.total_solved || 0} problems solved: ${d.easy_solved || 0} easy, ${d.medium_solved || 0} medium, ${d.hard_solved || 0} hard), algorithm/data structure knowledge, and coding practice.`
        } else if (profileData.type === 'geeksforgeeks') {
          const d = profileData.data
          const codingScore = d.coding_score ? `\n- Coding Score: ${d.coding_score}` : ''
          context = `GeeksforGeeks Profile:
- Username: ${d.username}
- Total Problems Solved: ${d.total_solved || 0}
- Easy Problems: ${d.easy_solved || 0}
- Medium Problems: ${d.medium_solved || 0}
- Hard Problems: ${d.hard_solved || 0}${codingScore}
- Profile URL: ${d.url || profileUrl}`
          prompt = `Analyze this GeeksforGeeks profile against the JD. Consider competitive programming skills, problem-solving ability (${d.total_solved || 0} total problems: ${d.easy_solved || 0} easy, ${d.medium_solved || 0} medium, ${d.hard_solved || 0} hard${d.coding_score ? `, coding score ${d.coding_score}` : ''}), and technical knowledge alignment with JD requirements.`
        } else if (profileData.type === 'hackerrank') {
          const d = profileData.data
          context = `HackerRank Profile:
- Username: ${d.username}
- Profile URL: ${d.url || profileUrl}`
          prompt = `Analyze this HackerRank profile against the JD. Consider problem-solving skills, coding challenges completed, and technical competency.`
        } else if (profileData.type === 'kaggle') {
          const d = profileData.data
          context = `Kaggle Profile:
- Username: ${d.username}
- Profile URL: ${d.url || profileUrl}`
          prompt = `Analyze this Kaggle profile against the JD. Consider data science projects, competitions, datasets contributions, and machine learning expertise.`
        } else if (profileData.type === 'gitlab') {
          const d = profileData.data
          context = `GitLab Profile:
- Username: ${d.username}
- Profile URL: ${d.url || profileUrl}`
          prompt = `Analyze this GitLab profile against the JD. Consider code contributions, project activity, and development experience.`
        } else {
          context = `Profile URL: ${profileUrl}`
          prompt = `Analyze this profile link against the JD requirements.`
        }
        
        const user = `${prompt}

${context}

JD Requirements:
- Job Title: ${job.jobTitle}
- Required Skills: ${job.requiredSkills.join(', ')}
- Matched Skills from Profile: ${matchedSkills.length > 0 ? matchedSkills.join(', ') : 'None'}

Return JSON: {"points": 0-4, "analysis": "how this profile helps fit the JD", "details": "specific metrics or highlights from the profile"}

Award more points (3-4) if the profile demonstrates strong alignment with JD skills and requirements. Award fewer points (0-2) if the profile is less relevant.`
        
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          temperature: 0.2,
          max_tokens: 400,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: 'You are a technical recruiter analyzing candidate profiles. Return valid JSON only.' },
            { role: 'user', content: user }
          ]
        })
        
        let content = completion.choices?.[0]?.message?.content || '{}'
        content = cleanJsonString(content.trim())
        const parsed = JSON.parse(content)
        
        // Award bonus points for matched skills (up to +1 point)
        let points = Math.max(0, Math.min(4, Number(parsed.points) || 0))
        if (matchedSkills.length > 0) {
          points = Math.min(4, points + Math.min(1, matchedSkills.length * 0.2)) // +0.2 per matched skill, max +1
        }
        
        // Ensure details is a string, not an object
        let detailsText = ''
        if (parsed.details) {
          if (typeof parsed.details === 'object') {
            detailsText = JSON.stringify(parsed.details, null, 2)
          } else {
            detailsText = String(parsed.details)
          }
        }
        
        // Build profile-specific details string
        if (profileData.type === 'github' && profileData.data) {
          const d = profileData.data
          const technologies = [...new Set((d.repos || []).map((r: any) => r.language).filter(Boolean))]
          detailsText = `Username: ${d.username}\nName: ${d.name || 'N/A'}\nPublic Repositories: ${d.public_repos || 0}\nTotal Contributions: ${d.total_contributions || 0}\nStars Received: ${d.total_stars || 0}\nFollowers: ${d.followers || 0}\nFollowing: ${d.following || 0}\nTechnologies Used: ${technologies.length > 0 ? technologies.join(', ') : 'N/A'}`
        } else if (profileData.type === 'linkedin' && profileData.data) {
          const d = profileData.data
          
          // Build comprehensive LinkedIn details
          let linkedinDetails = `LinkedIn Username: ${d.username}\n`
          linkedinDetails += `Profile URL: ${d.url || 'N/A'}\n`
          linkedinDetails += `Headline: ${d.headline || 'Not provided'}\n`
          linkedinDetails += `Location: ${d.location || 'Not provided'}\n\n`
          
          if (d.description) {
            linkedinDetails += `Summary:\n${d.description.substring(0, 300)}${d.description.length > 300 ? '...' : ''}\n\n`
          }
          
          if (d.skills && d.skills.length > 0) {
            linkedinDetails += `Skills (${d.skills.length} total):\n`
            d.skills.slice(0, 30).forEach((skill: string, idx: number) => {
              linkedinDetails += `${idx + 1}. ${skill}\n`
            })
            if (d.skills.length > 30) {
              linkedinDetails += `... and ${d.skills.length - 30} more skills\n`
            }
            linkedinDetails += '\n'
          } else {
            linkedinDetails += `Skills: No skills found\n\n`
          }
          
          if (d.experience && d.experience.length > 0) {
            linkedinDetails += `Work Experience (${d.experience.length} positions):\n`
            d.experience.slice(0, 10).forEach((exp: any, idx: number) => {
              linkedinDetails += `${idx + 1}. ${exp.title || 'N/A'} at ${exp.company || 'N/A'}`
              if (exp.description) {
                linkedinDetails += `\n   ${exp.description.substring(0, 150)}${exp.description.length > 150 ? '...' : ''}`
              }
              linkedinDetails += '\n'
            })
            linkedinDetails += '\n'
          } else {
            linkedinDetails += `Work Experience: Not found\n\n`
          }
          
          if (d.education && d.education.length > 0) {
            linkedinDetails += `Education (${d.education.length} entries):\n`
            d.education.slice(0, 10).forEach((edu: any, idx: number) => {
              linkedinDetails += `${idx + 1}. ${edu.degree || 'N/A'} from ${edu.school || 'N/A'}\n`
            })
          } else {
            linkedinDetails += `Education: Not found`
          }
          
          detailsText = linkedinDetails
          
          // Console log the details being returned
          console.log('=== LinkedIn Profile Details Being Returned ===')
          console.log(detailsText)
          console.log('===============================================')
        } else if (profileData.type === 'leetcode' && profileData.data) {
          const d = profileData.data
          detailsText = `Username: ${d.username}\nTotal Problems Solved: ${d.total_solved || 0}\nBreakdown: Easy ${d.easy_solved || 0} | Medium ${d.medium_solved || 0} | Hard ${d.hard_solved || 0}`
        } else if (profileData.type === 'geeksforgeeks' && profileData.data) {
          const d = profileData.data
          const scoreLine = d.coding_score ? `\nCoding Score: ${d.coding_score}` : ''
          detailsText = `Username: ${d.username}\nTotal Problems Solved: ${d.total_solved || 0}\nBreakdown: Easy ${d.easy_solved || 0} | Medium ${d.medium_solved || 0} | Hard ${d.hard_solved || 0}${scoreLine}`
        }
        
        return {
          points: Math.round(points * 10) / 10, // Round to 1 decimal
          analysis: String(parsed.analysis || '').slice(0, 500),
          details: detailsText.slice(0, 500),
          matchedSkills
        }
      }
    } catch (e: any) {
      if (e?.status === 429 || e?.message?.includes('rate limit')) recordRateLimit()
    }
    
    return { points: 0, analysis: 'Analysis unavailable', details: '', matchedSkills: [] }
  }
  
    async function analyzeProjectsAndProfiles(projects: Array<{ title: string; description: string }>, links: Array<{ url: string }>, job: JobRequirements) {
      let projectPoints = 0
      let profilePoints = 0
      let projectAnalysis = ''
      let profileAnalysis = ''
      const projectsWithAnalysis: Array<{ title: string; description: string; helpfulness?: string; points?: number }> = []
      const profilesWithAnalysis: Array<{ url: string; type: string; data: any; points: number; analysis: string; details: string; matchedSkills?: string[]; contributionPoints?: number }> = []
      let linkedInUrl: string | null = null // Store LinkedIn URL for async analysis
      
      if ((projects && projects.length > 0) || (links && links.length > 0)) {
        if (checkRateLimitCooldown() && consecutiveRateLimits < MAX_CONSECUTIVE_RATE_LIMITS) {
          try {
          // Analyze each project individually
          if (projects && projects.length > 0) {
            for (const proj of projects) {
              try {
                const user = `Evaluate how this specific project helps the candidate fit for this JD. Be concise (max 100 words).\n\nJD: ${job.jobTitle}\nRequired Skills: ${job.requiredSkills.join(', ')}\n\nProject: "${proj.title}"\nDescription: ${proj.description}\n\nReturn JSON: {"points": 0-3, "helpfulness": "brief explanation of why this project is helpful or not"}`
                const completion = await openai.chat.completions.create({
                  model: 'gpt-4o-mini',
                  temperature: 0.2,
                  max_tokens: 200,
                  response_format: { type: 'json_object' },
                  messages: [
                    { role: 'system', content: 'You are a concise recruiting assistant. Return valid JSON only.' },
                    { role: 'user', content: user }
                  ]
                })
                let content = completion.choices?.[0]?.message?.content || '{}'
                content = cleanJsonString(content.trim())
                const parsed = JSON.parse(content)
                const pts = Math.max(0, Math.min(3, Number(parsed.points) || 0))
                const helpful = String(parsed.helpfulness || 'Not relevant to JD requirements.').slice(0, 300)
                projectPoints += pts
                projectsWithAnalysis.push({ ...proj, helpfulness: helpful, points: pts })
                // Reduced delay for faster processing
                await new Promise(resolve => setTimeout(resolve, 100))
              } catch (e: any) {
                if (e?.status === 429 || e?.message?.includes('rate limit')) {
                  recordRateLimit()
                  break
                }
                projectsWithAnalysis.push({ ...proj, helpfulness: 'Analysis unavailable', points: 0 })
              }
            }
          }
          
          // Analyze each profile individually
          if (links && links.length > 0) {
            // Filter out invalid/generic profile links before processing
            const validLinks = links.filter(link => {
              if (!link.url) return false
              try {
                const urlObj = new URL(link.url.startsWith('http') ? link.url : 'https://' + link.url)
                const host = urlObj.hostname.toLowerCase()
                const pathname = urlObj.pathname || ''
                
                // Filter out generic/platform names in URLs
                if (host.includes('github.com')) {
                  const username = pathname.split('/')[1] || ''
                  const invalidUsernames = ['github', 'leetcode', 'linkedin', 'geeksforgeeks', 'hackerrank', 'about', 'features', 'blog', 'enterprise', 'profile', 'profiles', 'javascript-centric']
                  const isGeneric = invalidUsernames.includes(username.toLowerCase()) || 
                                   (username === username.toUpperCase() && username.length < 12)
                  if (isGeneric) return false
                }
                if (host.includes('leetcode.com')) {
                  const username = pathname.match(/\/(?:u|profile)\/([^\/\?\s]+)/)?.[1] || pathname.split('/')[1] || ''
                  const invalidUsernames = ['leetcode', 'geeksforgeeks', 'github', 'linkedin', 'hackerrank', 'problems', 'contest', 'profile', 'profiles', 'javascript-centric']
                  const isGeneric = invalidUsernames.includes(username.toLowerCase()) || 
                                   (username === username.toUpperCase() && username.length < 12)
                  if (isGeneric) return false
                }
                if (host.includes('geeksforgeeks.org')) {
                  const username = pathname.match(/\/(?:user|profile)\/([^\/\?\s]+)/)?.[1] || ''
                  const invalidUsernames = ['geeksforgeeks', 'leetcode', 'github', 'linkedin', 'hackerrank', 'practice', 'profile', 'profiles', 'javascript-centric', 'javascript', 'centric']
                  const isGeneric = invalidUsernames.includes(username.toLowerCase()) || 
                                   (username === username.toUpperCase() && username.length < 12) ||
                                   username.toLowerCase() === 'user' ||
                                   username.toLowerCase() === 'username'
                  if (isGeneric) return false
                }
                if (host.includes('linkedin.com')) {
                  const username = pathname.match(/\/(?:in|pub)\/([^\/\?\s]+)/)?.[1] || ''
                  const invalidUsernames = ['profile', 'profiles', 'jobs', 'company', 'github', 'leetcode', 'geeksforgeeks', 'javascript-centric']
                  const isGeneric = invalidUsernames.includes(username.toLowerCase()) || 
                                   (username === username.toUpperCase() && username.length < 12)
                  if (isGeneric) return false
                }
                
                return true
              } catch {
                return false
              }
            })
            
            // Limit to ONE LinkedIn profile per resume (first LinkedIn found only)
            // SKIP LinkedIn analysis here - will be done async after main results
            const linkedInLinks = validLinks.filter(link => link.url && link.url.includes('linkedin.com'))
            const otherLinks = validLinks.filter(link => !link.url || !link.url.includes('linkedin.com'))
            
            // Store LinkedIn URL for async analysis (don't analyze now)
            if (linkedInLinks.length > 0) {
              linkedInUrl = linkedInLinks[0].url // Store first LinkedIn URL for async analysis
            }
            
            // Filter to keep only ONE GitHub profile per resume (first GitHub found only)
            const githubLinks = otherLinks.filter(link => link.url && link.url.includes('github.com'))
            const nonGithubLinks = otherLinks.filter(link => !link.url || !link.url.includes('github.com'))
            
            // Process ONE GitHub profile first (if exists)
            let githubProfileProcessed = false
            if (githubLinks.length > 0 && !githubProfileProcessed) {
              try {
                const githubLink = githubLinks[0] // Take first GitHub profile only
                const profileData = await fetchProfileData(githubLink.url)
                if (profileData && profileData.type === 'github') {
                  const normalizedUrl = (profileData.data && profileData.data.url) || githubLink.url
                  const finalUrl = normalizedUrl.startsWith('http://') || normalizedUrl.startsWith('https://') 
                    ? normalizedUrl 
                    : 'https://' + normalizedUrl
                  
                  // Add contribution-based points
                  const contribData = profileData.data
                  let contribPoints = 0
                  if (contribData && contribData.total_contributions) {
                    const totalContrib = contribData.total_contributions || 0
                    // Award points based on total contributions (last 3 years)
                    if (totalContrib >= 2000) contribPoints = 3.0 // Very high activity
                    else if (totalContrib >= 1000) contribPoints = 2.5 // High activity
                    else if (totalContrib >= 500) contribPoints = 2.0 // Good activity
                    else if (totalContrib >= 200) contribPoints = 1.5 // Moderate activity
                    else if (totalContrib >= 100) contribPoints = 1.0 // Some activity
                    else if (totalContrib >= 50) contribPoints = 0.5 // Low activity
                  }
                  
                  const analysis = await analyzeProfile(finalUrl, profileData, job)
                  // Add contribution points to analysis points
                  const totalPoints = analysis.points + contribPoints
                  profilePoints += totalPoints
                  githubProfileProcessed = true
                  
                  profilesWithAnalysis.push({
                    url: finalUrl,
                    type: profileData.type,
                    data: profileData.data,
                    points: totalPoints,
                    contributionPoints: contribPoints,
                    analysis: analysis.analysis,
                    details: analysis.details,
                    matchedSkills: analysis.matchedSkills || []
                  })
                  // Reduced delay for faster processing
                  await new Promise(resolve => setTimeout(resolve, 100))
                }
              } catch (e: any) {
                if (e?.status === 429 || e?.message?.includes('rate limit')) {
                  recordRateLimit()
                } else {
                  console.warn(`[${requestId}] GitHub profile analysis failed:`, e?.message || '')
                }
              }
            }
            
            // Process other profiles (non-GitHub, non-LinkedIn) - limit to 4 for performance
            const nonGithubLinksLimited = nonGithubLinks.slice(0, 4)
            for (const link of nonGithubLinksLimited) {
              try {
                const profileData = await fetchProfileData(link.url)
                if (profileData) {
                  const normalizedUrl = (profileData.data && profileData.data.url) || link.url
                  const finalUrl = normalizedUrl.startsWith('http://') || normalizedUrl.startsWith('https://') 
                    ? normalizedUrl 
                    : 'https://' + normalizedUrl
                  const analysis = await analyzeProfile(finalUrl, profileData, job)
                  profilePoints += analysis.points
                  profilesWithAnalysis.push({
                    url: finalUrl,
                    type: profileData.type,
                    data: profileData.data,
                    points: analysis.points,
                    analysis: analysis.analysis,
                    details: analysis.details,
                    matchedSkills: analysis.matchedSkills || []
                  })
                  // Reduced delay for faster processing
                  await new Promise(resolve => setTimeout(resolve, 100))
                }
              } catch (e: any) {
                if (e?.status === 429 || e?.message?.includes('rate limit')) {
                  recordRateLimit()
                  break
                }
                // Skip failed profiles without retry
                console.warn(`[${requestId}] Profile analysis failed for ${link.url}:`, e?.message || '')
              }
            }
            profileAnalysis = profilesWithAnalysis.length > 0 
              ? `Found ${profilesWithAnalysis.length} profile(s); total points: ${profilePoints}`
              : ''
          }
          
          projectAnalysis = projectsWithAnalysis.length > 0 
            ? `Found ${projectsWithAnalysis.length} project(s); total points: ${projectPoints}`
            : ''
          recordSuccess()
        } catch (e: any) {
          if (e?.status === 429 || e?.message?.includes('rate limit')) recordRateLimit()
          // Fallback: add projects without analysis
          projects.forEach(p => projectsWithAnalysis.push({ ...p, helpfulness: 'Analysis unavailable', points: 0 }))
          // Fallback: add profiles without analysis
          links.forEach(l => {
            // Normalize URL
            let normalizedUrl = l.url
            if (normalizedUrl && !normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
              normalizedUrl = 'https://' + normalizedUrl
            }
            profilesWithAnalysis.push({
              url: normalizedUrl,
              type: 'unknown',
              data: {},
              points: 0,
              analysis: 'Analysis unavailable',
              details: '',
              matchedSkills: []
            })
          })
        }
      } else {
        // Fallback: add projects without analysis if rate limited
        projects.forEach(p => projectsWithAnalysis.push({ ...p, helpfulness: 'Analysis unavailable', points: 0 }))
        // Fallback: add profiles without analysis
        links.forEach(l => {
          // Normalize URL
          let normalizedUrl = l.url
          if (normalizedUrl && !normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
            normalizedUrl = 'https://' + normalizedUrl
          }
          profilesWithAnalysis.push({
            url: normalizedUrl,
            type: 'unknown',
            data: {},
            points: 0,
            analysis: 'Analysis unavailable',
            details: '',
            matchedSkills: []
          })
        })
      }
    }
      return { projectPoints, profilePoints, projectAnalysis, profileAnalysis, projectsWithAnalysis, profilesWithAnalysis, linkedInUrl }
    }
    function expandTag(tag: string): string[] {
      const norm = normalize(tag)
      const list = SYNONYMS[norm] || []
      return Array.from(new Set([norm, ...list.map(normalize)]))
    }
    function containsWord(text: string, phrase: string): boolean {
      const p = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      const re = new RegExp(`(^|[^a-z0-9])${p}([^a-z0-9]|$)`, "i")
      return re.test(text)
    }
    // ULTRA-STRICT skill extraction - only skills that are ACTUALLY mentioned in the text
    function extractSkillsFromText(text: string): Set<string> {
      const skills = new Set<string>()
      const normText = normalize(text)
      
      // Only extract skills that are DIRECTLY mentioned in the text
      // Use STRICT word boundary matching to prevent false positives
      for (const [skillKey, relation] of Object.entries(TAG_ONTOLOGY)) {
      if (!relation || typeof relation !== 'object') continue
      
      // Get all variants that could represent this skill
      const allVariants = [
        skillKey,
        ...(Array.isArray(relation.exact) ? relation.exact : []),
      ].filter(s => s && typeof s === 'string' && s.length >= 2) // Minimum length check
      
      // Check if ANY variant actually appears in the text (ULTRA-STRICT match)
      let found = false
      for (const variant of allVariants) {
        const variants = expandTag(variant)
        // Use strict word boundary regex for all matches
        const strictMatch = variants.some(v => {
          if (!v || v.length < 2) return false
          // Require word boundary - prevents substring false matches
          const escaped = v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
          const re = new RegExp(`\\b${escaped}\\b`, 'i')
          return re.test(normText)
        })
        if (strictMatch) {
          found = true
          break
        }
      }
      
      // Only add if we found direct text evidence with strict matching
      if (found) {
        skills.add(skillKey)
      }
    }
    
    return skills
  }

    // SIMPLE and STRICT: Check if tag appears in text - NO context matching, just exact presence
    function tagExistsInText(tag: string, text: string): boolean {
      const normText = normalize(text)
      const tagOntology = findSkillInOntology(tag)
    const allVariants = tagOntology ? [
      tag,
      ...(Array.isArray(tagOntology.exact) ? tagOntology.exact : []),
    ].filter(s => s && typeof s === 'string' && s.length >= 2) : [tag]
    
    for (const variant of allVariants) {
      const variants = expandTag(variant)
      
      for (const v of variants) {
        if (!v || v.length < 2) continue
        
        // STRICT word boundary match - no context, just presence
        const escaped = v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        const re = new RegExp(`\\b${escaped}\\b`, 'i')
        
        if (re.test(normText)) {
          return true // Found with word boundary
        }
      }
    }
    
    return false // Not found
  }

    async function keywordCoverage(
      text: string,
    tags: string[],
    veryMust?: string[]
  ): Promise<{ matched: string[]; missing: string[]; coverage: number; veryMustOk: boolean; confidence: number }> {
      // Validate inputs
      if (!text || typeof text !== 'string' || text.trim().length < 20) {
        return { matched: [], missing: tags || [], coverage: 0, veryMustOk: false, confidence: 0 }
      }
      
      if (!tags || !Array.isArray(tags) || tags.length === 0) {
        return { matched: [], missing: [], coverage: 1, veryMustOk: true, confidence: 1.0 }
      }
      
      const normText = normalize(text)
    const matched: string[] = []
    const missing: string[] = []
    const matchDetails: Array<{ tag: string; confidence: number; method: string; mentions: string[] }> = []
    const validTags = tags.filter(t => t && typeof t === 'string' && t.trim().length > 0)

    // Extract all skills found in the resume text using strict extraction
    const extractedSkills = extractSkillsFromText(text)

    // ULTRA-STRICT matching: Tag must be BOTH in text AND in extracted skills
    for (const t of validTags) {
      try {
        // STEP 1: Must exist in text (strict word boundary)
        const existsInText = tagExistsInText(t, text)
        if (!existsInText) {
          missing.push(t)
          continue
        }
        
        // STEP 2: Must also be in extracted skills (double verification)
        const tagOntology = findSkillInOntology(t)
        const allTagVariants = tagOntology ? [
          t,
          ...(Array.isArray(tagOntology.exact) ? tagOntology.exact : []),
        ].filter(s => s && typeof s === 'string').map(s => normalize(s)) : [normalize(t)]
        
        const inExtractedSkills = Array.from(extractedSkills).some(extractedSkill => {
          const extractedNorm = normalize(extractedSkill)
          if (allTagVariants.includes(extractedNorm)) return true
          
          const extractedOntology = findSkillInOntology(extractedSkill)
          if (extractedOntology) {
            const extractedVariants = [
              extractedSkill,
              ...(Array.isArray(extractedOntology.exact) ? extractedOntology.exact : []),
            ].map(s => normalize(s))
            return allTagVariants.some(tv => extractedVariants.includes(tv))
          }
          return false
        })
        
        // ONLY match if BOTH conditions are true
        if (existsInText && inExtractedSkills) {
          matched.push(t)
          matchDetails.push({ 
            tag: t, 
            confidence: 0.9, // High confidence when both checks pass
            method: 'text-verified',
            mentions: []
          })
        } else {
          // Exists in text but not in extracted skills - might be false positive, don't match
          missing.push(t)
        }
      } catch (e) {
        missing.push(t)
      }
    }

    // STRICT veryMust validation - require ALL veryMust tags to be BOTH in text AND extracted skills
    let veryMustOk = true
    if (veryMust && Array.isArray(veryMust) && veryMust.length > 0) {
      const validVeryMust = veryMust.filter(vm => vm && typeof vm === 'string' && vm.trim().length > 0)
      if (validVeryMust.length > 0) {
        veryMustOk = validVeryMust.every((vm) => {
          try {
            // First check if already matched in main tags (already validated - both checks passed)
            if (matched.includes(vm)) return true
            
            // For veryMust: require BOTH text presence AND extracted skills
            const existsInText = tagExistsInText(vm, text)
            if (!existsInText) return false
            
            // Must also be in extracted skills
            const vmOntology = findSkillInOntology(vm)
            const allVmVariants = vmOntology ? [
              vm,
              ...(Array.isArray(vmOntology.exact) ? vmOntology.exact : []),
            ].filter(s => s && typeof s === 'string').map(s => normalize(s)) : [normalize(vm)]
            
            const inExtractedSkills = Array.from(extractedSkills).some(extractedSkill => {
              const extractedNorm = normalize(extractedSkill)
              if (allVmVariants.includes(extractedNorm)) return true
              
              const extractedOntology = findSkillInOntology(extractedSkill)
              if (extractedOntology) {
                const extractedVariants = [
                  extractedSkill,
                  ...(Array.isArray(extractedOntology.exact) ? extractedOntology.exact : []),
                ].map(s => normalize(s))
                return allVmVariants.some(tv => extractedVariants.includes(tv))
              }
              return false
            })
            
            return existsInText && inExtractedSkills
          } catch {
            return false
          }
        })
      }
    }
    
    // SIMPLE coverage calculation: matched tags / total tags
    // No weighted nonsense - just count what actually matched
    const coverage = validTags.length > 0 
      ? matched.length / validTags.length
      : 0
    
    // SIMPLE confidence: 0.9 if matches found, 0.5 if no matches
    const avgConfidence = matched.length > 0 ? 0.9 : 0.5
    
    return { matched, missing, coverage, veryMustOk, confidence: avgConfidence }
  }

    // SIMPLE and ACCURATE score calculation - no complex formulas
    function computeScoreFromChecklist(checklist: any[], weights: Record<string, number>): number {
      if (!checklist || !Array.isArray(checklist) || checklist.length === 0) {
        return 0
      }
      
      if (!weights || typeof weights !== 'object') {
      weights = {}
    }
    
    // Calculate total weight and score
    let totalWeight = 0
    let earnedWeight = 0
    
    for (const item of checklist) {
      if (!item || typeof item !== 'object') continue
      
      const itemId = item.id || ''
      const w = typeof weights[itemId] === 'number' && weights[itemId] > 0 ? weights[itemId] : 0
      
      if (w > 0) {
        totalWeight += w
        
        // SIMPLE scoring: if passed, get full weight. If not passed, get weight * coverage
        const passed = Boolean(item.passed)
        const veryMustOk = item.veryMustOk !== false
        const coverage = typeof item.coverage === 'number' ? Math.max(0, Math.min(1, item.coverage)) : 0
        const must = Boolean(item.must)
        
        if (passed && veryMustOk) {
          // Passed with all veryMust requirements = full credit
          earnedWeight += w
        } else if (passed) {
          // Passed but veryMust not ok = 80% credit (penalty for missing critical requirements)
          earnedWeight += w * 0.8
        } else {
          // Not passed = credit based on coverage
          // Must-have items that failed get 0 credit (strict)
          // Optional items get credit proportional to coverage
          if (must) {
            earnedWeight += 0 // Must-have items that fail get 0
          } else {
            earnedWeight += w * coverage // Optional items get partial credit
          }
        }
      }
    }
    
    // Prevent division by zero
    if (totalWeight === 0) {
      // If no weights, use simple average of passed items
      if (checklist.length > 0) {
        const passedCount = checklist.filter(item => {
          if (!item || typeof item !== 'object') return false
          const passed = Boolean(item.passed)
          const veryMustOk = item.veryMustOk !== false
          return passed && veryMustOk
        }).length
        return Math.round((passedCount / checklist.length) * 100)
      }
      return 0
    }
    
    // SIMPLE formula: (earned weight / total weight) * 100
    const score = (earnedWeight / totalWeight) * 100
    return Math.max(0, Math.min(100, Math.round(score)))
  }

        sendProgress(controller, 5, `🎯 Preparing to analyze ${files.length} resume${files.length > 1 ? 's' : ''}...`, 0, files.length, 'init', 'Initializing AI analysis engine...')

        // Process files in parallel with concurrency limit (max 3 at a time)
        const MAX_CONCURRENT = 3
        
        // Track cumulative progress - never go backward
        let completedFiles = 0
        let lastReportedProgress = 5
        
        const processFile = async (file: File, fileIndex: number, useAgenticAI: boolean) => {
          const fileNum = fileIndex + 1
          const progressPerFile = 90 / files.length // 5% to 95% for all files
          
          try {
            // Calculate progress based on completed files + current file progress
            const getProgress = (stageProgress: number) => {
              // Base progress from completed files
              const baseProgress = 5 + (completedFiles / files.length) * 90
              // Add current file progress
              const currentFileProgress = (stageProgress / files.length) * 90
              // Ensure it never goes backward
              const calculated = Math.max(lastReportedProgress, baseProgress + currentFileProgress)
              lastReportedProgress = Math.min(95, calculated)
              return lastReportedProgress
            }
            
            const extractProgress = getProgress(0.1)
            const aiThinkingMessages = [
              `🔍 Scanning ${file.name} for key information...`,
              `🧠 Analyzing candidate's experience and skills...`,
              `✨ Identifying matching qualifications...`,
              `📊 Evaluating technical competencies...`,
              `🎯 Matching against job requirements...`
            ]
            const randomAiThinking = aiThinkingMessages[Math.floor(Math.random() * aiThinkingMessages.length)]
            
            sendProgress(controller, extractProgress, `📄 Extracting text from resume ${fileNum}/${files.length}: ${file.name}...`, fileNum, files.length, 'extract', randomAiThinking)
            
            // Add timeout for file processing (30 seconds per file)
            const extractedContent = await Promise.race([
              extractTextFromFile(file),
              new Promise<ExtractedContent>((_, reject) => 
                setTimeout(() => reject(new Error("File processing timeout")), 30000)
              )
            ])
            // IMPORTANT: text from pdfjs-dist (primary) is used for skills, experience, checklist matching
            const text = extractedContent.text
            // IMPORTANT: links from pdf-lib + pdfjs-dist are ONLY used for profile section
            const extractedLinks = extractedContent.links || []

            // Extract profile links from the file text & annotations
            const fromText = extractProfileLinks(text, extractedLinks);
            const links = fromText.length ? fromText.map(l => ({ url: l.url })) : [];
            
            if (!text || typeof text !== 'string' || text.trim().length < 20) {
              console.warn("Empty or short text extracted from file", file.name)
              // Return a candidate with minimal data
              return {
                id: `${fileIndex + 1}`,
                name: file.name,
                email: "",
                phone: "",
                location: "",
                currentTitle: "",
                yearsOfExperience: 0,
                educationLevel: job.educationLevel || "Bachelor's",
                matchScore: 0,
                matchedSkills: [],
                inferredSkills: [],
                additionalSkills: [],
                experience: [],
                aiAnalysis: "Could not extract sufficient text from this resume file.",
              } as Candidate
            }
        
            const aiProgress = getProgress(0.4)
            const aiThinkingMessages2 = [
              `🧠 Deep analysis: Understanding candidate's background...`,
              `💡 Evaluating technical expertise and soft skills...`,
              `🎯 Matching qualifications with job requirements...`,
              `✨ Identifying strengths and potential fit...`,
              `📈 Calculating candidate compatibility score...`
            ]
            const randomAiThinking2 = aiThinkingMessages2[Math.floor(Math.random() * aiThinkingMessages2.length)]
            sendProgress(controller, aiProgress, useAgenticAI ? `🤖 Agentic AI Analysis: ${file.name}...` : `🤖 AI Analysis: ${file.name}...`, fileNum, files.length, 'ai', useAgenticAI ? "Specialized AI agents are analyzing the candidate..." : randomAiThinking2)
            
            // Use Agentic AI if enabled, otherwise use standard analysis
            let ai: any = {}
            let agenticResult: any = null
            
            if (useAgenticAI && checkRateLimitCooldown() && consecutiveRateLimits < MAX_CONSECUTIVE_RATE_LIMITS) {
              try {
                // Use Agentic AI System
                const orchestrator = new AgentOrchestrator()
                const agentContext: AgentContext = {
                  resumeText: text,
                  jobRequirements: job,
                  jdTemplate: template,
                  currentStage: 'analysis'
                }
                
                sendProgress(controller, getProgress(0.45), `🤖 Agentic AI: Extraction Agent working...`, fileNum, files.length, 'ai', "Extracting structured data from resume...")
                const workflowResult = await orchestrator.executeWorkflow(agentContext)
                console.log(`[${requestId}] Agentic AI workflow completed for ${file.name}, workflow log:`, workflowResult.workflowLog)
                
                // Store workflowResult for later use
                const storedWorkflowResult = workflowResult
                
                if (storedWorkflowResult.success && storedWorkflowResult.results) {
                  agenticResult = storedWorkflowResult.results
                  // Store workflowResult in agenticResult for later use
                  agenticResult._workflowResult = storedWorkflowResult
                  // Map agentic results to standard format
                  ai = {
                    name: agenticResult.extraction?.name || "",
                    email: agenticResult.extraction?.email || "",
                    phone: agenticResult.extraction?.phone || "",
                    location: agenticResult.extraction?.location || "",
                    currentTitle: agenticResult.extraction?.currentTitle || "",
                    yearsOfExperience: agenticResult.extraction?.yearsOfExperience || 0,
                    educationLevel: agenticResult.extraction?.educationLevel || job.educationLevel || "Bachelor's",
                    matchedSkills: agenticResult.extraction?.matchedSkills || [],
                    additionalSkills: agenticResult.extraction?.additionalSkills || [],
                    experience: agenticResult.extraction?.experience || [],
                    aiAnalysis: agenticResult.analysis?.analysis || agenticResult.recommendation?.hiringManagerNote || "Analysis completed using Agentic AI system.",
                  }
                  recordSuccess()
                  console.log(`[${requestId}] Agentic AI analysis completed for ${file.name}`)
                } else {
                  throw new Error("Agentic AI workflow failed")
                }
              } catch (error: any) {
                if (error?.status === 429 || error?.message?.includes("rate limit")) {
                  recordRateLimit()
                }
                console.warn(`[${requestId}] Agentic AI analysis failed for ${file.name}:`, error?.message || '')
                // Fallback to standard analysis - set agenticResult to null
                agenticResult = null
              }
            }
            
            // Standard analysis if agentic AI not used or failed
            if (!agenticResult) {
              if (checkRateLimitCooldown() && consecutiveRateLimits < MAX_CONSECUTIVE_RATE_LIMITS) {
                try {
                  // Pass full template to AI so it has complete JD context
                  ai = await analyzeWithOpenAI(text, job, template)
                  recordSuccess()
                  console.log(`[${requestId}] OpenAI analysis completed for ${file.name}`)
                } catch (error: any) {
                  if (error?.status === 429 || error?.message?.includes("rate limit")) {
                    recordRateLimit()
                  }
                  console.warn(`[${requestId}] OpenAI analysis failed for ${file.name}:`, error?.message || '')
                  // Use empty result, will extract from text using keyword matching
                  ai = {}
                }
              } else {
                console.warn(`[${requestId}] Skipping OpenAI analysis due to rate limit cooldown`)
                // Extract basic info from filename
                ai = {
                  name: file.name.replace(/\.(pdf|docx)$/i, '').replace(/[_-]/g, ' ') || "Unknown",
                  email: "",
                  phone: "",
                  location: "",
                  currentTitle: "",
                  yearsOfExperience: 0,
                  educationLevel: job.educationLevel || "Bachelor's",
                  matchedSkills: [],
                  additionalSkills: [],
                  experience: [],
                  aiAnalysis: "Analysis completed using keyword matching due to rate limits.",
                }
              }
            }

        // Use text-based skill extraction only (no AI)
        // AI removed for skill matching - using only text-based extraction

            const checklistProgress = getProgress(0.7)
            const checklistThinkingMessages = [
              `✅ Verifying must-have requirements...`,
              `📋 Checking all critical qualifications...`,
              `🔍 Validating technical skills match...`,
              `✨ Analyzing skill coverage percentage...`,
              `🎯 Calculating weighted score...`
            ]
            const randomChecklistThinking = checklistThinkingMessages[Math.floor(Math.random() * checklistThinkingMessages.length)]
            sendProgress(controller, checklistProgress, `📋 Processing checklist: ${file.name}...`, fileNum, files.length, 'checklist', randomChecklistThinking)
            
            // Build checklist with text-based keyword matching only (no AI)
            // Process items sequentially for critical ones to avoid rate limits, parallel for others
            const items = (template?.items || []).filter((it: any) => it && typeof it === 'object' && it.id && it.text)
            const mustHaveItems = items.filter((it: any) => Boolean(it.must))
            const optionalItems = items.filter((it: any) => !Boolean(it.must))
        
        const processItem = async (it: any) => {
          try {
            // Prefer keyword matching with ontology - only use AI for must-have items if keyword coverage is low
            let coverageData: any
            let confidence = 0.8
            
            // Validate and sanitize item properties
            const itemId = String(it.id || '')
            const itemText = String(it.text || '')
            const itemTags = Array.isArray(it.tags) ? it.tags.filter((t: any) => t && typeof t === 'string') : []
            const itemVeryMust = Array.isArray(it.veryMust) ? it.veryMust.filter((v: any) => v && typeof v === 'string') : []
            const itemMust = Boolean(it.must)
            
            // Use text-based keyword matching only (no AI)
            coverageData = await keywordCoverage(text, itemTags, itemVeryMust)
            confidence = Math.max(0, Math.min(1, coverageData.confidence || 0.8))
            
            // Log ADVANCED tag matching details for debugging
            if (itemTags.length > 0) {
              console.log(`[${requestId}] JD Item "${itemId}" (${itemMust ? 'MUST' : 'OPTIONAL'}):`)
              console.log(`[${requestId}]   Total Tags: ${itemTags.length}, Matched: ${coverageData.matched.length}, Missing: ${coverageData.missing.length}`)
              console.log(`[${requestId}]   Coverage: ${(coverageData.coverage * 100).toFixed(1)}%, Confidence: ${(coverageData.confidence * 100).toFixed(1)}%`)
              if (coverageData.matched.length > 0) {
                console.log(`[${requestId}]   ✓ Matched: [${coverageData.matched.join(', ')}]`)
              }
              if (coverageData.missing.length > 0) {
                console.log(`[${requestId}]   ✗ Missing: [${coverageData.missing.join(', ')}]`)
              }
              if (itemVeryMust && itemVeryMust.length > 0) {
                console.log(`[${requestId}]   VeryMust OK: ${coverageData.veryMustOk ? '✓ YES' : '✗ NO'}`)
                if (!coverageData.veryMustOk) {
                  const missingVeryMust = itemVeryMust.filter((vm: string) => !coverageData.matched.includes(vm))
                  if (missingVeryMust.length > 0) {
                    console.log(`[${requestId}]     Missing veryMust tags: [${missingVeryMust.join(', ')}]`)
                  }
                }
              }
              // Result will be calculated after this, so we'll log it in the return statement
            }
            
            // Only use AI for must-have items if keyword matching found < 50% coverage
            // AND not in rate limit cooldown
            if (itemMust && coverageData.coverage < 0.5 && text.length > 50 && 
                checkRateLimitCooldown() && consecutiveRateLimits < MAX_CONSECUTIVE_RATE_LIMITS) {
              try {
                const aiResult = await analyzeJDItemWithAI(text, { ...it, tags: itemTags, veryMust: itemVeryMust }, 0) // 0 retries to avoid too many calls
                recordSuccess()
                // Use AI result if it's better than keyword match
                if (aiResult && typeof aiResult === 'object' && 
                    (aiResult.coverage > coverageData.coverage || (aiResult.matched && aiResult.matched.length > coverageData.matched.length))) {
                  coverageData = aiResult
                  if (aiResult.semanticMatches && typeof aiResult.semanticMatches === 'object' && Object.keys(aiResult.semanticMatches).length > 0) {
                    const confidences = Object.values(aiResult.semanticMatches).filter((c): c is number => typeof c === 'number')
                    if (confidences.length > 0) {
                      confidence = Math.max(0, Math.min(1, confidences.reduce((a, b) => a + b, 0) / confidences.length))
                    }
                  }
                }
              } catch (aiError: any) {
                // AI failed, keep keyword result
                if (aiError?.status === 429 || aiError?.status === 503 || aiError?.message?.includes("rate limit")) {
                  recordRateLimit()
                  // Don't throw - just use keyword matching
                }
                console.warn(`AI analysis failed for ${itemId}, using keyword result:`, aiError?.message || '')
              }
            }
            
            const matched = Array.isArray(coverageData.matched) ? coverageData.matched : []
            const missing = Array.isArray(coverageData.missing) ? coverageData.missing : itemTags
            const coverage = typeof coverageData.coverage === 'number' ? Math.max(0, Math.min(1, coverageData.coverage)) : 0
            const veryMustOk = coverageData.veryMustOk !== false
            
            // SIMPLE and STRICT passing criteria:
            // - Must-have items: require 70% coverage AND all veryMust tags AND at least 70% of tags matched
            // - Optional items: require 60% coverage AND at least 60% of tags matched
            // This ensures accuracy - requirements are truly met (no false passes)
            const passed = itemMust 
              ? coverage >= 0.7 && veryMustOk && matched.length >= Math.ceil(itemTags.length * 0.7)
              : coverage >= 0.6 && matched.length >= Math.ceil(itemTags.length * 0.6)
            
            // Log final result
            console.log(`[${requestId}]   Final Result: ${passed ? '✓ PASSED' : '✗ FAILED'} (coverage: ${(coverage * 100).toFixed(1)}%, matched: ${matched.length}/${itemTags.length}, veryMustOk: ${veryMustOk})`)
            
            return {
              id: itemId,
              text: itemText,
              must: itemMust,
              passed,
              coverage,
              matchedTags: matched,
              missingTags: missing,
              veryMustOk,
              confidence,
            }
          } catch (itemError: any) {
            console.error(`Error processing checklist item ${it.id}:`, itemError)
            // Return safe defaults for this item
            return {
              id: String(it.id || 'unknown'),
              text: String(it.text || ''),
              must: Boolean(it.must),
              passed: false,
              coverage: 0,
              matchedTags: [],
              missingTags: Array.isArray(it.tags) ? it.tags : [],
              veryMustOk: false,
              confidence: 0,
            }
          }
        }
        
        // Process must-have items sequentially (with delays) to avoid rate limits, optional items in parallel
        const mustHaveResults = []
        for (const item of mustHaveItems) {
          mustHaveResults.push(await processItem(item))
          // Small delay between must-have item AI calls to reduce rate limit risk
          if (mustHaveItems.length > 1 && checkRateLimitCooldown()) {
            await new Promise(resolve => setTimeout(resolve, 500)) // 500ms delay
          }
        }
        
        // Process optional items in parallel (they don't use AI)
        const optionalResults = await Promise.all(optionalItems.map(processItem))
        
        const checklist = [...mustHaveResults, ...optionalResults]

        const additionalSkills: string[] = Array.isArray(ai.additionalSkills) ? ai.additionalSkills : []

        // Always compute from checklist for accurate scoring
        const weights = template?.weights || {}
        const matchScore = computeScoreFromChecklist(checklist, weights)
        
        // Log matching summary for transparency
        const checklistSummary = {
          totalItems: checklist.length,
          passedItems: checklist.filter((item: any) => item?.passed).length,
          mustHaveItems: checklist.filter((item: any) => item?.must).length,
          mustHavePassed: checklist.filter((item: any) => item?.must && item?.passed).length,
          avgCoverage: checklist.reduce((sum: number, item: any) => sum + (item?.coverage || 0), 0) / checklist.length,
          avgConfidence: checklist.reduce((sum: number, item: any) => sum + (item?.confidence || 0), 0) / checklist.length,
        }
        console.log(`[${requestId}] File ${fileIndex + 1}/${files.length} (${file.name}): Score=${matchScore}, ${JSON.stringify(checklistSummary)}`)

        // Use ontology-based skill matching
        const finalMatchedSkills = new Set<string>()
        const inferredSkillsSet = new Set<string>()
        const allCandidateSkills = new Set<string>()
        
        // STRICT skill collection - only skills that are actually in the text
        const normTextForValidation = normalize(text)
        
        // Helper: Only add skill if it appears in text
        const addSkillIfInText = (skill: string, variants?: string[]) => {
          const skillNorm = normalize(skill)
          const allVariantsToCheck = variants || [skill]
          
          // Check if skill or any variant appears in text
          const inText = allVariantsToCheck.some(variant => {
            const expanded = expandTag(variant)
            return expanded.some(v => {
              if (!v) return false
              const re = new RegExp(`\\b${v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, 'i')
              return re.test(normTextForValidation)
            })
          })
          
          if (inText) {
            allCandidateSkills.add(skillNorm)
            // Only add exact ontology variants that also appear in text
            const skillOntology = findSkillInOntology(skill)
            if (skillOntology && Array.isArray(skillOntology.exact)) {
              skillOntology.exact.forEach(variant => {
                const variantNorm = normalize(variant)
                const variantInText = expandTag(variant).some(v => {
                  if (!v) return false
                  const re = new RegExp(`\\b${v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, 'i')
                  return re.test(normTextForValidation)
                })
                if (variantInText) {
                  allCandidateSkills.add(variantNorm)
                }
              })
            }
          }
        }
        
        // Skills from checklist matched tags (these were already validated)
        checklist
          .filter(item => item && typeof item === 'object' && Array.isArray(item.matchedTags))
          .forEach((item) => {
            (item.matchedTags || [])
              .filter((tag: any) => tag && typeof tag === 'string' && tag.trim().length > 0)
              .forEach((tag: any) => {
                const skill = (tag as string).trim()
                // These were already matched, so add them
                allCandidateSkills.add(normalize(skill))
                // Add exact variants only if they appear in text
                const tagOntology = findSkillInOntology(skill)
                if (tagOntology && Array.isArray(tagOntology.exact)) {
                  tagOntology.exact.forEach(variant => {
                    const variantInText = expandTag(variant).some(v => {
                      if (!v) return false
                      const re = new RegExp(`\\b${v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, 'i')
                      return re.test(normTextForValidation)
                    })
                    if (variantInText) {
                      allCandidateSkills.add(normalize(variant))
                    }
                  })
                }
              })
          })
        
        // Extract skills directly from resume text (STRICT - only if in text)
        const textSkills = extractSkillsFromText(text)
        textSkills.forEach(skill => {
          allCandidateSkills.add(normalize(skill))
          // Only add exact variants that also appear in text
          const skillOntology = findSkillInOntology(skill)
          if (skillOntology && Array.isArray(skillOntology.exact)) {
            skillOntology.exact.forEach(variant => {
              const variantInText = expandTag(variant).some(v => {
                if (!v) return false
                const re = new RegExp(`\\b${v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, 'i')
                return re.test(normTextForValidation)
              })
              if (variantInText) {
                allCandidateSkills.add(normalize(variant))
              }
            })
          }
        })
        
        // Log all skills found in this resume
        const candidateNameForSkills = String(ai.name || file.name || "Unknown").trim()
        const allSkillsFound = Array.from(allCandidateSkills).sort()
        console.log(`\n[${requestId}] ===== SKILLS FOUND IN RESUME: ${candidateNameForSkills} =====`)
        console.log(`[${requestId}] Total skills found: ${allSkillsFound.length}`)
        if (allSkillsFound.length > 0) {
          console.log(`[${requestId}] Skills:`, allSkillsFound.join(', '))
        } else {
          console.log(`[${requestId}] No skills detected in resume text`)
        }
        
        // Log skills by source
        const checklistTagsCount = checklist
          .filter(item => item && typeof item === 'object' && Array.isArray(item.matchedTags))
          .reduce((count, item) => count + (item.matchedTags?.length || 0), 0)
        const textExtractedCount = textSkills.size
        
        console.log(`[${requestId}] Skills by source - Checklist: ${checklistTagsCount}, Text Extraction: ${textExtractedCount}`)
        console.log(`[${requestId}] =================================================\n`)
        
        // STRICT skill matching - only match if skill actually appears in resume text
        const validRequiredSkills = (job.requiredSkills || []).filter(s => s && typeof s === 'string' && s.trim().length > 0)
        const normTextForMatching = normalize(text)
        
        for (const reqSkill of validRequiredSkills) {
          try {
            const normReq = normalize(reqSkill)
            if (!normReq) continue
            
            let matched = false
            
            // Get all variants for required skill from ontology
            const reqRelation = findSkillInOntology(reqSkill)
            const allReqVariants = reqRelation ? [
              reqSkill,
              ...(Array.isArray(reqRelation.exact) ? reqRelation.exact : []),
            ].filter(s => s && typeof s === 'string') : [reqSkill]
            
            // STRICT: Check if ANY variant actually appears in text (word boundary match)
            for (const variant of allReqVariants) {
              const variants = expandTag(variant)
              
              // Use STRICT word boundary - prevent false positives from substrings
              const strictTextMatch = variants.some(v => {
                if (!v || v.length < 2) return false // Skip very short strings
                const escaped = v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
                const re = new RegExp(`\\b${escaped}\\b`, 'i')
                return re.test(normTextForMatching)
              })
              
              if (strictTextMatch) {
                // Double-check: verify it's in candidate skills (must be extracted from text)
                const variantNorm = normalize(variant)
                const inCandidateSkills = Array.from(allCandidateSkills).some(candidateSkill => {
                  const normCandidate = normalize(candidateSkill)
                  return normCandidate === variantNorm
                })
                
                // Also check if it's in textSkills directly
                const inTextSkills = Array.from(textSkills).some(ts => {
                  const tsNorm = normalize(ts)
                  if (tsNorm === variantNorm) return true
                  // Check ontology variants
                  const tsOntology = findSkillInOntology(ts)
                  if (tsOntology) {
                    const tsVariants = [ts, ...(Array.isArray(tsOntology.exact) ? tsOntology.exact : [])]
                      .map(s => normalize(s))
                    return tsVariants.includes(variantNorm)
                  }
                  return false
                })
                
                // CRITICAL: Only match if BOTH conditions are true:
                // 1. Strict text match (word boundary)
                // 2. In candidate skills OR in textSkills (both validated from text)
                if (inCandidateSkills || inTextSkills) {
                  finalMatchedSkills.add(reqSkill)
                  matched = true
                  break
                }
              }
            }
            
            // Similar skill matching - but ONLY if similar skill is also in text AND required skill variant also in text
            if (!matched) {
              for (const candidateSkill of allCandidateSkills) {
                if (!candidateSkill || typeof candidateSkill !== 'string') continue
                
                try {
                  // Check if it's similar, but ALSO verify BOTH skills appear in text
                  if (isSimilarSkill(candidateSkill, reqSkill)) {
                    // Verify candidate skill is in text
                    const candidateVariants = expandTag(candidateSkill)
                    const candidateInText = candidateVariants.some(v => {
                      if (!v || v.length < 2) return false
                      const escaped = v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
                      const re = new RegExp(`\\b${escaped}\\b`, 'i')
                      return re.test(normTextForMatching)
                    })
                    
                    // Also verify required skill variant appears in text (double validation)
                    const reqVariantInText = allReqVariants.some(variant => {
                      const variants = expandTag(variant)
                      return variants.some(v => {
                        if (!v || v.length < 2) return false
                        const escaped = v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
                        const re = new RegExp(`\\b${escaped}\\b`, 'i')
                        return re.test(normTextForMatching)
                      })
                    })
                    
                    // Only match if BOTH skills confirmed in text
                    if (candidateInText && reqVariantInText) {
                      finalMatchedSkills.add(reqSkill)
                      matched = true
                      break
                    }
                  }
                } catch {
                  continue
                }
              }
            }
            
            // Related skill matching - but ONLY if related skill is also in text AND is a strong match
            if (!matched) {
              for (const candidateSkill of allCandidateSkills) {
                if (!candidateSkill || typeof candidateSkill !== 'string') continue
                
                try {
                  if (isRelatedSkill(candidateSkill, reqSkill)) {
                    // Verify candidate skill is in text
                    const candidateVariants = expandTag(candidateSkill)
                    const candidateInText = candidateVariants.some(v => {
                      if (!v) return false
                      const re = new RegExp(`\\b${v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, 'i')
                      return re.test(normTextForMatching)
                    })
                    
                    // For related skills, be even more strict - require both to be in text
                    const reqInText = allReqVariants.some(variant => {
                      const variants = expandTag(variant)
                      return variants.some(v => {
                        if (!v) return false
                        const re = new RegExp(`\\b${v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, 'i')
                        return re.test(normTextForMatching)
                      })
                    })
                    
                    if (candidateInText && reqInText) {
                      inferredSkillsSet.add(reqSkill)
                      matched = true
                      break
                    }
                  }
                } catch {
                  continue
                }
              }
            }
            
            // DO NOT use fuzzy substring matching - too many false positives
            // If skill not found, it's simply not matched (don't force a match)
            
          } catch (skillError: any) {
            console.warn(`[${requestId}] Error matching skill ${reqSkill}:`, skillError?.message || '')
            continue
          }
        }

        // Compute experience helpfulness against JD required skills
        const reqSkills = (job.requiredSkills || []).filter(s => s && typeof s === 'string')
        let expTotalPoints = 0
        let expCount = 0
        const expMatchedSet = new Set<string>()
        const experiencesRaw: any[] = Array.isArray(ai.experience) ? ai.experience : []
        for (const exp of experiencesRaw) {
          try {
            const titleCompany = `${String(exp.title || '')} ${String(exp.company || '')}`.toLowerCase()
            const desc = String(exp.description || '').toLowerCase()
            let points = 0
            for (const rs of reqSkills) {
              const key = String(rs || '').toLowerCase()
              if (!key) continue
              if (titleCompany.includes(key) || desc.includes(key)) {
                points += 1
                expMatchedSet.add(rs)
              }
            }
            expTotalPoints += points
            expCount += 1
          } catch {}
        }
        const expAvgPoints = expCount > 0 ? expTotalPoints / expCount : 0
        const expBonus = Math.min(10, Math.max(0, expAvgPoints * 2)) // up to +10 bonus
        const experienceHelpful = expTotalPoints > 0

            const projectsProgress = getProgress(0.9)
            const projectsThinkingMessages = [
              `🚀 Analyzing projects and GitHub contributions...`,
              `💼 Reviewing portfolio and work samples...`,
              `📊 Calculating project impact score...`,
              `⭐ Evaluating code quality and contributions...`,
              `🎯 Finalizing candidate assessment...`
            ]
            const randomProjectsThinking = projectsThinkingMessages[Math.floor(Math.random() * projectsThinkingMessages.length)]
            sendProgress(controller, projectsProgress, `🚀 Analyzing projects: ${file.name}...`, fileNum, files.length, 'projects', randomProjectsThinking)
            
            // Mark this file as completed
            completedFiles++
            lastReportedProgress = getProgress(1.0)
            
            // Projects & profile links extraction + AI helpfulness points
            // NOTE: text (from pdfjs-dist) is used for projects extraction
            const projects = await extractProjects(text)
            // NOTE: extractedLinks (from pdf-lib + pdfjs-dist) are passed to profile section
            // These are hyperlinks behind text (e.g., "GitHub" linked to github.com)
            const profileLinks = extractProfileLinks(text, extractedLinks)
            const pp = await analyzeProjectsAndProfiles(projects, profileLinks, job)

            // Use agentic AI score if available, otherwise use computed score
            const finalScore = agenticResult?.scoring?.weightedScore 
              ? Math.max(0, Math.min(100, agenticResult.scoring.weightedScore))
              : Math.max(0, Math.min(100, matchScore + expBonus + pp.projectPoints + pp.profilePoints))
            
            // Validate and sanitize candidate data
            const candidate = {
              id: String(fileIndex + 1),
              name: String(ai.name || file.name || "Unknown").trim(),
              email: String(ai.email || "").trim(),
              phone: String(ai.phone || "").trim(),
              location: String(ai.location || "").trim(),
              currentTitle: String(ai.currentTitle || "").trim(),
              yearsOfExperience: typeof ai.yearsOfExperience === "number" && ai.yearsOfExperience >= 0 
                ? ai.yearsOfExperience 
                : 0,
              educationLevel: String(ai.educationLevel || job.educationLevel || "Bachelor's").trim(),
              matchScore: finalScore,
              matchedSkills: Array.from(finalMatchedSkills).filter(s => s && typeof s === 'string'),
              inferredSkills: Array.from(inferredSkillsSet).filter(s => s && typeof s === 'string'),
              additionalSkills: Array.isArray(additionalSkills) 
                ? additionalSkills.filter(s => s && typeof s === 'string')
                : [],
              experience: Array.isArray(ai.experience)
                ? ai.experience.filter((exp: any) => exp && typeof exp === 'object').map((exp: any) => ({
                    title: String(exp.title || "").trim(),
                    company: String(exp.company || "").trim(),
                    period: String(exp.period || "").trim(),
                    description: String(exp.description || "").trim(),
                  }))
                : [],
              aiAnalysis: String(ai.aiAnalysis || "").trim() || "Analysis completed using keyword matching and JD checklist.",
              experiencePointsAvg: Number(expAvgPoints.toFixed(2)),
              experiencePointsTotal: expTotalPoints,
              experienceImpactBonus: Number(expBonus.toFixed(2)),
              experienceHelpful,
              experienceMatchedSkills: Array.from(expMatchedSet),
              experienceAnalysis: experienceHelpful
                ? `Experience references ${Array.from(expMatchedSet).join(', ')}; avg points ${expAvgPoints.toFixed(2)}; bonus +${expBonus.toFixed(2)} applied to score.`
                : 'Experience not directly helpful against JD required skills.',
              projects: pp.projectsWithAnalysis || projects,
              projectAnalysis: pp.projectAnalysis,
              projectPoints: pp.projectPoints,
              profileLinks,
              profileAnalysis: pp.profileAnalysis,
              profilePoints: pp.profilePoints,
              profilesWithAnalysis: pp.profilesWithAnalysis || [],
              checklist: Array.isArray(checklist) ? checklist.filter(item => item && typeof item === 'object') : [],
              linkedInUrl: pp.linkedInUrl || null, // Store LinkedIn URL for async analysis
              // Add agentic AI results if available
              agenticAI: agenticResult ? {
                strengths: Array.isArray(agenticResult.analysis?.strengths) ? agenticResult.analysis.strengths : [],
                weaknesses: Array.isArray(agenticResult.analysis?.weaknesses) ? agenticResult.analysis.weaknesses : [],
                culturalFit: agenticResult.analysis?.culturalFit || "",
                scoreBreakdown: agenticResult.scoring?.scoreBreakdown || {},
                weightedScore: agenticResult.scoring?.weightedScore || finalScore,
                recommendation: agenticResult.scoring?.recommendation || agenticResult.recommendation?.recommendation || "",
                interviewQuestions: Array.isArray(agenticResult.recommendation?.interviewQuestions) ? agenticResult.recommendation.interviewQuestions : [],
                nextSteps: Array.isArray(agenticResult.recommendation?.nextSteps) ? agenticResult.recommendation.nextSteps : [],
                hiringManagerNote: agenticResult.recommendation?.hiringManagerNote || agenticResult.analysis?.analysis || "",
                workflowLog: Array.isArray(agenticResult._workflowResult?.workflowLog) ? agenticResult._workflowResult.workflowLog : [],
                confidence: agenticResult._workflowResult?.confidence || 0.8,
              } : undefined,
            } as Candidate

            // Log detailed skill matching summary
            const candidateName = String(ai.name || file.name || "Unknown").trim()
            console.log(`\n[${requestId}] ===== SKILL MATCHING RESULTS: ${candidateName} =====`)
            console.log(`[${requestId}] Required Skills: ${validRequiredSkills.length}`)
            console.log(`[${requestId}] Required Skills List: [${validRequiredSkills.join(', ')}]`)
            console.log(`[${requestId}] Matched Skills: ${finalMatchedSkills.size}`)
            if (finalMatchedSkills.size > 0) {
              console.log(`[${requestId}] Matched: [${Array.from(finalMatchedSkills).join(', ')}]`)
            }
            console.log(`[${requestId}] Inferred Skills: ${inferredSkillsSet.size}`)
            if (inferredSkillsSet.size > 0) {
              console.log(`[${requestId}] Inferred: [${Array.from(inferredSkillsSet).join(', ')}]`)
            }
            console.log(`[${requestId}] Missing Skills: ${validRequiredSkills.length - finalMatchedSkills.size - inferredSkillsSet.size}`)
            const missingSkills = validRequiredSkills.filter(rs => 
              !finalMatchedSkills.has(rs) && !inferredSkillsSet.has(rs)
            )
            if (missingSkills.length > 0) {
              console.log(`[${requestId}] Missing: [${missingSkills.join(', ')}]`)
            }
            console.log(`[${requestId}] Total Candidate Skills Found in Resume: ${allCandidateSkills.size}`)
            console.log(`[${requestId}] =================================================\n`)
            
            return candidate
          } catch (e: any) {
            console.error(`[${requestId}] Failed to analyze file ${file.name}:`, e?.message || e)
            return {
              id: `${fileIndex + 1}`,
              name: file.name,
              email: "",
              phone: "",
              location: "",
              currentTitle: "",
              yearsOfExperience: 0,
              educationLevel: job.educationLevel,
              matchScore: 0,
              matchedSkills: [],
              inferredSkills: [],
              additionalSkills: [],
              experience: [],
              aiAnalysis: `Failed to analyze this resume. ${e?.message || ""}`.trim(),
            } as Candidate
          }
        }

        // Parallel processing with concurrency control
        const processInBatches = async (): Promise<Candidate[]> => {
          const results: Candidate[] = []
          for (let i = 0; i < files.length; i += MAX_CONCURRENT) {
            const batch = files.slice(i, i + MAX_CONCURRENT)
            const batchPromises = batch.map((file, batchIdx) => 
              processFile(file, i + batchIdx, useAgenticAI)
            )
            const batchResults = await Promise.allSettled(batchPromises)
            
            for (let idx = 0; idx < batchResults.length; idx++) {
              const result = batchResults[idx]
              if (result.status === 'fulfilled') {
                results.push(result.value)
              } else {
                // Handle rejected promise
                const fileIndex = i + idx
                results.push({
                  id: `${fileIndex + 1}`,
                  name: files[fileIndex]?.name || "Unknown",
                  email: "",
                  phone: "",
                  location: "",
                  currentTitle: "",
                  yearsOfExperience: 0,
                  educationLevel: job.educationLevel,
                  matchScore: 0,
                  matchedSkills: [],
                  inferredSkills: [],
                  additionalSkills: [],
                  experience: [],
                  aiAnalysis: `Failed to analyze this resume. ${result.reason?.message || "Unknown error"}`.trim(),
                } as Candidate)
              }
            }
            
            // Update progress after each batch - use cumulative progress from processFile
            // Don't update here as processFile already handles progress updates
            // This ensures progress never goes backward
          }
          return results
        }

        const candidates = await processInBatches()

        sendProgress(controller, 95, "✅ Validating results...", files.length, files.length, 'validate', 'Finalizing analysis and generating reports...')

        const processingTime = Date.now() - startTime
        console.log(`[${requestId}] Analysis completed: ${candidates.length} candidates processed in ${processingTime}ms`)
        
        // Validation: Ensure all candidates have valid scores
        const validatedCandidates = candidates.map((c, idx) => {
          if (typeof c.matchScore !== 'number' || c.matchScore < 0 || c.matchScore > 100) {
            console.warn(`[${requestId}] Invalid score for candidate ${c.id}, recalculating`)
            // Recalculate if needed
            const weights = template?.weights || {}
            const itemChecklist = c.checklist || []
            c.matchScore = computeScoreFromChecklist(itemChecklist, weights)
          }
          return c
        })
        
        sendProgress(controller, 100, "Analysis complete!", files.length, files.length)
        
        // Send final results
        try {
          sendResult(controller, validatedCandidates, {
            requestId,
            processingTimeMs: processingTime,
            totalFiles: files.length,
            role: roleKey,
          })
        } catch (resultError: any) {
          console.error(`[${requestId}] Error sending result:`, resultError?.message || 'Unknown error')
          sendError(controller, `Failed to send results: ${resultError?.message || 'Unknown error'}`)
          return
        }
        
        // Close stream after sending results
        closeStream(controller)
        
      } catch (err: any) {
        const processingTime = Date.now() - startTime
        const message = err?.message || "Unknown error"
        console.error(`[${requestId}] Error in /api/analyze after ${processingTime}ms:`, message, err?.stack)
        sendError(controller, message)
      }
    }
  })

  // Return the stream as SSE response
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}



