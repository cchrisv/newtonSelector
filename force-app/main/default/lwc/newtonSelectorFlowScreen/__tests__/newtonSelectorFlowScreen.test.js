import { createElement } from "lwc";
import NewtonSelectorFlowScreen from "c/newtonSelectorFlowScreen";

function mount(configOverrides = {}) {
  const config = {
    dataSource: "custom",
    layout: "grid",
    selectionMode: "single",
    autoAdvance: false,
    label: "Choose one",
    custom: { items: [{ label: "A", value: "a" }] },
    ...configOverrides
  };
  const el = createElement("c-newton-selector-flow-screen", {
    is: NewtonSelectorFlowScreen
  });
  el.selectorConfigJson = JSON.stringify(config);
  document.body.appendChild(el);
  return el;
}

describe("c-newton-selector-flow-screen", () => {
  afterEach(() => {
    while (document.body.firstChild)
      document.body.removeChild(document.body.firstChild);
  });

  it("parses selectorConfigJson and passes to data selector", async () => {
    const el = mount();
    await Promise.resolve();
    const dataSelector = el.shadowRoot.querySelector(
      "c-newton-selector-data-selector"
    );
    expect(dataSelector).not.toBeNull();
    expect(dataSelector.label).toBe("Choose one");
    expect(dataSelector.sourceType).toBe("custom");
  });

  it("falls back to defaults on malformed JSON", async () => {
    const el = createElement("c-newton-selector-flow-screen", {
      is: NewtonSelectorFlowScreen
    });
    el.selectorConfigJson = "{ not valid";
    document.body.appendChild(el);
    await Promise.resolve();
    const dataSelector = el.shadowRoot.querySelector(
      "c-newton-selector-data-selector"
    );
    expect(dataSelector.sourceType).toBe("custom");
  });

  it("validate() delegates to the data selector", async () => {
    const el = mount();
    await Promise.resolve();
    const result = el.validate();
    expect(result).toBeDefined();
    expect(result.isValid).toBeDefined();
  });

  it("selectionCount starts at 0", async () => {
    const el = mount();
    await Promise.resolve();
    expect(el.selectionCount).toBe(0);
  });

  it("selectionCount is 1 after single-select value change", async () => {
    const el = mount({ selectionMode: "single" });
    await Promise.resolve();
    const dataSelector = el.shadowRoot.querySelector(
      "c-newton-selector-data-selector"
    );
    const events = [];
    el.addEventListener("flowattributechange", (e) => events.push(e));
    dataSelector.dispatchEvent(
      new CustomEvent("valuechange", {
        detail: {
          value: "a",
          values: [],
          record: null,
          records: [],
          label: "A",
          labels: []
        },
        bubbles: true
      })
    );
    expect(el.selectionCount).toBe(1);
    const countEvent = events.find(
      (e) => e.detail?.attributeName === "selectionCount"
    );
    expect(countEvent?.detail?.attributeValue).toBe(1);
  });

  it("selectionCount is 0 when single-select is cleared", async () => {
    const el = mount({ selectionMode: "single" });
    await Promise.resolve();
    const dataSelector = el.shadowRoot.querySelector(
      "c-newton-selector-data-selector"
    );
    dataSelector.dispatchEvent(
      new CustomEvent("valuechange", {
        detail: {
          value: "",
          values: [],
          record: null,
          records: [],
          label: "",
          labels: []
        },
        bubbles: true
      })
    );
    expect(el.selectionCount).toBe(0);
  });

  it("selectionCount reflects multi-select count", async () => {
    const el = mount({ selectionMode: "multi" });
    await Promise.resolve();
    const dataSelector = el.shadowRoot.querySelector(
      "c-newton-selector-data-selector"
    );
    const events = [];
    el.addEventListener("flowattributechange", (e) => events.push(e));
    dataSelector.dispatchEvent(
      new CustomEvent("valuechange", {
        detail: {
          value: "",
          values: ["a", "b", "c"],
          record: null,
          records: [],
          label: "",
          labels: ["A", "B", "C"]
        },
        bubbles: true
      })
    );
    expect(el.selectionCount).toBe(3);
    const countEvent = events.find(
      (e) => e.detail?.attributeName === "selectionCount"
    );
    expect(countEvent?.detail?.attributeValue).toBe(3);
  });
});
