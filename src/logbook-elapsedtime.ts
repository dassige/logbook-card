import { LitElement, html, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { LogbookCardConfig, ExtendedHomeAssistant } from './types';
import { HumanizeDurationLanguage, HumanizeDuration, HumanizeDurationOptions } from 'humanize-duration-ts';

@customElement('logbook-elapsedtime')
export class LogbookDuration extends LitElement {
  @property({ type: Object }) public hass!: ExtendedHomeAssistant;
  @property({ type: Object }) public config!: LogbookCardConfig;
  @property({ type: Number }) public elapsed_time!: number;

  protected render(): TemplateResult | void {

    if (!this.config || !this.hass || !this.elapsed_time) {
      return html``;
    }

     return html`
      ${this.getDuration(this.elapsed_time)}
    `;

  }

  private getDuration(durationInMs: number): string {
    if (!durationInMs) {
      return '';
    }

    const humanizeDuration = new HumanizeDuration(new HumanizeDurationLanguage());
    let language = humanizeDuration.getSupportedLanguages().includes(this.hass?.language ?? 'en')
      ? this.hass?.language
      : 'en';


      humanizeDuration.addLanguage('custom', {
        y: () => 'y',
        mo: () => this.config?.elapsed_time?.labels?.month ?? 'mo',
        w: () => this.config?.elapsed_time?.labels?.week ?? 'w',
        d: () => this.config?.elapsed_time?.labels?.day ?? 'd',
        h: () => this.config?.elapsed_time?.labels?.hour ?? 'h',
        m: () => this.config?.elapsed_time?.labels?.minute ?? 'm',
        s: () => this.config?.elapsed_time?.labels?.second ?? 's',
        ms: () => 'ms',
        decimal: '',
      });
      language = 'custom';


    const humanizeDurationOptions: HumanizeDurationOptions = {
      language,
      units: this.config?.elapsed_time?.units,
      round: true,
    };

    if (this.config?.elapsed_time?.largest !== 'full') {
      humanizeDurationOptions['largest'] = this.config?.elapsed_time?.largest;
    }

    if (this.config?.elapsed_time?.delimiter !== undefined) {
      humanizeDurationOptions['delimiter'] = this.config.elapsed_time.delimiter;
    }

    return humanizeDuration.humanize(durationInMs, humanizeDurationOptions);
  }

}
