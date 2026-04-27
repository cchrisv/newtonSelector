import { api, LightningElement } from "lwc";
import { defaultSelectorConfig } from "c/newtonSelectorUtilityConfigDefaults";

export default class NewtonSelectorFlowCpeContentConfig extends LightningElement {
  @api config;
  @api builderContext;
  @api automaticOutputVariables;

  get _config() {
    return this.config || defaultSelectorConfig();
  }
  get isDetailsSection() {
    return true;
  }

  handleLabelChange(event) {
    this.patch("label", this.readValue(event));
  }
  handleHelpTextChange(event) {
    this.patch("helpText", this.readValue(event));
  }
  handleFieldLevelHelpChange(event) {
    this.patch("fieldLevelHelp", this.readValue(event));
  }
  handleEmptyStateChange(event) {
    this.patch("emptyStateMessage", this.readValue(event));
  }
  handleErrorStateChange(event) {
    this.patch("errorStateMessage", this.readValue(event));
  }

  patch(key, value) {
    this.dispatchEvent(
      new CustomEvent("configpatch", { detail: { path: [key], value } })
    );
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
