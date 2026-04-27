import { createElement } from "lwc";
import NewtonFlowSelector from "c/newtonFlowSelector";

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
  const el = createElement("c-newton-flow-selector", {
    is: NewtonFlowSelector
  });
  el.pickerConfigJson = JSON.stringify(config);
  document.body.appendChild(el);
  return el;
}

describe("c-newton-flow-selector", () => {
  afterEach(() => {
    while (document.body.firstChild)
      document.body.removeChild(document.body.firstChild);
  });

  it("parses pickerConfigJson and passes to organism", async () => {
    const el = mount();
    await Promise.resolve();
    const organism = el.shadowRoot.querySelector(
      "c-newton-organism-data-selector"
    );
    expect(organism).not.toBeNull();
    expect(organism.label).toBe("Choose one");
    expect(organism.sourceType).toBe("custom");
  });

  it("falls back to defaults on malformed JSON", async () => {
    const el = createElement("c-newton-flow-selector", {
      is: NewtonFlowSelector
    });
    el.pickerConfigJson = "{ not valid";
    document.body.appendChild(el);
    await Promise.resolve();
    const organism = el.shadowRoot.querySelector(
      "c-newton-organism-data-selector"
    );
    expect(organism.sourceType).toBe("custom");
  });

  it("validate() delegates to the organism", async () => {
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
    const organism = el.shadowRoot.querySelector(
      "c-newton-organism-data-selector"
    );
    const events = [];
    el.addEventListener("flowattributechange", (e) => events.push(e));
    organism.dispatchEvent(
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
    const organism = el.shadowRoot.querySelector(
      "c-newton-organism-data-selector"
    );
    organism.dispatchEvent(
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
    const organism = el.shadowRoot.querySelector(
      "c-newton-organism-data-selector"
    );
    const events = [];
    el.addEventListener("flowattributechange", (e) => events.push(e));
    organism.dispatchEvent(
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
