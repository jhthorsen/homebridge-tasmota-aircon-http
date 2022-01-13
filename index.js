const debounce = require('debounce');
const pkg = require('./package.json');
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
    this.state = this._initialState(config);
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
    const services = [ this.informationService, this.heaterCoolerService ];
    if (this.state.turboswitch) services.push( this.switchTurboService );
    if (this.state.econoswitch) services.push( this.switchEconoService );
    if (this.state.quietswitch) services.push( this.switchQuietService );
    return services ;
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
  }

  _characteristicActive({Characteristic}, val) {
    if (arguments.length == 2) this.set({power: val === Characteristic.Active.ACTIVE});
    return this.state.power ? Characteristic.Active.ACTIVE : Characteristic.Active.INACTIVE;
  }

  _characteristicSwitchTurboActive({Characteristic}, val) {
    /**const name = this.getCharacteristic(Characteristic.Name).value ;
    this.log.info('HK On : ' + this.switchTurboService.getCharacteristic(Characteristic.On).value );
    this.log.info('HK Name : ' + this.switchTurboService.getCharacteristic(Characteristic.Name).value );
    this.log.info('HK Name 2 : ' + name );
    this.log.info('Turbo : ' + this.state.turbo ); */
    if (arguments.length == 2)
      this.set({turbo: val, econo: false, quiet: false});
      this.switchEconoService.updateCharacteristic(Characteristic.On, false);
      this.switchQuietService.updateCharacteristic(Characteristic.On, false);
    return this.state.turbo ;
  }

  _characteristicSwitchEconoActive({Characteristic}, val) {
    if (arguments.length == 2)
      this.set({turbo: false, econo: val, quiet: false });
      this.switchTurboService.updateCharacteristic(Characteristic.On, false);
      this.switchQuietService.updateCharacteristic(Characteristic.On, false);
    return this.state.econo ;
  }

  _characteristicSwitchQuietActive({Characteristic}, val) {
    if (arguments.length == 2)
      this.set({turbo: false, econo: false, quiet: val });
      this.switchTurboService.updateCharacteristic(Characteristic.On, false);
      this.switchEconoService.updateCharacteristic(Characteristic.On, false);
    return this.state.quiet ;
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
    this.getTempFromTasmota();
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
      model: "Tasmota",
      quiet: false,
      sleep: -1,
      swingHorizontal: false,
      turbo: false,

      // Editable from Homebridge Plugin Settings GUI
      beep: config.beep || false,
      light: config.light || false,
      turboswitch: config.turboswitch || false,
      econoswitch: config.econoswitch || false,
      quietswitch: config.quietswitch || false,
      name: config.name || 'DAIKIN',
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

  _setupSwitchTurboService({Characteristic, Service}) {
    const service = new Service.Switch('Turbo', 'turbo');
    const method = '_characteristicSwitchTurboActive' ;
    const characteristic = service.getCharacteristic(Characteristic['On']);
    characteristic.onGet(() => this[method]({Characteristic}));
    characteristic.onSet(val => this[method]({Characteristic}, val));
    return service;
  }

  _setupSwitchEconoService({Characteristic, Service}) {
    const service = new Service.Switch('Eco', 'eco');
    const method = '_characteristicSwitchEconoActive' ;
    const characteristic = service.getCharacteristic(Characteristic['On']);
    characteristic.onGet(() => this[method]({Characteristic}));
    characteristic.onSet(val => this[method]({Characteristic}, val));
    return service;
  }

  _setupSwitchQuietService({Characteristic, Service}) {
    const service = new Service.Switch('Quiet', 'quiet');
    const method = '_characteristicSwitchQuietActive' ;
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
