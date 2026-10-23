import { describe, it, expect } from "vitest";
import { leaderIndexes, barWidths, diffLabel, differs, parseIds } from "../compare";

describe("compare utils", () => {
  it("leaderIndexes: min, seri, kosong", () => {
    expect(leaderIndexes([259, 218, 235], "min")).toEqual([1]);
    expect(leaderIndexes([200, 200], "min")).toEqual([]);
    expect(leaderIndexes([200, undefined], "min")).toEqual([]);
    expect(leaderIndexes([200, 180, 180], "min")).toEqual([1, 2]);
  });
  it("barWidths relatif ke terbesar", () => {
    expect(barWidths([100, 50, undefined])).toEqual([100, 50, 0]);
    expect(barWidths([undefined])).toEqual([0]);
  });
  it("diffLabel", () => {
    expect(diffLabel(218, 259, "g")).toBe("+41 g");
    expect(diffLabel(259, 218, "g")).toBe("-41 g");
    expect(diffLabel(8, 8, "mm")).toBe("sama (mm)");
    expect(diffLabel(undefined, 8, "mm")).toBe("-");
  });
  it("differs", () => {
    expect(differs(["None", "none"])).toBe(false);
    expect(differs(["None", "Carbon Fiber"])).toBe(true);
  });
  it("parseIds unik & dibatasi", () => {
    expect(parseIds("a,b,a, c ,d")).toEqual(["a", "b", "c"]);
    expect(parseIds(null)).toEqual([]);
    expect(parseIds("x,y", 1)).toEqual(["x"]);
  });
});
