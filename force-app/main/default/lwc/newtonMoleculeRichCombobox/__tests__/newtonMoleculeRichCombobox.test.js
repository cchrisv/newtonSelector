import { createElement } from "lwc";
import NewtonMoleculeRichCombobox from "c/newtonMoleculeRichCombobox";

const ITEMS = [
  {
    id: "1",
    label: "Alpha",
    sublabel: "First option",
    icon: "layout-grid",
    badge: "Featured",
    helpText: "",
    value: "alpha",
    disabled: false
  },
  {
    id: "2",
    label: "Beta",
    sublabel: "Second option",
    icon: "paw-print",
    badge: "",
    helpText: "Useful metadata",
    value: "beta",
    disabled: false
  },
  {
    id: "3",
    label: "Gamma",
    sublabel: "",
    icon: "",
    badge: "Disabled",
    helpText: "",
    value: "gamma",
    disabled: true
  }
];

function mount(props = {}) {
  const el = createElement("c-newton-molecule-rich-combobox", {
    is: NewtonMoleculeRichCombobox
  });
  Object.assign(el, { items: ITEMS, ...props });
  document.body.appendChild(el);
  return el;
}

function input(el) {
  return el.shadowRoot.querySelector("input");
}

function optionEls(el) {
  return Array.from(el.shadowRoot.querySelectorAll('[role="option"]'));
}

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
}

describe("c-newton-molecule-rich-combobox", () => {
  beforeAll(() => {
    if (!Element.prototype.scrollIntoView) {
      Element.prototype.scrollIntoView = function () {};
    }
  });

  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  it("renders rich option content when opened", async () => {
    const el = mount({ enableSearch: true });
    input(el).dispatchEvent(new CustomEvent("focus"));
    await flush();

    const first = optionEls(el)[0];
    expect(first.textContent).toContain("Alpha");
    expect(first.textContent).toContain("First option");
    expect(first.textContent).toContain("Featured");
  });

  it("filters options when search is enabled", async () => {
    const el = mount({ enableSearch: true });
    const field = input(el);
    field.value = "bet";
    field.dispatchEvent(new CustomEvent("input"));
    await flush();

    const options = optionEls(el);
    expect(options).toHaveLength(1);
    expect(options[0].textContent).toContain("Beta");
  });

  it("stays readonly when search is disabled", async () => {
    const el = mount({ enableSearch: false, value: "alpha" });
    await flush();
    expect(input(el).readOnly).toBe(true);
    expect(input(el).value).toBe("Alpha");
  });

  it("dispatches change with value and item on click selection", async () => {
    const el = mount({ enableSearch: true });
    const handler = jest.fn();
    el.addEventListener("change", handler);

    input(el).dispatchEvent(new CustomEvent("focus"));
    await flush();
    optionEls(el)[1].dispatchEvent(
      new MouseEvent("mousedown", { bubbles: true })
    );
    optionEls(el)[1].click();
    await flush();

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.value).toBe("beta");
    expect(handler.mock.calls[0][0].detail.item.label).toBe("Beta");
  });

  it("supports keyboard selection", async () => {
    const el = mount({ enableSearch: true });
    const handler = jest.fn();
    el.addEventListener("change", handler);

    input(el).dispatchEvent(new CustomEvent("focus"));
    await flush();
    input(el).dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true })
    );
    input(el).dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
    );
    await flush();

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.value).toBe("beta");
  });
});
