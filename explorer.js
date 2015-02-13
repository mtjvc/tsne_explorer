// box dimensions and margins
var width = 900;
var height = 800;
var margin = {
    top: 90,
    right: 0,
    bottom: 0,
    left: 200
}

var pbox = {x: -20, y: 350};

var tsne_fn = "tsne_all.csv";
var field_fn = "fields_all/field";
var scalef = 550; // how much we need to scale the points inside of the
                  // selection hex
var r = 4.7;
var sq = Math.sqrt(3) * 0.5;
var rh = r * 0.5;

// parameters dict
var seldict = { "none":1, "teff":2, "logg":3, "met":4, "snr":5, "hrv":6,
                "dist":7, "ewirt":8, "jmk":9, "den":10, "flag":11 };
var cursel = "teff";
var plc = 2; //current color-coded parameter for points plot

// data holders
var currentplotdata;
var pdata;

// Spectra axis
var xss = d3.scale.linear().range([(pbox.x-10), 700]);
var yss = d3.scale.linear().range([800, 650]);

var line = d3.svg.line()
    .x(function(d) { return xss(d.wl); })
    .y(function(d) { return yss(d.flux); })
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
<div class='noselect'>&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbspS/N</div>\
<div class='noselect'>&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbspRV</div>\
<div class='noselect'>&nbsp&nbsp&nbsp&nbspDistance</div>\
<div class='noselect'>&nbsp&nbsp&nbsp&nbspLLE Flag</div>\
<div class='noselect'>&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbspEWirt</div>\
<div class='noselect'>&nbsp&nbsp&nbsp2MASS J-K</div>")

var table = body.append("table")
    .attr("class", "partable")

table.append("tr").html("<td>Hex Ref. Nr.:</td><td class='tableleft' id='tl1'></td>")
table.append("tr").html("<td>Spec ID:</td><td class='tableleft' id='tl3'></td><td class='tableleft' id='vizier'></td>")

// Hexgon frame and icons
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
    .attr('x',45)
    .attr('y',225)
    .attr('width', 16)
    .attr('height', 16)
    .attr("xlink:href","zoom_in_icon.png")
    .attr("class", "zoom_icon");

svg.append("svg:image")
    .attr('x',-105)
    .attr('y',225)
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
        var pt = [1, 0, 1, 0]
        var icon_coords = [45, 225]
        var icon_coords_square = [-105, 225]
        var icon_alpha = 0.0;
        var icon = "zoom_in_icon.png"
    }
    else {
        var points_box1 = hexagon_points(420, 300, 300)
        var points_box2 = hexagon_points(420, 300, 297)
        var points_dashed = [hexagon_points(420, 300, 200),
                             hexagon_points(420, 300, 100)]
        var pt = [2.25, 468, 2.25, 388]
        var icon_coords = [555, 55]
        var icon_coords_square = [260, 55]
        var icon_alpha = 1.0;
        var icon = "zoom_out_icon.png";
    }

    svg.selectAll(".plot")
        .transition()
        .ease("sin")
        .duration(dur)
        .attr("transform", function(d) { return "translate(" +
                                            [d[0] * pt[0] + pt[1],
                                             698 - d[1] * pt[2] +  pt[3]]
                                             + ")"; });

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
}

d3.selectAll(".zoom_icon")
    .on("click", click_zoom);

function click_squarify() {
    try { currentplotdata.length; }
    catch(err) {return;}

    if (!zoomed_in) {return;}

    if (squarified) {
      var didx = 0;
      squarified = false;
      var pt = [2.25, 468, 2.25, 388]
    }
    else {
      var didx = 15;
      squarified = true;
      var pt = [1, 0, 1, 0]
    }
    svg.selectAll(".plot")
        .transition()
        .ease("quad")
		    .duration(600)
        .attr("transform", function(d) { return "translate(" +
                                            [d[didx] * pt[0] + pt[1],
                                             698 - d[didx + 1] * pt[2] +  pt[3]]
                                             + ")"; });
}

d3.selectAll(".square_icon")
    .on("click", click_squarify);
////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////
// LEGEND

function click_parameter_keyword() {
    plc += 1;
    if (plc > 10) plc = 2;

    svg.selectAll(".plot")
        .transition()
        .ease("quad")
		    .duration(200)
        .style("fill", function(d) {return d[plc];})
        .style("stroke", function(d) {return d3.rgb(d[plc]).darker(1);});
};

d3.selectAll(".pardiv")
    .on("click", click_parameter_keyword);

// Gravity circles
svg.append("circle")
    .attr("transform", "translate(" + (pbox.x-40) + "," + 520 + ")")
    .attr("r", 8)
    .style("fill", "#aaaaaa")

svg.append("circle")
    .attr("transform", "translate(" + (pbox.x+35) + "," + 521 + ")")
    .attr("r", 3)
    .style("fill", "#aaaaaa")

svg.append("text")
    .attr("x", (pbox.x-18))
    .attr("y", 525)
    .style("fill", "#444444")
    .text("Gravity");

// S/N circles
svg.append("circle")
    .attr("transform", "translate(" + (pbox.x-35) + "," + 545 + ")")
    .attr("r", 5)
    .style("fill", "#333333")

svg.append("circle")
    .attr("transform", "translate(" + (pbox.x+30) + "," + 546 + ")")
    .attr("r", 5)
    .style("fill", "#000000")
    .style("fill-opacity", 0.1)
    .style("stroke", "#999999")

svg.append("text")
    .attr("x", (pbox.x-12))
    .attr("y", 550)
    .style("fill", "#444444")
    .text("S/N");

// Parameter circles
svg.append("circle")
    .attr("transform", "translate(" + (pbox.x-95) + "," + 565 + ")")
    .attr("r", 5)
    .style("fill", "#db0000")

svg.append("circle")
    .attr("transform", "translate(" + (pbox.x-80) + "," + 565 + ")")
    .attr("r", 5)
    .style("fill", "#ff0900")

svg.append("circle")
    .attr("transform", "translate(" + (pbox.x-65) + "," + 565 + ")")
    .attr("r", 5)
    .style("fill", "#ffbd00")

svg.append("circle")
    .attr("transform", "translate(" + (pbox.x-50) + "," + 565 + ")")
    .attr("r", 5)
    .style("fill", "#dcf400")

svg.append("circle")
    .attr("transform", "translate(" + (pbox.x+45) + "," + 565 + ")")
    .attr("r", 5)
    .style("fill", "#00cf00")

svg.append("circle")
    .attr("transform", "translate(" + (pbox.x+60) + "," + 565 + ")")
    .attr("r", 5)
    .style("fill", "#009cd3")

svg.append("circle")
    .attr("transform", "translate(" + (pbox.x+75) + "," + 565 + ")")
    .attr("r", 5)
    .style("fill", "#0d00a8")

svg.append("circle")
    .attr("transform", "translate(" + (pbox.x+90) + "," + 565 + ")")
    .attr("r", 5)
    .style("fill", "#860097")

////////////////////////////////////////////////////////////////////////////////

d3.selectAll("#color-selection input[name=color]").on('change', function(){
    cursel = this.value;
    var nc;
    if (cursel == 'none') nc = pdata.map(function(d){ return ["#666666"]; });
    else nc = pdata.map(function(d){ return [d[1][seldict[cursel]]]; });
    svg.selectAll(".chart")
		    .style("fill", function(d, i) { return nc[i]; });
});

d3.selection.prototype.moveToFront = function() {
    return this.each(function(){
		    this.parentNode.appendChild(this);
    });
}

function hexagon_points(x, y, r) {
    var sq = Math.sqrt(3) * 0.5;
    var rh = 0.5 * r;

    return [x, y-r, x+r*sq, y-rh, x+r*sq, y+rh, x, y+r, x-r*sq, y+rh, x-r*sq, y-rh];
}


function mover(d) {
    d3.select(this)
		  .transition()
      .ease("sin")
    	.duration(50)
  		.style("stroke", d3.rgb(d[1][seldict[cursel]]).darker(1))
  		.style("stroke-width", 2);

    d3.selectAll(".bighex")
      .moveToFront();
}

function mout(d) {
	d3.select(this)
		.transition()
		.ease("sin")
		.duration(100)
		.attr("points", d[0])
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

function mclick_hex(d) {

    d3.text("RAVE_DATA/" + d[13], function(text) {
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

    var sstr = d[13].split('.');
    var obsdate = sstr[0].split('/')[0];
    var field = sstr[0].split('/')[1];
    var fiber = sstr[2];
    var obsdatep = obsdate.slice(0,4) + ':' + obsdate.slice(4,6) + ':' + obsdate.slice(6,8);

    var vstr = 'http://vizier.u-strasbg.fr/viz-bin/VizieR?-source=III/272/ravedr4&Field=' +
               field + '&Obsdate=' + obsdatep + '&Fiber=' + fiber +
               '&-out=Name,RAVE,Obsdate,Field,Fiber,Jmag2,HRV,TeffK,loggK,c[M/H]K,SNRK,Dist,c1,c2,c3';

    body.select('#tl3').html(obsdate + '_' + field + '_' + fiber);
    body.select('.vizier_link')
        .attr("xlink:href", vstr)
        .attr("target", "_blank")
        .select('.vizier_icon')
            .attr('opacity', 1.0);
};

function mclick(d, i) {
    svg.selectAll(".bighex").remove();

    var points = hexagon_points(d[1][0], d[1][1], r * 2.2)
    svg.selectAll("bighex")
		    .data(points)
        .moveToFront()
	      .enter().append("polygon")
		    .attr("points", points)
        .style("fill", "white")
        .style("stroke", d3.rgb(d[1][seldict[cursel]]).darker(1))
		    .style("stroke-width", 1)
        .attr("class", "bighex");

    points = hexagon_points(d[1][0], d[1][1], r * 1.5);
    svg.selectAll("bighex")
		    .data(points)
        .moveToFront()
	      .enter().append("polygon")
		    .attr("points", points)
        .style("fill", d[1][seldict[cursel]])
		    .style("stroke-width", 1.5)
        .attr("class", "bighex");

    svg.selectAll(".plot")
        .remove();

    // Load field data
    d3.csv(field_fn + i + ".csv", function(data) {
        var cdata = data.map(function(d, k) { return [(+d["xp"]) * scalef + pbox.x - 1,
                             (+d["yp"]) * scalef + pbox.y - 1, d["teff"], d["logg"],
                             d["met"], d["snr"], d["hrv"], d["dist"], d["flag"],
                             d["ewirt"], d["jmk"], d["sizep"], d["alphap"], d["fnp"], d["tindex"]];});

        var size = Math.sqrt(cdata.length) * 18;

        var pack = d3.layout.pack()
            .size([size, size])
            .sort(null)
            // .radius()
            .padding(10) // padding between adjacent circles
            .value(function(d) {console.log(d[12]); return d[12];});

        nodes = pack.nodes({children: cdata})

        for (var k = 0; k < cdata.length; k++){
              console.log(nodes[k].value)
              cdata[k].push(nodes[cdata[k][14]].x - size * 0.5 + 420)
              cdata[k].push(nodes[cdata[k][14]].y - size * 0.5 + 400)
        }
        // Squarified coordinates
        // n = parseInt(Math.sqrt(cdata.length) + 1)
        // x = []
        // y = []
        // for (k = 0; k < n; k++){
        //   for (j = 0; j < n; j++){
        //       x.push((j - n * 0.5 + 24)* 18);
        //       y.push((21.5 - k + n * 0.5) * 18 );
        //   }
        // }
        // for (k = 0; k < cdata.length; k++){
        //       cdata[k].push(x[cdata[k][13]])
        //       cdata[k].push(y[cdata[k][13]])
        // }

        svg.selectAll("#plot")
            .data(cdata)
            .enter().append("circle")
            .attr("transform", function(d) { return "translate(" + [d[0], 698 - d[1]] + ")"; })
            .attr("r",  function(d) {return d[11];})
            .style("fill", function(d) {return d[plc];})
            .style("fill-opacity",  function(d) {return d[12];})
            .style("stroke", function(d) {return d3.rgb(d[plc]).darker(1);})
            .attr("class", "plot")
            .on("mouseover", mover_hex)
            .on("mouseout", mout_hex)
            .on("click", mclick_hex);

        currentplotdata = cdata;
        if (currentplotdata.length > 1) var spct = 'spectra';
        else var spct = 'spectrum'

        body.select('#tl1')
            // .html(i);
         .html(i + ' (' + cdata.length + ' ' + spct + ')');
    });


    // Load average spectrum data
    d3.csv(field_fn + i + "_avgspec.csv", function(data) {
        var sdata = data.map(function(d, i) { return [+d["wl"], +d["median"], +d["std"]]});

        var spec = [];
        for (var i = 0; i < sdata.length; i++) {
            spec.push({"wl":sdata[i][0],"flux":sdata[i][1] + sdata[i][2]});
        }
        for (var i = sdata.length - 1; i >= 0; i--) {
            spec.push({"wl":sdata[i][0],"flux":sdata[i][1] - sdata[i][2]});
        }

        svg.selectAll(".line")
            .remove();
        svg.selectAll(".linespec")
            .remove();

        var area = d3.svg.area()
            .x(function(d) { return xss(specup.wl); })
            .y0(function(d) { return yss(specdown.flux); })
            .y1(function(d) { return yss(specup.flux); });

        svg.append("path")
            .datum(spec)
            .attr("class", "linespec")
            .attr("d", line)
            .style("stroke", "black")
            .style("opacity", 0.3);
    });
}

// Load t-SNE projection data
d3.csv(tsne_fn, function(data) {
    pdata = data.map(function(d, i) {
      return [[ +d["x"], +d["y"]-r, +d["x"] + r*sq, +d["y"]-rh,
                +d["x"]+r*sq, +d["y"]+rh, +d["x"], +d["y"]+r,
                +d["x"]-r*sq, +d["y"]+rh, +d["x"]-r*sq, +d["y"]-rh],
                [+d["x"], +d["y"],
                d["teff"], d["logg"], d["met"], d["snr"], d["hrv"],
                d["dist"], d["flag"], d["ewirt"], d["jmk"], d["den"], d["idx"]]];
    });

    var pcolor = data.map(function(d) { return [d[cursel]];});
    var popacity = data.map(function(d) { return [d["opacity"]];});
    var ecolor = data.map(function(d) { return [d["ecolor"]];});

    svg.selectAll("#chart")
        .data(pdata)
    	  .enter().append("polygon")
    		.attr("points", function(d, i) { return pdata[i][0]; })
    		.style("fill", function(d, i) { return pcolor[i]; })
    		.style("fill-opacity", function(d, i) { return popacity[i]; })
        .attr("stroke-width", 0)
        .attr("class", "chart")
    		.on("mouseover", mover)
    		.on("mouseout", mout)
    		.on("click", mclick);
});
