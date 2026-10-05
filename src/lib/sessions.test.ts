import { describe, expect, it } from "vitest";
import type { ClientId, SessionWithClient } from "./sessions";
import {
  clientSessionsSummary,
  endOfDay,
  formatBRL,
  initialLetters,
  parseMoney,
  startOfDay,
} from "./sessions";

describe("parseMoney", () => {
  it("parses pt-BR currency strings", () => {
    expect(parseMoney("R$ 2.500,00")).toBe(2500);
    expect(parseMoney("1.234,56")).toBe(1234.56);
    expect(parseMoney("2500")).toBe(2500);
    expect(parseMoney("1,5")).toBe(1.5);
  });

  it("returns 0 for unparseable or non-positive input", () => {
    expect(parseMoney("")).toBe(0);
    expect(parseMoney("abc")).toBe(0);
    expect(parseMoney("-5")).toBe(0);
    expect(parseMoney("0")).toBe(0);
  });
});

describe("day boundaries", () => {
  it("startOfDay/endOfDay bracket the same local day", () => {
    const ts = new Date(2026, 0, 15, 13, 30, 0).getTime();
    expect(startOfDay(ts)).toBe(new Date(2026, 0, 15, 0, 0, 0, 0).getTime());
    expect(endOfDay(ts)).toBe(new Date(2026, 0, 15, 23, 59, 59, 999).getTime());
  });
});

describe("initialLetters", () => {
  it("takes at most two initials", () => {
    expect(initialLetters("Ana Maria Silva")).toBe("AM");
    expect(initialLetters("ana")).toBe("A");
    expect(initialLetters("   ")).toBe("");
  });
});

describe("formatBRL", () => {
  it("formats values in Brazilian reais", () => {
    expect(formatBRL(1000)).toContain("1.000");
    expect(formatBRL(1000).replace(/\s/g, " ")).toMatch(/^R\$ 1\.000$/);
    expect(formatBRL(1234.5).replace(/\s/g, " ")).toContain("1.234,50");
  });
});

describe("clientSessionsSummary", () => {
  it("excludes cancelled sessions and computes revenue and amount due", () => {
    const cid = "client1" as unknown as ClientId;
    const other = "client2" as unknown as ClientId;
    const sessions = [
      { clientId: cid, price: 100, paid: 0, status: "orcamento" },
      { clientId: cid, price: 200, paid: 50, status: "realizada" },
      { clientId: cid, price: 300, paid: 0, status: "cancelada" },
      { clientId: other, price: 999, paid: 0, status: "agendada" },
    ] as unknown as Pick<
      SessionWithClient,
      "clientId" | "price" | "paid" | "status"
    >[];

    expect(clientSessionsSummary(sessions, cid)).toEqual({
      count: 2,
      revenue: 300,
      due: 250,
    });
  });

  it("never returns negative amount due", () => {
    const cid = "client1" as unknown as ClientId;
    const sessions = [
      { clientId: cid, price: 100, paid: 150, status: "realizada" },
    ] as unknown as Pick<
      SessionWithClient,
      "clientId" | "price" | "paid" | "status"
    >[];

    expect(clientSessionsSummary(sessions, cid).due).toBe(0);
  });
});
