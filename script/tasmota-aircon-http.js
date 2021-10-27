import Plugin from '../index.js';
import TasmotaAirconHTTP from '../src/tasmota-aircon-http.js';

function main(argv) {
  const t = new TasmotaAirconHTTP({});

  // TODO: Need to write some tests
  console.debug('index.js ' + (typeof Plugin == 'function' ? 'compiles.' : 'does not compile correctly.'));

  const method = argv[2] || 'setOn';
  const input
    = argv.length <= 3   ? true
    : argv[3] == 'false' ? false
    : argv[3] == 'true'  ? true
    : argv[3];

  t[method](input).then(res => console.info(res.body || res.text || res.status))
      .catch(err => console.error(err));
}

main(process.argv);
