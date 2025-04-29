/**
 * Copyright (c) Cisco Systems, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import "@/components/button/Button";
import "@/components/icon/Icon";
import "@/components/portal/Portal";
import { Key } from "@/constants";
import { customElementWithCheck } from "@/mixins/CustomElementCheck";
import { FocusTrapMixin } from "@/mixins/FocusTrapMixin";
import { debounce } from "@/utils/helpers";
import { isActionKey } from "@/utils/keyboard";
import { Placement } from "@popperjs/core/lib";
import arrow from "@popperjs/core/lib/modifiers/arrow";
import flip from "@popperjs/core/lib/modifiers/flip";
import offset from "@popperjs/core/lib/modifiers/offset";
import preventOverflow from "@popperjs/core/lib/modifiers/preventOverflow";
import { createPopper, defaultModifiers, Instance, Rect } from "@popperjs/core/lib/popper-lite";
import { html, internalProperty, LitElement, property, PropertyValues, query } from "lit-element";
import { nothing, TemplateResult } from "lit-html";
import { ifDefined } from "lit-html/directives/if-defined.js";
import { ARROW_HEIGHT, PlacementType, PopoverRoleType, StrategyType } from "./Popover.types";
import "./PopoverContent";
import { type PopoverContent } from "./PopoverContent";

type OffsetsFunction = ({
  popper,
  reference,
  placement
}: {
  popper: Rect;
  reference: Rect;
  placement: Placement;
}) => [number, number];

export namespace Popover {
  /**
   * @fires popover-open-changed - Fired when the popover is opened or closed.
   */
  @customElementWithCheck("md-popover")
  export class ELEMENT extends FocusTrapMixin(LitElement) {
    @property({ type: Boolean, attribute: "use-protal" })
    usePortal = false;

    @property({ type: Object })
    portalTarget: HTMLElement | null = null;

    @property({ type: Object })
    contentTemplate: TemplateResult | null = null;

    @internalProperty()
    portalPopoverContentComponent: PopoverContent | null = null;

    @internalProperty()
    private activePopoverElement: HTMLElement | null | undefined = null;

    /**
     * The placement of the popover relative to the trigger element.
     *
     * This property specifies where the popover should appear in relation to the trigger element.
     * The default placement is "bottom", but it can be customized to other positions such as "top", "left", or "right".
     *
     * @type {PlacementType}
     */
    @property({ type: String })
    placement: PlacementType = "bottom";

    /**
     * The positioning strategy for the popover.
     *
     * This property specifies how the popover is positioned relative to the trigger element.
     * It accepts two values:
     * - `"absolute"`: The popover is positioned relative to the nearest positioned ancestor.
     * - `"fixed"`: The popover is positioned relative to the viewport, allowing it to escape parent containers with `overflow: hidden` or `overflow: auto`.
     *
     * By default, the positioning strategy is `"absolute"`. Use `"fixed"` if the popover needs to escape parent boundaries.
     *
     * @type {StrategyType}
     */
    @property({ type: String, attribute: "positioning-strategy" })
    positioningStrategy?: StrategyType = undefined;

    /**
     * Indicates whether the popover is open.
     *
     * This property controls the visibility of the popover. When set to true, the popover is displayed.
     * When set to false, the popover is hidden.
     *
     * @type {boolean}
     */
    @property({ type: Boolean, attribute: "is-open" })
    isOpen = false;

    /**
     * Indicates whether the arrow should be shown on the popover.
     *
     * This property controls the visibility of the arrow on the popover. When set to true, the arrow is displayed.
     * When set to false, the arrow is hidden.
     *
     * @type {boolean}
     */
    @property({ type: Boolean, attribute: "show-arrow" })
    showArrow = true;

    /**
     * Indicates whether the close button should be shown on the popover.
     *
     * This property controls the visibility of the close button on the popover. When set to true, the close button is displayed.
     * When set to false, the close button is hidden.
     *
     * @type {boolean}
     */
    @property({ type: Boolean, attribute: "show-close" })
    showClose? = false;

    /**
     * Indicates whether the popover is interactive.
     *
     * When set to true, the popover will allow user interactions within it.
     * This property is used to determine if the popover should trap focus.
     *
     * @type {boolean}
     */
    @property({ type: Boolean })
    interactive = false;

    //Override FocusTrap Mixin property
    shouldWrapFocus = () => this.interactive;

    /**
     * The role attribute for the popover.
     *
     * This property specifies the `role` attribute for the popover, which defines its role in the accessibility tree.
     * The default role is "dialog", but it can be customized to "dialog", "menu" or "tooltip.
     *
     * @type {PopoverRoleType}
     */
    @property({ type: String, attribute: "role" })
    role: PopoverRoleType = "dialog";

    /**
     * The accessible label for the popover.
     *
     * This property specifies the `aria-label` attribute for the popover, which provides an accessible name for the popover element.
     * It is used by screen readers to announce the purpose of the popover to users with visual impairments.
     *
     * @type {string | null}
     */
    @property({ type: String, attribute: "aria-label" })
    ariaLabel: string | null = null;

    /**
     * The offset distance (in pixels) from the trigger element.
     *
     * This property specifies the distance between the trigger element and the popover.
     * It is used to control the spacing between the trigger element and the popover when the popover is displayed.
     *
     * @type {number}
     */
    @property({ type: Number, attribute: "offset-distance" })
    offsetDistance = 5;

    /**
     * The slot element that contains the trigger element for the popover.
     *
     * This property is used to query the slot with the name "triggerElement" and store a reference to it.
     * The trigger element is the element that, when interacted with, will open or close the popover.
     *
     * @type {HTMLSlotElement}
     */
    @query('slot[name="triggerElement"]')
    triggerSlot!: HTMLSlotElement;

    @query("md-popover-content")
    popoverContentComponent!: HTMLElement;

    /**
     * The popover container element.
     *
     * This property is used to query the popover container element in the DOM.
     * The popover container is the main element that contains the popover content.
     *
     * @type {HTMLDivElement}
     */

    private get popoverContainer(): HTMLDivElement {
      return this.popoverContentComponent.shadowRoot?.querySelector(".popover-container") as HTMLDivElement;
    }

    private get popoverArrow(): HTMLDivElement {
      return this.popoverContentComponent.shadowRoot?.querySelector(".popover-arrow") as HTMLDivElement;
    }

    /**
     * The event that triggers the popover.
     *
     * This property specifies the event that will trigger the popover to open or close.
     * The default event is "click", but it can be customized to other events such as "mouseenter" or "focus".
     *
     * @type {string}
     */
    @property({ type: String })
    trigger?: string = "click";

    /**
     * Indicates whether the popover should use an inverted color scheme.
     *
     * When set to `true`, the popover will invert its background color and text color.
     *
     * @type {boolean}
     */
    @property({ type: Boolean })
    inverted: boolean = false;

    /**
     * The trigger element for the popover.
     *
     * This property holds a reference to the trigger element that, when interacted with, will open or close the popover.
     *
     * @type {HTMLElement | null}
     */
    private triggerElement: HTMLElement | null = null;

    /**
     * The Popper.js instance used to manage the positioning of the popover.
     *
     * This instance is created when the popover is opened and destroyed when the popover is closed.
     * It is used to handle the positioning and alignment of the popover relative to the trigger element.
     */
    private popperInstance: Instance | null = null;

    /**
     * If mouse is over the trigger element or popover container.
     *
     * This property is used when both focus and mouse triggers are present
     * When focus leaves the trigger element if mouse is hovering we should not close the popover
     */
    @internalProperty()
    private isMouseOver = false;

    override connectedCallback(): void {
      super.connectedCallback();
    }

    override disconnectedCallback(): void {
      super.disconnectedCallback();

      window.removeEventListener("blur", this.onWindowBlurEvent);
      document.removeEventListener("click", this.onOutsideOverlayClick);
      document.removeEventListener("keydown", this.onOutsideOverlayKeydown);

      if (this.triggerElement) {
        if (this.trigger?.includes("click")) {
          this.triggerElement.removeEventListener("click", this.onTriggerElementClicked);
          this.triggerElement.removeEventListener("keydown", this.onTriggerElementKeydown);
        }

        if (this.trigger?.includes("mouseenter")) {
          this.triggerElement.removeEventListener("mouseenter", this.onMouseEnteredTriggerOrPopup);
          this.triggerElement.removeEventListener("mouseleave", this.onMouseLeaveTriggerOrPopup);
          this.popoverContainer?.removeEventListener("mouseenter", this.onMouseEnteredTriggerOrPopup);
          this.popoverContainer?.removeEventListener("mouseleave", this.onMouseLeaveTriggerOrPopup);
        }

        if (this.trigger?.includes("focus")) {
          this.triggerElement.removeEventListener("focusin", this.onFocusInTrigger);
          this.triggerElement.removeEventListener("focusout", this.onFocusOutTrigger);
        }
      }

      if (this.activePopoverElement) {
        if (this.trigger?.includes("mouseenter")) {
          this.activePopoverElement.removeEventListener("mouseenter", this.onMouseEnteredTriggerOrPopup);
          this.activePopoverElement.removeEventListener("mouseleave", this.onMouseLeaveTriggerOrPopup);
        }
      }
    }

    private setupTriggerEvents() {
      //Show the popover when the trigger lement is activated through click or keydown
      if (this.triggerElement) {
        if (this.trigger?.includes("click")) {
          this.triggerElement.addEventListener("click", this.onTriggerElementClicked.bind(this));
          this.triggerElement.addEventListener("keydown", this.onTriggerElementKeydown.bind(this));
        }

        //Show popover on mouse enter and hide on mouse exit
        if (this.trigger?.includes("mouseenter")) {
          this.triggerElement.addEventListener("mouseenter", this.onMouseEnteredTriggerOrPopup);
          this.triggerElement.addEventListener("mouseleave", this.onMouseLeaveTriggerOrPopup);
          this.popoverContainer?.addEventListener("mouseenter", this.onMouseEnteredTriggerOrPopup);
          this.popoverContainer?.addEventListener("mouseleave", this.onMouseLeaveTriggerOrPopup);
        }

        //Show popover when the trigger element gets keyboard focus
        if (this.trigger?.includes("focus")) {
          this.triggerElement.addEventListener("focusin", this.onFocusInTrigger);
          this.triggerElement.addEventListener("focusout", this.onFocusOutTrigger);
        }
      }
    }

    onOutsideOverlayClick = (event: MouseEvent) => {
      //Should there be an extra prop to not close on outside clicks
      if (this.trigger?.includes("manual")) {
        //Consumer controls closing of popover
        //so do not close on outside clicks
        return;
      }

      let insideMenuClick = false;
      const path = event.composedPath();
      if (path.length) {
        insideMenuClick = !!path.find((element) => element === this);
        if (!insideMenuClick) {
          this.isOpen = false;
        }
      }
    };

    onWindowBlurEvent = () => {
      if (this.trigger?.includes("manual")) {
        return;
      }

      if (this.isOpen) {
        this.isOpen = false;
      }
    };

    onOutsideOverlayKeydown = async (event: KeyboardEvent) => {
      //For now escape will close popover with manual trigger.
      //This can be changed are allowed to be configured in the future

      if (!this.isOpen || event.code !== Key.Escape) {
        return;
      }

      event.preventDefault();
      this.isOpen = false;
      await this.updateComplete;
      this.focusOnTrigger();
    };

    private handleTriggerElementSlotChange() {
      const assignedElements = this.triggerSlot.assignedElements({ flatten: true });
      this.triggerElement = assignedElements.length > 0 ? (assignedElements[0] as HTMLElement) : null;
    }

    private onContentSlotChanged() {
      //popover container slot changed
    }

    onTriggerElementClicked = () => {
      this.toggleOverlay();
    };

    onTriggerElementKeydown = async (event: KeyboardEvent) => {
      if (isActionKey(event.code)) {
        event.preventDefault();
        this.toggleOverlay();
      }

      if (event.code === Key.Escape) {
        if (this.isOpen) {
          this.isOpen = false;
          await this.updateComplete;
          this.focusOnTrigger();
        }
      }
    };

    onFocusInTrigger = () => {
      if (this.trigger?.includes("focus")) {
        this.isOpen = true;
      }
    };

    onFocusOutTrigger = () => {
      if (this.trigger?.includes("focus") && !this.isMouseOver) {
        this.isOpen = false;
      }
    };

    onMouseEnteredTriggerOrPopup = (_event: MouseEvent) => {
      this.isMouseOver = true;

      if (this.trigger?.includes("mouseenter")) {
        this.setIsOpenDebounced(true);
      }
    };

    onMouseLeaveTriggerOrPopup = (_event: MouseEvent) => {
      this.isMouseOver = false;

      if (this.trigger?.includes("mouseenter") && !this.shouldStayOpenOnTriggerFocus()) {
        this.setIsOpenDebounced(false);
      }
    };

    private shouldStayOpenOnTriggerFocus() {
      if (this.trigger?.includes("focus")) {
        const activeElement = (this.getRootNode() as Document).activeElement;
        return activeElement === this.triggerElement;
      }
      return false;
    }

    private readonly setIsOpenDebounced = debounce((flag: boolean) => {
      this.isOpen = flag;
    }, 100);

    protected override firstUpdated(changedProperties: PropertyValues): void {
      super.firstUpdated(changedProperties);

      //Setup the trigger element from the trigger slot
      //await this.updateComplete;
      this.handleTriggerElementSlotChange();

      this.setupTriggerEvents();

      if (this.popoverContainer && this.isOpen) {
        //Create instance on first updated
        this.createInstance();
        this.popoverContainer?.setAttribute("data-show", "");
      }
    }

    private focusInsideOverlay() {
      if (this.focusableElements) {
        if (this.focusableElements.length > 1) {
          this.setInitialFocus?.(1);
        } else if (this.focusableElements.length) {
          this.setInitialFocus?.();
        }
      }
    }

    private async focusOnTrigger() {
      requestAnimationFrame(() => {
        if (this.focusableElements?.length) {
          this.focusableElements[0].focus();
        }
      });
    }

    private toggleOverlay(): void {
      if (this.triggerElement?.hasAttribute("disabled")) {
        return;
      }

      this.isOpen = !this.isOpen;
    }

    private async handleCreatePopperFirstUpdate() {
      if (this.isOpen && this.interactive) {
        this.setFocusableElements?.();
        await this.updateComplete;
        this.focusInsideOverlay();
      }
    }

    private createPopoverInstance(triggerElement: HTMLElement, popoverContainer: HTMLElement) {
      this.popperInstance = createPopper(triggerElement, popoverContainer, {
        onFirstUpdate: () => {
          // We need to find all focusable elements, after Popper finish its positioning calculation
          if (this.isOpen) {
            this.handleCreatePopperFirstUpdate();
          }
        },
        placement: this.placement,
        strategy: this.positioningStrategy,
        modifiers: [
          ...defaultModifiers,
          flip,
          offset,
          preventOverflow,
          arrow,
          {
            name: "preventOverflow",
            options: {
              padding: 16
            }
          },
          {
            name: "offset",
            options: {
              offset: (({ placement, reference }) => {
                if (placement === "left" || placement === "right") {
                  return [reference.height + reference.y + this.offsetDistance, ARROW_HEIGHT];
                } else {
                  return [0, this.showArrow ? ARROW_HEIGHT + this.offsetDistance : this.offsetDistance];
                }
              }) as OffsetsFunction
            }
          },
          {
            name: "arrow",
            options: {
              element: this.popoverArrow,
              padding: ARROW_HEIGHT
            }
          },
          {
            name: "computeStyles",
            options: {
              adaptive: false
            }
          }
        ]
      });
    }

    private createInstance() {
      if (!this.triggerElement) {
        console.warn("No trigger element not creating popper instance");
        return;
      }

      this.createPopoverInstance(this.triggerElement, this.popoverContainer);
    }

    private destroyInstance() {
      if (this.popperInstance) {
        this.popperInstance.destroy();
        this.popperInstance = null;
      }
    }

    protected override updated(changedProperties: PropertyValues): void {
      super.updated(changedProperties);

      if (changedProperties.has("isOpen")) {
        const oldValue = changedProperties.get("isOpen") as boolean;
        this.isOpenUpdated(oldValue, this.isOpen);
      }
    }

    private isOpenUpdated(oldValue: boolean, newValue: boolean) {
      //Value has not changed noop
      if (oldValue === newValue) {
        return;
      }

      if (newValue) {
        if (!this.usePortal) {
          this.createInstance();
        }

        this.dispatchPopoverIsOpenChanged(newValue);

        //When the overlay is open listen to blur, click, and keydown events to close
        //if needed when the window loses focus
        window.addEventListener("blur", this.onWindowBlurEvent);
        document.addEventListener("click", this.onOutsideOverlayClick);
        document.addEventListener("keydown", this.onOutsideOverlayKeydown);

        if (this.interactive) {
          this.activateFocusTrap?.();
        }

        this.triggerElement?.setAttribute("aria-expanded", "true");
        this.popoverContainer?.setAttribute("data-show", "");
      } else {
        this.destroyInstance();
        this.activePopoverElement = null;

        window.removeEventListener("blur", this.onWindowBlurEvent);
        document.removeEventListener("click", this.onOutsideOverlayClick);
        document.removeEventListener("keydown", this.onOutsideOverlayKeydown);

        this.dispatchPopoverIsOpenChanged(newValue);

        this.deactivateFocusTrap?.();
        this.triggerElement?.removeAttribute("aria-expanded");
        this.popoverContainer?.removeAttribute("data-show");
      }
    }

    private handlePortalRendered(event: CustomEvent) {
      const { container } = event.detail;

      // Store reference to popover in portal for events and positioning
      this.portalPopoverContentComponent = (container as HTMLElement).querySelector<PopoverContent>(
        "md-popover-content"
      );

      this.activePopoverElement = this.portalPopoverContentComponent?.popoverContainer;

      // Set up event listeners for hover behavior
      if (this.trigger?.includes("mouseenter") && this.activePopoverElement) {
        this.activePopoverElement.addEventListener("mouseenter", this.onMouseEnteredTriggerOrPopup);
        this.activePopoverElement.addEventListener("mouseleave", this.onMouseLeaveTriggerOrPopup);
      }

      // Show the popover
      this.activePopoverElement?.setAttribute("data-show", "");

      // Create popper instance with the portal element
      this.createPortalInstance();
    }

    private createPortalInstance() {
      if (!this.triggerElement || !this.activePopoverElement) return;
      const theArrow = this.portalPopoverContentComponent?.popoverArrow;

      this.popperInstance = createPopper(this.triggerElement, this.activePopoverElement, {
        placement: this.placement,
        strategy: this.positioningStrategy,
        modifiers: [
          ...defaultModifiers,
          flip,
          offset,
          preventOverflow,
          arrow,
          {
            name: "preventOverflow",
            options: {
              padding: 16
            }
          },
          {
            name: "offset",
            options: {
              offset: (({ placement }) => {
                if (placement === "left" || placement === "right") {
                  return [this.offsetDistance, ARROW_HEIGHT];
                } else {
                  return [0, this.showArrow ? ARROW_HEIGHT + this.offsetDistance : this.offsetDistance];
                }
              }) as OffsetsFunction
            }
          },
          {
            name: "arrow",
            options: {
              element: theArrow,
              padding: ARROW_HEIGHT
            }
          },
          {
            name: "computeStyles",
            options: {
              adaptive: false
            }
          }
        ]
      });
    }

    private dispatchPopoverIsOpenChanged(isOpen: boolean) {
      this.dispatchEvent(
        new CustomEvent("popover-open-changed", {
          detail: { isOpen },
          composed: true,
          bubbles: true
        })
      );
    }

    private get renderPopoverContentTemplate() {
      return html`
        <md-popover-content
          ?show-arrow=${this.showArrow}
          ?show-close=${this.showClose}
          role=${this.role}
          ?interactive=${this.interactive}
          aria-label=${ifDefined(this.ariaLabel ?? undefined)}
          ?inverted=${this.inverted}
          .contentTemplate=${this.contentTemplate}
          @popover-close=${() => (this.isOpen = false)}
          @popover-content-changed=${this.onContentSlotChanged}
        >
          <slot></slot>
        </md-popover-content>
      `;
    }

    render() {
      return html`
        <slot name="triggerElement" aria-expanded=${this.isOpen}></slot>

        ${!this.usePortal ? this.renderPopoverContentTemplate : nothing}
        ${this.usePortal && this.isOpen
          ? html`
              <md-portal
                .open=${true}
                .target=${this.portalTarget}
                .contentTemplate=${this.renderPopoverContentTemplate}
                .portalClass=${"md-popover-portal"}
                @portal-rendered=${this.handlePortalRendered}
              ></md-portal>
            `
          : nothing}
      `;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "md-popover": Popover.ELEMENT;
  }
}
