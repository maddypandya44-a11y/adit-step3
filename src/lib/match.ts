// Deterministic resume ↔ job matcher, ported from the approach of Resume-Matcher (srbhr/Resume-Matcher):
// section parsing, required vs nice-to-have weighting and synonym handling. No AI calls; this is the offline fallback.
const SKILLS = [
  "javascript","typescript","python","java","go","rust","ruby","php","c++","c#","kotlin","swift","scala","sql",
  "react","next.js","vue","angular","svelte","node.js","express","django","flask","fastapi","rails","spring","graphql","rest",
  "html","css","tailwind","redux","webpack","vite",
  "aws","gcp","azure","docker","kubernetes","terraform","ci/cd","linux","serverless","microservices",
  "postgresql","mysql","mongodb","redis","kafka","elasticsearch","snowflake","spark","airflow","dbt","bigquery",
  "machine learning","deep learning","nlp","llm","pytorch","tensorflow","pandas","numpy","statistics","data analysis","a/b testing",
  "figma","ux","ui","product management","roadmap","agile","scrum","jira","stakeholder","analytics","seo","marketing",
  "sales","salesforce","hubspot","excel","tableau","looker","power bi","finance","accounting","operations","recruiting",
  "security","testing","jest","cypress","playwright","git","api","mobile","ios","android","react native","flutter",
  "leadership","mentoring","communication","collaboration","distributed systems","system design","payments","fintech","healthcare","b2b","saas",
];

// alias -> canonical skill (applied to normalised text before matching)
export const SYNONYMS: Record<string, string> = {
  postgres: "postgresql", psql: "postgresql", js: "javascript", ecmascript: "javascript", ts: "typescript",
  k8s: "kubernetes", golang: "go", nodejs: "node.js", node: "node.js", reactjs: "react", "react.js": "react",
  nextjs: "next.js", vuejs: "vue", "amazon web services": "aws", "google cloud": "gcp", ml: "machine learning",
  "large language models": "llm", llms: "llm", "ci cd": "ci/cd", cicd: "ci/cd", "tailwindcss": "tailwind", mongo: "mongodb",
};

function norm(text: string) {
  let t = ` ${text.toLowerCase().replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/g, " ").replace(/[^a-z0-9+#./ ]+/g, " ").replace(/\s+/g, " ")} `;
  for (const [alias, canon] of Object.entries(SYNONYMS)) {
    t = t.split(` ${alias} `).join(` ${canon} `).split(` ${alias}. `).join(` ${canon}. `).split(` ${alias}, `).join(` ${canon}, `);
  }
  return t.replace(/ ([a-z0-9+#./]+)[.,] /g, " $1 ");
}

function has(haystack: string, term: string) {
  const t = term.toLowerCase();
  if (t === "go") return / go /.test(haystack) && /( go developer| in go | go and | go, | with go | go microservices| go services)/.test(haystack);
  return haystack.includes(` ${t} `) || haystack.includes(` ${t}s `);
}

export function extractKeywords(text: string): string[] {
  const n = norm(text);
  return SKILLS.filter((s) => has(n, s));
}

export type ResumeSections = { summary: string; experience: string; skills: string; education: string; other: string };
const SECTION_HEADS: [keyof ResumeSections, RegExp][] = [
  ["summary", /^(summary|profile|about( me)?|objective)\b/i],
  ["experience", /^(experience|work experience|employment|professional experience|work history)\b/i],
  ["skills", /^(skills|technical skills|technologies|tools)\b/i],
  ["education", /^(education|certifications?|academics)\b/i],
];

export function parseResumeSections(text: string): ResumeSections {
  const out: ResumeSections = { summary: "", experience: "", skills: "", education: "", other: "" };
  let cur: keyof ResumeSections = "other";
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    const head = line.length < 40 ? SECTION_HEADS.find(([, re]) => re.test(line.replace(/[:#*]/g, "").trim())) : undefined;
    if (head) { cur = head[0]; continue; }
    if (line) out[cur] += (out[cur] ? "\n" : "") + line;
  }
  return out;
}

export type JobRequirements = { required: string; niceToHave: string };
export function parseJobDescription(text: string): JobRequirements {
  const lines = text.split(/\r?\n/);
  let mode: "required" | "nice" = "required";
  const req: string[] = [], nice: string[] = [];
  for (const l of lines) {
    const s = l.trim().toLowerCase();
    if (/^(nice to have|preferred|bonus|pluses|it's a plus|good to have|preferred qualifications)/.test(s)) { mode = "nice"; continue; }
    if (/^(requirements|qualifications|must have|what you.ll need|you have|minimum qualifications|basic qualifications)/.test(s)) { mode = "required"; continue; }
    if (mode === "required" && /(nice to have|a plus|bonus|preferred)/.test(s)) { nice.push(l); continue; }
    (mode === "required" ? req : nice).push(l);
  }
  return { required: req.join("\n"), niceToHave: nice.join("\n") };
}

export type MatchResult = { score: number; matched: string[]; missing: string[]; required: string[]; niceToHave: string[]; suggestions: string[] };

const REQUIRED_WEIGHT = 2;
const NICE_WEIGHT = 1;

export function matchResume(resume: string, job: string): MatchResult {
  const jd = parseJobDescription(job);
  const required = extractKeywords(jd.required);
  const niceToHave = extractKeywords(jd.niceToHave).filter((k) => !required.includes(k));
  const r = norm(resume);
  const all = [...required, ...niceToHave];
  const jobKeys = SKILLS.filter((s) => all.includes(s));
  const matched = jobKeys.filter((k) => has(r, k));
  const missing = jobKeys.filter((k) => !has(r, k));
  const weight = (k: string) => (required.includes(k) ? REQUIRED_WEIGHT : NICE_WEIGHT);
  const total = jobKeys.reduce((a, k) => a + weight(k), 0);
  const got = matched.reduce((a, k) => a + weight(k), 0);
  const score = total === 0 ? 0 : Math.round((got / total) * 100);
  const ordered = [...missing].sort((a, b) => weight(b) - weight(a));
  const suggestions = ordered.slice(0, 6).map((k) =>
    required.includes(k)
      ? `"${k}" is a requirement. If you've used it, add a bullet showing what you built with it and the result.`
      : `"${k}" is a nice-to-have. Mention it if you have real experience.`,
  );
  return { score, matched, missing, required, niceToHave, suggestions };
}
