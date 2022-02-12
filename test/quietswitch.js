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
    t.same(p.state.quietswitch, false);
    t.type(p.switchEconoService, 'object');
    t.same(p.getServices().map(s => s.displayName), ['', 'HomeBridgeTasmotaAirconHTTP']);
    t.same(p.getServices().map(s => s.constructor.name), ['AccessoryInformation', 'HeaterCooler']);
    t.end();
  });

  t.test('enable quietswitch', t => {
    const p = new HomeBridgeTasmotaAirconHTTP(dummyLog, {quietswitch: true}, {hap});
    t.same(p.state.quietswitch, true);
    t.type(p.switchEconoService, 'object');
    t.same(p.getServices().map(s => s.displayName), ['', 'HomeBridgeTasmotaAirconHTTP', 'Quiet']);
    t.same(p.getServices().map(s => s.constructor.name), ['AccessoryInformation', 'HeaterCooler', 'Switch']);
    t.end();
  });

  t.test('characteristic', t => {
    const p = new HomeBridgeTasmotaAirconHTTP(dummyLog, {}, {hap});
    p.sendStateToTasmotaLater = () => {};
    p.state.econo = p.state.turbo = true;
    t.equal(p._characteristicSwitchQuietOn({Characteristic}), false);
    t.same(['econo', 'quiet', 'turbo'].map(n => p.state[n]), [true, false, true]);

    t.equal(p._characteristicSwitchQuietOn({Characteristic}, true), true);
    t.same(['econo', 'quiet', 'turbo'].map(n => p.state[n]), [false, true, false]);

    t.equal(p._characteristicSwitchQuietOn({Characteristic}, false), false);
    t.same(['econo', 'quiet', 'turbo'].map(n => p.state[n]), [false, false, false]);
    t.end();
  });

  t.end();
});
