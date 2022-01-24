const {Characteristic, Service} = require('hap-nodejs');
const HomeBridgeTasmotaAirconHTTP = require('../index.js')();
const t = require('tap');

t.test('basics', t => {
  t.test('constructor', t => {
    const p = new HomeBridgeTasmotaAirconHTTP();
    t.equal(p.name, 'HomeBridgeTasmotaAirconHTTP');
    t.equal(p.log, console);
    t.type(p.sendStateToTasmotaLater, 'function');
    t.equal(p.fanSteps, 5);
    t.equal(p.tasmotaBaseUrl.toString(), 'http://192.168.50.4/');
    t.end();
  });

  t.test('register', t => {
    let registered = [];
    const api = {registerAccessory: (...args) => (registered = args)};
    require('../index.js')(api);
    t.same(registered, ['TasmotaAirconHTTP', HomeBridgeTasmotaAirconHTTP]);
    t.end();
  });

  t.test('initial state', t => {
    const p = new HomeBridgeTasmotaAirconHTTP();

    t.same(p.state, {
      beep: false,
      clean: false,
      econo: false,
      econoswitch: false,
      fanAutoSpeed: 'disabled',
      fanSpeed: 50,
      filter: false,
      light: false,
      mode: 'auto',
      model: 'Tasmota',
      name: 'DAIKIN',
      power: false,
      quiet: false,
      quietswitch: false,
      sleep: -1,
      swingHorizontal: false,
      swingVertical: false,
      temperature: 20,
      temperatureUnit: 'C',
      turbo: false,
      turboswitch: false,
      vendor: 'DAIKIN',
    });

    t.end();
  });

  t.test('sendStateToTasmota', t => {
    const p = new HomeBridgeTasmotaAirconHTTP();

    let err = '';
    const superagent = {
      get: (url) => { superagent.url = url; return superagent },
      end: (cb) => { cb(err, {body: {}}); return superagent },
    };

    p.superagent = superagent;

    p.sendStateToTasmota((err, res) => { superagent.err = err; superagent.res = res });
    t.match(superagent.url, /^http:\/\/192\.168\.50\.4\/cm\?cmnd=IRhvac/);
    t.equal(superagent.err, '');
    t.same(superagent.res, {body: {}});

    const params = decodeURIComponent(new URL(superagent.url).searchParams.get('cmnd'));
    t.same(JSON.parse(params.replace(/IRhvac\s/, '').replace(/\\"/g, '"')), {
      Beep: 'Off',
      Celsius: 'On',
      Clean: 'Off',
      Econo: 'Off',
      FanSpeed: '3',
      Filter: 'Off',
      Light: 'Off',
      Mode: 'Auto',
      Model: 'Tasmota',
      Power: 'Off',
      Quiet: 'Off',
      Sleep: -1,
      SwingH: 'Off',
      SwingV: 'Off',
      Temp: 20,
      Turbo: 'Off',
      Vendor: 'DAIKIN',
    });

    const logged = [];
    p.log = {debug: (msg) => logged.push(msg)};
    p.sendStateToTasmota();
    t.same(logged, [{}]);

    err = 'yikes';
    p.log = {error: (msg) => logged.push(msg)};
    p.sendStateToTasmota();
    t.same(logged, [{}, 'yikes']);

    t.end();
  });

  t.end();
});

t.test('characteristic', t => {
  const p = new HomeBridgeTasmotaAirconHTTP();
  p.sendStateToTasmotaLater = () => {};

  t.test('_characteristicActive', t => {
    t.equal(p._characteristicActive({Characteristic}), Characteristic.Active.INACTIVE);
    t.equal(p._stateToTasmotaState().Power, 'Off');
    t.equal(p._characteristicActive({Characteristic}, Characteristic.Active.ACTIVE), Characteristic.Active.ACTIVE);
    t.equal(p._stateToTasmotaState().Power, 'On');
    t.equal(p._characteristicActive({Characteristic}, Characteristic.Active.INACTIVE), Characteristic.Active.INACTIVE);
    t.equal(p._stateToTasmotaState().Power, 'Off');
    t.end();
  });

  t.test('_characteristicCurrentHeaterCoolerState', t => {
    t.equal(p._characteristicCurrentHeaterCoolerState({Characteristic}), Characteristic.CurrentHeaterCoolerState.INACTIVE);

    t.equal(p._characteristicTargetHeaterCoolerState({Characteristic}, Characteristic.TargetHeaterCoolerState.COOL), Characteristic.TargetHeaterCoolerState.COOL);
    t.equal(p._characteristicCurrentHeaterCoolerState({Characteristic}), Characteristic.CurrentHeaterCoolerState.INACTIVE);

    t.equal(p._characteristicActive({Characteristic}, Characteristic.Active.ACTIVE), Characteristic.Active.ACTIVE);
    t.equal(p._characteristicCurrentHeaterCoolerState({Characteristic}), Characteristic.CurrentHeaterCoolerState.COOLING);

    t.equal(p._characteristicTargetHeaterCoolerState({Characteristic}, Characteristic.TargetHeaterCoolerState.HEAT), Characteristic.TargetHeaterCoolerState.HEAT);
    t.equal(p._characteristicCurrentHeaterCoolerState({Characteristic}), Characteristic.CurrentHeaterCoolerState.HEATING);

    t.equal(p._characteristicTargetHeaterCoolerState({Characteristic}, Characteristic.TargetHeaterCoolerState.AUTO), Characteristic.TargetHeaterCoolerState.AUTO);
    t.equal(p._characteristicCurrentHeaterCoolerState({Characteristic}), Characteristic.CurrentHeaterCoolerState.IDLE);

    t.equal(p._characteristicActive({Characteristic}, Characteristic.Active.INACTIVE), Characteristic.Active.INACTIVE);
    t.end();
  });

  t.test('_characteristicCoolingThresholdTemperature', t => {
    t.equal(p._characteristicCoolingThresholdTemperature({Characteristic}), 20);
    t.equal(p._stateToTasmotaState().Temp, 20);
    t.equal(p._characteristicCoolingThresholdTemperature({Characteristic}, 24), 24);
    t.equal(p._stateToTasmotaState().Temp, 24);
    t.equal(p._characteristicCoolingThresholdTemperature({Characteristic}, 20), 20);
    t.end();
  });

  t.test('_characteristicHeatingThresholdTemperature', t => {
    t.equal(p._characteristicHeatingThresholdTemperature({Characteristic}), 20);
    t.equal(p._characteristicHeatingThresholdTemperature({Characteristic}, 42), 42);
    t.equal(p._stateToTasmotaState().Temp, 42);
    t.equal(p._characteristicHeatingThresholdTemperature({Characteristic}, 20), 20);
    t.end();
  });

  t.test('_characteristicCurrentTemperature', t => {
    t.equal(p._characteristicCurrentTemperature({Characteristic}), 20);
    t.end();
  });

  t.test('_characteristicRotationSpeed', t => {
    t.equal(p._characteristicRotationSpeed({Characteristic}), 50);
    t.equal(p._characteristicRotationSpeed({Characteristic}, 100), 100);
    t.equal(p._stateToTasmotaState().FanSpeed, '5');
    t.equal(p._characteristicRotationSpeed({Characteristic}, 75), 75);
    t.equal(p._stateToTasmotaState().FanSpeed, '4');
    t.equal(p._characteristicRotationSpeed({Characteristic}, 25), 25);
    t.equal(p._stateToTasmotaState().FanSpeed, '2');
    t.equal(p._characteristicRotationSpeed({Characteristic}, 0), 0);
    t.equal(p._stateToTasmotaState().FanSpeed, '1');
    t.equal(p._characteristicRotationSpeed({Characteristic}, 50), 50);
    t.equal(p._stateToTasmotaState().FanSpeed, '3');
    t.end();
  });

  t.test('_characteristicSwingMode', t => {
    t.equal(p._characteristicSwingMode({Characteristic}), Characteristic.SwingMode.SWING_DISABLED);
    t.equal(p._characteristicSwingMode({Characteristic}, Characteristic.SwingMode.SWING_ENABLED), Characteristic.SwingMode.SWING_ENABLED);
    t.equal(p._stateToTasmotaState().SwingV, 'On');
    t.equal(p._characteristicSwingMode({Characteristic}, Characteristic.SwingMode.SWING_DISABLED), Characteristic.SwingMode.SWING_DISABLED);
    t.equal(p._stateToTasmotaState().SwingV, 'Off');
    t.end();
  });

  t.test('_characteristicTargetHeaterCoolerState', t => {
    t.equal(p._characteristicTargetHeaterCoolerState({Characteristic}), Characteristic.TargetHeaterCoolerState.AUTO);
    t.equal(p._characteristicTargetHeaterCoolerState({Characteristic}, Characteristic.TargetHeaterCoolerState.COOL), Characteristic.TargetHeaterCoolerState.COOL);
    t.equal(p._stateToTasmotaState().Mode, 'Cool');
    t.equal(p._characteristicTargetHeaterCoolerState({Characteristic}, Characteristic.TargetHeaterCoolerState.HEAT), Characteristic.TargetHeaterCoolerState.HEAT);
    t.equal(p._stateToTasmotaState().Mode, 'Heat');
    t.equal(p._characteristicTargetHeaterCoolerState({Characteristic}, Characteristic.TargetHeaterCoolerState.AUTO), Characteristic.TargetHeaterCoolerState.AUTO);
    t.equal(p._stateToTasmotaState().Mode, 'Auto');
    t.end();
  });

  t.test('_valueOfFanForTasmota', t =>{
    t.equal(p._valueOfFanForTasmota(1, 5, 'low'), 'auto');
    t.equal(p._valueOfFanForTasmota(50, 5, 'low'), '2');
    t.equal(p._valueOfFanForTasmota(100, 5, 'low'), '5');
    t.equal(p._valueOfFanForTasmota(1, 5, 'force'), 'auto');
    t.equal(p._valueOfFanForTasmota(50, 5, 'force'), 'auto');
    t.equal(p._valueOfFanForTasmota(100, 5, 'force'), 'auto');
    t.equal(p._valueOfFanForTasmota(1, 5, 'disable'), '1');
    t.equal(p._valueOfFanForTasmota(50, 5, 'disable'), '3');
    t.equal(p._valueOfFanForTasmota(100, 5, 'disable'), '5');
    t.end();
  });

  t.end();
});

t.test('services', t => {
  t.test('without hap', t => {
    const p = new HomeBridgeTasmotaAirconHTTP();
    t.same(p.getServices().map(s => s && s.constructor.name || false), [false, false]);
    t.end();
  });

  t.test('with hap', t => {
    const hap = {Characteristic, Service};
    const p = new HomeBridgeTasmotaAirconHTTP(console, {}, {hap});
    t.same(p.getServices().map(s => s && s.constructor.name), ['AccessoryInformation', 'HeaterCooler']);
    t.end();
  });

  t.end();
});
