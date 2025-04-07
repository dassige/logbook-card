import { ShowConfiguration, SeparatorStyleConfig, DurationConfig } from './types';
export const CARD_VERSION = '2.5.6';

export const DEFAULT_SHOW: ShowConfiguration = {
  state: true,
  duration: false,
  elapsed_time: true,
  start_date: true,
  end_date: true,
  icon: true,
  separator: false,
  entity_name: true,
};

export const DEFAULT_DURATION: DurationConfig = {
  largest: 'full',
  labels: {
    month: "m",
    week: "w",
    day: "d",
    hour:   "h",
    minute: "m",
    second:   "s" },
  /*undefined,

*/
  delimiter: undefined,
  units: ['w', 'd', 'h', 'm', 's'],
  only_first: false,
};

export const DEFAULT_SEPARATOR_STYLE: SeparatorStyleConfig = {
  width: 1,
  style: 'solid',
  color: 'var(--divider-color)',
};
