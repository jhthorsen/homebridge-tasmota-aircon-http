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
    t.same(p.state.econoswitch, false);
    t.type(p.switchEconoService, 'object');
    t.same(p.getServices().map(s => s.displayName), ['', 'HomeBridgeTasmotaAirconHTTP']);
    t.same(p.getServices().map(s => s.constructor.name), ['AccessoryInformation', 'HeaterCooler']);
    t.end();
  });

  t.test('enable econoswitch', t => {
    const p = new HomeBridgeTasmotaAirconHTTP(dummyLog, {econoswitch: true}, {hap});
    t.same(p.state.econoswitch, true);
    t.type(p.switchEconoService, 'object');
    t.same(p.getServices().map(s => s.displayName), ['', 'HomeBridgeTasmotaAirconHTTP', 'Econo']);
    t.same(p.getServices().map(s => s.constructor.name), ['AccessoryInformation', 'HeaterCooler', 'Switch']);
    t.end();
  });

  t.test('characteristic', t => {
    const p = new HomeBridgeTasmotaAirconHTTP(dummyLog, {}, {hap});
    p.sendStateToTasmotaLater = () => {};
    p.state.quiet = p.state.turbo = true;
    t.equal(p._characteristicSwitchEconoOn({Characteristic}), false);
    t.same(['econo', 'quiet', 'turbo'].map(n => p.state[n]), [false, true, true]);

    t.equal(p._characteristicSwitchEconoOn({Characteristic}, true), true);
    t.same(['econo', 'quiet', 'turbo'].map(n => p.state[n]), [true, false, false]);

    t.equal(p._characteristicSwitchEconoOn({Characteristic}, false), false);
    t.same(['econo', 'quiet', 'turbo'].map(n => p.state[n]), [false, false, false]);
    t.end();
  });

  t.end();
});
