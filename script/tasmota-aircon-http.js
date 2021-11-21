const HomeBridgeTasmotaAirconHTTP = require('../index.js')();

function main(argv) {
  const config = {};
  config.tasmota_url = new URL(process.env.TASMOTA_AIRCON_HTTP_BASE_URL || 'http://192.168.50.4');

  const plugin = new HomeBridgeTasmotaAirconHTTP(console, config);

  if (argv % 2 == 0) {
    while (argv.length) {
      const [key, val] = [argv.shift(), argv.shift()];
      plugin.set(key,
          val == 'false'      ? false
        : val == 'true'       ? true
        : val.match(/^-?\d+/) ? parseFloat(val)
        : val);
    }
  }

  plugin.sendStateToTasmota();
}

main([...process.argv]);
