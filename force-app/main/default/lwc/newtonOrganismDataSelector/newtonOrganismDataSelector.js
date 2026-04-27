import { LightningElement, api, wire, track } from "lwc";
import { getObjectInfo, getPicklistValues } from "lightning/uiObjectInfoApi";
import queryItems from "@salesforce/apex/NewtonSelectorController.queryItems";
import {
  normalizePicklist,
  normalizeCollection,
  normalizeSObjectDTO,
  normalizeCustom,
  normalizeStringCollection,
  applyOverrides,
  applyDisplay,
  MANUAL_INPUT_VALUE
} from "c/newtonUtilitySelectorDataSources";

const SOURCE_PICKLIST = "picklist";
const SOURCE_COLLECTION = "collection";
const SOURCE_SOBJECT = "sobject";
const SOURCE_CUSTOM = "custom";
const SOURCE_STRING_COLLECTION = "stringCollection";

export default class NewtonOrganismDataSelector extends LightningElement {
  @api label = "";
  @api helpText = "";
  @api fieldLevelHelp = "";
  // Preview-only: force a state ('' | 'empty' | 'error'). Ignored at runtime.
  @api forcedState = "";
  @api layout = "grid";
  @api required = false;
  @api minSelections = 0;
  @api maxSelections;
  @api showSelectAll = false;
  @api previewMode = false;
  @api emptyStateMessage = "No options available.";
  @api errorStateMessage = "Could not load options.";
  // Insert a "None" tile as an option in any selection mode. Its empty value
  // clears the selection downstream rather than being persisted as a choice.
  @track _sourceType = SOURCE_CUSTOM;
  @track _picklistConfig;
  @track _collectionConfig;
  @track _sobjectConfig;
  @track _customConfig;
  @track _stringCollectionConfig;
  @track _displayConfig;
  _selectionMode = "single";
  _includeNoneOption = false;
  _noneOptionLabel = "--None--";
  _noneOptionPosition = "start";
  _allowManualInput = false;
  _manualInputLabel = "Other";
  _manualInputValue = "";
  _manualInputSelected = false;
  _enableSearch = false;

  @api
  get selectionMode() {
    return this._selectionMode;
  }
  set selectionMode(v) {
    const next = v === "multi" ? "multi" : "single";
    if (this._selectionMode === next) return;
    this._selectionMode = next;
    this.refreshItemsForNoneOptionConfig();
  }

  @api
  get includeNoneOption() {
    return this._includeNoneOption;
  }
  set includeNoneOption(v) {
    const next = v === true || v === "true" || v === "";
    if (this._includeNoneOption === next) return;
    this._includeNoneOption = next;
    this.refreshItemsForNoneOptionConfig();
  }

  @api
  get noneOptionLabel() {
    return this._noneOptionLabel;
  }
  set noneOptionLabel(v) {
    const next = v === undefined || v === null ? "--None--" : String(v);
    if (this._noneOptionLabel === next) return;
    this._noneOptionLabel = next;
    this.refreshItemsForNoneOptionConfig();
  }

  // 'start' (default) prepends; 'end' appends. Any other value falls back to
  // 'start' so legacy configs without this key stay stable.
  @api
  get noneOptionPosition() {
    return this._noneOptionPosition;
  }
  set noneOptionPosition(v) {
    const next = v === "end" ? "end" : "start";
    if (this._noneOptionPosition === next) return;
    this._noneOptionPosition = next;
    this.refreshItemsForNoneOptionConfig();
  }

  @api
  get allowManualInput() {
    return this._allowManualInput;
  }
  set allowManualInput(v) {
    const next = v === true || v === "true" || v === "";
    if (this._allowManualInput === next) return;
    this._allowManualInput = next;
    this.refreshItemsForNoneOptionConfig();
  }

  @api
  get manualInputLabel() {
    return this._manualInputLabel;
  }
  set manualInputLabel(v) {
    const next = v === undefined || v === null ? "Other" : String(v);
    if (this._manualInputLabel === next) return;
    this._manualInputLabel = next;
    this.refreshItemsForNoneOptionConfig();
  }

  @api manualInputMinLength = 0;
  @api manualInputMaxLength;

  @api
  get enableSearch() {
    return this._enableSearch;
  }
  set enableSearch(v) {
    this._enableSearch = v === true || v === "true" || v === "";
  }

  @api
  get sourceType() {
    return this._sourceType;
  }
  set sourceType(v) {
    const next = v || SOURCE_CUSTOM;
    const changed = this._sourceType !== next;
    this._sourceType = next;
    if (this._connectedFlag && changed) this.loadData();
  }

  @api
  get picklistConfig() {
    return this._picklistConfig;
  }
  set picklistConfig(v) {
    this._picklistConfig = v;
    if (this._connectedFlag && this._sourceType === SOURCE_PICKLIST) {
      if (this._rawData != null) this.reapplyNormalization();
    }
  }

  @api
  get collectionConfig() {
    return this._collectionConfig;
  }
  set collectionConfig(v) {
    this._collectionConfig = v;
    if (this._connectedFlag && this._sourceType === SOURCE_COLLECTION) {
      this.loadCollection();
    }
  }

  @api
  get sobjectConfig() {
    return this._sobjectConfig;
  }
  set sobjectConfig(v) {
    const prev = this._sobjectConfig;
    this._sobjectConfig = v;
    // Guard against re-querying Apex on every parent render — the modal
    // preview rebuilds this config object on each getter call.
    if (JSON.stringify(prev) === JSON.stringify(v)) return;
    if (this._connectedFlag && this._sourceType === SOURCE_SOBJECT) {
      this.loadSObject();
    }
  }

  @api
  get customConfig() {
    return this._customConfig;
  }
  set customConfig(v) {
    this._customConfig = v;
    if (this._connectedFlag && this._sourceType === SOURCE_CUSTOM) {
      this.loadCustom();
    }
  }

  @api
  get stringCollectionConfig() {
    return this._stringCollectionConfig;
  }
  set stringCollectionConfig(v) {
    this._stringCollectionConfig = v;
    if (this._connectedFlag && this._sourceType === SOURCE_STRING_COLLECTION) {
      this.loadStringCollection();
    }
  }

  @api
  get displayConfig() {
    return this._displayConfig;
  }
  set displayConfig(v) {
    this._displayConfig = v;
    if (this._connectedFlag && this._rawData != null) {
      this.reapplyNormalization();
    }
  }

  // Grid layout knobs (passed through to molecule). Gaps / margin / padding
  // accept SLDS 2 spacing token values ('none', '1'-'12') or passthrough CSS
  // (e.g. '1rem'). The molecule converts via tokenToCss().
  @api gridMinWidth = "7.5rem";
  @api gapHorizontal = "2";
  @api gapVertical = "2";
  @api marginTop = "";
  @api marginRight = "";
  @api marginBottom = "";
  @api marginLeft = "";
  @api paddingTop;
  @api paddingRight;
  @api paddingBottom;
  @api paddingLeft;
  @api size = "small";
  // Picker-wide glyph size. 'large' (or unset) defers to atom's tile-size
  // default; explicit small/xx-small/etc. pins the glyph regardless.
  @api iconSize = "large";
  @api aspectRatio = "1:1";
  @api badgePosition = "bottom-inline";
  @api badgeVariant = "neutral";
  @api badgeShape = "pill";
  @api columns;
  @api selectionIndicator = "frame";
  @api elevation = "outlined";
  // Pattern / corner / surface / icon-decor with tone siblings.
  @api pattern = "none";
  @api patternTone = "neutral";
  @api patternHoverTone = "neutral";
  @api patternSelectedTone = "brand";
  @api patternDisabledTone = "neutral";
  @api cornerStyle = "none";
  @api cornerTone = "neutral";
  @api surfaceStyle = "solid";
  @api surfaceTone = "neutral";
  @api surfaceHoverTone = "neutral";
  @api surfaceSelectedTone = "brand";
  @api surfaceDisabledTone = "neutral";
  @api iconDecor = "square";
  @api iconStyle = "soft";
  @api iconShading = "flat";
  @api iconTone = "brand";
  @api iconGlyphTone;
  @api iconGlyphToneHex = "";
  @api iconToneHex = "";
  @api patternToneHex = "";
  @api patternHoverToneHex = "";
  @api patternSelectedToneHex = "";
  @api patternDisabledToneHex = "";
  @api cornerToneHex = "";
  @api surfaceToneHex = "";
  @api surfaceHoverToneHex = "";
  @api surfaceSelectedToneHex = "";
  @api surfaceDisabledToneHex = "";
  @api badgeVariantHex = "";
  // undefined → render (default ON); explicit `false` → hide globally.
  @api showIcons;
  @api showBadges;

  _overrides;
  _refreshKey;
  _refreshTimer;
  _connectedFlag = false;
  _rawData = null;

  @api
  get overrides() {
    return this._overrides;
  }
  set overrides(v) {
    this._overrides = v;
    if (this._connectedFlag && this._rawData != null) {
      this.reapplyNormalization();
    }
  }

  @api
  get refreshKey() {
    return this._refreshKey;
  }
  set refreshKey(v) {
    const changed = this._refreshKey !== v;
    this._refreshKey = v;
    if (!changed || !this._connectedFlag) return;
    clearTimeout(this._refreshTimer);
    this._refreshTimer = setTimeout(() => this.loadData(), 300);
  }

  _value = "";
  _values = [];

  @track _items = [];
  @track _isLoading = false;
  @track _errorMessage = "";

  @api
  get value() {
    return this._value;
  }
  set value(v) {
    this._value = v || "";
  }

  @api
  get values() {
    return this._values;
  }
  set values(v) {
    this._values = Array.isArray(v) ? [...v] : [];
  }

  // --- Picklist wires ---
  get objectApiName() {
    return this._picklistConfig?.objectApiName;
  }
  get fieldApiName() {
    return this._picklistConfig?.fieldApiName;
  }
  get recordTypeId() {
    return this._picklistConfig?.recordTypeId || "012000000000000AAA";
  }

  get picklistFieldRef() {
    if (
      this._sourceType !== SOURCE_PICKLIST ||
      !this.objectApiName ||
      !this.fieldApiName
    )
      return undefined;
    return `${this.objectApiName}.${this.fieldApiName}`;
  }

  @wire(getObjectInfo, { objectApiName: "$objectApiName" })
  wiredObjectInfo({ error }) {
    if (error) this.handleError(error);
  }

  @wire(getPicklistValues, {
    recordTypeId: "$recordTypeId",
    fieldApiName: "$picklistFieldRef"
  })
  wiredPicklistValues({ data, error }) {
    if (this._sourceType !== SOURCE_PICKLIST) return;
    if (error) {
      this.handleError(error);
      return;
    }
    if (data) {
      this._rawData = data;
      this.commitItems(
        this.enrichItems(
          normalizePicklist(data, this._picklistConfig?.valueSource)
        )
      );
      this._isLoading = false;
      this._errorMessage = "";
    }
  }

  // --- Lifecycle ---
  connectedCallback() {
    this._connectedFlag = true;
    this.loadData();
  }

  disconnectedCallback() {
    this._connectedFlag = false;
    clearTimeout(this._refreshTimer);
  }

  // --- Data fetch strategy ---
  async loadData() {
    const handlers = {
      [SOURCE_PICKLIST]: this.loadPicklist,
      [SOURCE_COLLECTION]: this.loadCollection,
      [SOURCE_SOBJECT]: this.loadSObject,
      [SOURCE_CUSTOM]: this.loadCustom,
      [SOURCE_STRING_COLLECTION]: this.loadStringCollection
    };
    const handler = handlers[this._sourceType];
    if (handler) {
      try {
        await handler.call(this);
      } catch (e) {
        this.handleError(e);
      }
    }
  }

  @api
  refresh() {
    return this.loadData();
  }

  loadPicklist() {
    // If the wire already delivered data, DON'T flip loading back to true.
    // The wire only re-fires when objectApiName/fieldApiName change; a
    // manual re-trigger (e.g. parent-value change, refreshKey bump) would
    // otherwise strand the UI in the skeleton state because the wire has
    // no reason to re-emit. Existing data is still correct.
    if (this._rawData != null) return;
    this._isLoading = true;
  }

  loadCollection() {
    const records = this._collectionConfig?.records || [];
    const fieldMap = this._collectionConfig?.fieldMap || {};
    this._rawData = { records, fieldMap };
    const normalized = normalizeCollection(records, fieldMap);
    const withRecords = normalized.map((item, idx) => ({
      ...item,
      record: records[idx]
    }));
    this.commitItems(this.enrichItems(withRecords));
    this._isLoading = false;
    this._errorMessage = "";
  }

  async loadSObject() {
    this._isLoading = true;
    this._errorMessage = "";
    try {
      const configJson = JSON.stringify(this._sobjectConfig || {});
      const dtos = await queryItems({ configJson });
      this._rawData = dtos;
      const normalized = normalizeSObjectDTO(dtos);
      const withRecords = normalized.map((item, idx) => ({
        ...item,
        record: dtos[idx]?.record || dtos[idx]
      }));
      this.commitItems(this.enrichItems(withRecords));
    } finally {
      this._isLoading = false;
    }
  }

  loadCustom() {
    const items = this._customConfig?.items || [];
    this._rawData = items;
    this.commitItems(this.enrichItems(normalizeCustom(items)));
    this._isLoading = false;
    this._errorMessage = "";
  }

  loadStringCollection() {
    const strings = this._stringCollectionConfig?.values || [];
    this._rawData = strings;
    this.commitItems(this.enrichItems(normalizeStringCollection(strings)));
    this._isLoading = false;
    this._errorMessage = "";
  }

  enrichItems(items) {
    const overridden = applyOverrides(items, this._overrides);
    const displayed = applyDisplay(overridden, this._displayConfig);
    // "None" option. Empty value means "no pick", which Flow treats as null
    // on output. Inserted after sort+limit so its position is deterministic
    // regardless of display rules.
    let next = displayed;
    if (this.includeNoneOption) {
      const none = {
        id: "__none__",
        label: this.noneOptionLabel || "--None--",
        sublabel: "",
        icon: "",
        badge: "",
        helpText: "",
        value: "",
        disabled: false
      };
      next =
        this.noneOptionPosition === "end" ? [...next, none] : [none, ...next];
    }
    if (this.allowManualInput) {
      next = [
        ...next,
        {
          id: MANUAL_INPUT_VALUE,
          label: this.manualInputLabel || "Other",
          sublabel: "Enter a custom value",
          icon: "square-pen",
          badge: "",
          helpText: "",
          value: MANUAL_INPUT_VALUE,
          disabled: false,
          manualInput: true
        }
      ];
    }
    return next;
  }

  // Central setter — emits an `itemschange` event with `allValues` and
  // `allLabels` so the flow wrapper can surface them as Flow outputs.
  commitItems(items) {
    const list = Array.isArray(items) ? items : [];
    this._items = list;
    this.dispatchEvent(
      new CustomEvent("itemschange", {
        detail: {
          values: list.map((i) => String(i.value ?? "")),
          labels: list.map((i) => String(i.label ?? ""))
        },
        bubbles: true,
        composed: false
      })
    );
  }

  reapplyNormalization() {
    if (!this._rawData) return;
    if (this._sourceType === SOURCE_PICKLIST) {
      this.commitItems(
        this.enrichItems(
          normalizePicklist(this._rawData, this._picklistConfig?.valueSource)
        )
      );
    } else if (this._sourceType === SOURCE_COLLECTION) {
      const records = this._collectionConfig?.records || [];
      const fieldMap = this._collectionConfig?.fieldMap || {};
      const normalized = normalizeCollection(records, fieldMap);
      const withRecords = normalized.map((item, idx) => ({
        ...item,
        record: records[idx]
      }));
      this.commitItems(this.enrichItems(withRecords));
    } else if (this._sourceType === SOURCE_SOBJECT) {
      const dtos = this._rawData || [];
      const normalized = normalizeSObjectDTO(dtos);
      const withRecords = normalized.map((item, idx) => ({
        ...item,
        record: dtos[idx]?.record || dtos[idx]
      }));
      this.commitItems(this.enrichItems(withRecords));
    } else if (this._sourceType === SOURCE_CUSTOM) {
      this.commitItems(this.enrichItems(normalizeCustom(this._rawData)));
    } else if (this._sourceType === SOURCE_STRING_COLLECTION) {
      this.commitItems(
        this.enrichItems(normalizeStringCollection(this._rawData))
      );
    }
  }

  refreshItemsForNoneOptionConfig() {
    if (this._connectedFlag && this._rawData != null) {
      this.reapplyNormalization();
    }
  }

  handleError(error) {
    const msg =
      error?.body?.message || error?.message || this.errorStateMessage;
    this._errorMessage = msg;
    this._isLoading = false;
  }

  handleRetry() {
    this.loadData();
  }

  // --- Selection ---
  handleSelectionChange(event) {
    const { values, items, manualValue } = event.detail;
    const selectedValues = Array.isArray(values) ? values : [];
    const selectedItems = Array.isArray(items) ? items : [];
    const noneWasPicked = selectedValues.includes("");
    const manualWasPicked = selectedValues.includes(MANUAL_INPUT_VALUE);
    this._manualInputSelected = !noneWasPicked && manualWasPicked;
    if (manualValue !== undefined && manualValue !== null) {
      this._manualInputValue = String(manualValue);
    }
    if (noneWasPicked) {
      this._manualInputValue = "";
    }
    const normalValues = selectedValues.filter(
      (value) => value !== "" && value !== MANUAL_INPUT_VALUE
    );
    const effectiveValues =
      !noneWasPicked && manualWasPicked && this._manualInputValue
        ? [...normalValues, this._manualInputValue]
        : normalValues;
    const effectiveItems = noneWasPicked
      ? []
      : selectedItems.filter((item) => item?.value !== MANUAL_INPUT_VALUE);
    const labels = effectiveItems.map((i) => String(i?.label ?? ""));
    const manualLabel = this._manualInputValue || this.manualInputLabel;
    if (this.selectionMode === "single") {
      this._value = manualWasPicked
        ? this._manualInputValue || ""
        : effectiveValues[0] || "";
      this._values = [];
    } else {
      this._values = effectiveValues;
      this._value = "";
    }
    this.dispatchEvent(
      new CustomEvent("valuechange", {
        detail: {
          value: this._value,
          values: this._values,
          label: noneWasPicked
            ? ""
            : manualWasPicked
              ? manualLabel
              : labels[0] || "",
          labels: noneWasPicked
            ? []
            : manualWasPicked && this.selectionMode === "multi"
              ? [...labels, manualLabel]
              : labels,
          record: manualWasPicked ? null : effectiveItems[0] || null,
          records: effectiveItems
        },
        bubbles: true,
        composed: false
      })
    );
  }

  get selectedValuesForMolecule() {
    if (this.previewMode && !this._value && this._values.length === 0) {
      const previewValues = (this._items || [])
        .filter(
          (item) =>
            !item.disabled &&
            item.value !== "" &&
            item.value !== MANUAL_INPUT_VALUE
        )
        .map((item) => item.value);
      if (this.selectionMode === "single") {
        return previewValues.length ? [previewValues[0]] : [];
      }
      const max = Number(this.maxSelections);
      const cap = Number.isFinite(max) && max > 0 ? max : 2;
      return previewValues.slice(0, cap);
    }
    if (this.selectionMode === "single") {
      if (this.hasActiveManualSelection) {
        return [MANUAL_INPUT_VALUE];
      }
      return this._value ? [this._value] : [];
    }
    const values = this._values.filter((value) => !this.isManualValue(value));
    return this.hasActiveManualSelection ||
      this._values.some((value) => this.isManualValue(value))
      ? [...values, MANUAL_INPUT_VALUE]
      : values;
  }

  get manualValueForMolecule() {
    if (this._manualInputValue) return this._manualInputValue;
    if (this.selectionMode === "single" && this.isManualValue(this._value)) {
      return this._value;
    }
    const manual = this._values.find((value) => this.isManualValue(value));
    return manual || "";
  }

  get hasActiveManualSelection() {
    if (!this._allowManualInput) return false;
    return (
      this._manualInputSelected ||
      this.isManualValue(this._value) ||
      this._values.some((value) => this.isManualValue(value))
    );
  }

  isManualValue(value) {
    if (!this._allowManualInput || !value) return false;
    return !this.renderedValueSet.has(String(value));
  }

  get renderedValueSet() {
    return new Set((this._items || []).map((item) => String(item.value ?? "")));
  }

  // --- State flags ---
  get isLoading() {
    if (this.forcedState) return false;
    return this._isLoading && !this.previewMode;
  }
  get hasError() {
    if (this.forcedState === "error") return true;
    return Boolean(this._errorMessage) && !this.previewMode;
  }
  get isEmpty() {
    if (this.forcedState === "empty") return true;
    if (this.forcedState === "error") return false;
    return (
      !this.isLoading &&
      !this.hasError &&
      (this._items?.length || 0) === 0 &&
      !this.previewMode
    );
  }
  get isPopulated() {
    if (this.forcedState) return false;
    return !this.isLoading && !this.hasError && (this._items?.length || 0) > 0;
  }
  // When forced into error state (or no real error yet), fall back to the
  // user-configured errorStateMessage so the preview renders something.
  get resolvedErrorMessage() {
    return this._errorMessage || this.errorStateMessage;
  }

  get hasLabel() {
    return Boolean(this.label);
  }
  get hasHelp() {
    return Boolean(this.helpText);
  }
  get hasFieldHelp() {
    return Boolean(this.fieldLevelHelp);
  }

  // --- Flow validation ---
  @api
  validate() {
    if (this.previewMode) return { isValid: true };
    if (this.required) {
      if (this.selectionMode === "single" && !this._value) {
        return { isValid: false, errorMessage: "Please make a selection." };
      }
      if (this.selectionMode === "multi" && this._values.length === 0) {
        return { isValid: false, errorMessage: "Please make a selection." };
      }
    }
    const manualValidation = this.validateManualInput();
    if (!manualValidation.isValid) return manualValidation;
    if (this.selectionMode === "multi") {
      const min = Number(this.minSelections) || 0;
      if (this._values.length < min) {
        return {
          isValid: false,
          errorMessage: `Please select at least ${min} option(s).`
        };
      }
      if (
        this.maxSelections !== undefined &&
        this.maxSelections !== null &&
        this.maxSelections !== ""
      ) {
        const max = Number(this.maxSelections);
        if (this._values.length > max) {
          return {
            isValid: false,
            errorMessage: `Please select no more than ${max} option(s).`
          };
        }
      }
    }
    return { isValid: true };
  }

  validateManualInput() {
    if (!this.hasActiveManualSelection && !this.isManualValue(this._value)) {
      return { isValid: true };
    }
    const value = (this.manualValueForMolecule || "").trim();
    if (!value) {
      return {
        isValid: false,
        errorMessage: "Enter a value for the manual option."
      };
    }
    const min = Number(this.manualInputMinLength || 0);
    if (Number.isFinite(min) && min > 0 && value.length < min) {
      return {
        isValid: false,
        errorMessage: `Enter at least ${min} character(s).`
      };
    }
    if (
      this.manualInputMaxLength !== undefined &&
      this.manualInputMaxLength !== null &&
      this.manualInputMaxLength !== ""
    ) {
      const max = Number(this.manualInputMaxLength);
      if (Number.isFinite(max) && max > 0 && value.length > max) {
        return {
          isValid: false,
          errorMessage: `Enter no more than ${max} character(s).`
        };
      }
    }
    return { isValid: true };
  }
}
