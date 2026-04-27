import { buildTokens } from "c/newtonSelectorFlowCpeUtilitySearchHighlight";

describe("buildTokens", () => {
  it("returns a single non-highlighted token when text is empty", () => {
    expect(buildTokens("", "foo")).toEqual([
      { key: "token-0", text: "", isHighlight: false }
    ]);
  });

  it("returns a single non-highlighted token when term is empty", () => {
    expect(buildTokens("Account Name", "")).toEqual([
      { key: "token-0", text: "Account Name", isHighlight: false }
    ]);
  });

  it("returns a single non-highlighted token when term is only whitespace", () => {
    expect(buildTokens("Account Name", "   ")).toEqual([
      { key: "token-0", text: "Account Name", isHighlight: false }
    ]);
  });

  it("returns a single non-highlighted token when there is no match", () => {
    const tokens = buildTokens("Account Name", "xyz");
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toEqual({
      key: "token-0",
      text: "Account Name",
      isHighlight: false
    });
  });

  it("splits around a single match preserving surrounding text", () => {
    const tokens = buildTokens("Account Name", "count");
    expect(tokens).toEqual([
      { key: "token-0", text: "Ac", isHighlight: false },
      { key: "token-1", text: "count", isHighlight: true },
      { key: "token-2", text: " Name", isHighlight: false }
    ]);
  });

  it("matches case-insensitively while preserving original casing", () => {
    const tokens = buildTokens("Hello World", "WORLD");
    expect(tokens).toEqual([
      { key: "token-0", text: "Hello ", isHighlight: false },
      { key: "token-1", text: "World", isHighlight: true }
    ]);
  });

  it("highlights multiple non-overlapping matches", () => {
    const tokens = buildTokens("ababab", "ab");
    expect(tokens).toEqual([
      { key: "token-0", text: "ab", isHighlight: true },
      { key: "token-1", text: "ab", isHighlight: true },
      { key: "token-2", text: "ab", isHighlight: true }
    ]);
  });

  it("handles a match at the very start of the text", () => {
    const tokens = buildTokens("abc def", "abc");
    expect(tokens[0]).toEqual({
      key: "token-0",
      text: "abc",
      isHighlight: true
    });
    expect(tokens[1]).toEqual({
      key: "token-1",
      text: " def",
      isHighlight: false
    });
  });

  it("handles a match at the very end of the text", () => {
    const tokens = buildTokens("abc def", "def");
    expect(tokens).toEqual([
      { key: "token-0", text: "abc ", isHighlight: false },
      { key: "token-1", text: "def", isHighlight: true }
    ]);
  });

  it("coerces non-string text / term to strings safely", () => {
    expect(buildTokens(null, "x")).toEqual([
      { key: "token-0", text: "", isHighlight: false }
    ]);
    expect(buildTokens("123", 123)).toEqual([
      { key: "token-0", text: "123", isHighlight: true }
    ]);
  });
});
