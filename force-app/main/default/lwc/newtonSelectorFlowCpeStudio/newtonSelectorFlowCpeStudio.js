import { api, LightningElement, track } from "lwc";

const MIN_LEFT_WIDTH = 240;
const MAX_LEFT_WIDTH = 520;

export default class NewtonSelectorFlowCpeStudio extends LightningElement {
  @api sections = [];
  @track _leftWidth = 320;
  _dragState = null;
  _chapterObserver;

  @api
  get leftWidth() {
    return this._leftWidth;
  }
  set leftWidth(value) {
    const next = Number(value);
    if (Number.isFinite(next)) this._leftWidth = this._clampLeft(next);
  }

  get gridStyle() {
    return `--newton-studio-left-w: ${this._leftWidth}px`;
  }

  get leftAriaValueNow() {
    return this._leftWidth;
  }

  handleSectionClick(event) {
    const key = event.currentTarget?.dataset?.key;
    if (!key) return;
    this.dispatchEvent(new CustomEvent("sectionclick", { detail: key }));
    this.scrollChapterIntoView(key);
  }

  handleControlsSlotChange() {
    this._setupChapterObserver();
  }

  renderedCallback() {
    this._setupChapterObserver();
  }

  disconnectedCallback() {
    this._chapterObserver?.disconnect();
    this._chapterObserver = null;
  }

  scrollChapterIntoView(key) {
    const chapter = this._findChapter(key);
    if (chapter && typeof chapter.scrollIntoView === "function") {
      chapter.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  handleSplitterPointerDown(event) {
    event.currentTarget.setPointerCapture?.(event.pointerId);
    this._dragState = {
      startX: event.clientX,
      startLeft: this._leftWidth,
      pointerId: event.pointerId
    };
    event.preventDefault();
  }

  handleSplitterPointerMove(event) {
    const state = this._dragState;
    if (!state) return;
    this._setLeftWidth(state.startLeft + event.clientX - state.startX);
  }

  handleSplitterPointerUp(event) {
    if (!this._dragState) return;
    event.currentTarget.releasePointerCapture?.(this._dragState.pointerId);
    this._dragState = null;
  }

  handleSplitterKeyDown(event) {
    const step = event.shiftKey ? 32 : 8;
    let next;
    if (event.key === "ArrowLeft") next = this._leftWidth - step;
    else if (event.key === "ArrowRight") next = this._leftWidth + step;
    else if (event.key === "Home") next = MIN_LEFT_WIDTH;
    else if (event.key === "End") next = MAX_LEFT_WIDTH;
    else return;
    this._setLeftWidth(next);
    event.preventDefault();
  }

  _setLeftWidth(value) {
    const next = this._clampLeft(value);
    if (next === this._leftWidth) return;
    this._leftWidth = next;
    this.dispatchEvent(new CustomEvent("leftwidthchange", { detail: next }));
  }

  _clampLeft(value) {
    return Math.max(
      MIN_LEFT_WIDTH,
      Math.min(MAX_LEFT_WIDTH, Math.round(value))
    );
  }

  _setupChapterObserver() {
    if (this._chapterObserver) return;
    const controls = this.template.querySelector(".newton-studio__controls");
    const chapters = this._allChapters();
    if (
      !controls ||
      chapters.length === 0 ||
      typeof IntersectionObserver === "undefined"
    )
      return;
    this._chapterObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const key = visible[0]?.target?.getAttribute("data-chapter");
        if (key) {
          this.dispatchEvent(
            new CustomEvent("activechapterchange", { detail: key })
          );
        }
      },
      { root: controls, rootMargin: "-20% 0px -60% 0px", threshold: 0 }
    );
    chapters.forEach((chapter) => this._chapterObserver.observe(chapter));
  }

  _findChapter(key) {
    return this._allChapters().find(
      (chapter) => chapter.getAttribute("data-chapter") === key
    );
  }

  _allChapters() {
    const slot = this.template.querySelector('slot[name="controls"]');
    return (
      slot?.assignedElements({ flatten: true }).flatMap((element) => {
        const matches = element.matches?.("[data-chapter]") ? [element] : [];
        return [
          ...matches,
          ...Array.from(element.querySelectorAll?.("[data-chapter]") || [])
        ];
      }) || []
    );
  }
}
