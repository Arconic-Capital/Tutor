export function isAllowedEmail(email: string, domainsCsv: string): boolean {
  const parts = email.toLowerCase().split("@");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return false;
  const domain = parts[1];
  return domainsCsv
    .toLowerCase()
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean)
    .some((d) => domain === d);
}
