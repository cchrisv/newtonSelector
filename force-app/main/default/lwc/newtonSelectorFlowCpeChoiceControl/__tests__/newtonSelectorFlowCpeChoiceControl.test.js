import { createElement } from "lwc";
import NewtonSelectorFlowCpeChoiceControl from "c/newtonSelectorFlowCpeChoiceControl";

const ITEMS = [
  { label: "Alpha", value: "a", icon: "circle" },
  { label: "Beta", value: "b", icon: "square" }
];

function mount(overrides = {}) {
  const element = createElement("c-newton-selector-flow-cpe-choice-control", {
    is: NewtonSelectorFlowCpeChoiceControl
  });
  Object.assign(
    element,
    {
      label: "Choice",
      items: ITEMS,
      value: "a"
    },
    overrides
  );
  document.body.appendChild(element);
  return element;
}

describe("c-newton-selector-flow-cpe-choice-control", () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  it("renders finite choices through the Newton selector group", async () => {
    const element = mount({ variant: "picklist" });
    await Promise.resolve();

    const group = element.shadowRoot.querySelector("c-newton-selector-group");
    expect(group).not.toBeNull();
    expect(group.variant).toBe("picklist");
    expect(group.selectedValues).toEqual(["a"]);
    expect(group.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Alpha", value: "a" })
      ])
    );
  });

  it("applies the shared CPE dropdown icon treatment", async () => {
    const element = mount({
      items: [{ label: "Source order", value: "none" }]
    });
    await Promise.resolve();

    const group = element.shadowRoot.querySelector("c-newton-selector-group");
    expect(group.iconDecor).toBe("square");
    expect(group.iconStyle).toBe("soft");
    expect(group.iconShading).toBe("flat");
    expect(group.iconTone).toBe("brand");
    expect(group.items[0]).toEqual(expect.objectContaining({ icon: "circle" }));
  });

  it("translates Newton selector selection into a valuechange event", async () => {
    const element = mount({ name: "sortDirection" });
    const handler = jest.fn();
    element.addEventListener("valuechange", handler);
    await Promise.resolve();

    element.shadowRoot.querySelector("c-newton-selector-group").dispatchEvent(
      new CustomEvent("selectionchange", {
        detail: {
          values: ["b"],
          items: [{ label: "Beta", value: "b" }]
        },
        bubbles: true
      })
    );

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toMatchObject({
      name: "sortDirection",
      value: "b",
      values: ["b"],
      item: expect.objectContaining({ label: "Beta", value: "b" })
    });
  });

  it("supports multi-select values", async () => {
    const element = mount({
      selectionMode: "multi",
      values: ["a", "b"]
    });
    await Promise.resolve();

    const group = element.shadowRoot.querySelector("c-newton-selector-group");
    expect(group.selectionMode).toBe("multi");
    expect(group.selectedValues).toEqual(["a", "b"]);
  });
});
