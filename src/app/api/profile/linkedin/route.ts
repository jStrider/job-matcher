import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

async function fetchLinkedInProfile(url: string): Promise<string> {
  // Normalize LinkedIn URL
  const linkedinUrl = url.trim().replace(/\/$/, "");

  // Strategy 1: Try fetching the public profile page directly
  try {
    const res = await fetch(linkedinUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
      },
      redirect: "follow",
    });

    if (res.ok) {
      const html = await res.text();
      // Extract text content from meta tags and visible content
      const metaDesc =
        html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"/) ||
        html.match(/<meta[^>]*content="([^"]*)"[^>]*name="description"/);
      const ogDesc =
        html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]*)"/) ||
        html.match(/<meta[^>]*content="([^"]*)"[^>]*property="og:description"/);
      const title =
        html.match(/<title>([^<]*)<\/title>/);

      // Extract JSON-LD data if available
      const jsonLdMatch = html.match(
        /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g
      );
      let jsonLdData = "";
      if (jsonLdMatch) {
        jsonLdData = jsonLdMatch
          .map((m) => {
            const content = m.replace(
              /<script[^>]*type="application\/ld\+json"[^>]*>/,
              ""
            ).replace(/<\/script>/, "");
            return content;
          })
          .join("\n");
      }

      // Get visible text (strip HTML tags)
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
      let bodyText = "";
      if (bodyMatch) {
        bodyText = bodyMatch[1]
          .replace(/<script[\s\S]*?<\/script>/gi, "")
          .replace(/<style[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .substring(0, 5000);
      }

      const directContent = [
        title ? `Title: ${title[1]}` : "",
        metaDesc ? `Meta Description: ${metaDesc[1]}` : "",
        ogDesc ? `OG Description: ${ogDesc[1]}` : "",
        jsonLdData ? `JSON-LD: ${jsonLdData}` : "",
        bodyText ? `Page Content: ${bodyText}` : "",
      ]
        .filter(Boolean)
        .join("\n\n");

      if (directContent.length > 200) {
        return directContent;
      }
    }
  } catch {
    // Direct fetch failed, try Brave Search
  }

  // Strategy 2: Use Brave Search to find profile info
  const braveKey = process.env.BRAVE_API_KEY;
  if (!braveKey) throw new Error("BRAVE_API_KEY not configured");

  // Extract username from URL for better search
  const username = linkedinUrl.match(/linkedin\.com\/in\/([^/?]+)/)?.[1] || "";

  const searchQuery = username
    ? `site:linkedin.com/in/${username} OR "${username}" linkedin profile`
    : linkedinUrl;

  const braveRes = await fetch(
    `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(searchQuery)}&count=5`,
    {
      headers: {
        "X-Subscription-Token": braveKey,
        Accept: "application/json",
      },
    }
  );

  if (!braveRes.ok) throw new Error("Brave Search failed");

  const braveData = await braveRes.json();
  const results = braveData.web?.results || [];

  const searchContent = results
    .map(
      (r: { title: string; description: string; url: string }) =>
        `${r.title}\n${r.description}\nURL: ${r.url}`
    )
    .join("\n\n");

  if (!searchContent) throw new Error("No profile data found");

  return `LinkedIn Profile URL: ${linkedinUrl}\n\nSearch Results:\n${searchContent}`;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { url } = await req.json();
  if (!url || !url.includes("linkedin.com")) {
    return NextResponse.json(
      { error: "URL LinkedIn invalide" },
      { status: 400 }
    );
  }

  try {
    // Fetch LinkedIn profile data
    const profileData = await fetchLinkedInProfile(url);

    // Use Claude to extract structured profile from scraped data
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: `Voici les données extraites d'un profil LinkedIn. Génère un texte de profil professionnel complet en français à partir de ces informations. 
          
Inclus: nom, titre actuel, résumé, expériences professionnelles (entreprises, postes, durées), compétences techniques, formation, langues, localisation.

Si certaines infos manquent, ne les invente pas.

Données brutes:
${profileData}

Génère le profil au format texte structuré (pas de JSON, pas de markdown), comme un CV textuel.`,
        },
      ],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";

    return NextResponse.json({ text, source: "linkedin" });
  } catch (error) {
    console.error("LinkedIn fetch error:", error);
    return NextResponse.json(
      {
        error:
          "Impossible de récupérer le profil LinkedIn. Vérifiez que le profil est public.",
      },
      { status: 500 }
    );
  }
}
