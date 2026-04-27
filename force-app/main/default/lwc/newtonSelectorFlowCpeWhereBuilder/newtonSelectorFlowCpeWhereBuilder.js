import { LightningElement, api, track } from "lwc";
import searchLookupDatasetFieldsForObject from "@salesforce/apex/NewtonSelectorFlowCpeController.searchLookupDatasetFieldsForObject";

// ── Operator sets by field type ──────────────────────────────

const OPS_TEXT = [
  { label: "=", value: "=" },
  { label: "!=", value: "!=" },
  { label: "LIKE", value: "LIKE" },
  { label: "NOT LIKE", value: "NOT LIKE" },
  { label: "IN", value: "IN" },
  { label: "NOT IN", value: "NOT IN" }
];

const OPS_NUMBER = [
  { label: "=", value: "=" },
  { label: "!=", value: "!=" },
  { label: "<", value: "<" },
  { label: ">", value: ">" },
  { label: "<=", value: "<=" },
  { label: ">=", value: ">=" }
];

const OPS_BOOLEAN = [
  { label: "=", value: "=" },
  { label: "!=", value: "!=" }
];

const OPS_DATE = [
  { label: "=", value: "=" },
  { label: "!=", value: "!=" },
  { label: "<", value: "<" },
  { label: ">", value: ">" },
  { label: "<=", value: "<=" },
  { label: ">=", value: ">=" }
];

const OPS_PICKLIST = [
  { label: "=", value: "=" },
  { label: "!=", value: "!=" },
  { label: "IN", value: "IN" },
  { label: "NOT IN", value: "NOT IN" }
];

const OPS_MULTIPICKLIST = [
  { label: "INCLUDES", value: "INCLUDES" },
  { label: "EXCLUDES", value: "EXCLUDES" }
];

const OPS_REFERENCE = [
  { label: "=", value: "=" },
  { label: "!=", value: "!=" },
  { label: "IN", value: "IN" },
  { label: "NOT IN", value: "NOT IN" }
];

export function operatorsForType(fieldType) {
  const t = (fieldType || "").toUpperCase();
  switch (t) {
    case "STRING":
    case "TEXTAREA":
    case "URL":
    case "EMAIL":
    case "PHONE":
    case "ENCRYPTEDSTRING":
      return OPS_TEXT;
    case "INTEGER":
    case "LONG":
    case "DOUBLE":
    case "CURRENCY":
    case "PERCENT":
      return OPS_NUMBER;
    case "BOOLEAN":
      return OPS_BOOLEAN;
    case "DATE":
    case "DATETIME":
    case "TIME":
      return OPS_DATE;
    case "PICKLIST":
    case "COMBOBOX":
      return OPS_PICKLIST;
    case "MULTIPICKLIST":
      return OPS_MULTIPICKLIST;
    case "REFERENCE":
    case "ID":
      return OPS_REFERENCE;
    default:
      return OPS_TEXT;
  }
}

const LOGIC_OPTIONS = [
  { label: "AND", value: "AND" },
  { label: "OR", value: "OR" }
];

const BOOLEAN_OPTIONS = [
  { label: "TRUE", value: "TRUE" },
  { label: "FALSE", value: "FALSE" }
];

let _condSeq = 0;
let _groupSeq = 0;

// ── Serialization ────────────────────────────────────────────

function escapeString(s) {
  return String(s).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

export function serializeValue(raw, fieldType, operator) {
  const t = (fieldType || "").toUpperCase();
  const op = (operator || "").toUpperCase();

  if (
    op === "IN" ||
    op === "NOT IN" ||
    op === "INCLUDES" ||
    op === "EXCLUDES"
  ) {
    const rawStr = String(raw);
    // Merge field as entire collection value: Field IN {!CollectionVar}
    if (rawStr.startsWith("{!") || rawStr.startsWith("{$")) {
      return rawStr;
    }
    const items = rawStr
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    if (
      t === "INTEGER" ||
      t === "LONG" ||
      t === "DOUBLE" ||
      t === "CURRENCY" ||
      t === "PERCENT"
    ) {
      return "(" + items.join(", ") + ")";
    }
    return "(" + items.map((v) => "'" + escapeString(v) + "'").join(", ") + ")";
  }
  if (t === "BOOLEAN") {
    return String(raw).toUpperCase() === "TRUE" ? "TRUE" : "FALSE";
  }
  if (
    t === "INTEGER" ||
    t === "LONG" ||
    t === "DOUBLE" ||
    t === "CURRENCY" ||
    t === "PERCENT"
  ) {
    return String(raw);
  }
  if (t === "DATE" || t === "DATETIME") {
    return String(raw);
  }
  // Merge fields pass through unquoted
  const str = String(raw);
  if (str.startsWith("{!") || str.startsWith("{$")) {
    return str;
  }
  if (op === "LIKE" || op === "NOT LIKE") {
    if (!str.includes("%") && !str.includes("_")) {
      return "'%" + escapeString(str) + "%'";
    }
    return "'" + escapeString(str) + "'";
  }
  return "'" + escapeString(raw) + "'";
}

function fragmentFor(c) {
  if (!c.field || !c.operator || (c.value === "" && c.value !== 0)) return null;
  const fieldType = c._fieldType || "";
  const val = serializeValue(c.value, fieldType, c.operator);
  return `${c.field} ${c.operator} ${val}`;
}

export function serializeConditions(conditions, logic) {
  const parts = [];
  for (const c of conditions) {
    const frag = fragmentFor(c);
    if (frag) parts.push(frag);
  }
  return parts.join(` ${logic} `);
}

/**
 * Serialize conditions using a custom logic expression like "1 AND (2 OR 3)".
 * Returns empty string when the expression is invalid or references an incomplete condition.
 */
export function serializeConditionsWithCustomLogic(conditions, customLogic) {
  if (!customLogic || !customLogic.trim()) return "";
  const fragments = conditions.map((c) => fragmentFor(c));
  const refs = (customLogic.match(/\d+/g) || []).map(Number);
  for (const n of refs) {
    if (n < 1 || n > fragments.length) return "";
    if (fragments[n - 1] == null) return ""; // incomplete → empty preview
  }
  return customLogic.replace(/\d+/g, (m) => `(${fragments[Number(m) - 1]})`);
}

/**
 * Validate a custom logic expression. Returns { valid, error }.
 */
export function validateCustomLogic(expr, count) {
  if (!expr || !expr.trim())
    return { valid: false, error: "Custom logic is required." };
  const s = expr.trim();

  // Balanced parens
  let depth = 0;
  for (const ch of s) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (depth < 0) return { valid: false, error: "Unbalanced parentheses." };
  }
  if (depth !== 0) return { valid: false, error: "Unbalanced parentheses." };

  // Tokenize
  const flat = s.replace(/[()]/g, " ");
  const tokens = flat.split(/\s+/).filter(Boolean);
  if (!tokens.length) return { valid: false, error: "Expression is empty." };

  for (const t of tokens) {
    if (/^\d+$/.test(t)) {
      const n = Number(t);
      if (n < 1 || n > count) {
        return {
          valid: false,
          error: `Condition #${t} doesn't exist (only ${count} condition${count === 1 ? "" : "s"}).`
        };
      }
    } else if (!/^(AND|OR)$/i.test(t)) {
      return {
        valid: false,
        error: `Unexpected token "${t}". Use numbers, AND, OR, and parentheses.`
      };
    }
  }

  // Alternation check
  const kinds = tokens.map((t) => (/^\d+$/.test(t) ? "N" : "OP"));
  for (let i = 0; i < kinds.length - 1; i++) {
    if (kinds[i] === "OP" && kinds[i + 1] === "OP")
      return { valid: false, error: "Two operators in a row." };
    if (kinds[i] === "N" && kinds[i + 1] === "N")
      return { valid: false, error: "Missing AND / OR between conditions." };
  }
  if (kinds[0] === "OP")
    return { valid: false, error: "Expression starts with an operator." };
  if (kinds[kinds.length - 1] === "OP")
    return { valid: false, error: "Expression ends with an operator." };

  return { valid: true, error: "" };
}

/**
 * Renumber a custom logic expression after a condition is removed.
 * Strips references to the removed index, decrements higher indices, tidies dangling operators.
 */
export function renumberCustomLogic(expr, removedIndex) {
  if (!expr) return "";
  let result = expr;
  // Drop references to the removed index (and an adjacent operator if present)
  const escaped = String(removedIndex);
  result = result.replace(
    new RegExp(`\\s*(AND|OR)\\s+${escaped}\\b`, "gi"),
    ""
  );
  result = result.replace(
    new RegExp(`\\b${escaped}\\s+(AND|OR)\\s*`, "gi"),
    ""
  );
  result = result.replace(new RegExp(`\\b${escaped}\\b`, "g"), "");
  // Decrement higher indices
  result = result.replace(/\b(\d+)\b/g, (m) => {
    const n = Number(m);
    return n > removedIndex ? String(n - 1) : m;
  });
  // Collapse empty parens and simplify single-number parens, normalize whitespace, trim dangling operators
  let prev;
  do {
    prev = result;
    result = result.replace(/\(\s*\)/g, "");
    result = result.replace(/\(\s*(\d+)\s*\)/g, "$1");
  } while (result !== prev);
  result = result.replace(/\s+/g, " ").trim();
  result = result
    .replace(/^\s*(AND|OR)\s+/i, "")
    .replace(/\s+(AND|OR)\s*$/i, "");
  return result.trim();
}

// ── Parsing (best-effort) ────────────────────────────────────

export function parseWhereClause(str) {
  if (!str || !str.trim()) {
    return { conditions: [], logic: "AND" };
  }
  const s = str.trim();
  let logic = "AND";
  let segments;
  if (/ AND /i.test(s) && !/ OR /i.test(s)) {
    logic = "AND";
    segments = s.split(/ AND /i);
  } else if (/ OR /i.test(s) && !/ AND /i.test(s)) {
    logic = "OR";
    segments = s.split(/ OR /i);
  } else if (!/ AND /i.test(s) && !/ OR /i.test(s)) {
    segments = [s];
  } else {
    return null; // Mixed AND/OR — too complex
  }

  const conditions = [];
  const opPattern =
    /^(\w+(?:\.\w+)?)\s+(=|!=|<>|<=|>=|<|>|LIKE|NOT\s+LIKE|NOT\s+IN|IN|INCLUDES|EXCLUDES)\s+(.+)$/i;
  for (const seg of segments) {
    const trimmed = seg.trim();
    if (!trimmed) continue;
    const m = trimmed.match(opPattern);
    if (!m) {
      return null; // Unparseable segment
    }
    const field = m[1];
    const operator = m[2].toUpperCase().replace(/\s+/g, " ");
    let value = m[3].trim();
    // Strip surrounding quotes for simple string values
    if (value.startsWith("'") && value.endsWith("'") && !value.includes("(")) {
      value = value.slice(1, -1).replace(/\\'/g, "'").replace(/\\\\/g, "\\");
      // Strip wrapping % from LIKE values
      if (
        (operator === "LIKE" || operator === "NOT LIKE") &&
        value.startsWith("%") &&
        value.endsWith("%")
      ) {
        value = value.slice(1, -1);
      }
    }
    // Strip parens from IN values
    if (value.startsWith("(") && value.endsWith(")")) {
      value = value
        .slice(1, -1)
        .split(",")
        .map((v) => {
          const t = v.trim();
          return t.startsWith("'") && t.endsWith("'") ? t.slice(1, -1) : t;
        })
        .join(", ");
    }
    conditions.push({
      id: `c${++_condSeq}`,
      field,
      operator,
      value,
      _fieldType: ""
    });
  }
  return { conditions, logic };
}

/**
 * Parse an arbitrary SOQL WHERE clause that may mix AND/OR and use parentheses for grouping.
 * Returns { conditions, logicMode, customLogic } or null if unparseable.
 * When the expression is simple (pure AND or pure OR with no parens), returns mode 'ALL' or 'ANY'
 * with customLogic=''.
 */
export function parseCustomWhereClause(str) {
  if (!str || !str.trim()) return null;

  const s = str.trim();
  const parser = {
    pos: 0,
    conditions: [],
    skipWs() {
      while (this.pos < s.length && /\s/.test(s[this.pos])) this.pos++;
    },
    peek() {
      return s[this.pos];
    },
    tryKeyword(kw) {
      this.skipWs();
      const slice = s.substr(this.pos, kw.length);
      if (slice.toUpperCase() !== kw.toUpperCase()) return false;
      const after = this.pos + kw.length;
      if (after < s.length && /\w/.test(s[after])) return false;
      this.pos = after;
      return true;
    },
    parseExpression() {
      const parts = [this.parseTerm()];
      while (true) {
        const before = this.pos;
        if (this.tryKeyword("AND")) {
          parts.push(" AND ");
        } else if (this.tryKeyword("OR")) {
          parts.push(" OR ");
        } else {
          break;
        }
        const right = this.parseTerm();
        if (right == null) {
          this.pos = before;
          parts.pop();
          break;
        }
        parts.push(right);
      }
      return parts.join("");
    },
    parseTerm() {
      this.skipWs();
      if (this.peek() === "(") {
        // Could be a grouping paren. Try to parse as expression.
        const save = this.pos;
        this.pos++; // consume (
        try {
          const inner = this.parseExpression();
          this.skipWs();
          if (this.peek() !== ")") throw new Error("Expected )");
          this.pos++; // consume )
          return "(" + inner + ")";
        } catch {
          this.pos = save;
          return null;
        }
      }
      return this.parseCondition();
    },
    parseCondition() {
      this.skipWs();
      const saveStart = this.pos;
      let field;
      try {
        field = this.parseIdentifier();
      } catch (e) {
        this.pos = saveStart;
        throw e;
      }
      this.skipWs();
      const op = this.parseOperator();
      this.skipWs();
      const rawValue = this.parseValue();
      const value = this.normalizeValue(rawValue, op);
      this.conditions.push({
        id: `c${++_condSeq}`,
        field,
        operator: op,
        value,
        _fieldType: ""
      });
      return String(this.conditions.length);
    },
    parseIdentifier() {
      const start = this.pos;
      while (this.pos < s.length && /[\w.]/.test(s[this.pos])) this.pos++;
      if (this.pos === start) throw new Error("Expected field name");
      return s.slice(start, this.pos);
    },
    parseOperator() {
      const ops = [
        "!=",
        "<>",
        "<=",
        ">=",
        "=",
        "<",
        ">",
        "NOT LIKE",
        "NOT IN",
        "LIKE",
        "IN",
        "INCLUDES",
        "EXCLUDES"
      ];
      const upper = s.substr(this.pos).toUpperCase();
      for (const op of ops) {
        if (upper.startsWith(op)) {
          const afterPos = this.pos + op.length;
          const lastOpChar = op[op.length - 1];
          if (
            /\w/.test(lastOpChar) &&
            afterPos < s.length &&
            /\w/.test(s[afterPos])
          )
            continue;
          this.pos = afterPos;
          return op.replace(/\s+/g, " ");
        }
      }
      throw new Error("Expected operator");
    },
    parseValue() {
      this.skipWs();
      const start = this.pos;
      const firstChar = s[this.pos];

      if (firstChar === "'") {
        this.pos++;
        while (this.pos < s.length) {
          if (s[this.pos] === "\\") {
            this.pos += 2;
            continue;
          }
          if (s[this.pos] === "'") {
            this.pos++;
            return s.slice(start, this.pos);
          }
          this.pos++;
        }
        throw new Error("Unterminated string");
      }

      if (firstChar === "(") {
        // IN list — balanced parens, skip strings
        let depth = 0;
        while (this.pos < s.length) {
          const ch = s[this.pos];
          if (ch === "'") {
            this.pos++;
            while (this.pos < s.length && s[this.pos] !== "'") {
              if (s[this.pos] === "\\") this.pos++;
              this.pos++;
            }
            this.pos++;
            continue;
          }
          if (ch === "(") depth++;
          else if (ch === ")") {
            depth--;
            if (depth === 0) {
              this.pos++;
              return s.slice(start, this.pos);
            }
          }
          this.pos++;
        }
        throw new Error("Unterminated list");
      }

      if (firstChar === "{") {
        while (this.pos < s.length && s[this.pos] !== "}") this.pos++;
        if (this.pos < s.length) this.pos++;
        return s.slice(start, this.pos);
      }

      // Number, boolean, date-literal
      while (this.pos < s.length && /[\w:.\-+]/.test(s[this.pos])) this.pos++;
      if (this.pos === start) throw new Error("Expected value");
      return s.slice(start, this.pos);
    },
    normalizeValue(raw, op) {
      let value = raw;
      const operator = op.toUpperCase();
      if (
        value.startsWith("'") &&
        value.endsWith("'") &&
        !value.includes("(")
      ) {
        value = value.slice(1, -1).replace(/\\'/g, "'").replace(/\\\\/g, "\\");
        if (
          (operator === "LIKE" || operator === "NOT LIKE") &&
          value.startsWith("%") &&
          value.endsWith("%")
        ) {
          value = value.slice(1, -1);
        }
      }
      if (value.startsWith("(") && value.endsWith(")")) {
        value = value
          .slice(1, -1)
          .split(",")
          .map((v) => {
            const t = v.trim();
            return t.startsWith("'") && t.endsWith("'") ? t.slice(1, -1) : t;
          })
          .join(", ");
      }
      return value;
    }
  };

  try {
    const expression = parser.parseExpression();
    parser.skipWs();
    if (parser.pos < s.length) return null;
    if (!parser.conditions.length) return null;

    // Classify the resulting expression
    const hasParens = /\(|\)/.test(expression);
    const onlyAnd = /^\s*\d+(?:\s+AND\s+\d+)*\s*$/i.test(expression);
    const onlyOr = /^\s*\d+(?:\s+OR\s+\d+)*\s*$/i.test(expression);

    if (!hasParens && onlyAnd)
      return {
        conditions: parser.conditions,
        logicMode: "ALL",
        customLogic: ""
      };
    if (!hasParens && onlyOr)
      return {
        conditions: parser.conditions,
        logicMode: "ANY",
        customLogic: ""
      };

    // Simplify (N) → N repeatedly so extra parens around single references collapse
    let clean = expression.trim();
    let simPrev;
    do {
      simPrev = clean;
      clean = clean.replace(/\(\s*(\d+)\s*\)/g, "$1");
    } while (clean !== simPrev);
    // Strip redundant outermost parens when the whole expression is wrapped
    while (/^\(.*\)$/.test(clean)) {
      let depth = 0;
      let redundant = true;
      for (let i = 0; i < clean.length - 1; i++) {
        if (clean[i] === "(") depth++;
        else if (clean[i] === ")") depth--;
        if (depth === 0 && i < clean.length - 1) {
          redundant = false;
          break;
        }
      }
      if (!redundant) break;
      clean = clean.slice(1, -1).trim();
    }

    return {
      conditions: parser.conditions,
      logicMode: "CUSTOM",
      customLogic: clean
    };
  } catch {
    return null;
  }
}

// ── Component ────────────────────────────────────────────────

function newCondition(overrides = {}) {
  return {
    id: overrides.id || `c${++_condSeq}`,
    type: "condition",
    field: overrides.field || "",
    operator: overrides.operator || "=",
    value: overrides.value ?? "",
    _fieldType: overrides._fieldType || ""
  };
}

function newGroup(operator = "AND", children = [], id) {
  return {
    id: id || `g${++_groupSeq}`,
    type: "group",
    operator: operator === "OR" ? "OR" : "AND",
    children
  };
}

function conditionToNode(condition) {
  return newCondition(condition || {});
}

function nodeFragment(node) {
  if (!node) return "";
  if (node.type === "condition") {
    return fragmentFor(node) || "";
  }
  const parts = (node.children || []).map(nodeFragment).filter(Boolean);
  if (!parts.length) return "";
  const joined = parts.join(` ${node.operator || "AND"} `);
  return node.id === "root" ? joined : `(${joined})`;
}

function flattenConditionNodes(node, target = []) {
  if (!node) return target;
  if (node.type === "condition") {
    target.push(node);
    return target;
  }
  (node.children || []).forEach((child) =>
    flattenConditionNodes(child, target)
  );
  return target;
}

function cloneTree(node) {
  if (!node) return null;
  if (node.type === "condition") return { ...node };
  return { ...node, children: (node.children || []).map(cloneTree) };
}

function findNodeLocation(parent, id) {
  if (!parent?.children) return null;
  for (let i = 0; i < parent.children.length; i++) {
    const child = parent.children[i];
    if (child.id === id) return { parent, index: i, node: child };
    if (child.type === "group") {
      const nested = findNodeLocation(child, id);
      if (nested) return nested;
    }
  }
  return null;
}

function removeNodeById(root, id) {
  const found = findNodeLocation(root, id);
  if (!found) return null;
  return found.parent.children.splice(found.index, 1)[0];
}

function normalizeGroup(group) {
  if (!group?.children) return group;
  group.children = group.children
    .map((child) => (child.type === "group" ? normalizeGroup(child) : child))
    .filter((child) => child.type !== "group" || child.children.length > 0);
  return group;
}

function treeFromSimpleParse(parsed) {
  const operator = parsed.logic === "OR" ? "OR" : "AND";
  return newGroup(operator, parsed.conditions.map(conditionToNode), "root");
}

function logicExpressionToTree(expression, conditions) {
  if (!expression || !conditions?.length) return null;
  const tokens = (expression.match(/\d+|AND|OR|\(|\)/gi) || []).map((token) =>
    token.toUpperCase()
  );
  let pos = 0;
  const conditionByNumber = new Map(
    conditions.map((condition, index) => [String(index + 1), condition])
  );

  function parsePrimary() {
    const token = tokens[pos];
    if (!token) return null;
    if (token === "(") {
      pos++;
      const inner = parseExpression();
      if (tokens[pos] === ")") pos++;
      return inner;
    }
    if (/^\d+$/.test(token)) {
      pos++;
      const condition = conditionByNumber.get(token);
      return condition ? conditionToNode(condition) : null;
    }
    return null;
  }

  function merge(left, operator, right) {
    if (!left || !right) return left || right;
    if (left.type === "group" && left.operator === operator) {
      return newGroup(operator, [...left.children, right]);
    }
    return newGroup(operator, [left, right]);
  }

  function parseExpression() {
    let left = parsePrimary();
    while (tokens[pos] === "AND" || tokens[pos] === "OR") {
      const operator = tokens[pos++];
      const right = parsePrimary();
      left = merge(left, operator, right);
    }
    return left;
  }

  const tree = parseExpression();
  if (!tree || pos < tokens.length) return null;
  return tree.type === "group"
    ? newGroup(tree.operator, tree.children, "root")
    : newGroup("AND", [tree], "root");
}

function treeFromCustomParse(parsed) {
  if (!parsed?.conditions?.length) return null;
  if (parsed.logicMode === "ALL") {
    return newGroup("AND", parsed.conditions.map(conditionToNode), "root");
  }
  if (parsed.logicMode === "ANY") {
    return newGroup("OR", parsed.conditions.map(conditionToNode), "root");
  }
  return logicExpressionToTree(parsed.customLogic, parsed.conditions);
}

export default class NewtonSelectorFlowCpeWhereBuilder extends LightningElement {
  @track tree = newGroup("AND", [newCondition()], "root");
  @track selectedNodeIds = [];
  @track manualMode = false;
  @track manualWhere = "";
  @track dragNodeId = "";
  @track _validationMessage = "";
  @track _fieldOptions = [];

  _loadedObject = "";
  _rawFieldMap = {};
  _initialized = false;
  _connected = false;

  @api disabled = false;
  @api builderContext;
  @api automaticOutputVariables;
  @api maxWidth = 280;

  _objectApiName = "";
  _value = "";

  @api
  get objectApiName() {
    return this._objectApiName;
  }
  set objectApiName(v) {
    const next = v == null ? "" : String(v).trim();
    if (next === this._objectApiName) return;
    this._objectApiName = next;
    if (this._connected) this._loadFieldOptions();
  }

  @api
  get value() {
    return this._value;
  }
  set value(v) {
    const next = v == null ? "" : String(v);
    if (next === this._value) return;
    this._value = next;
    if (this._suppressReparse) {
      this._suppressReparse = false;
      return;
    }
    this._initFromValue();
  }

  get logicOptions() {
    return LOGIC_OPTIONS;
  }

  get rootOperatorOptions() {
    return LOGIC_OPTIONS;
  }

  get rootLogicSegments() {
    return LOGIC_OPTIONS.map((option) => {
      const selected = this.tree.operator === option.value;
      return {
        ...option,
        cssClass: selected
          ? "cc-where-segment cc-where-segment_selected"
          : "cc-where-segment",
        ariaPressed: String(selected)
      };
    });
  }

  get hasSelection() {
    return this.selectedNodeIds.length > 0;
  }

  get showSelectionToolbar() {
    return this.hasSelection;
  }

  get selectedCount() {
    return this.selectedNodeIds.length;
  }

  get canGroupSelection() {
    return this.selectedNodeIds.length > 1;
  }

  get groupSelectionDisabled() {
    return this.disabled || !this.canGroupSelection;
  }

  get showManualMode() {
    return this.manualMode;
  }

  get hasValidationMessage() {
    return Boolean(this._validationMessage);
  }

  get builderRows() {
    const rows = [];
    const visit = (node, depth, indexPath, parentId) => {
      if (node.type === "group" && node.id !== "root") {
        const selected = this.selectedNodeIds.includes(node.id);
        rows.push({
          id: node.id,
          key: node.id,
          type: "group",
          isGroup: true,
          isCondition: false,
          operator: node.operator,
          logicSegments: LOGIC_OPTIONS.map((option) => {
            const segmentSelected = node.operator === option.value;
            return {
              ...option,
              cssClass: segmentSelected
                ? "cc-where-segment cc-where-segment_selected"
                : "cc-where-segment",
              ariaPressed: String(segmentSelected)
            };
          }),
          title: `Group ${rows.filter((row) => row.isGroup).length + 1}`,
          countLabel: `${flattenConditionNodes(node).length} condition${
            flattenConditionNodes(node).length === 1 ? "" : "s"
          }`,
          depth,
          parentId,
          selected,
          selectedChecked: selected,
          rowClass: selected
            ? "cc-where-node cc-where-node_group cc-where-node_selected"
            : "cc-where-node cc-where-node_group",
          style: `--cc-depth: ${depth};`
        });
      }
      (node.children || []).forEach((child, index) => {
        const childPath = [...indexPath, index];
        if (child.type === "group") {
          visit(
            child,
            node.id === "root" ? depth : depth + 1,
            childPath,
            node.id
          );
        } else {
          rows.push(this._conditionRow(child, rows.length, depth, node.id));
        }
      });
    };
    visit(this.tree, 0, [], "");
    return rows;
  }

  _conditionRow(c, rowIndex, depth, parentId) {
    const fieldType = this._resolveFieldType(c.field);
    const fieldSelection = c.field
      ? {
          id: c.field,
          title: this._fieldLabel(c.field),
          subtitle: "",
          icon: "type"
        }
      : null;
    const selected = this.selectedNodeIds.includes(c.id);
    const incomplete =
      !c.field || !c.operator || (c.value === "" && c.value !== 0);
    return {
      ...c,
      key: c.id,
      type: "condition",
      isCondition: true,
      isGroup: false,
      index: rowIndex,
      number:
        flattenConditionNodes(this.tree).findIndex((node) => node.id === c.id) +
        1,
      numberTitle: `Condition ${rowIndex + 1}`,
      removable: flattenConditionNodes(this.tree).length > 1,
      showLogicDivider: false,
      operatorOptions: operatorsForType(fieldType),
      isBooleanValue: fieldType.toUpperCase() === "BOOLEAN",
      isDateValue:
        fieldType.toUpperCase() === "DATE" ||
        fieldType.toUpperCase() === "DATETIME",
      isListOperator:
        c.operator === "IN" ||
        c.operator === "NOT IN" ||
        c.operator === "INCLUDES" ||
        c.operator === "EXCLUDES",
      booleanOptions: BOOLEAN_OPTIONS,
      fieldSelection,
      valueName: `where_val_${c.id}`,
      parentId,
      depth,
      selected,
      selectedChecked: selected,
      hasError: incomplete,
      errorMessage: incomplete ? "Complete field, operator, and value." : "",
      rowClass: selected
        ? "cc-where-node cc-where-node_condition cc-where-node_selected"
        : incomplete
          ? "cc-where-node cc-where-node_condition cc-where-node_warning"
          : "cc-where-node cc-where-node_condition",
      style: `--cc-depth: ${depth};`
    };
  }

  get hasRows() {
    return this.builderRows.length > 0;
  }

  _fieldLabel(apiName) {
    if (!apiName) return "";
    const f = this._rawFieldMap[apiName.toLowerCase()];
    return f ? f.label || apiName : apiName;
  }

  @api
  get isParseable() {
    if (!this._value) return true;
    if (parseWhereClause(this._value) !== null) return true;
    return parseCustomWhereClause(this._value) !== null;
  }

  connectedCallback() {
    this._connected = true;
    if (this._objectApiName && !this._loadedObject) {
      this._loadFieldOptions();
    }
    if (!this._initialized) {
      this._initFromValue();
    }
  }

  disconnectedCallback() {
    this._connected = false;
  }

  _initFromValue() {
    this._initialized = true;
    this.selectedNodeIds = [];
    this._validationMessage = "";
    if (!this._value) {
      this.manualMode = false;
      this.manualWhere = "";
      this.tree = newGroup("AND", [newCondition()], "root");
      return;
    }

    const simple = parseWhereClause(this._value);
    if (simple && simple.conditions.length) {
      this.manualMode = false;
      this.manualWhere = "";
      this.tree = treeFromSimpleParse(simple);
      this._refreshFieldTypes();
      return;
    }

    const custom = parseCustomWhereClause(this._value);
    if (custom && custom.conditions.length) {
      const tree = treeFromCustomParse(custom);
      if (tree) {
        this.manualMode = false;
        this.manualWhere = "";
        this.tree = tree;
        this._refreshFieldTypes();
        return;
      }
    }

    this.manualMode = true;
    this.manualWhere = this._value;
    this.tree = newGroup("AND", [newCondition()], "root");
  }

  _refreshFieldTypes() {
    const refresh = (node) => {
      if (node.type === "condition") {
        return {
          ...node,
          _fieldType: this._resolveFieldType(node.field) || node._fieldType
        };
      }
      return { ...node, children: (node.children || []).map(refresh) };
    };
    this.tree = refresh(this.tree);
  }

  _updateCondition(id, patch) {
    const update = (node) => {
      if (node.type === "condition") {
        return node.id === id ? { ...node, ...patch } : node;
      }
      return { ...node, children: (node.children || []).map(update) };
    };
    this.tree = update(this.tree);
  }

  _updateGroup(id, patch) {
    const update = (node) => {
      if (node.type === "group") {
        const next = node.id === id ? { ...node, ...patch } : node;
        return { ...next, children: (next.children || []).map(update) };
      }
      return node;
    };
    this.tree = update(this.tree);
  }

  _appendNode(node, parentId = "root") {
    const append = (current) => {
      if (current.type === "group" && current.id === parentId) {
        return { ...current, children: [...current.children, node] };
      }
      if (current.type === "group") {
        return { ...current, children: current.children.map(append) };
      }
      return current;
    };
    this.tree = append(this.tree);
  }

  handleRootOperatorChange(event) {
    this.tree = {
      ...this.tree,
      operator: event.currentTarget.dataset.value || "AND"
    };
    this._emitChange();
  }

  handleGroupOperatorChange(event) {
    this._updateGroup(event.currentTarget.dataset.id, {
      operator: event.currentTarget.dataset.value || "AND"
    });
    this._emitChange();
  }

  handleNodeSelect(event) {
    const id = event.currentTarget.dataset.id;
    const checked = event.target.checked;
    const selected = new Set(this.selectedNodeIds);
    if (checked) {
      selected.add(id);
    } else {
      selected.delete(id);
    }
    this.selectedNodeIds = Array.from(selected);
  }

  handleClearSelection() {
    this.selectedNodeIds = [];
  }

  handleGroupSelected() {
    if (!this.canGroupSelection) return;
    const selected = new Set(this.selectedNodeIds);
    const root = cloneTree(this.tree);
    const orderedNodes = this.builderRows
      .filter((row) => row.isCondition && selected.has(row.id))
      .map((row) => removeNodeById(root, row.id))
      .filter(Boolean);
    if (orderedNodes.length < 2) return;
    root.children.push(newGroup("AND", orderedNodes));
    this.tree = normalizeGroup(root);
    this.selectedNodeIds = [];
    this._emitChange();
  }

  handleUngroup(event) {
    const id = event.currentTarget.dataset.id;
    const root = cloneTree(this.tree);
    const found = findNodeLocation(root, id);
    if (!found || found.node.type !== "group") return;
    found.parent.children.splice(found.index, 1, ...found.node.children);
    this.tree = normalizeGroup(root);
    this.selectedNodeIds = this.selectedNodeIds.filter((value) => value !== id);
    this._emitChange();
  }

  handleGroupWithNext(event) {
    const id = event.currentTarget.dataset.id;
    const root = cloneTree(this.tree);
    const found = findNodeLocation(root, id);
    if (!found || found.index >= found.parent.children.length - 1) return;
    const pair = found.parent.children.splice(found.index, 2);
    found.parent.children.splice(found.index, 0, newGroup("AND", pair));
    this.tree = normalizeGroup(root);
    this._emitChange();
  }

  handleMoveNode(event) {
    const id = event.currentTarget.dataset.id;
    const direction = event.currentTarget.dataset.direction;
    const root = cloneTree(this.tree);
    const found = findNodeLocation(root, id);
    if (!found) return;
    const nextIndex = direction === "up" ? found.index - 1 : found.index + 1;
    if (nextIndex < 0 || nextIndex >= found.parent.children.length) return;
    const [node] = found.parent.children.splice(found.index, 1);
    found.parent.children.splice(nextIndex, 0, node);
    this.tree = normalizeGroup(root);
    this._emitChange();
  }

  handleIndentNode(event) {
    const id = event.currentTarget.dataset.id;
    const root = cloneTree(this.tree);
    const found = findNodeLocation(root, id);
    if (!found || found.index === 0) return;
    const previous = found.parent.children[found.index - 1];
    if (previous.type !== "group") return;
    const [node] = found.parent.children.splice(found.index, 1);
    previous.children.push(node);
    this.tree = normalizeGroup(root);
    this._emitChange();
  }

  handleOutdentNode(event) {
    const id = event.currentTarget.dataset.id;
    const root = cloneTree(this.tree);
    const found = findNodeLocation(root, id);
    if (!found || found.parent.id === "root") return;
    const parentLocation = findNodeLocation(root, found.parent.id);
    if (!parentLocation) return;
    const [node] = found.parent.children.splice(found.index, 1);
    parentLocation.parent.children.splice(parentLocation.index + 1, 0, node);
    this.tree = normalizeGroup(root);
    this._emitChange();
  }

  handleDragStart(event) {
    this.dragNodeId = event.currentTarget.dataset.id;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", this.dragNodeId);
  }

  handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }

  handleDrop(event) {
    event.preventDefault();
    const sourceId =
      this.dragNodeId || event.dataTransfer.getData("text/plain") || "";
    const targetId = event.currentTarget.dataset.id;
    this.dragNodeId = "";
    if (!sourceId || !targetId || sourceId === targetId) return;
    const root = cloneTree(this.tree);
    const source = removeNodeById(root, sourceId);
    const target = findNodeLocation(root, targetId);
    if (!source || !target) return;
    if (target.node.type === "group") {
      target.node.children.push(source);
    } else {
      target.parent.children.splice(target.index, 0, source);
    }
    this.tree = normalizeGroup(root);
    this._emitChange();
  }

  handleManualInput(event) {
    this.manualWhere = event.target.value || "";
    this._value = this.manualWhere;
    this.dispatchEvent(
      new CustomEvent("change", {
        detail: {
          value: this.manualWhere || null,
          valid: true,
          previewWhere: this.manualWhere || "",
          mode: "manual"
        }
      })
    );
  }

  handleRebuildVisual() {
    const previous = this._value;
    this._value = this.manualWhere || "";
    this._initFromValue();
    if (this.manualMode) {
      this._value = previous;
      this._validationMessage =
        "This WHERE clause cannot be rebuilt visually yet.";
    } else {
      this._emitChange();
    }
  }

  handleFieldSearch(event) {
    const lu = event.currentTarget;
    const obj = this._objectApiName;
    if (!obj) {
      lu.setSearchResults([]);
      return;
    }
    const term =
      event.detail.rawSearchTerm != null
        ? String(event.detail.rawSearchTerm)
        : "";
    searchLookupDatasetFieldsForObject({ objectApiName: obj, searchKey: term })
      .then((rows) => lu.setSearchResults(rows || []))
      .catch(() => lu.setSearchResults([]));
  }

  handleFieldSelectionChange(event) {
    const lu = event.currentTarget;
    const id = lu.dataset.id;
    const sel = lu.getSelection?.();
    const row = Array.isArray(sel) ? sel[0] : sel;
    const fieldName = row?.id ? String(row.id) : "";
    const fieldType = this._resolveFieldType(fieldName);
    const ops = operatorsForType(fieldType);
    const current = flattenConditionNodes(this.tree).find(
      (item) => item.id === id
    );
    const currentOpValid =
      current && ops.some((o) => o.value === current.operator);
    this._updateCondition(id, {
      field: fieldName,
      _fieldType: fieldType,
      operator: currentOpValid ? current.operator : ops[0].value,
      value: ""
    });
    this._emitChange();
  }

  handleOperatorChange(event) {
    this._updateCondition(event.currentTarget.dataset.id, {
      operator: event.detail.value
    });
    this._emitChange();
  }

  handleValueChange(event) {
    const val = event.detail?.value ?? event.target?.value ?? "";
    this._updateCondition(event.currentTarget.dataset.id, { value: val });
    this._emitChange();
  }

  handleResourceValueChange(event) {
    event.stopPropagation();
    const id = event.detail?.id || event.detail?.name || "";
    const conditionId = id.replace(/^where_val_/, "");
    const val = event.detail?.newValue ?? "";
    this._updateCondition(conditionId, { value: val });
    this._emitChange();
  }

  handleAddCondition(event) {
    const parentId = event.currentTarget.dataset.parentId || "root";
    this._appendNode(newCondition(), parentId);
    this._emitChange();
  }

  handleRemoveCondition(event) {
    const id = event.currentTarget.dataset.id;
    const root = cloneTree(this.tree);
    removeNodeById(root, id);
    if (!flattenConditionNodes(root).length) {
      root.children.push(newCondition());
    }
    this.tree = normalizeGroup(root);
    this.selectedNodeIds = this.selectedNodeIds.filter((value) => value !== id);
    this._emitChange();
  }

  @api
  validate() {
    const validation = this._validateTree();
    return {
      valid: validation.valid,
      errorMessage: validation.message
    };
  }

  _validateTree() {
    if (this.manualMode) {
      return { valid: true, message: "" };
    }
    const conditions = flattenConditionNodes(this.tree);
    const incomplete = conditions.find(
      (condition) =>
        !condition.field ||
        !condition.operator ||
        (condition.value === "" && condition.value !== 0)
    );
    if (incomplete) {
      return {
        valid: false,
        message: "Complete every condition before saving this query."
      };
    }
    return { valid: true, message: "" };
  }

  _loadFieldOptions() {
    const obj = this._objectApiName;
    if (!obj) {
      this._fieldOptions = [];
      this._rawFieldMap = {};
      this._loadedObject = "";
      return;
    }
    if (obj === this._loadedObject) return;
    searchLookupDatasetFieldsForObject({ objectApiName: obj, searchKey: "" })
      .then((rows) => {
        if (!this._connected || this._objectApiName !== obj) return;
        this._rawFieldMap = {};
        (rows || []).forEach((r) => {
          const sub = String(r.subtitle || "");
          const sep = sub.lastIndexOf("—");
          const fieldType = sep >= 0 ? sub.substring(sep + 1).trim() : "";
          const apiName = String(r.value || r.id || "");
          if (apiName) {
            this._rawFieldMap[apiName.toLowerCase()] = {
              name: apiName,
              label: r.label || apiName,
              type: fieldType
            };
          }
        });
        this._fieldOptions = (rows || []).map((r) => ({
          label: `${r.label || r.value} (${r.value})`,
          value: r.value || r.id || ""
        }));
        this._loadedObject = obj;
        this._refreshFieldTypes();
      })
      .catch(() => {
        this._fieldOptions = [];
      });
  }

  _resolveFieldType(fieldApiName) {
    if (!fieldApiName) return "";
    const f = this._rawFieldMap[fieldApiName.toLowerCase()];
    return f ? f.type || "" : "";
  }

  _emitChange() {
    const validation = this._validateTree();
    const soql = validation.valid ? nodeFragment(this.tree) : "";
    this._validationMessage = validation.message;

    if (soql !== this._value) {
      this._suppressReparse = true;
      this._value = soql;
    }
    this.dispatchEvent(
      new CustomEvent("change", {
        detail: {
          value: soql || null,
          valid: validation.valid,
          previewWhere: soql || "",
          mode: this.manualMode ? "manual" : "visual"
        }
      })
    );
  }

  /** Render-time SOQL preview. Empty when no complete conditions yet. */
  get previewSoql() {
    return this.manualMode ? this.manualWhere : nodeFragment(this.tree);
  }

  get hasPreviewSoql() {
    return Boolean(this.previewSoql);
  }
}
