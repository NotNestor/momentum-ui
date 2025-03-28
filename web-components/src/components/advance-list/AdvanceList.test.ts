import "@/components/advance-list/AdvanceList";
import { type AdvanceList } from "@/components/advance-list/AdvanceList";
import "@/components/spinner/Spinner";
import { elementUpdated, fixture, fixtureCleanup, html } from "@open-wc/testing-helpers";
import { render } from "lit-html"; // Import Lit's render function

// Helper function to create mock items
const createItems = (start: number, count: number) =>
  Array.from({ length: count }, (_, i) => ({
    name: `Item ${start + i}`,
    id: `d-${start + i}`,
    index: i,
    ariaLabel: `Item ${start + i}`
  }));

// Helper function to append items to the Shadow DOM using Lit's render function
const appendItemsToShadowDom = (items: any[], wrapper: Element, mockRender: jest.Mock) => {
  items.forEach((item, index) => {
    const listItemTemplate = mockRender(item, index);
    const fragment = document.createDocumentFragment();
    render(listItemTemplate, fragment);
    wrapper.appendChild(fragment.firstElementChild as HTMLElement);
  });
};

// Helper to mock renderItem function with prefixId
const createMockRender = (prefixId: string) =>
  jest.fn((data: any, index: number) => {
    return html`
      <div
        class="default-wrapper"
        aria-live="assertive"
        role="option"
        aria-setsize="600"
        aria-posinset="${index + 1}"
        aria-label="${data.name}"
        id="${prefixId}${data.id}"
        index="${index}"
        style="position: absolute; transform: translate(0px, ${index * 30}px);"
      >
        <div
          style="position:relative;min-height:1.25rem;box-sizing: border-box;display:flex;flex-flow:row nowrap;justify-content:flex-start;align-items:center;line-height:30px;"
          indexing="${index}"
          ?disabled="${index === 10}"
        >
          ${data.name}
        </div>
      </div>
    `;
  });

describe("advanceList Component", () => {
  let el: AdvanceList.ELEMENT;
  let mockRender: jest.Mock;

  beforeEach(async () => {
    jest.useFakeTimers();

    const initialItems = createItems(1, 20);
    const prefixId = "item-"; // Define the prefixId
    mockRender = createMockRender(prefixId); // Pass prefixId to the render function

    // Initialize the component with mock data
    el = await fixture<AdvanceList.ELEMENT>(html`
      <md-advance-list
        .items=${initialItems}
        .isLoading=${false}
        .isError=${false}
        .value=${["2"]}
        ariaRoleList="listbox"
        ariaLabelList="state selector"
        .totalRecords=${100}
        .renderItem=${mockRender}
      >
        <md-spinner size="24" slot="spin-loader"></md-spinner>
      </md-advance-list>
    `);

    await el.updateComplete;
    jest.advanceTimersByTime(600);

    const wrapper = el.shadowRoot?.querySelector(".md-advance-list-wrapper");
    if (wrapper) {
      appendItemsToShadowDom(initialItems, wrapper, mockRender);
    }
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    fixtureCleanup();
  });

  describe("Interaction", () => {
    test("should render initial items and append more on scroll", async () => {
      expect(el.items.length).toBe(20);
      expect(mockRender).toHaveBeenCalledTimes(20);

      const listItems = el.shadowRoot?.querySelectorAll(".default-wrapper");
      expect(listItems?.length).toBe(20);

      const newItems = createItems(21, 10);
      const wrapper = el.shadowRoot?.querySelector(".md-advance-list-wrapper");
      if (wrapper) {
        appendItemsToShadowDom(newItems, wrapper, mockRender);
      }
      el.items = [...el.items, ...newItems];
      await el.updateComplete;
      jest.advanceTimersByTime(100);

      expect(el.items.length).toBe(30);
      expect(mockRender).toHaveBeenCalledTimes(30);

      const updatedListItems = el.shadowRoot?.querySelectorAll(".default-wrapper");
      expect(updatedListItems?.length).toBe(30);
    });

    test("should select an item on click", async () => {
      const firstItem = el.shadowRoot?.querySelector(".default-wrapper") as HTMLElement;
      expect(firstItem).not.toBeNull();
      if (firstItem) {
        firstItem.click();
        await el.updateComplete;
        jest.advanceTimersByTime(100);
        expect(firstItem.classList.contains("selected")).toBe(true);
      }
    });

    test("should select and unselect multiple items on click with multi select", async () => {
      const items = el.shadowRoot?.querySelectorAll(".default-wrapper");
      expect(items).not.toBeNull();
      el.isMulti = true;
      const firstItem = items?.[0] as HTMLElement;
      const secondItem = items?.[1] as HTMLElement;
      if (firstItem) {
        firstItem.click();
        await el.updateComplete;
        jest.advanceTimersByTime(100);
        expect(firstItem.getAttribute("selected")).toBe("true");
      }
      if (secondItem) {
        secondItem.click();
        await el.updateComplete;
        jest.advanceTimersByTime(100);
        expect(firstItem.getAttribute("selected")).toBe("true");
      }
      if (firstItem) {
        firstItem.click();
        await el.updateComplete;
        jest.advanceTimersByTime(100);
        expect(firstItem.getAttribute("selected")).toBe("false");
      }
    });

    test("should set selectAllItems as true on checking all items with multi select", async () => {
      const items = Array.from(el.shadowRoot?.querySelectorAll<HTMLElement>(".default-wrapper") || []);
      expect(items).not.toBeNull();
      el.isMulti = true;
      items.forEach(async (item) => {
        if (item) {
          item.click();
          await el.updateComplete;
        }
      });
      expect(el.selectAllItems).toBe(true);
      if (items[0]) {
        items[0].click();
        await el.updateComplete;
        expect(el.selectAllItems).toBe(false);
      }
    });

    test("should not select disabled item on click", async () => {
      const disabledId = el.items[10].id;
      (el as any).updateSelectedState();
      jest.advanceTimersByTime(100);

      const disabledItem = el.shadowRoot?.querySelector(`#item-${disabledId}`) as HTMLElement;
      if (disabledItem) {
        disabledItem?.click();
      }
      expect(disabledItem).not.toBeNull();
      expect(disabledItem?.getAttribute("aria-disabled")).toBe("true");
      expect(disabledItem.classList.contains("selected")).toBe(false);
    });

    test("should handle ArrowDown and ArrowUp keys", async () => {
      el.items = createItems(1, 20);
      el.activeId = el.items[0].id;

      el.requestUpdate();
      await el.updateComplete;
      jest.advanceTimersByTime(100);

      const arrowDownEvent = new KeyboardEvent("keydown", { code: "ArrowDown" });
      el.handleKeyDown(arrowDownEvent);
      jest.advanceTimersByTime(100);

      let currentIndex = el.items.findIndex((item) => item.id === el.activeId);
      expect(currentIndex).toBe(1);

      const arrowUpEvent = new KeyboardEvent("keydown", { code: "ArrowUp" });
      el.handleKeyDown(arrowUpEvent);
      jest.advanceTimersByTime(100);

      currentIndex = el.items.findIndex((item) => item.id === el.activeId);
      expect(currentIndex).toBe(0);
    });

    test("should handle ArrowDown for preselected value", async () => {
      el.items = createItems(1, 20);
      el.activeId = "";
      el.value = [el.items[3].id];

      el.requestUpdate();
      await el.updateComplete;
      jest.advanceTimersByTime(100);

      const arrowDownEvent = new KeyboardEvent("keydown", { code: "ArrowDown" });
      el.handleKeyDown(arrowDownEvent);
      jest.advanceTimersByTime(100);

      expect(el.activeId).toBe(el.items[3].id);
      let currentIndex = el.items.findIndex((item) => item.id === el.activeId);
      expect(currentIndex).toBe(3);

      const arrowUpEvent = new KeyboardEvent("keydown", { code: "ArrowUp" });
      el.handleKeyDown(arrowUpEvent);
      jest.advanceTimersByTime(100);

      expect(el.activeId).toBe(el.items[2].id);
      currentIndex = el.items.findIndex((item) => item.id === el.activeId);
      expect(currentIndex).toBe(2);
    });

    test("should handle ArrowUp for preselected value", async () => {
      el.items = createItems(1, 20);
      el.activeId = "";
      el.value = [el.items[4].id]; // Preselect item 5

      el.requestUpdate();
      await el.updateComplete;
      jest.advanceTimersByTime(100);

      const arrowUpEvent = new KeyboardEvent("keydown", { code: "ArrowUp" });
      el.handleKeyDown(arrowUpEvent);
      el.handleKeyDown(arrowUpEvent);
      jest.advanceTimersByTime(100);

      // Assert activeId is now the 4th item
      expect(el.activeId).toBe(el.items[3].id);
      let currentIndex = el.items.findIndex((item) => item.id === el.activeId);
      expect(currentIndex).toBe(3);

      const arrowDownEvent = new KeyboardEvent("keydown", { code: "ArrowDown" });
      el.handleKeyDown(arrowDownEvent);
      jest.advanceTimersByTime(100);

      // Assert activeId moves back to the preselected 5th item
      expect(el.activeId).toBe(el.items[4].id);
      currentIndex = el.items.findIndex((item) => item.id === el.activeId);
      expect(currentIndex).toBe(4);

      // Ensure the preselected item has tabindex="0"
      // const preselectedItem = el.shadowRoot?.querySelector(`#item-${el.items[4].id}`) as HTMLElement;
      // expect(preselectedItem.getAttribute("tabindex")).toBe("0");
    });

    test("should handle Tab for preselected value", async () => {
      el.items = createItems(1, 20);
      el.activeId = "";
      el.value = [el.items[4].id]; // Preselect item 5

      el.requestUpdate();
      await el.updateComplete;
      jest.advanceTimersByTime(100);

      const tabEvent = new KeyboardEvent("keydown", { code: "Tab" });
      el.handleKeyDown(tabEvent);
      jest.advanceTimersByTime(100);

      // Assert activeId is now the 5th item
      expect(el.activeId).toBe(el.items[4].id);
      const currentIndex = el.items.findIndex((item) => item.id === el.activeId);
      expect(currentIndex).toBe(4);
    });

    test("should handle Enter key and select non-disabled item", async () => {
      el.items = createItems(1, 20);
      el.activeId = el.items[1].id;

      el.requestUpdate();
      await el.updateComplete;
      jest.advanceTimersByTime(100);

      const enterKey = new KeyboardEvent("keydown", { code: "Enter" });
      el.handleKeyDown(enterKey);
      jest.advanceTimersByTime(100);

      const selectedItem = el.shadowRoot?.querySelector(`#item-${el.activeId}`) as HTMLElement;
      expect(selectedItem?.classList.contains("selected")).toBe(true);
    });

    test("should handle Space key and select non-disabled item", async () => {
      el.items = createItems(1, 20);
      el.activeId = el.items[1].id;

      el.requestUpdate();
      await el.updateComplete;
      jest.advanceTimersByTime(100);

      const enterSpace = new KeyboardEvent("keydown", { code: "Space" });
      el.handleKeyDown(enterSpace);
      jest.advanceTimersByTime(100);

      const selectedItem = el.shadowRoot?.querySelector(`#item-${el.activeId}`) as HTMLElement;
      expect(selectedItem?.classList.contains("selected")).toBe(true);
    });

    test("should select all items if the selectAll flag is true", async () => {
      el.items = createItems(1, 5);
      el.selectAllItems = true;
      el.requestUpdate();
      await el.updateComplete;
      jest.advanceTimersByTime(100);

      await el.updateComplete;

      el.items.forEach((item) => {
        const selectedItem = el.shadowRoot?.querySelector(`#item-${item.id}`) as HTMLElement;
        expect(selectedItem?.classList.contains("selected")).toBe(true);
      });
    });

    test("should not select disabled item on Enter key press", async () => {
      el.items = createItems(1, 20);
      el.activeId = el.items[1].id;

      el.requestUpdate();
      await el.updateComplete;
      jest.advanceTimersByTime(100);

      const secondItem = el.shadowRoot?.querySelector(`#item-${el.activeId}`) as HTMLElement;
      if (secondItem) {
        secondItem.setAttribute("aria-disabled", "true");
      }

      const enterSpace = new KeyboardEvent("keydown", { code: "Space" });
      el.handleKeyDown(enterSpace);
      jest.advanceTimersByTime(100);

      expect(secondItem?.classList.contains("selected")).toBe(false);
    });

    test("should update selected state and handle disabled items", async () => {
      el.items = createItems(1, 20);
      el.activeId = el.items[1].id;
      el.selectedItemsIds = [el.items[1].id];

      (el as any).updateSelectedState();
      jest.advanceTimersByTime(100);

      const selectedItem = el.shadowRoot?.querySelector(`#item-${el.activeId}`);
      expect(selectedItem).not.toBeNull();
      expect(selectedItem?.classList.contains("selected")).toBe(true);
      expect(selectedItem?.getAttribute("selected")).toBe("true");
      expect(selectedItem?.getAttribute("aria-selected")).toBe("true");
      expect(selectedItem?.getAttribute("tabindex")).toBe("0");

      const disabledId = el.items[10].id;
      const disabledItem = el.shadowRoot?.querySelector(`#item-${disabledId}`);
      expect(disabledItem?.getAttribute("disabled")).not.toBeNull();
      expect(disabledItem?.getAttribute("aria-disabled")).toBe("true");
    });

    describe("Accessibility and Error Handling", () => {
      test("should apply correct ARIA role and label", async () => {
        const wrapper = el.shadowRoot?.querySelector(".md-advance-list-wrapper");
        expect(wrapper?.getAttribute("role")).toBe("listbox");
        expect(wrapper?.getAttribute("aria-label")).toBe("state selector");
      });

      test("should dispatch 'load-more' event when last item is reached", async () => {
        el.items = createItems(1, 20);
        el.totalRecords = 30;
        el.requestUpdate();
        await el.updateComplete;

        const dispatchSpy = jest.spyOn(el, "dispatchEvent");
        const customEvent = { last: 19 };
        el.handleRangeChange(customEvent);

        expect(dispatchSpy).toHaveBeenCalledWith(expect.any(CustomEvent));

        // Verify that the event type is 'load-more'
        const loadMoreEvent = dispatchSpy.mock.calls.find((call) => call[0]?.type === "load-more")?.[0] as CustomEvent;
        expect(loadMoreEvent).toBeDefined();
      });
    });
  });
});

describe("AdvanceList Component test seperate render", () => {
  let el: AdvanceList.ELEMENT;

  beforeEach(async () => {
    jest.useFakeTimers();

    el = await fixture(html`
      <md-advance-list
        .items=${Array.from({ length: 20 }, (_, i) => ({
          name: `Item ${i + 1}`,
          id: `item-${i + 1}`
        }))}
        .totalRecords=${30}
      ></md-advance-list>
    `);
    jest.runAllTimers();
    await elementUpdated(el);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useRealTimers();
    fixtureCleanup();
  });

  test("should correctly render each item using renderItem (bypassing virtualization)", async () => {
    const mockItems = Array.from({ length: 3 }, (_, i) => ({
      name: `Item ${i + 1}`,
      id: `${i + 1}`,
      template: (item: any, index: number) => html`<span>${item.name} - ${index}</span>`
    }));

    el.items = mockItems;
    el.totalRecords = 3;

    el.requestUpdate();
    await el.updateComplete;

    const wrapper = el.shadowRoot?.querySelector(".md-advance-list-wrapper");
    mockItems.forEach((item, index) => {
      const listItemTemplate = el.renderItem(item, index);
      const fragment = document.createDocumentFragment();
      render(listItemTemplate, fragment);
      wrapper?.appendChild(fragment.firstElementChild as HTMLElement);
    });

    const renderedContent = el.shadowRoot?.querySelectorAll(".default-wrapper");

    expect(renderedContent).toHaveLength(3);

    renderedContent?.forEach((item, index) => {
      const itemElement = item as HTMLElement;
      expect(itemElement.getAttribute("aria-setsize")).toBe("3");
      expect(itemElement.getAttribute("aria-posinset")).toBe(`${index + 1}`);
      expect(itemElement.getAttribute("role")).toBe("option");
      expect(itemElement.getAttribute("aria-label")).toBe(`Item ${index + 1}`);
      expect(itemElement.getAttribute("id")).toBe(`item-${index + 1}`);
      expect(itemElement.textContent?.trim()).toBe(`Item ${index + 1} - ${index}`);
    });
  });
});
