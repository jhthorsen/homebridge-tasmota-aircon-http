import superagent from 'superagent';

export default class TasmotaAirconHTTP {
  constructor(config) {
    this.fanSteps = 5;
    this.state = this._configToState(config);
    this.tasmota_uri = config.tasmota_uri || new URL('http://192.168.50.104');
  }

  sendState() {
    const state = this._normalizeState();
    const url = new URL(this.tasmota_uri.toString());
    url.pathname = '/cm';
    url.searchParams.set('cmnd', 'IRhvac ' + JSON.stringify(state));

    return new Promise((resolve, reject) => {
      superagent.get(url.toString()).end((err, res) => err ? reject(err) : resolve(res));
    });
  }

  setFanSpeed(val) {
    this.state.fan_speed = val;
    return this.sendState();
  }

  setFanSwing(val) {
    this.state.swing_vertical = val;
    return this.sendState();
  }

  setMode(val) {
    this.state.mode = val;
    return this.sendState();
  }

  setOn(val) {
    this.state.on = !!val;
    return this.sendState();
  }

  setTemperature(val) {
    this.state.temperature = val;
    return this.sendState();
  }

  _configToState(config) {
    return {
      beep: config.beep || false,
      clean: false,
      econo: false,
      fan_speed: 100, // {0...100}
      filter: false,
      light: config.light || false,
      mode: 'Hot',
      model: -1,
      name: config.name || 'DAIKIN',
      on: false,
      quiet: false,
      sleep: -1,
      swing_horizontal: false,
      swing_vertical: false,
      temp: 20,
      temperature_unit: 'C', // C or F
      turbo: false,
      vendor: config.vendor || 'DAIKIN',
    };
  }

  _normalizeFanSpeed(speed) {
    return Math.ceil(this.fanSteps * speed / 100);
  }

  _normalizeOnOff(power) {
    return power === false ? 'Off' : 'On';
  }

  _normalizeState() {
    const state = this.state;
    return {
      Beep: this._normalizeOnOff(state.beep),
      Celsius: this._normalizeOnOff(state.temperature_unit != 'F'),
      Clean: this._normalizeOnOff(state.clean),
      Econo: this._normalizeOnOff(state.econo),
      FanSpeed: String(this._normalizeFanSpeed(state.fan_speed)),
      Filter: this._normalizeOnOff(state.filter),
      Light: this._normalizeOnOff(state.light),
      Mode: state.mode,
      Model: state.model,
      Power: this._normalizeOnOff(state.on),
      Quiet: this._normalizeOnOff(state.quiet),
      Sleep: state.sleep,
      SwingH: this._normalizeOnOff(state.swing_horizontal),
      SwingV: this._normalizeOnOff(state.swing_vertical),
      Temp: state.temperature,
      Turbo: this._normalizeOnOff(state.turbo),
      Vendor: state.vendor,
    };
  }
}
