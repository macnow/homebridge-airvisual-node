
var Service;
var Characteristic;
var SMB2 = require("smb2");

module.exports = function(homebridge){
	Service = homebridge.hap.Service;
	Characteristic = homebridge.hap.Characteristic;
	homebridge.registerAccessory("homebridge-airvisual-node", "AirVisualNode", AirVisualNodeAccessory);
}

function AirVisualNodeAccessory(log, config) {
  var informationService;
  var carbondioxideService;
  var airqualityService;
  var temperatureService;
  var humidityService;

  this.log = log;
  this.ip = config["ip"];
  this.user = config["user"];
  this.pass = config["pass"];
  this.co2_critical = config["co2_critical"];

  this.airdata = '';
  this.aq_status = 0;

  this.pm25 = 0;
  this.aqi = 0;
  this.temp_c = 0;
  this.hm = 0;
  this.co2 = 0;

  setInterval((function () {
          this.refresh();
  }).bind(this), 10000);
}


AirVisualNodeAccessory.prototype = {

  httpRequest: function(url, method, callback) {
    request({
      url: url,
      method: method
    },
    function (error, response, body) {
      callback(error, response, body)
    })
  },


  identify: function(callback) {
    this.log("Identify requested!");
    callback(); // success
  },

  refresh: function() {
    var that = this;

    var smb2Client = new SMB2({
      share: '\\\\'+ that.ip + '\\airvisual',
      domain: '',
      username: that.user,
      password: that.pass
    });

    this.log ("Refreshing values...");

    smb2Client.readFile('latest_config_measurements.json', function(err, data){
      if(err) throw err;
      that.airdata = JSON.parse(data);
    });
    
    smb2Client.close();

    if(that.airdata.measurements) {
      if(that.pm25 != that.airdata.measurements.pm25_ugm3) {
        that.log ("PM2.5 (ug/m3) - " + that.pm25 + " -> " + that.airdata.measurements.pm25_ugm3);
        that.pm25 = Number(that.airdata.measurements.pm25_ugm3);
        that.setPM25Density();
      }
      if(that.aqi != that.airdata.measurements.pm25_AQIUS) {
        that.log ("AQI - " + that.aqi + " -> " + that.airdata.measurements.pm25_AQIUS);
        that.aqi = Number(that.airdata.measurements.pm25_AQIUS); 
        that.setAirQuality(that.aqi);
      }
      if(that.temp_c != that.airdata.measurements.temperature_C) {
        that.log ("Temperature (C) - " + that.temp_c + " -> " + that.airdata.measurements.temperature_C);
        that.temp_c = Number(that.airdata.measurements.temperature_C); 
      }
      if(that.hm != that.airdata.measurements.humidity_RH) {
        that.log ("Humidity (%) - " + that.hm + " -> " + that.airdata.measurements.humidity_RH);
        that.hm = Number(that.airdata.measurements.humidity_RH); 
        that.setHumidity();
      }
      if(that.co2 != that.airdata.measurements.co2_ppm) {
        that.log ("CO2 (ppm) - " + that.co2 + " -> " + that.airdata.measurements.co2_ppm);
        that.co2 = Number(that.airdata.measurements.co2_ppm); 
        that.setCarbonDioxide();
        that.setCarbonDioxideDetected();
      }
    }
  },

  getAirQuality: function (callback) {
    var that = this;
    callback(null, that.aq_status);
  },  

  setAirQuality: function (aqi) {
    var that = this;
    if (aqi <= 50) that.aq_status=1;
    if (aqi > 50 && aqi <= 100) that.aq_status=2;
    if (aqi > 100 && aqi <=150) that.aq_status=3;
    if (aqi > 150 && aqi <=200) that.aq_status=4;
    if (aqi > 200) that.aq_status=5;
    that.airqualityService.setCharacteristic(Characteristic.AirQuality, that.aq_status);
  },

  getCurrentTemperature: function (callback) {
    var that = this;
    callback(null, that.temp_c);
  },  

  setCurrentTemperature: function() {
    var that = this;
    this.temperatureService.setCharacteristic(Characteristic.CurrentTemperature, that.temp_c);
  },

  getTemperatureUnits: function (callback) {
    var that = this;
    // 1 = F and 0 = C
    callback (null, 0);
  },  

  getPM25Density: function (callback) {
    var that = this;
    that.log ("getting PM2.5 Density");
    callback(null, that.pm25);
  },  

  setPM25Density: function() {
    var that = this;
    that.airqualityService.setCharacteristic(Characteristic.PM2_5Density, that.pm25);
  },

  getHumidity: function (callback) {
    var that = this;
    that.log ("getting Humidity");
    callback(null, that.hm);
  },  

  setHumidity: function() {
    var that = this;
    that.humidityService.setCharacteristic(Characteristic.CurrentRelativeHumidity, that.hm);
  },

  getCarbonDioxide: function (callback) {
    var that = this;
    callback(null, that.co2);
  },  

  setCarbonDioxide: function() {
    var that = this;
    this.carbondioxideService.setCharacteristic(Characteristic.CarbonDioxideLevel, that.co2);
    that.airqualityService.setCharacteristic(Characteristic.CarbonDioxideLevel, that.co2);
  },

  getCarbonDioxideDetected: function (callback) {
    var that = this;
    if(that.co2 > that.co2_critical)
    {
      callback(null, 1);
    } else {
      callback(null, 0);
    }
  },  

  setCarbonDioxideDetected: function() {
    var that = this;
    if(that.co2 > that.co2_critical)
    {
      that.log ("Carbon Dioxide Detected!");
      that.carbondioxideService.setCharacteristic(Characteristic.CarbonDioxideDetected, 1);
    } else {
      that.carbondioxideService.setCharacteristic(Characteristic.CarbonDioxideDetected, 0);
    }
  },

  getServices: function() {

    // you can OPTIONALLY create an information service if you wish to override
    // the default values for things like serial number, model, etc.
    this.informationService = new Service.AccessoryInformation();
    this.airqualityService = new Service.AirQualitySensor();
    this.temperatureService = new Service.TemperatureSensor();
    this.carbondioxideService = new Service.CarbonDioxideSensor();
    this.humidityService = new Service.HumiditySensor();
    
    this.informationService
      .setCharacteristic(Characteristic.Manufacturer, "AirVisual")
      .setCharacteristic(Characteristic.Model, "Node")
      .setCharacteristic(Characteristic.SerialNumber, this.ip)

    this.airqualityService
         .getCharacteristic(Characteristic.AirQuality)
         .on('get', this.getAirQuality.bind(this));

    this.airqualityService
         .getCharacteristic(Characteristic.PM2_5Density)
         .on('get', this.getPM25Density.bind(this));

    this.airqualityService
         .getCharacteristic(Characteristic.CarbonDioxideLevel)
         .on('get', this.getCarbonDioxide.bind(this));

    this.carbondioxideService
         .getCharacteristic(Characteristic.CarbonDioxideDetected)
         .on('get', this.getCarbonDioxideDetected.bind(this));

    this.carbondioxideService
         .getCharacteristic(Characteristic.CarbonDioxideLevel)
         .on('get', this.getCarbonDioxide.bind(this));

    this.temperatureService
	.getCharacteristic(Characteristic.CurrentTemperature)
	.on('get', this.getCurrentTemperature.bind(this));

    console.log(this.humidityService);
    
    return [this.informationService, this.airqualityService, this.temperatureService, this.carbondioxideService, this.humidityService];
  }
};
