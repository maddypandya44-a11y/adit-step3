// Local keyword matcher (inspired by Resume-Matcher). No AI calls, runs anywhere.
const SKILLS = [
  "javascript","typescript","python","java","go","golang","rust","ruby","php","c++","c#","kotlin","swift","scala","sql",
  "react","next.js","vue","angular","svelte","node.js","express","django","flask","fastapi","rails","spring","graphql","rest",
  "html","css","tailwind","redux","webpack","vite",
  "aws","gcp","azure","docker","kubernetes","terraform","ci/cd","linux","serverless","microservices",
  "postgresql","postgres","mysql","mongodb","redis","kafka","elasticsearch","snowflake","spark","airflow","dbt","bigquery",
  "machine learning","deep learning","nlp","llm","pytorch","tensorflow","pandas","numpy","statistics","data analysis","a/b testing",
  "figma","ux","ui","product management","roadmap","agile","scrum","jira","stakeholder","analytics","seo","marketing",
  "sales","salesforce","hubspot","excel","tableau","looker","power bi","finance","accounting","operations","recruiting",
  "security","testing","jest","cypress","playwright","git","api","mobile","ios","android","react native","flutter",
  "leadership","mentoring","communication","collaboration","distributed systems","system design","payments","fintech","healthcare","b2b","saas",
];

function norm(text: string) {
  return ` ${text.toLowerCase().replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/g, " ").replace(/[^a-z0-9+#./ ]+/g, " ").replace(/\s+/g, " ")} `;
}

function has(haystack: string, term: string) {
  const t = term.toLowerCase();
  if (t === "go") return / go(lang)? /.test(haystack) && /golang| go developer| go,| in go /.test(haystack);
  return haystack.includes(` ${t} `) || haystack.includes(` ${t}.`) || haystack.includes(` ${t},`) || haystack.includes(` ${t}s `);
}

export function extractKeywords(text: string): string[] {
  const n = norm(text);
  return SKILLS.filter((s) => has(n, s));
}

export type MatchResult = { score: number; matched: string[]; missing: string[]; suggestions: string[] };

export function matchResume(resume: string, job: string): MatchResult {
  const jobKeys = extractKeywords(job);
  const r = norm(resume);
  const matched = jobKeys.filter((k) => has(r, k));
  const missing = jobKeys.filter((k) => !has(r, k));
  const score = jobKeys.length === 0 ? 0 : Math.round((matched.length / jobKeys.length) * 100);
  const suggestions = missing.slice(0, 6).map((k) => `If you have experience with ${k}, mention it in a bullet with a concrete result.`);
  return { score, matched, missing, suggestions };
}
