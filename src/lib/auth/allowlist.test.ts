import { describe, it, expect } from "vitest";
import { isAllowedEmail } from "./allowlist";

const DOMAINS = "student.sbhs.nsw.edu.au,education.nsw.gov.au";

describe("isAllowedEmail", () => {
  it("accepts allowed domains case-insensitively", () => {
    expect(isAllowedEmail("kid@student.sbhs.nsw.edu.au", DOMAINS)).toBe(true);
    expect(isAllowedEmail("KID@Education.NSW.gov.au", DOMAINS)).toBe(true);
  });
  it("rejects other domains and lookalikes", () => {
    expect(isAllowedEmail("kid@gmail.com", DOMAINS)).toBe(false);
    expect(isAllowedEmail("kid@evilstudent.sbhs.nsw.edu.au.attacker.com", DOMAINS)).toBe(false);
    expect(isAllowedEmail("kid@notsbhs.nsw.edu.au", DOMAINS)).toBe(false);
  });
  it("rejects malformed input", () => {
    expect(isAllowedEmail("", DOMAINS)).toBe(false);
    expect(isAllowedEmail("no-at-sign", DOMAINS)).toBe(false);
    expect(isAllowedEmail("two@ats@student.sbhs.nsw.edu.au", DOMAINS)).toBe(false);
  });
});
