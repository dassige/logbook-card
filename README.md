# Logbook card

[![hacs][hacs-badge]][hacs-url]
[![release][release-badge]][release-url]
![downloads][downloads-badge]

<a href="https://www.buymeacoffee.com/royto" target="_blank"><img src="https://www.buymeacoffee.com/assets/img/custom_images/white_img.png" alt="Buy Me A Coffee" style="height: auto !important;width: auto !important;" ></a>

2 customs [Lovelace](https://www.home-assistant.io/lovelace/) cards for displaying history of an entity or multiple entities for [Home Assistant](https://www.home-assistant.io/).

![logbook card example](images/screenshot.png)

**WARNING**: Since 1.0.0, the resource type of the card is `JavaScript Module` and not `JavaScript File` anymore. In case of loading error, check if the resource type is `JavaScript module`.

- [Installation](#installation)
  - [HACS](#hacs)
  - [Manual](#manual)
- [Using the card](#using-the-card)
  - [Options](#options)
    - [Logbook Card options](#logbook-card-options)
    - [Multiple entities Logbook Card options](#multiple-entities-logbook-card-options)
    - [Entity object](#entity-object)
    - [State map object](#state-map-object)
    - [Custom log map object](#custom-log-map-object)
    - [Available show options](#available-show-options)
    - [Gallery object](#gallery-object)
    - [Attribute object](#attribute-object)
    - [Duration object](#duration-object)
    - [Duration labels object](#duration-labels-object)
      - [Until v1.4.1](#until-v141)
      - [FROM v1.5.0](#from-v150)
    - [Hidden config object](#hidden-config-object)
    - [Attribute hidden config object](#attribute-hidden-config-object)
    - [Separator style object](#separator-style-object)
    - [Action Options](#action-options)
- [Custom Styling](#custom-styling)
- [Example usage](#example-usage)
  - [Hidden states](#hidden-states)
  - [Multiple entities](#multiple-entities)
  - [State label](#state-label)
  - [Attributes and custom date format](#attributes-and-custom-date-format)
  - [Duration labels](#duration-labels)
  - [Custom separator style](#custom-separator-style)
  - [Custom icons](#custom-icons)
  - [Example with collapsed view](#example-with-collapsed-view)
  - [Custom log](#custom-log)
  - [Gallery](#gallery)
  - [Service call](#service-call)


## Installation

### HACS

This card is available in [HACS](https://hacs.xyz/) (Home Assistant Community Store).

### Manual

Download the logbook-card.js from the latest release and store it in your configuration/www folder.
Configure Lovelace to load the card:

```yaml
resources:
  - url: /local/logbook-card.js?v=1
    type: module
```

## Using the card

### Options

#### Logbook Card options


| Name              | Type                                                     | Required     | Since   | Deprecated | Default                  | Description                                                                                                                                 |
| ------------------- | ---------------------------------------------------------- | -------------- | --------- | ------------ | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| type              | string                                                   | **required** | v0.1    |            | `custom:logbook-card`    |                                                                                                                                             |
| entity            | string                                                   | **required** | v0.1    |            | An entity_id.            |                                                                                                                                             |
| title             | string                                                   | optional     | v0.1    |            | _friendly_name_ History  | Card title                                                                                                                                  |
| history           | integer                                                  | optional     | v0.1    | v2.4.0     | 5                        | Numbers of days of history of the logbook                                                                                                   |
| hours_to_show     | integer                                                  | optional     | v2.4.0  |            | 120                      | Numbers of hours of history of the logbook                                                                                                  |
| hidden_state      | string[] or[hidden config object](#hidden-config-object) | optional     | v1.6.0  |            | []                       | Hide logbook entry based on state and/or attribute. string value represent the state (wildcards are supported)                              |
| desc              | bool                                                     | optional     | v0.1    |            | True                     | is logbook ordered descending                                                                                                               |
| no_event          | string                                                   | optional     | v0.1    |            | No event on the period   | message displayed if no event to display                                                                                                    |
| max_items         | integer                                                  | optional     | v0.2    |            | -1                       | Number of items to display. Ignored if < 0                                                                                                  |
| state_map         | [state map object](#state-map-object)                    | optional     | v0.2    |            | []                       | List of entity states to convert                                                                                                            |
| custom_log_map    | [custom log map object](#custom-log-map-object)          | optional     | v2.1    |            | []                       | List of custom log to convert                                                                                                               |
| show              | list                                                     | optional     | v0.2    |            |                          | List of UI elements to display/hide, for available items see available[show options](#available-show-options).                              |
| attributes        | [attributes object](#attribute-object)                   | optional     | v0.4    |            | []                       | List of attributes to display.                                                                                                              |
| duration_labels   | [duration_labels object](#until-v141)                    | optional     | v0.5    | v1.5.0     |                          | labels for duration.                                                                                                                        |
| date_format       | string or`relative`                                      | optional     | v1.0    |            | default date time format | see[fecha formatting token](https://github.com/taylorhakes/fecha#formatting-tokens). Use `relative` to have relative time like `2 days ago` |
| separator_style   | [separator_style object](#separator-style-object)        | optional     | v1.0    |            |                          | see style for separator (if activated)                                                                                                      |
| collapse          | number                                                   | optional     | v1.2    |            |                          | Number of entities to show. Rest will be available in expandable section                                                                    |
| custom_logs       | boolean                                                  | optional     | v1.13.0 |            | false                    | display custom logs sent by`logbook.log` service                                                                                            |
| show_history      | boolean                                                  | optional     | v2.0    |            | true                     | Display entity logbook event                                                                                                                |
| duration          | [duration object](#duration-object)                      | optional     | v1.5.0  |            |                          | duration configuration                                                                                                                      |
| scroll            | boolean                                                  | optional     | v1.9.0  |            | true                     | set a max height for card and use scrollbar                                                                                                 |
| tap_action        | [action object](#action-options)                         | optional     | v1.7.0  |            | action: more-info        | Action to take on tap                                                                                                                       |
| hold_action       | [action object](#action-options)                         | optional     | v1.7.0  |            | none                     | Action to take on hold                                                                                                                      |
| double_tap_action | [action object](#action-options)                         | optional     | v1.7.0  |            | none                     | Action to take on double tap                                                                                                                |
| minimal_duration  | number (in seconds)                                      | optional     | v1.11.0 |            |                          | Filter entry if duration is less than`minimal_duration` (entry will be squash if previous and next entry has same state)                    |
| group_by_day      | boolean                                                  | optional     | v2.0.0  |            | false                    | Group entries by day using a day separator                                                                                                  |


#### Multiple entities Logbook Card options

the `custom:multiple-logbook-card` card has been introduce in v2.0.0.


| Name              | Type                                              | Required     | Since  | Deprecated | Default                        | Description                                                                                                                                 |
| ------------------- | --------------------------------------------------- | -------------- | -------- | ------------ | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| type              | string                                            | **required** | v2.0.0 |            | `custom:multiple-logbook-card` |                                                                                                                                             |
| entities          | [entity config object](#entity-object)            | **required** | v2.0.0 |            |                                | List of entities with its configuration.                                                                                                    |
| title             | string                                            | optional     | v2.0.0 |            |                                | Card title. Hidden if empty                                                                                                                 |
| history           | integer                                           | optional     | v2.0.0 | v2.4.0     | 5                              | Numbers of days of history of the logbook                                                                                                   |
| hours_to_show     | integer                                           | optional     | v2.4.0 |            | 120                            | Numbers of hours of history of the logbook                                                                                                  |
| desc              | bool                                              | optional     | v2.0.0 |            | True                           | is logbook ordered descending                                                                                                               |
| no_event          | string                                            | optional     | v2.0.0 |            | No event on the period         | message displayed if no event to display                                                                                                    |
| max_items         | integer                                           | optional     | v2.0.0 |            | -1                             | Number of items to display. Ignored if < 0                                                                                                  |
| show              | list                                              | optional     | v2.0.0 |            |                                | List of UI elements to display/hide, for available items see available[show options](#available-show-options).                              |
| duration_labels   | [duration_labels object](#until-v141)             | optional     | v2.0.0 |            |                                | labels for duration.                                                                                                                        |
| date_format       | string or`relative`                               | optional     | v2.0.0 |            | default date time format       | see[fecha formatting token](https://github.com/taylorhakes/fecha#formatting-tokens). Use `relative` to have relative time like `2 days ago` |
| separator_style   | [separator_style object](#separator-style-object) | optional     | v2.0.0 |            |                                | see style for separator (if activated)                                                                                                      |
| collapse          | number                                            | optional     | v2.0.0 |            |                                | Number of entities to show. Rest will be available in expandable section                                                                    |
| duration          | [duration object](#duration-object)               | optional     | v2.0.0 |            | duration configuration         |                                                                                                                                             |
| elapsed_time          | [duration object](#duration-object)                      | optional     | DGSoft  |            |                          | Elapsed time  configuration                                                                                                                      |
| scroll            | boolean                                           | optional     | v2.0.0 |            | true                           | set a max height for card and use scrollbar                                                                                                 |
| tap_action        | [action object](#action-options)                  | optional     | v2.0.0 |            | action: more-info              | Action to take on tap                                                                                                                       |
| hold_action       | [action object](#action-options)                  | optional     | v2.0.0 |            | none                           | Action to take on hold                                                                                                                      |
| double_tap_action | [action object](#action-options)                  | optional     | v2.0.0 |            | none                           | Action to take on double tap                                                                                                                |
| minimal_duration  | number (in seconds)                               | optional     | v2.0.0 |            |                                | Filter entry if duration is less than`minimal_duration` (entry will be squash if previous and next entry has same state)                    |
| group_by_day      | boolean                                           | optional     | v2.0.0 |            | false                          | Group entries by day using a day separator                                                                                                  |
| gallery           | [Gallery object](#gallery-object)                 | optional     | DGsoft |            |                                |
|service_to_call    | string                                            | optional     | DGsoft |            |                                | hass service that will be called when clicking on an log item row. Format is `servicetype.servicename`. All the history item properties will be passed to the service as parameters. See example at [Service call](#service-call)

#### Entity object


| Name           | Type                                                     | Required     | Since | Deprecated | Default | Description                                                                                                             |
| ---------------- | ---------------------------------------------------------- | -------------- | ------- | ------------ | --------- | ------------------------------------------------------------------------------------------------------------------------- |
| entity         | string                                                   | **required** | v2.0  |            |         | Name of the entity                                                                                                      |
| label          | string                                                   | optional     | v2.1  |            |         | Entity label                                                                                                            |
| attributes     | [attributes object](#attribute-object)                   | optional     | v2.0  |            | []      | List of attributes to display.                                                                                          |
| hidden_state   | string[] or[hidden config object](#hidden-config-object) | optional     | v2.0  |            | []      | Hide logbook entry based on state and/or attribute. string value represent the state (wildcards are supported)          |
| custom_logs    | boolean                                                  | optional     | v2.0  |            | false   | Display custom logs sent by`logbook.log` service. Set `show_history` to  `false` if you only want custom logs displayed |
| show_history   | boolean                                                  | optional     | v2.0  |            | true    | Display entity logbook event                                                                                            |
| state_map      | [state map object](#state-map-object)                    | optional     | v2.0  |            | []      | List of entity states to convert                                                                                        |
| custom_log_map | [custom log map object](#custom-log-map-object)          | optional     | v2.1  |            | []      | List of custom log to convert                                                                                           |

#### State map object


| Name                  |                           Type                           |      Default      | Description                             | Since  |
| ----------------------- | :---------------------------------------------------------: | :------------------: | ----------------------------------------- | -------- |
| value**_(required)_** |                          string                          |                   | Value to convert. wildcard is supported |        |
| label                 |                          string                          |   same as value   | String to show as label.                |        |
| icon                  |                          string                          | default state icon | Icon to show.                           |        |
| icon_color            |                          string                          |                   | icon color for this state.              | v1.6.0 |
| attributes            | [attribute state map object](#attribute-state-map-object) |         []         | Attributes to match to be converted     | v2.5.0 |

If you use wildcard, make sure to put the more specific states first.

#### Attribute state map object


| Name                  |  Type  | Default | Description                            | Since  |
| ----------------------- | :------: | :-------: | ---------------------------------------- | -------- |
| name**_(required)_**  | string |         | attribute name.                        | v2.5.0 |
| value**_(required)_** | string |         | attribute value. wildcard is supported | v2.5.0 |

#### Custom log map object


| Name       |  Type  |      Default      | Description                                      | Since  |
| ------------ | :-------: | :------------------: | -------------------------------------------------- | -------- |
| name       | string |                   | name of the custom log. wildcard is supported    | v2.1.0 |
| message    | string |                   | message of the custom log. wildcard is supported | v2.1.0 |
| icon       | string | default state icon | icon to use                                      | v2.1.0 |
| icon_color | string |                   | icon color for this custom log                   | v2.1.0 |
| hidden     | boolean |       false       | hide custom log                                  | v2.3.0 |

If you use wildcard, make sure to put the more specific custom log first.

#### Available show options

All properties are optional.


| Name        | Default |     Options     | Description                                 |
| ------------- | :-------: | :----------------: | --------------------------------------------- |
| state       | `true` | `true` / `false` | Display state                               |
| duration    | `true` | `true` / `false` | Display duration                            |
| start_date  | `true` | `true` / `false` | Display start date                          |
| end_date    | `true` | `true` / `false` | Display end date                            |
| icon        | `true` | `true` / `false` | Display icon                                |
| separator   | `false` | `true` / `false` | Display separator                           |
| entity_name | `true` | `true` / `false` | Display entity name (for multiple entities) |
| elapsed_time| `false` | `true` / `false` | Display elapsed time from the previous item |


#### Gallery object


| Name                  |  Type  |    Default    | Description                                                         |
| ----------------------- | :------: | :-------------: | --------------------------------------------------------------------- |
| show_gallery**_(required)_** | boolean |               | if the gallery feature must be shown.                                             |
| variations                 | string |               | pattern vor the variations for the file name. Variations must be separated by the pipe char.                                            |
| naming_pattern                  | string |               | the pattern to generate the filenames.`$entity_value` and `$variation` placehoder can be used in the pattern |
Example here [Gallery](#gallery)

#### Attribute object


| Name                  |  Type  |    Default    | Description                                                         |
| ----------------------- | :------: | :-------------: | --------------------------------------------------------------------- |
| value**_(required)_** | string |               | name of the attributes.                                             |
| label                 | string | same as value | String to show as label.                                            |
| type                  | string |               | Type of the value used for formatting.`date` or `url` are supported |
| link_label            | string |               | Link label to use when`type` is `url`.                              |


#### Duration object


| Name      |                 Type                 | Default | Description                                                                                                                                     |
| ----------- | :------------------------------------: | :-------: | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| largest   |                number                |   `1`   | Number representing the maximum number of units to display for the duration. Use`full` for no limitation                                        |
| labels    | [duration labels object](#from-v150) |         | [Style](https://developer.mozilla.org/en-US/docs/Web/CSS/border-style) of the separator.                                                        |
| units     |             string array             |         | Array of strings to define which units are used to display the duration (if needed). Allowed values: ['y', 'mo', 'w', 'd', 'h', 'm', 's', 'ms'] |
| delimiter |                string                |         | String to display between the previous unit and the next value.                                                                                 |
| only_first         | boolean |  false  | if duration is showing and only_first is true, only the duratin for the first history item will be displayed, for the purpose of give the time elapsed from the first item and now (DGSoft)                   |


#### Duration labels object

##### Until v1.4.1

This configuration is _Deprecated since v.1.5.0_.

Allows to have custom labels for duration. Must contains `${value}` which will be replaced by the duration.


| Name    |  Type  |   Default   | Description        |
| --------- | :------: | :-----------: | -------------------- |
| second  | string | `${value}s` | label for second.  |
| seconds | string | `${value}s` | label for seconds. |
| minute  | string | `${value}m` | label for minute.  |
| minutes | string | `${value}m` | label for minutes. |
| hour    | string | `${value}h` | label for hour.    |
| hours   | string | `${value}h` | label for hours.   |
| day     | string | `${value}d` | label for day.     |
| days    | string | `${value}d` | label for days.    |

##### FROM v1.5.0

Allows to have custom labels for duration.


| Name   |  Type  | Default | Description       |
| -------- | :------: | :-------: | ------------------- |
| second | string |   `s`   | label for second. |
| minute | string |   `m`   | label for minute. |
| hour   | string |   `h`   | label for hour.   |
| day    | string |   `d`   | label for day.    |
| week   | string |   `w`   | label for week.   |
| month  | string |   `m`   | label for month.  |

#### Hidden config object

Introduce in 1.10.0


| Name      |                               Type                               | Default | Description        |
| ----------- | :-----------------------------------------------------------------: | :-------: | -------------------- |
| state     |                              string                              |         | state to hide.     |
| attribute | [Attribute hidden config object](#attribute-hidden-config-object) |         | attribute to match |

#### Attribute hidden config object

Introduce in 1.10.0


| Name                  |  Type  | Default | Description                                       |
| ----------------------- | :-------: | :-------: | --------------------------------------------------- |
| name**_(required)_**  | string |         | the name of the attribute                         |
| value**_(required)_** | string |         | the value of the attribute. wildcard is supported |
| hideIfMissing         | boolean |  false  | hidden if attribute is not set.                   |

#### Separator style object


| Name  |  Type  |        Default        | Description                                                                              |
| ------- | :------: | :----------------------: | ------------------------------------------------------------------------------------------ |
| width | number |          `1`          | Width of the separator.                                                                  |
| style | string |        `solid`        | [Style](https://developer.mozilla.org/en-US/docs/Web/CSS/border-style) of the separator. |
| color | string | `var(--divider-color)` | Color of the separator.                                                                  |

#### Action Options


| Name            | Type   | Requirement  | Description                                                                                        | Default     |
| ----------------- | -------- | -------------- | ---------------------------------------------------------------------------------------------------- | ------------- |
| action          | string | **Required** | Action to perform (more-info, toggle, call-service, navigate url, none)                            | `more-info` |
| navigation_path | string | **Optional** | Path to navigate to (e.g. /lovelace/0/) when action defined as navigate                            | `none`      |
| url             | string | **Optional** | URL to open on click when action is url. The URL will open in a new tab                            | `none`      |
| service         | string | **Optional** | Service to call (e.g. media_player.media_play_pause) when action defined as call-service           | `none`      |
| service_data    | object | **Optional** | Service data to include (e.g. entity_id: media_player.bedroom) when action defined as call-service | `none`      |
| haptic          | string | **Optional** | Haptic feedback_success, warning, failure, light, medium, heavy, selection_                        | `none`      |
| repeat          | number | **Optional** | How often to repeat the`hold_action` in milliseconds.                                              | `none`      |

## Custom Styling

The card style can be customize using [lovelace card mod](https://github.com/thomasloven/lovelace-card-mod)

After installation, you just have to add a  card_mod properties with your custom styles

Here an example to make state in bold.

```yaml
type: custom:logbook-card
entity: light.living_room
card_mod:
  style: |
    .state {
      font-weight: bold;
    }
```

![card with custom style to put state in bold](images/custom_styles.png)

Here an example to put custom log name above message and style them.

```yaml
type: custom:logbook-card
entity: light.living_room
card_mod:
  style: |
    .custom-log .item-content {
      display: flex;
      flex-direction: column;
    }
    .custom-log .custom-log__separator {
        display: none;
    }
    .custom-log .item-content .custom-log__name {
        font-weight: bold;
    }
    .custom-log .item-content .custom-log__message {
       font-style: italic;
       text-indent: 0px;
    }
```

![custom log style](images/Custom_log_style.png)

Here is the list of style you can override:


| Class                  | Target                             |
| ------------------------ | ------------------------------------ |
| .item                  | container for an entry             |
| .history               | if entry is entity history         |
| .custom-log            | if entry is custom log             |
| .item-content          | container for                      |
| .item-icon             | item icon                          |
| .entity                | name of the entity when multiple   |
| .custom-log__name      | custom log name                    |
| .custom-log__separator | custom log separator               |
| .custom-log__message   | custom log message                 |
| .state                 | entity state                       |
| .duration              | duration                           |
| .date                  | date                               |
| .attribute             | attribute                          |
| .expand                | expander when collapsed item       |
| .separator             | entry separator (needs !important) |
| .date-separator        | date separator                     |

## Usage in panel mode

The card can be used in panel mode. Use this custom style to have the card in full page

```yaml
type: custom:logbook-card
entity: light.living_room
card_mod:
  style: |
    ha-card .card-content-scroll {
      height: 100%;
      max-height: 100%;
    }
```

## Example usage

### Hidden states

```yaml
type: 'custom:logbook-card'
desc: true
entity: sun.sun
hidden_state:
  - above_horizon
title: Day history
```

### Multiple entities

```yaml
type: 'custom:multiple-logbook-card'
desc: true
entities:
  - entity: sun.sun
    hidden_state:
      - above_horizon
  - entity: sensor.moon_phase
title: Sun And Moon
```

![logbook card with multiple entities](images/multiple_entities.png)

### State label

```yaml
entity: binary_sensor.garage_opening_sensor
max_items: 10
state_map:
  - label: Open
    value: on
  - label: Closed
    value: off
title: 'Garage door history'
type: 'custom:logbook-card'
show:
  end_date: false
  start_date: true
```

![Custom labels](images/custom-labels.png)

### Attributes and custom date format

```yaml
type: 'custom:logbook-card'
desc: true
entity: sun.sun
title: Day history
attributes:
  - value: elevation
  - value: next_rising
    label: Next Rising
    type: date
date_format: DD/MM/YYYY HH:mm
```

![Attributes and custom date format](images/attributes.png)

### Duration labels

```yaml
type: 'custom:logbook-card'
desc: true
entity: binary_sensor.garage_opening_sensor
title: 'Garage'
duration:
  labels:
    second: 's'
    minute: 'm'
    hour: 'h'
    day: 'j'
    week: 'w'
    month: 'm'
```

### Custom separator style

```yaml
type: 'custom:logbook-card'
desc: true
entity: binary_sensor.garage_opening_sensor
title: 'Garage Door History'
show:
  separator: true
separator_style:
  color: black
  style: dashed
```

![Custom Separator](images/custom-separator.png)

### Custom icons

```yaml
entity: sensor.vacuum
hidden_state:
  - ''
state_map:
  - icon: 'mdi:stove'
    value: Kitchen
  - icon: 'mdi:hotel'
    value: Girls bedroom
  - icon: 'mdi:bed-double'
    value: Bedroom
  - icon: 'mdi:water-pump'
    value: Bathroom
  - icon: 'mdi:television'
    value: Living room
title: Vacuum History
type: 'custom:logbook-card'
```

![custom icon](images/custom-icon.png)

### Example with collapsed view

```yaml
entity: sensor.vacuum
hidden_state:
  - ''
collapse: 5
title: Vacuum History
type: 'custom:logbook-card'
```

![custom icon](images/collapse.png)

### Custom log

```yaml
entity: sensor.logger
type: custom:logbook-card
group_by_day: true
scroll: true
show_history: false
date_format: relative
custom_logs: true
custom_log_map:
  - name: Name test
    icon: 'mdi:lightbulb-cfl'
    icon_color: '#a772e9'
  - name: from automation
    icon: 'mdi:lightbulb-cfl-spiral'
    icon_color: '#e9a772'
```

![Custom log with custom icon](./images/custom_log_map.png)

### Gallery

```yaml
type: custom:multiple-logbook-card
entities:
  - entity: counter.counter_a
    label: Enters
  - entity: counter.counter_b
    label: Exits
...
gallery:
  show_gallery: true
  variations: ext-1d|int-1d|int-2d
  naming_pattern: /local/snapshots/catflap/$entity_value-$variation.jpg

```


### Service Call

```yaml
type: custom:multiple-logbook-card
entities:
  - entity: counter.counter_a
    label: Enters
  - entity: counter.counter_b
    label: Exits
...
service_to_call: script.do_something
```
to the service `do_something`, in this case a script, all the following parameters for the history item will be passed:
      `entity_id`,
      `name`,
      `state`,
      `label`,
      `start`,
      `end`,
      `duration`,
      `elapsed_time`,
      `attributes` (array of Attributes)
They can be used in a template inside the service body, for example in the script:
```yaml
action: input_text.set_value
metadata: {}
data:
  value: "This history item is from entity {{name}}-{{state}} and started at {{start}} after {{elapsed_time}} since the previous history item happened"
target:
  entity_id: input_text.gallery_image_id
```


<!-- Badges -->

[hacs-url]: https://github.com/hacs/integration
[hacs-badge]: https://img.shields.io/badge/hacs-default-orange.svg?style=flat-square
[release-badge]: https://img.shields.io/github/v/release/royto/logbook-card?style=flat-square
[downloads-badge]: https://img.shields.io/github/downloads/royto/logbook-card/total?style=flat-square
[release-url]: https://github.com/royto/logbook-card/releases
