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

function getPreviewSelector(element) {
  return element.shadowRoot.querySelector("c-newton-selector-data-selector");
}

describe("c-newton-selector-flow-cpe-config-preview", () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  it("passes every visual and behavior config option into the runtime preview", async () => {
    const element = mount();
    await Promise.resolve();

    const selector = getPreviewSelector(element);
    expect(selector).not.toBeNull();
    expect(selector.label).toBe("Choose records");
    expect(selector.helpText).toBe("Use the best fit.");
    expect(selector.fieldLevelHelp).toBe("Shown beside the label.");
    expect(selector.sourceType).toBe("custom");
    expect(selector.layout).toBe("grid");
    expect(selector.selectionMode).toBe("multi");
    expect(selector.required).toBe(true);
    expect(selector.minSelections).toBe(1);
    expect(selector.maxSelections).toBe(3);
    expect(selector.enableSearch).toBe(true);
    expect(selector.showSelectAll).toBe(true);
    expect(selector.includeNoneOption).toBe(true);
    expect(selector.noneOptionLabel).toBe("No pick");
    expect(selector.noneOptionPosition).toBe("end");
    expect(selector.emptyStateMessage).toBe("Nothing here.");
    expect(selector.errorStateMessage).toBe("Load failed.");
    expect(selector.customConfig.items).toEqual([
      expect.objectContaining({ label: "Beta", value: "b" }),
      expect.objectContaining({ label: "Alpha", value: "a" })
    ]);
    expect(selector.overrides).toEqual(FULL_CONFIG.overrides);
    expect(selector.displayConfig).toEqual(FULL_CONFIG.display);
    expect(selector.refreshKey).toContain('"dataSource":"custom"');

    expect(selector.gridMinWidth).toBe("18rem");
    expect(selector.gapHorizontal).toBe("8");
    expect(selector.gapVertical).toBe("6");
    expect(selector.marginTop).toBe("1");
    expect(selector.marginRight).toBe("2");
    expect(selector.marginBottom).toBe("3");
    expect(selector.marginLeft).toBe("4");
    expect(selector.paddingTop).toBe("5");
    expect(selector.paddingRight).toBe("6");
    expect(selector.paddingBottom).toBe("7");
    expect(selector.paddingLeft).toBe("8");
    expect(selector.size).toBe("large");
    expect(selector.aspectRatio).toBe("16:9");
    expect(selector.badgePosition).toBe("top-left");
    expect(selector.badgeVariant).toBe("custom");
    expect(selector.badgeShape).toBe("square");
    expect(selector.badgeVariantHex).toBe("#123456");
    expect(selector.columns).toBe(3);
    expect(selector.selectionIndicator).toBe("pulse");
    expect(selector.elevation).toBe("elevated");
    expect(selector.pattern).toBe("dots");
    expect(selector.patternTone).toBe("brand");
    expect(selector.patternToneHex).toBe("#234567");
    expect(selector.cornerStyle).toBe("brackets");
    expect(selector.cornerTone).toBe("success");
    expect(selector.cornerToneHex).toBe("#345678");
    expect(selector.surfaceStyle).toBe("gradient-radial");
    expect(selector.surfaceTone).toBe("teal");
    expect(selector.surfaceToneHex).toBe("#456789");
    expect(selector.iconDecor).toBe("none");
    expect(selector.iconStyle).toBe("outlined");
    expect(selector.iconShading).toBe("gradient");
    expect(selector.iconTone).toBe("warning");
    expect(selector.iconToneHex).toBe("#56789a");
    expect(selector.iconGlyphTone).toBe("pink");
    expect(selector.iconGlyphToneHex).toBe("#6789ab");
    expect(selector.iconSize).toBe("small");
    expect(selector.showIcons).toBe(false);
    expect(selector.showBadges).toBe(false);
  });

  it("uses deterministic mock data for non-custom sources without live configs", async () => {
    const element = mount({
      ...FULL_CONFIG,
      dataSource: "collection",
      layout: "horizontal",
      custom: { items: [] }
    });
    await Promise.resolve();

    const selector = getPreviewSelector(element);
    expect(selector.sourceType).toBe("custom");
    expect(selector.layout).toBe("horizontal");
    expect(selector.picklistConfig).toBeUndefined();
    expect(selector.collectionConfig).toBeUndefined();
    expect(selector.sobjectConfig).toBeUndefined();
    expect(selector.customConfig.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Serena Williams",
          sublabel: expect.stringContaining("Preview sample record")
        })
      ])
    );
    expect(selector.includeNoneOption).toBe(true);
    expect(selector.displayConfig).toEqual(FULL_CONFIG.display);
    expect(selector.selectionIndicator).toBe("pulse");
  });

  it("keeps the preview synchronized when the CPE config changes", async () => {
    const element = mount();
    await Promise.resolve();

    const initialSelector = getPreviewSelector(element);
    const initialRefreshKey = initialSelector.refreshKey;

    element.config = {
      ...FULL_CONFIG,
      label: "Updated preview label",
      layout: "list",
      selectionMode: "single",
      gridConfig: {
        ...FULL_CONFIG.gridConfig,
        size: "small",
        surfaceTone: "purple"
      }
    };
    await Promise.resolve();

    const selector = getPreviewSelector(element);
    expect(selector.label).toBe("Updated preview label");
    expect(selector.layout).toBe("list");
    expect(selector.selectionMode).toBe("single");
    expect(selector.size).toBe("small");
    expect(selector.surfaceTone).toBe("purple");
    expect(selector.refreshKey).not.toBe(initialRefreshKey);
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
