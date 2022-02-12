const {Characteristic, Service} = require('hap-nodejs');
const HomeBridgeTasmotaAirconHTTP = require('../index.js')();
const t = require('tap');

t.test('basics', t => {
  const hap = {Characteristic, Service};

  // Do not want log messages
  const dummyLog = {};
  ['debug', 'info', 'error'].forEach(m => dummyLog[m] = () => {});

  t.test('initial state', t => {
    const p = new HomeBridgeTasmotaAirconHTTP(dummyLog, {}, {hap});
    t.same(p.state.turboswitch, false);
    t.type(p.switchEconoService, 'object');
    t.same(p.getServices().map(s => s.displayName), ['', 'HomeBridgeTasmotaAirconHTTP']);
    t.same(p.getServices().map(s => s.constructor.name), ['AccessoryInformation', 'HeaterCooler']);
    t.end();
  });

  t.test('enable turboswitch', t => {
    const p = new HomeBridgeTasmotaAirconHTTP(dummyLog, {turboswitch: true}, {hap});
    t.same(p.state.turboswitch, true);
    t.type(p.switchEconoService, 'object');
    t.same(p.getServices().map(s => s.displayName), ['', 'HomeBridgeTasmotaAirconHTTP', 'Turbo']);
    t.same(p.getServices().map(s => s.constructor.name), ['AccessoryInformation', 'HeaterCooler', 'Switch']);
    t.end();
  });

  t.test('characteristic', t => {
    const p = new HomeBridgeTasmotaAirconHTTP(dummyLog, {}, {hap});
    p.sendStateToTasmotaLater = () => {};
    p.state.econo = p.state.quiet = true;
    t.equal(p._characteristicSwitchTurboOn({Characteristic}), false);
    t.same(['econo', 'quiet', 'turbo'].map(n => p.state[n]), [true, true, false]);

    t.equal(p._characteristicSwitchTurboOn({Characteristic}, true), true);
    t.same(['econo', 'quiet', 'turbo'].map(n => p.state[n]), [false, false, true]);

    t.equal(p._characteristicSwitchTurboOn({Characteristic}, false), false);
    t.same(['econo', 'quiet', 'turbo'].map(n => p.state[n]), [false, false, false]);
    t.end();
  });

  t.end();
});
