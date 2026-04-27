import { createElement } from "lwc";
import NewtonSelectorFlowCpeConfigPreview from "c/newtonSelectorFlowCpeConfigPreview";

const FULL_CONFIG = {
  dataSource: "custom",
  layout: "grid",
  selectionMode: "multi",
  required: true,
  minSelections: 1,
  maxSelections: 3,
  enableSearch: true,
  showSelectAll: true,
  includeNoneOption: true,
  noneOptionLabel: "No pick",
  noneOptionPosition: "end",
  label: "Choose records",
  helpText: "Use the best fit.",
  fieldLevelHelp: "Shown beside the label.",
  emptyStateMessage: "Nothing here.",
  errorStateMessage: "Load failed.",
  custom: {
    items: [
      { label: "Beta", value: "b", badge: "B" },
      { label: "Alpha", value: "a", badge: "A" }
    ]
  },
  overrides: {
    b: { label: "Beta override", icon: "building-2" }
  },
  display: { sortBy: "label", sortDirection: "desc", limit: 1 },
  gridConfig: {
    minWidth: "18rem",
    gapH: "8",
    gapV: "6",
    margin: {
      top: "1",
      right: "2",
      bottom: "3",
      left: "4"
    },
    padding: {
      top: "5",
      right: "6",
      bottom: "7",
      left: "8"
    },
    size: "large",
    aspectRatio: "16:9",
    badge: {
      position: "top-left",
      variant: "custom",
      shape: "square",
      variantHex: "#123456"
    },
    columns: 3,
    selectionIndicator: "pulse",
    elevation: "elevated",
    pattern: "dots",
    patternTone: "brand",
    patternToneHex: "#234567",
    cornerStyle: "brackets",
    cornerTone: "success",
    cornerToneHex: "#345678",
    surfaceStyle: "gradient-radial",
    surfaceTone: "teal",
    surfaceToneHex: "#456789",
    iconDecor: "none",
    iconStyle: "outlined",
    iconShading: "gradient",
    iconTone: "warning",
    iconToneHex: "#56789a",
    iconGlyphTone: "pink",
    iconGlyphToneHex: "#6789ab",
    iconSize: "small",
    showIcons: false,
    showBadges: false
  }
};

function mount(config = FULL_CONFIG, extra = {}) {
  const element = createElement("c-newton-selector-flow-cpe-config-preview", {
    is: NewtonSelectorFlowCpeConfigPreview
  });
  element.config = config;
  Object.assign(element, extra);
  document.body.appendChild(element);
  return element;
}

function getPreviewPicker(element) {
  return element.shadowRoot.querySelector("c-newton-selector-data-selector");
}

describe("c-newton-selector-flow-cpe-config-preview", () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  it("passes every visual and behavior config option into the live preview", async () => {
    const element = mount();
    await Promise.resolve();

    const picker = getPreviewPicker(element);
    expect(picker).not.toBeNull();
    expect(picker.label).toBe("Choose records");
    expect(picker.helpText).toBe("Use the best fit.");
    expect(picker.fieldLevelHelp).toBe("Shown beside the label.");
    expect(picker.sourceType).toBe("custom");
    expect(picker.layout).toBe("grid");
    expect(picker.selectionMode).toBe("multi");
    expect(picker.required).toBe(true);
    expect(picker.minSelections).toBe(1);
    expect(picker.maxSelections).toBe(3);
    expect(picker.enableSearch).toBe(true);
    expect(picker.showSelectAll).toBe(true);
    expect(picker.includeNoneOption).toBe(true);
    expect(picker.noneOptionLabel).toBe("No pick");
    expect(picker.noneOptionPosition).toBe("end");
    expect(picker.emptyStateMessage).toBe("Nothing here.");
    expect(picker.errorStateMessage).toBe("Load failed.");
    expect(picker.customConfig).toEqual(FULL_CONFIG.custom);
    expect(picker.overrides).toEqual(FULL_CONFIG.overrides);
    expect(picker.displayConfig).toEqual(FULL_CONFIG.display);

    expect(picker.gridMinWidth).toBe("18rem");
    expect(picker.gapHorizontal).toBe("8");
    expect(picker.gapVertical).toBe("6");
    expect(picker.marginTop).toBe("1");
    expect(picker.marginRight).toBe("2");
    expect(picker.marginBottom).toBe("3");
    expect(picker.marginLeft).toBe("4");
    expect(picker.paddingTop).toBe("5");
    expect(picker.paddingRight).toBe("6");
    expect(picker.paddingBottom).toBe("7");
    expect(picker.paddingLeft).toBe("8");
    expect(picker.size).toBe("large");
    expect(picker.aspectRatio).toBe("16:9");
    expect(picker.badgePosition).toBe("top-left");
    expect(picker.badgeVariant).toBe("custom");
    expect(picker.badgeShape).toBe("square");
    expect(picker.badgeVariantHex).toBe("#123456");
    expect(picker.columns).toBe(3);
    expect(picker.selectionIndicator).toBe("pulse");
    expect(picker.elevation).toBe("elevated");
    expect(picker.pattern).toBe("dots");
    expect(picker.patternTone).toBe("brand");
    expect(picker.patternToneHex).toBe("#234567");
    expect(picker.cornerStyle).toBe("brackets");
    expect(picker.cornerTone).toBe("success");
    expect(picker.cornerToneHex).toBe("#345678");
    expect(picker.surfaceStyle).toBe("gradient-radial");
    expect(picker.surfaceTone).toBe("teal");
    expect(picker.surfaceToneHex).toBe("#456789");
    expect(picker.iconDecor).toBe("none");
    expect(picker.iconStyle).toBe("outlined");
    expect(picker.iconShading).toBe("gradient");
    expect(picker.iconTone).toBe("warning");
    expect(picker.iconToneHex).toBe("#56789a");
    expect(picker.iconGlyphTone).toBe("pink");
    expect(picker.iconGlyphToneHex).toBe("#6789ab");
    expect(picker.iconSize).toBe("small");
    expect(picker.showIcons).toBe(false);
    expect(picker.showBadges).toBe(false);
  });

  it("routes fallback preview through the data picker so config still applies", async () => {
    const element = mount({
      ...FULL_CONFIG,
      dataSource: "collection",
      layout: "horizontal"
    });
    await Promise.resolve();

    const picker = getPreviewPicker(element);
    expect(picker.sourceType).toBe("custom");
    expect(picker.layout).toBe("horizontal");
    expect(picker.customConfig.items).toHaveLength(4);
    expect(picker.includeNoneOption).toBe(true);
    expect(picker.displayConfig).toEqual(FULL_CONFIG.display);
    expect(picker.selectionIndicator).toBe("pulse");
  });

  it("emits preview state changes from the preview tabs", () => {
    const element = mount();
    const handler = jest.fn();
    element.addEventListener("previewstatechange", handler);

    const errorTab = element.shadowRoot.querySelector('[data-state="error"]');
    errorTab.click();

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toBe("error");
  });
});
