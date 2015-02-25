/*jslint browser: true*/
/*jslint nomen: true*/
/*global $, jQuery, alert, net, d3, _*/
// box dimensions and margins
var width = 900;
var height = 800;
var margin = {
    top: 90,
    right: 0,
    bottom: 0,
    left: 200
};

var fx = 'scrollLeft';
$(function () {
    $('#cycle').cycle({
        fx:     fx,
        speed:  300,
        next:   '#cycle',
        timeout: 0
    });
});

var pdata = [];
var pdata_sel_id = 0; //id of the selected point

var scalef = 550; // how much we need to scale the points inside of the
                  // selection hex
var r = 4.7;
var sq = Math.sqrt(3) * 0.5;
var rh = r * 0.5;
var pbox = {x: -20, y: 250};

var colors = ['#700080', '#830094', '#4d00a0', '#0000b1', '#0000d5', '#0041dd',
         '#0082dd', '#009adb', '#00a6b7', '#00aa9b', '#00a773', '#009a08',
         '#00af00', '#00c700', '#00df00', '#00fa00', '#67ff00', '#c8fb00',
         '#ecef00', '#f9d700', '#ffb500', '#ff8100', '#ff1500', '#ec0000',
         '#d80000', '#cc0c0c'];

var llecolors = ['#000000', '#000000', '#ff0000', '#ff0000', '#0000ff',
                 '#0000ff', '#008000', '#008000', '#ff1493', '#ff1493',
                 '#ffff00', '#ffff00', '#87ceeb', '#87ceeb', '#00ffff',
                 '#00ffff', '#b22222', '#b22222', '#00ff00', '#00ff00',
                 '#ffd700', '#ffd700', '#ff7f50', '#ff7f50', '#a52a2a',
                 '#a52a2a'];

var llelabels = ['n', 'o', 't', 'e', 'b', 'g', 'd', 'a', 'h', 'p', 'c', 'w', 'u'];

var Color = net.brehaut.Color;

var color_scale = d3.scale.linear()
        .domain(_.range(0, 27, 1))
        .range(colors);
var par_color_scale = d3.scale.linear()
        .domain(_.range(0, 27, 1))
        .range(colors);

var seldict = { 0: "teff", 1: "logg", 2: "met", 3: "rv",
                4: "dist", 5: "jmk", 6: "age", 7: "mass", 8: "lle",
                9: "ewirt", 10: "snr", 11: "qk" };
var plc = 0;

var cursel = 'teff';
var parsel = 'teff';

var cdc = {'teff' : [3500, 8200, 187, ' K'],
           'logg' : [0.0, 5.0, 0.2, ' dex'],
           'met' : [-2.0, 0.3, 0.092, ' dex'],
           'snr' : [15, 80, 2.6, ''],
           'den' : [0.0, 1.0, 0.04, ''],
           'rv' : [-75, 75, 6.0, ' km/s'],
           'dist' : [0.0, 4.0, 0.16, ' kpc'],
           'lle' : [0, 0, 0, ''],
           'ewirt' : [0, 1.0, 0.04, ' A'],
           'jmk' : [0.1, 1.4, 0.052, ' mag'],
           'qk' : [0.0, 4.0, 0.16, ''],
           'age' : [8.5, 10.2, 0.068, ''],
           'mass' : [0.3, 1.7, 0.056, ' Msun']};

color_scale.domain(_.range(cdc[cursel][0], cdc[cursel][1], cdc[cursel][2]));
par_color_scale.domain(_.range(cdc[parsel][0], cdc[parsel][1], cdc[parsel][2]));

function colorize(cursel, value) {
    if (cursel !== 'lle') {
        if (value > cdc[cursel][1]) { return color_scale(cdc[cursel][1]); }
        if (value < cdc[cursel][0]) { return color_scale(cdc[cursel][0]); }
        return color_scale(value);
    }
    return value;
}

function par_colorize(parsel, value, haz_pars) {
    if (parsel !== 'lle') {
        if (haz_pars) {
            if (value > cdc[parsel][1]) { return par_color_scale(cdc[parsel][1]); }
            if (value < cdc[parsel][0]) { return par_color_scale(cdc[parsel][0]); }
            return par_color_scale(value);
        }
        return '#000000';
    }
    return value;
}

// Spectra axis
var xss = d3.scale.linear().range([(pbox.x - 10), 700]);
var yss = d3.scale.linear().range([800, 650]);

var line = d3.svg.line()
    .x(function (d) { return xss(d.wl); })
    .y(function (d) { return yss(d.flux); })
    .interpolate("basis");

xss.domain([8400, 8800]);
yss.domain([0, 1.4]);

// D3 SVG object
var svg = d3.select("body")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

// Elements
var body = d3.select("body");
var div = body.append("div")
    .attr("class", "pardiv")
    .attr("id", "cycle")
    .html("<div class='noselect'>Temperature</div>\
<div class='noselect'>&nbsp&nbsp&nbsp&nbsp&nbsp&nbspGravity</div>\
<div class='noselect'>&nbsp&nbsp&nbspMetallicity</div>\
<div class='noselect'>&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbspRV</div>\
<div class='noselect'>&nbsp&nbsp&nbsp&nbspDistance</div>\
<div class='noselect'>&nbsp&nbsp2MASS J-K</div>\
<div class='noselect'>&nbsp&nbsp&nbsp&nbsp&nbspLog age</div>\
<div class='noselect'>&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbspMass</div>\
<div class='noselect'>&nbsp&nbsp&nbsp&nbspLLE Flag</div>\
<div class='noselect'>&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbspEWirt</div>\
<div class='noselect'>&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbspS/N</div>\
<div class='noselect'>&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbspQK</div>")

// Hexgon frame and icons
function hexagon_points(x, y, r) {
    var sq = Math.sqrt(3) * 0.5;
    var rh = 0.5 * r;

    return [x, y-r, x+r*sq, y-rh, x+r*sq, y+rh, x, y+r, x-r*sq, y+rh, x-r*sq, y-rh];
}

var points_box1 = hexagon_points(pbox.x, pbox.y, 140)
var points_box2 = hexagon_points(pbox.x, pbox.y, 137)
var points_dashed = [hexagon_points(pbox.x, pbox.y, 100),
                     hexagon_points(pbox.x, pbox.y, 50)]

svg.selectAll("#plotbox")
    .data(points_dashed)
    .enter().append("polygon")
    .attr("points", function(d, i) { return points_dashed[i]; })
    .style("fill-opacity", 0)
    .style("stroke", "#aaaaaa")
    .style("stroke-width", 0.5)
    .style("stroke-dasharray", ("3, 3"))
    .attr("class", "plotbox_lines");

svg.selectAll("#plotbox")
    .data(points_box1)
    .enter().append("polygon")
    .attr("points", points_box1)
    .style("fill-opacity", 0)
    .style("stroke", "#999999")
    .style("stroke-width", 3)
    .attr("class", "plotbox_edge");

svg.selectAll("#plotbox")
    .data(points_box2)
    .enter().append("polygon")
    .attr("points", points_box2)
    .style("fill-opacity", 0.005)
    .style("stroke", "#333333")
    .attr("class", "plotbox");

svg.append("svg:image")
    .attr('x',(pbox.x+65))
    .attr('y',(pbox.y-125))
    .attr('width', 16)
    .attr('height', 16)
    .attr("xlink:href","zoom_in_icon.png")
    .attr("class", "zoom_icon");

svg.append("svg:image")
    .attr('x',(pbox.x-85))
    .attr('y',(pbox.y-125))
    .attr('width', 16)
    .attr('height', 16)
    .attr('opacity', 0.0)
    .attr("xlink:href","square_icon.png")
    .attr("class", "square_icon");

svg.append("a")
    .attr("class", "vizier_link")
    .append("svg:image")
    .attr('x',105)
    .attr('y',89)
    .attr('width', 50)
    .attr('height', 16)
    .attr('opacity', 0.0)
    .attr("xlink:href","vizier_icon.png")
    .attr("class", "vizier_icon");

// COLOR BAR
var cbarpoints = [];
for (var i = 0; i < 26; i++) {
  var rxcen = -98 + 6 * i;
  cbarpoints.push([rxcen -3, 68, rxcen - 3, 78, rxcen + 3, 78, rxcen + 3, 68])
}

svg.selectAll("#colorbar")
    .data(_.range(cdc[cursel][0], cdc[cursel][1], cdc[cursel][2]))
    .enter().append("polygon")
    .attr("points", function(d, i) {return cbarpoints[i]; })
    .style("fill", function(d, i) {return colorize(cursel, d); })
    .style("fill-opacity",0.8)
    .attr("class", "colorbar");

svg.selectAll("#colorbarlabelllelabels")
    .data(_.range(0, 26, 2))
    .enter().append("text")
    .attr("transform", function(d, i) {return "translate(" + (cbarpoints[2*i][0] + 2.5) + "," + (cbarpoints[2*i][1] - 2) + ")";})
    .style("fill", "#444444")
    .style("fill-opacity", 0.0)
    .text(function(d, i) {return llelabels[i];})
    .attr("class", "colorbarlabelllelabels");

svg.append("text")
    .attr("x",-147)
    .attr("y", 78)
    .style("fill", "#444444")
    .text(cdc[cursel][0] + cdc[cursel][3])
    .attr("class", "colorbarlabelleft");

svg.append("text")
    .attr("x", 59)
    .attr("y", 78)
    .style("fill", "#444444")
    .text(cdc[cursel][1] + cdc[cursel][3])
    .attr("class", "colorbarlabelright");

svg.append("text")
    .attr("x", -96)
    .attr("y", 58)
    .style("fill", "#444444")
    .attr("class", "selectedhex");

// Missing circle
svg.append("circle")
    .attr("transform", "translate(" + (-63) + "," + (92) + ")")
    .attr("r", 3.5)
    .style("fill", "#000000")
    .style("fill-opacity", 0.5)
    .style("stroke", "#000000")

svg.append("text")
    .attr("x", -53)
    .attr("y", 96)
    .style("fill", "#000000")
    .text("not part of DR4");

// LEGEND
function click_parameter_keyword() {
    plc += 1;
    if (plc > 11) plc = 0;
    parsel = seldict[plc]

    par_color_scale.domain(_.range(0, 27, 1))
    if (parsel == 'lle') {
        svg.selectAll(".colorbar")
            .style("fill", function(d, i) {return llecolors[i];})
        svg.selectAll(".colorbarlabelllelabels")
            .style("fill-opacity", 1.0)
    }
    else {
        svg.selectAll(".colorbar")
            .style("fill", function(d, i) {return par_color_scale(i);})
        svg.selectAll(".colorbarlabelllelabels")
            .style("fill-opacity", 0.0)
    }

    par_color_scale.domain(_.range(cdc[parsel][0], cdc[parsel][1], cdc[parsel][2]))

    svg.selectAll(".plot")
        .transition()
        .ease("quad")
		    .duration(200)
        .style("fill", function(d) {return par_colorize(parsel, d[parsel], d.haz_pars);})
        .style("stroke", function(d) {return d3.rgb(par_colorize(parsel, d[parsel], d.haz_pars)).darker(1);});


    if (cdc[parsel][1] < 15.0) var tofixed =  1;
    else if (parsel == 'qk') tofixed = 0
    else var tofixed = 0;
    if (parsel != 'lle') var lstr = cdc[parsel][0].toFixed(tofixed) + cdc[parsel][3];
    else var lstr = '';
    svg.selectAll(".colorbarlabelleft")
        .text(lstr)
        .attr("x", -114 - 5 * lstr.length)
    if (parsel != 'lle') var rstr = cdc[parsel][1].toFixed(tofixed) + cdc[parsel][3];
    else var rstr = '';
    svg.selectAll(".colorbarlabelright")
        .text(rstr)
        .attr("x", 62)
};

d3.selectAll(".pardiv")
    .on("click", click_parameter_keyword);

// Gravity circles
svg.append("circle")
    .attr("transform", "translate(" + (pbox.x-40) + "," + (pbox.y+170) + ")")
    .attr("r", 8)
    .style("fill", "#aaaaaa")

svg.append("circle")
    .attr("transform", "translate(" + (pbox.x+35) + "," + (pbox.y+171) + ")")
    .attr("r", 3)
    .style("fill", "#aaaaaa")

svg.append("text")
    .attr("x", (pbox.x-18))
    .attr("y", (pbox.y+175))
    .style("fill", "#444444")
    .text("Gravity");

// S/N circles
svg.append("circle")
    .attr("transform", "translate(" + (pbox.x-35) + "," + (pbox.y+195) + ")")
    .attr("r", 5)
    .style("fill", "#333333")

svg.append("circle")
    .attr("transform", "translate(" + (pbox.x+30) + "," + (pbox.y+196) + ")")
    .attr("r", 5)
    .style("fill", "#000000")
    .style("fill-opacity", 0.1)
    .style("stroke", "#999999")

svg.append("text")
    .attr("x", (pbox.x-12))
    .attr("y", (pbox.y+200))
    .style("fill", "#444444")
    .text("S/N");

// Parameter circles
var ccoordsx = [-100, -85, -70, -55, 50, 65, 80, 95];
var ccolors = ["#db0000", "#ff0900", "#ffbd00", "#dcf400", "#00cf00", "#009cd3", "#0d00a8", "#860097"];
for (var i = 0; i < 8; i += 1) {
  svg.append("circle")
    .attr("transform", "translate(" + (pbox.x+ccoordsx[i]) + "," + (pbox.y+215) + ")")
    .attr("r", 5)
    .style("fill", ccolors[i]);
  }


d3.selectAll("#color-selection input[name=color]").on('change', function(){
    cursel = this.value;
    var nc;
    if (cursel == 'none') {
      nc = hdata.map(function(d){ return ["#666666"]; });
      svg.selectAll(".colorbarlabelleft")
        .text('')
      svg.selectAll(".colorbarlabelright")
        .text('')
    }
    else {
      color_scale.domain(_.range(cdc[cursel][0], cdc[cursel][1], cdc[cursel][2]));
      nc = hdata.map(function(d){ return colorize(cursel, d[cursel]); });
    }
    svg.selectAll(".chart")
		    .style("fill", function(d, i) { return nc[i]; });

});

// PARAMETER TABLE
// RAVEID, RAVE name, SIMBAD, VIZIER
// teff    dist     flags
// logg    2mass    ewirt
// met     age      s/n
// RV      mass     qk
var table = body.append("table")
    .html('<col width="70px" /><col width="200px" />')
    .attr("class", "partable")
    // <col width="40px" />
table.append("tr").html("<td>RAVEID</td><td id='ptraveid'></td>");
table.append("tr").html("<td>RAVE Name</td><td id='ptravename'></td>");
table.append("tr").html("<td></td><td id='ptlinks'></td>")
////////////////////////////////////////////////////////////////////////////////
// ZOOM & SQUARIFY

var zoomed_in = false;
var squarified = false;
var dur = 600;

function click_move_chart() {
    if (zoomed_in) {
      var tr = 0;
      }
    else {
      var tr = 750;
    }

    svg.selectAll(".chart")
        .transition()
        .ease("sin")
        .duration(dur)
        .attr("transform", "translate(" + tr + ", 0)");
    svg.selectAll(".bighex")
        .transition()
        .ease("sin")
        .duration(dur)
        .attr("transform", "translate(" + tr + ", 0)");
};

function click_zoom_hex() {

    if (zoomed_in) {
        var points_box1 = hexagon_points(pbox.x, pbox.y, 140)
        var points_box2 = hexagon_points(pbox.x, pbox.y, 137)
        var points_dashed = [hexagon_points(pbox.x, pbox.y, 100),
                             hexagon_points(pbox.x, pbox.y, 50)]
        var pt = [1.0, 0, 1.0, 0]
        var icon_coords = [45, pbox.y-125]
        var icon_coords_square = [-105, pbox.y-125]
        var icon_alpha = 0.0;
        var icon = "zoom_in_icon.png"
    }
    else {
        var points_box1 = hexagon_points(420, 300, 300)
        var points_box2 = hexagon_points(420, 300, 297)
        var points_dashed = [hexagon_points(420, 300, 200),
                             hexagon_points(420, 300, 100)]
        var pt = [2.25, 468, 2.25, 360]
        var icon_coords = [555, 55]
        var icon_coords_square = [260, 55]
        var icon_alpha = 1.0;
        var icon = "zoom_out_icon.png";
    }

    pdata.map(function(d) {d['xz'] = d.x * pt[0] + pt[1]; d['yz'] = d.y * pt[2] - pt[3]});

    svg.selectAll(".plot")
        .transition()
        .ease("sin")
        .duration(dur)
        .attr("transform", function(d) { return "translate(" + [d['xz'], 498 - d['yz']]+ ")"; });

    svg.selectAll(".marked_point")
        .transition()
        .ease("sin")
        .duration(dur)
        .attr("transform", function(d) { return "translate(" + [d['xz'], 498 - d['yz']] + ")"; });

    svg.selectAll(".zoom_icon")
        .transition()
        .ease("sin")
        .duration(dur)
        .attr('x', icon_coords[0])
        .attr('y', icon_coords[1])
        .attr("xlink:href",icon);

    svg.selectAll(".square_icon")
        .transition()
        .ease("sin")
        .duration(dur)
        .attr('opacity', icon_alpha)
        .attr('x', icon_coords_square[0])
        .attr('y', icon_coords_square[1]);

    svg.selectAll(".plotbox_edge")
        .transition()
        .ease("sin")
        .duration(dur)
        .attr("points", points_box1);

    svg.selectAll(".plotbox")
        .transition()
        .ease("sin")
        .duration(dur)
        .attr("points", points_box2);

    svg.selectAll(".plotbox_lines")
        .transition()
        .ease("sin")
        .duration(dur)
        .attr("points", function(d, i) { return points_dashed[i]; })
};

function click_zoom() {
    click_move_chart();
    click_zoom_hex();
    zoomed_in = !zoomed_in;
    squarified = false;
}

d3.selectAll(".zoom_icon")
    .on("click", click_zoom);

function click_squarify() {
    try { pdata.length; }
    catch(err) {return;}

    if (!zoomed_in) {return;}

    var temp = []
    for (var k = 0; k < pdata.length; k++){
      temp.push({'size':pdata[k]['size'], 'pval':pdata[k][parsel], 'sel:id':k});
    }

    var packsize = Math.sqrt(pdata.length) * 18;
    var pack = d3.layout.pack()
        .size([packsize, packsize])
        .sort(function(a, b) {if (parsel != 'lle') return a.pval - b.pval; else return Color(a.pval).getLightness() - Color(b.pval).getLightness();})
        .radius(function(d) {return d;})
        .padding(3) // padding between adjacent circles
        .value(function(d) {return d['size'];});

    nodes = pack.nodes({children: temp})
    var pt = [2.25, 468, 2.25, 360, 498];
    for (var k = 0; k < pdata.length; k++){
          pdata[k]['xc'] = (nodes[k + 1].x - packsize * 0.5 + 420);// * pt[0] + pt[1];
          pdata[k]['yc'] = (nodes[k + 1].y - packsize * 0.5 + 200);// * pt[2] - pt[3];
          pdata[k]['sel_id'] = k;
    }

    if (squarified) {
      squarified = false;
      coo = ['xz', 'yz']
    }
    else {
      squarified = true;
      coo = ['xc', 'yc']
    }
    svg.selectAll(".plot")
        .transition()
        .ease("quad")
		    .duration(600)
        .attr("transform", function(d) { return "translate(" + [d[coo[0]], 498 - d[coo[1]]] + ")"; });

    svg.selectAll(".marked_point")
        .transition()
        .ease("sin")
        .duration(600)
        .attr("transform", function(d) { return "translate(" + [d[coo[0]], 498 - d[coo[1]]] + ")"; });
}

d3.selectAll(".square_icon")
    .on("click", click_squarify);


// FUNCTIONS
d3.selection.prototype.moveToFront = function() {
    return this.each(function(){
		    this.parentNode.appendChild(this);
    });
}

function next_prev(keyid) {
  if (pdata.length){
    if (keyid == 78) {
      pdata_sel_id += 1;
      if (pdata_sel_id > pdata.length - 1) pdata_sel_id = 0;
      mclick_hex(pdata[pdata_sel_id]);
    }
    if (keyid == 80) {
      pdata_sel_id -= 1;
      if (pdata_sel_id < 0) pdata_sel_id = pdata.length - 1;
      mclick_hex(pdata[pdata_sel_id]);
    }
  }
}

d3.select("body")
    .on("keydown", function() {next_prev(d3.event.which);} )

function mover(d) {
    d3.select(this)
		  .transition()
      .ease("sin")
    	.duration(50)
  		.style("stroke", d3.rgb(colorize(cursel, d[cursel])).darker(1))
  		.style("stroke-width", 2);

    // d3.selectAll(".bighex")
      // .moveToFront();
}

function mout(d) {

	d3.select(this)
		.transition()
		.ease("sin")
		.duration(100)
		.attr("points", d['coords'])
		.style("stroke-width", 0);
};

function mover_hex(d) {
    d3.select(this)
      .style("opacity", 0.5);
};

function mout_hex(d) {
	d3.select(this)
        .style("opacity", 1);
};

function mclick(d, j) {
    svg.selectAll(".bighex").remove();
    svg.selectAll(".marked_point").remove();
    pdata_sel_id = 0;
    svg.selectAll(".line").remove()

    var points = hexagon_points(d['x'], d['y'], r * 2.2)
    svg.selectAll("bighex")
		    .data(points)
        .moveToFront()
	      .enter().append("polygon")
		    .attr("points", points)
        .style("fill", "white")
        .style("stroke", d3.rgb(colorize(cursel, d[cursel])).darker(1))
		    .style("stroke-width", 1)
        .attr("class", "bighex");

    points = hexagon_points(d['x'], d['y'], r * 1.5);
    svg.selectAll("bighex")
		    .data(points)
        .moveToFront()
	      .enter().append("polygon")
		    .attr("points", points)
        .style("fill", colorize(cursel, d[cursel]))
		    .style("stroke-width", 1.5)
        .attr("class", "bighex");

    svg.selectAll(".plot")
        .remove();

    body.select('#ptraveid').html('');
    body.select('#ptravename').html('');
    body.select('#ptlinks').html('');

    d3.json("fields/field" + j + ".json", function(error, json) {
        if (error) return console.warn(error);
        pdata = json;

        for (var i = 0; i < pdata.length; i++) {
          pdata[i]['x'] = pdata[i]['x'] * scalef + pbox.x - 1;
          pdata[i]['y'] = pdata[i]['y'] * scalef + pbox.y - 1;
        }

        svg.selectAll("#plot")
          .data(pdata)
          .enter().append("circle")
          .attr("transform", function(d) {return "translate(" + [d['x'], 498 - d['y']] + ")"; })
          .attr("r",  function(d) {return d['size'];})
          .style("fill", function(d) {return par_colorize(parsel, d[parsel], d.haz_pars);})
          .style("fill-opacity",  function(d) {return d['opacity'];})
          .style("stroke", function(d) {return d3.rgb(par_colorize(parsel, d[parsel], d.haz_pars)).darker(1);})
          .attr("class", "plot")
          .on("mouseover", mover_hex)
          .on("mouseout", mout_hex)
          .on("click", mclick_hex);

        if (pdata.length == 1) { nrs = ''; }
        else {nrs = 's';}

        body.select('.selectedhex').text('Hex ID: ' + j + ' (' + pdata.length + ' object' + nrs + ')');
    });

    d3.json("fields/avgspectrum" + j + ".json", function(error, json) {
        if (error) return console.warn(error);
        sdata = json;

        var spec = [];
        for (var i = 0; i < sdata.wl.length; i++) {
            spec.push({"wl":sdata.wl[i],"flux":sdata.flux[i] + sdata.std[i]});
        }
        for (var i = sdata.wl.length - 1; i >= 0; i--) {
            spec.push({"wl":sdata.wl[i],"flux":sdata.flux[i] - sdata.std[i]});
        }

        svg.selectAll(".linespec")
            .remove();

        svg.append("path")
            .datum(spec)
            .attr("class", "linespec")
            .attr("d", line)
            .style("stroke", "black")
            .style("opacity", 0.2);
    });
}

function mclick_hex(d) {

    svg.selectAll(".marked_point").remove();
    if (squarified) var coo = ['xc', 'yc'];
    else if (zoomed_in) var coo = ['xz', 'yz'];
    else var coo = ['x', 'y'];
    svg.append("circle")
      .datum(d)
      .attr("transform", "translate(" + d[coo[0]] + "," + (498 - d[coo[1]]) + ")")
      .attr("r", d.size)
      .style("fill-opacity", 0.0)
      .style("stroke", "#ff0000")
      .style("stroke-width", 3)
      .attr("class", "marked_point");
    pdata_sel_id = d.sel_id;

    var obsdata = d.id.split('_');
    var filename = obsdata[0] + '/' + obsdata[1] + '.rvsun.' + obsdata[2] + '.cont.vrcor.txt';
    d3.text("RAVE_DATA/" + filename, function(text) {
      if (text == null){
        svg.selectAll(".line")
          .remove();
    };

    var spec = [];
    d3.tsv.parseRows(text).map(function(row) {
        ln = row[0].split("  ");
        spec.push({"wl":+ln[0],"flux":+ln[1]});
    });

    svg.selectAll(".line")
        .remove()

    svg.append("path")
      .datum(spec)
      .attr("class", "line")
      .attr("d", line)
      .style("stroke", "black")
      .style("fill", "none");
    });

    // Parameters tablei
    var raveid = d.id.split('_');
    var obsdate = raveid[0];
    var field = raveid[1];
    var fiber = raveid[2];
    var obsdatep = obsdate.slice(0,4) + ':' + obsdate.slice(4,6) + ':' + obsdate.slice(6,8);

    var vstr = 'http://vizier.u-strasbg.fr/viz-bin/VizieR?-source=III/272/ravedr4&Field=' +
               field + '&Obsdate=' + obsdatep + '&Fiber=' + fiber +
               '&-out=Name,RAVE,Obsdate,Field,Fiber,Jmag2,Kmag2,HRV,TeffK,loggK,c[M/H]K,SNRK,Dist,c1,c2,c3';

    var sstr = 'http://simbad.u-strasbg.fr/simbad/sim-id?Ident=RAVE+'+ d.rave +'&NbIdent=1&Radius=2&Radius.unit=arcmin&submit=submit+id'

    body.select('#ptraveid').html(d.id);
    body.select('#ptravename').html(d.rave);
    body.select('#ptlinks').html('<a href="' + vstr + '" target=_blank>Vizier</a>&nbsp&nbsp&nbsp<a href="' + sstr + '" target=_blank>Simbad</a>');
};

d3.json("tsne.json", function(error, json) {
    if (error) return console.warn(error);
    hdata = json;

    for (var i = 0; i < hdata.length; i++){
      var d = hdata[i];
      hdata[i]['coords'] = [ +d["x"], +d["y"]-r, +d["x"] + r*sq, +d["y"]-rh,
               +d["x"]+r*sq, +d["y"]+rh, +d["x"], +d["y"]+r,
               +d["x"]-r*sq, +d["y"]+rh, +d["x"]-r*sq, +d["y"]-rh ];
    }

    var hcolor = hdata.map(function(d) { return colorize(cursel, d[cursel]);});
    var hopacity = hdata.map(function(d) { return d["den"];});

    svg.selectAll("#chart")
        .data(hdata)
    	  .enter().append("polygon")
    		.attr("points", function(d, i) { return hdata[i]['coords']; })
    		.style("fill", function(d, i) { return hcolor[i]; })
    		.style("fill-opacity", function(d, i) { return hopacity[i]; })
        .attr("stroke-width", 0)
        .attr("class", "chart")
    		.on("mouseover", mover)
    		.on("mouseout", mout)
    		.on("click", mclick);
});
