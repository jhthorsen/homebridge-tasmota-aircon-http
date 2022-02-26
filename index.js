const debounce = require('debounce');
const path = require('path');
const pkg = require('./package.json');
const storage = require('node-persist');
const superagent = require('superagent');

/**
 * HomeBridgeTasmotaAirconHTTP will listen for accessory changes in HomeKit and send
 * the new state to a Tasmota powered IR device over HTTP.
 *
 * @module HomeBridgeTasmotaAirconHTTP
 */
class HomeBridgeTasmotaAirconHTTP {

  /**
   * HomeBridgeTasmotaAirconHTTP constructor
   *
   * @param {Object} log A log object provided by Homebridge
   * @param {Object} config Config from Homebridge Plugin Settings GUI
   * @param {Homebrige} api A homebridge object
   */
  constructor(log = console, config = {}, api = {}) {
    this.name = config.name || 'HomeBridgeTasmotaAirconHTTP';
    this.identity = '';
    this.log = log;
    this.sendStateToTasmotaLater = debounce(() => this.sendStateToTasmota(), 1000);
    this.superagent = superagent; // TODO: Is superagent needed?

    this.fanSteps = config.fanSteps || 5; // Used to translate {0..100} to {1..fanSteps}

    // If exists, get Previous state from storage
    if (api.user) storage.initSync({'dir': path.join(api.user.storagePath(), 'HomeBridgeTasmotaAirconHTTP')});
    this.state = storage.getItemSync(this.name) || this._initialState(config);

    this.tasmotaBaseUrl = config.tasmota_url || config.tasmota_uri ||new URL('http://192.168.50.4/');

    // api.hap does not exist if called from "npm run cmd"
    if (api.hap) {
      this.heaterCoolerService = this._setupHeaterCoolorService(api.hap);
      this.informationService = this._setupInformationService(api.hap);
      this.switchTurboService = this._setupSwitchTurboService(api.hap);
      this.switchEconoService = this._setupSwitchEconoService(api.hap);
      this.switchQuietService = this._setupSwitchQuietService(api.hap);
    }
  }

  /**
   * Called by Homebridge to get the available services
   *
   * @return {Array} A list of services.
   */
  getServices() {
    const services = [this.informationService, this.heaterCoolerService];
    if (this.state.econoswitch) services.push(this.switchEconoService);
    if (this.state.quietswitch) services.push(this.switchQuietService);
    if (this.state.turboswitch) services.push(this.switchTurboService);
    return services;
  }

  /**
   * Will serialize the current state and send it to the Tasmota device,
   * using HTTP.
   *
   * @param {Function} Will be called with (err, res) from the request
   */
  sendStateToTasmota(cb) {
    const url = new URL(this.tasmotaBaseUrl.toString());
    url.pathname = '/cm';
    url.searchParams.set('cmnd', 'IRhvac ' + JSON.stringify(this._stateToTasmotaState()));

    if (!cb) cb = (err, res) => err ? this.log.error(err) : this.log.debug(res.body);
    this.superagent.get(url.toString()).end(cb);
  }

  /**
   * This method is used to alter the state. This method will also
   * call sendStateToTasmota() at some time in the future.
   *
   * @example
   * plugin.set({
   *   fanSpeed,      // {0..100}
   *   mode,          // {auto, cool, heat}
   *   power,         // {false, true}
   *   swingVertical, // {false, true}
   *   temperature,   // {-270,100}
   * });
   *
   * @param {Object} params Key/value pairs of what to change
   */
  set(params) {
    this.log.info('Set ' + JSON.stringify(params));
    Object.keys(params).forEach(k => (this.state[k] = params[k]));
    this.sendStateToTasmotaLater();
    storage.setItem(this.name, this.state);
  }

  _characteristicActive({Characteristic}, val) {
    if (arguments.length == 2) this.set({power: val === Characteristic.Active.ACTIVE});
    return this.state.power ? Characteristic.Active.ACTIVE : Characteristic.Active.INACTIVE;
  }

  _characteristicCurrentHeaterCoolerState({Characteristic}) {
    if (!this.state.power) return Characteristic.CurrentHeaterCoolerState.INACTIVE;
    if (this.state.mode == 'cool') return Characteristic.CurrentHeaterCoolerState.COOLING;
    if (this.state.mode == 'heat') return Characteristic.CurrentHeaterCoolerState.HEATING;
    return Characteristic.CurrentHeaterCoolerState.IDLE;
  }

  _characteristicCoolingThresholdTemperature({Characteristic}, temperature) {
    if (arguments.length == 2) this.set({temperature});
    return this.state.temperature;
  }

  _characteristicCurrentTemperature(...args) {
    return this._characteristicCoolingThresholdTemperature(...args);
  }

  _characteristicHeatingThresholdTemperature(...args) {
    return this._characteristicCoolingThresholdTemperature(...args);
  }

  _characteristicRotationSpeed({Characteristic}, fanSpeed) {
    if (arguments.length == 2) this.set({fanSpeed});
    return this.state.fanSpeed;
  }

  _characteristicSwingMode({Characteristic}, val) {
    if (arguments.length == 2) this.set({swingVertical: val === Characteristic.SwingMode.SWING_ENABLED});
    return this.state.swingVertical ? Characteristic.SwingMode.SWING_ENABLED : Characteristic.SwingMode.SWING_DISABLED;
  }

  _characteristicSwitchEconoOn({Characteristic}, val) {
    if (arguments.length == 2 && !val) {
      this.set({econo: false});
    }
    else if (arguments.length == 2 && val) {
      this.set({econo: true, quiet: false, turbo: false});
      this.switchQuietService.updateCharacteristic(Characteristic.On, false);
      this.switchTurboService.updateCharacteristic(Characteristic.On, false);
    }

    return this.state.econo;
  }

  _characteristicSwitchQuietOn({Characteristic}, val) {
    if (arguments.length == 2 && !val) {
      this.set({quiet: false});
    }
    else if (arguments.length == 2 && val) {
      this.set({econo: false, quiet: true, turbo: false});
      this.switchEconoService.updateCharacteristic(Characteristic.On, false);
      this.switchTurboService.updateCharacteristic(Characteristic.On, false);
    }

    return this.state.quiet;
  }

  _characteristicSwitchTurboOn({Characteristic}, val) {
    if (arguments.length == 2 && !val) {
      this.set({turbo: false});
    }
    else if (arguments.length == 2 && val) {
      this.set({econo: false, quiet: false, turbo: true});
      this.switchEconoService.updateCharacteristic(Characteristic.On, false);
      this.switchQuietService.updateCharacteristic(Characteristic.On, false);
    }

    return this.state.turbo;
  }

  _characteristicTargetHeaterCoolerState({Characteristic}, val) {
    if (arguments.length == 2) {
      this.set({
        mode: val == Characteristic.TargetHeaterCoolerState.COOL ? 'cool'
            : val == Characteristic.TargetHeaterCoolerState.HEAT ? 'heat'
            :                                                      'auto'
      });
    }

    const state = this.state.mode.toUpperCase(); // auto, heat, cool
    return Characteristic.TargetHeaterCoolerState[state];
  }

  _initialState(config) {
    return {
      // Static (for now)
      clean: false,
      econo: false,
      filter: false,
      model: 'Tasmota',
      quiet: false,
      sleep: -1,
      swingHorizontal: false,
      turbo: false,

      // Editable from Homebridge Plugin Settings GUI
      beep: config.beep || false,
      econoswitch: config.econoswitch || false,
      light: config.light || false,
      name: config.name || 'DAIKIN',
      quietswitch: config.quietswitch || false,
      turboswitch: config.turboswitch || false,
      vendor: config.vendor || 'DAIKIN',

      // Get and (maybe) set by service
      fanSpeed: 50, // {0..100}
      mode: 'auto',
      power: false,
      swingVertical: false,
      temperature: 20,
      temperatureUnit: config.temperature_unit || 'C', // C or F
    };
  }

  _setupHeaterCoolorService({Characteristic, Service}) {
    const service = new Service.HeaterCooler(this.name);

    [
      ['ro', 'CurrentHeaterCoolerState'],
      ['ro', 'CurrentTemperature'],
      ['rw', 'Active'],
      ['rw', 'CoolingThresholdTemperature'],
      ['rw', 'HeatingThresholdTemperature'],
      ['rw', 'RotationSpeed'],
      ['rw', 'SwingMode'],
      ['rw', 'TargetHeaterCoolerState'],
    ].forEach(([rorw, name]) => {
      const method = '_characteristic' + name;
      const characteristic = service.getCharacteristic(Characteristic[name]);
      characteristic.onGet(() => this[method]({Characteristic}))
      if (rorw == 'rw') characteristic.onSet(val => this[method]({Characteristic}, val));
    });

    return service;
  }

  _setupInformationService({Characteristic, Service}) {
    const service = new Service.AccessoryInformation();
    service.getCharacteristic(Characteristic.FirmwareRevision).onGet(() => pkg.version);
    service.getCharacteristic(Characteristic.Identify).onSet(val => this.log.info('Identity ' + (this.identity = val)));
    service.getCharacteristic(Characteristic.Manufacturer).onGet(() => 'TasmotaAirconHTTP');
    service.getCharacteristic(Characteristic.Model).onGet(() => this.state.model);
    service.getCharacteristic(Characteristic.Name).onGet(() => this.name);
    service.getCharacteristic(Characteristic.SerialNumber).onGet(() => 'S01');
    return service;
  }

  _setupSwitchEconoService({Characteristic, Service}) {
    const service = new Service.Switch('Econo', 'econo');
    const method = '_characteristicSwitchEconoOn';
    const characteristic = service.getCharacteristic(Characteristic['On']);
    characteristic.onGet(() => this[method]({Characteristic}));
    characteristic.onSet(val => this[method]({Characteristic}, val));
    return service;
  }

  _setupSwitchQuietService({Characteristic, Service}) {
    const service = new Service.Switch('Quiet', 'quiet');
    const method = '_characteristicSwitchQuietOn' ;
    const characteristic = service.getCharacteristic(Characteristic['On']);
    characteristic.onGet(() => this[method]({Characteristic}));
    characteristic.onSet(val => this[method]({Characteristic}, val));
    return service;
  }

  _setupSwitchTurboService({Characteristic, Service}) {
    const service = new Service.Switch('Turbo', 'turbo');
    const method = '_characteristicSwitchTurboOn' ;
    const characteristic = service.getCharacteristic(Characteristic['On']);
    characteristic.onGet(() => this[method]({Characteristic}));
    characteristic.onSet(val => this[method]({Characteristic}, val));
    return service;
  }

  _stateToTasmotaState() {
    const state = this.state;
    const normalizeOnOff = (val) => val === false ? 'Off' : 'On';
    const ucfirst = (str) => str.substring(0, 1).toUpperCase() + str.substring(1);

    return {
      Beep: normalizeOnOff(state.beep),
      Celsius: normalizeOnOff(state.temperatureUnit != 'F'),
      Clean: normalizeOnOff(state.clean),
      Econo: normalizeOnOff(state.econo),
      FanSpeed: String(Math.ceil(this.fanSteps * state.fanSpeed / 100) || 1), // Should never be zero, because it would mean "Off"
      Filter: normalizeOnOff(state.filter),
      Light: normalizeOnOff(state.light),
      Mode: ucfirst(state.mode),
      Model: state.model,
      Power: normalizeOnOff(state.power),
      Quiet: normalizeOnOff(state.quiet),
      Sleep: state.sleep,
      SwingH: normalizeOnOff(state.swingHorizontal),
      SwingV: normalizeOnOff(state.swingVertical),
      Temp: state.temperature,
      Turbo: normalizeOnOff(state.turbo),
      Vendor: state.vendor,
    };
  }
}

module.exports = (api) => {
  return !api ? HomeBridgeTasmotaAirconHTTP : api.registerAccessory('TasmotaAirconHTTP', HomeBridgeTasmotaAirconHTTP)
};
