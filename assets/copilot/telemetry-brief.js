window.onload = init;

var values = [
  'cpu',
  'depth_p',
  'board44.pressure.81',
  'depth_d',
  'board44.depth.81',
  'depth_t',
  'board44.temp.81',
  'imu_p',
  'imu_r',
  'sensors.imuPressure.51',
  'pilot.imuPressure.52',
  'sensors.imuPressure.57',
  'sensors.imuPressure.58',
  'sensors.imuPressure.67',
  'sensors.imuTemp.51',
  'pilot.imuTemp.52',
  'sensors.imuTemp.57',
  'sensors.imuTemp.58',
  'sensors.imuTemp.67',
  'light.bus_i.61',
  'light.bus_i.62',
  'light.bus_i.63',
  'light.bus_i.65',
  'light.bus_i.66',
  'light.bus_v.61',
  'light.bus_v.62',
  'light.bus_v.63',
  'light.bus_v.65',
  'light.bus_v.66',
  'light.temp.61',
  'light.temp.62',
  'light.temp.63',
  'light.temp.65',
  'light.temp.66',
  'motors.bus_i.12',
  'motors.bus_i.13',
  'motors.bus_i.14',
  'motors.bus_i.15',
  'motors.bus_i.16',
  'motors.bus_v.12',
  'motors.bus_v.13',
  'motors.bus_v.14',
  'motors.bus_v.15',
  'motors.bus_v.16',
  'motors.temp.12',
  'motors.temp.13',
  'motors.temp.14',
  'motors.temp.15',
  'motors.temp.16',
  'motors.rpm.12',
  'motors.rpm.13',
  'motors.rpm.14',
  'motors.rpm.15',
  'motors.rpm.16',
  'motors.lift',
  'motors.pitch',
  'motors.strafe',
  'motors.throttle',
  'motors.yaw',
  'board44.temp.85',
  'board44.conductivity.85',
  'gripper.temp.23',
  'waterSampler.temp.21',
  'trim.temp.24',
  'gripper.current.23',
  'waterSampler.current.21',
  'trim.current.24',
  'board44.acs764n1.83',
  'board44.acs764n2.83',
  'board44.acs764n3.83',
  'board44.acs764n4.83',
  'board44.adc2.83',
  'board44.adc4.83',
  'board44.adc5.83',
  'board44.adc6.83',
  'board44.adc1.83',
  'board44.adc7.83',
  'board44.acs764n1.87',
  'board44.acs764n2.87',
  'board44.acs764n3.87',
  'board44.acs764n4.87',
  'board44.adc2.87',
  'board44.adc4.87',
  'board44.adc5.87',
  'board44.adc6.87',
  'board44.adc1.87',
  'board44.adc7.87' ];

var chartMap = {};
var previous = {};
var selectMap = {
  'CPU': 'cpu',
  'ROV (82) and Clump (81) Water Pressure (bar)': 'depth_p',
  'ROV (82) and Clump (81) Water Depth (m)': 'depth_d',
  'ROV (82) and Clump (81) Water Temperature (C)  ': 'depth_t',
  'ROV pitch (deg)': 'imu_p',
  'ROV roll (deg)': 'imu_r',
  'IMU Pressure': 'sensors.imuPressure',
  'IMU Temp': 'sensors.imuTemp',
  'Light Bus Current': 'light.bus_i',
  'Light Bus Voltage': 'light.bus_v',
  'Light Temp': 'light.temp',
  'Motor Bus Current': 'motors.bus_i',
  'Motor Bus Voltage': 'motors.bus_v',
  'Motor Temp': 'motors.temp',
  'Motor RPM': 'motors.rpm',
  'Motor Lift': 'motors.lift',
  'Motor Pitch': 'motors.pitch',
  'Motor Strafe': 'motors.strafe',
  'Motor Throttle': 'motors.throttle',
  'Motor Yaw': 'motors.yaw',
  'CT Sensor Temp (C)': 'ctsensor.temp',
  'CT Sensor Conductivity (mS/cm)': 'ctsensor.conductivity',
  'Gripper Temp': 'grippers.temp',
  'Gripper Current': 'grippers.current',
  'Power Supply 1 Currents': 'powerSupply1.current',
  'Power Supply 1 Voltages': 'powerSupply1.voltage',
  'Power Supply 1 Temperatures': 'powerSupply1.temp',
  'Power Supply 2 Currents': 'powerSupply2.current',
  'Power Supply 2 Voltages': 'powerSupply2.voltage',
  'Power Supply 2 Temperatures': 'powerSupply2.temp'
}

function init() {
  renderNav();
  initMqtt();
  initGrid('telemetryBriefLayout');
  initListeners();
}

// add change event listener and populate select list values
function initListeners() {
  const selectors = document.getElementsByTagName('select');
  selectList = Array.prototype.slice.call(selectors);
  selectList.forEach(function(selector, idx) {
    for (let i=0; i<values.length; i++) {
      let option = document.createElement("option");
      option.text = values[i];
      selector.add(option);
    }
    selector.addEventListener('change', async function () {
      // set grid item div class to selected property
      let node = document.getElementById(`brief-${this.id}`);
      node.className = this.value;
    }, false);
  });
}

function updateBriefValues(key, value) {
  let items = document.getElementsByClassName(key);
  for (let i=0; i<items.length; i++) {
    items[i].innerHTML = value;
  }
}
