import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireAuth, isAuthError, apiHandler } from "@/lib/api-utils";
import { linkedinUrlSchema } from "@/lib/validations";
import { logger } from "@/lib/logger";

const anthropic = new Anthropic();

interface SearchResult {
  title: string;
  description: string;
  url: string;
}

async function fetchDirect(url: string): Promise<string> {
  const userAgents = [
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    "Mozilla/5.0 (compatible; Bingbot/2.0; +http://www.bing.com/bingbot.htm)",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  ];

  for (const ua of userAgents) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": ua,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
          "Cache-Control": "no-cache",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) continue;
      const html = await res.text();

      const parts: string[] = [];

      const title = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      if (title) parts.push(`Titre: ${title[1].trim()}`);

      const metaDesc =
        html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
        html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
      if (metaDesc) parts.push(`Description: ${metaDesc[1]}`);

      const ogDesc =
        html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["']/i) ||
        html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:description["']/i);
      if (ogDesc && ogDesc[1] !== metaDesc?.[1]) parts.push(`Description OG: ${ogDesc[1]}`);

      const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["']/i);
      if (ogTitle) parts.push(`Titre OG: ${ogTitle[1]}`);

      const jsonLdMatches = html.matchAll(
        /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
      );
      for (const m of jsonLdMatches) {
        try {
          const data = JSON.parse(m[1]);
          parts.push(`JSON-LD: ${JSON.stringify(data, null, 2)}`);
        } catch {
          parts.push(`JSON-LD (raw): ${m[1].trim().substring(0, 3000)}`);
        }
      }

      const sectionPatterns = [
        /experience[^"]*"[^>]*>([\s\S]*?)<\/section>/gi,
        /education[^"]*"[^>]*>([\s\S]*?)<\/section>/gi,
        /skills[^"]*"[^>]*>([\s\S]*?)<\/section>/gi,
        /certifications[^"]*"[^>]*>([\s\S]*?)<\/section>/gi,
        /languages[^"]*"[^>]*>([\s\S]*?)<\/section>/gi,
        /about[^"]*"[^>]*>([\s\S]*?)<\/section>/gi,
      ];

      for (const pattern of sectionPatterns) {
        const matches = html.matchAll(pattern);
        for (const match of matches) {
          const text = match[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
          if (text.length > 20) parts.push(`Section: ${text.substring(0, 2000)}`);
        }
      }

      const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
      if (bodyMatch) {
        const bodyText = bodyMatch[1]
          .replace(/<script[\s\S]*?<\/script>/gi, "")
          .replace(/<style[\s\S]*?<\/style>/gi, "")
          .replace(/<nav[\s\S]*?<\/nav>/gi, "")
          .replace(/<footer[\s\S]*?<\/footer>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/&nbsp;/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/&quot;/g, '"')
          .replace(/&#x27;/g, "'")
          .replace(/\s+/g, " ")
          .trim();
        if (bodyText.length > 100) {
          parts.push(`Contenu page: ${bodyText.substring(0, 8000)}`);
        }
      }

      const result = parts.join("\n\n");
      if (result.length > 200) return result;
    } catch {
      continue;
    }
  }
  return "";
}

async function fetchGoogleCache(url: string): Promise<string> {
  try {
    const cacheUrl = `https://webcache.googleusercontent.com/search?q=cache:${encodeURIComponent(url)}`;
    const res = await fetch(cacheUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        Accept: "text/html",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return "";
    const html = await res.text();

    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return text.length > 200 ? `Google Cache:\n${text.substring(0, 8000)}` : "";
  } catch {
    return "";
  }
}

async function fetchBraveSearch(linkedinUrl: string, username: string): Promise<string> {
  const braveKey = process.env.BRAVE_API_KEY;
  if (!braveKey) return "";

  const queries = [
    `site:linkedin.com/in/${username}`,
    `"${username.replace(/-/g, " ")}" linkedin experience skills`,
    `"${username.replace(/-/g, " ")}" CV profil professionnel`,
  ];

  const allResults: SearchResult[] = [];

  for (const query of queries) {
    try {
      const res = await fetch(
        `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5&search_lang=fr`,
        {
          headers: {
            "X-Subscription-Token": braveKey,
            Accept: "application/json",
          },
          signal: AbortSignal.timeout(8000),
        }
      );

      if (!res.ok) continue;
      const data = await res.json();
      const results = data.web?.results || [];
      allResults.push(
        ...results.map((r: SearchResult) => ({
          title: r.title,
          description: r.description,
          url: r.url,
        }))
      );
    } catch {
      continue;
    }
  }

  const seen = new Set<string>();
  const unique = allResults.filter((r) => {
    if (seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });

  if (unique.length === 0) return "";

  return (
    "Resultats de recherche web:\n\n" +
    unique.map((r) => `${r.title}\n${r.description}\nURL: ${r.url}`).join("\n\n")
  );
}

async function fetchRelatedPages(searchResults: string, username: string): Promise<string> {
  const urlMatches = searchResults.matchAll(/URL: (https?:\/\/[^\s]+)/g);
  const relatedContent: string[] = [];

  for (const match of urlMatches) {
    const url = match[1];
    if (url.includes("linkedin.com")) continue;
    if (relatedContent.length >= 2) break;

    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) continue;
      const html = await res.text();
      const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .substring(0, 3000);

      if (
        text.length > 200 &&
        text.toLowerCase().includes(username.replace(/-/g, " ").split(" ")[0].toLowerCase())
      ) {
        relatedContent.push(`Page externe (${url}):\n${text}`);
      }
    } catch {
      continue;
    }
  }

  return relatedContent.join("\n\n");
}

export async function POST(req: NextRequest) {
  return apiHandler("profile/linkedin/POST", async () => {
    const session = await requireAuth();
    if (isAuthError(session)) return session;

    const body = await req.json();
    const parsed = linkedinUrlSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "URL invalide" },
        { status: 400 }
      );
    }

    const linkedinUrl = parsed.data.url.trim().replace(/\/$/, "");
    const username = linkedinUrl.match(/linkedin\.com\/in\/([^/?#]+)/)?.[1] || "";

    if (!username) {
      return NextResponse.json(
        { error: "URL invalide. Utilisez le format: https://linkedin.com/in/votre-profil" },
        { status: 400 }
      );
    }

    const [directContent, cacheContent, searchContent] = await Promise.all([
      fetchDirect(linkedinUrl),
      fetchGoogleCache(linkedinUrl),
      fetchBraveSearch(linkedinUrl, username),
    ]);

    const relatedContent =
      searchContent.length > 100 ? await fetchRelatedPages(searchContent, username) : "";

    const allContent = [
      directContent ? `=== PROFIL LINKEDIN (page directe) ===\n${directContent}` : "",
      cacheContent ? `=== CACHE GOOGLE ===\n${cacheContent}` : "",
      searchContent ? `=== RECHERCHE WEB ===\n${searchContent}` : "",
      relatedContent ? `=== PAGES LIEES ===\n${relatedContent}` : "",
    ]
      .filter(Boolean)
      .join("\n\n---\n\n");

    if (allContent.length < 100) {
      return NextResponse.json(
        {
          error:
            "Pas assez d'informations trouvees. Le profil est peut-etre prive ou le nom d'utilisateur incorrect.",
        },
        { status: 404 }
      );
    }

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 3000,
      messages: [
        {
          role: "user",
          content: `Tu es un expert en extraction de profils professionnels. Voici toutes les donnees collectees depuis differentes sources pour un profil LinkedIn.

OBJECTIF: Genere un profil professionnel COMPLET et DETAILLE en francais.

STRUCTURE ATTENDUE:
- Nom complet
- Titre / Poste actuel
- Localisation
- Resume professionnel (3-5 phrases)
- Experience professionnelle (TOUTES les experiences trouvees, avec entreprise, poste, duree, et description si disponible)
- Competences techniques (liste exhaustive)
- Formation (diplomes, ecoles, annees)
- Certifications (si trouvees)
- Langues
- Centres d'interet / Benevolat (si trouves)

REGLES:
- Extrais le MAXIMUM d'information de toutes les sources
- Croise les donnees entre les sources pour avoir le profil le plus complet
- Ne rajoute RIEN qui n'est pas dans les donnees
- Si une info apparait dans plusieurs sources, prends la version la plus detaillee
- Format: texte structure (pas de JSON, pas de markdown)

DONNEES COLLECTEES:
${allContent}`,
        },
      ],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";

    const sources = [
      directContent.length > 100 ? "profil direct" : "",
      cacheContent.length > 100 ? "cache Google" : "",
      searchContent.length > 100 ? "recherche web" : "",
      relatedContent.length > 100 ? "pages liees" : "",
    ].filter(Boolean);

    logger.info("LinkedIn profile extracted", {
      context: "profile/linkedin",
      username,
      sourcesCount: sources.length,
      dataSize: allContent.length,
    });

    return NextResponse.json({
      text,
      source: "linkedin",
      sourcesUsed: sources,
      dataSize: allContent.length,
    });
  });
}
