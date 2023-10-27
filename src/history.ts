import { HassEntity } from 'home-assistant-js-websocket/dist/types';
import { History, ExtendedHomeAssistant, StateMap, AttributeConfig, HiddenRegExp, HiddenConfig } from './types';

import {
  extractAttributes,
  filterEntry,
  filterIfDurationIsLessThanMinimal,
  mapIcon,
  mapState,
  squashSameState,
} from './entity-helper';

export interface EntityHistoryConfig {
  attributes?: AttributeConfig[];
  date_format?: string | 'relative';
  entity: string;
  hidden_state_regexp: Array<HiddenRegExp>;
  minimal_duration?: number;
  state_map?: StateMap[];
}

export const toHistory = (
  entityHistory: HassEntity[],
  hass: ExtendedHomeAssistant,
  config: EntityHistoryConfig,
): History[] => {
  return (
    entityHistory //empty if no history
      .map(h => ({
        type: 'history',
        stateObj: h,
        state: h.state,
        label: mapState(hass, h, config.state_map || []),
        start: new Date(h.last_changed),
        attributes: extractAttributes(h, config, hass),
        icon: mapIcon(h, config.state_map || []),
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
      .map(
        x =>
          ({
            ...x,
            duration: x.end.valueOf() - x.start.valueOf(),
          } as History),
      )
      .filter(entry => filterIfDurationIsLessThanMinimal(config, entry))
      //squash same state or unknown with previous state
      .reduce(squashSameState, [])
      .filter(entry => filterEntry(config, entry))
  );
};

export const getHistory = (
  hass: ExtendedHomeAssistant,
  config: EntityHistoryConfig,
  startDate: Date,
): Promise<History[]> => {
  const uri =
    'history/period/' +
    startDate.toISOString() +
    '?filter_entity_id=' +
    config.entity +
    '&end_time=' +
    new Date().toISOString();

  return hass
    .callApi<Array<HassEntity[]>>('GET', uri)
    .then(hassEntityHistory => toHistory(hassEntityHistory[0] || [], hass, config));
};
