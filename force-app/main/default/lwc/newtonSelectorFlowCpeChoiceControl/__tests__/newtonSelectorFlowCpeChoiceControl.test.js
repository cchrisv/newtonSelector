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

  it("renders picklist choices through the base combobox", async () => {
    const element = mount({ variant: "picklist" });
    await Promise.resolve();

    const combobox = element.shadowRoot.querySelector(
      "c-newton-selector-combobox"
    );
    expect(combobox).not.toBeNull();
    expect(combobox.mode).toBe("select");
    expect(combobox.value).toBe("a");
    expect(combobox.options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: "Alpha", id: "a" })
      ])
    );
  });

  it("normalizes option icons before passing them to the base combobox", async () => {
    const element = mount({
      items: [{ label: "Source order", value: "none" }]
    });
    await Promise.resolve();

    const combobox = element.shadowRoot.querySelector(
      "c-newton-selector-combobox"
    );
    expect(combobox.options[0]).toEqual(
      expect.objectContaining({ icon: "circle" })
    );
  });

  it("translates Newton selector selection into a valuechange event", async () => {
    const element = mount({ name: "sortDirection" });
    const handler = jest.fn();
    element.addEventListener("valuechange", handler);
    await Promise.resolve();

    element.shadowRoot
      .querySelector("c-newton-selector-combobox")
      .dispatchEvent(
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

    const combobox = element.shadowRoot.querySelector(
      "c-newton-selector-combobox"
    );
    expect(combobox.selectionMode).toBe("multi");
    expect(combobox.values).toEqual(["a", "b"]);
  });
});
