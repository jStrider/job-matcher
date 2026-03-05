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

function parseJobFromResult(result: BraveSearchResult): ParsedJobResult {
  const title = result.title
    .replace(/ - Indeed.*$/, "")
    .replace(/ \| LinkedIn$/, "")
    .replace(/ - Welcome to the Jungle$/, "")
    .replace(/ - Apec\.fr$/, "")
    .trim();

  const parts = title.split(" - ");
  const jobTitle = parts[0]?.trim() || title;
  const company = parts[1]?.trim() || "Entreprise non specifiee";
  const location = parts[2]?.trim() || null;

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
  count: number = 20
): Promise<ParsedJobResult[]> {
  const apiKey = process.env.BRAVE_API_KEY;
  if (!apiKey) throw new Error("BRAVE_API_KEY non configuree");

  const sites = "site:indeed.fr OR site:linkedin.com/jobs OR site:welcometothejungle.com OR site:apec.fr";
  const locationQuery = location ? ` ${location}` : "";
  const searchQuery = `"${query}"${locationQuery} ${sites}`;

  const params = new URLSearchParams({
    q: searchQuery,
    count: count.toString(),
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

  return results.map(parseJobFromResult);
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
