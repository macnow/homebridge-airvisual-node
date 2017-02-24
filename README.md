# homebridge-airvisual-node

[AirVisual Node](https://airvisual.com/node) plugin for [Homebridge](https://github.com/nfarina/homebridge).

# Installation

1. Install Homebridge using: `npm install -g homebridge`
2. Install this plugin using: `npm install -g homebridge-airvisual-node`
3. Update your configuration file. See the sample below.

# Updating

- `npm update -g homebridge-airvisual-node`

# Configuration

## Sample Configuration

```json
"accessories": [
        {
            "accessory": "AirVisualNode",
            "name": "AirVisual Node",
            "ip": "10.0.1.2",
            "user": "airvisual",
            "pass": "p4ssw0rd",
            "co2_critical": 1000
        }
],
```

## Workaround
smbclient package is required. `sudo apt-get install smbclient`
