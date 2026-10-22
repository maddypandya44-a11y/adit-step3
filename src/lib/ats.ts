// ATS job-board parsers + fetchers (public endpoints only, no logins). Ported idea from JobRadar.
export type Posting = { external_id: string; title: string; location: string | null; url: string | null; description: string };
export type Ats = "greenhouse" | "lever" | "ashby" | "workable" | "workday" | "oracle";
export const ATS_LIST: Ats[] = ["greenhouse", "lever", "ashby", "workable", "workday", "oracle"];
export const ATS_SLUG_HINT: Record<Ats, string> = {
  greenhouse: "board slug, e.g. stripe",
  lever: "company slug, e.g. spotify",
  ashby: "board slug, e.g. notion",
  workable: "account slug, e.g. hotjar",
  workday: "tenant.wdN/site, e.g. nvidia.wd5/NVIDIAExternalCareerSite",
  oracle: "host/siteNumber, e.g. jpmc.fa.oraclecloud.com/CX_1001",
};

export function decode(html: string) {
  return html.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export const parsers = {
  greenhouse: (d: any): Posting[] => (d?.jobs ?? []).map((j: any) => ({ external_id: String(j.id), title: j.title, location: j.location?.name ?? null, url: j.absolute_url ?? null, description: decode(decode(j.content ?? "")) })),
  lever: (d: any): Posting[] => (Array.isArray(d) ? d : []).map((j: any) => ({ external_id: String(j.id), title: j.text, location: j.categories?.location ?? null, url: j.hostedUrl ?? null, description: j.descriptionPlain ?? "" })),
  ashby: (d: any): Posting[] => (d?.jobs ?? []).map((j: any) => ({ external_id: String(j.id), title: j.title, location: j.location ?? null, url: j.jobUrl ?? null, description: j.descriptionPlain ?? "" })),
  workable: (d: any): Posting[] => (d?.jobs ?? []).map((j: any) => ({ external_id: String(j.shortcode ?? j.id), title: j.title, location: [j.city, j.country].filter(Boolean).join(", ") || null, url: j.url ?? j.shortlink ?? null, description: decode(j.description ?? "") })),
  workday: (d: any, base: string): Posting[] => (d?.jobPostings ?? []).map((j: any) => ({ external_id: String(j.bulletFields?.[0] ?? j.externalPath), title: j.title, location: j.locationsText ?? null, url: j.externalPath ? `${base}${j.externalPath}` : null, description: "" })),
  oracle: (d: any, base: string): Posting[] => (d?.items?.[0]?.requisitionList ?? []).map((j: any) => ({ external_id: String(j.Id), title: j.Title, location: j.PrimaryLocation ?? null, url: `${base}/job/${j.Id}`, description: decode(j.ShortDescriptionStr ?? "") })),
};

async function fetchJson(url: string, init?: RequestInit, timeoutMs = 12000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal, headers: { accept: "application/json", ...(init?.headers ?? {}) } });
    if (!res.ok) throw new Error(res.status === 404 ? "Board not found — check the slug" : `Board returned ${res.status}`);
    return await res.json();
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") throw new Error("Board timed out");
    throw e;
  } finally { clearTimeout(t); }
}

export async function fetchBoard(ats: string, slug: string): Promise<Posting[]> {
  const s = encodeURIComponent(slug.trim());
  switch (ats) {
    case "greenhouse": return parsers.greenhouse(await fetchJson(`https://boards-api.greenhouse.io/v1/boards/${s}/jobs?content=true`));
    case "lever": return parsers.lever(await fetchJson(`https://api.lever.co/v0/postings/${s}?mode=json`));
    case "ashby": return parsers.ashby(await fetchJson(`https://api.ashbyhq.com/posting-api/job-board/${s}`));
    case "workable": return parsers.workable(await fetchJson(`https://apply.workable.com/api/v1/widget/accounts/${s}?details=true`));
    case "workday": {
      const m = slug.trim().match(/^([a-z0-9-]+)\.(wd\d+)\/([A-Za-z0-9_-]+)$/i);
      if (!m) throw new Error("Workday slug must look like tenant.wd5/SiteName");
      const [, tenant, wd, site] = m;
      const host = `https://${tenant}.${wd}.myworkdayjobs.com`;
      const d = await fetchJson(`${host}/wday/cxs/${tenant}/${site}/jobs`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ appliedFacets: {}, limit: 20, offset: 0, searchText: "" }) });
      return parsers.workday(d, `${host}/${site}`);
    }
    case "oracle": {
      const m = slug.trim().match(/^([a-z0-9.-]+\.oraclecloud\.com)\/([A-Za-z0-9_]+)$/i);
      if (!m) throw new Error("Oracle slug must look like host.oraclecloud.com/CX_1");
      const [, host, site] = m;
      const d = await fetchJson(`https://${host}/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList.secondaryLocations&finder=findReqs;siteNumber=${site},limit=50,sortBy=POSTING_DATES_DESC`);
      return parsers.oracle(d, `https://${host}/hcmUI/CandidateExperience/en/sites/${site}`);
    }
    default: throw new Error(`Unsupported ATS: ${ats}`);
  }
}

/** Run async tasks with a concurrency limit. */
export async function pool<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) { const idx = i++; out[idx] = await fn(items[idx] as T); }
  }));
  return out;
}
