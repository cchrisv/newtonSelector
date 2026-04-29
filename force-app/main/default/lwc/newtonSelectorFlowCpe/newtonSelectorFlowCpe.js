import { LightningElement, api, track } from "lwc";
import NewtonSelectorFlowCpeConfigModal from "c/newtonSelectorFlowCpeConfigModal";
import {
  mergeSelectorConfig,
  resolveRecordCollectionMetadataFromBuilderContext
} from "c/newtonSelectorFlowCpeUtilityConfigState";

const CONFIG_KEY = "selectorConfigJson";
const SOURCE_RECORDS_KEY = "sourceRecords";

const SPACING_TOKEN_TO_PX = {
  none: "0",
  1: "4",
  2: "8",
  3: "12",
  4: "16",
  5: "20",
  6: "24",
  7: "32",
  8: "40",
  9: "48"
};

function fmtToken(t) {
  if (t == null || t === "") return "auto";
  const px = SPACING_TOKEN_TO_PX[String(t)];
  return px != null ? `${px}px` : String(t);
}

export default class NewtonSelectorFlowCpe extends LightningElement {
  @api builderContext;
  @api automaticOutputVariables;

  _inputVariables = [];
  _genericTypeMappings = [];
  _sourceRecordsRef = "";
  _lastGenericSObject = "";
  _lastHydratedJson = null; // perf: short-circuits re-parse on duplicate setter calls
  @track _config = mergeSelectorConfig();

  @api
  get inputVariables() {
    return this._inputVariables;
  }
  set inputVariables(v) {
    this._inputVariables = Array.isArray(v) ? v : [];
    this.hydrate();
  }

  @api
  get genericTypeMappings() {
    return this._genericTypeMappings;
  }
  set genericTypeMappings(v) {
    this._genericTypeMappings = Array.isArray(v) ? v : [];
    const existing = this._genericTypeMappings.find((m) => m.typeName === "T");
    if (existing?.typeValue) {
      this._lastGenericSObject = existing.typeValue;
    } else if (this.hasDataSource) {
      this.syncGenericTypeMapping();
    }
  }

  hydrate() {
    const json = this.readInput(CONFIG_KEY);
    // Short-circuit: if the serialized config is byte-identical to what
    // we've already parsed, skip the O(n) JSON.parse + spread. Flow
    // Builder can call `set inputVariables` several times during panel
    // setup with the same payload — this avoids repeated work.
    if (json && json !== this._lastHydratedJson) {
      try {
        const parsed = JSON.parse(json);
        this._config = mergeSelectorConfig(parsed);
        this._lastHydratedJson = json;
      } catch {
        this._config = mergeSelectorConfig();
        this._lastHydratedJson = null;
      }
    }
    this._sourceRecordsRef = this.readInput(SOURCE_RECORDS_KEY) || "";

    if (this.hasDataSource && !this._lastGenericSObject) {
      this.syncGenericTypeMapping();
    }
  }

  readInput(name) {
    const entry = this._inputVariables.find((iv) => iv.name === name);
    return entry ? entry.value : undefined;
  }

  // --- Mode flags ---
  get hasDataSource() {
    return Boolean(this._config.dataSource);
  }
  get isPicklistMode() {
    return this._config.dataSource === "picklist";
  }
  get isCollectionMode() {
    return this._config.dataSource === "collection";
  }
  get isSObjectMode() {
    return this._config.dataSource === "sobject";
  }
  get isCustomMode() {
    return this._config.dataSource === "custom";
  }

  // ========================================================================
  // Summary sections — return readable sentences, not abbreviations.
  // Each section is { title, lines: [{ key, text, detail? }] }.
  // ========================================================================

  // --- Section 1: Data source (what's feeding the selector) ---------------
  get dataSection() {
    const c = this._config;
    if (!c.dataSource) return null;

    const kindMap = {
      picklist: "Picklist",
      collection: "Record collection",
      sobject: "SOQL query",
      custom: "Custom items"
    };
    const kind = kindMap[c.dataSource];
    const lines = [];

    if (this.isPicklistMode) {
      const o = c.picklist?.objectApiName;
      const f = c.picklist?.fieldApiName;
      if (o && f) {
        lines.push({ key: "binding", text: `${o}.${f}`, mono: true });
      } else {
        lines.push({
          key: "missing",
          text: "Object and field not set",
          muted: true
        });
      }
      if (c.picklist?.recordTypeId) {
        lines.push({ key: "rt", text: "Filtered by record type", muted: true });
      }
    } else if (this.isCollectionMode) {
      const ref = this._sourceRecordsRef;
      if (ref) lines.push({ key: "binding", text: ref, mono: true });
      else
        lines.push({
          key: "missing",
          text: "No collection bound",
          muted: true
        });
      const mapped = Object.values(c.collection?.fieldMap || {}).filter(
        Boolean
      ).length;
      if (mapped)
        lines.push({
          key: "map",
          text: `${mapped} field${mapped === 1 ? "" : "s"} mapped`,
          muted: true
        });
    } else if (this.isSObjectMode) {
      const o = c.sobject?.sObjectApiName;
      if (o) lines.push({ key: "binding", text: o, mono: true });
      else
        lines.push({ key: "missing", text: "No object selected", muted: true });
      const meta = [];
      if (c.sobject?.whereClause) meta.push("filtered");
      if (c.sobject?.orderByField)
        meta.push(`sorted by ${c.sobject.orderByField}`);
      if (c.sobject?.limit) meta.push(`limit ${c.sobject.limit}`);
      if (meta.length)
        lines.push({ key: "meta", text: meta.join(", "), muted: true });
    } else if (this.isCustomMode) {
      const n = c.custom?.items?.length || 0;
      lines.push({
        key: "count",
        text: n === 0 ? "No items yet" : `${n} item${n === 1 ? "" : "s"}`,
        muted: n === 0
      });
    }

    return { kind, lines };
  }

  // --- Section 2: Label & text (what the user sees) ---------------------
  get labelSection() {
    const c = this._config;
    const label = (c.label || "").trim();
    const help = (c.helpText || "").trim();
    const tip = (c.fieldLevelHelp || "").trim();
    const lines = [];

    if (label) {
      lines.push({ key: "lbl", text: label });
    } else {
      lines.push({ key: "lbl", text: "No label set", muted: true });
    }
    const extras = [];
    if (help) extras.push("description");
    if (tip) extras.push("tooltip");
    if (extras.length) {
      lines.push({
        key: "extras",
        text: `With ${extras.join(" and ")}`,
        muted: true
      });
    }
    return { lines };
  }

  // --- Section 3: Behavior (how selection works) ------------------------
  get behaviorLines() {
    const c = this._config;
    const lines = [];

    // Primary selection rule — one clear sentence
    if (c.selectionMode === "multi") {
      const min = Number(c.minSelections || 0);
      const max = c.maxSelections;
      let phrase = "Multi-select";
      if (min > 0 && max) phrase += `, ${min}–${max} selections`;
      else if (min > 0) phrase += `, at least ${min}`;
      else if (max) phrase += `, up to ${max}`;
      if (c.required && min === 0) phrase += ", required";
      lines.push({ key: "mode", text: phrase });
    } else {
      let phrase = "Single select";
      if (c.required) phrase += ", required";
      lines.push({ key: "mode", text: phrase });
    }

    if (c.autoAdvance && c.selectionMode === "single") {
      lines.push({
        key: "auto",
        text: "Auto-advances the flow on selection",
        muted: true
      });
    }
    if (c.includeNoneOption && c.selectionMode === "single") {
      const pos = c.noneOptionPosition === "end" ? "end" : "start";
      const lbl = (c.noneOptionLabel || "--None--").trim() || "--None--";
      lines.push({
        key: "none",
        text: `Includes "${lbl}" at the ${pos}`,
        muted: true
      });
    }
    if (c.manualInput?.enabled) {
      const label = (c.manualInput.label || "Other").trim() || "Other";
      const min = Number(c.manualInput.minLength || 0);
      const max = c.manualInput.maxLength;
      let limits = "";
      if (min > 0 && max) limits = `, ${min}-${max} characters`;
      else if (min > 0) limits = `, at least ${min} characters`;
      else if (max) limits = `, up to ${max} characters`;
      lines.push({
        key: "manual",
        text: `Manual "${label}" input${limits}`,
        muted: true
      });
    }
    if (c.enableSearch) {
      lines.push({ key: "search", text: "Search bar enabled", muted: true });
    }
    if (c.showSelectAll && c.selectionMode === "multi") {
      lines.push({
        key: "selall",
        text: "Select-all / Clear-all toolbar",
        muted: true
      });
    }

    return lines;
  }

  // --- Section 4: Appearance (how it looks) -----------------------------
  get appearanceLines() {
    const c = this._config;
    const g = c.gridConfig || {};
    const lines = [];

    const layoutNames = {
      grid: "Grid",
      list: "List",
      horizontal: "Horizontal scroll",
      picklist: "Picklist",
      dropdown: "Picklist",
      radio: "Radio cards",
      columns: "Drag/drop columns",
      dualListbox: "Multi-select selector"
    };
    const layoutName = layoutNames[c.layout] || "Grid";

    // Primary layout line — includes columns when pinned.
    const cols = Number(g.columns);
    const colsPhrase =
      Number.isFinite(cols) && cols >= 1 && cols <= 6
        ? `${cols} column${cols === 1 ? "" : "s"}`
        : "auto-fit";
    if (c.layout === "grid") {
      lines.push({ key: "layout", text: `${layoutName}, ${colsPhrase}` });
    } else {
      lines.push({ key: "layout", text: layoutName });
    }

    // Tile size — full words, not initials
    const sizeMap = { small: "Small", medium: "Medium", large: "Large" };
    const sizeName = sizeMap[g.size] || "Small";
    const aspect = g.aspectRatio || "1:1";
    const aspectName =
      {
        "1:1": "square",
        "4:3": "landscape",
        "16:9": "widescreen",
        "3:4": "portrait"
      }[aspect] || aspect;
    lines.push({
      key: "tile",
      text: `${sizeName} tiles, ${aspectName}`,
      muted: true
    });

    // Gaps — only if non-default
    const gapH = fmtToken(g.gapH);
    const gapV = fmtToken(g.gapV);
    if (gapH !== "auto" || gapV !== "auto") {
      const gapText = gapH === gapV ? `${gapH} gaps` : `${gapH} × ${gapV} gaps`;
      lines.push({ key: "gap", text: gapText, muted: true });
    }

    // Badge — only if position is set
    const badge = g.badge || {};
    if (badge.position) {
      const posNames = {
        "top-left": "top-left",
        "top-right": "top-right",
        "bottom-left": "bottom-left",
        "bottom-right": "bottom-right",
        "bottom-inline": "below"
      };
      const posName = posNames[badge.position] || badge.position;
      lines.push({
        key: "badge",
        text: `Badge at ${posName}, ${badge.variant || "neutral"} style`,
        muted: true
      });
    }

    // Only show selection indicator / elevation when non-default
    const extras = [];
    if (g.selectionIndicator && g.selectionIndicator !== "frame") {
      extras.push(`${g.selectionIndicator} indicator`);
    }
    if (g.elevation && g.elevation !== "outlined") {
      extras.push(`${g.elevation} elevation`);
    }
    if (extras.length) {
      lines.push({ key: "extras", text: extras.join(", "), muted: true });
    }

    // Pattern / surface / corner / icon-decor — each shown as its own
    // muted line when non-default, with its tone so the admin knows what
    // color is active.
    const decorParts = [];
    if (g.pattern && g.pattern !== "none") {
      decorParts.push(
        `${g.pattern} pattern (${g.patternTone || "neutral"}, selected ${g.patternSelectedTone || "brand"})`
      );
    }
    if (g.surfaceStyle && g.surfaceStyle !== "solid") {
      const nice = g.surfaceStyle.replace("gradient-", "");
      decorParts.push(
        `${nice} surface (${g.surfaceTone || "neutral"}, selected ${g.surfaceSelectedTone || "brand"})`
      );
    }
    if (g.cornerStyle && g.cornerStyle !== "none") {
      decorParts.push(
        `${g.cornerStyle} corners (${g.cornerTone || "neutral"})`
      );
    }
    if (g.iconDecor && g.iconDecor !== "square") {
      decorParts.push(`${g.iconDecor} icon (${g.iconTone || "brand"})`);
    }
    if (decorParts.length) {
      lines.push({ key: "decor", text: decorParts.join(" · "), muted: true });
    }

    // Global visibility flags — surfaced as a line so admins aren't
    // confused when icons/badges appear missing from their data.
    const hidden = [];
    if (g.showIcons === false) hidden.push("icons");
    if (g.showBadges === false) hidden.push("badges");
    if (hidden.length) {
      lines.push({
        key: "hidden",
        text: `${hidden.join(" + ")} hidden globally`,
        muted: true
      });
    }

    return lines;
  }

  get hasContentOverrides() {
    return Boolean(
      (this._config.label && this._config.label.trim()) ||
      (this._config.helpText && this._config.helpText.trim())
    );
  }

  // ========================================================================
  // Validation
  // ========================================================================
  @api
  validate() {
    return this.computeErrors();
  }

  computeErrors() {
    const errors = [];
    if (!this.hasDataSource) {
      errors.push({
        key: "selectorConfigJson",
        errorString: "Select a data source — click Configure selector."
      });
      return errors;
    }
    if (!this._lastGenericSObject) {
      errors.push({
        key: "T",
        errorString:
          "SObject type mapping not yet resolved. Reopen Configure and save again."
      });
    }
    if (this.isPicklistMode) {
      if (!this._config.picklist.objectApiName)
        errors.push({
          key: "selectorConfigJson",
          errorString: "Picklist mode requires an object."
        });
      if (!this._config.picklist.fieldApiName)
        errors.push({
          key: "selectorConfigJson",
          errorString: "Picklist mode requires a picklist field."
        });
    }
    if (this.isCollectionMode) {
      if (!this._sourceRecordsRef)
        errors.push({
          key: "sourceRecords",
          errorString: "Collection mode requires a Flow record collection."
        });
      if (!this._config.collection.fieldMap.label)
        errors.push({
          key: "selectorConfigJson",
          errorString: "Map at least the Label field for the collection."
        });
    }
    if (this.isSObjectMode) {
      if (!this._config.sobject.sObjectApiName)
        errors.push({
          key: "selectorConfigJson",
          errorString: "SObject mode requires an object."
        });
    }
    if (this.isCustomMode) {
      if (
        (this._config.custom.items?.length || 0) === 0 &&
        !this._config.manualInput?.enabled
      )
        errors.push({
          key: "selectorConfigJson",
          errorString: "Add at least one custom item."
        });
    }
    const manual = this._config.manualInput || {};
    if (manual.enabled) {
      const min = Number(manual.minLength || 0);
      const max =
        manual.maxLength === null || manual.maxLength === undefined
          ? null
          : Number(manual.maxLength);
      if (!manual.label || !String(manual.label).trim()) {
        errors.push({
          key: "selectorConfigJson",
          errorString: "Manual input needs an option label."
        });
      }
      if (!Number.isFinite(min) || min < 0) {
        errors.push({
          key: "selectorConfigJson",
          errorString: "Manual input minimum characters must be 0 or greater."
        });
      }
      if (max !== null && (!Number.isFinite(max) || max < Math.max(min, 1))) {
        errors.push({
          key: "selectorConfigJson",
          errorString:
            "Manual input maximum characters must be at least the minimum."
        });
      }
    }
    return errors;
  }

  get liveErrors() {
    return this.computeErrors();
  }
  get hasValidationErrors() {
    return this.liveErrors.length > 0;
  }
  get validationMessages() {
    return this.liveErrors.map((e, i) => ({
      key: `err-${i}`,
      message: e.errorString
    }));
  }

  // ========================================================================
  // Configure button — opens the studio modal.
  // ========================================================================
  async handleOpenConfigure() {
    const result = await NewtonSelectorFlowCpeConfigModal.open({
      size: "large",
      description: "Configure Newton Selector",
      initialConfig: JSON.parse(JSON.stringify(this._config)),
      initialSourceRecordsRef: this._sourceRecordsRef,
      builderContext: this.builderContext,
      automaticOutputVariables: this.automaticOutputVariables
    });

    if (!result || result.action !== "save") return;

    this._config = mergeSelectorConfig(result.config);
    if (result.sourceRecordsRef !== this._sourceRecordsRef) {
      this._sourceRecordsRef = result.sourceRecordsRef || "";
      this.dispatchCpeChange(
        SOURCE_RECORDS_KEY,
        this._sourceRecordsRef,
        "reference"
      );
    }
    this.syncGenericTypeMapping();
    const serialized = JSON.stringify(this._config);
    this._lastHydratedJson = serialized; // keep short-circuit in sync with our own change
    this.dispatchCpeChange(CONFIG_KEY, serialized, "String");
  }

  // ========================================================================
  // Generic T type mapping sync
  // ========================================================================
  syncGenericTypeMapping() {
    const target = this.resolveGenericSObject();
    if (!target || target === this._lastGenericSObject) return;
    this._lastGenericSObject = target;
    this.dispatchEvent(
      new CustomEvent("configuration_editor_generic_type_mapping_changed", {
        bubbles: true,
        composed: true,
        cancelable: false,
        detail: { typeName: "T", typeValue: target }
      })
    );
  }

  resolveGenericSObject() {
    if (this.isPicklistMode) return this._config.picklist.objectApiName || "";
    if (this.isSObjectMode) return this._config.sobject.sObjectApiName || "";
    if (this.isCollectionMode) {
      return (
        this._config.collection?.objectApiName ||
        resolveRecordCollectionMetadataFromBuilderContext(
          this.builderContext,
          this._sourceRecordsRef
        ).objectApiName ||
        ""
      );
    }
    if (this.hasDataSource) return "Account";
    return "";
  }

  dispatchCpeChange(name, newValue, newValueDataType) {
    this.dispatchEvent(
      new CustomEvent("configuration_editor_input_value_changed", {
        bubbles: true,
        composed: true,
        cancelable: false,
        detail: { name, newValue, newValueDataType }
      })
    );
  }
}
