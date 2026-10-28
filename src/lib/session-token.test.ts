import { describe, it, expect } from "vitest";
import { sign, encodeSession, decodeSession, isAdminRole, isSuperviseurRole, type SessionPayload } from "./session-token";

const samplePayload: SessionPayload = {
  userId: 1,
  login: "admin",
  role: "Admin",
  exp: Date.now() + 1000 * 60 * 60, // 1 hour from now
};

describe("session-token", () => {
  it("round-trips a valid payload through encode/decode", () => {
    const token = encodeSession(samplePayload);
    const decoded = decodeSession(token);
    expect(decoded).toEqual(samplePayload);
  });

  it("produces a deterministic signature for the same input", () => {
    expect(sign("hello")).toBe(sign("hello"));
  });

  it("produces different signatures for different inputs", () => {
    expect(sign("hello")).not.toBe(sign("world"));
  });

  it("rejects a token with a tampered body", () => {
    const token = encodeSession(samplePayload);
    const [body, signature] = token.split(".");
    // Flip the role claim without re-signing — simulates a forged cookie.
    const tamperedPayload = { ...samplePayload, role: "Admin_hacked" };
    const tamperedBody = Buffer.from(JSON.stringify(tamperedPayload)).toString("base64url");
    const tamperedToken = `${tamperedBody}.${signature}`;

    expect(decodeSession(tamperedToken)).toBeNull();
    // sanity check the original still decodes fine
    expect(decodeSession(`${body}.${signature}`)).toEqual(samplePayload);
  });

  it("rejects a token with a tampered signature", () => {
    const token = encodeSession(samplePayload);
    const [body] = token.split(".");
    expect(decodeSession(`${body}.not-the-real-signature`)).toBeNull();
  });

  it("rejects an expired token", () => {
    const expired: SessionPayload = { ...samplePayload, exp: Date.now() - 1000 };
    const token = encodeSession(expired);
    expect(decodeSession(token)).toBeNull();
  });

  it("rejects malformed tokens", () => {
    expect(decodeSession("")).toBeNull();
    expect(decodeSession("no-dot-here")).toBeNull();
    expect(decodeSession("...")).toBeNull();
    expect(decodeSession("!!!not-base64!!!.also-not-valid")).toBeNull();
  });
});

describe("isAdminRole", () => {
  it("returns true only for the exact string 'Admin'", () => {
    expect(isAdminRole("Admin")).toBe(true);
  });

  it("rejects case variants — role checks must not be case-insensitive", () => {
    expect(isAdminRole("admin")).toBe(false);
    expect(isAdminRole("ADMIN")).toBe(false);
  });

  it("rejects the regular user role and other strings", () => {
    expect(isAdminRole("Utilisateur")).toBe(false);
    expect(isAdminRole("Superadmin")).toBe(false);
  });

  it("rejects null/undefined/empty without throwing", () => {
    expect(isAdminRole(null)).toBe(false);
    expect(isAdminRole(undefined)).toBe(false);
    expect(isAdminRole("")).toBe(false);
  });
});

describe("isSuperviseurRole", () => {
  it("returns true only for the exact string 'Superviseur'", () => {
    expect(isSuperviseurRole("Superviseur")).toBe(true);
  });

  it("rejects case variants — role checks must not be case-insensitive", () => {
    expect(isSuperviseurRole("superviseur")).toBe(false);
    expect(isSuperviseurRole("SUPERVISEUR")).toBe(false);
  });

  it("rejects Admin and Utilisateur — Superviseur is a distinct third role, not an alias", () => {
    expect(isSuperviseurRole("Admin")).toBe(false);
    expect(isSuperviseurRole("Utilisateur")).toBe(false);
  });

  it("rejects null/undefined/empty without throwing", () => {
    expect(isSuperviseurRole(null)).toBe(false);
    expect(isSuperviseurRole(undefined)).toBe(false);
    expect(isSuperviseurRole("")).toBe(false);
  });
});
