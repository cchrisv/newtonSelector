import {
  serializeValue,
  serializeConditions,
  parseWhereClause,
  operatorsForType,
  validateCustomLogic,
  serializeConditionsWithCustomLogic,
  parseCustomWhereClause,
  renumberCustomLogic
} from "c/newtonSelectorFlowCpeWhereBuilder";

describe("operatorsForType", () => {
  it("returns text operators for STRING / TEXTAREA / URL / EMAIL / PHONE", () => {
    ["STRING", "TEXTAREA", "URL", "EMAIL", "PHONE", "ENCRYPTEDSTRING"].forEach(
      (t) => {
        const ops = operatorsForType(t).map((o) => o.value);
        expect(ops).toEqual(["=", "!=", "LIKE", "NOT LIKE", "IN", "NOT IN"]);
      }
    );
  });

  it("returns numeric operators for INTEGER / DOUBLE / CURRENCY / PERCENT", () => {
    ["INTEGER", "LONG", "DOUBLE", "CURRENCY", "PERCENT"].forEach((t) => {
      const ops = operatorsForType(t).map((o) => o.value);
      expect(ops).toEqual(["=", "!=", "<", ">", "<=", ">="]);
    });
  });

  it("returns boolean-only operators for BOOLEAN", () => {
    expect(operatorsForType("BOOLEAN").map((o) => o.value)).toEqual([
      "=",
      "!="
    ]);
  });

  it("returns date operators for DATE / DATETIME / TIME", () => {
    ["DATE", "DATETIME", "TIME"].forEach((t) => {
      const ops = operatorsForType(t).map((o) => o.value);
      expect(ops).toEqual(["=", "!=", "<", ">", "<=", ">="]);
    });
  });

  it("returns set operators for PICKLIST / COMBOBOX", () => {
    ["PICKLIST", "COMBOBOX"].forEach((t) => {
      const ops = operatorsForType(t).map((o) => o.value);
      expect(ops).toEqual(["=", "!=", "IN", "NOT IN"]);
    });
  });

  it("returns INCLUDES/EXCLUDES for MULTIPICKLIST", () => {
    expect(operatorsForType("MULTIPICKLIST").map((o) => o.value)).toEqual([
      "INCLUDES",
      "EXCLUDES"
    ]);
  });

  it("returns IN/NOT IN for REFERENCE (lookup)", () => {
    expect(operatorsForType("REFERENCE").map((o) => o.value)).toEqual([
      "=",
      "!=",
      "IN",
      "NOT IN"
    ]);
  });

  it("is case-insensitive on the type argument", () => {
    expect(operatorsForType("string")).toEqual(operatorsForType("STRING"));
    expect(operatorsForType("mUlTiPiCkLiSt")).toEqual(
      operatorsForType("MULTIPICKLIST")
    );
  });

  it("falls back to text operators for unknown / empty / null types", () => {
    const textOps = ["=", "!=", "LIKE", "NOT LIKE", "IN", "NOT IN"];
    expect(operatorsForType("").map((o) => o.value)).toEqual(textOps);
    expect(operatorsForType(null).map((o) => o.value)).toEqual(textOps);
    expect(operatorsForType("NEWWEIRDTYPE").map((o) => o.value)).toEqual(
      textOps
    );
  });
});

describe("serializeValue", () => {
  describe("IN / NOT IN", () => {
    it("wraps string items in single quotes, comma-space separated", () => {
      expect(serializeValue("a,b,c", "STRING", "IN")).toBe("('a', 'b', 'c')");
    });

    it("trims whitespace between items", () => {
      expect(serializeValue("a , b ,  c  ", "STRING", "IN")).toBe(
        "('a', 'b', 'c')"
      );
    });

    it("drops empty items", () => {
      expect(serializeValue("a,,b,", "STRING", "IN")).toBe("('a', 'b')");
    });

    it("numeric types skip quotes", () => {
      expect(serializeValue("1,2,3", "INTEGER", "IN")).toBe("(1, 2, 3)");
      expect(serializeValue("1.5, 2.5", "DOUBLE", "NOT IN")).toBe("(1.5, 2.5)");
    });

    it("passes merge fields through unchanged", () => {
      expect(serializeValue("{!myCollection}", "STRING", "IN")).toBe(
        "{!myCollection}"
      );
      expect(serializeValue("{$User.Id}", "REFERENCE", "IN")).toBe(
        "{$User.Id}"
      );
    });

    it("escapes single quotes inside string items", () => {
      expect(serializeValue("O'Brien,Smith", "STRING", "IN")).toBe(
        "('O\\'Brien', 'Smith')"
      );
    });
  });

  describe("INCLUDES / EXCLUDES", () => {
    it("serializes multi-select picklist values as SOQL literal lists", () => {
      expect(serializeValue("A, B", "MULTIPICKLIST", "INCLUDES")).toBe(
        "('A', 'B')"
      );
      expect(serializeValue("A, B", "MULTIPICKLIST", "EXCLUDES")).toBe(
        "('A', 'B')"
      );
    });

    it("escapes quotes in multi-select picklist values", () => {
      expect(
        serializeValue("Children's, Women's", "MULTIPICKLIST", "INCLUDES")
      ).toBe("('Children\\'s', 'Women\\'s')");
    });
  });

  describe("BOOLEAN", () => {
    it('accepts "true" / "True" / "TRUE" as TRUE', () => {
      expect(serializeValue("true", "BOOLEAN", "=")).toBe("TRUE");
      expect(serializeValue("True", "BOOLEAN", "=")).toBe("TRUE");
      expect(serializeValue("TRUE", "BOOLEAN", "=")).toBe("TRUE");
    });

    it("treats anything else as FALSE", () => {
      expect(serializeValue("false", "BOOLEAN", "=")).toBe("FALSE");
      expect(serializeValue("", "BOOLEAN", "=")).toBe("FALSE");
      expect(serializeValue("0", "BOOLEAN", "=")).toBe("FALSE");
      expect(serializeValue("no", "BOOLEAN", "=")).toBe("FALSE");
    });
  });

  describe("numeric", () => {
    it("renders unquoted for INTEGER / LONG / DOUBLE / CURRENCY / PERCENT", () => {
      expect(serializeValue("42", "INTEGER", "=")).toBe("42");
      expect(serializeValue("-3.14", "DOUBLE", ">")).toBe("-3.14");
      expect(serializeValue("1000.50", "CURRENCY", "<=")).toBe("1000.50");
      expect(serializeValue("0.5", "PERCENT", "!=")).toBe("0.5");
    });
  });

  describe("DATE / DATETIME", () => {
    it("passes through as-is (no quoting)", () => {
      expect(serializeValue("2026-04-17", "DATE", "=")).toBe("2026-04-17");
      expect(serializeValue("2026-04-17T23:59:59Z", "DATETIME", "<=")).toBe(
        "2026-04-17T23:59:59Z"
      );
      expect(serializeValue("TODAY", "DATE", ">")).toBe("TODAY");
    });
  });

  describe("LIKE / NOT LIKE", () => {
    it("wraps plain strings in %...%", () => {
      expect(serializeValue("acme", "STRING", "LIKE")).toBe("'%acme%'");
      expect(serializeValue("acme", "STRING", "NOT LIKE")).toBe("'%acme%'");
    });

    it("preserves user-supplied wildcards", () => {
      expect(serializeValue("acme%", "STRING", "LIKE")).toBe("'acme%'");
      expect(serializeValue("%acme", "STRING", "LIKE")).toBe("'%acme'");
      expect(serializeValue("a_me", "STRING", "LIKE")).toBe("'a_me'");
    });

    it("passes merge fields through without wrapping", () => {
      expect(serializeValue("{!searchTerm}", "STRING", "LIKE")).toBe(
        "{!searchTerm}"
      );
    });
  });

  describe("string =/!=", () => {
    it("wraps in single quotes", () => {
      expect(serializeValue("Acme", "STRING", "=")).toBe("'Acme'");
    });

    it("escapes internal single quotes", () => {
      expect(serializeValue("O'Brien", "STRING", "=")).toBe("'O\\'Brien'");
    });

    it("escapes backslashes", () => {
      expect(serializeValue("foo\\bar", "STRING", "=")).toBe("'foo\\\\bar'");
    });

    it("passes merge fields through unquoted", () => {
      expect(serializeValue("{!myVar}", "STRING", "=")).toBe("{!myVar}");
      expect(serializeValue("{$User.Id}", "STRING", "=")).toBe("{$User.Id}");
    });
  });
});

describe("serializeConditions", () => {
  const type = (t) => ({ _fieldType: t });

  it("serializes a single condition with AND logic default", () => {
    const conds = [
      { field: "Name", operator: "=", value: "Acme", ...type("STRING") }
    ];
    expect(serializeConditions(conds, "AND")).toBe("Name = 'Acme'");
  });

  it("joins multiple conditions with AND", () => {
    const conds = [
      {
        field: "Industry",
        operator: "=",
        value: "Technology",
        ...type("STRING")
      },
      {
        field: "NumberOfEmployees",
        operator: ">",
        value: "500",
        ...type("INTEGER")
      }
    ];
    expect(serializeConditions(conds, "AND")).toBe(
      "Industry = 'Technology' AND NumberOfEmployees > 500"
    );
  });

  it("joins multiple conditions with OR", () => {
    const conds = [
      { field: "Type", operator: "=", value: "Customer", ...type("PICKLIST") },
      { field: "Type", operator: "=", value: "Prospect", ...type("PICKLIST") }
    ];
    expect(serializeConditions(conds, "OR")).toBe(
      "Type = 'Customer' OR Type = 'Prospect'"
    );
  });

  it("handles relationship field syntax (Account.Name)", () => {
    const conds = [
      { field: "Account.Name", operator: "=", value: "Acme", ...type("STRING") }
    ];
    expect(serializeConditions(conds, "AND")).toBe("Account.Name = 'Acme'");
  });

  it("skips conditions with empty value", () => {
    const conds = [
      { field: "Industry", operator: "=", value: "", ...type("STRING") },
      { field: "Name", operator: "=", value: "Acme", ...type("STRING") }
    ];
    expect(serializeConditions(conds, "AND")).toBe("Name = 'Acme'");
  });

  it("skips conditions missing field or operator", () => {
    const conds = [
      { field: "", operator: "=", value: "x", ...type("STRING") },
      { field: "Name", operator: "", value: "y", ...type("STRING") },
      { field: "Name", operator: "=", value: "z", ...type("STRING") }
    ];
    expect(serializeConditions(conds, "AND")).toBe("Name = 'z'");
  });

  it('keeps 0 as a valid value (not skipped like "")', () => {
    const conds = [
      { field: "AnnualRevenue", operator: "=", value: 0, ...type("CURRENCY") }
    ];
    expect(serializeConditions(conds, "AND")).toBe("AnnualRevenue = 0");
  });

  it("mixes types correctly in one clause", () => {
    const conds = [
      { field: "IsActive", operator: "=", value: "true", ...type("BOOLEAN") },
      { field: "Name", operator: "LIKE", value: "Acme", ...type("STRING") },
      {
        field: "Type",
        operator: "IN",
        value: "Customer, Prospect",
        ...type("PICKLIST")
      }
    ];
    expect(serializeConditions(conds, "AND")).toBe(
      "IsActive = TRUE AND Name LIKE '%Acme%' AND Type IN ('Customer', 'Prospect')"
    );
  });

  it("serializes multi-select picklist INCLUDES lists", () => {
    const conds = [
      {
        field: "Topics__c",
        operator: "INCLUDES",
        value: "A, B",
        ...type("MULTIPICKLIST")
      }
    ];
    expect(serializeConditions(conds, "AND")).toBe(
      "Topics__c INCLUDES ('A', 'B')"
    );
  });
});

describe("parseWhereClause", () => {
  it("returns empty state for null / empty / whitespace", () => {
    expect(parseWhereClause(null)).toEqual({ conditions: [], logic: "AND" });
    expect(parseWhereClause("")).toEqual({ conditions: [], logic: "AND" });
    expect(parseWhereClause("   ")).toEqual({ conditions: [], logic: "AND" });
  });

  it("parses a single = condition", () => {
    const r = parseWhereClause("Name = 'Acme'");
    expect(r.logic).toBe("AND");
    expect(r.conditions).toHaveLength(1);
    expect(r.conditions[0]).toMatchObject({
      field: "Name",
      operator: "=",
      value: "Acme"
    });
  });

  it("parses AND-joined conditions", () => {
    const r = parseWhereClause("Industry = 'Tech' AND NumberOfEmployees > 100");
    expect(r.logic).toBe("AND");
    expect(r.conditions).toHaveLength(2);
    expect(r.conditions[0]).toMatchObject({ field: "Industry", value: "Tech" });
    expect(r.conditions[1]).toMatchObject({
      field: "NumberOfEmployees",
      operator: ">",
      value: "100"
    });
  });

  it("parses OR-joined conditions", () => {
    const r = parseWhereClause("Type = 'Customer' OR Type = 'Prospect'");
    expect(r.logic).toBe("OR");
    expect(r.conditions).toHaveLength(2);
  });

  it("returns null for mixed AND / OR (too complex for visual editor)", () => {
    expect(parseWhereClause("a = '1' AND b = '2' OR c = '3'")).toBeNull();
  });

  it("handles case-insensitive AND / OR", () => {
    expect(parseWhereClause("a = '1' and b = '2'").logic).toBe("AND");
    expect(parseWhereClause("a = '1' or b = '2'").logic).toBe("OR");
  });

  it("parses IN clause and unwraps the parens + quotes", () => {
    const r = parseWhereClause("Type IN ('Customer', 'Prospect')");
    expect(r.conditions[0]).toMatchObject({
      field: "Type",
      operator: "IN",
      value: "Customer, Prospect"
    });
  });

  it("parses INCLUDES clause and unwraps the parens + quotes", () => {
    const r = parseWhereClause("Topics__c INCLUDES ('A', 'B')");
    expect(r.conditions[0]).toMatchObject({
      field: "Topics__c",
      operator: "INCLUDES",
      value: "A, B"
    });
  });

  it("parses LIKE and strips the %...% wrappers for round-trip display", () => {
    const r = parseWhereClause("Name LIKE '%Acme%'");
    expect(r.conditions[0]).toMatchObject({
      field: "Name",
      operator: "LIKE",
      value: "Acme"
    });
  });

  it("keeps partial wildcards (strip only when both sides wrapped)", () => {
    const r = parseWhereClause("Name LIKE 'Acme%'");
    // 'Acme%' has only trailing % — not both sides — so value should stay 'Acme%'
    expect(r.conditions[0].value).toBe("Acme%");
  });

  it("parses NOT LIKE", () => {
    const r = parseWhereClause("Name NOT LIKE '%test%'");
    expect(r.conditions[0]).toMatchObject({
      operator: "NOT LIKE",
      value: "test"
    });
  });

  it("parses relationship fields (Account.Name)", () => {
    const r = parseWhereClause("Account.Name = 'Acme'");
    expect(r.conditions[0].field).toBe("Account.Name");
  });

  it("unescapes single quotes and backslashes", () => {
    const r = parseWhereClause("Name = 'O\\'Brien'");
    expect(r.conditions[0].value).toBe("O'Brien");
  });

  it("preserves merge-field values unwrapped", () => {
    const r = parseWhereClause("OwnerId = {!$User.Id}");
    expect(r.conditions[0].value).toBe("{!$User.Id}");
  });

  it("returns null on an unparseable segment", () => {
    expect(parseWhereClause("this is not soql")).toBeNull();
  });
});

describe("round-trip: serialize(parse(x)) ~= x", () => {
  // With field-type hints preserved, parsed conditions should re-serialize identically.
  function roundTrip(soql, fieldTypeMap) {
    const parsed = parseWhereClause(soql);
    if (!parsed) return null;
    const enriched = parsed.conditions.map((c) => ({
      ...c,
      _fieldType: fieldTypeMap[c.field] || "STRING"
    }));
    return serializeConditions(enriched, parsed.logic);
  }

  it("round-trips a single string =", () => {
    expect(roundTrip("Name = 'Acme'", { Name: "STRING" })).toBe(
      "Name = 'Acme'"
    );
  });

  it("round-trips AND with mixed types", () => {
    const soql = "Industry = 'Tech' AND NumberOfEmployees > 100";
    const types = { Industry: "STRING", NumberOfEmployees: "INTEGER" };
    expect(roundTrip(soql, types)).toBe(soql);
  });

  it("round-trips IN clause", () => {
    const soql = "Type IN ('Customer', 'Prospect')";
    expect(roundTrip(soql, { Type: "PICKLIST" })).toBe(soql);
  });

  it("round-trips INCLUDES clause", () => {
    const soql = "Topics__c INCLUDES ('A', 'B')";
    expect(roundTrip(soql, { Topics__c: "MULTIPICKLIST" })).toBe(soql);
  });

  it("round-trips LIKE with %...%", () => {
    const soql = "Name LIKE '%Acme%'";
    expect(roundTrip(soql, { Name: "STRING" })).toBe(soql);
  });

  it("round-trips escaped single quotes", () => {
    const soql = "Name = 'O\\'Brien'";
    expect(roundTrip(soql, { Name: "STRING" })).toBe(soql);
  });

  it("round-trips BOOLEAN literal", () => {
    const soql = "IsActive = TRUE";
    const parsed = parseWhereClause(soql);
    const enriched = parsed.conditions.map((c) => ({
      ...c,
      _fieldType: "BOOLEAN"
    }));
    expect(serializeConditions(enriched, parsed.logic)).toBe(soql);
  });

  it("round-trips date literal", () => {
    const soql = "CloseDate > 2026-01-01";
    const parsed = parseWhereClause(soql);
    const enriched = parsed.conditions.map((c) => ({
      ...c,
      _fieldType: "DATE"
    }));
    expect(serializeConditions(enriched, parsed.logic)).toBe(soql);
  });
});

describe("validateCustomLogic", () => {
  it("rejects empty expression", () => {
    expect(validateCustomLogic("", 3)).toEqual({
      valid: false,
      error: "Custom logic is required."
    });
  });

  it("accepts simple 1 AND 2", () => {
    expect(validateCustomLogic("1 AND 2", 2)).toEqual({
      valid: true,
      error: ""
    });
  });

  it("accepts nested grouping 1 AND (2 OR 3)", () => {
    expect(validateCustomLogic("1 AND (2 OR 3)", 3)).toEqual({
      valid: true,
      error: ""
    });
  });

  it("flags unbalanced parens", () => {
    const r = validateCustomLogic("1 AND (2 OR 3", 3);
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/parens|paren/i);
  });

  it("flags out-of-range condition reference", () => {
    const r = validateCustomLogic("1 AND 5", 3);
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/#5/);
  });

  it("flags unknown tokens", () => {
    const r = validateCustomLogic("1 XOR 2", 2);
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/XOR/);
  });

  it("flags two operators in a row", () => {
    const r = validateCustomLogic("1 AND AND 2", 2);
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/two operators/i);
  });

  it("flags missing operator between conditions", () => {
    const r = validateCustomLogic("1 2", 2);
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/missing/i);
  });

  it("flags leading operator", () => {
    const r = validateCustomLogic("AND 1", 2);
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/starts with/i);
  });

  it("flags trailing operator", () => {
    const r = validateCustomLogic("1 AND", 2);
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/ends with/i);
  });

  it("is case-insensitive on AND / OR tokens", () => {
    expect(validateCustomLogic("1 and 2", 2).valid).toBe(true);
    expect(validateCustomLogic("1 or 2", 2).valid).toBe(true);
  });
});

describe("serializeConditionsWithCustomLogic", () => {
  const conditions = [
    { field: "Name", operator: "=", value: "Acme", _fieldType: "STRING" },
    {
      field: "Industry",
      operator: "=",
      value: "Technology",
      _fieldType: "STRING"
    },
    { field: "Revenue", operator: ">", value: "100", _fieldType: "INTEGER" }
  ];

  it("substitutes 1 AND 2", () => {
    expect(serializeConditionsWithCustomLogic(conditions, "1 AND 2")).toBe(
      "(Name = 'Acme') AND (Industry = 'Technology')"
    );
  });

  it("substitutes nested 1 AND (2 OR 3)", () => {
    expect(
      serializeConditionsWithCustomLogic(conditions, "1 AND (2 OR 3)")
    ).toBe(
      "(Name = 'Acme') AND ((Industry = 'Technology') OR (Revenue > 100))"
    );
  });

  it("returns empty string when a referenced condition is incomplete", () => {
    const partial = [
      { field: "Name", operator: "=", value: "Acme", _fieldType: "STRING" },
      { field: "", operator: "=", value: "", _fieldType: "" }
    ];
    expect(serializeConditionsWithCustomLogic(partial, "1 AND 2")).toBe("");
  });

  it("returns empty string when expression is empty", () => {
    expect(serializeConditionsWithCustomLogic(conditions, "")).toBe("");
  });

  it("returns empty string when reference is out of range", () => {
    expect(serializeConditionsWithCustomLogic(conditions, "1 AND 9")).toBe("");
  });
});

describe("parseCustomWhereClause", () => {
  it("returns ALL mode for pure AND", () => {
    const r = parseCustomWhereClause(
      "Name = 'Acme' AND Industry = 'Technology'"
    );
    expect(r.logicMode).toBe("ALL");
    expect(r.customLogic).toBe("");
    expect(r.conditions).toHaveLength(2);
  });

  it("returns ANY mode for pure OR", () => {
    const r = parseCustomWhereClause("Name = 'Acme' OR Name = 'Globex'");
    expect(r.logicMode).toBe("ANY");
    expect(r.conditions).toHaveLength(2);
  });

  it("returns CUSTOM mode for mixed AND/OR", () => {
    const r = parseCustomWhereClause(
      "Name = 'Acme' AND (Industry = 'Technology' OR Revenue > 100)"
    );
    expect(r.logicMode).toBe("CUSTOM");
    expect(r.customLogic).toBe("1 AND (2 OR 3)");
    expect(r.conditions).toHaveLength(3);
    expect(r.conditions[0].field).toBe("Name");
    expect(r.conditions[1].field).toBe("Industry");
    expect(r.conditions[2].field).toBe("Revenue");
  });

  it("handles IN lists inside conditions without confusing grouping", () => {
    const r = parseCustomWhereClause(
      "Industry IN ('A', 'B') AND Name = 'Acme'"
    );
    expect(r.logicMode).toBe("ALL");
    expect(r.conditions).toHaveLength(2);
    expect(r.conditions[0].operator).toBe("IN");
  });

  it("returns null for truly unparseable input", () => {
    expect(parseCustomWhereClause("this is not soql")).toBe(null);
  });

  it("round-trips a custom-logic expression through serialize", () => {
    const input =
      "(Name = 'Acme') AND ((Industry = 'Technology') OR (Revenue > 100))";
    const parsed = parseCustomWhereClause(input);
    expect(parsed.logicMode).toBe("CUSTOM");
    const enriched = parsed.conditions.map((c, i) => ({
      ...c,
      _fieldType: i === 2 ? "INTEGER" : "STRING"
    }));
    const serialized = serializeConditionsWithCustomLogic(
      enriched,
      parsed.customLogic
    );
    expect(serialized).toBe(input);
  });
});

describe("renumberCustomLogic", () => {
  it("strips the removed index and decrements higher indices", () => {
    expect(renumberCustomLogic("1 AND 2 AND 3", 2)).toBe("1 AND 2");
  });

  it("keeps grouping intact when removing a middle reference", () => {
    expect(renumberCustomLogic("1 AND (2 OR 3)", 2)).toBe("1 AND 2");
  });

  it("collapses empty parens", () => {
    expect(renumberCustomLogic("(1 OR 2) AND 3", 2)).toBe("1 AND 2");
  });

  it("returns empty when nothing is left", () => {
    expect(renumberCustomLogic("1", 1)).toBe("");
  });

  it("drops redundant outer parens around a single number", () => {
    expect(renumberCustomLogic("(1 AND 2)", 1)).toBe("1");
  });
});
