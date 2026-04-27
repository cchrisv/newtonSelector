import { LightningElement, api } from "lwc";
import { buildTokens } from "c/newtonSelectorFlowCpeUtilitySearchHighlight";

export default class NewtonSelectorFlowCpeLookupChoiceOption extends LightningElement {
  /** @type {Record<string, unknown>} */
  @api row = {};

  /** @type {string} */
  @api searchTerm = "";

  /** @type {boolean} */
  @api selected = false;

  /** @type {boolean} */
  @api showChevron = false;

  get optionClass() {
    const base = "newton-visual-lookup-option";
    return this.selected
      ? `${base} newton-visual-lookup-option_selected`
      : base;
  }

  get normalizedRow() {
    return this.row && typeof this.row === "object" ? this.row : {};
  }

  get title() {
    const r = this.normalizedRow;
    const value = r.title || r.label || r.value || "";
    return String(value);
  }

  get subtitle() {
    const r = this.normalizedRow;
    const value = r.subtitle || r.displayType || "";
    return String(value);
  }

  get iconName() {
    const r = this.normalizedRow;
    const value = r.icon || r.optionIcon || "";
    return String(value);
  }

  get badge() {
    const r = this.normalizedRow;
    const value = r.badge || r.sObjectType || "";
    return String(value);
  }

  get groupName() {
    return `newtonVisualLookup-${this.normalizedRow.groupName || "options"}`;
  }

  get visualItem() {
    const value = String(
      this.normalizedRow.value || this.normalizedRow.id || ""
    );
    return {
      id: String(this.normalizedRow.id || value || this.title),
      value,
      label: this.title,
      sublabel: this.subtitle,
      icon: this.iconName,
      badge: this.badge,
      disabled: Boolean(this.normalizedRow.disabled)
    };
  }

  get titleTokens() {
    return buildTokens(this.title, String(this.searchTerm || "").toLowerCase());
  }
}
