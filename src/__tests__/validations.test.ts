import { describe, it, expect } from "vitest";
import { searchSchema, linkedinUrlSchema, jobStatusSchema, profileFieldSchema } from "@/lib/validations";

describe("searchSchema", () => {
  it("validates a correct search input", () => {
    const result = searchSchema.safeParse({
      query: "developer",
      location: "Paris",
      remote: "remote",
      contract: "CDI",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty query", () => {
    const result = searchSchema.safeParse({ query: "" });
    expect(result.success).toBe(false);
  });

  it("rejects whitespace-only query", () => {
    const result = searchSchema.safeParse({ query: "   " });
    expect(result.success).toBe(false);
  });

  it("accepts query with optional fields omitted", () => {
    const result = searchSchema.safeParse({ query: "react developer" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid remote value", () => {
    const result = searchSchema.safeParse({
      query: "dev",
      remote: "invalid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid contract value", () => {
    const result = searchSchema.safeParse({
      query: "dev",
      contract: "invalid",
    });
    expect(result.success).toBe(false);
  });
});

describe("linkedinUrlSchema", () => {
  it("validates a correct LinkedIn URL", () => {
    const result = linkedinUrlSchema.safeParse({
      url: "https://linkedin.com/in/john-doe",
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-LinkedIn URL", () => {
    const result = linkedinUrlSchema.safeParse({
      url: "https://example.com/profile",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty URL", () => {
    const result = linkedinUrlSchema.safeParse({ url: "" });
    expect(result.success).toBe(false);
  });
});

describe("jobStatusSchema", () => {
  it("validates correct statuses", () => {
    for (const status of ["saved", "applied", "interview", "offer", "rejected"]) {
      expect(jobStatusSchema.safeParse({ status }).success).toBe(true);
    }
  });

  it("rejects invalid status", () => {
    expect(jobStatusSchema.safeParse({ status: "unknown" }).success).toBe(false);
  });
});

describe("profileFieldSchema", () => {
  it("validates string field", () => {
    const result = profileFieldSchema.safeParse({
      field: "currentTitle",
      value: "Developer",
    });
    expect(result.success).toBe(true);
  });

  it("validates array field", () => {
    const result = profileFieldSchema.safeParse({
      field: "skills",
      value: ["React", "TypeScript"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid field name", () => {
    const result = profileFieldSchema.safeParse({
      field: "password",
      value: "hacked",
    });
    expect(result.success).toBe(false);
  });
});
