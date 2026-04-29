import { createElement } from "lwc";
import NewtonSelectorChoiceTile from "c/newtonSelectorChoiceTile";

const SAMPLE_ITEM = {
  id: "i-1",
  label: "First option",
  sublabel: "Helpful subtitle",
  icon: "building-2",
  badge: "New",
  helpText: "Hover for info",
  value: "first",
  disabled: false
};

function mount(overrides = {}) {
  const el = createElement("c-newton-selector-choice-tile", {
    is: NewtonSelectorChoiceTile
  });
  el.item = { ...SAMPLE_ITEM, ...(overrides.item || {}) };
  if (overrides.variant !== undefined) el.variant = overrides.variant;
  if (overrides.selected !== undefined) el.selected = overrides.selected;
  if (overrides.selectionMode !== undefined)
    el.selectionMode = overrides.selectionMode;
  if (overrides.disabled !== undefined) el.disabled = overrides.disabled;
  if (overrides.groupName !== undefined) el.groupName = overrides.groupName;
  if (overrides.size !== undefined) el.size = overrides.size;
  if (overrides.aspectRatio !== undefined)
    el.aspectRatio = overrides.aspectRatio;
  if (overrides.badgePosition !== undefined)
    el.badgePosition = overrides.badgePosition;
  if (overrides.badgeVariant !== undefined)
    el.badgeVariant = overrides.badgeVariant;
  if (overrides.badgeShape !== undefined) el.badgeShape = overrides.badgeShape;
  if (overrides.selectionIndicator !== undefined)
    el.selectionIndicator = overrides.selectionIndicator;
  if (overrides.elevation !== undefined) el.elevation = overrides.elevation;
  if (overrides.pattern !== undefined) el.pattern = overrides.pattern;
  if (overrides.patternTone !== undefined)
    el.patternTone = overrides.patternTone;
  if (overrides.patternHoverTone !== undefined)
    el.patternHoverTone = overrides.patternHoverTone;
  if (overrides.patternSelectedTone !== undefined)
    el.patternSelectedTone = overrides.patternSelectedTone;
  if (overrides.patternDisabledTone !== undefined)
    el.patternDisabledTone = overrides.patternDisabledTone;
  if (overrides.surfaceStyle !== undefined)
    el.surfaceStyle = overrides.surfaceStyle;
  if (overrides.surfaceTone !== undefined)
    el.surfaceTone = overrides.surfaceTone;
  if (overrides.surfaceHoverTone !== undefined)
    el.surfaceHoverTone = overrides.surfaceHoverTone;
  if (overrides.surfaceSelectedTone !== undefined)
    el.surfaceSelectedTone = overrides.surfaceSelectedTone;
  if (overrides.surfaceDisabledTone !== undefined)
    el.surfaceDisabledTone = overrides.surfaceDisabledTone;
  if (overrides.patternToneHex !== undefined)
    el.patternToneHex = overrides.patternToneHex;
  if (overrides.patternHoverToneHex !== undefined)
    el.patternHoverToneHex = overrides.patternHoverToneHex;
  if (overrides.patternSelectedToneHex !== undefined)
    el.patternSelectedToneHex = overrides.patternSelectedToneHex;
  if (overrides.patternDisabledToneHex !== undefined)
    el.patternDisabledToneHex = overrides.patternDisabledToneHex;
  if (overrides.surfaceToneHex !== undefined)
    el.surfaceToneHex = overrides.surfaceToneHex;
  if (overrides.surfaceHoverToneHex !== undefined)
    el.surfaceHoverToneHex = overrides.surfaceHoverToneHex;
  if (overrides.surfaceSelectedToneHex !== undefined)
    el.surfaceSelectedToneHex = overrides.surfaceSelectedToneHex;
  if (overrides.surfaceDisabledToneHex !== undefined)
    el.surfaceDisabledToneHex = overrides.surfaceDisabledToneHex;
  if (overrides.iconDecor !== undefined) el.iconDecor = overrides.iconDecor;
  if (overrides.iconStyle !== undefined) el.iconStyle = overrides.iconStyle;
  if (overrides.iconTone !== undefined) el.iconTone = overrides.iconTone;
  if (overrides.showIcons !== undefined) el.showIcons = overrides.showIcons;
  if (overrides.showBadges !== undefined) el.showBadges = overrides.showBadges;
  document.body.appendChild(el);
  return el;
}

describe("c-newton-selector-choice-tile", () => {
  afterEach(() => {
    while (document.body.firstChild)
      document.body.removeChild(document.body.firstChild);
  });

  it("renders title, sub, and badge in grid variant", () => {
    const el = mount();
    const title = el.shadowRoot.querySelector(
      ".newton-selector-choice-tile__title"
    );
    const sub = el.shadowRoot.querySelector(
      ".newton-selector-choice-tile__sub"
    );
    const badge = el.shadowRoot.querySelector(
      ".newton-selector-choice-tile__badge"
    );
    expect(title.textContent).toBe("First option");
    expect(sub.textContent).toBe("Helpful subtitle");
    expect(badge.textContent).toBe("New");
  });

  it("applies newton-selector-choice-tile_list modifier in list variant", () => {
    const el = mount({ variant: "list" });
    const wrapper = el.shadowRoot.querySelector(".newton-selector-choice-tile");
    expect(wrapper.classList.contains("newton-selector-choice-tile_list")).toBe(
      true
    );
  });

  it("applies newton-selector-choice-tile_grid modifier in grid variant", () => {
    const el = mount({ variant: "grid" });
    const wrapper = el.shadowRoot.querySelector(".newton-selector-choice-tile");
    expect(wrapper.classList.contains("newton-selector-choice-tile_grid")).toBe(
      true
    );
  });

  it("applies newton-selector-choice-tile_selected and checks the input when selected", () => {
    const el = mount({ selected: true });
    const wrapper = el.shadowRoot.querySelector(".newton-selector-choice-tile");
    const input = el.shadowRoot.querySelector("input");
    expect(
      wrapper.classList.contains("newton-selector-choice-tile_selected")
    ).toBe(true);
    expect(input.checked).toBe(true);
  });

  it("applies size modifier class", () => {
    const el = mount({ size: "large" });
    const wrapper = el.shadowRoot.querySelector(".newton-selector-choice-tile");
    expect(
      wrapper.classList.contains("newton-selector-choice-tile_size-large")
    ).toBe(true);
  });

  it("applies aspect modifier class for non-auto aspect", () => {
    const el = mount({ aspectRatio: "4:3" });
    const wrapper = el.shadowRoot.querySelector(".newton-selector-choice-tile");
    expect(
      wrapper.classList.contains("newton-selector-choice-tile_aspect-4-3")
    ).toBe(true);
  });

  it("defaults aspect to 1:1 when none specified", () => {
    const el = mount();
    const wrapper = el.shadowRoot.querySelector(".newton-selector-choice-tile");
    expect(
      wrapper.classList.contains("newton-selector-choice-tile_aspect-1-1")
    ).toBe(true);
  });

  it('normalizes legacy aspect="auto" to 1:1', () => {
    const el = mount({ aspectRatio: "auto" });
    const wrapper = el.shadowRoot.querySelector(".newton-selector-choice-tile");
    expect(
      wrapper.classList.contains("newton-selector-choice-tile_aspect-1-1")
    ).toBe(true);
  });

  it("renders a radio input with groupName in single-select mode", () => {
    const el = mount({ selectionMode: "single", groupName: "my-group" });
    const input = el.shadowRoot.querySelector("input");
    expect(input.type).toBe("radio");
    expect(input.name).toBe("my-group");
  });

  it("renders a checkbox input with empty name in multi-select mode", () => {
    const el = mount({ selectionMode: "multi" });
    const input = el.shadowRoot.querySelector("input");
    expect(input.type).toBe("checkbox");
    expect(input.name).toBe("");
  });

  it("dispatches cardselect on change with value and id", () => {
    const el = mount();
    const handler = jest.fn();
    el.addEventListener("cardselect", handler);
    const input = el.shadowRoot.querySelector("input");
    input.dispatchEvent(new CustomEvent("change"));
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toEqual({
      value: "first",
      id: "i-1"
    });
  });

  it("disables the input and suppresses events when disabled", () => {
    const el = mount({ disabled: true });
    const input = el.shadowRoot.querySelector("input");
    expect(input.disabled).toBe(true);
    const handler = jest.fn();
    el.addEventListener("cardselect", handler);
    input.dispatchEvent(new CustomEvent("change"));
    expect(handler).not.toHaveBeenCalled();
  });

  it("respects item.disabled", () => {
    const el = mount({ item: { disabled: true } });
    const input = el.shadowRoot.querySelector("input");
    expect(input.disabled).toBe(true);
  });

  it("renders helpText with aria-describedby target", () => {
    const el = mount();
    const input = el.shadowRoot.querySelector("input");
    const helpId = input.getAttribute("aria-describedby");
    expect(helpId).toBeTruthy();
    const helpEl = el.shadowRoot.querySelector(
      ".newton-selector-choice-tile__help"
    );
    expect(helpEl).not.toBeNull();
    expect(helpEl.getAttribute("id")).toBe(helpId);
    expect(helpEl.textContent).toBe("Hover for info");
  });

  it("defaults badge to inline + neutral + pill", () => {
    const el = mount();
    const badge = el.shadowRoot.querySelector(
      ".newton-selector-choice-tile__badge"
    );
    expect(
      badge.classList.contains(
        "newton-selector-choice-tile__badge_pos-bottom-inline"
      )
    ).toBe(true);
    expect(
      badge.classList.contains(
        "newton-selector-choice-tile__badge_variant-neutral"
      )
    ).toBe(true);
    expect(
      badge.classList.contains("newton-selector-choice-tile__badge_shape-pill")
    ).toBe(true);
  });

  it("applies badge position/variant/shape modifier classes", () => {
    const el = mount({
      badgePosition: "top-right",
      badgeVariant: "success",
      badgeShape: "square"
    });
    const badge = el.shadowRoot.querySelector(
      ".newton-selector-choice-tile__badge"
    );
    expect(
      badge.classList.contains(
        "newton-selector-choice-tile__badge_pos-top-right"
      )
    ).toBe(true);
    expect(
      badge.classList.contains(
        "newton-selector-choice-tile__badge_variant-success"
      )
    ).toBe(true);
    expect(
      badge.classList.contains(
        "newton-selector-choice-tile__badge_shape-square"
      )
    ).toBe(true);
  });

  it("normalizes invalid badge values to defaults", () => {
    const el = mount({
      badgePosition: "wacky",
      badgeVariant: "rainbow",
      badgeShape: "octagon"
    });
    const badge = el.shadowRoot.querySelector(
      ".newton-selector-choice-tile__badge"
    );
    expect(
      badge.classList.contains(
        "newton-selector-choice-tile__badge_pos-bottom-inline"
      )
    ).toBe(true);
    expect(
      badge.classList.contains(
        "newton-selector-choice-tile__badge_variant-neutral"
      )
    ).toBe(true);
    expect(
      badge.classList.contains("newton-selector-choice-tile__badge_shape-pill")
    ).toBe(true);
  });

  it("lets item.badgeVariant override the global variant", () => {
    const el = mount({
      badgeVariant: "neutral",
      item: { badgeVariant: "warning" }
    });
    const badge = el.shadowRoot.querySelector(
      ".newton-selector-choice-tile__badge"
    );
    expect(
      badge.classList.contains(
        "newton-selector-choice-tile__badge_variant-warning"
      )
    ).toBe(true);
    expect(
      badge.classList.contains(
        "newton-selector-choice-tile__badge_variant-neutral"
      )
    ).toBe(false);
  });

  it("applies the expanded selection indicator modifier classes", () => {
    ["fill", "bar", "frame", "ribbon", "pulse"].forEach((indicator) => {
      const el = mount({ selected: true, selectionIndicator: indicator });
      const wrapper = el.shadowRoot.querySelector(
        ".newton-selector-choice-tile"
      );
      expect(
        wrapper.classList.contains(
          `newton-selector-choice-tile_sel-${indicator}`
        )
      ).toBe(true);
      document.body.removeChild(el);
    });
  });

  it("normalizes removed spotlight selection indicator to frame", () => {
    const el = mount({ selectionIndicator: "spotlight" });
    const wrapper = el.shadowRoot.querySelector(".newton-selector-choice-tile");
    expect(
      wrapper.classList.contains("newton-selector-choice-tile_sel-frame")
    ).toBe(true);
    expect(
      wrapper.classList.contains("newton-selector-choice-tile_sel-spotlight")
    ).toBe(false);
  });

  it("normalizes invalid selection indicator values to frame", () => {
    const el = mount({ selectionIndicator: "sparkle" });
    const wrapper = el.shadowRoot.querySelector(".newton-selector-choice-tile");
    expect(
      wrapper.classList.contains("newton-selector-choice-tile_sel-frame")
    ).toBe(true);
  });

  it("applies redesigned elevation classes and legacy aliases", () => {
    ["plain", "subtle", "outlined", "raised", "floating", "inset"].forEach(
      (elevation) => {
        const el = mount({ elevation });
        const wrapper = el.shadowRoot.querySelector(
          ".newton-selector-choice-tile"
        );
        expect(
          wrapper.classList.contains(
            `newton-selector-choice-tile_elev-${elevation}`
          )
        ).toBe(true);
        document.body.removeChild(el);
      }
    );

    const flat = mount({ elevation: "flat" });
    expect(
      flat.shadowRoot
        .querySelector(".newton-selector-choice-tile")
        .classList.contains("newton-selector-choice-tile_elev-plain")
    ).toBe(true);
    document.body.removeChild(flat);

    const elevated = mount({ elevation: "elevated" });
    expect(
      elevated.shadowRoot
        .querySelector(".newton-selector-choice-tile")
        .classList.contains("newton-selector-choice-tile_elev-raised")
    ).toBe(true);
  });

  it("applies state-specific pattern and surface tone classes", () => {
    const el = mount({
      pattern: "dots",
      patternTone: "custom",
      patternHoverTone: "warning",
      patternSelectedTone: "custom",
      patternDisabledTone: "teal",
      patternToneHex: "#123456",
      patternSelectedToneHex: "#abcdef",
      surfaceStyle: "gradient-radial",
      surfaceTone: "violet",
      surfaceHoverTone: "success",
      surfaceSelectedTone: "custom",
      surfaceDisabledTone: "error",
      surfaceSelectedToneHex: "#654321"
    });
    const wrapper = el.shadowRoot.querySelector(".newton-selector-choice-tile");
    expect(
      wrapper.classList.contains("newton-selector-choice-tile_pattern-dots")
    ).toBe(true);
    expect(
      wrapper.classList.contains("newton-selector-choice-tile_ptone-custom")
    ).toBe(true);
    expect(
      wrapper.classList.contains("newton-selector-choice-tile_phtone-warning")
    ).toBe(true);
    expect(
      wrapper.classList.contains("newton-selector-choice-tile_pstone-custom")
    ).toBe(true);
    expect(
      wrapper.classList.contains("newton-selector-choice-tile_pdtone-teal")
    ).toBe(true);
    expect(
      wrapper.classList.contains(
        "newton-selector-choice-tile_surface-gradient-radial"
      )
    ).toBe(true);
    expect(
      wrapper.classList.contains("newton-selector-choice-tile_stone-violet")
    ).toBe(true);
    expect(
      wrapper.classList.contains("newton-selector-choice-tile_shtone-success")
    ).toBe(true);
    expect(
      wrapper.classList.contains("newton-selector-choice-tile_sstone-custom")
    ).toBe(true);
    expect(
      wrapper.classList.contains("newton-selector-choice-tile_sdtone-error")
    ).toBe(true);
    expect(wrapper.getAttribute("style")).toContain(
      "--_ptn-color-custom: #123456"
    );
    expect(wrapper.getAttribute("style")).toContain(
      "--_ptn-selected-color-custom: #abcdef"
    );
    expect(wrapper.getAttribute("style")).toContain(
      "--_srf-selected-color-custom: #654321"
    );
  });

  it("keeps no-decoration Lucide icons visible with the configured icon tone", () => {
    const el = mount({ iconDecor: "none", iconTone: "brand" });
    const iconWrap = el.shadowRoot.querySelector(
      ".newton-selector-choice-tile__icon-wrap"
    );
    expect(
      iconWrap.classList.contains(
        "newton-selector-choice-tile__icon-wrap_decor-none"
      )
    ).toBe(true);
    expect(
      iconWrap.classList.contains(
        "newton-selector-choice-tile__icon-wrap_tone-brand"
      )
    ).toBe(true);
    expect(
      iconWrap.classList.contains(
        "newton-selector-choice-tile__icon-wrap_glyph-brand"
      )
    ).toBe(true);
    expect(
      iconWrap.classList.contains(
        "newton-selector-choice-tile__icon-wrap_glyph-contrast"
      )
    ).toBe(false);
  });

  it("uses contrast glyphs only when a filled icon decoration is present", () => {
    const el = mount({
      iconDecor: "badge",
      iconStyle: "filled",
      iconTone: "brand"
    });
    const iconWrap = el.shadowRoot.querySelector(
      ".newton-selector-choice-tile__icon-wrap"
    );
    expect(
      iconWrap.classList.contains(
        "newton-selector-choice-tile__icon-wrap_decor-badge"
      )
    ).toBe(true);
    expect(
      iconWrap.classList.contains(
        "newton-selector-choice-tile__icon-wrap_shape-circle"
      )
    ).toBe(true);
    expect(
      iconWrap.classList.contains(
        "newton-selector-choice-tile__icon-wrap_glyph-contrast"
      )
    ).toBe(true);
  });

  it("renders geometric shapes inside the shared visual frame", () => {
    const el = mount({
      item: {
        icon: "expand",
        shape: { width: "2rem", height: "1rem" }
      }
    });
    const shapeWrap = el.shadowRoot.querySelector(
      ".newton-selector-choice-tile__shape-wrap"
    );
    const shape = el.shadowRoot.querySelector(
      ".newton-selector-choice-tile__shape"
    );

    expect(shapeWrap).not.toBeNull();
    expect(shape).not.toBeNull();
    expect(
      el.shadowRoot.querySelector(".newton-selector-choice-tile__icon-wrap")
    ).toBeNull();
  });

  it("defaults icon tiles to outlined square cells instead of soft placeholders", () => {
    const el = mount();
    const iconWrap = el.shadowRoot.querySelector(
      ".newton-selector-choice-tile__icon-wrap"
    );

    expect(
      iconWrap.classList.contains(
        "newton-selector-choice-tile__icon-wrap_style-outlined"
      )
    ).toBe(true);
    expect(
      iconWrap.classList.contains(
        "newton-selector-choice-tile__icon-wrap_shape-square"
      )
    ).toBe(true);
  });

  it("hides icons and badges for explicit false boolean or string values", () => {
    const boolOff = mount({ showIcons: false, showBadges: false });
    expect(
      boolOff.shadowRoot.querySelector(
        ".newton-selector-choice-tile__icon-wrap"
      )
    ).toBeNull();
    expect(
      boolOff.shadowRoot.querySelector(".newton-selector-choice-tile__badge")
    ).toBeNull();
    document.body.removeChild(boolOff);

    const stringOff = mount({ showIcons: "false", showBadges: "false" });
    expect(
      stringOff.shadowRoot.querySelector(
        ".newton-selector-choice-tile__icon-wrap"
      )
    ).toBeNull();
    expect(
      stringOff.shadowRoot.querySelector(".newton-selector-choice-tile__badge")
    ).toBeNull();
  });
});
