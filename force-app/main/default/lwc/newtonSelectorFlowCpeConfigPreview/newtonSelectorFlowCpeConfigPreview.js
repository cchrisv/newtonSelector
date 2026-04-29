import { api, LightningElement } from "lwc";
import { resolvedLayoutGridConfig } from "c/newtonSelectorUtilityConfigDefaults";

const PREVIEW_SAMPLE_ITEMS = Object.freeze([
  {
    id: "preview-serena-williams",
    label: "Serena Williams",
    sublabel: "Preview sample record - tennis icon",
    icon: "trophy",
    badge: "Sample",
    helpText: "Mock data used only inside the builder preview.",
    value: "preview-serena-williams",
    disabled: false
  },
  {
    id: "preview-pedro-pascal",
    label: "Pedro Pascal",
    sublabel: "Preview sample record - actor",
    icon: "clapperboard",
    badge: "Mock",
    helpText: "Mock data used only inside the builder preview.",
    value: "preview-pedro-pascal",
    disabled: false
  },
  {
    id: "preview-zendaya",
    label: "Zendaya",
    sublabel: "Preview sample record - performer",
    icon: "sparkles",
    badge: "Demo",
    helpText: "Mock data used only inside the builder preview.",
    value: "preview-zendaya",
    disabled: false
  },
  {
    id: "preview-simone-biles",
    label: "Simone Biles",
    sublabel: "Preview sample record - gymnast",
    icon: "badge-check",
    badge: "Sample",
    helpText: "Mock data used only inside the builder preview.",
    value: "preview-simone-biles",
    disabled: false
  },
  {
    id: "preview-ava-duvernay",
    label: "Ava DuVernay",
    sublabel: "Preview sample record - filmmaker",
    icon: "video",
    badge: "Mock",
    helpText: "Mock data used only inside the builder preview.",
    value: "preview-ava-duvernay",
    disabled: false
  },
  {
    id: "preview-dwayne-johnson",
    label: "Dwayne Johnson",
    sublabel: "Preview sample record - entertainer",
    icon: "star",
    badge: "Demo",
    helpText: "Mock data used only inside the builder preview.",
    value: "preview-dwayne-johnson",
    disabled: false
  }
]);

function sampleAt(index) {
  return PREVIEW_SAMPLE_ITEMS[index % PREVIEW_SAMPLE_ITEMS.length];
}

function normalizePreviewValue(value, fallback) {
  return value === undefined || value === null || value === ""
    ? fallback
    : String(value);
}

export default class NewtonSelectorFlowCpeConfigPreview extends LightningElement {
  @api config;
  @api forcedState = "";

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
    return this.hasDataSource;
  }
  get showMockPreview() {
    return this.hasPreviewableSource;
  }
  get previewEmpty() {
    return !this.hasDataSource;
  }
  get previewRefreshKey() {
    return JSON.stringify(this.c);
  }
  get previewItems() {
    if (this.isCustomMode && (this.c.custom?.items?.length || 0) > 0) {
      return this.c.custom.items
        .filter((item) => item?.hidden !== true)
        .map((item, index) => {
          const sample = sampleAt(index);
          return {
            ...sample,
            ...item,
            id: item.id || `preview-custom-${index}`,
            label: item.label || sample.label,
            sublabel: item.sublabel || sample.sublabel,
            icon: item.icon || sample.icon,
            badge: item.badge || sample.badge,
            helpText: item.helpText || sample.helpText,
            value: normalizePreviewValue(item.value, sample.value),
            disabled: Boolean(item.disabled)
          };
        });
    }

    const overrideValues = Object.keys(this.c.overrides || {}).filter(Boolean);
    const values = [
      ...overrideValues,
      ...PREVIEW_SAMPLE_ITEMS.map((item) => item.value)
    ];
    const uniqueValues = [...new Set(values)].slice(0, 6);
    const length = Math.max(4, uniqueValues.length);
    return Array.from({ length }, (_, index) => {
      const sample = sampleAt(index);
      const value = uniqueValues[index] || sample.value;
      return {
        ...sample,
        id: `preview-mock-${index}`,
        value
      };
    });
  }
  get previewCustomConfig() {
    return { items: this.previewItems };
  }

  get previewCaption() {
    if (!this.hasDataSource)
      return "Pick a data source to see your selector come to life.";
    if (this.isCustomMode && (this.c.custom?.items?.length || 0) === 0) {
      return "Showing sample options until custom items are added.";
    }
    return "Showing deterministic sample data. Runtime data is not queried in the preview.";
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
  get dataSelectorCustomConfig() {
    return this.previewCustomConfig;
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
