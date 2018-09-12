$.get('https://unpkg.com/enigma.js@2.2.0/schemas/12.34.11.json')
  .then(schema => {
    const session = enigma.create({
      schema,
      url: 'wss://branch.qlik.com/anon/app/3f3a866b-238f-4d1a-8aeb-81e97756af7a',
      createSocket: url => new WebSocket(url)
    });
    session.open()
      .then(global => {
        return global.openDoc('3f3a866b-238f-4d1a-8aeb-81e97756af7a')
      })
      .then(app => {
        app.getAppLayout().then(() =>{
          var width = document.querySelector("#chart2").clientWidth
          var height = document.querySelector("#chart2").clientHeight
          var param={
            qSyntheticMode:true,
            qWindowSize:{
              qcx:width,
              qcy:height
            },
            qCellHeight:20
          }
          // console.log(app)
          app.getTablesAndKeys(param).then((result)=>{
            var keyToColorDic = [];
            for(var i=0; i<result.qtr.length; i++){
              keyToColorDic[result.qtr[i].qName] = [];
            }
            for(var i=0; i<result.qk.length; i++){
              var tempColor = getRandomColor();
              for(var j=0; j<result.qk[i].qTables.length; j++){
                keyToColorDic[result.qk[i].qTables[j]][result.qk[i].qKeyFields[0]]=tempColor;
              }
            }
            drawModelViewer(keyToColorDic,result)
            drawTableViewer(result,app)
          })
      })
  })
})

function getRandomColor() {
  var letters = '0123456789ABCDEF';
  var color = '#';
  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

function drawTableViewer(data,app)
{
  function checkIsKey(tableName,fieldName)
  {
    var isKey = false;
    for (var i =0; i<data.qk.length; i++){
      if(data.qk[i].qKeyFields.indexOf(fieldName)>=0){
          if(data.qk[i].qTables.indexOf(tableName)>=0)
            isKey = true;
      }
    }
    return isKey
  }
  var tempArr = []
  var tempKeyArr= []
  for (var i =0; i<data.qtr.length; i++){
    for(var j =0; j< data.qtr[i].qFields.length; j++){
     var tempIsKey = checkIsKey(data.qtr[i].qName, data.qtr[i].qFields[j].qName);
      if(tempIsKey == false)
        tempArr.push(data.qtr[i].qFields[j].qName)
    }
  }
  for (var i =0; i<data.qk.length; i++){
    for(var j =0; j< data.qk[i].qKeyFields.length; j++){
     tempKeyArr.push(data.qk[i].qKeyFields[j])
    }
  }
  
  const properties = {
    qInfo: {
      qType: 'table-data'
    },
    qHyperCubeDef: {
      qDimensions: [],
      qInitialDataFetch: [{
        qHeight: 20,
        qWidth: 100
      }],
    },
  };
  tempKeyArr.forEach(function(temp){
    properties.qHyperCubeDef.qDimensions.push({qDef:{qFieldDefs:[temp]}})
  })
  tempArr.forEach(function(temp){
    properties.qHyperCubeDef.qDimensions.push({qDef:{qFieldDefs:[temp]}})
  })
  app.createSessionObject(properties).then(object => {
    object.getLayout().then(layout => {
      var tableText = "<table>"
      
      tableText += "<tr>"
      layout.qHyperCube.qDimensionInfo.forEach(function(dim){
  tableText +="<th>"+dim.qFallbackTitle+"</th>"
 })
      tableText+="</tr>"
      
      layout.qHyperCube.qDataPages[0].qMatrix.forEach(function(elem){
        tableText += "<tr>"
        elem.forEach(function(field){
          tableText +="<th>"+field.qText+"</th>"
        })
        tableText += "</tr>"      
 })
      
      
      tableText += "</table>"
      $("#chart1").append(tableText);
    })
  });
  
}

function drawModelViewer(keyToColorDic,data)
{
  var width = document.querySelector("#chart2").clientWidth
  var height = document.querySelector("#chart2").clientHeight
  var margin = {top:10, left:10, bottom:10, right:10 }
  var chartWidth = width - (margin.left+margin.right)
  var chartHeight = height - (margin.top+margin.bottom)

  var svg = d3.select("#chart2").append("svg")
  var chartLayer = svg.append("g").classed("chartLayer", true)   

  svg.attr("width", width)
    .attr("height", height)
  
  var nodes = data.qtr
  tempNodes = []
  for (var i=0;i<nodes.length;i++){
    var longest = "";
    for (var j=0;j<nodes[i].qFields.length;j++)
      if (longest.length<nodes[i].qFields[j].qName.length)
        longest=nodes[i].qFields[j].qName
    tempNodes.push({
      width : longest.length*9+10,
      height : (nodes[i].qFields.length+2)*20,
      qFields : nodes[i].qFields,
      qPos : nodes[i].qPos,
      x:nodes[i].qPos.qx,
      y:nodes[i].qPos.qy,
      qName : nodes[i].qName,
      index : i*10
     })
  }
  nodes = tempNodes

  var links = []
  for(var i=0; i<data.qk.length; i++){
    for(var j=1; j<data.qk[i].qTables.length;j++)
    {
      links.push({
        source :data.qk[i].qTables[j-1],
        target:data.qk[i].qTables[j],
        color:keyToColorDic[data.qk[i].qTables[j]][data.qk[i].qKeyFields],
        key:data.qk[i].qKeyFields
      })
    }
  }

  var simulation = d3.forceSimulation()
    .force("link", d3.forceLink().id(function(d) { return d.qName; }))
    .force('charge', d3.forceManyBody().strength(-15))
    .force("center", d3.forceCenter().x(width * .5).y(height * .5))
  

  var link = svg.append("g")
              .selectAll("line")
              .data(links)
              .enter().append("line")
                .attr('stroke', function(d) { return d.color; })
                .attr('stroke-width', 4);
  
  var linkpaths = svg.selectAll(".linkpath")
            .data(links)
            .enter()
            .append('path')
            .attr('class', "linkpath")
            .attr('id', function(d,i) {return 'linkpath'+i})
            .attr('fill-opacity', 0)
            .attr('stroke-opacity', 0)
            .style("pointer-events", "none");
  
  var linklabel = svg.selectAll(".linklabel")
      .data(links)
      .enter()
      .append('text')
      .style("pointer-events", "none")
      .attr("class","linklabel")
      .attr("id",function(d,i){return 'linklabel'+i})
      .attr("dx",100)
      .attr("dy",0)
      .attr("font-size",15)
      // .attr("fill","#aaa")
  
  linklabel.append('textPath')
      .attr('xlink:href',function(d,i) {return '#linkpath'+i})
      .style("pointer-events", "none")
      .text(function(d,i){return d.key});
  
  var node = svg.selectAll(".node")
    .data(nodes)
    .enter().append("g")
      .attr("class", "node")
    .call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));;
  
  rect=node.append("rect")
    .attr("width", function(d) { return d.width; })
    .attr("height", function(d) { return d.height;})
    .style("fill", "#FFFFFF")
  
 label=node.append("text")
          .attr("class", "label")
          .text(function(d) { return d.qName; })
          .style("font-size","14px")
          .style("font-weight","bold");
  
  tableContent=node.append("g")
          .attr("class","tableContent")
          .attr("id",function(d){return d.qName+"-table"});
  
  for(var i=0; i<nodes.length; i++){
    var tempTable = d3.select("#"+nodes[i].qName+"-table")
    for(var j=0; j<nodes[i].qFields.length;j++){
      var tempName = nodes[i].qFields[j].qName
      var textDecor = "none"
      if(keyToColorDic[nodes[i].qName][tempName]){
        tempName=tempName+"&#128273;"
        textDecor = "underline"
      }
        
      tempTable.append("text")
        .attr("id",nodes[i].qName+"-tablecol-"+j)
        .html(tempName)
          .style("font-size","12px")
          .style("fill", keyToColorDic[nodes[i].qName][nodes[i].qFields[j].qName])
          .style("font-weight","bold")
          .style("text-decoration",textDecor);
    }
  }
              
  simulation.nodes(nodes)
        .force("collide", d3.forceCollide().strength(.5).radius(function(d){ return d.width; }))
        .on("tick", ticked);

  simulation.force("link")
        .links(links);
  
  function ticked() {
      link
          .attr("x1", function(d) { return d.source.x; })
          .attr("y1", function(d) { return d.source.y; })
          .attr("x2", function(d) { return d.target.x; })
          .attr("y2", function(d) { return d.target.y; });
      rect
           .style("fill", "#FFFFFF")
           .style("stroke", "#424242")
           .attr("x", function (d) { return d.x-d.width/2; })
           .attr("y", function(d) { return d.y-d.height/2; });
      label
        .attr("x", function(d) { return d.x-d.width/2; })
        .attr("y", function (d) { return d.y-d.height/2; });
    
      tableContent
        .attr("x", function(d) { return d.x-d.width/2+10; })
        .attr("y", function (d) { return d.y-d.height/2+20; });
    
      linkpaths.attr('d', function (d) {
              return 'M ' + d.source.x + ' ' + d.source.y + ' L ' + d.target.x + ' ' + d.target.y;
          });
    
      linklabel
        .attr('transform',function(d,i){
          if (d.target.x<d.source.x){
              bbox = this.getBBox();
              rx = bbox.x+bbox.width/2;
              ry = bbox.y+bbox.height/2;
              return 'rotate(180 '+rx+' '+ry+')';
          }
          else {return 'rotate(0)';}
        })
        .attr("dx",function(d,i){
          bbox = d3.select('#linkpath'+i).node().getBBox()
          // return Math.sqrt(bbox.width*bbox.width+bbox.height*bbox.height)/2
          return bbox.width/2-30;
        });
    
      for(var i=0; i<nodes.length; i++){
          var tempTable = d3.select("#"+nodes[i].qName+"-table")
          var tempX=tempTable.attr("x")
          var tempY=tempTable.attr("y")
          for(var j=0; j<nodes[i].qFields.length;j++){
            d3.select("#"+nodes[i].qName+"-tablecol-"+j)
              .attr("x",tempX)
              .attr("y",parseFloat(tempY)+j*20)
          }
        }
  }

  function dragstarted(d) {
    if (!d3.event.active) simulation.alphaTarget(0.3).restart()
    d.fx = d.x
    d.fy = d.y
    ticked()
  }
  function dragged(d) {
    d.fx = d3.event.x
    d.fy = d3.event.y
    ticked()
  }
  function dragended(d) {
    if (!d3.event.active) simulation.alphaTarget(0.3);
    d.fx = d3.event.x
    d.fy = d3.event.y
    ticked()
  }

}