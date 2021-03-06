document.onreadystatechange = function () {
    if (document.readyState == "interactive") {

    } else if (document.readyState == "complete") {
        $(".chosen-select").chosen({enable_split_word_search: true, search_contains: true});
        document.getElementById('myCanvas').onmousedown = function (e) {
            var self = this;
            var xPrev = e.clientX;
            var yPrev = e.clientY;
            document.onmousemove = function (e) {
                e = e || event;
                var clientX = e.clientX;
                var clientY = e.clientY;
                xOffset_ += (clientX - xPrev) * 5;
                yOffset_ += (clientY - yPrev) * 5;
                xPrev = clientX;
                yPrev = clientY;
                drawLayersOnCanvas();
            };
            this.onmouseup = function () {
                document.onmousemove = null
            }
        };

        //document.getElementById('myCanvas').ondragstart = function() { return false }
    }
};

var ddl_lines_g = [];
var line_addresses_g = [];
var lines_iterator_g = 0;

var temp_layer_g;
var temp_polyLine_g;
var temp_point_g;
var mapTree;
var xOffset_ = 0;
var yOffset_ = 0;
var scale_ = 9;

function AbsorbDllFile() {
    var file = document.getElementById('file').files[0];

    var reader = new FileReader();
    reader.onload = function (progressEvent) {
        // Entire file
        //console.log(this.result);

        // Get the lines
        ddl_lines_g = this.result.split('\n');
        //console.log(lines);
        convertDdlToJson();
    };
    reader.readAsText(file);
}

function AbsorbAddressFile() {
    var file = document.getElementById('addressFile').files[0];

    var reader = new FileReader();
    reader.onload = function (progressEvent) {
        // Get the addresses
        line_addresses_g = CSVToArray(reader.result);
    };
    reader.readAsText(file);
}

/*
 * The tree structure would be as follows
 * We have a file and it has layers and each layer has polylines and each polyline has points
 * File - level 0; Layer - Level 1; PolyLine - Level 2; Point - Level 3;
 * If we encounter a layer start, then we create a new temporary layer for adding to the tree. If we encounter a layer end, then we attach the temporary layer to the tree layers array.
 * If we encounter a polyLine start, then we create a new temporary polyLine for adding to the latest Layer. If we encounter a polyLine end, then we attach the temporary polyLine to the latest tree layer polyLines array.
 * If we encounter a point start, then we create a new temporary point for adding to the latest Layer polyLine. If we encounter a Point end, then we attach the temporary Point to the latest tree layer polyLine Points array.                              File
 * [     Layer1,                                         Layer2, ...]
 * [     PolyLine1,          PolyLine2...]      [PolyLine1, PolyLine2...]
 * [Point1, Point2...]  [Point1, Point2...  ]
 * */
function convertDdlToJson() {
    lines_iterator_g = 0;

    mapTree = new MapJson();
    temp_layer_g = null;
    temp_polyLine_g = null;
    temp_point_g = null;

    // do layer start quest
    doDdlProcessing();

    var sel = document.getElementById("actives_layers_select");
    $(sel).empty();
    $(sel).trigger("chosen:updated");
    for (var i = 0; i < mapTree.layers.length; i++) {
        $(sel).append($("<option/>", {
            value: i,
            text: i + 1 + "-" + mapTree.layers[i].name + " - " + mapTree.layers[i].polyLines.length
        }));
    }
    $(sel).trigger("chosen:updated");

    for (var i = 0; i < mapTree.layers.length; i++) {
        console.log(i + " -- " + mapTree.layers[i].name + " --- " + mapTree.layers[i].polyLines.length + " lines")
    }

    // attach addresses to lines
    for (var i = 0; i < mapTree.layers.length; i++) {
        for (var k = 0; k < mapTree.layers[i].polyLines.length; k++) {
            mapTree.layers[i].polyLines[k].ednaId = getEDnaIdFromMeta(mapTree.layers[i].polyLines[k].meta);
        }
    }
}

function doDdlProcessing() {
    var inLayerBlock = false;
    var inLayerBlockBrackets = false;
    var inPolyLineBlockBrackets = false;
    var inPolyLineBlock = false;
    var level = -1;
    for (var iter = 0; iter < ddl_lines_g.length; iter++) {
        var str = ddl_lines_g[iter].trim();

        if (str == "(") {
            level++;
            if (inLayerBlock == true && ddl_lines_g[iter].indexOf("		(") == 0) {
                // A Layer could have has started
                inLayerBlockBrackets = true;
            }
            if (inPolyLineBlock == true && ddl_lines_g[iter].indexOf("			(") == 0) {
                // A Layer could have has started
                inPolyLineBlockBrackets = true;
            }
            continue;
        }
        if (str == ")") {
            if (inLayerBlockBrackets == true && ddl_lines_g[iter].indexOf("		)") == 0) {
                inLayerBlockBrackets = false;
                inLayerBlock = false;
            }
            if (inPolyLineBlockBrackets == true && ddl_lines_g[iter].indexOf("			)") == 0) {
                inPolyLineBlockBrackets = false;
                inPolyLineBlock = false;
            }
            level--;
            continue;
        }

        // A simple Layer started
        var variables = str.match(/simple_layer\s\"(.+)\"/i);
        if (variables != null) {
            // push old temporary layer to layers array
            if (temp_layer_g != null) {
                mapTree.layers.push(temp_layer_g);
            }
            // create a new temporary global layer
            temp_layer_g = new Layer(variables[1]);
            inLayerBlock = true;
            continue;
        }

        // A polyLine started
        if (str == "polyline") {
            if (!(inLayerBlockBrackets)) {
                // We are not in layer block
                continue;
            }
            // A new polyLine has started and so the current polyLine has ended. So push the temp polyLine to the temp Layer and make temp polyLine as null
            if (temp_polyLine_g != null) {
                temp_layer_g.polyLines.push(temp_polyLine_g);
            }
            temp_polyLine_g = new PolyLine(null);
            inPolyLineBlock = true;
            continue;
        }
        if (!(inLayerBlockBrackets == true && inPolyLineBlockBrackets == true)) {
            // We are not in a layer polyLine block
            continue;
        }
        // We are in a layer polyLine block
        // If a point is encountered
        var pointArgs = str.match(/point\((.+)\s(.+)\)/i);
        if (pointArgs != null) {
            temp_polyLine_g.points.push(new Point(pointArgs[1], pointArgs[2]));
            continue;
        }
        // If an origin is encountered
        pointArgs = str.match(/origin\((.+)\s(.+)\)/i);
        if (pointArgs != null) {
            temp_polyLine_g.points.push(new Point(pointArgs[1], pointArgs[2]));
            continue;
        }
        // If a gab is encountered
        pointArgs = str.match(/gab\s\"(.+)\"/i);
        if (pointArgs != null) {
            temp_polyLine_g.gab = pointArgs[1];
            continue;
        }
        // If a setField is encountered
        pointArgs = str.match(/set\(\"(.+)\"\)/i);
        if (pointArgs != null) {
            temp_polyLine_g.setField = pointArgs[1];
            continue;
        }
        // If a cam is encountered
        pointArgs = str.match(/cam\s\"(.+)\"/i);
        if (pointArgs != null) {
            temp_polyLine_g.cam = pointArgs[1];
            continue;
        }
        pointArgs = str.match(/record\(\"(.+)\"\)\srecord_key\(\"(.+)\"\)/i);
        if (pointArgs != null) {
            //record("SUBSTN") record_key("STNA7_PG")
            temp_polyLine_g.meta.push({"key": pointArgs[1], "value": pointArgs[2]});
        }
    }
    // final wrapUp
    if (temp_layer_g != null) {
        if (temp_polyLine_g != null) {
            if (temp_polyLine_g != null) {
                temp_layer_g.polyLines.push(temp_polyLine_g);
            }
        }
        if (temp_layer_g != null) {
            mapTree.layers.push(temp_layer_g);
        }
    }
}

function drawLayersOnCanvas() {
    var sel = document.getElementById("actives_layers_select");
    var selectedVals = $(sel).val();
    var ctx = document.getElementById("myCanvas").getContext("2d");
    ctx.clearRect(0, 0, 800, 500);
    for (var p = 0; p < selectedVals.length; p++) {
        var layerIndex = selectedVals[p];
        var drawingLayerLines = mapTree.layers[layerIndex].polyLines;
        for (var i = 0; i < drawingLayerLines.length; i++) {
            var polyLine = drawingLayerLines[i];
            var origin = {x: +polyLine.points[1].x, y: +polyLine.points[1].y};
            ctx.beginPath();
            ctx.moveTo((origin.x + xOffset_) / scale_, (origin.y + yOffset_) / scale_);
            for (var k = 2; k < polyLine.points.length; k++) {
                //draw a line on canvas
                var newPoint = {x: origin.x + (+polyLine.points[k].x), y: origin.y + (+polyLine.points[k].y)};
                ctx.lineTo((newPoint.x + xOffset_) / scale_, (newPoint.y + yOffset_) / scale_);
                origin = newPoint;
            }
            ctx.stroke();
        }
    }
}

// canvas offset changing function
function changeXOffset(val) {
    xOffset_ = +val;
    drawLayersOnCanvas();
}

// canvas offset changing function
function addXOffset(val) {
    xOffset_ += val;
    drawLayersOnCanvas();
}

// plotting scaling changing function
function addZoom(val) {
    var tempZoom = scale_ + val;
    if (tempZoom < 1) {
        tempZoom = 1;
    }
    scale_ = tempZoom;
    drawLayersOnCanvas();
}

// create eDNA address from matadata
function createKeyFromMeta(metaArray) {
    var substn = null;
    var devtyp = null;
    var device = null;
    var analog = null;
    var ednaLongKey = null;
    for (var i = 0; i < metaArray.length; i++) {
        var metaObj = metaArray[i];
        if (metaObj.key == "SUBSTN") {
            substn = metaObj.value;
        }
        if (metaObj.key == "DEVTYP") {
            devtyp = metaObj.value;
        }
        if (metaObj.key == "DEVICE") {
            device = metaObj.value;
        }
        if (metaObj.key == "ANALOG") {
            analog = metaObj.value;
        }
    }
    if (substn != null && devtyp != null && device != null && analog != null) {
        ednaLongKey = substn + "." + devtyp + "." + device + ".MES1" + "." + analog;
    }
    return ednaLongKey;
}

function searchAddresses(typeStr, substationStr, deviceStr, unitsStr) {
    var addressStr = null;
    for (var i = 0; i < line_addresses_g.length; i++) {
        // ss = 2, dev_type= 3, dev = 4, units = 6, address = 1
        var addressArray = line_addresses_g[i];
        if (addressArray[2] == substationStr && addressArray[3] == typeStr && addressArray[4] == deviceStr && addressArray[6] == unitsStr) {
            addressStr = "WRLDCMP.SCADA1." + addressArray[0];
            break;
        }
    }
    return addressStr;
}

function getEDnaIdFromMeta(metaArray) {
    var substn = null;
    var devtyp = null;
    var device = null;
    var analog = null;
    var addressStr = null;
    for (var i = 0; i < metaArray.length; i++) {
        var metaObj = metaArray[i];
        if (metaObj.key == "SUBSTN") {
            substn = metaObj.value;
        }
        if (metaObj.key == "DEVTYP") {
            devtyp = metaObj.value;
        }
        if (metaObj.key == "DEVICE") {
            device = metaObj.value;
        }
        if (metaObj.key == "ANALOG") {
            analog = metaObj.value;
        }
    }
    if (substn != null && devtyp != null && device != null && analog != null) {
        addressStr = searchAddresses(devtyp, substn, device, analog);
    }
    return addressStr;
}

document.getElementById("exportFile").onclick = function () {
    var text = JSON.stringify(mapTree);
    var filename = "export";
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
};
