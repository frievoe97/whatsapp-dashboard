<template>
  <div id="app">
    <D3LineChart :config="chart_config" :datum="chart_data"></D3LineChart>
    <button @click="addData()">Add</button>
    <div class="grid">
      <input
        type="file"
        id="input"
        name="myfile"
        class="inputfile"
        @change="fileUploaded"
      />
      <div class="grid-element" id="grid-plot-1">
        <FirstPlot
          :data="allChats"
          :globalWidth="widthPlot1"
          classIDProp="plot-1"
        />
      </div>

      <div class="grid-element" id="grid-plot-2">
        <SecondPlot
          :data="allChats"
          :globalWidth="widthPlot2"
          classIDProp="plot-2"
        />
      </div>
    </div>
  </div>
</template>

<script>
import FirstPlot from "./components/FirstPlot.vue";
import SecondPlot from "./components/SecondPlot.vue";
import { D3BarChart } from "vue-d3-charts";
import { D3LineChart } from "vue-d3-charts";

export default {
  name: "App",
  data() {
    return {
      chart_data: [
        { hours: 238, production: 134, date: 2000 },
        { hours: 938, production: 478, date: 2001 },
        { hours: 1832, production: 1392, date: 2002 },
        { hours: 2092, production: 2343, date: 2003 },
        { hours: 2847, production: 2346, date: 2004 },
        { hours: 2576, production: 2233, date: 2005 },
        { hours: 2524, production: 2325, date: 2006 },
        { hours: 1648, production: 2456, date: 2007 },
        { hours: 2479, production: 2329, date: 2008 },
        { hours: 3200, production: 2438, date: 2009 },
      ],
      chart_config: {
        values: ["hours", "production"],
        date: {
          key: "date",
          inputFormat: "%Y",
          outputFormat: "%Y",
        },
        points: false,
        axis: {
          yTicks: 3,
        },
      },
      count: 2010,
      d3Data: { 0: 100, 1: 200, 2: 167, 3: 776 },
      data: [],
      width: 100,
      height: 100,
      showReselectNames: false,
      allChats: {
        names: [],
        allMessages: [],
        messagesPerPersoan: [],
        totalConfig: {
          firstMessage: "",
          totalMessages: 0,
          messagesPerTime: {},
        },
        configPerPersoan: [],
      },
      allNames: [],
      config: {
        firstMsg: "",
        totalMsg: 0,
        names: [],
      },
      allWidths: [0, 0, 0, 0, 0, 0, 0],
      allWidths2: {
        plot1: 0,
        plot2: 0,
        plot3: 0,
        plot4: 0,
        plot5: 0,
        plot6: 0,
        plot7: 0,
      },
      testProp: 1,
      widthPlot1: 800,
      widthPlot2: 800,
      showSelectedNames: false,
      selectedNames: [],
    };
  },
  components: {
    FirstPlot,
    SecondPlot,
    D3BarChart,
    D3LineChart,
  },
  methods: {
    addData: function () {
      const hours = Math.floor(Math.random() * 1000 * 3);
      const production = Math.floor(Math.random() * 1000 * 3);
      const date = this.count++;
      this.chart_data.push({ hours, production, date });
      console.log(this.chart_data);
    },
    fileUploaded: async function () {
      console.log("UPLOAD NEW FILE!");
      var selectedFile = document.getElementById("input").files[0];
      let text = await selectedFile.text();

      const dateRegEx =
        /\[\d\d\.\d\d\.\d\d,\s[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{1,3})?\]/g;

      let allDates = text.match(dateRegEx);
      let allMessanges = text.split(/\[\d\d.\d\d.\d\d, \d\d:\d\d:\d\d\]/);
      allMessanges.shift();
      this.data = [];
      this.allNames = [];
      this.allChats = {
        names: [],
        allMessages: [],
        messagesPerPersoan: [],
        totalConfig: {
          firstMessage: "",
          totalMessages: 0,
          messagesPerTime: {},
        },
        configPerPersoan: [],
      };
      this.convertData(allDates, allMessanges);
    },
    toTimestamp: function (year, month, day, hour, minute, second) {
      var datum = new Date(
        Date.UTC(year, month - 1, day, hour, minute, second)
      );
      return datum.getTime() / 1000;
    },
    convertData: function (dates, msg) {
      for (let i = 0; i < dates.length; i++) {
        if (!msg[i].includes(":")) continue;
        if (msg[i].includes("Ende-zu-Ende-verschlüsselt")) continue;
        if (msg[i].includes("Deine Sicherheitsnummer für alle Teilnehmer"))
          continue;
        let [name, ...message] = msg[i].split(": ");
        message = message
          .join(": ")
          .replace(/(\r\n|\n|\r)/gm, " ")
          .replace(/\s{2,}/g, " ")
          .trim();
        name = name.trim();
        const length = message.length;
        let date = dates[i].slice(1, 9);
        date =
          "20" +
          date.substring(6, 8) +
          "-" +
          date.substring(3, 5) +
          "-" +
          date.substring(0, 2);
        const time = dates[i].slice(11, 19);
        const timestamp = this.toTimestamp(
          date.substring(0, 4),
          date.substring(5, 7),
          date.substring(8, 10),
          time.substring(0, 2),
          time.substring(3, 5),
          time.substring(6, 8)
        );
        if (!this.allNames.includes(name)) {
          this.allNames.push(name);
          this.config.names.push({ totalMsg: 0 });
        }
        if (!this.allChats.names.includes(name)) {
          this.allChats.names.push(name);
          this.allChats.configPerPersoan.push({
            totalMessages: 0,
            firstMessage: "",
            messagesPerTime: {},
          });
          this.allChats.messagesPerPersoan.push([]);
        }

        const weekday = new Date(
          date.substring(0, 4) +
            "-" +
            date.substring(5, 7) +
            "-" +
            date.substring(8, 10)
        ).getDay();
        //console.log(date + ": " + weekday);
        this.allChats.allMessages.push({
          date: date, // e.g. 2022-04-14
          day: date.substring(8, 10),
          month: date.substring(5, 7),
          year: date.substring(0, 4),
          msg: message,
          weekday: weekday,
          name: name,
          time: time,
          length: length,
          timestamp: timestamp,
          dateAndTime: dates[i].substring(1, 19),
        });
        this.allChats.messagesPerPersoan[this.allNames.indexOf(name)].push({
          date: date,
          day: date.substring(8, 10),
          month: date.substring(5, 7),
          year: date.substring(0, 4),
          msg: message,
          name: name,
          time: time,
          length: length,
          timestamp: timestamp,
          dateAndTime: dates[i].substring(1, 19),
        });
        this.data.push({
          date: date,
          msg: message,
          name: name,
          time: time,
          length: length,
          timestamp: timestamp,
        });
        this.config.totalMsg++;
        this.allChats.totalConfig.totalMessages++;
        if (i == 0) {
          this.config.firstMsg = date;
          this.allChats.totalConfig.firstMessage = date;
        }

        this.config.names[this.allNames.indexOf(name)].totalMsg++;
        this.allChats.configPerPersoan[this.allNames.indexOf(name)]
          .totalMessages++;

        if (
          this.allChats.configPerPersoan[this.allNames.indexOf(name)]
            .firstMessage == ""
        ) {
          this.allChats.configPerPersoan[
            this.allNames.indexOf(name)
          ].firstMessage = date;
        }
      }
      this.creatAllNamesArray();
      this.calculateMsgPerTime();
    },
    creatAllNamesArray: function () {
      this.showSelectedNames = true;
      this.selectedNames = [];
      // eslint-disable-next-line
      for (let i = 0; i < this.allChats.names.length; i++) {
        this.selectedNames.push({
          name: this.allChats.names[i],
          active: true,
          numberOfMessages: this.allChats.configPerPersoan[i].totalMessages,
        });
      }
      //this.$set(this.selectedNames, 0, this.selectedNames[0]);
      console.log(this.allChats);
    },
    calculateMsgPerTime: function () {
      this.allChats.totalConfig.messagesPerTime = {
        x: [
          0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
          20, 21, 22, 23,
        ],
        y: [
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0,
        ],
      };
      for (let i = 0; i < this.allNames.length; i++) {
        this.allChats.configPerPersoan[i].messagesPerTime = {
          x: [
            0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18,
            19, 20, 21, 22, 23,
          ],
          y: [
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            0,
          ],
        };
      }
      for (let i = 0; i < this.allChats.allMessages.length; i++) {
        const hour = parseInt(
          this.allChats.allMessages[i].time.substring(0, 2)
        );
        const nameIndex = this.allNames.indexOf(
          this.allChats.allMessages[i].name
        );

        this.allChats.totalConfig.messagesPerTime.y[hour]++;
        this.allChats.configPerPersoan[nameIndex].messagesPerTime.y[hour]++;
      }
      console.log(this.allChats);
    },
  },
  mounted() {},
};
</script>

<style scoped>
#app {
  margin: auto;
}
</style>
