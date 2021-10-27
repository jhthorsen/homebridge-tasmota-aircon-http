const TasmotaAirconHTTP = require('./src/tasmota-aircon-http.js');

class HomeBridgeTasmotaAirconHTTP {
  constructor(log, config, api) {
    this.name = config.name;
    this.driver = new TasmotaAirconHTTP(config);
    this.log = log;
    this.log.info('TasmotaAirconHTTP Accessory Plugin Loaded');
    this.heaterCoolerService = this._setupHeaterCoolorService(api.hap);
    this.informationService = this._setupInformationService(api.hap);
  }

  getServices() {
    return [this.informationService, this.heaterCoolerService];
  }

  _proxy(method, args) {
    this.log.info(method + ' ' + JSON.stringify(args));
    this.driver[method](args);
  }

  _setupHeaterCoolorService({Characteristic, Service}) {
    const service = new Service.HeaterCooler(this.name);

    const modes = {
      Automatic: Characteristic.CurrentHeaterCoolerState.IDLE,
      Cooling: Characteristic.CurrentHeaterCoolerState.COOLING,
      Fanonly: Characteristic.CurrentHeaterCoolerState.INACTIVE,
      Heating: Characteristic.CurrentHeaterCoolerState.HEATING,
    };

    Object.keys(modes).forEach(k => { modes[modes[k]] = k });

    service.getCharacteristic(Characteristic.Active)
      .onGet(() => this.driver.state.on ? Characteristic.Active.ACTIVE : Characteristic.Active.INACTIVE)
      .onSet(val => this._proxy('setOn', val == Characteristic.Active.ACTIVE));

    service.getCharacteristic(Characteristic.CoolingThresholdTemperature)
      .onGet(() => this.driver.state.temperature)
      .onSet(val => this._proxy('setTemperature', val));

    service.getCharacteristic(Characteristic.CurrentHeaterCoolerState)
      .onGet(() => modes[this.driver.state.mode] || Characteristic.CurrentHeaterCoolerState.IDLE);

    service.getCharacteristic(Characteristic.CurrentTemperature)
      .onGet(() => this.driver.state.temperature);

    service.getCharacteristic(Characteristic.HeatingThresholdTemperature)
      .onGet(() => this.driver.state.temperature)
      .onSet(val => this._proxy('setTemperature', val));

    service.getCharacteristic(Characteristic.RotationSpeed)
      .onGet(() => this.driver.state.fan_speed)
      .onSet(val => this._proxy('setFanSpeed', val));

    service.getCharacteristic(Characteristic.SwingMode)
      .onGet(() => this.driver.state.swing_vertical ? Characteristic.SwingMode.SWING_ENABLED : Characteristic.SwingMode.SWING_DISABLED)
      .onSet(val => this._proxy('setFanSwing', val == Characteristic.SwingMode.SWING_ENABLED));

    service.getCharacteristic(Characteristic.TargetHeaterCoolerState)
      .onGet(() => modes[this.driver.state.mode] || Characteristic.CurrentHeaterCoolerState.AUTO)
      .onSet(val => this._proxy('setMode', modes[val]));

    return service;
  }

  _setupInformationService({Characteristic, Service}) {
    const service = new Service.AccessoryInformation();
    service.setCharacteristic(Characteristic.Manufacturer, this.driver.state.vendor);
    service.setCharacteristic(Characteristic.Model, this.name);
    service.setCharacteristic(Characteristic.SerialNumber, 'S01001');
    return service;
  }
}

module.exports = (api) => {
  api.registerAccessory('TasmotaAirconHTTP', HomeBridgeTasmotaAirconHTTP);
};
