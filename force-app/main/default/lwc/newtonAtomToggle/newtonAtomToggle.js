import { LightningElement, api } from "lwc";

/*
 * Adapted from UnofficialSF FlowScreenComponentsBasePack fsc_flowCheckbox
 * (https://github.com/UnofficialSF/LightningFlowComponents), licensed under
 * the Apache License 2.0. See repo LICENSE and NOTICE for attribution.
 */

const CB_TRUE = "CB_TRUE";
const CB_FALSE = "CB_FALSE";

const WIRE_BOOLEAN = "boolean";
const WIRE_CB_SENTINEL = "cb-sentinel";

/**
 * Reusable two-state setting atom.
 *
 * Default emits a plain `{ name, checked }` detail on a `toggle` event. Set
 * `wireFormat="cb-sentinel"` to emit the legacy Flow Builder CPE protocol shape
 * (`{ id, newValue, newValueDataType, newStringValue }` with CB_TRUE/CB_FALSE
 * sentinels) instead.
 *
 * @slot none — renders only the setting selector.
 * @fires toggle — detail shape depends on `wireFormat`.
 */
export default class NewtonAtomToggle extends LightningElement {
  /** @type {string} Display label for the toggle. */
  @api label;
  /** @type {string} Identifier surfaced on the event detail. */
  @api name;
  /** @type {boolean|string} Current value — accepts true / 'true' / 'CB_TRUE' as truthy. */
  @api checked;
  /** @type {string} Help text rendered as the native lightning-input tooltip. */
  @api fieldLevelHelp;
  /** @type {boolean} Disables the toggle. */
  @api disabled;
  /** @type {string} Passed through to lightning-input (e.g. 'label-hidden'). */
  @api variant;
  /** @type {string} Text shown next to the switch when on. Empty by default. */
  @api messageToggleActive = "";
  /** @type {string} Text shown next to the switch when off. Empty by default. */
  @api messageToggleInactive = "";
  /** @type {string} Short label for the active option. */
  @api activeLabel = "";
  /** @type {string} Short label for the inactive option. */
  @api inactiveLabel = "";
  /** @type {'boolean'|'cb-sentinel'} Event detail shape. Default 'boolean'. */
  @api wireFormat = WIRE_BOOLEAN;

  /**
   * Computed truthy state — supports boolean, string 'true', and legacy CB_TRUE sentinel.
   * @returns {boolean}
   */
  @api
  get isChecked() {
    return (
      this.checked === true ||
      this.checked === "true" ||
      this.checked === CB_TRUE
    );
  }

  get rootClass() {
    const classes = ["newton-toggle"];
    if (this.variant === "label-hidden") {
      classes.push("newton-toggle_label-hidden");
    }
    if (this.disabled) {
      classes.push("newton-toggle_disabled");
    }
    return classes.join(" ");
  }

  get hasVisibleLabel() {
    return Boolean(this.label) && this.variant !== "label-hidden";
  }

  get computedAriaLabel() {
    return this.label || this.name || "Toggle setting";
  }

  get activeText() {
    return this.activeLabel || this.messageToggleActive || "On";
  }

  get inactiveText() {
    return this.inactiveLabel || this.messageToggleInactive || "Off";
  }

  get activeOptionClass() {
    return this.optionClass(true);
  }

  get inactiveOptionClass() {
    return this.optionClass(false);
  }

  get activeAriaChecked() {
    return this.isChecked ? "true" : "false";
  }

  get inactiveAriaChecked() {
    return this.isChecked ? "false" : "true";
  }

  optionClass(optionValue) {
    const classes = [
      "newton-toggle__option",
      optionValue ? "newton-toggle__option_on" : "newton-toggle__option_off"
    ];
    if (this.isChecked === optionValue) {
      classes.push("newton-toggle__option_active");
    }
    return classes.join(" ");
  }

  handleChoiceClick(event) {
    const isOn = event.currentTarget.dataset.checked === "true";
    if (this.disabled || isOn === this.isChecked) {
      return;
    }
    this.dispatchToggle(this.name, isOn);
  }

  handleToggle(event) {
    this.dispatchToggle(event.target.name, event.target.checked);
  }

  dispatchToggle(name, isOn) {
    const detail =
      this.wireFormat === WIRE_CB_SENTINEL
        ? {
            id: name,
            newValue: isOn,
            newValueDataType: "Boolean",
            newStringValue: isOn ? CB_TRUE : CB_FALSE
          }
        : { name, checked: isOn };
    this.dispatchEvent(new CustomEvent("toggle", { detail }));
  }
}
