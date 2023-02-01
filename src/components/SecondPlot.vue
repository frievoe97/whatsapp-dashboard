<template>
  <div :id="classID + '-container'">
    <div :id="classID + '-title'">Number Of Messages Per Hour</div>
    <div :id="classID"></div>
    <div class="buttons">
      <div @click="changeIndex2(5)" class="single-button">Hour</div>
      <div @click="changeIndex2(6)" class="single-button">Minute</div>
      <div @click="changeIndex2(7)" class="single-button">Weekday</div>
      <div @click="changeIndex2(8)" class="single-button">Month</div>
    </div>
  </div>
</template>

<script>
import * as d3 from "d3";
import { interpolatePath } from "d3-interpolate-path";

export default {
  name: "Plot-2",
  components: {},
  props: {
    data: Object,
    globalWidth: Number,
    classIDProp: String,
  },
  data() {
    return {
      plotData: [], // erster Index ist Lisa, Friedrich, Gesamt // Zweiter Index ist unvonverted, perDay, perMonth, perYear
      starteDate: "",
      endDate: "",
      index: 5,
      parseTime: d3.timeParse("%Y-%m-%d"),
      allCurveObjects: [],
      curve: {},
      svg: {},
      xScale: {},
      yScale: {},
      x: {},
      y: {},
      xAxis: {},
      yAxis: {},
      focus: {},
      margin: { top: 20, right: 30, bottom: 30, left: 50 },
      width: 876 - 100,
      //width: 576 - 100,
      height: 350,
      indexName: ["Day", "Month", "Year"],
      classNames: [],
      classNamesDot: [],
      lineObjects: [],
      colors: [
        "red",
        "green",
        "blue",
        "black",
        "brown",
        "coral",
        "darkblue",
        "orange",
        "darkorange",
        "darkviolet",
        "indigo",
        "lightsalmon",
        "midnightblue",
        "red",
        "green",
        "blue",
        "black",
        "brown",
        "coral",
        "darkblue",
        "orange",
        "darkorange",
        "darkviolet",
        "indigo",
        "lightsalmon",
        "midnightblue",
        "red",
        "green",
        "blue",
        "black",
        "brown",
        "coral",
        "darkblue",
        "orange",
        "darkorange",
        "darkviolet",
        "indigo",
        "lightsalmon",
        "midnightblue",
      ],
      size: true,
      classID: "plot-1",
    };
  },
  mounted() {
    this.classNames = this.classNames.map((el) => this.classIDProp + "-" + el);
    this.classID = this.classIDProp;
    window.addEventListener("resize", this.myEventHandler);
    this.getStartWidth();
    this.createClassArrays();
    this.prepareData2();
    console.log(this.plotData);
  },
  watch: {
    data() {
      this.createClassArrays();
      this.prepareData2();
    },
    globalWidth: function () {
      this.switchSize();
    },
  },
  methods: {
    createClassArrays: async function () {
      this.classNames = [];
      this.classNamesDot = [];
      for (let i = 0; i < this.data.names.length; i++) {
        const index = (i + 1).toString();
        this.classNames.push("line-" + index);
        this.classNamesDot.push(".line" + index);
      }
    },
    getStartWidth: async function () {
      this.width =
        document.querySelector("#grid-" + this.classID).clientWidth -
        (this.margin.left + this.margin.right);
    },
    myEventHandler: function () {
      // eslint-disable-next-line
      const widthPlot1 =
        document.querySelector("#grid-" + this.classID).clientWidth -
        (this.margin.left + this.margin.right);
      if (this.width != widthPlot1) {
        this.width = widthPlot1;
      }
    },
    changeIndex2: function (index) {
      this.index = index;
      this.updateCurve();
    },
    switchSize: function () {
      if (this.globalWidth > 0) {
        this.width = this.globalWidth + 100;
      }
      this.changeSize();
    },
    changeSize: function () {
      d3.select(".plot1svg").attr(
        "width",
        this.width + this.margin.left + this.margin.right
      );
    },
    prepareData2: function () {
      if (!this.data.allMessages.length) return;
      this.plotData = [];
      // eslint-disable-next-line
      const defaultPaerseTime = d3.timeParse("%H");

      // Welche Zeit wird hier eingetragen? Die die in dem Array als Index steht? Probieren wir es mal...
      if (this.index == 2) {
        this.parseTime = d3.timeParse("%M");
      } else if (this.index == 1) {
        this.parseTime = d3.timeParse("%M");
      } else if (this.index == 3) {
        this.parseTime = d3.timeParse("%M");
      } else if (this.index == 5) {
        this.parseTime = d3.timeParse("%H");
      } else if (this.index == 6) {
        this.parseTime = d3.timeParse("%H%M");
      } else if (this.index == 7) {
        this.parseTime = d3.timeParse("%w"); // Need to be changed
      } else if (this.index == 8) {
        this.parseTime = d3.timeParse("%m"); // Need to be changed
      }

      for (let i = 0; i < this.data.names.length; i++) {
        this.plotData.push([[], [], [], [], [], [], [], []]);
      }

      // 0 unconverted?
      // 1 hour
      // Format: [ "2017-06-22", 7 ]

      this.plotData.push([[], [], [], [], [], [], [], []]);

      for (let i = 0; i < this.data.allMessages.length; i++) {
        const name = this.data.allMessages[i].name;
        const nameIndex = this.data.names.indexOf(name);

        this.plotData[nameIndex][0].push([this.data.allMessages[i].date]);
        this.plotData[this.data.names.length][0].push([
          this.data.allMessages[i].date,
        ]);
      }

      for (let i = 0; i < this.plotData.length; i++) {
        for (let j = 0; j < this.plotData[i][3].length; j++) {
          this.plotData[i][4].push([
            this.plotData[i][3][j][0],
            this.plotData[i][3][j][1] * (Math.random() * (3 - 0.5) + 0.5),
          ]);
        }
      }

      for (let i = 0; i < this.plotData.length; i++) {
        for (let j = 0; j < 24; j++) {
          let hourString = j.toString();
          hourString = hourString.length == 2 ? hourString : "0" + hourString;
          this.plotData[i][5].push([hourString, 0]);
        }
      }

      for (let i = 0; i < this.plotData.length; i++) {
        for (let j = 0; j < 24; j++) {
          for (let k = 0; k < 60; k++) {
            let hourString = j.toString();
            hourString = hourString.length == 2 ? hourString : "0" + hourString;

            let minuteString = k.toString();
            minuteString =
              minuteString.length == 2 ? minuteString : "0" + minuteString;

            this.plotData[i][6].push([hourString + minuteString, 0]);
          }
        }
      }

      for (let i = 0; i < this.data.allMessages.length; i++) {
        const name = this.data.allMessages[i].name;
        // eslint-disable-next-line
        const nameIndex = this.data.names.indexOf(name);
        // eslint-disable-next-line
        const hour = this.data.allMessages[i].time.slice(0, 2);
        const minute = this.data.allMessages[i].time.slice(3, 5);
        const index = +hour * 60 + +minute;

        this.plotData[nameIndex][5][+hour][1]++;
        this.plotData[nameIndex][6][index][1]++;
      }

      for (let i = 0; i < this.plotData.length; i++) {
        let sum = 0;
        for (let j = 0; j < this.plotData[i][5].length; j++) {
          sum = sum + this.plotData[i][5][j][1];
        }
        if (sum != 0) {
          for (let j = 0; j < this.plotData[i][5].length; j++) {
            this.plotData[i][5][j][1] = (this.plotData[i][5][j][1] / sum) * 100;
          }
        }
      }

      for (let i = 0; i < this.plotData.length; i++) {
        for (let j = 0; j < 7; j++) {
          this.plotData[i][7].push([j.toString(), 0]);
        }
      }

      for (let i = 0; i < this.data.allMessages.length; i++) {
        const name = this.data.allMessages[i].name;
        const nameIndex = this.data.names.indexOf(name);
        const weekday = this.data.allMessages[i].weekday.toString();
        this.plotData[nameIndex][7][weekday][1]++;
      }

      console.log(this.plotData);

      this.createPlot();
    },
    createPlot: function () {
      if (this.index == 2) {
        this.starteDate = this.plotData[2][2][0][0].substring(0, 7);
        this.endDate = this.plotData[2][2][
          this.plotData[2][2].length - 1
        ][0].substring(0, 7);
      } else if (this.index == 1) {
        this.starteDate = this.plotData[2][1][0][0].substring(0, 10);
        this.endDate = this.plotData[2][1][
          this.plotData[2][1].length - 1
        ][0].substring(0, 10);
        //maxY = 60;
      } else if (this.index == 3) {
        this.starteDate = this.plotData[2][3][0][0].substring(0, 4);
        this.endDate = this.plotData[2][3][
          this.plotData[2][3].length - 1
        ][0].substring(0, 4);
      } else if (this.index == 5) {
        this.starteDate = this.plotData[2][5][0][0].substring(0, 4);
        this.endDate = this.plotData[2][5][
          this.plotData[2][5].length - 1
        ][0].substring(0, 4);
      } else if (this.index == 6) {
        this.starteDate = "00";
        this.endDate = "2359";
      } else if (this.index == 7) {
        this.starteDate = "0";
        this.endDate = "6";
      } else if (this.index == 8) {
        this.starteDate = "01";
        this.endDate = "12";
      }

      /*
            this.width =
                parseInt(d3.select("#my_dataviz2").style("width")) -
                this.margin.left -
                this.margin.right;
            this.height =
                parseInt(d3.select("#my_dataviz2").style("height")) -
                this.margin.top -
                this.margin.bottom;
                */

      // svg
      d3.select("#" + this.classID + "-svg").remove();

      const svg = d3
        .select("#" + this.classID)
        .append("svg")
        //.attr("class", this.classID + "-svg")
        .attr("id", this.classID + "-svg")
        .attr("width", this.width + this.margin.left + this.margin.right)
        .attr("height", this.height + this.margin.top + this.margin.bottom)
        .append("g")
        .attr("transform", `translate(${this.margin.left},${this.margin.top})`);

      const x = d3.scaleTime().range([0, this.width]).nice();

      let xAxis = null;

      if (this.index == 5)
        xAxis = d3.axisBottom().scale(x).tickFormat(d3.timeFormat("%H:%M"));
      if (this.index == 6)
        xAxis = d3.axisBottom().scale(x).tickFormat(d3.timeFormat("%H:%M"));
      if (this.index == 7)
        xAxis = d3.axisBottom().scale(x).tickFormat(d3.timeFormat("%a"));
      if (this.index == 8)
        xAxis = d3.axisBottom().scale(x).tickFormat(d3.timeFormat("%H:%M"));

      //.tickFormat(d3.timeFormat("%a"));

      //xAxis = d3.axisBottom().scale(x).tickFormat(d3.timeFormat("%a"));

      // myXaxis -> plot-1-x-axis
      svg
        .append("g")
        .attr("transform", `translate(0, ${this.height})`)
        .attr("id", this.classID + "-x-axis");

      const y = d3.scaleLinear().range([this.height, 0]);
      const yAxis = d3.axisLeft().scale(y);
      svg
        .append("g")
        //.attr("class", "myYaxis")
        .attr("id", this.classID + "-y-axis");

      svg
        .append("text")
        .attr("id", this.classID + "-y-label")
        .attr("text-anchor", "end")
        .attr("y", "-35px")
        .attr("transform", "rotate(-90)")
        .text("average messages per " + this.indexName[this.index - 1]);

      // TOOLTIP
      // eslint-disable-next-line
      var rectOverlay = svg
        .append("rect")
        //.attr("cursor", "move")
        .attr("fill", "none")
        .attr("pointer-events", "all")
        .attr("class", "zoom")
        .attr("width", this.width)
        .attr("height", this.height)
        .on("mouseover", this.focusMouseOver())
        .on("mousemove", this.focusMouseMove())
        .on("mouseout", this.focusMouseOut());
      /*.attr(
                    "transform",
                    "translate(" +
                        this.margin.left +
                        "," +
                        this.margin.top +
                        ")"
                );
            //.call(zoom)
            //.on("mousemove", focusMouseMove)
            .on("mouseover", focusMouseOver)
            /*.on("mouseout", focusMouseOut);*/

      this.x = x;
      this.y = y;
      this.xAxis = xAxis;
      this.yAxis = yAxis;
      this.svg = svg;
      this.focus = focus;

      this.setInitalLine();
      //this.updateCurve();
    },
    setInitalLine() {
      let maxY = this.calculateMaxY(this.plotData[0][this.index]);
      for (let i = 0; i < this.data.names.length; i++) {
        maxY =
          this.calculateMaxY(this.plotData[i][this.index]) > maxY
            ? this.calculateMaxY(this.plotData[i][this.index])
            : maxY;
      }

      let parseTime = this.parseTime;
      if (this.index == 5) {
        this.parseTime = d3.timeParse("%H");
      } else if (this.index == 6) {
        this.parseTime = d3.timeParse("%H%M");
      } else if (this.index == 7) {
        this.parseTime = d3.timeParse("%w"); // Need to be changed
      } else if (this.index == 8) {
        this.parseTime = d3.timeParse("%m"); // Need to be changed
      }

      if (this.index == 5) {
        this.starteDate = "00";
        this.endDate = "23";
      } else if (this.index == 6) {
        this.starteDate = "00";
        this.endDate = "2359";
      } else if (this.index == 7) {
        this.starteDate = "0";
        this.endDate = "6";
      } else if (this.index == 8) {
        this.starteDate = "01";
        this.endDate = "12";
      }

      this.x.domain([parseTime(this.starteDate), parseTime(this.endDate)]);
      this.svg.selectAll("#" + this.classID + "-x-axis").call(this.xAxis);

      /*
            this.svg
                .append("text")
                .attr("class", "x label")
                .attr("text-anchor", "end")
                .attr("x", this.width)
                .attr("y", this.height - 6)
                .text("x-Achse");
            */

      // create the Y axis
      this.y.domain([0, maxY]).nice();
      this.svg.select("#" + this.classID + "-y-axis").call(this.yAxis);

      this.svg
        .select("#" + this.classID + "-y-label")
        .text("Average Messages Per " + this.indexName[this.index - 1]);

      // this.indexName[this.index - 1].charAt(0).toUpperCase() + this.indexName[this.index - 1].slice(1)
      //.text("average messages per " + this.indexName[this.index - 1]);

      //this.svg.select("title").text("NEUN");

      const x = this.x;
      // eslint-disable-next-line
      const y = this.y;
      const height = this.height;

      const line = d3
        .line()
        .curve(d3.curveBumpX)
        .x(function (d) {
          return x(parseTime(d[0]));
        })
        // eslint-disable-next-line
        .y(function (d) {
          return height;
        });

      this.lineObjects = [];

      for (let i = 0; i < this.classNames.length; i++) {
        this.lineObjects.push(
          this.svg
            .selectAll("." + this.classNames[i])
            .data([this.plotData[i][this.index]], function (d) {
              return parseTime(d[0]);
            })
        );
      }

      //const classNames = this.classNames;

      for (let i = 0; i < this.lineObjects.length; i++) {
        this.lineObjects[i]
          .join("path")
          .attr("class", this.classNames[i])
          .merge(this.lineObjects[i])
          .attr("d", function (d) {
            return line(d);
          })
          .style("fill", "none")
          .style("stroke", this.colors[i])
          .style("stroke-width", "2");
      }
      this.updateCurve();
    },
    updateCurve() {
      let maxY = this.calculateMaxY(this.plotData[0][this.index]);
      for (let i = 0; i < this.data.names.length; i++) {
        maxY =
          this.calculateMaxY(this.plotData[i][this.index]) > maxY
            ? this.calculateMaxY(this.plotData[i][this.index])
            : maxY;
      }

      console.log(this.plotData);
      console.log(this.index);

      let parseTime = this.parseTime;
      if (this.index == 5) {
        this.parseTime = d3.timeParse("%H");
      } else if (this.index == 6) {
        this.parseTime = d3.timeParse("%H%M");
      } else if (this.index == 7) {
        this.parseTime = d3.timeParse("%w"); // Need to be changed
      } else if (this.index == 8) {
        this.parseTime = d3.timeParse("%m"); // Need to be changed
      }

      if (this.index == 5) {
        // Weekday
        this.starteDate = "00";
        this.endDate = "23";
      } else if (this.index == 6) {
        // Weekday
        this.starteDate = "00";
        this.endDate = "2359";
      } else if (this.index == 7) {
        // Weekday
        this.starteDate = "0";
        this.endDate = "6";
      } else if (this.index == 8) {
        // Weekday
        this.starteDate = "01";
        this.endDate = "12";
      }

      if (this.index == 5)
        this.x
          .domain([parseTime(this.starteDate), parseTime(this.endDate)])
          .tickFormat(d3.timeFormat("%H"));
      if (this.index == 6)
        this.x
          .domain([parseTime(this.starteDate), parseTime(this.endDate)])
          .tickFormat(d3.timeFormat("%H%M"));
      if (this.index == 7)
        this.x
          .domain([parseTime(this.starteDate), parseTime(this.endDate)])
          .tickFormat(d3.timeFormat("%a"));
      if (this.index == 8)
        this.x
          .domain([parseTime(this.starteDate), parseTime(this.endDate)])
          .tickFormat(d3.timeFormat("%m"));

      //this.x.domain([parseTime(this.starteDate), parseTime(this.endDate)]);

      if (this.index == 5) this.xAxis.tickFormat(d3.timeFormat("%H"));
      if (this.index == 6) this.xAxis.tickFormat(d3.timeFormat("%H%M"));
      if (this.index == 7) this.xAxis.tickFormat(d3.timeFormat("%a"));
      if (this.index == 8) this.xAxis.tickFormat(d3.timeFormat("%m"));

      this.svg
        .selectAll("#" + this.classID + "-x-axis")
        .transition()
        .duration(1000)
        .call(this.xAxis);

      /*
            this.svg
                .append("text")
                .attr("class", "x label")
                .attr("text-anchor", "end")
                .attr("x", this.width)
                .attr("y", this.height - 6)
                .text("x-Achse");
            */

      // create the Y axis
      this.y.domain([0, maxY]).nice();
      this.svg
        .select("#" + this.classID + "-y-axis")
        .transition()
        .duration(1000)
        .call(this.yAxis);

      this.svg
        .select("#" + this.classID + "-y-label")
        .transition()
        .duration(1000)
        //.text("Average Messages Per " + this.indexName[this.index - 1]);
        .text("Average Messages Per Day");

      // this.indexName[this.index - 1].charAt(0).toUpperCase() + this.indexName[this.index - 1].slice(1)
      //.text("average messages per " + this.indexName[this.index - 1]);

      //this.svg.select("title").text("NEUN");

      const x = this.x;
      const y = this.y;

      const line = d3
        .line()
        .curve(d3.curveBumpX)
        .x(function (d) {
          return x(parseTime(d[0]));
        })
        .y(function (d) {
          return y(d[1]);
        });

      this.lineObjects = [];

      for (let i = 0; i < this.classNames.length; i++) {
        this.lineObjects.push(
          this.svg
            .selectAll("." + this.classNames[i])
            .data([this.plotData[i][this.index]], function (d) {
              return parseTime(d[0]);
            })
        );
      }

      const classNames = this.classNames;
      //const classID = this.classID;

      for (let i = 0; i < this.lineObjects.length; i++) {
        this.lineObjects[i]
          .join("path")
          .attr("class", this.classNames[i])
          .merge(this.lineObjects[i])
          .transition()
          .duration(1000)
          .attrTween("d", function (d) {
            var previous = d3.select("." + classNames[i]).attr("d");

            //previous.attr("d");
            var current = line(d);
            return interpolatePath(previous, current);
          })
          .style("fill", "none")
          .style("stroke", this.colors[i])
          .style("stroke-width", "2");
      }
    },
    calculateMaxY: function (array) {
      let max = 0;
      for (let i = 0; i < array.length; i++) {
        if (array[i][1] > max) {
          max = array[i][1];
        }
      }
      if (max < 10) {
        max = 10;
      } else if (max < 100) {
        let modulo = max % 10;
        max = max - modulo + 10;
      } else if (max < 500) {
        let modulo = max % 100;
        max = max - modulo + 100;
      } else if (max < 1000) {
        let modulo = max % 200;
        max = max - modulo + 200;
      } else if (max < 10000) {
        let modulo = max % 500;
        max = max - modulo + 500;
      }
      return max;
    },
    focusMouseOver: function () {
      //console.log("DRIN");
    },
    focusMouseMove: function () {
      //console.log("BEWEGUNG!");
    },
    focusMouseOut: function () {
      //console.log("DRAUSSEN");
    },
    /*
        mousemove: function () {
            var x0 = x.invert(d3.mouse(this)[0]),
                i = bisectDate(data, x0, 1),
                d0 = data[i - 1],
                d1 = data[i],
                d = x0 - d0.date > d1.date - x0 ? d1 : d0;
            this.focus.attr(
                "transform",
                "translate(" + x(d.date) + "," + y(d.likes) + ")"
            );
            this.focus.select(".tooltip-date").text(dateFormatter(d.date));
            this.focus.select(".tooltip-likes").text(formatValue(d.likes));
        },
        */
  },
};
</script>
<!-- css loaderhttps://vue-loader.vuejs.org/guide/scoped-css.html#mixing-local-and-global-styles -->
<style>
/* AXES */
/* ticks */

/* STYLE BUTTONS */

/* title */
.title {
  font-size: 100px;
  text-anchor: middle;
}

.myXaxis,
.myYaxis,
#plot-1-x-axis,
#plot-1-y-axis,
#plot-2-x-axis,
#plot-2-y-axis {
  color: #000;
}

#plot-1-y-label,
#plot-2-y-label {
  font-size: 1rem;
}

.single-button {
  font-size: 1.5rem;
  color: #000;
  float: left;
  margin-right: 15px;
}

.single-button:last-child {
  margin-right: 0px;
}

.buttons {
  height: 40px;
  width: max-content;
  margin: auto;
}

/*
#my_dataviz2 {
    width: 100%;
    height: 100%;
    position: absolute;
}
*/

.plot1svg {
  width: 100%;
  margin: auto;
}

#plot-1-title,
#plot-2-title {
  margin: auto;
  font-size: 1.5rem;
  height: 40px;
  color: #000;
}
</style>
