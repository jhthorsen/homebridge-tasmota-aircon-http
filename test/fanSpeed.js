const HomeBridgeTasmotaAirconHTTP = require('../index.js')();
const t = require('tap');

t.test('default', t => {
  const p = new HomeBridgeTasmotaAirconHTTP();
  p.state.fanSpeed = 0;
  t.equal(p._stateToTasmotaState().FanSpeed, '1');

  p.state.fanSpeed = 50;
  t.equal(p._stateToTasmotaState().FanSpeed, '3');

  p.state.fanSpeed = 100;
  t.equal(p._stateToTasmotaState().FanSpeed, '5');
  t.end();
});

t.test('force', t => {
  const p = new HomeBridgeTasmotaAirconHTTP();
  p.state.fanAutoSpeed = 'force';

  p.state.fanSpeed = 0;
  t.equal(p._stateToTasmotaState().FanSpeed, 'auto');

  p.state.fanSpeed = 42; // Does not matter
  t.equal(p._stateToTasmotaState().FanSpeed, 'auto');
  t.end();
});

t.test('low', t => {
  const p = new HomeBridgeTasmotaAirconHTTP();
  p.state.fanAutoSpeed = 'low';

  p.state.fanSpeed = 0;
  t.equal(p._stateToTasmotaState().FanSpeed, 'auto');

  p.state.fanSpeed = 10;
  t.equal(p._stateToTasmotaState().FanSpeed, 'auto');

  p.state.fanSpeed = 20;
  t.equal(p._stateToTasmotaState().FanSpeed, '1');

  p.state.fanSpeed = 50;
  t.equal(p._stateToTasmotaState().FanSpeed, '2');

  p.state.fanSpeed = 100;
  t.equal(p._stateToTasmotaState().FanSpeed, '5');

  t.end();
});
