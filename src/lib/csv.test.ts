import { describe, expect, it } from "vitest";
import { decimalBR, formatCell } from "./csv";

describe("formatCell", () => {
  it("neutralizes formula-injection payloads with a leading apostrophe", () => {
    expect(formatCell("=HYPERLINK(\"http://evil\")")).toBe(
      "\"'=HYPERLINK(\"\"http://evil\"\")\"",
    );
    expect(formatCell("+1+1")).toBe("'+1+1");
    expect(formatCell("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(formatCell("-cmd")).toBe("'-cmd");
  });

  it("keeps plain and negative numbers intact (no apostrophe)", () => {
    expect(formatCell(42)).toBe("42");
    expect(formatCell(-10.5)).toBe("-10.5");
    expect(formatCell("-2+3")).toBe("-2+3");
  });

  it("renders null/undefined as empty", () => {
    expect(formatCell(null)).toBe("");
    expect(formatCell(undefined)).toBe("");
  });

  it("quotes and doubles embedded quotes when needed", () => {
    expect(formatCell('a"b')).toBe('"a""b"');
    expect(formatCell("line1\nline2")).toBe('"line1\nline2"');
  });
});

describe("decimalBR", () => {
  it("always uses two decimals with pt-BR separators", () => {
    expect(decimalBR(1234.5)).toBe("1.234,50");
    expect(decimalBR(1000)).toBe("1.000,00");
  });
});
