import { LightningElement, api } from "lwc";

const MODE_SINGLE = "single";
const MODE_MULTI = "multi";
const VARIANT_GRID = "grid";
const VARIANT_LIST = "list";
const VALID_VARIANTS = new Set([VARIANT_GRID, VARIANT_LIST]);
const VALID_SIZES = new Set(["small", "medium", "large"]);
const VALID_ASPECTS = new Set(["1:1", "4:3", "3:2", "16:9", "3:4", "2:3"]);
const DEFAULT_ASPECT = "1:1";

// Badge presentation axes — configurable globally on the selector. The actual
// badge text still comes from `item.badge`; these props decide how it looks.
const VALID_BADGE_POSITIONS = new Set([
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
  "bottom-inline"
]);
const DEFAULT_BADGE_POSITION = "bottom-inline";
// Badge variant doubles as a tone — the selector's badge color axis follows
// the same palette as every other tone axis (pattern/corner/surface/icon):
// the 8 SLDS presets + 'custom' (hex) + 'inverse' for dark-theme contrast.
const VALID_BADGE_VARIANTS = new Set([
  "neutral",
  "brand",
  "success",
  "warning",
  "error",
  "violet",
  "pink",
  "teal",
  "inverse",
  "custom"
]);
const DEFAULT_BADGE_VARIANT = "neutral";
const VALID_BADGE_SHAPES = new Set(["pill", "square"]);
const DEFAULT_BADGE_SHAPE = "pill";

// Selection indicator style — how the "this tile is picked" state is shown.
//   checkmark — floating circle badge top-right (historical)
//   fill      — tile surface fills with brand-weak, check hidden
//   bar       — thick brand-colored bar on the leading edge
//   frame     — inset selected frame
//   ribbon    — folded branded corner flag
//   pulse     — animated halo ring around the tile
const VALID_SELECTION_INDICATORS = new Set([
  "checkmark",
  "fill",
  "bar",
  "frame",
  "ribbon",
  "pulse"
]);
const DEFAULT_SELECTION_INDICATOR = "frame";

// Elevation / card style.
//   plain    — borderless clean surface
//   subtle   — low-contrast surface and edge
//   outlined — crisp border, no resting shadow (default)
//   raised   — soft resting depth
//   floating — stronger resting depth
//   inset    — inner edge, grounded surface
const VALID_ELEVATIONS = new Set([
  "plain",
  "subtle",
  "outlined",
  "raised",
  "floating",
  "inset"
]);
const ELEVATION_ALIASES = {
  flat: "plain",
  elevated: "raised"
};
const DEFAULT_ELEVATION = "outlined";

// Pattern — decorative overlay inspired by the empty/error state
// backgrounds. `none` leaves the surface clean; the others layer a subtle
// pattern tinted by patternTone.
//   none     — no overlay (default)
//   dots     — fine dotted grid (from empty-state)
//   lines    — horizontal scanlines (from error-state)
//   diagonal — 45deg stripes
//   grid     — crosshatch
//   glow     — soft radial gradient at top
const VALID_PATTERNS = new Set([
  "none",
  "dots",
  "lines",
  "diagonal",
  "grid",
  "glow",
  "noise",
  "paper",
  "waves"
]);
const DEFAULT_PATTERN = "none";

// Surface gradient — sits *behind* the pattern on the tile figure surface.
// Patterns and gradients compose: e.g. brand radial gradient + neutral dots.
//   solid            — no gradient (default)
//   gradient-top     — vertical linear, tinted top → clean bottom
//   gradient-radial  — radial from top, like a stage spotlight
//   gradient-diagonal— 45deg linear tint
//   tint             — flat solid tint (brand-weak style)
const VALID_SURFACES = new Set([
  "solid",
  "gradient-top",
  "gradient-radial",
  "gradient-diagonal",
  "tint"
]);
const DEFAULT_SURFACE = "solid";

// Icon decoration — optional background treatment behind the glyph.
const VALID_ICON_DECORS = new Set(["none", "ring", "halo", "badge", "square"]);
const DEFAULT_ICON_DECOR = "square";

// Icon style — how the optional decoration is rendered.
//   filled     — solid fill in tone color (icon renders white for contrast)
//   outlined   — transparent fill + tone-colored outline, icon in tone color
//   soft       — low-opacity dashed outline, dimmed icon — "empty space" feel
//   glow       — soft radial gradient (halo), icon in tone color
const VALID_ICON_STYLES = new Set(["filled", "outlined", "soft", "glow"]);
const DEFAULT_ICON_STYLE = "outlined";

// Icon shading — surface treatment applied to filled shapes. Ignored for
// outlined/soft/glow styles.
//   flat       — solid color (default)
//   gradient   — linear gradient from tint-dark to tint-light
//   emboss     — subtle inset shadow for a "pressed" look
const VALID_ICON_SHADINGS = new Set(["flat", "gradient", "emboss"]);
const DEFAULT_ICON_SHADING = "flat";

// Corner decoration — the L-shaped trim marks we used on the empty/error
// plates. `none` means no flourish.
//   none       — clean corners (default)
//   trim       — light trim marks
//   brackets   — heavier, longer bracket corners
//   dots       — single small dot at each corner
const VALID_CORNERS = new Set(["none", "trim", "brackets", "dots"]);
const DEFAULT_CORNER = "none";

// Shared tone palette — drives the tint color across pattern / corner /
// surface / icon axes. Each accepts a preset name OR 'custom' which pairs
// with a hex-value sibling property to unlock any color.
const VALID_TONES = new Set([
  "neutral",
  "brand",
  "success",
  "warning",
  "error",
  "violet",
  "pink",
  "teal",
  "custom"
]);
const DEFAULT_TONE = "neutral";
const DEFAULT_ICON_TONE = "brand";

// Loose hex validator — accepts "#RGB", "#RRGGBB", "#RRGGBBAA", case-insensitive.
const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
function safeHex(v) {
  if (!v) return "";
  const s = String(v).trim();
  return HEX_RE.test(s) ? s : "";
}

function isExplicitFalse(value) {
  return value === false || value === "false" || value === "FALSE";
}

function aspectClassKey(aspect) {
  return aspect.replace(":", "-");
}

function resolveTone(itemTone, apiTone, fallback) {
  if (itemTone && VALID_TONES.has(itemTone)) return itemTone;
  if (apiTone && VALID_TONES.has(apiTone)) return apiTone;
  return fallback;
}

function resolveHex(itemHex, apiHex, fallbackHex = "") {
  return safeHex(itemHex) || safeHex(apiHex) || fallbackHex;
}

export default class NewtonSelectorChoiceTile extends LightningElement {
  @api item = {};
  @api variant = VARIANT_GRID;
  @api selected = false;
  @api disabled = false;
  @api selectionMode = MODE_SINGLE;
  @api groupName = "newtonSelectorChoiceTile";
  @api size = "medium";
  @api aspectRatio = DEFAULT_ASPECT;
  @api iconSize = "large";
  @api badgePosition = DEFAULT_BADGE_POSITION;
  @api badgeVariant = DEFAULT_BADGE_VARIANT;
  @api badgeShape = DEFAULT_BADGE_SHAPE;
  @api selectionIndicator = DEFAULT_SELECTION_INDICATOR;
  @api elevation = DEFAULT_ELEVATION;
  @api pattern = DEFAULT_PATTERN;
  @api patternTone = DEFAULT_TONE;
  @api patternHoverTone;
  @api patternSelectedTone;
  @api patternDisabledTone;
  @api cornerStyle = DEFAULT_CORNER;
  @api cornerTone = DEFAULT_TONE;
  @api surfaceStyle = DEFAULT_SURFACE;
  @api surfaceTone = DEFAULT_TONE;
  @api surfaceHoverTone;
  @api surfaceSelectedTone;
  @api surfaceDisabledTone;
  @api iconDecor = DEFAULT_ICON_DECOR;
  @api iconStyle = DEFAULT_ICON_STYLE;
  @api iconShading = DEFAULT_ICON_SHADING;
  @api iconTone = DEFAULT_ICON_TONE;
  // Glyph color — controls the icon ITSELF (as distinct from the decor fill).
  // When unset, glyphTone inherits from iconTone for back-compat. Setting it
  // independently lets admins design e.g. a neutral-gray decoration with a
  // brand-blue glyph on top.
  @api iconGlyphTone;
  @api iconGlyphToneHex = "";
  // Custom hex color (applies when iconTone === 'custom'). Same pattern for
  // pattern/corner/surface tone axes — each can opt out of the preset palette
  // by setting tone='custom' + providing a hex string.
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
  // Matches the tone/hex pair pattern used by the other color axes —
  // badgeVariant='custom' + badgeVariantHex='#ff6b00' renders a custom-
  // tinted badge.
  @api badgeVariantHex = "";
  // Global on/off switches — default ON. LWC disallows `true` defaults on
  // `@api` booleans, so the property starts `undefined` and our check
  // (`showIcons !== false`) treats undefined as "show". To hide, a parent
  // must explicitly pass `false`.
  @api showIcons;
  @api showBadges;

  get resolvedVariant() {
    return VALID_VARIANTS.has(this.variant) ? this.variant : VARIANT_GRID;
  }
  get resolvedSize() {
    return VALID_SIZES.has(this.size) ? this.size : "medium";
  }
  // Legacy configs may set aspectRatio to 'auto'; silently normalize to the default.
  get resolvedAspect() {
    return VALID_ASPECTS.has(this.aspectRatio)
      ? this.aspectRatio
      : DEFAULT_ASPECT;
  }
  // Icon size resolution order: item override > @api override > tile-size default.
  // The tile-size default gives small/medium/large tiles naturally-scaled icons
  // (previously icons were always 'large', making list-mode rows all the same
  // apparent height regardless of tile size).
  get resolvedIconSize() {
    if (this.item?.iconSize) return this.item.iconSize;
    if (this.iconSize && this.iconSize !== "large") return this.iconSize; // explicit non-default
    // Default: scale with tile size.
    const map = { small: "small", medium: "medium", large: "large" };
    return map[this.resolvedSize] || "medium";
  }

  get resolvedBadgePosition() {
    return VALID_BADGE_POSITIONS.has(this.badgePosition)
      ? this.badgePosition
      : DEFAULT_BADGE_POSITION;
  }
  get resolvedBadgeVariant() {
    // Per-item override wins over the selector-wide variant.
    const itemVariant = this.item?.badgeVariant;
    if (itemVariant && VALID_BADGE_VARIANTS.has(itemVariant))
      return itemVariant;
    return VALID_BADGE_VARIANTS.has(this.badgeVariant)
      ? this.badgeVariant
      : DEFAULT_BADGE_VARIANT;
  }
  get resolvedBadgeShape() {
    return VALID_BADGE_SHAPES.has(this.badgeShape)
      ? this.badgeShape
      : DEFAULT_BADGE_SHAPE;
  }
  get resolvedSelectionIndicator() {
    return VALID_SELECTION_INDICATORS.has(this.selectionIndicator)
      ? this.selectionIndicator
      : DEFAULT_SELECTION_INDICATOR;
  }
  get resolvedElevation() {
    const value = ELEVATION_ALIASES[this.elevation] || this.elevation;
    return VALID_ELEVATIONS.has(value) ? value : DEFAULT_ELEVATION;
  }
  get resolvedPattern() {
    const itemPattern = this.item?.pattern;
    if (itemPattern && VALID_PATTERNS.has(itemPattern)) return itemPattern;
    return VALID_PATTERNS.has(this.pattern) ? this.pattern : DEFAULT_PATTERN;
  }
  get resolvedPatternTone() {
    const itemTone = this.item?.patternTone;
    return resolveTone(itemTone, this.patternTone, DEFAULT_TONE);
  }
  get resolvedPatternHoverTone() {
    return resolveTone(
      this.item?.patternHoverTone,
      this.patternHoverTone,
      this.resolvedPatternTone
    );
  }
  get resolvedPatternSelectedTone() {
    return resolveTone(
      this.item?.patternSelectedTone,
      this.patternSelectedTone,
      "brand"
    );
  }
  get resolvedPatternDisabledTone() {
    return resolveTone(
      this.item?.patternDisabledTone,
      this.patternDisabledTone,
      "neutral"
    );
  }
  get resolvedCornerStyle() {
    const itemCorner = this.item?.cornerStyle;
    if (itemCorner && VALID_CORNERS.has(itemCorner)) return itemCorner;
    return VALID_CORNERS.has(this.cornerStyle)
      ? this.cornerStyle
      : DEFAULT_CORNER;
  }
  get resolvedCornerTone() {
    const itemTone = this.item?.cornerTone;
    if (itemTone && VALID_TONES.has(itemTone)) return itemTone;
    return VALID_TONES.has(this.cornerTone) ? this.cornerTone : DEFAULT_TONE;
  }
  get hasCornerDecor() {
    return this.resolvedCornerStyle !== "none";
  }
  get hasPattern() {
    return this.resolvedPattern !== "none";
  }
  get resolvedSurfaceStyle() {
    const itemSurface = this.item?.surfaceStyle;
    if (itemSurface && VALID_SURFACES.has(itemSurface)) return itemSurface;
    return VALID_SURFACES.has(this.surfaceStyle)
      ? this.surfaceStyle
      : DEFAULT_SURFACE;
  }
  get resolvedSurfaceTone() {
    const itemTone = this.item?.surfaceTone;
    return resolveTone(itemTone, this.surfaceTone, DEFAULT_TONE);
  }
  get resolvedSurfaceHoverTone() {
    return resolveTone(
      this.item?.surfaceHoverTone,
      this.surfaceHoverTone,
      this.resolvedSurfaceTone
    );
  }
  get resolvedSurfaceSelectedTone() {
    return resolveTone(
      this.item?.surfaceSelectedTone,
      this.surfaceSelectedTone,
      "brand"
    );
  }
  get resolvedSurfaceDisabledTone() {
    return resolveTone(
      this.item?.surfaceDisabledTone,
      this.surfaceDisabledTone,
      "neutral"
    );
  }
  get resolvedIconDecor() {
    const itemDecor = this.item?.iconDecor;
    if (itemDecor && VALID_ICON_DECORS.has(itemDecor)) return itemDecor;
    return VALID_ICON_DECORS.has(this.iconDecor)
      ? this.iconDecor
      : DEFAULT_ICON_DECOR;
  }

  get resolvedIconShapeClass() {
    const decor = this.resolvedIconDecor;
    if (decor === "badge" || decor === "ring" || decor === "halo") {
      return "circle";
    }
    if (decor === "square") return "square";
    return "none";
  }

  get resolvedIconStyle() {
    const itemStyle = this.item?.iconStyle;
    if (itemStyle && VALID_ICON_STYLES.has(itemStyle)) return itemStyle;
    if (
      VALID_ICON_STYLES.has(this.iconStyle) &&
      this.resolvedIconDecor !== "none"
    ) {
      return this.iconStyle;
    }
    const decor = this.resolvedIconDecor;
    if (decor === "ring") return "outlined";
    if (decor === "halo") return "glow";
    if (decor === "badge") return "filled";
    if (decor === "square") return "filled";
    return DEFAULT_ICON_STYLE;
  }
  get resolvedIconShading() {
    const itemShading = this.item?.iconShading;
    if (itemShading && VALID_ICON_SHADINGS.has(itemShading)) return itemShading;
    return VALID_ICON_SHADINGS.has(this.iconShading)
      ? this.iconShading
      : DEFAULT_ICON_SHADING;
  }
  get resolvedIconTone() {
    const itemTone = this.item?.iconTone;
    return resolveTone(itemTone, this.iconTone, DEFAULT_ICON_TONE);
  }
  // Glyph tone — if not explicitly set, derive from iconTone. This keeps
  // legacy behaviour (single-color icon + decor) while enabling the split
  // when admin chooses it.
  //   - 'auto' or undefined → inherit from iconTone (legacy)
  //   - 'contrast'          → white for filled decoration, tone for others
  //   - any valid tone      → use that tone explicitly
  get resolvedIconGlyphTone() {
    const itemGlyph = this.item?.iconGlyphTone;
    if (itemGlyph && VALID_TONES.has(itemGlyph)) return itemGlyph;
    if (this.iconGlyphTone === "auto" || !this.iconGlyphTone) {
      // Glyph follows the decor tone, but for filled decoration
      // we render white text for contrast.
      return this.hasIconDecor && this.resolvedIconStyle === "filled"
        ? "contrast"
        : this.resolvedIconTone;
    }
    if (this.iconGlyphTone === "contrast") return "contrast";
    return VALID_TONES.has(this.iconGlyphTone)
      ? this.iconGlyphTone
      : this.resolvedIconTone;
  }
  get resolvedIconGlyphHex() {
    if (this.resolvedIconGlyphTone !== "custom") return "";
    return (
      safeHex(this.item?.iconGlyphToneHex) || safeHex(this.iconGlyphToneHex)
    );
  }
  // When tone='custom', resolve to the hex value (validated). Everything
  // else returns '' so the CSS class-based palette handles it.
  get resolvedIconHex() {
    if (this.resolvedIconTone !== "custom") return "";
    return safeHex(this.item?.iconToneHex) || safeHex(this.iconToneHex);
  }
  get resolvedPatternHex() {
    if (this.resolvedPatternTone !== "custom") return "";
    return resolveHex(this.item?.patternToneHex, this.patternToneHex);
  }
  get resolvedPatternHoverHex() {
    if (this.resolvedPatternHoverTone !== "custom") return "";
    return resolveHex(
      this.item?.patternHoverToneHex,
      this.patternHoverToneHex,
      this.resolvedPatternHex
    );
  }
  get resolvedPatternSelectedHex() {
    if (this.resolvedPatternSelectedTone !== "custom") return "";
    return resolveHex(
      this.item?.patternSelectedToneHex,
      this.patternSelectedToneHex,
      this.resolvedPatternHex
    );
  }
  get resolvedPatternDisabledHex() {
    if (this.resolvedPatternDisabledTone !== "custom") return "";
    return resolveHex(
      this.item?.patternDisabledToneHex,
      this.patternDisabledToneHex,
      this.resolvedPatternHex
    );
  }
  get resolvedCornerHex() {
    if (this.resolvedCornerTone !== "custom") return "";
    return safeHex(this.item?.cornerToneHex) || safeHex(this.cornerToneHex);
  }
  get resolvedSurfaceHex() {
    if (this.resolvedSurfaceTone !== "custom") return "";
    return resolveHex(this.item?.surfaceToneHex, this.surfaceToneHex);
  }
  get resolvedSurfaceHoverHex() {
    if (this.resolvedSurfaceHoverTone !== "custom") return "";
    return resolveHex(
      this.item?.surfaceHoverToneHex,
      this.surfaceHoverToneHex,
      this.resolvedSurfaceHex
    );
  }
  get resolvedSurfaceSelectedHex() {
    if (this.resolvedSurfaceSelectedTone !== "custom") return "";
    return resolveHex(
      this.item?.surfaceSelectedToneHex,
      this.surfaceSelectedToneHex,
      this.resolvedSurfaceHex
    );
  }
  get resolvedSurfaceDisabledHex() {
    if (this.resolvedSurfaceDisabledTone !== "custom") return "";
    return resolveHex(
      this.item?.surfaceDisabledToneHex,
      this.surfaceDisabledToneHex,
      this.resolvedSurfaceHex
    );
  }
  // Badge custom hex — active only when resolvedBadgeVariant === 'custom'.
  get resolvedBadgeHex() {
    if (this.resolvedBadgeVariant !== "custom") return "";
    return safeHex(this.item?.badgeVariantHex) || safeHex(this.badgeVariantHex);
  }

  // Inline style on the wrapper — sets CSS custom properties for any
  // 'custom' tone axes. This is the cleanest way to inject an arbitrary
  // hex without generating a class per color.
  get customColorStyle() {
    const parts = [];
    if (this.resolvedIconHex)
      parts.push(`--_icn-color-custom: ${this.resolvedIconHex}`);
    if (this.resolvedIconGlyphHex)
      parts.push(`--_icn-glyph-color-custom: ${this.resolvedIconGlyphHex}`);
    if (this.resolvedPatternHex)
      parts.push(`--_ptn-color-custom: ${this.resolvedPatternHex}`);
    if (this.resolvedPatternHoverHex)
      parts.push(`--_ptn-hover-color-custom: ${this.resolvedPatternHoverHex}`);
    if (this.resolvedPatternSelectedHex) {
      parts.push(
        `--_ptn-selected-color-custom: ${this.resolvedPatternSelectedHex}`
      );
    }
    if (this.resolvedPatternDisabledHex) {
      parts.push(
        `--_ptn-disabled-color-custom: ${this.resolvedPatternDisabledHex}`
      );
    }
    if (this.resolvedCornerHex)
      parts.push(`--_cnr-color-custom: ${this.resolvedCornerHex}`);
    if (this.resolvedSurfaceHex)
      parts.push(`--_srf-color-custom: ${this.resolvedSurfaceHex}`);
    if (this.resolvedSurfaceHoverHex)
      parts.push(`--_srf-hover-color-custom: ${this.resolvedSurfaceHoverHex}`);
    if (this.resolvedSurfaceSelectedHex) {
      parts.push(
        `--_srf-selected-color-custom: ${this.resolvedSurfaceSelectedHex}`
      );
    }
    if (this.resolvedSurfaceDisabledHex) {
      parts.push(
        `--_srf-disabled-color-custom: ${this.resolvedSurfaceDisabledHex}`
      );
    }
    if (this.resolvedBadgeHex)
      parts.push(`--_bdg-color-custom: ${this.resolvedBadgeHex}`);
    return parts.join("; ");
  }

  get hasIconDecor() {
    return this.resolvedIconDecor !== "none";
  }
  get iconWrapClass() {
    return [
      "newton-selector-choice-tile__icon-wrap",
      `newton-selector-choice-tile__icon-wrap_decor-${this.resolvedIconDecor}`,
      `newton-selector-choice-tile__icon-wrap_shape-${this.resolvedIconShapeClass}`,
      `newton-selector-choice-tile__icon-wrap_style-${this.resolvedIconStyle}`,
      `newton-selector-choice-tile__icon-wrap_shading-${this.resolvedIconShading}`,
      `newton-selector-choice-tile__icon-wrap_tone-${this.resolvedIconTone}`,
      `newton-selector-choice-tile__icon-wrap_glyph-${this.resolvedIconGlyphTone}`
    ].join(" ");
  }
  // Icon decorations use Lucide glyphs, so CSS owns the color consistently.
  get iconVariant() {
    if (this.hasIconDecor) return "";

    const tone = this.resolvedIconTone;
    if (tone === "error") return "error";
    if (tone === "warning") return "warning";
    if (tone === "success") return "success";
    return "";
  }
  get badgeClass() {
    return [
      "newton-selector-choice-tile__badge",
      `newton-selector-choice-tile__badge_pos-${this.resolvedBadgePosition}`,
      `newton-selector-choice-tile__badge_variant-${this.resolvedBadgeVariant}`,
      `newton-selector-choice-tile__badge_shape-${this.resolvedBadgeShape}`
    ].join(" ");
  }

  get isList() {
    return this.resolvedVariant === VARIANT_LIST;
  }
  get isMulti() {
    return this.selectionMode === MODE_MULTI;
  }

  get inputType() {
    return this.isMulti ? "checkbox" : "radio";
  }
  get inputName() {
    return this.isMulti ? "" : this.groupName;
  }
  get inputId() {
    const key = this.item?.id || this.item?.value || "x";
    return `newton-pick-${key}`;
  }
  get helpId() {
    return `${this.inputId}-help`;
  }
  get hasHelp() {
    return Boolean(this.item?.helpText);
  }
  // Per-item badge text AND the global showBadges switch must both be true.
  // Admin can flip showBadges=false at the selector level to blanket-hide
  // all badges even when items carry badge values.
  get hasBadge() {
    return Boolean(this.item?.badge) && !isExplicitFalse(this.showBadges);
  }
  get hasShape() {
    const s = this.item?.shape;
    return Boolean(s && (s.width || s.height));
  }
  // Shape is an optional geometric visual that takes
  // priority over the icon when present. Useful for conveying aspect
  // ratios or size tiers directly with proportional geometry.
  // Shape beats icon, and both respect the global showIcons switch.
  get hasIcon() {
    return (
      !this.hasShape &&
      Boolean(this.item?.icon) &&
      !isExplicitFalse(this.showIcons)
    );
  }
  get hasSublabel() {
    return Boolean(this.item?.sublabel);
  }
  get isDisabled() {
    return this.disabled || Boolean(this.item?.disabled);
  }

  get shapeStyle() {
    const s = this.item?.shape;
    if (!s) return "";
    const parts = [];
    if (s.width) parts.push(`width:${s.width}`);
    if (s.height) parts.push(`height:${s.height}`);
    if (s.radius) parts.push(`border-radius:${s.radius}`);
    return parts.join(";");
  }

  get wrapperClass() {
    const parts = [
      "newton-selector-choice-tile",
      `newton-selector-choice-tile_${this.resolvedVariant}`,
      `newton-selector-choice-tile_size-${this.resolvedSize}`,
      `newton-selector-choice-tile_aspect-${aspectClassKey(this.resolvedAspect)}`,
      `newton-selector-choice-tile_sel-${this.resolvedSelectionIndicator}`,
      `newton-selector-choice-tile_elev-${this.resolvedElevation}`,
      `newton-selector-choice-tile_pattern-${this.resolvedPattern}`,
      `newton-selector-choice-tile_ptone-${this.resolvedPatternTone}`,
      `newton-selector-choice-tile_phtone-${this.resolvedPatternHoverTone}`,
      `newton-selector-choice-tile_pstone-${this.resolvedPatternSelectedTone}`,
      `newton-selector-choice-tile_pdtone-${this.resolvedPatternDisabledTone}`,
      `newton-selector-choice-tile_corner-${this.resolvedCornerStyle}`,
      `newton-selector-choice-tile_ctone-${this.resolvedCornerTone}`,
      `newton-selector-choice-tile_surface-${this.resolvedSurfaceStyle}`,
      `newton-selector-choice-tile_stone-${this.resolvedSurfaceTone}`,
      `newton-selector-choice-tile_shtone-${this.resolvedSurfaceHoverTone}`,
      `newton-selector-choice-tile_sstone-${this.resolvedSurfaceSelectedTone}`,
      `newton-selector-choice-tile_sdtone-${this.resolvedSurfaceDisabledTone}`
    ];
    if (this.selected) parts.push("newton-selector-choice-tile_selected");
    if (this.isDisabled) parts.push("newton-selector-choice-tile_disabled");
    return parts.join(" ");
  }

  handleChange() {
    if (this.isDisabled) return;
    this.dispatchEvent(
      new CustomEvent("cardselect", {
        detail: { value: this.item?.value, id: this.item?.id },
        bubbles: true,
        composed: false
      })
    );
  }
}
