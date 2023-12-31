import OutlinedInput from '@mui/material/OutlinedInput';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import React, { useEffect, useRef, useState } from 'react'
import Data from "../data/data.json"
import * as d3 from 'd3'

const years = []
const topics = ['topic1', 'topic2', 'topic3', 'topic4', 'topic5', 'topic6', 'topic7', 'topic8']
const colorScaleOrdinal = d3.scaleOrdinal()

const cacheData = {
  min:1992 ,
  max: 1998,
  data:[]
}
let brushData = Data
function throttle(callback, delay) {
  let last;
  let timer;
  return function () {
    const context = this;
    const now = +new Date();
    const args = arguments;
    if (last && now < last + delay) {
      clearTimeout(timer);
      timer = setTimeout(function () {
        last = now;
        callback.apply(context, args);
      }, delay);
    } else {
      last = now;
      callback.apply(context, args);
    }
  };
}
function findMinMaxYears(data) {
  const minMax = data.reduce((acc, item) => {
    if (acc.min > item.year) {
      acc.min = item.year;
    }
    if (acc.max < item.year) {
      acc.max = item.year;
    }
    return acc;
  }, { min: Infinity, max: -Infinity });

  return minMax;
}

Data.map(item => {
  if (years.indexOf(item.year) === -1) {
    years.push(item.year)
  }
})



const renderScatterplot = {
  dom: null,
  svg: null,
  xScale: null,
  yScale: null,
  innerWidth: 0,
  innerHeight: 0,
  margin: { top: 30, right: 20, bottom: 30, left: 40 },
  init(option) {
  
    const { dom } = option
    dom.innerHTML = ''

    this.dom = dom
    this.innerWidth = dom.clientWidth - this.margin.left - this.margin.right
    this.innerHeight = dom.clientHeight - this.margin.top - this.margin.bottom
    this.svg =
      d3.select(dom).append("svg")
        .attr("width", dom.clientWidth)
        .attr("height", dom.clientHeight);


  },
  // 渲染左边
  renderAxis(data) {
    d3.select(this.dom).selectAll('.axis').remove()
    const { margin, innerWidth, innerHeight, svg } = this

    this.xScale =
      d3.scaleLinear()
        .domain([data.minX, data.maxX])
        .range([0, innerWidth]);

    this.yScale =
      d3.scaleLinear()
        .domain([data.minY, data.maxY])
        .range([innerHeight, 0]);


    const xAxis = d3.axisBottom(this.xScale);
    const yAxis = d3.axisLeft(this.yScale);

    svg.append("g")
      .attr("transform", `translate(${margin.left}, ${innerHeight + margin.top})`)
      .call(xAxis);

    svg.append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`)
      .call(yAxis);

  },
  renderData(data, word) {
    d3.select(this.dom).selectAll('.circle-group').remove()
  
    const { xScale, yScale, margin, innerWidth, innerHeight, svg } = this
    svg
      .append("g")
      .attr("class", 'circle-group')
      .attr("transform", `translate(${margin.left}, ${margin.top})`)
      .selectAll("circle")
      .data(data.data)
      .enter()
      .append("circle")
      .attr("class", "scatterplot-circle")
      .attr("cx", d => xScale(d.x))
      .attr("cy", d => yScale(d.y))
      .attr("r", 5)
      .attr('x', d => d.x)
      .attr("copycolor", '#9e6102')
      .attr('fill', d => {
        const isInCludes = word.some(w =>  d.text.includes(w))
        return isInCludes ? 'red' : '#c0a6a6'
      })
      .on('mouseover', function () {
        // document.querySelectorAll(".scatterplot-circle").forEach(item => {
        //   d3.select(item).attr("fill", '#eee')
        // })
        // d3.select(this).attr("r", 8)
        // d3.select(this).attr("fill", d3.select(this).attr("copycolor"))
      })
      .on('mouseout', function () {
        // document.querySelectorAll(".scatterplot-circle").forEach(item => {
        //   d3.select(item).attr("fill", d3.select(item).attr("copycolor"))
        // })
        // d3.select(this).attr("r", 5)
      })
  },
  defaultData(condition) {
    let data = Data
    if (!Data || Data.length === 0) {
      return null;
    }

    let minX = Data.reduce((min, obj) => Math.min(min, obj.x), Infinity);
    let maxX = Data.reduce((max, obj) => Math.max(max, obj.x), -Infinity);

    let minY = Data.reduce((min, obj) => Math.min(min, obj.y), Infinity);
    let maxY = Data.reduce((max, obj) => Math.max(max, obj.y), -Infinity);

    if(condition.year.length != 0){
      data = data.filter(item => condition.year.includes(item.year))
    }
    if(condition.topic.length != 0){
      data = data.filter(item => condition.topic.every(t => item[t] > 0.1))
    }
   

    return {
      minX,
      maxX,
      minY,
      maxY,
      data
    }
  },
  renderBrush(data,callback) {
    const { margin, innerWidth, innerHeight, svg, xScale, yScale } = this;
    

    const brush = d3.brush()
      .extent([[0, 0], [innerWidth, innerHeight]])
      .on('brush', throttle(({ selection }) => {
        if (!selection) {
          // 如果没有选择区域（用户点击而不是拖动），则不执行任何操作
          return;
        }

        // 计算选择区域的数据空间坐标
        const [[x0, y0], [x1, y1]] = selection.map(d => {
          return [xScale.invert(d[0]), yScale.invert(d[1])];
        });
     
        // 过滤出位于选择区域内的数据点

        const selectedData = brushData.filter(d => {
          return d.x >= x0 && d.x <= x1 && d.y <= y0 && d.y >= y1;
        });
     
        const { min, max } = findMinMaxYears(selectedData);
        cacheData.min = min || ''
        cacheData.max = max || ''
        cacheData.data = selectedData


        // 计算选择区域的中心点
        const centerX = (x0 + x1) / 2;
        const centerY = (y0 + y1) / 2;

        // 创建或更新文本
       
        let brushText = svg.select('.brush-text');
        if (brushText.empty()) {
          brushText = svg.append('text')
            .attr('class', 'brush-text')
            .attr('text-anchor', 'middle')
            .attr('alignment-baseline', 'middle')
            .attr('font-size', '20px')
            .attr("style", "font-weight: bolder;fill:red;stroke:red;pointer-events: none;")
    
        }

        brushText
          .attr('x', xScale(centerX) + margin.left)
          .attr('y', yScale(centerY) + margin.top)
          .text(`${min }-${max}`);
          
      }, 200))

      .on('end', ({ selection }) => {
        if (!selection) {
          
          d3.select('.brush-text').remove()
          // 如果没有选择区域（用户点击而不是拖动），则不执行任何操作
          return;
        }
      
        
        callback && callback(cacheData)
      });

    // 将 brush 应用到一个新的 g 元素上
    svg.append("g")
      .attr("class", "brush")
      .attr("transform", `translate(${margin.left}, ${margin.top})`)
      .call(brush);
  }


}




const Scatterplot = (props) => {
  const [year, setYear] = React.useState([])
  
  const [topic, setTopic] = React.useState([])
  const [word, setWord] = React.useState([])
  const scatterplotDom = useRef(null)

  const [rightData, setRightData] = useState({
    min:"",
    max:"",
    data:[]
  })

  const handleYearChange = (event) => {
    setRightData({
      min:"",
      max:"",
      data:[]
    })
    setWord([])
    setYear(event.target.value)
  }
  const handleTopicChange = (event) => {
    setRightData({
      min:"",
      max:"",
      data:[]
    })
    setTopic(event.target.value)
  }


  useEffect(() => {
    const data = renderScatterplot.defaultData.call(renderScatterplot,{ year, topic })
    const option = {
      dom: scatterplotDom.current,
      year,
      topic,
    }
    renderScatterplot.init.call(renderScatterplot, option)
    renderScatterplot.renderBrush.call(renderScatterplot, data,(currentData) => {
      let data = []
      currentData.data.map(item => {
        data.push(...item.text.split(",")) 
      })
      
      rightData.data = [...new Set(data)]
      rightData.min = currentData.min
      rightData.max = currentData.max
      setRightData(JSON.parse(JSON.stringify(rightData)))
      setWord([])
    
    }); // 调用创建棱镜的方法
  }, [])


  useEffect(() => {
    const data = renderScatterplot.defaultData.call(renderScatterplot,{ year, topic })
   
    brushData = data.data
    renderScatterplot.renderAxis.call(renderScatterplot, data)
    renderScatterplot.renderData.call(renderScatterplot, data, word)
  }, [year, topic, word])


  return (
    <div className="container">
      <div className="header">
        <div className="form-item">
          <span>年份:</span>
          <FormControl sx={{ m: 1, width: 250 }} size="small">
            <InputLabel id="demo-multiple-name-label">Year</InputLabel>
            <Select
              multiple
              value={year}
              onChange={handleYearChange}
              input={<OutlinedInput label="Year" />}
            >
              {years.sort((a, b) => a - b).map((year) => (
                <MenuItem
                  key={year}
                  value={year}

                >
                  {year}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>
        <div className="form-item">
          <span>Topic:</span>
          <FormControl sx={{ m: 1, width: 250 }} size="small">
            <InputLabel id="demo-multiple-name-label">Topic</InputLabel>
            <Select
              multiple
              value={topic}
              onChange={handleTopicChange}
              input={<OutlinedInput label="Topic" />}
            >
              {topics.map((topic) => (
                <MenuItem
                  key={topic}
                  value={topic}
                >
                  {topic}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>
        <div className="form-item">

        </div>
      </div>
      <div className="container-body">
        <div className="container-left">
          <div ref={scatterplotDom} style={{ width: "800px" }}>
            <Button variant="contained" href="#contained-buttons">
              开始拾取
            </Button>
          </div>
        </div>
        <div className="container-right" style={{ width: "400px", borderLeft: '1px solid #e0e0e0' }}>
            <h3>
              起始时间：{rightData.min} -- {rightData.max} 
            </h3>
            <ul>
              {
                rightData.data.map((item,index) => {
                  return <li className={word.includes(item) ? 'active' : ''} onClick={(e) => {
                    const w = e.target.innerHTML
                    
                    if(word.includes(w)){
                     
                      const i = word.findIndex(item => item == w)
                      word.splice(i,1)
                    }else{
                      word.push(item)
                    }

                    setWord(JSON.parse(JSON.stringify(word)))
                    
                  }} key={index}>{item}</li>
                })
              }
            </ul>
        </div>
      </div>
    </div>
  )
};

export default Scatterplot;
