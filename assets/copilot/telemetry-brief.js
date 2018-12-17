window.onload = init;

var valuesMap = new Map();
valuesMap.set('Server CPU', 'cpu');
valuesMap.set('ROV Water Pressure (bar)', 'depth_p');
valuesMap.set('Clump Water Pressure (bar)', 'board44.pressure.81');
valuesMap.set('ROV Water Depth (m)', 'depth_d');
valuesMap.set('Clump Water Depth (m)', 'board44.depth.81');
valuesMap.set('ROV Water Temp (C)', 'depth_t');
valuesMap.set('Clump Water Temp (C)', 'board44.temp.81');
valuesMap.set('ROV Tilt', 'imu_p');
valuesMap.set('ROV Roll', 'imu_r');
valuesMap.set('Clump IMU Pressure 51', 'sensors.imuPressure.51');
valuesMap.set('ROV IMU Internal Pressure 52', 'pilot.imuPressure.52');
valuesMap.set('ROV IMU Internal Pressure 57', 'sensors.imuPressure.57');
valuesMap.set('ROV IMU Internal Pressure 58', 'sensors.imuPressure.58');
valuesMap.set('Clump IMU Pressure 67', 'sensors.imuPressure.67');
valuesMap.set('Clump IMU Temp 51', 'sensors.imuTemp.51');
valuesMap.set('ROV IMU Internal Temp 52', 'pilot.imuTemp.52');
valuesMap.set('ROV IMU Internal Temp 57', 'sensors.imuTemp.57');
valuesMap.set('ROV IMU Internal Temp 58', 'sensors.imuTemp.58');
valuesMap.set('Clump IMU Temp 67', 'sensors.imuTemp.67');
valuesMap.set('Light Current Clump 61', 'light.bus_i.61');
valuesMap.set('Light Current ROV 62', 'light.bus_i.62');
valuesMap.set('Light Current ROV 63', 'light.bus_i.63');
valuesMap.set('Light Current ROV 65', 'light.bus_i.65');
valuesMap.set('Light Current Clump 66', 'light.bus_i.66');
valuesMap.set('Light Current Clump 61', 'light.bus_v.61');
valuesMap.set('Light Current ROV 62', 'light.bus_v.62');
valuesMap.set('Light Current ROV 63', 'light.bus_v.63');
valuesMap.set('Light Current ROV 65', 'light.bus_v.65');
valuesMap.set('Light Current Clump 66', 'light.bus_v.66');
valuesMap.set('Light Temp Clump 61', 'light.temp.61');
valuesMap.set('Light Temp ROV 62', 'light.temp.62');
valuesMap.set('Light Temp ROV 63', 'light.temp.63');
valuesMap.set('Light Temp ROV 65', 'light.temp.65');
valuesMap.set('Light Temp Clump 66', 'light.temp.66');
valuesMap.set('Motor Current Aft Vert', 'motors.bus_i.12');
valuesMap.set('Motor Current Aft Horz', 'motors.bus_i.13');
valuesMap.set('Motor Current Fore Vert', 'motors.bus_i.14');
valuesMap.set('Motor Current Fore Horz', 'motors.bus_i.15');
valuesMap.set('Motor Current Main', 'motors.bus_i.16');
valuesMap.set('Motor Voltage Aft Vert', 'motors.bus_v.12');
valuesMap.set('Motor Voltage Aft Vert', 'motors.bus_v.13');
valuesMap.set('Motor Voltage Aft Vert', 'motors.bus_v.14');
valuesMap.set('Motor Voltage Aft Vert', 'motors.bus_v.15');
valuesMap.set('Motor Voltage Main', 'motors.bus_v.16');
valuesMap.set('Motor Temp Aft Vert', 'motors.temp.12');
valuesMap.set('Motor Temp Aft Horz', 'motors.temp.13');
valuesMap.set('Motor Temp Fore Vert', 'motors.temp.14');
valuesMap.set('Motor Temp Fore Horz', 'motors.temp.15');
valuesMap.set('Motor Temp Main', 'motors.temp.16');
valuesMap.set('Motor RPM Aft Vert', 'motors.rpm.12');
valuesMap.set('Motor RPM Aft Horz', 'motors.rpm.13');
valuesMap.set('Motor RPM Fore Vert', 'motors.rpm.14');
valuesMap.set('Motor RPM Fore Horz', 'motors.rpm.15');
valuesMap.set('Motor RPM Main', 'motors.rpm.16');
valuesMap.set('Motor Controls Lift', 'motors.lift');
valuesMap.set('Motor Controls Pitch', 'motors.pitch');
valuesMap.set('Motor Controls Strafe', 'motors.strafe');
valuesMap.set('Motor Controls Throttle', 'motors.throttle');
valuesMap.set('Motor Controls Yaw', 'motors.yaw');
valuesMap.set('CT Sensor Temp (C)', 'board44.temp.85');
valuesMap.set('CT Sensor Conductivity (mS/cm)', 'board44.conductivity.85');
valuesMap.set('Gripper Temp', 'gripper.temp.23');
valuesMap.set('Water Sampler Temp', 'waterSampler.temp.21');
valuesMap.set('Trim Weight Temp', 'trim.temp.24');
valuesMap.set('Gripper Current', 'gripper.current.23');
valuesMap.set('Water Sampler Current', 'waterSampler.current.21');
valuesMap.set('Trim Weight Current', 'trim.current.24');
valuesMap.set('Power Supply 3 Current 48v on 24', 'board44.acs764n1.83');
valuesMap.set('Power Supply 3 Current 12v on 12', 'board44.acs764n2.83');
valuesMap.set('Power Supply 3 Current 48v on 12', 'board44.acs764n3.83');
valuesMap.set('Power Supply 3 Current 24v on 24', 'board44.acs764n4.83');
valuesMap.set('Power Supply 3 Voltage 5V', 'board44.adc2.83');
valuesMap.set('Power Supply 3 Voltage 48V', 'board44.adc4.83');
valuesMap.set('Power Supply 3 Voltage 24V', 'board44.adc5.83');
valuesMap.set('Power Supply 3 Voltage 12V', 'board44.adc6.83');
valuesMap.set('Power Supply 3 Temp 12V', 'board44.adc1.83');
valuesMap.set('Power Supply 3 Temp 24V', 'board44.adc7.83');
valuesMap.set('Power Supply 2 Current 48v on 24', 'board44.acs764n1.87');
valuesMap.set('Power Supply 2 Current 12v on 12', 'board44.acs764n2.87');
valuesMap.set('Power Supply 2 Current 48v on 12', 'board44.acs764n3.87');
valuesMap.set('Power Supply 2 Current 24v on 24', 'board44.acs764n4.87');
valuesMap.set('Power Supply 2 Voltage 5V', 'board44.adc2.87');
valuesMap.set('Power Supply 2 Voltage 48V', 'board44.adc4.87');
valuesMap.set('Power Supply 2 Voltage 24V', 'board44.adc5.87');
valuesMap.set('Power Supply 2 Voltage 12V', 'board44.adc6.87');
valuesMap.set('Power Supply 2 Temp 12V', 'board44.adc1.87');
valuesMap.set('Power Supply 2 Temp 24V', 'board44.adc7.87');
valuesMap.set('MQTT Errors Forward', 'mqtt.error.elphel-000e64081e1f');
valuesMap.set('MQTT Errors Up', 'mqtt.error.elphel-000e64081ccd');
valuesMap.set('MQTT Errors Side', 'mqtt.error.elphel-000e64081ce3');
valuesMap.set('MQTT Errors Down', 'mqtt.error.elphel-000e64081e1e');
valuesMap.set('MQTT Timeouts Forward', 'mqtt.timeout.elphel-000e64081e1f');
valuesMap.set('MQTT Timeouts Up', 'mqtt.timeout.elphel-000e64081ccd');
valuesMap.set('MQTT Timeouts Side', 'mqtt.timeout.elphel-000e64081ce3');
valuesMap.set('MQTT Timeouts Down', 'mqtt.timeout.elphel-000e64081e1e');

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
    for (let [k, v] of valuesMap) {
      let option = document.createElement("option");
      option.text = k;
      option.id = `tel-${v}`;
      selector.add(option);
    }
    selector.addEventListener('change', async function () {
      // set grid item div class to selected property
      let node = document.getElementById(`brief-${this.id}`);
      if (node !== null) {
        node.className = valuesMap.get(this.value);
      }
    }, false);
  });
}

function updateBriefValues(key, value) {
  let items = document.getElementsByClassName(key);
  for (let i=0; i<items.length; i++) {
    items[i].innerHTML = value;
  }
}
