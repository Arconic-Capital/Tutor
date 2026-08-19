import { describe, it, expect } from "vitest";
import { COURSES } from "./courses";

describe("course taxonomy", () => {
  it("has unique ids", () => {
    const ids = COURSES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every course has valid stage/yearLevels", () => {
    for (const c of COURSES) {
      expect([5, 6]).toContain(c.stage);
      for (const y of c.yearLevels) {
        if (c.stage === 5) expect([9, 10]).toContain(y);
        else expect([11, 12]).toContain(y);
      }
      expect(c.yearLevels.length).toBeGreaterThan(0);
    }
  });

  it("ids are kebab-case slugs", () => {
    for (const c of COURSES) expect(c.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("includes key SBHS stage 6 courses", () => {
    const ids = COURSES.map((c) => c.id);
    for (const id of [
      "english-advanced", "maths-advanced", "maths-ext-1", "maths-ext-2",
      "physics", "chemistry", "biology", "economics", "software-engineering",
    ]) expect(ids).toContain(id);
  });

  it("priority HSC courses have topics", () => {
    const priority = ["maths-advanced", "physics", "chemistry", "biology", "economics", "english-advanced"];
    for (const id of priority) {
      const c = COURSES.find((x) => x.id === id)!;
      expect(c.topics.length).toBeGreaterThan(2);
    }
  });
});
