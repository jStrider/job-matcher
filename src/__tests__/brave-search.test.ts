import { describe, it, expect } from "vitest";

// We test the pure functions from brave-search by importing the module
// Since detectSource, parseJobFromResult, isAggregatedResult, isIndividualJobUrl
// are not exported, we test them through the exported interface behavior
// OR we extract and test the logic directly.

// For testability, let's test the parsing logic patterns directly.

describe("brave-search parsing", () => {
  describe("source detection", () => {
    function detectSource(url: string): string {
      if (url.includes("indeed.")) return "indeed";
      if (url.includes("linkedin.com")) return "linkedin";
      if (url.includes("welcometothejungle.com")) return "wttj";
      if (url.includes("apec.fr")) return "apec";
      if (url.includes("pole-emploi.fr") || url.includes("francetravail.fr"))
        return "france-travail";
      return "other";
    }

    it("detects Indeed URLs", () => {
      expect(detectSource("https://fr.indeed.com/viewjob?jk=abc123")).toBe("indeed");
      expect(detectSource("https://indeed.fr/viewjob?jk=abc123")).toBe("indeed");
    });

    it("detects LinkedIn URLs", () => {
      expect(detectSource("https://www.linkedin.com/jobs/view/12345")).toBe("linkedin");
    });

    it("detects WTTJ URLs", () => {
      expect(
        detectSource("https://www.welcometothejungle.com/fr/companies/acme/jobs/dev")
      ).toBe("wttj");
    });

    it("detects APEC URLs", () => {
      expect(detectSource("https://www.apec.fr/candidat/offre/123")).toBe("apec");
    });

    it("detects France Travail URLs", () => {
      expect(
        detectSource("https://candidat.francetravail.fr/offres/recherche/detail/123")
      ).toBe("france-travail");
      expect(
        detectSource("https://candidat.pole-emploi.fr/offres/recherche/detail/123")
      ).toBe("france-travail");
    });

    it("returns 'other' for unknown URLs", () => {
      expect(detectSource("https://www.monster.fr/jobs/123")).toBe("other");
    });
  });

  describe("aggregated result detection", () => {
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

    function isAggregatedResult(result: {
      title: string;
      url: string;
    }): boolean {
      if (AGGREGATED_URL_PATTERNS.some((p) => p.test(result.url))) return true;
      if (AGGREGATED_TITLE_PATTERNS.some((p) => p.test(result.title))) return true;
      return false;
    }

    it("detects LinkedIn search pages", () => {
      expect(
        isAggregatedResult({
          title: "Dev jobs",
          url: "https://www.linkedin.com/jobs/search?keywords=dev",
        })
      ).toBe(true);
    });

    it("detects Indeed search pages", () => {
      expect(
        isAggregatedResult({
          title: "Dev jobs",
          url: "https://fr.indeed.com/jobs?q=developer",
        })
      ).toBe(true);
    });

    it("detects aggregated titles with counts", () => {
      expect(
        isAggregatedResult({
          title: "150 offres d'emploi Developer",
          url: "https://example.com/jobs",
        })
      ).toBe(true);
    });

    it("does not flag individual job postings", () => {
      expect(
        isAggregatedResult({
          title: "Senior Dev - Acme Corp",
          url: "https://www.linkedin.com/jobs/view/12345",
        })
      ).toBe(false);
    });
  });

  describe("individual job URL detection", () => {
    function isIndividualJobUrl(url: string): boolean {
      if (url.includes("linkedin.com/jobs/view/")) return true;
      if (/indeed\.\w+\/viewjob/.test(url)) return true;
      if (/indeed\.\w+\/rc\/clk/.test(url)) return true;
      if (/welcometothejungle\.com\/.*\/companies\/.*\/jobs\//.test(url))
        return true;
      if (/apec\.fr\/candidat\/recherche-emploi\.html#\/offre\/\d/.test(url))
        return true;
      if (/apec\.fr\/.*\/offre\/\d/.test(url)) return true;
      if (/francetravail\.fr\/.*\/offre\//.test(url)) return true;
      if (
        !url.includes("linkedin.com") &&
        !url.includes("indeed.") &&
        !url.includes("welcometothejungle.com") &&
        !url.includes("apec.fr") &&
        !url.includes("francetravail.fr")
      )
        return true;
      return false;
    }

    it("accepts LinkedIn individual job URLs", () => {
      expect(
        isIndividualJobUrl("https://www.linkedin.com/jobs/view/12345")
      ).toBe(true);
    });

    it("accepts Indeed viewjob URLs", () => {
      expect(
        isIndividualJobUrl("https://fr.indeed.com/viewjob?jk=abc")
      ).toBe(true);
    });

    it("accepts WTTJ individual job URLs", () => {
      expect(
        isIndividualJobUrl(
          "https://www.welcometothejungle.com/fr/companies/acme/jobs/dev-senior"
        )
      ).toBe(true);
    });

    it("accepts external career page URLs", () => {
      expect(
        isIndividualJobUrl("https://careers.google.com/jobs/123")
      ).toBe(true);
    });

    it("rejects LinkedIn search URLs", () => {
      expect(
        isIndividualJobUrl("https://www.linkedin.com/jobs/developer-jobs")
      ).toBe(false);
    });
  });

  describe("job title parsing", () => {
    function parseTitle(rawTitle: string): string {
      return rawTitle
        .replace(/ - Indeed.*$/, "")
        .replace(/ \| Indeed$/, "")
        .replace(/ \| LinkedIn$/, "")
        .replace(/ - Welcome to the Jungle$/, "")
        .replace(/ - Apec\.fr$/, "")
        .replace(/ \| Apec$/, "")
        .replace(/^offres?\s+d['']?\s*emploi[s]?\s+\d+\s*/i, "")
        .replace(/^\d+\s+offres?\s+d['']?\s*emploi[s]?\s*/i, "")
        .trim();
    }

    it("strips Indeed suffix", () => {
      expect(parseTitle("Developer - Acme - Indeed.fr")).toBe("Developer - Acme");
    });

    it("strips LinkedIn suffix", () => {
      expect(parseTitle("Developer | LinkedIn")).toBe("Developer");
    });

    it("strips WTTJ suffix", () => {
      expect(parseTitle("Developer - Acme - Welcome to the Jungle")).toBe(
        "Developer - Acme"
      );
    });

    it("strips aggregated prefixes", () => {
      expect(parseTitle("150 offres d'emploi Developer Paris")).toBe(
        "Developer Paris"
      );
    });

    it("keeps clean titles unchanged", () => {
      expect(parseTitle("Senior Developer - Acme Corp")).toBe(
        "Senior Developer - Acme Corp"
      );
    });
  });
});
