import { createElement } from "lwc";
import NewtonSelectorFlowCpeStudio from "c/newtonSelectorFlowCpeStudio";

const flush = () => Promise.resolve();

describe("c-newton-selector-flow-cpe-studio", () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  it("defaults to an even preview and controls split", async () => {
    const element = createElement("c-newton-selector-flow-cpe-studio", {
      is: NewtonSelectorFlowCpeStudio
    });

    document.body.appendChild(element);
    await flush();

    const shell = element.shadowRoot.querySelector(".newton-studio");
    expect(shell.getAttribute("style")).toContain(
      "--newton-studio-left-fr: 50fr"
    );
    expect(shell.getAttribute("style")).toContain(
      "--newton-studio-right-fr: 50fr"
    );
  });

  it("allows keyboard resize to give either pane the full available width", async () => {
    const element = createElement("c-newton-selector-flow-cpe-studio", {
      is: NewtonSelectorFlowCpeStudio
    });
    const resizeHandler = jest.fn();
    element.addEventListener("leftwidthchange", resizeHandler);

    document.body.appendChild(element);
    await flush();

    const splitter = element.shadowRoot.querySelector(
      ".newton-studio__splitter"
    );
    splitter.dispatchEvent(
      new KeyboardEvent("keydown", { key: "End", bubbles: true })
    );
    await flush();

    expect(resizeHandler).toHaveBeenLastCalledWith(
      expect.objectContaining({ detail: 100 })
    );
    expect(
      element.shadowRoot.querySelector(".newton-studio").style.cssText
    ).toContain("--newton-studio-left-fr: 100fr");

    splitter.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Home", bubbles: true })
    );
    await flush();

    expect(resizeHandler).toHaveBeenLastCalledWith(
      expect.objectContaining({ detail: 0 })
    );
    expect(
      element.shadowRoot.querySelector(".newton-studio").style.cssText
    ).toContain("--newton-studio-right-fr: 100fr");
  });
});
