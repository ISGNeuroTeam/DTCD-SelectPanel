import pluginMeta from './Plugin.Meta';
import PluginComponent from './PluginComponent.vue';

import {
  PanelPlugin,
  LogSystemAdapter,
  EventSystemAdapter,
  StorageSystemAdapter,
  DataSourceSystemAdapter,
} from './../../DTCD-SDK';

export class SelectPanel extends PanelPlugin {

  #guid;
  #id;
  #logSystem;
  #eventSystem;
  #storageSystem;
  #dataSourceSystem;
  #dataSourceSystemGUID;
  #vueComponent;

  #config = {
    label: '',
    dataSource: '',
    valueColumn: 'value',
    titleColumn: 'title',
  };

  static getRegistrationMeta() {
    return pluginMeta;
  }

  constructor(guid, selector) {
    super();

    this.#guid = guid;
    this.#id = `${pluginMeta.name}[${guid}]`;
    this.#logSystem = new LogSystemAdapter('0.7.0', guid, pluginMeta.name);
    this.#eventSystem = new EventSystemAdapter('0.5.0', guid);
    this.#storageSystem = new StorageSystemAdapter('0.9.0');
    this.#dataSourceSystem = new DataSourceSystemAdapter('0.4.0');

    this.#eventSystem.registerPluginInstance(this, ['ValueChanged']);

    const { default: VueJS } = this.getDependence('Vue');

    const view = new VueJS({
      data: () => ({}),
      methods: {
        publishEvent: (event, value) => {
          this.#eventSystem.publishEvent(event, value);
        }
      },
      render: h => h(PluginComponent),
    }).$mount(selector);

    this.#vueComponent = view.$children[0];
    this.#logSystem.debug(`${this.#id} initialization complete`);
    this.#logSystem.info(`${this.#id} initialization complete`);
  }

  setVueComponentPropValue(prop, value) {
    const methodName = `set${prop.charAt(0).toUpperCase() + prop.slice(1)}`;
    if (this.#vueComponent[methodName]) {
      this.#vueComponent[methodName](value);
    } else {
      throw new Error(`В компоненте отсутствует метод ${methodName} для присвоения свойства ${prop}`);
    }
  }

  setPluginConfig(config = {}) {
    this.#logSystem.debug(`Set new config to ${this.#id}`);
    this.#logSystem.info(`Set new config to ${this.#id}`);

    const configProps = Object.keys(this.#config);

    for (const [prop, value] of Object.entries(config)) {
      if (!configProps.includes(prop)) continue;

      if (prop === 'dataSource') {
        const prevDS = this.#config[prop];
        const newDS = value;

        if (newDS === prevDS) continue;

        const subscribeParams = [
          this.#dataSourceSystemGUID,
          'DataSourceStatusUpdate',
          this.#guid,
          'processDataSourceEvent',
        ];

        if (prevDS) {
          this.#logSystem.debug(`
            Unsubscribing ${this.#id} from DataSourceStatusUpdate({
              dataSource: ${prevDS},
              status: 'success',
            })
          `);

          this.#eventSystem.unsubscribe(...subscribeParams, {
            dataSource: prevDS,
            status: 'success',
          });
        }

        this.#logSystem.debug(`
          Subscribing ${this.#id} for DataSourceStatusUpdate({
            dataSource: ${newDS},
            status: 'success'
          })
        `);

        this.#eventSystem.subscribe(...subscribeParams, {
          dataSource: newDS,
          status: 'success',
        });

        const ds = this.#dataSourceSystem.getDataSource(newDS);

        if (ds && ds.status === 'success') {
          const data = this.#storageSystem.session.getRecord(newDS);
          this.loadData(data);
        }
      } else this.setVueComponentPropValue(prop, value);

      this.#config[prop] = value;
      this.#logSystem.debug(`${this.#id} config prop value "${prop}" set to "${value}"`);
    }
  }

  getPluginConfig() {
    return { ...this.#config };
  }

  loadData(data = []) {
    this.setVueComponentPropValue('dataset', data);
  }

  processDataSourceEvent(eventData) {
    const { dataSource, status } = eventData;
    const data = this.#storageSystem.session.getRecord(dataSource);
    this.#logSystem.debug(`
      ${this.#id} process DataSourceStatusUpdate({
        dataSource: ${dataSource},
        status: '${status}'
      })
    `);
    this.loadData(data);
  }

  setFormSettings(config = {}) {
    return this.setPluginConfig(config);
  }

  getFormSettings() {
    return {
      fields: [
        {
          component: 'datasource',
          propName: 'dataSource',
          attrs: {
            label: 'Выберите источник данных',
            placeholder: 'Выберите значение',
            required: true,
          },
        },
        {
          component: 'text',
          propName: 'label',
          attrs: {
            label: 'Подпись',
          },
        },
        {
          component: 'text',
          propName: 'valueColumn',
          attrs: {
            label: 'Колонка со значением',
          },
        },
        {
          component: 'text',
          propName: 'titleColumn',
          attrs: {
            label: 'Колонка с заголовком',
          },
        },
      ],
    };
  }

  getState() {
    return this.getPluginConfig();
  }

  setState(newState) {
    if (typeof newState !== 'object' ) return;

    this.setPluginConfig(newState);
  }
}
