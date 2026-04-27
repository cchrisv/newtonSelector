import {
  normalizePicklist,
  normalizeCollection,
  normalizeSObjectDTO,
  normalizeCustom,
  normalizeStringCollection,
  filterItems,
  applyOverrides,
  SAMPLE_ITEMS
} from "c/newtonUtilitySelectorDataSources";

describe("newtonUtilitySelectorDataSources", () => {
  describe("normalizePicklist", () => {
    it("returns [] for bad input", () => {
      expect(normalizePicklist(null)).toEqual([]);
      expect(normalizePicklist({})).toEqual([]);
    });

    it("maps getPicklistValues output to items", () => {
      const input = {
        values: [
          { label: "Hot", value: "Hot" },
          { label: "Cold", value: "Cold" }
        ]
      };
      const items = normalizePicklist(input);
      expect(items).toHaveLength(2);
      expect(items[0].label).toBe("Hot");
      expect(items[0].value).toBe("Hot");
      expect(items[0].disabled).toBe(false);
    });
  });

  describe("normalizeCollection", () => {
    it("uses fieldMap to pull label/sublabel/icon", () => {
      const records = [
        { Id: "001", Name: "Acme", Industry: "Technology" },
        { Id: "002", Name: "Beta", Industry: "Finance" }
      ];
      const map = { label: "Name", sublabel: "Industry" };
      const items = normalizeCollection(records, map);
      expect(items).toHaveLength(2);
      expect(items[0].label).toBe("Acme");
      expect(items[0].sublabel).toBe("Technology");
      expect(items[0].value).toBe("001");
    });

    it("falls back to placeholder label when mapped field is missing", () => {
      const items = normalizeCollection([{ Id: "001" }], { label: "Missing" });
      expect(items[0].label).toBe("(row 1)");
    });
  });

  describe("normalizeSObjectDTO", () => {
    it("maps Apex DTOs verbatim", () => {
      const dtos = [{ id: "a", label: "A", value: "a", disabled: true }];
      const items = normalizeSObjectDTO(dtos);
      expect(items[0].disabled).toBe(true);
    });
  });

  describe("normalizeStringCollection", () => {
    it("returns [] for non-array input", () => {
      expect(normalizeStringCollection(null)).toEqual([]);
      expect(normalizeStringCollection(undefined)).toEqual([]);
      expect(normalizeStringCollection("abc")).toEqual([]);
    });
    it("maps each string to label and value", () => {
      const items = normalizeStringCollection(["Hot", "Warm", "Cold"]);
      expect(items).toHaveLength(3);
      expect(items[0].label).toBe("Hot");
      expect(items[0].value).toBe("Hot");
      expect(items[1].label).toBe("Warm");
      expect(items[1].value).toBe("Warm");
    });
    it("coerces non-string inputs to strings and handles null/undefined", () => {
      const items = normalizeStringCollection([1, null, "hello"]);
      expect(items[0].value).toBe("1");
      expect(items[1].value).toBe("");
      expect(items[2].value).toBe("hello");
    });
    it("assigns stable-looking ids per index", () => {
      const items = normalizeStringCollection(["a", "b"]);
      expect(items[0].id).toBe("str-0-a");
      expect(items[1].id).toBe("str-1-b");
    });
    it("leaves other tile slots empty", () => {
      const [first] = normalizeStringCollection(["Hot"]);
      expect(first.icon).toBe("");
      expect(first.sublabel).toBe("");
      expect(first.badge).toBe("");
      expect(first.helpText).toBe("");
      expect(first.disabled).toBe(false);
    });
  });

  describe("normalizeCustom", () => {
    it("generates id/value fallbacks", () => {
      const items = normalizeCustom([{ label: "X" }]);
      expect(items[0].id).toBe("cu-0");
      expect(items[0].value).toBe("0");
    });

    it("preserves caller-provided fields", () => {
      const items = normalizeCustom([
        {
          label: "Alpha",
          value: "a",
          badge: "New",
          helpText: "hint"
        }
      ]);
      expect(items[0].badge).toBe("New");
      expect(items[0].helpText).toBe("hint");
    });

    it("filters hidden custom items", () => {
      const items = normalizeCustom([
        { label: "Visible", value: "visible" },
        { label: "Hidden", value: "hidden", hidden: true }
      ]);
      expect(items).toHaveLength(1);
      expect(items[0].value).toBe("visible");
    });
  });

  describe("filterItems", () => {
    it("matches across label + sublabel + helpText", () => {
      const items = [
        { label: "Alpha", sublabel: "", helpText: "", value: "1" },
        { label: "Beta", sublabel: "math", helpText: "", value: "2" },
        { label: "Gamma", sublabel: "", helpText: "needle", value: "3" }
      ];
      expect(filterItems(items, "alph")).toHaveLength(1);
      expect(filterItems(items, "math")).toHaveLength(1);
      expect(filterItems(items, "needle")).toHaveLength(1);
      expect(filterItems(items, "")).toHaveLength(3);
    });
  });

  describe("applyOverrides", () => {
    it("applies override fields by value key", () => {
      const items = [
        { value: "a", label: "A", icon: "" },
        { value: "b", label: "B", icon: "" }
      ];
      const out = applyOverrides(items, {
        a: { icon: "building-2", badge: "New" }
      });
      expect(out[0].icon).toBe("building-2");
      expect(out[0].badge).toBe("New");
      expect(out[1].icon).toBe("");
    });

    it("ignores empty override values", () => {
      const items = [{ value: "a", icon: "file" }];
      const out = applyOverrides(items, { a: { icon: "" } });
      expect(out[0].icon).toBe("file");
    });

    it("filters items with hidden overrides", () => {
      const items = [
        { value: "a", label: "A" },
        { value: "b", label: "B" }
      ];
      const out = applyOverrides(items, { b: { hidden: true } });
      expect(out).toEqual([{ value: "a", label: "A" }]);
    });
  });

  describe("SAMPLE_ITEMS", () => {
    it("ships at least 4 items for preview", () => {
      expect(SAMPLE_ITEMS.length).toBeGreaterThanOrEqual(4);
    });
  });
});
