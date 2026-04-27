import { api, LightningElement } from "lwc";
import {
  defaultGridConfig,
  defaultSelectorConfig,
  formatRem,
  parseRemValue
} from "c/newtonUtilitySelectorConfigDefaults";
import {
  ASPECT_TILES,
  AUTO_SPACING_TILES,
  BADGE_POSITIONS,
  BADGE_SHAPES,
  COLUMN_CHIPS,
  CORNER_TILES,
  ELEVATION_TILES,
  GLYPH_TONE_SWATCHES,
  GRID_SLIDER_RANGES,
  ICON_DECOR_TILES,
  ICON_SHADING_TILES,
  ICON_SIZE_TILES,
  ICON_STYLE_TILES,
  LAYOUT_TILES,
  PADDING_TILES,
  PATTERN_TILES,
  SELECTION_INDICATOR_TILES,
  SIDE_META,
  SIZE_LAYOUT_MAP,
  SIZE_TILES,
  SPACING_SIDES,
  SURFACE_TILES,
  TONE_SWATCHES,
  spacingTileList
} from "c/newtonUtilitySelectorConfigOptions";

export default class NewtonOrganismSelectorAppearanceConfig extends LightningElement {
  @api config;

  get _config() {
    return this.config || defaultSelectorConfig();
  }
  set _config(value) {
    this.dispatchEvent(
      new CustomEvent("configpatch", { detail: { path: [], value } })
    );
  }
  get gridConfig() {
    return this._config.gridConfig || defaultGridConfig(this._currentLayout);
  }
  get badgeCfg() {
    return this.gridConfig.badge || {};
  }
  get isLayoutSection() {
    return true;
  }

  get _currentLayout() {
    return this.normalizeLayout(this._config.layout || "grid");
  }
  get isTileLayout() {
    return true;
  }
  get showTileSize() {
    return this.isTileLayout;
  }
  get showAspectRatio() {
    return (
      this._currentLayout === "grid" || this._currentLayout === "horizontal"
    );
  }
  get showColumns() {
    return this._currentLayout === "grid";
  }
  get showGridMinWidth() {
    return (
      this._currentLayout === "grid" || this._currentLayout === "horizontal"
    );
  }
  get showGapHorizontal() {
    return (
      this._currentLayout === "grid" ||
      this._currentLayout === "horizontal" ||
      this._currentLayout === "columns" ||
      this._currentLayout === "dualListbox"
    );
  }
  get showGapVertical() {
    return (
      this._currentLayout === "grid" ||
      this._currentLayout === "list" ||
      this._currentLayout === "picklist" ||
      this._currentLayout === "radio" ||
      this._currentLayout === "columns" ||
      this._currentLayout === "dualListbox"
    );
  }
  get showGapCard() {
    return this.showGapHorizontal || this.showGapVertical;
  }
  get showSelectionIndicator() {
    return this.isTileLayout;
  }
  get showElevation() {
    return this.isTileLayout;
  }
  get showBadgeCard() {
    return this.isTileLayout;
  }
  get showMarginPadding() {
    return this.isTileLayout;
  }

  get layoutTiles() {
    const active = this._currentLayout;
    return LAYOUT_TILES.map((tile) => {
      const normalizedValue = this.normalizeLayout(tile.value);
      return {
        ...tile,
        id: tile.value,
        sublabel: tile.sublabel,
        _selected: normalizedValue === active,
        _disabled: false
      };
    });
  }
  get sizeTiles() {
    return this.selectedTiles(SIZE_TILES, this.gridConfig.size || "small");
  }
  get aspectTiles() {
    return this.selectedTiles(
      ASPECT_TILES,
      this.gridConfig.aspectRatio || "1:1"
    );
  }
  get columnChips() {
    const active = this.columnsValue;
    return COLUMN_CHIPS.map((chip) => ({
      ...chip,
      className:
        chip.value === active
          ? "newton-studio__col-chip newton-studio__col-chip_active"
          : "newton-studio__col-chip",
      ariaPressed: String(chip.value === active)
    }));
  }
  get columnsValue() {
    const value = this.gridConfig.columns;
    return value == null ? "" : String(value);
  }
  get selectionIndicatorTiles() {
    return this.selectedTiles(
      SELECTION_INDICATOR_TILES,
      this.normalizeSelectionIndicator(
        this.gridConfig.selectionIndicator || "frame"
      )
    );
  }
  get elevationTiles() {
    return this.selectedTiles(
      ELEVATION_TILES,
      this.normalizeElevation(this.gridConfig.elevation || "outlined")
    );
  }

  get patternTiles() {
    return this.selectedTiles(PATTERN_TILES, this.gridConfig.pattern || "none");
  }
  get patternToneRows() {
    return this.buildStateToneRows(
      "pattern",
      "Pattern",
      (this.gridConfig.pattern || "none") !== "none"
    );
  }
  get patternToneChips() {
    return this.buildToneChips(
      this.gridConfig.patternTone || "neutral",
      (this.gridConfig.pattern || "none") !== "none"
    );
  }
  get patternToneIsCustom() {
    return this.gridConfig.patternTone === "custom";
  }
  get patternToneHexValue() {
    return this.gridConfig.patternToneHex || "";
  }

  get cornerTiles() {
    return this.selectedTiles(
      CORNER_TILES,
      this.gridConfig.cornerStyle || "none"
    );
  }
  get cornerToneChips() {
    return this.buildToneChips(
      this.gridConfig.cornerTone || "neutral",
      (this.gridConfig.cornerStyle || "none") !== "none"
    );
  }
  get cornerToneIsCustom() {
    return this.gridConfig.cornerTone === "custom";
  }
  get cornerToneHexValue() {
    return this.gridConfig.cornerToneHex || "";
  }

  get surfaceTiles() {
    return this.selectedTiles(
      SURFACE_TILES,
      this.gridConfig.surfaceStyle || "solid"
    );
  }
  get surfaceToneRows() {
    return this.buildStateToneRows("surface", "Surface", true);
  }
  get surfaceToneChips() {
    return this.buildToneChips(this.gridConfig.surfaceTone || "neutral", true);
  }
  get surfaceToneIsCustom() {
    return this.gridConfig.surfaceTone === "custom";
  }
  get surfaceToneHexValue() {
    return this.gridConfig.surfaceToneHex || "";
  }

  get showIconsValue() {
    return this.gridConfig.showIcons !== false;
  }
  get showBadgesValue() {
    return this.gridConfig.showBadges !== false;
  }
  get iconSubchapterClass() {
    const base = "newton-studio__subchapter newton-studio__subchapter_icon";
    return this.showIconsValue ? base : `${base} newton-studio__subchapter_off`;
  }
  get badgeSubchapterClass() {
    const base = "newton-studio__subchapter newton-studio__subchapter_badge";
    return this.showBadgesValue
      ? base
      : `${base} newton-studio__subchapter_off`;
  }

  get iconSizeTiles() {
    return this.selectedTiles(
      [
        {
          value: "auto",
          label: "Auto",
          sublabel: "Match tile",
          icon: "refresh-cw"
        },
        ...ICON_SIZE_TILES
      ],
      this.gridConfig.iconSize || "auto",
      this.showIconsValue
    );
  }

  get iconDecorTiles() {
    return this.selectedTiles(
      ICON_DECOR_TILES,
      this.gridConfig.iconDecor || "square",
      this.showIconsValue
    );
  }
  get hasIconDecor() {
    return (this.gridConfig.iconDecor || "square") !== "none";
  }
  get showIconTreatment() {
    return this.showIconsValue && this.hasIconDecor;
  }
  get iconStyleTiles() {
    return this.selectedTiles(
      ICON_STYLE_TILES,
      this.gridConfig.iconStyle || "soft",
      this.showIconTreatment
    );
  }
  get iconShadingTiles() {
    return this.selectedTiles(
      ICON_SHADING_TILES,
      this.gridConfig.iconShading || "flat",
      this.showIconTreatment &&
        (this.gridConfig.iconStyle || "soft") === "filled"
    );
  }
  get showIconShading() {
    return (
      this.showIconTreatment &&
      (this.gridConfig.iconStyle || "soft") === "filled"
    );
  }
  get iconToneChips() {
    return this.buildToneChips(
      this.gridConfig.iconTone || "brand",
      this.showIconTreatment
    );
  }
  get iconToneIsCustom() {
    return this.gridConfig.iconTone === "custom";
  }
  get iconToneHexValue() {
    return this.gridConfig.iconToneHex || "";
  }
  get iconGlyphToneChips() {
    return GLYPH_TONE_SWATCHES.map((tone) => ({
      ...tone,
      className: this.toneChipClass(
        tone.value,
        this.gridConfig.iconGlyphTone || "auto",
        this.showIconTreatment
      ),
      ariaPressed: String(
        tone.value === (this.gridConfig.iconGlyphTone || "auto")
      ),
      dotClassName: `newton-tone-chip__dot newton-tone-chip__dot_${tone.value}`,
      disabled: !this.showIconTreatment
    }));
  }
  get iconGlyphToneIsCustom() {
    return this.gridConfig.iconGlyphTone === "custom";
  }
  get iconGlyphToneHexValue() {
    return this.gridConfig.iconGlyphToneHex || "";
  }

  get showBadgeGroupCards() {
    return this.showBadgesValue;
  }
  get badgePosition() {
    return this.badgeCfg.position || "bottom-inline";
  }
  get badgeVariant() {
    return this.badgeCfg.variant || "neutral";
  }
  get badgeShape() {
    return this.badgeCfg.shape || "pill";
  }
  get badgePositionChips() {
    return BADGE_POSITIONS.map((chip) => ({
      ...chip,
      className: `newton-badge-pos-chip newton-badge-pos-chip_${chip.value}${
        chip.value === this.badgePosition ? " newton-badge-pos-chip_active" : ""
      }`,
      dotClass: `newton-badge-pos-chip__dot newton-badge-pos-chip__dot_${chip.value}`
    }));
  }
  get badgeVariantChips() {
    const all = [...TONE_SWATCHES];
    all.splice(all.length - 1, 0, { value: "inverse", label: "Inverse" });
    return all.map((tone) => ({
      ...tone,
      className: this.toneChipClass(tone.value, this.badgeVariant, true),
      ariaPressed: String(tone.value === this.badgeVariant),
      dotClassName: `newton-tone-chip__dot newton-tone-chip__dot_${tone.value}`,
      disabled: false
    }));
  }
  get badgeVariantIsCustom() {
    return this.badgeVariant === "custom";
  }
  get badgeVariantHexValue() {
    return this.badgeCfg.variantHex || "";
  }
  get badgeShapeChips() {
    return BADGE_SHAPES.map((shape) => ({
      ...shape,
      className: `newton-badge-shape-chip${
        shape.value === this.badgeShape ? " newton-badge-shape-chip_active" : ""
      }`,
      badgeClass: `newton-choice-tile__badge newton-choice-tile__badge_variant-${this.badgeVariant} newton-choice-tile__badge_shape-${shape.value}`
    }));
  }

  get gapHTiles() {
    return spacingTileList(AUTO_SPACING_TILES, this.gridConfig.gapH ?? "");
  }
  get gapVTiles() {
    return spacingTileList(AUTO_SPACING_TILES, this.gridConfig.gapV ?? "");
  }
  get marginLinked() {
    return this.gridConfig.margin?.linked !== false;
  }
  get paddingLinked() {
    return this.gridConfig.padding?.linked !== false;
  }
  get marginAllTiles() {
    return spacingTileList(
      AUTO_SPACING_TILES,
      this.gridConfig.margin?.top ?? ""
    );
  }
  get paddingAllTiles() {
    return spacingTileList(PADDING_TILES, this.gridConfig.padding?.top ?? "");
  }
  get marginSideSections() {
    return this.sideSections(
      AUTO_SPACING_TILES,
      this.gridConfig.margin || {},
      ""
    );
  }
  get paddingSideSections() {
    return this.sideSections(PADDING_TILES, this.gridConfig.padding || {}, "");
  }

  get gridMinWidthRange() {
    return GRID_SLIDER_RANGES.minWidth;
  }
  get gridMinWidthNumber() {
    return parseRemValue(
      this.gridConfig.minWidth,
      GRID_SLIDER_RANGES.minWidth.fallback
    );
  }
  get gridMinWidthDisplay() {
    return `${this.gridMinWidthNumber} rem`;
  }
  get gridMinWidthScaleMin() {
    return `${GRID_SLIDER_RANGES.minWidth.min} rem`;
  }
  get gridMinWidthScaleMax() {
    return `${GRID_SLIDER_RANGES.minWidth.max} rem`;
  }

  handleLayoutTileChange(event) {
    const value = this.normalizeLayout(event.detail?.value || "grid");
    this._config = {
      ...this._config,
      layout: value,
      gridConfig: defaultGridConfig(value)
    };
  }
  handleResetLayoutDefaults() {
    const layout = this._currentLayout;
    this._config = {
      ...this._config,
      gridConfig: defaultGridConfig(layout)
    };
  }
  normalizeLayout(value) {
    if (value === "dropdown") return "picklist";
    return value;
  }
  normalizeSelectionIndicator(value) {
    if (value === "spotlight") return "checkmark";
    return SELECTION_INDICATOR_TILES.some((tile) => tile.value === value)
      ? value
      : "frame";
  }
  normalizeElevation(value) {
    const normalized =
      value === "flat" ? "plain" : value === "elevated" ? "raised" : value;
    return ELEVATION_TILES.some((tile) => tile.value === normalized)
      ? normalized
      : "outlined";
  }
  handleSizeTileChange(event) {
    const value = event.detail?.value || "small";
    const layout = SIZE_LAYOUT_MAP[value] || SIZE_LAYOUT_MAP.small;
    this.patchGrid({ size: value, minWidth: layout.column });
  }
  handleAspectChange(event) {
    this.patchGrid({ aspectRatio: event.detail?.value || "1:1" });
  }
  handleColumnsChange(event) {
    const raw = event.currentTarget?.dataset?.value;
    this.patchGrid({ columns: raw === "" ? null : Number(raw) });
  }
  handleSelectionIndicatorChange(event) {
    this.patchGrid({
      selectionIndicator: this.normalizeSelectionIndicator(
        event.detail?.value || "frame"
      )
    });
  }
  handleElevationChange(event) {
    this.patchGrid({
      elevation: this.normalizeElevation(event.detail?.value || "outlined")
    });
  }
  handlePatternChange(event) {
    this.patchGrid({ pattern: event.detail?.value || "none" });
  }
  handleCornerChange(event) {
    this.patchGrid({ cornerStyle: event.detail?.value || "none" });
  }
  handleSurfaceChange(event) {
    this.patchGrid({ surfaceStyle: event.detail?.value || "solid" });
  }
  handleIconSizeChange(event) {
    this.patchGrid({ iconSize: event.detail?.value || "auto" });
  }
  handleIconDecorChange(event) {
    this.patchGrid({ iconDecor: event.detail?.value || "square" });
  }
  handleIconStyleChange(event) {
    this.patchGrid({ iconStyle: event.detail?.value || "soft" });
  }
  handleIconShadingChange(event) {
    this.patchGrid({ iconShading: event.detail?.value || "flat" });
  }
  handleGapHorizontalToken(event) {
    this.patchGrid({ gapH: event.detail?.value ?? "" });
  }
  handleGapVerticalToken(event) {
    this.patchGrid({ gapV: event.detail?.value ?? "" });
  }
  handleGridMinWidthChange(event) {
    const raw = Number(event.target.value);
    this.patchGrid({
      minWidth: formatRem(
        Number.isFinite(raw) ? raw : GRID_SLIDER_RANGES.minWidth.fallback
      )
    });
  }

  handlePatternToneChange(event) {
    this.patchDatasetGrid(event, "patternTone");
  }
  handlePatternStateToneChange(event) {
    this.patchStateTone(event);
  }
  handleCornerToneChange(event) {
    this.patchDatasetGrid(event, "cornerTone");
  }
  handleSurfaceToneChange(event) {
    this.patchDatasetGrid(event, "surfaceTone");
  }
  handleSurfaceStateToneChange(event) {
    this.patchStateTone(event);
  }
  handleIconToneChange(event) {
    this.patchDatasetGrid(event, "iconTone");
  }
  handleIconGlyphToneChange(event) {
    this.patchDatasetGrid(event, "iconGlyphTone");
  }
  handlePatternToneHexChange(event) {
    this.patchGrid({ patternToneHex: event.target?.value || "" });
  }
  handlePatternStateToneHexChange(event) {
    this.patchStateToneHex(event);
  }
  handleCornerToneHexChange(event) {
    this.patchGrid({ cornerToneHex: event.target?.value || "" });
  }
  handleSurfaceToneHexChange(event) {
    this.patchGrid({ surfaceToneHex: event.target?.value || "" });
  }
  handleSurfaceStateToneHexChange(event) {
    this.patchStateToneHex(event);
  }
  handleIconToneHexChange(event) {
    this.patchGrid({ iconToneHex: event.target?.value || "" });
  }
  handleIconGlyphToneHexChange(event) {
    this.patchGrid({ iconGlyphToneHex: event.target?.value || "" });
  }
  handleShowIconsToggle(event) {
    this.patchGrid({
      showIcons: Boolean(event.detail?.checked ?? event.target?.checked)
    });
  }
  handleShowBadgesToggle(event) {
    this.patchGrid({
      showBadges: Boolean(event.detail?.checked ?? event.target?.checked)
    });
  }
  handleBadgePositionChange(event) {
    this.patchDatasetBadge(event, "position");
  }
  handleBadgeVariantChange(event) {
    this.patchDatasetBadge(event, "variant");
  }
  handleBadgeShapeChange(event) {
    this.patchDatasetBadge(event, "shape");
  }
  handleBadgeVariantHexChange(event) {
    this.patchBadge({ variantHex: event.target?.value || "" });
  }

  handleMarginLinkToggle(event) {
    this.patchBox("margin", Boolean(event.detail?.checked), "");
  }
  handlePaddingLinkToggle(event) {
    this.patchBox("padding", Boolean(event.detail?.checked), "");
  }
  handleMarginAllChange(event) {
    this.patchBoxAll("margin", event.detail?.value ?? "");
  }
  handlePaddingAllChange(event) {
    this.patchBoxAll("padding", event.detail?.value ?? "");
  }
  handleMarginSideChange(event) {
    this.patchBoxSide(
      "margin",
      event.currentTarget?.dataset?.side,
      event.detail?.value ?? ""
    );
  }
  handlePaddingSideChange(event) {
    this.patchBoxSide(
      "padding",
      event.currentTarget?.dataset?.side,
      event.detail?.value ?? ""
    );
  }

  selectedTiles(source, active, enabled = true) {
    return source.map((tile) => ({
      ...tile,
      id: tile.value,
      _selected: tile.value === active,
      _disabled: !enabled
    }));
  }
  buildToneChips(active, enabled) {
    return TONE_SWATCHES.map((tone) => ({
      ...tone,
      className: this.toneChipClass(tone.value, active, enabled),
      ariaPressed: String(tone.value === active),
      dotClassName: `newton-tone-chip__dot newton-tone-chip__dot_${tone.value}`,
      disabled: !enabled
    }));
  }
  buildStateToneRows(axis, axisLabel, enabled) {
    const stateDefs = [
      {
        key: "normal",
        label: "Normal",
        toneKey: `${axis}Tone`,
        hexKey: `${axis}ToneHex`,
        fallback: "neutral"
      },
      {
        key: "hover",
        label: "Hover",
        toneKey: `${axis}HoverTone`,
        hexKey: `${axis}HoverToneHex`,
        fallback: this.gridConfig[`${axis}Tone`] || "neutral"
      },
      {
        key: "selected",
        label: "Selected",
        toneKey: `${axis}SelectedTone`,
        hexKey: `${axis}SelectedToneHex`,
        fallback: "brand"
      },
      {
        key: "disabled",
        label: "Disabled",
        toneKey: `${axis}DisabledTone`,
        hexKey: `${axis}DisabledToneHex`,
        fallback: "neutral"
      }
    ];
    return stateDefs.map((def) => {
      const active = this.gridConfig[def.toneKey] || def.fallback;
      const stateLabel = def.label.toLowerCase();
      return {
        ...def,
        rowKey: `${axis}-${def.key}`,
        ariaLabel: `${axisLabel} ${stateLabel} color`,
        chips: this.buildToneChips(active, enabled),
        isCustom: enabled && active === "custom",
        hexValue: this.gridConfig[def.hexKey] || "",
        hexId: `${axis}-${def.key}-tone-hex`,
        colorAriaLabel: `Pick ${axisLabel.toLowerCase()} ${stateLabel} color`,
        hexAriaLabel: `${axisLabel} ${stateLabel} hex color value`
      };
    });
  }
  toneChipClass(value, active, enabled) {
    return [
      "newton-tone-chip",
      `newton-tone-chip_${value}`,
      value === active ? "newton-tone-chip_active" : "",
      enabled ? "" : "newton-tone-chip_disabled"
    ]
      .filter(Boolean)
      .join(" ");
  }
  sideSections(source, config, fallback) {
    return SIDE_META.map((meta) => ({
      ...meta,
      tiles: spacingTileList(source, config[meta.side] ?? fallback)
    }));
  }
  patchDatasetGrid(event, key) {
    const value = event.currentTarget?.dataset?.value;
    if (value) this.patchGrid({ [key]: value });
  }
  patchStateTone(event) {
    const key = event.currentTarget?.dataset?.toneKey;
    const value = event.currentTarget?.dataset?.value;
    if (key && value) this.patchGrid({ [key]: value });
  }
  patchStateToneHex(event) {
    const key =
      event.currentTarget?.dataset?.hexKey || event.target?.dataset?.hexKey;
    if (key) this.patchGrid({ [key]: event.target?.value || "" });
  }
  patchDatasetBadge(event, key) {
    const value = event.currentTarget?.dataset?.value;
    if (value) this.patchBadge({ [key]: value });
  }
  patchGrid(values) {
    this._config = {
      ...this._config,
      gridConfig: { ...this.gridConfig, ...values }
    };
  }
  patchBadge(values) {
    this.patchGrid({ badge: { ...this.badgeCfg, ...values } });
  }
  patchBox(name, linked, fallback) {
    const box = { ...(this.gridConfig[name] || {}), linked };
    if (linked) {
      const base = box.top ?? fallback;
      box.top = box.right = box.bottom = box.left = base;
    }
    this.patchGrid({ [name]: box });
  }
  patchBoxAll(name, value) {
    this.patchGrid({
      [name]: {
        linked: true,
        top: value,
        right: value,
        bottom: value,
        left: value
      }
    });
  }
  patchBoxSide(name, side, value) {
    if (!SPACING_SIDES.includes(side)) return;
    this.patchGrid({
      [name]: { ...(this.gridConfig[name] || {}), [side]: value, linked: false }
    });
  }
}
