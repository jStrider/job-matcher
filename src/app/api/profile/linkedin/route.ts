import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

interface SearchResult {
  title: string;
  description: string;
  url: string;
}

// Strategy 1: Direct fetch with multiple User-Agents
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
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
          "Cache-Control": "no-cache",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) continue;
      const html = await res.text();

      const parts: string[] = [];

      // Title
      const title = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      if (title) parts.push(`Titre: ${title[1].trim()}`);

      // Meta description (LinkedIn puts summary here)
      const metaDesc =
        html.match(
          /<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i
        ) ||
        html.match(
          /<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i
        );
      if (metaDesc) parts.push(`Description: ${metaDesc[1]}`);

      // OG description (often more detailed)
      const ogDesc =
        html.match(
          /<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["']/i
        ) ||
        html.match(
          /<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:description["']/i
        );
      if (ogDesc && ogDesc[1] !== metaDesc?.[1])
        parts.push(`Description OG: ${ogDesc[1]}`);

      // OG title
      const ogTitle =
        html.match(
          /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["']/i
        );
      if (ogTitle) parts.push(`Titre OG: ${ogTitle[1]}`);

      // JSON-LD (richest structured data)
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

      // LinkedIn specific: sections from public profile HTML
      // Experience, education, skills are in specific sections
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
          const text = match[1]
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim();
          if (text.length > 20) parts.push(`Section: ${text.substring(0, 2000)}`);
        }
      }

      // Full body text as fallback (strip scripts/styles)
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

// Strategy 2: Google cache (often has full indexed version)
async function fetchGoogleCache(url: string): Promise<string> {
  try {
    const cacheUrl = `https://webcache.googleusercontent.com/search?q=cache:${encodeURIComponent(url)}`;
    const res = await fetch(cacheUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
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

    return text.length > 200
      ? `Google Cache:\n${text.substring(0, 8000)}`
      : "";
  } catch {
    return "";
  }
}

// Strategy 3: Multi-query Brave Search for comprehensive data
async function fetchBraveSearch(
  linkedinUrl: string,
  username: string
): Promise<string> {
  const braveKey = process.env.BRAVE_API_KEY;
  if (!braveKey) return "";

  // Multiple targeted queries to gather max info
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

  // Deduplicate by URL
  const seen = new Set<string>();
  const unique = allResults.filter((r) => {
    if (seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });

  if (unique.length === 0) return "";

  return (
    "Résultats de recherche web:\n\n" +
    unique
      .map((r) => `${r.title}\n${r.description}\nURL: ${r.url}`)
      .join("\n\n")
  );
}

// Strategy 4: Fetch related pages (company pages, portfolio links found in search)
async function fetchRelatedPages(
  searchResults: string,
  username: string
): Promise<string> {
  // Extract non-LinkedIn URLs from search results that might have more profile info
  const urlMatches = searchResults.matchAll(/URL: (https?:\/\/[^\s]+)/g);
  const relatedContent: string[] = [];

  for (const match of urlMatches) {
    const url = match[1];
    // Skip LinkedIn itself, only fetch external pages about the person
    if (url.includes("linkedin.com")) continue;
    if (relatedContent.length >= 2) break; // Max 2 external pages

    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
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
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { url } = await req.json();
  if (!url || !url.includes("linkedin.com")) {
    return NextResponse.json(
      { error: "URL LinkedIn invalide. Exemple: https://linkedin.com/in/votre-profil" },
      { status: 400 }
    );
  }

  const linkedinUrl = url.trim().replace(/\/$/, "");
  const username =
    linkedinUrl.match(/linkedin\.com\/in\/([^/?#]+)/)?.[1] || "";

  if (!username) {
    return NextResponse.json(
      {
        error:
          "URL invalide. Utilisez le format: https://linkedin.com/in/votre-profil",
      },
      { status: 400 }
    );
  }

  try {
    // Run all strategies in parallel
    const [directContent, cacheContent, searchContent] = await Promise.all([
      fetchDirect(linkedinUrl),
      fetchGoogleCache(linkedinUrl),
      fetchBraveSearch(linkedinUrl, username),
    ]);

    // Fetch related pages based on search results
    const relatedContent =
      searchContent.length > 100
        ? await fetchRelatedPages(searchContent, username)
        : "";

    // Combine all sources
    const allContent = [
      directContent ? `=== PROFIL LINKEDIN (page directe) ===\n${directContent}` : "",
      cacheContent ? `=== CACHE GOOGLE ===\n${cacheContent}` : "",
      searchContent ? `=== RECHERCHE WEB ===\n${searchContent}` : "",
      relatedContent ? `=== PAGES LIÉES ===\n${relatedContent}` : "",
    ]
      .filter(Boolean)
      .join("\n\n---\n\n");

    if (allContent.length < 100) {
      return NextResponse.json(
        {
          error:
            "Pas assez d'informations trouvées. Le profil est peut-être privé ou le nom d'utilisateur incorrect.",
        },
        { status: 404 }
      );
    }

    // Use Claude to extract and synthesize a complete profile
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 3000,
      messages: [
        {
          role: "user",
          content: `Tu es un expert en extraction de profils professionnels. Voici toutes les données collectées depuis différentes sources pour un profil LinkedIn.

OBJECTIF: Génère un profil professionnel COMPLET et DÉTAILLÉ en français. 

STRUCTURE ATTENDUE:
- Nom complet
- Titre / Poste actuel
- Localisation
- Résumé professionnel (3-5 phrases)
- Expérience professionnelle (TOUTES les expériences trouvées, avec entreprise, poste, durée, et description si disponible)
- Compétences techniques (liste exhaustive)
- Formation (diplômes, écoles, années)
- Certifications (si trouvées)
- Langues
- Centres d'intérêt / Bénévolat (si trouvés)

RÈGLES:
- Extrais le MAXIMUM d'information de toutes les sources
- Croise les données entre les sources pour avoir le profil le plus complet
- Ne rajoute RIEN qui n'est pas dans les données
- Si une info apparaît dans plusieurs sources, prends la version la plus détaillée
- Format: texte structuré (pas de JSON, pas de markdown)

DONNÉES COLLECTÉES:
${allContent}`,
        },
      ],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Count how many sources contributed
    const sources = [
      directContent.length > 100 ? "profil direct" : "",
      cacheContent.length > 100 ? "cache Google" : "",
      searchContent.length > 100 ? "recherche web" : "",
      relatedContent.length > 100 ? "pages liées" : "",
    ].filter(Boolean);

    return NextResponse.json({
      text,
      source: "linkedin",
      sourcesUsed: sources,
      dataSize: allContent.length,
    });
  } catch (error) {
    console.error("LinkedIn fetch error:", error);
    return NextResponse.json(
      {
        error:
          "Erreur lors de la récupération du profil. Réessayez ou collez le texte manuellement.",
      },
      { status: 500 }
    );
  }
}
