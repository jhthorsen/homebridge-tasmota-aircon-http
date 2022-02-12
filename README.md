# homebridge-tasmota-aircon-http
Control an aircon using a Tasmota powered  infrared transmitter.

## How it works

This [Homebridge](https://homebridge.io/) plugin will create a
[Heater Cooler](https://developers.homebridge.io/#/service/HeaterCooler) service
which can be controlled from HomeKit. When a parameter (like temperatur) is
changed, a HTTP request will be sent to your [Tasmota](https://tasmota.github.io/)
powered IR device, which again will send the appropriate IR codes to your air
condition.

Here is an example on how the command can flow:

             [Homekit]            [HTTP]      [IR]
    iPhone -> Homepod -> Homebridge -> Tasmota -> Aircon

The IR codes are sent in the [HVAC](https://tasmota.github.io/docs/Commands/#ir-remote)
format, meaning very little configuration is needed. Here are the parameters sent:

* Variables from Homekit
  * FanSpeed - [RotationSpeed](https://developers.homebridge.io/#/characteristic/RotationSpeed)
  * Mode - [TargetHeaterCoolerState](https://developers.homebridge.io/#/characteristic/TargetHeaterCoolerState)
  * Power - [Active](https://developers.homebridge.io/#/characteristic/Active)
  * SwingV - [SwingMode](https://developers.homebridge.io/#/characteristic/SwingMode)
  * Temp - [CoolingThresholdTemperature](https://developers.homebridge.io/#/characteristic/CoolingThresholdTemperature) and [HeatingThresholdTemperature](https://developers.homebridge.io/#/characteristic/HeatingThresholdTemperature)
* Configuration
  * Beep - true/false
  * Celsius - "C" or "F"
  * Light - true/false
  * Vendor - Daikon, Hitacho, Toshiba, ...
* Currently static
  * Clean - false
  * Econo - false
  * Filter - false
  * Model - "-1"
  * Quiet - false
  * Sleep - "-1"
  * SwingH - false
  * Turbo - false

## Configuration

* Name (```name```) - Name of the service in Homekit
* URL to the Tasmota controller (```tasmota_url```) - URL to the Tasmota device on your local network.
* Remote control / Aircon vendor (```vendor```) - The vendor. Ex Daikon, Hitacho, Toshiba, ...
* Beep (```beep```) - Enable "beep" in the HVAC IR code.
* Light (```light```) - Enable "light" in the HVAC IR code.

## Caveats

The protocol is just one way now, meaning that if you change the settings on the
aircon with another infrared remote, then the settings will not be updated in Homekit.

## Resources

* [Example hardware](https://www.amazon.com/Rakstore-Infrared-Transceiver-Wireless-Development/dp/B09CM7MFQB)
* [Tasmota IR firmware](https://ota.tasmota.com/tasmota/release/tasmota-ir.bin.gz)
* [Homebride API reference](https://developers.homebridge.io/)
* [Tasmota IR reference](https://tasmota.github.io/docs/Tasmota-IR/)

## Author

Jan Henning Thorsen

## Contributors

Jean-Laurent Girod
