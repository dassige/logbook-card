import { CSSResultGroup, LitElement, TemplateResult, css, html, render } from 'lit';
import {
  CustomLogEvent,
  ExtendedHomeAssistant,
  LogbookCardConfigBase,
  Attribute,
  History,
  HistoryOrCustomLogEvent,
} from './types';
import { property } from 'lit/decorators.js';
import { handleAction, ActionHandlerEvent, hasAction, handleActionConfig } from 'custom-card-helpers';
import { actionHandler } from './action-handler-directive';
import { styleMap, StyleInfo } from 'lit/directives/style-map.js';
import { isSameDay } from './date-helpers';
import { HassEntity } from 'home-assistant-js-websocket/dist/types';
import PinchZoom from 'pinch-zoom-js';


export abstract class LogbookBaseCard extends LitElement {
  @property({ attribute: false }) public hass!: ExtendedHomeAssistant;

  protected mode: 'multiple' | 'single' = 'single';
  private updateHistoryIntervalId: NodeJS.Timeout | null = null;
  private UPDATE_INTERVAL = 5000;
  protected currentItemId: string | undefined = undefined;
  //protected customAttributes :Array<Attribute>
  protected _handleAction(ev: ActionHandlerEvent): void {
    if (this.hass && ev.detail.action && !!ev.target && ev.target['entity']) {
      handleAction(this, this.hass, { entity: ev.target['entity'] }, ev.detail.action);
    }
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.updateHistoryIntervalId = setInterval(() => this.updateHistory(), this.UPDATE_INTERVAL);
    setTimeout(() => this.updateHistory(), 1);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this.updateHistoryIntervalId !== null) {
      clearInterval(this.updateHistoryIntervalId);
    }
  }

  abstract updateHistory(): void;

  renderHistory(items: HistoryOrCustomLogEvent[] | undefined, config: LogbookCardConfigBase): TemplateResult {
    if (!items || items?.length === 0) {
      return html`
        <p>
          ${config.no_event}
        </p>
      `;
    }

    if (config.collapse && items.length > config.collapse) {
      const elemId = `expander${Math.random()
        .toString(10)
        .substring(2)}`;
      return html`
        ${this.renderHistoryItems(items.slice(0, config.collapse), undefined, config)}
        <input type="checkbox" class="expand" id="${elemId}" />
        <label for="${elemId}"><div>&lsaquo;</div></label>
        <div>
          ${this.renderHistoryItems(items.slice(config.collapse), items[config.collapse], config)}
        </div>
      `;
    } else {
      return this.renderHistoryItems(items, undefined, config);
    }
  }

  protected renderHistoryItems(
    items: HistoryOrCustomLogEvent[],
    previousItem: HistoryOrCustomLogEvent | undefined,
    config: LogbookCardConfigBase,
  ): TemplateResult {
    return html`
      ${this.renderModalforPopupImage(config)}
      ${items?.map((item, index, array) => {
        const isLast = index + 1 === array.length;
        const shouldRenderDaySeparator = this.shouldRenderDaySeparator(items, previousItem, index);
        if (item.type === 'history') {
          return html`
            ${shouldRenderDaySeparator ? this.renderDaySeparator(item, config) : ``}
            ${this.renderHistoryItem(item, isLast, config)}
          `;
        }
        return html`
          ${shouldRenderDaySeparator ? this.renderDaySeparator(item, config) : ``}
          ${this.renderCustomLogEvent(item, isLast, config)}
        `;
      })}
    `;
  }

  protected shouldRenderDaySeparator(
    items: HistoryOrCustomLogEvent[],
    previousItem: HistoryOrCustomLogEvent | undefined,
    index: number,
  ): boolean {
    const item = items[index];
    return (
      (previousItem === undefined && index === 0) ||
      (previousItem !== undefined && index === 0 && !isSameDay(item.start, previousItem.start)) ||
      (index > 0 && !isSameDay(item.start, items[index - 1].start))
    );
  }

  protected generateItemId(item: History): string {
    const id = `${item.entity_name.toLowerCase()}-${item.state}`;
    return id;
  }
  protected renderHistoryItem(item: History, isLast: boolean, config: LogbookCardConfigBase): TemplateResult {
    const id = `${this.generateItemId(item)}`;
    return html`
      <div class="item-main-container">
        <div class="item history clickable-history-item" @click="${(e, historyItem: History = item) => {
          this.handleClickEventOnHistory(e, historyItem, config);
        }}" id="${id}" >
          ${this.renderHistoryIcon(item, config)}
          <div class="item-content" ">
            ${
              this.mode === 'multiple' && config.show?.entity_name
                ? this.renderEntity(item.stateObj.entity_id, item.entity_name, config)
                : ''
            }
            ${
              config?.show?.state
                ? html`
                    <span class="state">${item.label}</span>
                  `
                : html``
            }
            ${
              config?.show?.duration?
                 html`
                      <span class="duration" >
                        <logbook-duration .hass="${this.hass}" .config="${config}" .duration="${item.duration}"></logbook-duration>
                      </span>
                    `
                : html``
             }
             ${
              config?.show?.elapsed_time?
                 html`
                      <span class="duration" >
                        <logbook-elapsedtime .hass="${this.hass}" .config="${config}" .duration="${item.elapsed_time}"></logbook-elapsedtime>
                      </span>
                    `
                : html``
             }
            ${this.renderHistoryDate(item, config)}${item.attributes?.map(this.renderAttributes)}
          </div>
        </div>
        <div class="row-item-images" id="image_${id}"></div>
      </div>
        ${!isLast ? this.renderSeparator(config) : ``}
    `;
  }

  handleClickEventOnHistory(e, historyItem: History, config: LogbookCardConfigBase) {
    const previousItemId = this.currentItemId;
    this.currentItemId = this.generateItemId(historyItem);
    if (config?.gallery?.show_gallery) {
      this.hilightHistoryItem(e.srcElement, config);
      this.showImages(historyItem, config, previousItemId ?? '');
    }
    if (config?.service_to_call) {
      this.callHassService(historyItem, config);
    }
    console.log(historyItem);
  }

  /****** GALLERY Fx()s   ******/

  renderModalforPopupImage(config: LogbookCardConfigBase): TemplateResult {
    return html`
      <div
        id="imageModal"
        class="modal"
        @touchstart="${event => this.handleTouchStart(event)}"
        @touchmove="${event => this.handleTouchMove(event)}"
      >
        <img class="modal-content" id="popupImage" />
       <div id="popupCaption"></div>

      </div>
    `;
  }

  renderItemImages(id: string, config: LogbookCardConfigBase): TemplateResult {
    let _variations: string[];
    if (config.gallery?.variations !== undefined && config.gallery?.variations !== null) {
      _variations = config.gallery?.variations.split('|');
    } else {
      _variations = [''];
    }
    let namingPattern;
    if (config.gallery?.naming_pattern !== undefined && config.gallery?.naming_pattern !== null) {
      namingPattern = config.gallery?.naming_pattern;
    } else {
      namingPattern = '';
    }
    let content = html``;
    let inc = 0;
    for (const pattern of _variations) {
      inc++;
      const filename = `${this.generateGalleryFileName(namingPattern, id, pattern)}`;

      content = html`
        ${content}
        <div class="column-item-images">
          <img src="${filename}" @click="${() => this.popupImage(filename, id)}" class="hover-shadow" />
        </div>
      `;
    }

    return html`
      ${content}
    `;
  }

  generateGalleryFileName(namingPattern: string, value: string, varia: string) {
    let result = namingPattern;
    if (namingPattern === undefined || value === undefined || varia === undefined) return '';

    result = result.replace('$entity_value', value);
    result = result.replace('$variation', varia);
    return result;
  }

  showImages(historyItem: History, config: LogbookCardConfigBase, previousItemId: string) {
    if (previousItemId === this.currentItemId) return;
    let image_row = this.shadowRoot?.querySelector('#image_' + previousItemId) as HTMLElement;
    if (image_row !== null && image_row !== undefined) {
      //hide  the element
      image_row.style.display = 'none';
    }

    //show images
    image_row = this.shadowRoot?.querySelector('#image_' + this.currentItemId) as HTMLElement;
    if (image_row.className.includes('image-loaded')) {
      image_row.style.display = 'block';
    } else {
      image_row.className += ' image-loaded';
      render(this.renderItemImages(this.currentItemId ?? '', config), image_row);
    }
  }

  hilightHistoryItem(row, config: LogbookCardConfigBase) {
    const parent = this.shadowRoot?.querySelector('.card-content');
    if (!parent) {
      console.warn("Parent element with class 'card-content' not found");
      return;
    }
    // deselect all the others
    const items = Array.from(parent.getElementsByClassName('item-main-container')) as HTMLElement[];
    for (let i = 0; i < items.length; i++) {
      items[i].className = items[i].className.replace(' history-row-selected', '');
    }

    let row_element = row;
    if (row === undefined || row === null) {
    } else {
      //normal selection process
      while (
        row_element.attributes.class === undefined ||
        !row_element.attributes.class.value.includes('item-main-container')
      ) {
        row_element = row_element.parentElement;
      }
      //select current
      row_element.className += ' history-row-selected';
    }
  }

  popupImage(file, value) {
    const modal = this.shadowRoot?.querySelector('#imageModal') as HTMLElement;

    modal.style.display = 'block';
    this.loadImageForPopup(file, value);
    modal.scrollIntoView(true);

    modal.addEventListener('click', function() {
      modal.style.display = 'none';
    });
  }

  loadImageForPopup(file, value) {
    const modal = this.shadowRoot?.querySelector('#imageModal') as HTMLElement;
    const modalImg = this.shadowRoot?.querySelector('#popupImage') as HTMLImageElement;
    const captionText = this.shadowRoot?.querySelector('#popupCaption');

    if (modal.style.display === 'block') {
      modalImg.src = file;
      if (captionText) {
        captionText.innerHTML = value;
      }
    }
//setup pinch and zoom
    const pz = new PinchZoom(modalImg, {
      draggableUnzoomed: false,
      zoomOutFactor: 1,
      minZoom: 1,
      onZoomStart: function(object, event) {
        // Do something on zoom start
        // You can use any Pinchzoom method by calling object.method()
      },
      onZoomEnd: function(object, event) {
        // Do something on zoom end
      },
    });
  }
  handleTouchStart(event) {
    if (event.touches.length > 1) {
      // event.preventDefault();
    }
  }
  handleTouchMove(event) {
    if (event.touches.length > 1) {
      //event.preventDefault(); // prevent pinch zoom on
    }
  }
  /****** END GALLERY Fx()s   ******/

  /****** SERVICE CALL Fx()s   ******/

  callHassService(historyItem: History, config: LogbookCardConfigBase) {
    //TODO read service  from config
    const service = config.service_to_call;
    if (service === undefined || service === '') {
      console.warn(
        'Service to call not defined. Open the card configuration and set the service to call adding a line `service_to_call: script.gallery_set_image_id`',
      );
      return;
    }
    const couple = service.split('.');
    this.hass.callService(couple[0], couple[1], {
      entity_id: historyItem.stateObj.entity_id,
      name: historyItem.entity_name,
      state: historyItem.state,
      label: historyItem.label,
      start: historyItem.start,
      end: historyItem.end,
      duration: historyItem.duration,
      elapsed_time: historyItem.elapsed_time,
      attributes: historyItem.attributes,

    });

    /***EMPTY History obj
         const historyItem: History=  {
           entity_name: '',
           state: '',
           label: '',
           type: 'history',
           stateObj: {
             entity_id: '',
             state: '',
             attributes: {},
             last_changed: new Date().toISOString(),
             last_updated: new Date().toISOString(),
             context: {
               id: '',
               user_id: null,
               parent_id: null,
             },
           },
           start: new Date(),
           end: new Date(),
           duration: 0,
           attributes: [],
            icon: { color: '' ,icon:''}, // Replace with a valid IconState object
         };
     */
  }

  /****** END SERVICE CALL Fx()s   ******/

  protected renderCustomLogEvent(
    customLogEvent: CustomLogEvent,
    isLast: boolean,
    config: LogbookCardConfigBase,
  ): TemplateResult {
    return html`
      <div class="item custom-log">
        ${this.renderCustomLogIcon(customLogEvent, config)}
        <div class="item-content">
          ${this.mode === 'multiple' && config.show?.entity_name
            ? this.renderEntity(customLogEvent.entity, customLogEvent.entity_name, config)
            : ''}
          <span class="custom-log__name">${customLogEvent.name}</span>
          <span class="custom-log__separator">-</span>
          <span class="custom-log__message">${customLogEvent.message}</span>
          <div class="date">
            <logbook-date .hass=${this.hass} .date=${customLogEvent.start} .config=${config}></logbook-date>
          </div>
        </div>
      </div>
      ${!isLast ? this.renderSeparator(config) : ``}
    `;
  }

  protected renderCustomLogIcon(customLog: CustomLogEvent, config: LogbookCardConfigBase): TemplateResult | void {
    if (config?.show?.icon) {
      const state = this.hass.states[customLog.entity] as HassEntity;
      return this.renderIcon(state, customLog.icon, customLog.icon_color);
    }
  }

  protected renderHistoryIcon(item: History, config: LogbookCardConfigBase): TemplateResult | void {
    if (config?.show?.icon) {
      return this.renderIcon(item.stateObj, item.icon?.icon, item.icon?.color);
    }
  }

  private renderIcon(state: HassEntity, icon: string | undefined, color: string | undefined): TemplateResult {
    return html`
      <div class="item-icon">
        <state-badge .hass=${this.hass} .stateObj=${state} .overrideIcon=${icon} .color=${color} .stateColor=${true}>
        </state-badge>
      </div>
    `;
  }

  protected renderDaySeparator(item: CustomLogEvent | History, config: LogbookCardConfigBase): TemplateResult {
    if (!config.group_by_day) {
      return html``;
    }
    return html`
      <div class="date-separator">
        ${new Intl.DateTimeFormat(this.hass.locale?.language ?? 'en', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }).format(item.start)}
      </div>
    `;
  }

  protected renderSeparator(config: LogbookCardConfigBase): TemplateResult | void {
    const style: StyleInfo = {
      border: '0',
      'border-top': `${config?.separator_style?.width}px ${config?.separator_style?.style} ${config?.separator_style?.color}`,
    };
    if (config?.show?.separator) {
      return html`
        <hr class="separator" style=${styleMap(style)} aria-hidden="true" />
      `;
    }
  }

  protected renderEntity(entity: string, name: string, config: LogbookCardConfigBase): TemplateResult {
    return html`
      <span
        class="entity"
        .entity=${entity}
        @action=${this._handleAction}
        .actionHandler=${actionHandler({
          hasHold: hasAction(config.hold_action),
          hasDoubleClick: hasAction(config.double_tap_action),
        })}
        >${name}</span
      >
    `;
  }

  protected renderAttributes(attribute: Attribute): TemplateResult {
    return html`
      <div class="attribute">
        <div class="key">${attribute.name}</div>
        <div class="value">${attribute.value}</div>
      </div>
    `;
  }

  renderHistoryDate(item: History, config: LogbookCardConfigBase): TemplateResult {
    if (config?.show?.start_date && config?.show?.end_date) {
      return html`
        <div class="date">
          <logbook-date .hass=${this.hass} .date=${item.start} .config=${config}></logbook-date> -
          <logbook-date .hass=${this.hass} .date=${item.end} .config=${config}></logbook-date>
        </div>
      `;
    }
    if (config?.show?.end_date) {
      return html`
        <div class="date">
          <logbook-date .hass=${this.hass} .date=${item.end} .config=${config}></logbook-date>
        </div>
      `;
    }
    if (config?.show?.start_date) {
      return html`
        <div class="date">
          <logbook-date .hass=${this.hass} .date=${item.start} .config=${config}></logbook-date>
        </div>
      `;
    }
    return html``;
  }

  static get styles(): CSSResultGroup {
    return css`
     /**** GALLERY *****/
      .row-item-images > .column-item-images {
        padding: 0 8px;
      }

      .item-main-container!important {
        padding: 8px
      }
      .row-item-images {
        display: table;
        border-collapse: collapse;
        width: 100%;
        padding-top: 8px
      }

      .column-item-images {
        display: table-cell;
        vertical-align: top;

      }
      .column-item-images img {
        display: block;
        width: 100%;
        height: auto;
      }

      .modal {
        display: none; /* Hidden by default */
        position: fixed; /* Stay in place */
        z-index: 1; /* Sit on top */
        padding-top: 1px; /* Location of the box */
        left: 0;
        top: 0;
        width: 100%; /* Full width */
        height: 100%; /* Full height */
        overflow: auto; /* Enable scroll if needed */
        background-color: rgb(0,0,0); /* Fallback color */
        background-color: rgba(0,0,0,0.9); /* Black w/ opacity */
      }
      /* Modal Content (Image) */
      .modal-content {
        margin: auto;
        display: block;
        width: 95%;
      }
      /* Caption of Modal Image (Image Text) - Same Width as the Image */
      #popupCaption {
        margin: auto;
        display: block;
        width: 80%;
        max-width: 700px;
        text-align: center;
        color: #ccc;
        padding: 10px 0;
      }

      /* 100% Image Width on Smaller Screens */
      @media only screen and (max-width: 700px){
        .modal-content {
          width: 100%;
        }

      }
       img.hover-shadow {
        transition: 0.3s;
      }

      .hover-shadow:hover {
        box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.19);
      }

      .history-row-selected {
        background-color:rgb(199, 251, 251);
        color:rgb(0, 0, 0);
        border: 2px solid rgb(50, 122, 122);
        border-radius: 4px;
        padding-bottom: 8px
      }

      /**** END GALLERY *****/

      .copy {
        user-select: text;
        background-color: red;
      }
      ha-card {
        overflow: clip;
      }
      .card-content-scroll {
        max-height: 345px;
        overflow-y: auto;
        scrollbar-width: thin;
        scrollbar-gutter: stable;
      }
      .item {
        clear: both;
        padding: 5px 2px;
        display: flex;
        line-height: var(--paper-font-body1_-_line-height);
      }
      .item-content {
        flex: 1;
      }
      .item-icon {
        flex: 0 0 4rem;
        color: var(--paper-item-icon-color, #44739e);
        display: flex;
        justify-content: center;
      }
      .entity {
        color: var(--paper-item-icon-color);
        cursor: pointer;
      }
      state-badge {
        line-height: 1.5rem;
      }
      state-badge[icon] {
        height: fit-content;
      }
      .state {
        white-space: pre-wrap;
      }
      .duration {
        font-size: 0.85rem;
        font-style: italic;
        float: right;
      .date,
      .attribute {
        font-size: 0.8rem;
        color: var(--secondary-text-color);
      }
      .attribute {
        display: flex;
        justify-content: space-between;
      }
      .expand {
        display: none;
      }
      .expand + label {
        display: block;
        text-align: right;
        cursor: pointer;
      }
      .expand + label > div {
        display: inline-block;
        transform: rotate(-90deg);
        font-size: 26px;
        height: 29px;
        width: 29px;
        text-align: center;
      }
      .expand + label > div,
      .expand + label + div {
        transition: 0.5s ease-in-out;
      }
      .expand:checked + label > div {
        transform: rotate(-90deg) scaleX(-1);
      }
      .expand + label + div {
        display: none;
        overflow: hidden;
      }
      .expand:checked + label + div {
        display: block;
      }
      .date-separator {
        display: block;
        border-block-end: 1px solid var(--divider-color);
        padding: 0.5rem 1rem;
        font-weight: bold;
        margin-block-end: 1rem;
      }

    `;
  }
}
