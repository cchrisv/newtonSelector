import { createElement } from "lwc";

const mockClose = jest.fn();

jest.mock(
  "lightning/modal",
  () => {
    const { LightningElement } = require("lwc");
    return class extends LightningElement {
      close(value) {
        mockClose(value);
      }
    };
  },
  { virtual: true }
);

jest.mock(
  "c/newtonSelectorFlowCpeDataConfig",
  () => {
    const { LightningElement } = require("lwc");
    return class extends LightningElement {};
  },
  { virtual: true }
);
jest.mock(
  "c/newtonSelectorFlowCpeContentConfig",
  () => {
    const { LightningElement } = require("lwc");
    return class extends LightningElement {};
  },
  { virtual: true }
);
jest.mock(
  "c/newtonSelectorFlowCpeBehaviorConfig",
  () => {
    const { LightningElement } = require("lwc");
    return class extends LightningElement {};
  },
  { virtual: true }
);
jest.mock(
  "c/newtonSelectorFlowCpeAppearanceConfig",
  () => {
    const { LightningElement } = require("lwc");
    return class extends LightningElement {};
  },
  { virtual: true }
);

import NewtonSelectorFlowCpeConfigModal from "c/newtonSelectorFlowCpeConfigModal";

const VALID_CONFIG = {
  dataSource: "custom",
  label: "Choose one",
  selectionMode: "single",
  layout: "grid",
  helpText: "Pick carefully",
  custom: { items: [{ label: "One", value: "one" }] }
};

const BUILDER_CONTEXT = { variables: [] };

const AUTOMATIC_OUTPUTS = [{ name: "selectedLabel", dataType: "String" }];

function mount(props = {}) {
  const element = createElement("c-newton-selector-flow-cpe-config-modal", {
    is: NewtonSelectorFlowCpeConfigModal
  });
  Object.assign(element, props);
  document.body.appendChild(element);
  return element;
}

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
}

function child(element, selector) {
  return element.shadowRoot.querySelector(selector);
}

function saveButton(element) {
  return element.shadowRoot.querySelectorAll("lightning-button")[1];
}

describe("c-newton-selector-flow-cpe-config-modal", () => {
  beforeEach(() => {
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    console.warn.mockRestore();
    mockClose.mockClear();
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  it("initializes merged config and source refs for extracted chapters", () => {
    const element = mount({
      initialConfig: VALID_CONFIG,
      initialSourceRecordsRef: "{!records}",
      builderContext: BUILDER_CONTEXT,
      automaticOutputVariables: AUTOMATIC_OUTPUTS
    });

    const data = child(element, "c-newton-selector-flow-cpe-data-config");
    const content = child(element, "c-newton-selector-flow-cpe-content-config");
    const behavior = child(
      element,
      "c-newton-selector-flow-cpe-behavior-config"
    );
    const appearance = child(
      element,
      "c-newton-selector-flow-cpe-appearance-config"
    );

    expect(data.config.dataSource).toBe("custom");
    expect(data.sourceRecordsRef).toBe("{!records}");
    expect(content.config.label).toBe("Choose one");
    expect(behavior.config.selectionMode).toBe("single");
    expect(appearance.config.layout).toBe("grid");
    expect(data.builderContext).toEqual(BUILDER_CONTEXT);
    expect(content.builderContext).toEqual(BUILDER_CONTEXT);
    expect(behavior.automaticOutputVariables).toEqual(AUTOMATIC_OUTPUTS);
  });

  it("applies child configpatch and refchange events", async () => {
    const element = mount({ initialConfig: VALID_CONFIG });
    const data = child(element, "c-newton-selector-flow-cpe-data-config");

    data.dispatchEvent(
      new CustomEvent("configpatch", {
        detail: { path: ["label"], value: "Updated label" }
      })
    );
    data.dispatchEvent(
      new CustomEvent("refchange", {
        detail: { name: "sourceRecordsRef", value: "{!newRecords}" }
      })
    );
    await flush();

    const content = child(element, "c-newton-selector-flow-cpe-content-config");
    const nextData = child(element, "c-newton-selector-flow-cpe-data-config");
    expect(content.config.label).toBe("Updated label");
    expect(nextData.sourceRecordsRef).toBe("{!newRecords}");
  });

  it("applies root replacement patches from extracted children", async () => {
    const element = mount({ initialConfig: VALID_CONFIG });
    const behavior = child(
      element,
      "c-newton-selector-flow-cpe-behavior-config"
    );
    const replacement = {
      ...VALID_CONFIG,
      dataSource: "collection",
      selectionMode: "multi"
    };

    behavior.dispatchEvent(
      new CustomEvent("configpatch", {
        detail: { path: [], value: replacement }
      })
    );
    await flush();

    const data = child(element, "c-newton-selector-flow-cpe-data-config");
    const appearance = child(
      element,
      "c-newton-selector-flow-cpe-appearance-config"
    );
    expect(data.config.dataSource).toBe("collection");
    expect(appearance.config.selectionMode).toBe("multi");
  });

  it("ignores unknown ref changes", async () => {
    const element = mount({ initialConfig: VALID_CONFIG });
    const data = child(element, "c-newton-selector-flow-cpe-data-config");

    data.dispatchEvent(
      new CustomEvent("refchange", {
        detail: { name: "otherRef", value: "{!ignored}" }
      })
    );
    await flush();

    const nextData = child(element, "c-newton-selector-flow-cpe-data-config");
    expect(nextData.sourceRecordsRef).toBe("");
  });

  it("tracks active chapter and splitter width from the studio template", async () => {
    const element = mount({ initialConfig: VALID_CONFIG });
    const studio = child(element, "c-newton-selector-flow-cpe-studio");

    studio.dispatchEvent(
      new CustomEvent("activechapterchange", { detail: "appearance" })
    );
    studio.dispatchEvent(new CustomEvent("leftwidthchange", { detail: 448 }));
    await flush();

    const nextStudio = child(element, "c-newton-selector-flow-cpe-studio");
    expect(nextStudio.leftWidth).toBe(448);
    expect(
      nextStudio.sections.find((section) => section.key === "appearance").active
    ).toBe(true);
  });

  it("tracks section clicks and toggles forced preview state", async () => {
    const element = mount({ initialConfig: VALID_CONFIG });
    const studio = child(element, "c-newton-selector-flow-cpe-studio");
    const preview = child(element, "c-newton-selector-flow-cpe-config-preview");

    studio.dispatchEvent(
      new CustomEvent("sectionclick", { detail: { key: "content" } })
    );
    preview.dispatchEvent(
      new CustomEvent("previewstatechange", { detail: { state: "empty" } })
    );
    await flush();

    let nextStudio = child(element, "c-newton-selector-flow-cpe-studio");
    let nextPreview = child(
      element,
      "c-newton-selector-flow-cpe-config-preview"
    );
    expect(
      nextStudio.sections.find((section) => section.key === "content").active
    ).toBe(true);
    expect(nextPreview.forcedState).toBe("empty");

    nextPreview.dispatchEvent(
      new CustomEvent("previewstatechange", { detail: "empty" })
    );
    await flush();

    nextPreview = child(element, "c-newton-selector-flow-cpe-config-preview");
    expect(nextPreview.forcedState).toBe("");
  });

  it("blocks save while validation has section errors", () => {
    const element = mount({
      initialConfig: { ...VALID_CONFIG, dataSource: "" }
    });
    const button = saveButton(element);
    expect(button.disabled).toBe(true);
    expect(button.title).toContain("Fix");

    button.click();
    expect(mockClose).not.toHaveBeenCalled();
  });

  it.each([
    [
      "collection mode has no Flow record binding",
      {
        ...VALID_CONFIG,
        dataSource: "collection",
        collection: { fieldMap: { label: "Name" } }
      },
      {},
      "Flow record collection"
    ],
    [
      "collection mode has no label field mapping",
      {
        ...VALID_CONFIG,
        dataSource: "collection",
        collection: { fieldMap: { label: "" } }
      },
      { initialSourceRecordsRef: "{!records}" },
      "Label field"
    ],
    [
      "custom mode has no options",
      { ...VALID_CONFIG, dataSource: "custom", custom: { items: [] } },
      {},
      "custom item"
    ]
  ])("blocks save when %s", (_, initialConfig, props, issueText) => {
    const element = mount({ initialConfig, ...props });

    expect(saveButton(element).disabled).toBe(true);
    saveButton(element).click();
    expect(mockClose).not.toHaveBeenCalled();
    expect(element.shadowRoot.textContent).toContain(issueText);
  });

  it("blocks save after a child patch creates an invalid collection config", async () => {
    const element = mount({
      initialConfig: VALID_CONFIG,
      initialSourceRecordsRef: "{!records}"
    });
    const data = child(element, "c-newton-selector-flow-cpe-data-config");

    data.dispatchEvent(
      new CustomEvent("configpatch", {
        detail: {
          path: [],
          value: {
            ...VALID_CONFIG,
            dataSource: "collection",
            collection: { fieldMap: { label: "" } }
          }
        }
      })
    );
    await flush();

    expect(saveButton(element).disabled).toBe(true);
    expect(element.shadowRoot.textContent).toContain("Label field");
  });

  it("preserves save and cancel payloads", () => {
    const element = mount({
      initialConfig: VALID_CONFIG,
      initialSourceRecordsRef: "{!records}"
    });
    const buttons = element.shadowRoot.querySelectorAll("lightning-button");
    buttons[1].click();
    expect(mockClose).toHaveBeenCalledWith({
      action: "save",
      config: expect.objectContaining({ dataSource: "custom" }),
      sourceRecordsRef: "{!records}"
    });

    buttons[0].click();
    expect(mockClose).toHaveBeenCalledWith({ action: "cancel" });
  });
});
