import { customElementWithCheck } from "@/mixins/CustomElementCheck";
import { closestElement } from "@/utils/helpers";
import { html, LitElement, property } from "lit-element";
import { render, TemplateResult } from "lit-html";

@customElementWithCheck("md-portal")
export class Portal extends LitElement {
  /**
   * The target DOM node where portal content will be rendered.
   * Defaults to `document.body`.
   */
  @property({ type: Object })
  target: HTMLElement | null = null;

  /**
   * Whether the portal is open and content should be rendered.
   */
  @property({ type: Boolean })
  open = false;

  /**
   * Template to render inside the portal.
   * This is required for the portal to work.
   */
  @property({ type: Object })
  contentTemplate: TemplateResult | null = null;

  /**
   * CSS class for the portal container element.
   */
  @property({ type: String })
  portalClass = "md-portal";

  /**
   * Optional ID for the portal container element.
   */
  @property({ type: String })
  portalId = "";

  /**
   * Internal reference to the portal DOM element.
   */
  private portalElement: HTMLElement | null = null;

  connectedCallback(): void {
    super.connectedCallback();

    const themeElement = closestElement("md-theme", this);

    this.target ??= themeElement ?? document.body;
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();

    this.removePortal();
  }

  updated(changedProperties: Map<string, unknown>): void {
    super.updated(changedProperties);

    // Update portal when open state, target, or contentTemplate changes
    if (changedProperties.has("open") || changedProperties.has("target") || changedProperties.has("contentTemplate")) {
      if (this.open && this.target && this.contentTemplate) {
        this.createOrUpdatePortal();
      } else {
        this.removePortal();
      }
    }
  }

  /**
   * Creates or updates the portal element and its content.
   */
  private createOrUpdatePortal() {
    if (!this.target || !this.contentTemplate) return;

    // Create portal element if it doesn't exist
    if (!this.portalElement) {
      this.portalElement = document.createElement("div");
      this.portalElement.classList.add(this.portalClass);
      if (this.portalId) {
        this.portalElement.id = this.portalId;
      } else {
        this.portalElement.id = `md-portal-${Math.random().toString(36).substring(2, 10)}`;
      }
      this.target.appendChild(this.portalElement);
    }

    // Render the content template into the portal
    render(this.contentTemplate, this.portalElement);

    // Notify that portal has been rendered
    this.dispatchEvent(
      new CustomEvent("portal-rendered", {
        detail: { container: this.portalElement },
        bubbles: true,
        composed: true
      })
    );
  }

  /**
   * Removes the portal element from the DOM.
   */
  private removePortal() {
    if (this.portalElement?.parentNode) {
      this.portalElement.parentNode.removeChild(this.portalElement);
      this.portalElement = null;
    }
  }

  render() {
    // Render nothing in the shadow DOM
    return html``;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "md-portal": Portal;
  }
}
