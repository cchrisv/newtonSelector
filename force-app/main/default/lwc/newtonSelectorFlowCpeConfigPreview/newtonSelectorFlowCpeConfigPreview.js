import { api, LightningElement } from "lwc";
import { SAMPLE_ITEMS } from "c/newtonSelectorUtilityDataSources";
import { resolvedLayoutGridConfig } from "c/newtonSelectorUtilityConfigDefaults";
import { buildSobjectConfigForQuery } from "c/newtonSelectorFlowCpeUtilityConfigState";

export default class NewtonSelectorFlowCpeConfigPreview extends LightningElement {
  @api config;
  @api forcedState = "";
  @api recordCollectionSampleRecords = [];

  handlePreviewStateChange(event) {
    this.dispatchEvent(
      new CustomEvent("previewstatechange", {
        detail: event.currentTarget?.dataset?.state || ""
      })
    );
  }

  get c() {
    return this.config || {};
  }
  get gridConfig() {
    return this.c.gridConfig || {};
  }
  get gridDefaults() {
    return resolvedLayoutGridConfig(this.c.layout || "grid");
  }
  get badgeConfig() {
    return this.gridConfig.badge || {};
  }
  get hasDataSource() {
    return Boolean(this.c.dataSource);
  }
  get isPicklistMode() {
    return this.c.dataSource === "picklist";
  }
  get isSObjectMode() {
    return this.c.dataSource === "sobject";
  }
  get isCustomMode() {
    return this.c.dataSource === "custom";
  }
  get isCollectionMode() {
    return this.c.dataSource === "collection";
  }

  get previewStateButtons() {
    const active = this.forcedState;
    const base = "newton-studio__state-btn";
    const makeButton = (state, label, icon) => ({
      state,
      label,
      icon,
      className: state === active ? `${base} ${base}_active` : base,
      ariaPressed: String(state === active)
    });
    return [
      makeButton("", "Populated", "circle-check"),
      makeButton("empty", "Empty", "funnel"),
      makeButton("error", "Error", "circle-alert")
    ];
  }

  get hasPreviewableSource() {
    if (this.isPicklistMode || this.isSObjectMode || this.isCustomMode)
      return true;
    if (this.isCollectionMode && this.recordCollectionSampleRecords.length > 0)
      return true;
    return false;
  }
  get showLivePreview() {
    return this.hasPreviewableSource;
  }
  get showFallbackPreview() {
    return !this.hasPreviewableSource && this.hasDataSource;
  }
  get previewEmpty() {
    return !this.hasDataSource;
  }
  get fallbackPreviewItems() {
    return SAMPLE_ITEMS.slice(0, 4);
  }
  get fallbackCustomConfig() {
    return { items: this.fallbackPreviewItems };
  }

  get previewCaption() {
    if (!this.hasDataSource)
      return "Pick a data source to see your selector come to life.";
    if (this.c.dataSource === "collection")
      return "Collection data resolves at runtime — showing sample rows.";
    if (this.isPicklistMode && !this.c.picklist?.fieldApiName) {
      return "Choose a picklist field to load real values.";
    }
    if (this.isSObjectMode && !this.c.sobject?.sObjectApiName) {
      return "Choose an SObject to preview real rows.";
    }
    if (this.isCustomMode && (this.c.custom?.items?.length || 0) === 0) {
      return "Add custom items in the Items section to see them here.";
    }
    return "";
  }

  get previewLayoutLabel() {
    const labels = {
      grid: "Grid",
      list: "List",
      horizontal: "Horizontal",
      picklist: "Picklist",
      dropdown: "Picklist",
      radio: "Radio",
      columns: "Columns",
      dualListbox: "Multi-select"
    };
    return labels[this.c.layout] || "Grid";
  }
  get previewSelectionLabel() {
    return this.c.selectionMode === "multi" ? "Multi" : "Single";
  }
  get dataSelectorPicklistConfig() {
    return this.c.picklist || {};
  }
  get dataSelectorCustomConfig() {
    return this.c.custom || { items: [] };
  }
  get dataSelectorCollectionConfig() {
    return {
      records: this.recordCollectionSampleRecords,
      fieldMap: this.c.collection?.fieldMap || {}
    };
  }
  get dataSelectorSobjectConfig() {
    return buildSobjectConfigForQuery(this.c);
  }
  get dataSelectorOverrides() {
    return this.c.overrides || {};
  }
  get dataSelectorDisplayConfig() {
    return (
      this.c.display || { sortBy: "none", sortDirection: "asc", limit: null }
    );
  }

  get noneOptionValue() {
    return this.c.includeNoneOption === true;
  }
  get noneOptionLabelValue() {
    return this.c.noneOptionLabel || "--None--";
  }
  get noneOptionPositionValue() {
    return this.c.noneOptionPosition || "start";
  }
  get manualInputConfig() {
    return this.c.manualInput || {};
  }
  get manualInputValue() {
    return Boolean(this.manualInputConfig.enabled);
  }
  get manualInputLabelValue() {
    return this.manualInputConfig.label || "Other";
  }
  get manualInputMinLengthValue() {
    return this.manualInputConfig.minLength || 0;
  }
  get manualInputMaxLengthValue() {
    const max = this.manualInputConfig.maxLength;
    return max === null || max === undefined || max === "" ? undefined : max;
  }
  get dataSelectorGridMinWidth() {
    return this.gridConfig.minWidth || this.gridDefaults.minWidth;
  }
  get dataSelectorGapHorizontal() {
    return this.gridConfig.gapH || this.gridDefaults.gapH;
  }
  get dataSelectorGapVertical() {
    return this.gridConfig.gapV || this.gridDefaults.gapV;
  }
  get dataSelectorSize() {
    return this.gridConfig.size || this.gridDefaults.size;
  }
  get dataSelectorAspectRatio() {
    return this.gridConfig.aspectRatio || this.gridDefaults.aspectRatio;
  }
  get dataSelectorBadgePosition() {
    return this.badgeConfig.position || "bottom-inline";
  }
  get dataSelectorBadgeVariant() {
    return this.badgeConfig.variant || "neutral";
  }
  get dataSelectorBadgeShape() {
    return this.badgeConfig.shape || "pill";
  }
  get dataSelectorColumns() {
    const n = Number(this.gridConfig.columns);
    return Number.isFinite(n) && n >= 1 && n <= 6 ? n : undefined;
  }
  get dataSelectorSelectionIndicator() {
    return (
      this.gridConfig.selectionIndicator || this.gridDefaults.selectionIndicator
    );
  }
  get dataSelectorElevation() {
    return this.gridConfig.elevation || "outlined";
  }
  get dataSelectorPattern() {
    return this.gridConfig.pattern || "none";
  }
  get dataSelectorPatternTone() {
    return this.gridConfig.patternTone || "neutral";
  }
  get dataSelectorPatternHoverTone() {
    return this.gridConfig.patternHoverTone || this.dataSelectorPatternTone;
  }
  get dataSelectorPatternSelectedTone() {
    return this.gridConfig.patternSelectedTone || "brand";
  }
  get dataSelectorPatternDisabledTone() {
    return this.gridConfig.patternDisabledTone || "neutral";
  }
  get dataSelectorCornerStyle() {
    return this.gridConfig.cornerStyle || "none";
  }
  get dataSelectorCornerTone() {
    return this.gridConfig.cornerTone || "neutral";
  }
  get dataSelectorSurfaceStyle() {
    return this.gridConfig.surfaceStyle || "solid";
  }
  get dataSelectorSurfaceTone() {
    return this.gridConfig.surfaceTone || "neutral";
  }
  get dataSelectorSurfaceHoverTone() {
    return this.gridConfig.surfaceHoverTone || this.dataSelectorSurfaceTone;
  }
  get dataSelectorSurfaceSelectedTone() {
    return this.gridConfig.surfaceSelectedTone || "brand";
  }
  get dataSelectorSurfaceDisabledTone() {
    return this.gridConfig.surfaceDisabledTone || "neutral";
  }
  get dataSelectorIconDecor() {
    return this.gridConfig.iconDecor || this.gridDefaults.iconDecor;
  }
  get dataSelectorIconStyle() {
    return this.gridConfig.iconStyle || this.gridDefaults.iconStyle;
  }
  get dataSelectorIconShading() {
    return this.gridConfig.iconShading || "flat";
  }
  get dataSelectorIconTone() {
    return this.gridConfig.iconTone || this.gridDefaults.iconTone;
  }
  get dataSelectorIconGlyphTone() {
    return this.gridConfig.iconGlyphTone || "auto";
  }
  get dataSelectorIconGlyphToneHex() {
    return this.gridConfig.iconGlyphToneHex || "";
  }
  get dataSelectorIconSize() {
    const raw = this.gridConfig.iconSize;
    return raw && raw !== "auto" ? raw : "large";
  }
  get dataSelectorIconToneHex() {
    return this.gridConfig.iconToneHex || "";
  }
  get dataSelectorPatternToneHex() {
    return this.gridConfig.patternToneHex || "";
  }
  get dataSelectorPatternHoverToneHex() {
    return this.gridConfig.patternHoverToneHex || "";
  }
  get dataSelectorPatternSelectedToneHex() {
    return this.gridConfig.patternSelectedToneHex || "";
  }
  get dataSelectorPatternDisabledToneHex() {
    return this.gridConfig.patternDisabledToneHex || "";
  }
  get dataSelectorCornerToneHex() {
    return this.gridConfig.cornerToneHex || "";
  }
  get dataSelectorSurfaceToneHex() {
    return this.gridConfig.surfaceToneHex || "";
  }
  get dataSelectorSurfaceHoverToneHex() {
    return this.gridConfig.surfaceHoverToneHex || "";
  }
  get dataSelectorSurfaceSelectedToneHex() {
    return this.gridConfig.surfaceSelectedToneHex || "";
  }
  get dataSelectorSurfaceDisabledToneHex() {
    return this.gridConfig.surfaceDisabledToneHex || "";
  }
  get dataSelectorBadgeVariantHex() {
    return this.badgeConfig.variantHex || "";
  }
  get dataSelectorShowIcons() {
    return this.gridConfig.showIcons !== false;
  }
  get dataSelectorShowBadges() {
    return this.gridConfig.showBadges !== false;
  }
  get dataSelectorMarginTop() {
    return this.gridConfig.margin?.top ?? "";
  }
  get dataSelectorMarginRight() {
    return this.gridConfig.margin?.right ?? "";
  }
  get dataSelectorMarginBottom() {
    return this.gridConfig.margin?.bottom ?? "";
  }
  get dataSelectorMarginLeft() {
    return this.gridConfig.margin?.left ?? "";
  }
  get dataSelectorPaddingTop() {
    return this.gridConfig.padding?.top || undefined;
  }
  get dataSelectorPaddingRight() {
    return this.gridConfig.padding?.right || undefined;
  }
  get dataSelectorPaddingBottom() {
    return this.gridConfig.padding?.bottom || undefined;
  }
  get dataSelectorPaddingLeft() {
    return this.gridConfig.padding?.left || undefined;
  }
}
