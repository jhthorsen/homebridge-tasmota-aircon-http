const {Characteristic, Service} = require('hap-nodejs');
const HomeBridgeTasmotaAirconHTTP = require('../index.js')();
const t = require('tap');

t.test('getTemperatureFromTasmota', t => {
  const hap = {Characteristic, Service};

  t.test('disabled', t => {
    const p = new HomeBridgeTasmotaAirconHTTP(console, {temp_from_tasmota: 0}, {hap});
    t.equal(!p.getTemperatureFromTasmotaTid, true);
    t.end();
  });

  t.test('enabled', t => {
    const p = new HomeBridgeTasmotaAirconHTTP(console, {temp_from_tasmota: 120}, {hap});
    t.equal(p.getTemperatureFromTasmotaTid > 0, true);
    clearTimeout(p.getTemperatureFromTasmotaTid);
    t.end();
  });

  t.test('get temp', t => {
    const p = new HomeBridgeTasmotaAirconHTTP(console, {temp_from_tasmota: 0.1}, {hap});

    const check = () => {
      t.equal(reqUrl, 'http://192.168.50.4/cm?cmnd=GlobalTemp');
      t.equal(p.state.currentTemperature, 36.5);
      t.end();
    }

    p.superagent = {
      get: (url) => {
        clearTimeout(p.getTemperatureFromTasmotaTid);
        setTimeout(check, 20);
        reqUrl = url;
        return Promise.resolve({body: {GlobalTemp: 36.5}});
      },
    };
  });

  t.end();
});
