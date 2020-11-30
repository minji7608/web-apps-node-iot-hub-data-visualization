/* eslint-disable max-classes-per-file */
/* eslint-disable no-restricted-globals */
/* eslint-disable no-undef */
$(document).ready(() => {
  // if deployed to a site supporting SSL, use wss://
  const protocol = document.location.protocol.startsWith('https') ? 'wss://' : 'ws://';
  const webSocket = new WebSocket(protocol + location.host);

  // A class for holding the last N points of telemetry for a device
  class DeviceData {
    constructor(deviceId) {
      this.deviceId = deviceId;
      this.maxLen = 50;
      this.timeData = new Array(this.maxLen);
      this.rfidData = new Array(this.maxLen)
      this.temperatureData = new Array(this.maxLen);
      // this.humidityData = new Array(this.maxLen);
    }

    addData(time, rfid, temperature) {
      this.timeData.push(time);
      this.rfidData.push(rfid)
      this.temperatureData.push(temperature);
      AppendNewDataToList(time, rfid, temperature)
      // this.humidityData.push(humidity || null);

      // if (this.timeData.length > this.maxLen) {
      //   this.timeData.shift();
      //   this.rfidData.shift();
      //   this.temperatureData.shift();
      //   // this.humidityData.shift();
      // }
    }
  }

  // All the devices in the list (those that have been sending telemetry)
  class TrackedDevices {
    constructor() {
      this.devices = [];
    }

    // Find a device based on its Id
    findDevice(deviceId) {
      for (let i = 0; i < this.devices.length; ++i) {
        if (this.devices[i].deviceId === deviceId) {
          return this.devices[i];
        }
      }

      return undefined;
    }

    getDevicesCount() {
      return this.devices.length;
    }
  }

  const trackedDevices = new TrackedDevices();

  /*
  // Define the chart axes
  const chartData = {
    datasets: [
      {
        fill: false,
        label: 'Temperature',
        yAxisID: 'Temperature',
        borderColor: 'rgba(255, 204, 0, 1)',
        pointBoarderColor: 'rgba(255, 204, 0, 1)',
        backgroundColor: 'rgba(255, 204, 0, 0.4)',
        pointHoverBackgroundColor: 'rgba(255, 204, 0, 1)',
        pointHoverBorderColor: 'rgba(255, 204, 0, 1)',
        spanGaps: true,
      },
      {
        fill: false,
        label: 'Humidity',
        yAxisID: 'Humidity',
        borderColor: 'rgba(24, 120, 240, 1)',
        pointBoarderColor: 'rgba(24, 120, 240, 1)',
        backgroundColor: 'rgba(24, 120, 240, 0.4)',
        pointHoverBackgroundColor: 'rgba(24, 120, 240, 1)',
        pointHoverBorderColor: 'rgba(24, 120, 240, 1)',
        spanGaps: true,
      }
    ]
  };
  */

  /*
  const chartOptions = {
    scales: {
      yAxes: [{
        id: 'Temperature',
        type: 'linear',
        scaleLabel: {
          labelString: 'Temperature (ºC)',
          display: true,
        },
        position: 'left',
      },
      {
        id: 'Humidity',
        type: 'linear',
        scaleLabel: {
          labelString: 'Humidity (%)',
          display: true,
        },
        position: 'right',
      }]
    }
  };
  */

  // Get the context of the canvas element we want to select
  // const ctx = document.getElementById('iotChart').getContext('2d');
  const records = document.getElementById('records');
  /*
  const myLineChart = new Chart(
    ctx,
    {
      type: 'line',
      data: chartData,
      options: chartOptions,
    });
  */
  // Manage a list of devices in the UI, and update which device data the chart is showing
  // based on selection

  let needsAutoSelect = true;
  const deviceCount = document.getElementById('deviceCount');
  const listOfDevices = document.getElementById('listOfDevices');

  /*
  function OnSelectionChange() {
    const device = trackedDevices.findDevice(listOfDevices[listOfDevices.selectedIndex].text);
    chartData.labels = device.timeData;
    chartData.datasets[0].data = device.temperatureData;
    chartData.datasets[1].data = device.humidityData;
    myLineChart.update();
  }
  */

  /* 
  <div class="card">
                <div class="card-body">
                  This is some text within a card block.
                </div>
            </div>

<li class="list-group-item">Cras justo odio</li>

<tr>
                <td>Dummy</td>
                <td>Row</td>
                <th scope="row">2020-11-30T03:26:55.178Z</th>
              </tr>
  */
  function AppendNewDataToList(time, rfid, temp) {
    var row = document.createElement('tr');
    row.setAttribute('id', rfid);

    timeObj = new Date(time);
    var mytime = timeObj.toLocaleDateString() + " " + timeObj.toLocaleTimeString();

    var timeRecord = document.createElement('td');
    var rfidRecord = document.createElement('td');
    var tempRecord = document.createElement('td');

    timeRecord.appendChild(document.createTextNode(mytime));
    rfidRecord.appendChild(document.createTextNode(rfid));
    tempRecord.appendChild(document.createTextNode(temp));

    row.append(rfidRecord);
    row.append(tempRecord);
    row.append(timeRecord);

    var recordString = "RFID: " + rfid + " TEMPERAUTRE: " + temp;
    records.append(row);
  }

  function OnSelectionChange() {
    const device = trackedDevices.findDevice(listOfDevices[listOfDevices.selectedIndex].text);
    for (i = 0; i < device.rfidData.length; i++) {
      const time = device.timeData[i];
      const rfid = device.rfidData[i];
      const temp = device.temperatureData[i];
      if (!rfid || !temp) {
        continue;
      }
      console.log("creating a new list element with rfid: " + rfid + " temp: " + temp);
      AppendNewDataToList(time, rfid, temp)
      // var li = document.createElement('li');
      // li.setAttribute('id', rfid);
      // var recordString = "RFID: " + rfid + " TEMPERAUTRE: " + temp;
      // li.appendChild(document.createTextNode(recordString));
      // records.append(li);
    }
  }

  listOfDevices.addEventListener('change', OnSelectionChange, false);

  // When a web socket message arrives:
  // 1. Unpack it
  // 2. Validate it has date/time and temperature
  // 3. Find or create a cached device to hold the telemetry data
  // 4. Append the telemetry data
  // 5. Update the chart UI
  webSocket.onmessage = function onMessage(message) {
    try {
      const messageData = JSON.parse(message.data);
      console.log(messageData);

      // time and either temperature or rfid are required
      if (!messageData.MessageDate || (!messageData.IotData.rfid && !messageData.IotData.temperature)) {
        console.log("ERROR: Received invalid message")
        return;
      }

      // find or add device to list of tracked devices
      const existingDeviceData = trackedDevices.findDevice(messageData.DeviceId);

      if (existingDeviceData) {
        console.log("found existing device")
        existingDeviceData.addData(messageData.MessageDate, messageData.IotData.rfid, messageData.IotData.temperature);
        // AppendNewDataToList(messageData.MessageDate, messageData.IotData.rfid, messageData.IotData.temperature);
      } else {
        console.log("adding new device")
        const newDeviceData = new DeviceData(messageData.DeviceId);
        trackedDevices.devices.push(newDeviceData);
        console.log("pushed new device: " + messageData.DeviceId);
        const numDevices = trackedDevices.getDevicesCount();
        // deviceCount.innerText = numDevices === 1 ? `${numDevices} device` : `${numDevices} devices`;
        newDeviceData.addData(messageData.MessageDate, messageData.IotData.rfid, messageData.IotData.temperature);

        // add device to the UI list
        const node = document.createElement('option');
        const nodeText = document.createTextNode(messageData.DeviceId);
        node.appendChild(nodeText);
        listOfDevices.appendChild(node);

        // if this is the first device being discovered, auto-select it
        if (needsAutoSelect) {
          needsAutoSelect = false;
          listOfDevices.selectedIndex = 0;
          // OnSelectionChange();
        }
      }

      // var li = document.createElement('li');
      // li.setAttribute('id', rfid);
      // var recordString = "RFID: " + rfid + " TEMPERAUTRE: " + temp;
      // li.appendChild(document.createTextNode(recordString));
      // records.append(li);

      // myLineChart.update();
    } catch (err) {
      console.error(err);
    }
  };
});


