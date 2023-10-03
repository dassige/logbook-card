import { LogbookCardEditor } from './editor';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { LitElement, html, TemplateResult, css, PropertyValues, CSSResultGroup } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { styleMap, StyleInfo } from 'lit-html/directives/style-map.js';
import {
  hasConfigOrEntityChanged,
  LovelaceCardEditor,
  handleAction,
  ActionHandlerEvent,
  hasAction,
} from 'custom-card-helpers';

import './editor';
import './logbook-date';
import './logbook-duration';
import {
  LogbookCardConfig,
  History,
  Attribute,
  HiddenRegExp,
  ExtendedHomeAssistant,
  HistoryOrCustomLogEvent,
  CustomLogEvent,
} from './types';
import { CARD_VERSION, DEFAULT_SHOW, DEFAULT_SEPARATOR_STYLE, DEFAULT_DURATION } from './const';
import { localize } from './localize/localize';
import { actionHandler } from './action-handler-directive';
import { addSlashes, wildcardToRegExp } from './helpers';
import { extractAttributes, mapIcon, mapState } from './entity-helper';

/* eslint no-console: 0 */
console.info(
  `%c LOGBOOK-CARD %c ${CARD_VERSION} `,
  'color: orange; font-weight: bold; background: black',
  'color: darkblue; font-weight: bold; background: white',
);

// Puts card into the UI card picker dialog
(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: 'logbook-card',
  name: 'Logbook Card',
  preview: true,
  description: 'A custom card to display entity history',
});

@customElement('logbook-card')
export class LogbookCard extends LitElement {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    return document.createElement('logbook-card-editor') as LogbookCardEditor;
  }

  public static getStubConfig(_hass: ExtendedHomeAssistant, entities: Array<any>): Record<string, unknown> {
    return {
      entity: entities[0],
    };
  }

  // Add any properties that should cause your element to re-render here
  @property({ type: Object }) public hass!: ExtendedHomeAssistant;
  @state() private config!: LogbookCardConfig;
  @property({ type: Array }) private history: Array<HistoryOrCustomLogEvent> = [];

  private lastHistoryChanged?: Date;
  private MAX_UPDATE_DURATION = 5000;
  private hiddenStateRegexp: Array<HiddenRegExp> = new Array<HiddenRegExp>();

  public setConfig(config: LogbookCardConfig): void {
    if (!config) {
      throw new Error(localize('common.invalid_configuration'));
    }
    if (!config.entity) {
      throw new Error('Please define an entity.');
    }
    if (config.max_items !== undefined && !Number.isInteger(config.max_items)) {
      throw new Error('max_items must be an Integer.');
    }
    if (config.hidden_state && !Array.isArray(config.hidden_state)) {
      throw new Error('hidden_state must be an array');
    }
    if (config.state_map && !Array.isArray(config.state_map)) {
      throw new Error('state_map must be an array');
    }
    if (config.attributes && !Array.isArray(config.attributes)) {
      throw new Error('attributes must be an array');
    }
    if (config.desc && typeof config.desc !== 'boolean') {
      throw new Error('desc must be a boolean');
    }
    if (config.collapse && !Number.isInteger(config.collapse)) {
      throw new Error('collapse must be a number');
    }
    if (config.collapse && config.max_items && config.max_items > 0 && config.collapse > config.max_items) {
      throw new Error('collapse must be lower than max-items');
    }
    if (config.duration?.units && !Array.isArray(config.duration.units)) {
      throw new Error('duration.units must be an array');
    }
    if (config.duration?.largest && !Number.isInteger(config.duration.largest) && config.duration.largest !== 'full') {
      throw new Error('duration.largest should be a number or `full`');
    }
    if (config.minimal_duration && !Number.isInteger(config.minimal_duration) && config.minimal_duration <= 0) {
      throw new Error('minimal_duration should be a positive number');
    }

    this.config = {
      history: 5,
      hidden_state: [],
      desc: true,
      max_items: -1,
      no_event: 'No event on the period',
      attributes: [],
      scroll: true,
      custom_logs: false,
      ...config,
      state_map:
        config.state_map?.map(state => {
          return {
            ...state,
            regexp: wildcardToRegExp(state.value ?? ''),
          };
        }) ?? [],
      show: { ...DEFAULT_SHOW, ...config.show },
      duration: { ...DEFAULT_DURATION, ...config.duration },
      duration_labels: { ...config.duration_labels },
      separator_style: { ...DEFAULT_SEPARATOR_STYLE, ...config.separator_style },
    };

    if (this.config.hidden_state) {
      this.hiddenStateRegexp = this.config.hidden_state
        .map(h => (typeof h === 'string' ? { state: h } : h))
        .map(hs => ({
          state: wildcardToRegExp(hs.state),
          attribute: !hs.attribute
            ? undefined
            : {
                name: hs.attribute.name,
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                value: wildcardToRegExp(hs.attribute.value)!,
                hideIfMissing: hs.attribute.hideIfMissing ?? false,
              },
        }));
    }
  }

  squashSameState(array: Array<History>, val: History): Array<History> {
    const prev = array[array.length - 1];
    if (!prev || (prev.state !== val.state && val.state !== 'unknown')) {
      array.push(val);
    } else {
      prev.end = val.end;
      prev.duration += val.duration;
    }
    return array;
  }


  filterIfDurationIsLessThanMinimal(entry: History): boolean {
    if (!this.config.minimal_duration) {
      return true;
    }
    return entry.duration >= this.config.minimal_duration * 1000;
  }

  filterEntry(entry: History): boolean {
    if (this.hiddenStateRegexp.length === 0) {
      return true;
    }
    return !this.hiddenStateRegexp.some(regexp => {
      if (!!regexp.attribute && !Object.keys(entry.stateObj.attributes).some(a => a === regexp.attribute?.name)) {
        return regexp.attribute.hideIfMissing;
      }

      if (!!regexp.state && !!regexp.attribute) {
        return (
          regexp.state.test(addSlashes(entry.state)) &&
          regexp.attribute.value.test(addSlashes(entry.stateObj.attributes[regexp.attribute.name]))
        );
      }

      if (!!regexp.attribute) {
        return regexp.attribute.value.test(addSlashes(entry.stateObj.attributes[regexp.attribute.name]));
      }

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return regexp.state!.test(addSlashes(entry.state));
    });
  }

  updateHistory(): void {
    const hass = this.hass;
    if (hass && this.config && this.config.entity) {
      const stateObj = this.config.entity in hass.states ? hass.states[this.config.entity] : null;

      if (stateObj) {
        this.config.title = this.config?.title ?? stateObj.attributes.friendly_name + ' History';

        const startDate = new Date(new Date().setDate(new Date().getDate() - (this.config.history ?? 5)));

        const uri =
          'history/period/' +
          startDate.toISOString() +
          '?filter_entity_id=' +
          this.config.entity +
          '&end_time=' +
          new Date().toISOString();

        const historyPromise = hass.callApi('GET', uri).then((history: any) => {
          return (
            (history[0] || []) //empty if no history
              .map(h => ({
                type: 'history',
                stateObj: h,
                state: h.state,
                label: mapState(this.hass, h, this.config.state_map || []),
                start: new Date(h.last_changed),
                attributes: extractAttributes(h, this.config, this.hass),
                icon: mapIcon(h, this.config.state_map || []),
              }))
              .map((x, i, arr) => {
                if (i < arr.length - 1) {
                  return {
                    ...x,
                    end: arr[i + 1].start,
                  };
                }
                return { ...x, end: new Date() };
              })
              .map(x => ({
                ...x,
                duration: x.end - x.start,
              }))
              .filter(entry => this.filterIfDurationIsLessThanMinimal(entry))
              //squash same state or unknown with previous state
              .reduce(this.squashSameState, [])
              .filter(entry => this.filterEntry(entry))
          );
        });
        const customLogsPromise = this.getCustomLogsPromise(startDate);

        Promise.all([historyPromise, customLogsPromise]).then(([history, customLogs]) => {
          let historyAndCustomLogs = [...history, ...customLogs].sort((a, b) => a.start.valueOf() - b.start.valueOf());

          if (this.config?.desc) {
            historyAndCustomLogs = historyAndCustomLogs.reverse();
          }
          if (this.config && this.config.max_items && this.config.max_items > 0) {
            historyAndCustomLogs = historyAndCustomLogs.splice(0, this.config?.max_items);
          }

          this.history = historyAndCustomLogs;
        });
      }

      this.lastHistoryChanged = new Date();
    }
  }

  private getCustomLogsPromise(startDate: Date): Promise<CustomLogEvent[]> {
    if (this.config.custom_logs) {
      return this.hass
        .callApi('GET', `logbook/${startDate.toISOString()}?entity=${this.config.entity}`)
        .then((response: any) => {
          return response
            .filter(e => e.context_service === 'log')
            .map(e => ({ start: new Date(e.when), name: e.name, message: e.message }));
        });
    }
    return Promise.resolve([]);
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (changedProps.has('history')) {
      return true;
    }
    changedProps.delete('history');
    if (
      !this.lastHistoryChanged ||
      hasConfigOrEntityChanged(this, changedProps, false) ||
      //refresh only every 5s.
      new Date().getTime() - this.lastHistoryChanged.getTime() > this.MAX_UPDATE_DURATION
    ) {
      this.updateHistory();
    }
    return false;
  }

  private _handleAction(ev: ActionHandlerEvent): void {
    if (this.hass && this.config && ev.detail.action) {
      handleAction(this, this.hass, this.config, ev.detail.action);
    }
  }

  protected render(): TemplateResult | void {
    if (!this.config || !this.hass || !this.lastHistoryChanged) {
      return html``;
    }

    const contentCardClass = this.config.scroll ? 'card-content-scroll' : '';

    return html`
      <ha-card tabindex="0">
        <h1
          aria-label=${`${this.config.title}`}
          class="card-header"
          @action=${this._handleAction}
          .actionHandler=${actionHandler({
            hasHold: hasAction(this.config.hold_action),
            hasDoubleClick: hasAction(this.config.double_tap_action),
          })}
        >
          ${this.config.title}
        </h1>
        <div class="card-content ${contentCardClass} grid" style="[[contentStyle]]">
          ${this.renderHistory(this.history, this.config)}
        </div>
      </ha-card>
    `;
  }

  renderHistory(items: HistoryOrCustomLogEvent[] | undefined, config: LogbookCardConfig): TemplateResult {
    //TODO: first render ...
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
        ${this.renderHistoryItems(items.slice(0, config.collapse))}
        <input type="checkbox" class="expand" id="${elemId}" />
        <label for="${elemId}"><div>&lsaquo;</div></label>
        <div>
          ${this.renderHistoryItems(items.slice(config.collapse))}
        </div>
      `;
    } else {
      return this.renderHistoryItems(items);
    }
  }

  renderHistoryItems(items: HistoryOrCustomLogEvent[]): TemplateResult {
    return html`
      ${items?.map((item, index, array) => {
        const isLast = index + 1 === array.length;
        if (item.type === 'history') {
          return this.renderHistoryItem(item, isLast);
        }
        return this.renderCustomLogEvent(item, isLast);
      })}
    `;
  }

  renderCustomLogEvent(customLogEvent: CustomLogEvent, isLast: boolean): TemplateResult {
    return html`
      <div class="item">
        ${this.renderCustomLogIcon()}
        <div class="item-content">
          ${customLogEvent.name} - ${customLogEvent.message}
          <div class="date">
            <logbook-date .hass=${this.hass} .date=${customLogEvent.start} .config=${this.config}></logbook-date>
          </div>
        </div>
      </div>
      ${!isLast ? this.renderSeparator() : ``}
    `;
  }

  renderHistoryItem(item: History, isLast: boolean): TemplateResult {
    return html`
      <div class="item">
        ${this.renderIcon(item)}
        <div class="item-content">
          ${this.config?.show?.state
            ? html`
                <span class="state">${item.label}</span>
              `
            : html``}
          ${this.config?.show?.duration
            ? html`
                <span class="duration">
                  <logbook-duration .hass="${this.hass}" .config="${this.config}" .duration="${item.duration}">
                  </logbook-duration>
                </span>
              `
            : html``}
          ${this.renderHistoryDate(item)}${item.attributes?.map(this.renderAttributes)}
        </div>
      </div>
      ${!isLast ? this.renderSeparator() : ``}
    `;
  }

  renderSeparator(): TemplateResult | void {
    const style: StyleInfo = {
      border: '0',
      'border-top': `${this.config?.separator_style?.width}px ${this.config?.separator_style?.style} ${this.config?.separator_style?.color}`,
    };
    if (this.config?.show?.separator) {
      return html`
        <hr style=${styleMap(style)} aria-hidden="true" />
      `;
    }
  }

  renderCustomLogIcon(): TemplateResult | void {
    if (this.config?.show?.icon && this.config.entity) {
      const state = this.hass.states[this.config.entity];
      return html`
        <div class="item-icon">
          <state-badge .stateObj=${state} stateColor="false"></state-badge>
        </div>
      `;
    }
  }

  renderIcon(item: History): TemplateResult | void {
    if (this.config?.show?.icon) {
      if (item.icon !== null) {
        return html`
          <div class="item-icon">
            <ha-icon .icon=${item.icon.icon} style=${item.icon.color ? `color: ${item.icon.color}` : ``}></ha-icon>
          </div>
        `;
      }
      return html`
        <div class="item-icon">
          <state-badge .stateObj=${item.stateObj} stateColor="true"></state-badge>
        </div>
      `;
    }
  }

  renderHistoryDate(item: History): TemplateResult {
    if (this.config?.show?.start_date && this.config?.show?.end_date) {
      return html`
        <div class="date">
          <logbook-date .hass=${this.hass} .date=${item.start} .config=${this.config}></logbook-date> -
          <logbook-date .hass=${this.hass} .date=${item.end} .config=${this.config}></logbook-date>
        </div>
      `;
    }
    if (this.config?.show?.end_date) {
      return html`
        <div class="date">
          <logbook-date .hass=${this.hass} .date=${item.end} .config=${this.config}></logbook-date>
        </div>
      `;
    }
    if (this.config?.show?.start_date) {
      return html`
        <div class="date">
          <logbook-date .hass=${this.hass} .date=${item.start} .config=${this.config}></logbook-date>
        </div>
      `;
    }
    return html``;
  }

  renderAttributes(attribute: Attribute): TemplateResult {
    return html`
      <div class="attribute">
        <div class="key">${attribute.name}</div>
        <div class="value">${attribute.value}</div>
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      .card-content-scroll {
        max-height: 345px;
        overflow-y: auto;
        scrollbar-width: thin;
        scrollbar-gutter: stable;
      }
      .item {
        clear: both;
        padding: 5px 0;
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
      state-badge {
        line-height: 1.5rem;
      }
      .state {
        white-space: pre-wrap;
      }
      .duration {
        font-size: 0.85rem;
        font-style: italic;
        float: right;
      }
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
    `;
  }
}
