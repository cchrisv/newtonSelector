import { LightningElement, api, track } from "lwc";
import {
  FlowAttributeChangeEvent,
  FlowNavigationNextEvent
} from "lightning/flowSupport";
import { resolvedLayoutGridConfig } from "c/newtonUtilitySelectorConfigDefaults";

const AUTO_ADVANCE_DELAY_MS = 150;

const VALID_LAYOUTS = new Set([
  "grid",
  "list",
  "horizontal",
  "picklist",
  "dropdown",
  "radio",
  "columns",
  "dualListbox"
]);

const DEFAULT_CONFIG = {
  dataSource: "custom",
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
  includeNoneOption: false,
  noneOptionLabel: "--None--",
  noneOptionPosition: "start",
  manualInput: {
    enabled: false,
    label: "Other",
    minLength: 0,
    maxLength: null
  },
  picklist: {},
  collection: {},
  sobject: {},
  custom: { items: [] },
  overrides: {},
  display: { sortBy: "none", sortDirection: "asc", limit: null },
  gridConfig: {
    minWidth: "7.5rem",
    gapH: "",
    gapV: "",
    margin: {
      top: "",
      right: "",
      bottom: "",
      left: "",
      linked: true
    },
    padding: { top: "", right: "", bottom: "", left: "", linked: true },
    size: "small",
    aspectRatio: "1:1",
    badge: {
      position: "bottom-inline",
      variant: "neutral",
      shape: "pill",
      variantHex: ""
    },
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
  }
};

export default class NewtonFlowSelector extends LightningElement {
  @api sourceRecords;
  @api sourceStrings;

  _value = "";
  _values = [];
  _selectedLabel = "";
  _selectedLabels = [];
  _selectionCount = 0;
  _allValues = [];
  _allLabels = [];
  _autoAdvanceId;
  _pickerConfigJson = "";
  _lastParsedJson = null;

  @track _config = DEFAULT_CONFIG;

  // Flow can re-assign @api props after mount (debug runs, back/next,
  // conditional screens, resume). With a plain `@api field` the value
  // would update but our _config wouldn't re-parse — the picker would
  // flash correct then revert to DEFAULT. Setter keeps them in sync, and
  // the `v !== this._lastParsedJson` guard prevents transient empty
  // pushes from wiping the last good config.
  @api
  get pickerConfigJson() {
    return this._pickerConfigJson;
  }
  set pickerConfigJson(v) {
    this._pickerConfigJson = v || "";
    this.parseSelectorConfig(v);
  }

  parseSelectorConfig(v) {
    if (!v) return; // ignore transient empty/undefined; keep last good _config
    if (v === this._lastParsedJson) return; // identical payload; skip re-parse
    try {
      const parsed = JSON.parse(v);
      this._config = {
        ...DEFAULT_CONFIG,
        ...parsed,
        manualInput: {
          ...DEFAULT_CONFIG.manualInput,
          ...(parsed.manualInput || {})
        }
      };
      this._lastParsedJson = v;
    } catch {
      // Parse error — keep the last good _config rather than flashing to
      // DEFAULT (which would render empty/custom mode briefly).
    }
  }

  @api
  get value() {
    return this._value;
  }
  set value(v) {
    this._value = v === undefined || v === null ? "" : String(v);
  }

  @api
  get values() {
    return this._values;
  }
  set values(v) {
    this._values = Array.isArray(v) ? [...v] : [];
  }

  @api selectedRecord;
  @api selectedRecords;
  // Read-through outputs — Flow can bind these to downstream screens /
  // flows / email templates. selectedLabel/Labels reflect the label text of
  // the current selection; allValues/allLabels reflect every option the
  // picker rendered (post filter/sort/limit, including the None tile).
  @api
  get selectedLabel() {
    return this._selectedLabel;
  }
  set selectedLabel(v) {
    this._selectedLabel = v || "";
  }
  @api
  get selectedLabels() {
    return this._selectedLabels;
  }
  set selectedLabels(v) {
    this._selectedLabels = Array.isArray(v) ? [...v] : [];
  }
  @api
  get allValues() {
    return this._allValues;
  }
  set allValues(v) {
    this._allValues = Array.isArray(v) ? [...v] : [];
  }
  @api
  get allLabels() {
    return this._allLabels;
  }
  set allLabels(v) {
    this._allLabels = Array.isArray(v) ? [...v] : [];
  }
  @api
  get selectionCount() {
    return this._selectionCount;
  }
  set selectionCount(v) {
    this._selectionCount = typeof v === "number" ? v : 0;
  }

  connectedCallback() {
    // Most of the time Flow has already set pickerConfigJson via the
    // setter before mount. This is a safety net for bootstrap ordering
    // edge cases where the setter hasn't fired yet.
    if (this._pickerConfigJson && !this._lastParsedJson) {
      this.parseSelectorConfig(this._pickerConfigJson);
    }
  }

  disconnectedCallback() {
    if (this._autoAdvanceId) {
      clearTimeout(this._autoAdvanceId);
      this._autoAdvanceId = null;
    }
  }

  get label() {
    return this._config.label;
  }
  get helpText() {
    return this._config.helpText;
  }
  get fieldLevelHelp() {
    return this._config.fieldLevelHelp;
  }
  get dataSource() {
    return this._config.dataSource;
  }
  get layout() {
    const layout = VALID_LAYOUTS.has(this._config.layout)
      ? this._config.layout
      : "grid";
    return layout === "dropdown" ? "picklist" : layout;
  }
  get selectionMode() {
    return this._config.selectionMode === "multi" ? "multi" : "single";
  }
  get required() {
    return this._config.required;
  }
  get minSelections() {
    return this._config.minSelections;
  }
  get maxSelections() {
    return this._config.maxSelections;
  }
  get enableSearch() {
    return this._config.enableSearch;
  }
  get showSelectAll() {
    return this._config.showSelectAll;
  }
  get emptyStateMessage() {
    return this._config.emptyStateMessage;
  }
  get errorStateMessage() {
    return this._config.errorStateMessage;
  }

  get picklistConfig() {
    return this._config.picklist || {};
  }
  get sobjectConfig() {
    return this._config.sobject || {};
  }
  get customConfig() {
    return this._config.custom || { items: [] };
  }
  get collectionConfig() {
    const baseFieldMap = (this._config.collection || {}).fieldMap || {};
    return {
      records: Array.isArray(this.sourceRecords) ? this.sourceRecords : [],
      fieldMap: baseFieldMap
    };
  }
  get stringCollectionConfig() {
    return {
      values: Array.isArray(this.sourceStrings) ? this.sourceStrings : []
    };
  }
  get overrides() {
    return this._config.overrides || {};
  }
  get displayConfig() {
    return this._config.display || DEFAULT_CONFIG.display;
  }

  // Grid layout getters
  get gridDefaults() {
    return resolvedLayoutGridConfig(this.layout);
  }
  get gridCfg() {
    return this._config.gridConfig || DEFAULT_CONFIG.gridConfig;
  }
  get gridMinWidth() {
    return this.gridCfg.minWidth || this.gridDefaults.minWidth;
  }
  get gapHorizontal() {
    return this.gridCfg.gapH || this.gridDefaults.gapH;
  }
  get gapVertical() {
    return this.gridCfg.gapV || this.gridDefaults.gapV;
  }
  get tileSize() {
    return this.gridCfg.size || this.gridDefaults.size;
  }
  get tileAspectRatio() {
    return this.gridCfg.aspectRatio || this.gridDefaults.aspectRatio;
  }

  get badgeCfg() {
    return this.gridCfg.badge || DEFAULT_CONFIG.gridConfig.badge;
  }
  get badgePosition() {
    return this.badgeCfg.position || "bottom-inline";
  }
  get badgeVariant() {
    return this.badgeCfg.variant || "neutral";
  }
  get badgeShape() {
    return this.badgeCfg.shape || "pill";
  }

  get columns() {
    const n = Number(this.gridCfg.columns);
    return Number.isFinite(n) && n >= 1 && n <= 6 ? n : undefined;
  }
  get selectionIndicator() {
    return (
      this.gridCfg.selectionIndicator || this.gridDefaults.selectionIndicator
    );
  }
  get elevation() {
    return this.gridCfg.elevation || "outlined";
  }
  get pattern() {
    return this.gridCfg.pattern || "none";
  }
  get patternTone() {
    return this.gridCfg.patternTone || "neutral";
  }
  get patternHoverTone() {
    return this.gridCfg.patternHoverTone || this.patternTone;
  }
  get patternSelectedTone() {
    return this.gridCfg.patternSelectedTone || "brand";
  }
  get patternDisabledTone() {
    return this.gridCfg.patternDisabledTone || "neutral";
  }
  get cornerStyle() {
    return this.gridCfg.cornerStyle || "none";
  }
  get cornerTone() {
    return this.gridCfg.cornerTone || "neutral";
  }
  get surfaceStyle() {
    return this.gridCfg.surfaceStyle || "solid";
  }
  get surfaceTone() {
    return this.gridCfg.surfaceTone || "neutral";
  }
  get surfaceHoverTone() {
    return this.gridCfg.surfaceHoverTone || this.surfaceTone;
  }
  get surfaceSelectedTone() {
    return this.gridCfg.surfaceSelectedTone || "brand";
  }
  get surfaceDisabledTone() {
    return this.gridCfg.surfaceDisabledTone || "neutral";
  }
  get iconDecor() {
    return this.gridCfg.iconDecor || this.gridDefaults.iconDecor;
  }
  get iconStyle() {
    return this.gridCfg.iconStyle || this.gridDefaults.iconStyle;
  }
  get iconShading() {
    return this.gridCfg.iconShading || "flat";
  }
  get iconTone() {
    return this.gridCfg.iconTone || this.gridDefaults.iconTone;
  }
  get iconToneHex() {
    return this.gridCfg.iconToneHex || "";
  }
  // Glyph tone defaults to 'auto' (inherit from iconTone) when absent.
  get iconGlyphTone() {
    return this.gridCfg.iconGlyphTone || "auto";
  }
  get iconGlyphToneHex() {
    return this.gridCfg.iconGlyphToneHex || "";
  }
  // Picker-wide icon glyph size. 'auto' means "scale with tile size" —
  // the atom's existing behavior. Explicit values (small/medium/large/etc.)
  // pin the glyph regardless of tile size.
  get iconSize() {
    const raw = this.gridCfg.iconSize;
    return raw && raw !== "auto" ? raw : "large";
  }
  get patternToneHex() {
    return this.gridCfg.patternToneHex || "";
  }
  get patternHoverToneHex() {
    return this.gridCfg.patternHoverToneHex || "";
  }
  get patternSelectedToneHex() {
    return this.gridCfg.patternSelectedToneHex || "";
  }
  get patternDisabledToneHex() {
    return this.gridCfg.patternDisabledToneHex || "";
  }
  get cornerToneHex() {
    return this.gridCfg.cornerToneHex || "";
  }
  get surfaceToneHex() {
    return this.gridCfg.surfaceToneHex || "";
  }
  get surfaceHoverToneHex() {
    return this.gridCfg.surfaceHoverToneHex || "";
  }
  get surfaceSelectedToneHex() {
    return this.gridCfg.surfaceSelectedToneHex || "";
  }
  get surfaceDisabledToneHex() {
    return this.gridCfg.surfaceDisabledToneHex || "";
  }
  get badgeVariantHex() {
    return this.badgeCfg?.variantHex || "";
  }
  // Default ON — admin flips in CPE to hide globally. Explicit false
  // required to flip off, so legacy configs (where the key didn't exist)
  // keep rendering icons/badges.
  get showIcons() {
    return this.gridCfg.showIcons !== false;
  }
  get showBadges() {
    return this.gridCfg.showBadges !== false;
  }

  // None-option config lives at the top of the config (behavior-level),
  // not under gridConfig (visual-level).
  get includeNoneOption() {
    return Boolean(this._config.includeNoneOption);
  }
  get noneOptionLabel() {
    return this._config.noneOptionLabel || "--None--";
  }
  get noneOptionPosition() {
    // Only 'start' and 'end' are legal; anything else quietly maps to
    // 'start' so old saved configs don't break when this setting is added.
    return this._config.noneOptionPosition === "end" ? "end" : "start";
  }

  get manualInputConfig() {
    return this._config.manualInput || DEFAULT_CONFIG.manualInput;
  }
  get allowManualInput() {
    return Boolean(this.manualInputConfig.enabled);
  }
  get manualInputLabel() {
    const label = this.manualInputConfig.label;
    return label && String(label).trim() ? String(label) : "Other";
  }
  get manualInputMinLength() {
    const min = Number(this.manualInputConfig.minLength || 0);
    return Number.isFinite(min) && min > 0 ? min : 0;
  }
  get manualInputMaxLength() {
    const max = this.manualInputConfig.maxLength;
    if (max === null || max === undefined || max === "") return undefined;
    const n = Number(max);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  }

  // Margin + padding — empty string means "no override"; the molecule
  // resolves via tokenToCss, and the atom falls back to size-based padding.
  get marginTop() {
    return this.gridCfg.margin?.top ?? "";
  }
  get marginRight() {
    return this.gridCfg.margin?.right ?? "";
  }
  get marginBottom() {
    return this.gridCfg.margin?.bottom ?? "";
  }
  get marginLeft() {
    return this.gridCfg.margin?.left ?? "";
  }
  get paddingTop() {
    return this.gridCfg.padding?.top || undefined;
  }
  get paddingRight() {
    return this.gridCfg.padding?.right || undefined;
  }
  get paddingBottom() {
    return this.gridCfg.padding?.bottom || undefined;
  }
  get paddingLeft() {
    return this.gridCfg.padding?.left || undefined;
  }

  handleValueChange(event) {
    const { value, values, record, records, label, labels } = event.detail;
    const isSingle = this.selectionMode === "single";

    if (isSingle) {
      this._value = value || "";
      this._values = [];
      this._selectedLabel = label || "";
      this._selectedLabels = [];
      this._selectionCount = this._value ? 1 : 0;
      this.dispatchEvent(new FlowAttributeChangeEvent("value", this._value));
      this.dispatchEvent(
        new FlowAttributeChangeEvent("selectedRecord", record || null)
      );
      this.dispatchEvent(
        new FlowAttributeChangeEvent("selectedLabel", this._selectedLabel)
      );
      this.dispatchEvent(
        new FlowAttributeChangeEvent("selectionCount", this._selectionCount)
      );
    } else {
      this._values = [...(values || [])];
      this._value = "";
      this._selectedLabels = Array.isArray(labels) ? [...labels] : [];
      this._selectedLabel = "";
      this._selectionCount = this._values.length;
      this.dispatchEvent(new FlowAttributeChangeEvent("values", this._values));
      this.dispatchEvent(
        new FlowAttributeChangeEvent("selectedRecords", records || [])
      );
      this.dispatchEvent(
        new FlowAttributeChangeEvent("selectedLabels", this._selectedLabels)
      );
      this.dispatchEvent(
        new FlowAttributeChangeEvent("selectionCount", this._selectionCount)
      );
    }

    if (isSingle && this._config.autoAdvance && this._value) {
      this.triggerAutoAdvance();
    }
  }

  // Organism fires `itemschange` whenever the rendered set of options
  // changes (picklist load, string collection refresh, filter by parent,
  // etc.). We mirror that back out as FlowAttributeChangeEvents so admins
  // can bind allValues/allLabels to downstream screens, email templates,
  // or Apex actions.
  handleItemsChange(event) {
    const { values, labels } = event.detail || {};
    this._allValues = Array.isArray(values) ? [...values] : [];
    this._allLabels = Array.isArray(labels) ? [...labels] : [];
    this.dispatchEvent(
      new FlowAttributeChangeEvent("allValues", this._allValues)
    );
    this.dispatchEvent(
      new FlowAttributeChangeEvent("allLabels", this._allLabels)
    );
  }

  triggerAutoAdvance() {
    if (this._autoAdvanceId) clearTimeout(this._autoAdvanceId);
    this._autoAdvanceId = setTimeout(() => {
      this._autoAdvanceId = null;
      this.dispatchEvent(new FlowNavigationNextEvent());
    }, AUTO_ADVANCE_DELAY_MS);
  }

  @api
  validate() {
    const organism = this.template.querySelector(
      "c-newton-organism-data-selector"
    );
    if (!organism) return { isValid: true };
    const result = organism.validate();
    if (!result.isValid && this._config.customErrorMessage) {
      return { isValid: false, errorMessage: this._config.customErrorMessage };
    }
    return result;
  }
}
