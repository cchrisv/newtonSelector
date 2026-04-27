const EMPTY = "";
export const MANUAL_INPUT_VALUE = "__newton_manual_input__";

function safeGet(record, fieldPath) {
  if (!record || !fieldPath) return EMPTY;
  const value = record[fieldPath];
  return value === undefined || value === null ? EMPTY : value;
}

export function normalizePicklist(picklistValues, valueSource) {
  if (!picklistValues || !Array.isArray(picklistValues.values)) return [];
  const useLabel = valueSource === "label";
  return picklistValues.values.map((entry, index) => {
    const resolvedValue = useLabel ? entry.label : entry.value;
    return {
      id: `pl-${resolvedValue}-${index}`,
      label: entry.label,
      sublabel: EMPTY,
      icon: EMPTY,
      badge: EMPTY,
      helpText: EMPTY,
      value: resolvedValue,
      disabled: false
    };
  });
}

export function normalizeCollection(records, fieldMap) {
  if (!Array.isArray(records)) return [];
  const map = fieldMap || {};
  return records.map((record, index) => ({
    id: safeGet(record, "Id") || `col-${index}`,
    label: safeGet(record, map.label) || `(row ${index + 1})`,
    sublabel: safeGet(record, map.sublabel),
    icon: safeGet(record, map.icon),
    badge: safeGet(record, map.badge),
    helpText: safeGet(record, map.helpText),
    value: safeGet(record, map.value) || safeGet(record, "Id") || String(index),
    disabled: false
  }));
}

export function normalizeSObjectDTO(dtos) {
  if (!Array.isArray(dtos)) return [];
  return dtos.map((dto, index) => ({
    id: dto.id || `so-${index}`,
    label: dto.label || EMPTY,
    sublabel: dto.sublabel || EMPTY,
    icon: dto.icon || EMPTY,
    badge: dto.badge || EMPTY,
    helpText: dto.helpText || EMPTY,
    value: dto.value || dto.id || String(index),
    disabled: Boolean(dto.disabled)
  }));
}

// Normalize a Flow String[] collection — each string becomes a tile where the
// label and value are both the string itself. Other slots (icon, sublabel,
// badge, helpText) are empty and can be populated via item overrides.
export function normalizeStringCollection(strings) {
  if (!Array.isArray(strings)) return [];
  return strings.map((raw, index) => {
    const str = raw == null ? EMPTY : String(raw);
    return {
      id: `str-${index}-${str}`,
      label: str,
      sublabel: EMPTY,
      icon: EMPTY,
      badge: EMPTY,
      helpText: EMPTY,
      value: str,
      disabled: false
    };
  });
}

export function normalizeCustom(customItems) {
  if (!Array.isArray(customItems)) return [];
  return customItems
    .filter((item) => item?.hidden !== true)
    .map((item, index) => ({
      ...item,
      id: item.id || `cu-${index}`,
      label: item.label || EMPTY,
      sublabel: item.sublabel || EMPTY,
      icon: item.icon || EMPTY,
      badge: item.badge || EMPTY,
      helpText: item.helpText || EMPTY,
      value:
        item.value !== undefined && item.value !== null
          ? String(item.value)
          : String(index),
      disabled: Boolean(item.disabled),
      record: item
    }));
}

export function filterItems(items, searchTerm) {
  if (!Array.isArray(items)) return [];
  const term = (searchTerm || EMPTY).trim().toLowerCase();
  if (!term) return items;
  return items.filter((item) => {
    const haystack =
      `${item.label} ${item.sublabel} ${item.helpText}`.toLowerCase();
    return haystack.includes(term);
  });
}

const OVERRIDE_FIELDS = ["label", "sublabel", "icon", "badge", "helpText"];

export function applyOverrides(items, overrides) {
  if (!Array.isArray(items)) return [];
  if (!overrides || typeof overrides !== "object") return items;
  return items
    .map((item) => {
      const ov = overrides[item.value];
      if (!ov) return item;
      if (ov.hidden === true) return null;
      const next = { ...item };
      for (const field of OVERRIDE_FIELDS) {
        const val = ov[field];
        if (val !== undefined && val !== null && val !== EMPTY) {
          next[field] = val;
        }
      }
      return next;
    })
    .filter(Boolean);
}

/**
 * Convert a SLDS 2 spacing token value to a CSS expression. Accepts either:
 *   - 'none' (returns '0')
 *   - '1' through '12' (returns `var(--slds-g-spacing-N, 0)`)
 *   - Any other string — treated as a passthrough CSS value (e.g. '2rem', '16px').
 * This lets legacy rem-string configs coexist with new token-based ones.
 */
export function tokenToCss(token) {
  if (token === null || token === undefined || token === "" || token === "none")
    return "0";
  const str = String(token).trim();
  if (/^\d+$/.test(str)) {
    return `var(--slds-g-spacing-${str}, 0)`;
  }
  return str;
}

/**
 * Post-fetch display transform: sort then limit.
 * - sortBy: 'none' | 'label' | 'value' (default 'none' — preserves source order)
 * - sortDirection: 'asc' | 'desc' (default 'asc')
 * - limit: positive integer (optional — no cap if falsy)
 */
export function applyDisplay(items, display) {
  if (!Array.isArray(items)) return [];
  if (!display || typeof display !== "object") return items;
  const { sortBy, sortDirection, limit } = display;
  let out = items;
  if (sortBy === "label" || sortBy === "value") {
    const collator = new Intl.Collator(undefined, {
      sensitivity: "base",
      numeric: true
    });
    const dir = sortDirection === "desc" ? -1 : 1;
    out = [...items].sort(
      (a, b) =>
        dir *
        collator.compare(String(a?.[sortBy] ?? ""), String(b?.[sortBy] ?? ""))
    );
  }
  const cap = Number(limit);
  if (Number.isFinite(cap) && cap > 0 && out.length > cap) {
    out = out.slice(0, cap);
  }
  return out;
}

export const SAMPLE_ITEMS = Object.freeze([
  {
    id: "s-1",
    label: "Aurora Ridge Estate",
    sublabel: "Flagship listing · 2024 portfolio",
    icon: "building-2",
    badge: "Featured",
    helpText: "Showcase property with premium styling applied.",
    value: "sample-1",
    disabled: false
  },
  {
    id: "s-2",
    label: "Cascade Works Studio",
    sublabel: "Creative agency partnership",
    icon: "contact",
    badge: "Tier 1",
    helpText: "",
    value: "sample-2",
    disabled: false
  },
  {
    id: "s-3",
    label: "Meridian Logistics",
    sublabel: "Q4 renewal under review",
    icon: "trending-up",
    badge: "Recommended",
    helpText: "",
    value: "sample-3",
    disabled: false
  },
  {
    id: "s-4",
    label: "Northlight Collective",
    sublabel: "Inbound lead · high intent",
    icon: "user-round-plus",
    badge: "",
    helpText: "",
    value: "sample-4",
    disabled: false
  },
  {
    id: "s-5",
    label: "Halcyon Research Labs",
    sublabel: "Enterprise pilot · signed",
    icon: "briefcase-business",
    badge: "Signed",
    helpText: "",
    value: "sample-5",
    disabled: false
  },
  {
    id: "s-6",
    label: "Verdant Trails Co.",
    sublabel: "Boutique retail · expansion",
    icon: "package",
    badge: "",
    helpText: "",
    value: "sample-6",
    disabled: false
  }
]);
