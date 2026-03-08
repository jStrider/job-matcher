export interface BraveSearchResult {
  title: string;
  url: string;
  description: string;
}

export interface ParsedJobResult {
  title: string;
  company: string;
  location: string | null;
  url: string;
  source: string;
  snippet: string;
}

function detectSource(url: string): string {
  if (url.includes("indeed.")) return "indeed";
  if (url.includes("linkedin.com")) return "linkedin";
  if (url.includes("welcometothejungle.com")) return "wttj";
  if (url.includes("apec.fr")) return "apec";
  if (url.includes("pole-emploi.fr") || url.includes("francetravail.fr")) return "france-travail";
  return "other";
}

const CONTRACT_KEYWORDS = ["CDI", "CDD", "Freelance", "Stage", "Alternance", "Interim"];
const LOCATION_PATTERN = /^[A-ZÀ-Ú][a-zà-ú]+([\s-][A-ZÀ-Ú]?[a-zà-ú]+)*(\s*\(\d{2,5}\))?$/;

// Patterns for aggregated/search pages that are NOT individual job postings
const AGGREGATED_URL_PATTERNS = [
  /linkedin\.com\/jobs\/search/,
  /linkedin\.com\/jobs\/?\?/,
  /linkedin\.com\/jobs\/?$/,
  /indeed\.\w+\/jobs\?/,
  /indeed\.\w+\/q-/,
  /welcometothejungle\.com\/fr\/jobs\?/,
  /apec\.fr\/candidat\/recherche-emploi/,
  /francetravail\.fr\/candidat\/offres\/recherche/,
];

const AGGREGATED_TITLE_PATTERNS = [
  /offres?\s+d['']?\s*emploi[s]?\s+\d+/i,
  /^\d+\s+offres?\s+d['']?\s*emploi/i,
  /^\d+\s+résultats/i,
  /offres?\s+d['']?\s*emploi.*\d{2,}\s/i,
];

function isAggregatedResult(result: BraveSearchResult): boolean {
  if (AGGREGATED_URL_PATTERNS.some((p) => p.test(result.url))) return true;
  if (AGGREGATED_TITLE_PATTERNS.some((p) => p.test(result.title))) return true;
  return false;
}

function isIndividualJobUrl(url: string): boolean {
  // LinkedIn individual job
  if (url.includes("linkedin.com/jobs/view/")) return true;
  // Indeed individual job
  if (/indeed\.\w+\/viewjob/.test(url)) return true;
  if (/indeed\.\w+\/rc\/clk/.test(url)) return true;
  // WTTJ individual job
  if (/welcometothejungle\.com\/.*\/companies\/.*\/jobs\//.test(url)) return true;
  // APEC individual job (with numeric ID)
  if (/apec\.fr\/candidat\/recherche-emploi\.html#\/offre\/\d/.test(url)) return true;
  if (/apec\.fr\/.*\/offre\/\d/.test(url)) return true;
  // France Travail individual job
  if (/francetravail\.fr\/.*\/offre\//.test(url)) return true;
  // Allow other domains (company career pages, etc.)
  if (!url.includes("linkedin.com") && !url.includes("indeed.") &&
      !url.includes("welcometothejungle.com") && !url.includes("apec.fr") &&
      !url.includes("francetravail.fr")) return true;
  return false;
}

function parseJobFromResult(result: BraveSearchResult): ParsedJobResult {
  const title = result.title
    .replace(/ - Indeed.*$/, "")
    .replace(/ \| Indeed$/, "")
    .replace(/ \| LinkedIn$/, "")
    .replace(/ - Welcome to the Jungle$/, "")
    .replace(/ - Apec\.fr$/, "")
    .replace(/ \| Apec$/, "")
    // Remove "Offres d'emploi NNN" prefixes
    .replace(/^offres?\s+d['']?\s*emploi[s]?\s+\d+\s*/i, "")
    .replace(/^\d+\s+offres?\s+d['']?\s*emploi[s]?\s*/i, "")
    .trim();

  const parts = title.split(" - ");

  // Filter out contract types and locations to find the real company
  let jobTitle = parts[0]?.trim() || title;
  let company = "Entreprise non spécifiée";
  let location: string | null = null;

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i].trim();
    // Skip contract type keywords
    if (CONTRACT_KEYWORDS.some((k) => part.toUpperCase().includes(k.toUpperCase()))) continue;
    // Skip gender markers like (H/F), (F/H), (H/F/X)
    if (/^\(?\s*[HFX]\s*\/\s*[HFX]\s*(\/\s*[HFX]\s*)?\)?$/.test(part)) continue;
    // Detect location patterns (city name, possibly with postal code)
    if (LOCATION_PATTERN.test(part) && company !== "Entreprise non spécifiée") {
      location = part;
      continue;
    }
    // First valid non-contract part is the company
    if (company === "Entreprise non spécifiée") {
      company = part;
    } else if (!location) {
      location = part;
    }
  }

  return {
    title: jobTitle,
    company,
    location,
    url: result.url,
    source: detectSource(result.url),
    snippet: result.description,
  };
}

export async function searchJobs(
  query: string,
  location?: string,
  remote?: string,
  contract?: string,
  count: number = 10
): Promise<ParsedJobResult[]> {
  const apiKey = process.env.BRAVE_API_KEY;
  if (!apiKey) throw new Error("BRAVE_API_KEY non configurée");

  const sites = "site:linkedin.com/jobs/view OR site:indeed.fr/viewjob OR site:welcometothejungle.com/fr/companies/*/jobs/* OR site:apec.fr OR site:francetravail.fr";
  const locationQuery = location ? ` ${location}` : "";
  const remoteQuery = remote === "remote" ? " télétravail" : remote === "hybrid" ? " hybride" : "";
  const contractQuery = contract ? ` ${contract}` : "";
  const searchQuery = `${query}${locationQuery}${remoteQuery}${contractQuery} emploi ${sites}`;

  // Request more results to compensate for post-filtering
  const fetchCount = Math.min(count * 2, 20);

  const params = new URLSearchParams({
    q: searchQuery,
    count: fetchCount.toString(),
    search_lang: "fr",
  });

  const response = await fetch(`https://api.search.brave.com/res/v1/web/search?${params}`, {
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip",
      "X-Subscription-Token": apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(`Brave Search API error: ${response.status}`);
  }

  const data = await response.json();
  const results: BraveSearchResult[] = data.web?.results || [];

  return results
    .filter((r) => !isAggregatedResult(r))
    .filter((r) => isIndividualJobUrl(r.url))
    .map(parseJobFromResult)
    .slice(0, count);
}

export async function fetchJobDescription(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; JobMatcher/1.0)",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return "";

    const html = await response.text();

    // Basic HTML to text conversion
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\s+/g, " ")
      .trim();

    // Limit to first 5000 chars to avoid token limits
    return text.slice(0, 5000);
  } catch {
    return "";
  }
}
