var dash = {
  deviceId: null,

  realtimeGauge: null,
  realtimeTrendChart: null,
  realtimeTrendLastSample: 0,

  dailyUsageChart: null,                                                                                                                                                                             
  monthlyUsageChart: null,                                                                                                                                                                           
                                                                                                                                                                                                     
  init: function(deviceId) {                                                                                                                                                                         
    this.deviceId = deviceId;                                                                                                                                                                        
                                                                                                                                                                                                     
    if (this.deviceId) {                                                                                                                                                                             
      $('.' + deviceId).addClass('active');                                                                                                                                                          
    }                                                                                                                                                                                                
                                                                                                                                                                                                     
    this.initRealtimeGauge();                                                                                                                                                                        
    this.initRealtimeTrendChart();                                                                                                                                                                   
    this.initDailyUsageChart();                                                                                                                                                                      
    this.initMonthlyUsageChart();                                                                                                                                                                    
                                                                                                                                                                                                     
    this.initWsConnection();                                                                                                                                                                         
  },                                                                                                                                                                                                 

  initWsConnection: function() {
    var wsUri = 'ws://' + window.location.host + '/ws'
    var ws = new WebSocket(wsUri);
    ws.onopen = function () {
      console.log('Websocket connection established');
      $('#connection-error').hide(200);
      ws.send(JSON.stringify(
        {
          requestType: 'getCachedData',
          deviceId: dash.deviceId
        }
      ));
    }
    ws.onmessage = dash.wsMessageHandler;

    ws.onclose = function() {
      // Usually caused by mobile devices going to sleep or the user minimising the browser app.
      // The setTimeout will begin once the device wakes from sleep or the browser regains focus.
      $('#connection-error').show();
      setTimeout(dash.initWsConnection, 2000);
    }
  },

  wsMessageHandler: function(messageEvent) {
    let message = JSON.parse(messageEvent.data);
    if(message.deviceId === dash.deviceId) {
      if(message.dataType === 'realtimeUsage') {
        dash.refreshRealtimeDisplay(message.data);
      }
      else if(message.dataType === 'dailyUsage') {
        dash.parseDailyUsageData(message.data);
      }
      else if(message.dataType === 'monthlyUsage') {
        dash.parseMonthlyUsageData(message.data);
      }
      else if(message.dataType === 'powerState') {
        dash.refreshPowerState(message.data);
      }
    }

  },

  initRealtimeGauge: function() {
    var opts = {
      angle: 0,
      lineWidth: 0.2,
      pointer: {
        length: 0.6,
        strokeWidth: 0.035,
        color: '#000000'
      },
      limitMax: true,
      limitMin: true,
      generateGradient: true,
      highDpiSupport: true, 
      staticLabels: {
        font: "12px sans-serif",
        labels: [500, 1500, 3000]
      },
      staticZones: [
        { strokeStyle: "#30B32D", min: 0, max: 500 },
        { strokeStyle: "#FFDD00", min: 500, max: 1500 },
        { strokeStyle: "#F03E3E", min: 1500, max: 3000 }
      ]
    };
    var target = document.getElementById('rtu-gauge');
  
    dash.realtimeGauge = new Gauge(target).setOptions(opts);
    dash.realtimeGauge.maxValue = 3000;
    dash.realtimeGauge.setMinValue(0);
    dash.realtimeGauge.animationSpeed = 32;
  },

  initRealtimeTrendChart: function() {
    var ctx = document.getElementById('rtt-chart').getContext('2d');
    this.realtimeTrendChart = new Chart(ctx, {
      type: 'line',
      data: {
        datasets: [{
          label: "Power (W)",
          borderColor: 'rgb(255, 99, 132)',
          data: []
        }]
      },
      options: {
        legend: {
          display: false
        },
        scales: {
          xAxes: [{
            display: false,
            type: 'realtime'
          }],
          yAxes: [{
            ticks: {
              beginAtZero:true
            }
          }]
        },
        maintainAspectRatio: false,
        tooltips: {
          intersect: false
        },
        plugins: {
          streaming: {
            duration: 60000,
            refresh: 1000,
            delay: 1000,
            frameRate: 30,
            onRefresh: dash.realtimeTrendChartOnRefresh
          }
        }
      }
    });
  },

  initDailyUsageChart: function() {
    var ctx = document.getElementById('du-chart').getContext('2d');
    this.dailyUsageChart = new Chart(ctx, {
      type: 'bar',
      data: {
        datasets: [{
          label: "Energy (kWH)",
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgb(255, 99, 132)',
          data: []
        }]
      },
      options: {
        legend: {
          display: false
        },
        scales: {
          yAxes: [{
            ticks: {
              beginAtZero:true
            }
          }]
        },
        maintainAspectRatio: false,
        tooltips: {
          intersect: false
        },
      }
    });
  },

  initMonthlyUsageChart: function() {
    var ctx = document.getElementById('mu-chart').getContext('2d');
    this.monthlyUsageChart = new Chart(ctx, {
      type: 'bar',
      data: {
        datasets: [{
          label: "Energy (kWH)",
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgb(255, 99, 132)',
          data: []
        }]
      },
      options: {
        legend: {
          display: false
        },
        scales: {
          yAxes: [{
            ticks: {
              beginAtZero:true
            }
          }]
        },
        maintainAspectRatio: false,
        tooltips: {
          intersect: false
        },
      }
    });
  },

  realtimeTrendChartOnRefresh: function(chart) {
    chart.data.datasets.forEach(function(dataset) {
      dataset.data.push({
        x: Date.now(),
        y: dash.realtimeTrendLastSample
      });
    });
  },

  refreshRealtimeDisplay: function(realtime) {

    var power = Math.round((realtime.power_mw) ? (realtime.power_mw/1000) : realtime.power);
    var current = ((realtime.current_ma) ? (realtime.current_ma/1000) : realtime.current).toFixed(2);
    var voltage = Math.round((realtime.voltage_mv) ? (realtime.voltage_mv/1000) : realtime.voltage);

    this.realtimeGauge.set(power);
    // might switch to Vue.js if this gets tedious 
    $("#rtu-power").text(power + " W")
    $("#rtu-current").text(current + " A")
    $("#rtu-voltage").text(voltage + " V")

    this.realtimeTrendLastSample = power;
  },


  parseDailyUsageData: function(usageData) {

    // Clear previous data
    dash.dailyUsageChart.data.labels = [];
    dash.dailyUsageChart.data.datasets.forEach(function(dataset) {
      dataset.data = [];
    });

    usageData.forEach(function(entry) {
      // Months from API response are 1 based
      var day = moment([entry.year, entry.month - 1, entry.day]);

      dash.dailyUsageChart.data.labels.push(day.format('MMM D'));
      dash.dailyUsageChart.data.datasets.forEach(function(dataset) {
        dataset.data.push((entry.energy_wh) ? (entry.energy_wh/1000) : entry.energy);
      });
    });

    dash.dailyUsageChart.update();
    dash.setDailyUsageStats(usageData);
  },

  setDailyUsageStats: function(usageData) {

    var dailyTotal = usageData.find(function(d) {
      return d.day === moment().date() && d.month === (moment().month()+1) && d.year === moment().year()
    });

    var energy = (dailyTotal.energy_wh) ? (dailyTotal.energy_wh/1000) : dailyTotal.energy
    $("#total-day").text(energy.toFixed(2));

    var total = usageData.reduce(function(t, d) {return t + ((d.energy_wh) ? (d.energy_wh/1000) : d.energy)}, 0);
    var avg = total/usageData.length;
    console

    $("#avg-day").text(avg.toFixed(2));

  },

  parseMonthlyUsageData: function(usageData) {
    
    // Clear previous data
    dash.monthlyUsageChart.data.labels = [];
    dash.monthlyUsageChart.data.datasets.forEach(function(dataset) {
      dataset.data = [];
    });

    usageData.forEach(function(entry) {
      // Months from API response are 1 based
      var month = moment().month(entry.month -1);

      dash.monthlyUsageChart.data.labels.push(month.format('MMM'));
      dash.monthlyUsageChart.data.datasets.forEach(function(dataset) {
        dataset.data.push((entry.energy_wh) ? (entry.energy_wh/1000) : entry.energy);
      });
    });

    dash.monthlyUsageChart.update();
    dash.setMonthlyUsageStats(usageData);
  },

  setMonthlyUsageStats: function(usageData) {

    var monthlyTotal = usageData.find(function(m) {
      return m.month === (moment().month()+1) && m.year === moment().year()
    });
    var energy = (monthlyTotal.energy_wh) ? (monthlyTotal.energy_wh/1000) : monthlyTotal.energy
    $("#total-month").text(energy.toFixed(2));

    var total = usageData.reduce(function(t, m) {return t + ((m.energy_wh) ? (m.energy_wh/1000) : m.energy)}, 0);
    var avg = total/usageData.length;

    $("#avg-month").text(avg.toFixed(2));
  },

  refreshPowerState: function(powerState) {
    if(powerState.isOn) {
      $("#power-state").text("ON").attr("class", "label label-success");
    }
    else {
      $("#power-state").text("OFF").attr("class", "label label-danger");
    }

    if(powerState.uptime === 0) {
      $("#uptime").text("-");
    }
    else {
      $("#uptime").text(moment.duration(powerState.uptime, "seconds").format("d[d] h[h] m[m]", {largest: 2}));
    }
    
  },

};
