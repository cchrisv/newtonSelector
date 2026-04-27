import { api, LightningElement } from "lwc";
import { SAMPLE_ITEMS } from "c/newtonSelectorUtilityDataSources";
import { resolvedLayoutGridConfig } from "c/newtonSelectorUtilityConfigDefaults";
import { buildSobjectConfigForQuery } from "c/newtonSelectorFlowCpeUtilityConfigState";

export default class NewtonSelectorFlowCpeConfigPreview extends LightningElement {
  @api config;
  @api forcedState = "";
  @api recordCollectionSampleRecords = [];
  @api stringCollectionSampleStrings = [];

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
  get isStringCollectionMode() {
    return this.c.dataSource === "stringCollection";
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
    return (
      this.isStringCollectionMode &&
      this.stringCollectionSampleStrings.length > 0
    );
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
      return "Pick a data source to see your picker come to life.";
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
  get organismPicklistConfig() {
    return this.c.picklist || {};
  }
  get organismCustomConfig() {
    return this.c.custom || { items: [] };
  }
  get organismStringCollectionConfig() {
    return { values: this.stringCollectionSampleStrings };
  }
  get organismCollectionConfig() {
    return {
      records: this.recordCollectionSampleRecords,
      fieldMap: this.c.collection?.fieldMap || {}
    };
  }
  get organismSobjectConfig() {
    return buildSobjectConfigForQuery(this.c);
  }
  get organismOverrides() {
    return this.c.overrides || {};
  }
  get organismDisplayConfig() {
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
  get orgGridMinWidth() {
    return this.gridConfig.minWidth || this.gridDefaults.minWidth;
  }
  get orgGapHorizontal() {
    return this.gridConfig.gapH || this.gridDefaults.gapH;
  }
  get orgGapVertical() {
    return this.gridConfig.gapV || this.gridDefaults.gapV;
  }
  get orgSize() {
    return this.gridConfig.size || this.gridDefaults.size;
  }
  get orgAspectRatio() {
    return this.gridConfig.aspectRatio || this.gridDefaults.aspectRatio;
  }
  get orgBadgePosition() {
    return this.badgeConfig.position || "bottom-inline";
  }
  get orgBadgeVariant() {
    return this.badgeConfig.variant || "neutral";
  }
  get orgBadgeShape() {
    return this.badgeConfig.shape || "pill";
  }
  get orgColumns() {
    const n = Number(this.gridConfig.columns);
    return Number.isFinite(n) && n >= 1 && n <= 6 ? n : undefined;
  }
  get orgSelectionIndicator() {
    return (
      this.gridConfig.selectionIndicator || this.gridDefaults.selectionIndicator
    );
  }
  get orgElevation() {
    return this.gridConfig.elevation || "outlined";
  }
  get orgPattern() {
    return this.gridConfig.pattern || "none";
  }
  get orgPatternTone() {
    return this.gridConfig.patternTone || "neutral";
  }
  get orgPatternHoverTone() {
    return this.gridConfig.patternHoverTone || this.orgPatternTone;
  }
  get orgPatternSelectedTone() {
    return this.gridConfig.patternSelectedTone || "brand";
  }
  get orgPatternDisabledTone() {
    return this.gridConfig.patternDisabledTone || "neutral";
  }
  get orgCornerStyle() {
    return this.gridConfig.cornerStyle || "none";
  }
  get orgCornerTone() {
    return this.gridConfig.cornerTone || "neutral";
  }
  get orgSurfaceStyle() {
    return this.gridConfig.surfaceStyle || "solid";
  }
  get orgSurfaceTone() {
    return this.gridConfig.surfaceTone || "neutral";
  }
  get orgSurfaceHoverTone() {
    return this.gridConfig.surfaceHoverTone || this.orgSurfaceTone;
  }
  get orgSurfaceSelectedTone() {
    return this.gridConfig.surfaceSelectedTone || "brand";
  }
  get orgSurfaceDisabledTone() {
    return this.gridConfig.surfaceDisabledTone || "neutral";
  }
  get orgIconDecor() {
    return this.gridConfig.iconDecor || this.gridDefaults.iconDecor;
  }
  get orgIconStyle() {
    return this.gridConfig.iconStyle || this.gridDefaults.iconStyle;
  }
  get orgIconShading() {
    return this.gridConfig.iconShading || "flat";
  }
  get orgIconTone() {
    return this.gridConfig.iconTone || this.gridDefaults.iconTone;
  }
  get orgIconGlyphTone() {
    return this.gridConfig.iconGlyphTone || "auto";
  }
  get orgIconGlyphToneHex() {
    return this.gridConfig.iconGlyphToneHex || "";
  }
  get orgIconSize() {
    const raw = this.gridConfig.iconSize;
    return raw && raw !== "auto" ? raw : "large";
  }
  get orgIconToneHex() {
    return this.gridConfig.iconToneHex || "";
  }
  get orgPatternToneHex() {
    return this.gridConfig.patternToneHex || "";
  }
  get orgPatternHoverToneHex() {
    return this.gridConfig.patternHoverToneHex || "";
  }
  get orgPatternSelectedToneHex() {
    return this.gridConfig.patternSelectedToneHex || "";
  }
  get orgPatternDisabledToneHex() {
    return this.gridConfig.patternDisabledToneHex || "";
  }
  get orgCornerToneHex() {
    return this.gridConfig.cornerToneHex || "";
  }
  get orgSurfaceToneHex() {
    return this.gridConfig.surfaceToneHex || "";
  }
  get orgSurfaceHoverToneHex() {
    return this.gridConfig.surfaceHoverToneHex || "";
  }
  get orgSurfaceSelectedToneHex() {
    return this.gridConfig.surfaceSelectedToneHex || "";
  }
  get orgSurfaceDisabledToneHex() {
    return this.gridConfig.surfaceDisabledToneHex || "";
  }
  get orgBadgeVariantHex() {
    return this.badgeConfig.variantHex || "";
  }
  get orgShowIcons() {
    return this.gridConfig.showIcons !== false;
  }
  get orgShowBadges() {
    return this.gridConfig.showBadges !== false;
  }
  get orgMarginTop() {
    return this.gridConfig.margin?.top ?? "";
  }
  get orgMarginRight() {
    return this.gridConfig.margin?.right ?? "";
  }
  get orgMarginBottom() {
    return this.gridConfig.margin?.bottom ?? "";
  }
  get orgMarginLeft() {
    return this.gridConfig.margin?.left ?? "";
  }
  get orgPaddingTop() {
    return this.gridConfig.padding?.top || undefined;
  }
  get orgPaddingRight() {
    return this.gridConfig.padding?.right || undefined;
  }
  get orgPaddingBottom() {
    return this.gridConfig.padding?.bottom || undefined;
  }
  get orgPaddingLeft() {
    return this.gridConfig.padding?.left || undefined;
  }
}
