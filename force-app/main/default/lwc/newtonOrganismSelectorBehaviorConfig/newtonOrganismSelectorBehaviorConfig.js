import { api, LightningElement } from "lwc";
import { defaultSelectorConfig } from "c/newtonUtilitySelectorConfigDefaults";

export default class NewtonOrganismSelectorBehaviorConfig extends LightningElement {
  @api config;
  @api builderContext;
  @api automaticOutputVariables;

  get _config() {
    return this.config || defaultSelectorConfig();
  }
  set _config(value) {
    this.dispatchEvent(
      new CustomEvent("configpatch", { detail: { path: [], value } })
    );
  }

  get hasDataSource() {
    return Boolean(this._config.dataSource);
  }
  get isSingleSelect() {
    return this._config.selectionMode === "single";
  }
  get isMultiSelect() {
    return this._config.selectionMode === "multi";
  }
  handleSelectionModeToggle(event) {
    const checked = event.detail?.checked ?? event.target?.checked ?? false;
    const value = checked ? "multi" : "single";
    const next = { ...this._config, selectionMode: value };
    if (value === "multi") {
      next.autoAdvance = false;
    }
    this._config = next;
  }
  handleToggleChange(event) {
    const key = event.currentTarget.dataset.key;
    if (!key) return;
    const checked = event.detail?.checked ?? event.target?.checked ?? false;
    this._config = { ...this._config, [key]: Boolean(checked) };
  }
  handleMinChange(event) {
    this._config = {
      ...this._config,
      minSelections: Number(event.target.value) || 0
    };
  }
  handleMaxChange(event) {
    const raw = event.target.value;
    this._config = {
      ...this._config,
      maxSelections: raw === "" ? null : Number(raw)
    };
  }
  handleErrorMessageChange(event) {
    this._config = {
      ...this._config,
      customErrorMessage: this.readValue(event)
    };
  }

  get isNoneOptionAvailable() {
    return true;
  }
  get noneOptionValue() {
    return Boolean(this._config.includeNoneOption);
  }
  get noneOptionLabelValue() {
    return this._config.noneOptionLabel ?? "--None--";
  }
  get noneOptionPositionValue() {
    return this._config.noneOptionPosition === "end" ? "end" : "start";
  }
  get isNoneOptionLabelDisabled() {
    return !this.noneOptionValue;
  }
  get manualInputConfig() {
    return this._config.manualInput || {};
  }
  get manualInputValue() {
    return Boolean(this.manualInputConfig.enabled);
  }
  get manualInputLabelValue() {
    return this.manualInputConfig.label ?? "Other";
  }
  get manualInputMinLengthValue() {
    return this.manualInputConfig.minLength ?? 0;
  }
  get manualInputMaxLengthValue() {
    return this.manualInputConfig.maxLength ?? null;
  }
  get isManualInputDisabled() {
    return !this.manualInputValue;
  }
  get noneOptionPositionTiles() {
    const active = this.noneOptionPositionValue;
    const disabled = this.isNoneOptionLabelDisabled;
    return [
      {
        value: "start",
        label: "At start",
        sublabel: "Before items",
        icon: "shrink",
        _selected: active === "start",
        _disabled: disabled
      },
      {
        value: "end",
        label: "At end",
        sublabel: "After items",
        icon: "expand",
        _selected: active === "end",
        _disabled: disabled
      }
    ];
  }
  handleNoneOptionLabelChange(event) {
    this._config = { ...this._config, noneOptionLabel: this.readValue(event) };
  }
  handleNoneOptionPositionChange(event) {
    const value = event.detail?.value;
    if (value === "start" || value === "end")
      this._config = { ...this._config, noneOptionPosition: value };
  }
  handleManualInputToggle(event) {
    const checked = event.detail?.checked ?? event.target?.checked ?? false;
    this._config = {
      ...this._config,
      manualInput: {
        ...this.manualInputConfig,
        enabled: Boolean(checked)
      }
    };
  }
  handleManualInputLabelChange(event) {
    this.patchManualInput("label", this.readValue(event));
  }
  handleManualInputMinLengthChange(event) {
    this.patchManualInput("minLength", Number(event.target.value) || 0);
  }
  handleManualInputMaxLengthChange(event) {
    const raw = event.target.value;
    this.patchManualInput("maxLength", raw === "" ? null : Number(raw));
  }
  patchManualInput(key, value) {
    this._config = {
      ...this._config,
      manualInput: {
        ...this.manualInputConfig,
        [key]: value
      }
    };
  }

  readValue(event) {
    const fromDetail = event?.detail?.newValue;
    if (fromDetail !== undefined && fromDetail !== null)
      return String(fromDetail);
    const fromTarget = event?.target?.value;
    return fromTarget === undefined || fromTarget === null
      ? ""
      : String(fromTarget);
  }
}
