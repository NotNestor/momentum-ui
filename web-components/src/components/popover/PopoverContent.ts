import "@/components/button/Button";
import "@/components/icon/Icon";
import { customElementWithCheck } from "@/mixins/CustomElementCheck";
import { html, LitElement, property, query, TemplateResult } from "lit-element";
import { nothing } from "lit-html";
import { classMap } from "lit-html/directives/class-map";
import { ifDefined } from "lit-html/directives/if-defined";
import { PopoverRoleType } from "./Popover.types";
import styles from "./scss/module.scss";

@customElementWithCheck("md-popover-content")
export class PopoverContent extends LitElement {
  /**
   * Indicates whether the arrow should be shown on the popover.
   */
  @property({ type: Boolean, attribute: "show-arrow" })
  showArrow = true;

  /**
   * Indicates whether the close button should be shown.
   */
  @property({ type: Boolean, attribute: "show-close" })
  showClose = false;

  /**
   * The role attribute for the popover.
   */
  @property({ type: String, attribute: "role" })
  role: PopoverRoleType = "dialog";

  /**
   * Indicates whether the popover is interactive.
   */
  @property({ type: Boolean })
  interactive = false;

  /**
   * The accessible label for the popover.
   */
  @property({ type: String, attribute: "aria-label" })
  ariaLabel: string | null = null;

  /**
   * Alternative template to render instead of slotted content.
   */
  @property({ type: Object })
  contentTemplate: TemplateResult | null = null;

  /**
   * Indicates whether the popover should use inverted colors.
   */
  @property({ type: Boolean })
  inverted = false;

  /**
   * The popover container element.
   *
   * This property is used to query the popover container element in the DOM.
   * The popover container is the main element that contains the popover content.
   *
   * @type {HTMLDivElement}
   */
  @query(".popover-container")
  popoverContainer!: HTMLDivElement;

  @query(".popover-arrow")
  popoverArrow!: HTMLDivElement;

  setIsOpen(isOpen: boolean) {
    if (isOpen) {
      this.popoverContainer?.setAttribute("data-show", "");
    } else {
      this.popoverContainer?.removeAttribute("data-show");
    }
  }

  static get styles() {
    return [styles];
  }

  private get popoverClassMap() {
    return {
      "md-popover": true,
      inverted: this.inverted
    };
  }

  private onContentSlotChanged() {
    this.dispatchEvent(
      new CustomEvent("popover-content-changed", {
        bubbles: true,
        composed: true
      })
    );
  }

  private onCloseButtonClick() {
    this.dispatchEvent(
      new CustomEvent("popover-close", {
        bubbles: true,
        composed: true
      })
    );
  }

  render() {
    return html`
      <div class=${classMap(this.popoverClassMap)} part="popover-wrapper">
        <div
          part="popover"
          class="popover-container"
          role=${this.role}
          aria-modal=${ifDefined(this.interactive ? "true" : undefined)}
          aria-label=${ifDefined(this.ariaLabel ?? undefined)}
        >
          ${this.showClose
            ? html`<md-button
                class="cancel-icon-button"
                size="20"
                hasRemoveStyle
                circle
                @button-click=${this.onCloseButtonClick}
              >
                <md-icon name="cancel-bold" size="16" iconSet="momentumDesign"></md-icon>
              </md-button>`
            : nothing}
          ${this.showArrow ? html`<div class="popover-arrow"></div>` : nothing}
          <div class="popover-content" part="popover-content">
            ${this.contentTemplate || html`<slot @slotchange=${this.onContentSlotChanged}></slot>`}
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "md-popover-content": PopoverContent;
  }
}
