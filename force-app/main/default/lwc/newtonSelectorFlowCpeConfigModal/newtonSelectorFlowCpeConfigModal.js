import { api, track } from "lwc";
import LightningModal from "lightning/modal";
import {
  mergeSelectorConfig,
  recordCollectionSamples,
  setConfigPath,
  stringCollectionSamples
} from "c/newtonSelectorFlowCpeUtilityConfigState";
import {
  activeSectionIssueList,
  sectionIssues as buildSectionIssues,
  sectionStatus as buildSectionStatus,
  totalIssueCount
} from "c/newtonSelectorFlowCpeUtilityConfigValidation";
import { SECTIONS } from "c/newtonSelectorFlowCpeUtilityConfigOptions";

export default class NewtonSelectorFlowCpeConfigModal extends LightningModal {
  @api initialConfig;
  @api initialSourceRecordsRef;
  @api initialSourceStringsRef;
  @api builderContext;
  @api automaticOutputVariables;

  @track _config;
  @track _sourceRecordsRef = "";
  @track _sourceStringsRef = "";
  @track _activeSection = "data";
  @track _forcedPreviewState = "";
  @track _leftWidth = 320;

  connectedCallback() {
    this._config = mergeSelectorConfig(this.initialConfig);
    this._sourceRecordsRef = this.initialSourceRecordsRef || "";
    this._sourceStringsRef = this.initialSourceStringsRef || "";
  }

  handleConfigPatch(event) {
    const path = event.detail?.path;
    const value = event.detail?.value;
    this._config =
      Array.isArray(path) && path.length === 0
        ? value
        : setConfigPath(this._config, path, value);
  }

  handleRefChange(event) {
    const { name, value } = event.detail || {};
    if (name === "sourceRecordsRef") this._sourceRecordsRef = value || "";
    if (name === "sourceStringsRef") this._sourceStringsRef = value || "";
  }

  get sectionRefs() {
    return {
      sourceRecordsRef: this._sourceRecordsRef,
      sourceStringsRef: this._sourceStringsRef
    };
  }

  get sections() {
    return SECTIONS.map((section) => {
      const status = this.sectionStatus(section.key);
      const active = section.key === this._activeSection;
      const showStatus = status === "warn" || status === "error";
      return {
        ...section,
        active,
        showStatus,
        statusClass: `newton-studio__nav-status newton-studio__nav-status_${status}`,
        buttonClass: active
          ? "newton-studio__nav-btn newton-studio__nav-btn_active"
          : "newton-studio__nav-btn",
        ariaCurrent: active ? "page" : null
      };
    });
  }

  sectionStatus(key) {
    return buildSectionStatus(key, this._config, this.sectionRefs);
  }

  sectionIssues(key) {
    return buildSectionIssues(key, this._config, this.sectionRefs);
  }

  get totalErrorCount() {
    return totalIssueCount(this._config, this.sectionRefs, "errors");
  }

  get hasBlockingErrors() {
    return this.totalErrorCount > 0;
  }

  get saveDisabled() {
    return this.hasBlockingErrors;
  }

  get saveDisabledTitle() {
    return this.hasBlockingErrors
      ? `Fix ${this.totalErrorCount} error(s) before saving.`
      : "";
  }

  get activeSectionIssues() {
    return activeSectionIssueList(
      this._activeSection,
      this._config,
      this.sectionRefs
    );
  }

  get hasActiveSectionIssues() {
    return this.activeSectionIssues.length > 0;
  }

  get stringCollectionSampleStrings() {
    return stringCollectionSamples(
      this._config,
      this.builderContext,
      this._sourceStringsRef
    );
  }

  get recordCollectionSampleRecords() {
    return recordCollectionSamples(
      this._config,
      this.builderContext,
      this._sourceRecordsRef
    );
  }

  handleSectionClick(event) {
    const key =
      typeof event.detail === "string"
        ? event.detail
        : (event.detail?.key ?? event.currentTarget?.dataset?.key);
    if (key) this._activeSection = key;
  }

  handleActiveChapterChange(event) {
    const key =
      typeof event.detail === "string" ? event.detail : event.detail?.key;
    if (key && key !== this._activeSection) this._activeSection = key;
  }

  handleLeftWidthChange(event) {
    const value = Number(
      typeof event.detail === "number" ? event.detail : event.detail?.value
    );
    if (Number.isFinite(value)) this._leftWidth = value;
  }

  handlePreviewStateChange(event) {
    const next =
      typeof event.detail === "string" ? event.detail : event.detail?.state;
    this._forcedPreviewState = this._forcedPreviewState === next ? "" : next;
  }

  get previewForcedState() {
    return this._forcedPreviewState;
  }

  handleSave() {
    if (this.hasBlockingErrors) return;
    this.close({
      action: "save",
      config: this._config,
      sourceRecordsRef: this._sourceRecordsRef,
      sourceStringsRef: this._sourceStringsRef
    });
  }

  handleCancel() {
    this.close({ action: "cancel" });
  }
}
