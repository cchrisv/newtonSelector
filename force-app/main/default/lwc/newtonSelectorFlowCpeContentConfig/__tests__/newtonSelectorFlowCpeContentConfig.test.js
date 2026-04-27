import { createElement } from "lwc";
import NewtonSelectorFlowCpeContentConfig from "c/newtonSelectorFlowCpeContentConfig";

function mount() {
  const element = createElement("c-newton-selector-flow-cpe-content-config", {
    is: NewtonSelectorFlowCpeContentConfig
  });
  element.config = {
    label: "Current label",
    helpText: "",
    fieldLevelHelp: "",
    emptyStateMessage: "",
    errorStateMessage: ""
  };
  document.body.appendChild(element);
  return element;
}

function collect(element) {
  const events = [];
  element.addEventListener("configpatch", (event) => events.push(event.detail));
  return events;
}

function valueChanged(node, newValue) {
  node.dispatchEvent(
    new CustomEvent("valuechanged", {
      detail: { newValue },
      bubbles: true,
      composed: true
    })
  );
}

describe("c-newton-selector-flow-cpe-content-config events", () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  it("emits content resource picker patches from rendered controls", () => {
    const element = mount();
    const patches = collect(element);
    const pickers = [
      ...element.shadowRoot.querySelectorAll(
        "c-newton-selector-flow-cpe-resource-selector"
      )
    ];

    expect(pickers).toHaveLength(5);
    valueChanged(pickers[0], "New label");
    valueChanged(pickers[1], "New help");
    valueChanged(pickers[2], "Tooltip");
    valueChanged(pickers[3], "Nothing here");
    valueChanged(pickers[4], "Load failed");

    expect(patches).toEqual([
      { path: ["label"], value: "New label" },
      { path: ["helpText"], value: "New help" },
      { path: ["fieldLevelHelp"], value: "Tooltip" },
      { path: ["emptyStateMessage"], value: "Nothing here" },
      { path: ["errorStateMessage"], value: "Load failed" }
    ]);
  });
});
