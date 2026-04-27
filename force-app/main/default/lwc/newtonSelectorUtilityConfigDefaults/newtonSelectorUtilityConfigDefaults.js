export function parseRemValue(value, fallback) {
  if (value == null || value === "") return fallback;
  const match = String(value)
    .trim()
    .match(/^([\d.]+)\s*rem$/i);
  if (!match) return fallback;
  const n = parseFloat(match[1]);
  return Number.isFinite(n) ? n : fallback;
}

export function formatRem(n) {
  const rounded = Math.round(n * 100) / 100;
  return `${rounded}rem`;
}

const AUTO_BOX = {
  top: "",
  right: "",
  bottom: "",
  left: "",
  linked: true
};

const DEFAULT_BADGE_CONFIG = {
  position: "bottom-inline",
  variant: "neutral",
  shape: "pill",
  variantHex: ""
};

const SLDS_INPUT_GRID_CONFIG = {
  minWidth: "7.5rem",
  gapH: "",
  gapV: "",
  margin: AUTO_BOX,
  padding: AUTO_BOX,
  size: "small",
  aspectRatio: "1:1",
  badge: DEFAULT_BADGE_CONFIG,
  columns: null,
  selectionIndicator: "frame",
  elevation: "outlined",
  pattern: "none",
  patternTone: "neutral",
  patternHoverTone: "neutral",
  patternSelectedTone: "brand",
  patternDisabledTone: "neutral",
  cornerStyle: "none",
  cornerTone: "neutral",
  surfaceStyle: "solid",
  surfaceTone: "neutral",
  surfaceHoverTone: "neutral",
  surfaceSelectedTone: "brand",
  surfaceDisabledTone: "neutral",
  iconDecor: "square",
  iconStyle: "soft",
  iconShading: "flat",
  iconTone: "brand",
  iconToneHex: "",
  iconGlyphTone: "auto",
  iconGlyphToneHex: "",
  patternToneHex: "",
  patternHoverToneHex: "",
  patternSelectedToneHex: "",
  patternDisabledToneHex: "",
  cornerToneHex: "",
  surfaceToneHex: "",
  surfaceHoverToneHex: "",
  surfaceSelectedToneHex: "",
  surfaceDisabledToneHex: "",
  showIcons: true,
  showBadges: true
};

const LAYOUT_PRESETS = {
  grid: {
    minWidth: "7.5rem",
    gapH: "2",
    gapV: "2",
    size: "small",
    aspectRatio: "1:1"
  },
  list: {
    minWidth: "100%",
    gapH: "none",
    gapV: "1",
    size: "small",
    aspectRatio: "auto"
  },
  horizontal: {
    minWidth: "7.5rem",
    gapH: "2",
    gapV: "none",
    size: "small",
    aspectRatio: "1:1"
  },
  picklist: {
    minWidth: "100%",
    gapH: "none",
    gapV: "1",
    size: "small",
    aspectRatio: "auto"
  },
  radio: {
    minWidth: "100%",
    gapH: "none",
    gapV: "1",
    size: "small",
    aspectRatio: "auto"
  },
  columns: {
    minWidth: "100%",
    gapH: "3",
    gapV: "1",
    size: "small",
    aspectRatio: "auto"
  },
  dualListbox: {
    minWidth: "100%",
    gapH: "3",
    gapV: "1",
    size: "small",
    aspectRatio: "auto"
  }
};

export function normalizeLayoutKey(value) {
  if (value === "dropdown") return "picklist";
  return Object.prototype.hasOwnProperty.call(LAYOUT_PRESETS, value)
    ? value
    : "grid";
}

function cloneBox(box) {
  return { ...box };
}

function cloneBadge(badge) {
  return { ...badge };
}

function cloneGridConfig(config) {
  return {
    ...config,
    margin: cloneBox(config.margin || AUTO_BOX),
    padding: cloneBox(config.padding || AUTO_BOX),
    badge: cloneBadge(config.badge || DEFAULT_BADGE_CONFIG)
  };
}

export function defaultGridConfig(layout = "grid") {
  const key = normalizeLayoutKey(layout);
  const preset = LAYOUT_PRESETS[key];
  return cloneGridConfig({
    ...SLDS_INPUT_GRID_CONFIG,
    minWidth: preset.minWidth,
    size: preset.size,
    aspectRatio: preset.aspectRatio,
    columns: null
  });
}

export function resolvedLayoutGridConfig(layout = "grid") {
  const key = normalizeLayoutKey(layout);
  return cloneGridConfig({
    ...defaultGridConfig(key),
    ...LAYOUT_PRESETS[key],
    margin: AUTO_BOX,
    padding: AUTO_BOX,
    badge: DEFAULT_BADGE_CONFIG
  });
}

export function mergeGridConfigWithDefaults(layout = "grid", gridConfig = {}) {
  const key = normalizeLayoutKey(layout);
  const base = defaultGridConfig(key);
  return cloneGridConfig({
    ...base,
    ...gridConfig,
    margin: {
      ...base.margin,
      ...(gridConfig.margin || {})
    },
    padding: {
      ...base.padding,
      ...(gridConfig.padding || {})
    },
    badge: {
      ...base.badge,
      ...(gridConfig.badge || {})
    }
  });
}

export function defaultSelectorConfig() {
  return {
    dataSource: "",
    layout: "grid",
    selectionMode: "single",
    autoAdvance: false,
    enableSearch: false,
    showSelectAll: false,
    minSelections: 0,
    maxSelections: null,
    required: false,
    customErrorMessage: "",
    label: "",
    helpText: "",
    fieldLevelHelp: "",
    emptyStateMessage: "No options available.",
    errorStateMessage: "Could not load options.",
    picklist: {
      objectApiName: "",
      fieldApiName: "",
      recordTypeId: "",
      valueSource: "apiName"
    },
    collection: {
      objectApiName: "",
      sampleValues: "",
      fieldMap: {
        label: "",
        sublabel: "",
        icon: "",
        value: "",
        badge: "",
        helpText: ""
      }
    },
    sobject: {
      sObjectApiName: "",
      whereClause: "",
      orderByField: "",
      orderByDirection: "ASC",
      limit: 50,
      labelField: "Name",
      valueField: "Id",
      sublabelField: "",
      iconField: "",
      badgeField: "",
      helpField: ""
    },
    custom: { items: [] },
    stringCollection: { sampleValues: "" },
    includeNoneOption: false,
    noneOptionLabel: "--None--",
    noneOptionPosition: "start",
    manualInput: {
      enabled: false,
      label: "Other",
      minLength: 0,
      maxLength: null
    },
    overrides: {},
    display: { sortBy: "none", sortDirection: "asc", limit: null },
    gridConfig: defaultGridConfig("grid")
  };
}
