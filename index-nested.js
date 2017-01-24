var ddl_lines_g = [];
var lines_iterator_g = 0;

var temp_layer_g;
var temp_polyLine_g;
var temp_point_g;
var jsonTree;
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

    jsonTree = new MapJson();
    temp_layer_g = null;
    temp_polyLine_g = null;
    temp_point_g = null;

    // do layer start quest
    doLayerStartQuest();
}

function doLayerStartQuest() {

    if (lines_iterator_g == ddl_lines_g.length) {
        doFinalWrapUp();
        return;
    }
    // find a new layer opening
    var str = ddl_lines_g[lines_iterator_g].trim();
    // incrementing the cursor to next line
    lines_iterator_g++;

    var variables = str.match(/simple_layer\s\"(.+)\"/i);
    if (variables == null) {
        //nothing found. Continue the quest
        doLayerStartQuest();
        return;
    } else {
        // create a temporary global layer
        temp_layer_g = new Layer(variables[1]);
        doLayerProcessing();
        return;
    }
}

function doLayerProcessing() {

    if (lines_iterator_g == ddl_lines_g.length) {
        doFinalWrapUp();
        return;
    }
    // find a new layer opening
    var str = ddl_lines_g[lines_iterator_g].trim();
    // incrementing the cursor to next line
    lines_iterator_g++;

    if (str.match(/simple_layer\s\"(.+)\"/i) != null) {
        // A new layer has started and so the current layer has ended. So push the temp layer to the main layer list and make temp layer as null
        jsonTree.pushLayer(temp_layer_g);
        temp_layer_g = null;
        lines_iterator_g--;
        doLayerStartQuest();
        return;
    } else {
        // Layer has not ended
        doPolyLineStartQuest();
    }
}

function doPolyLineStartQuest() {

    if (lines_iterator_g == ddl_lines_g.length) {
        doFinalWrapUp();
        return;
    }
    // find a new layer opening
    var str = ddl_lines_g[lines_iterator_g].trim();
    // incrementing the cursor to next line
    lines_iterator_g++;

    if (str != "polyline") {
        //nothing found. Continue the quest
        doPolyLineStartQuest();
        return;
    } else {
        // create a temporary global polyLine
        temp_polyLine_g = new PolyLine(null);
        doPolyLineProcessing();
        return;
    }
}

function doPolyLineProcessing() {

    if (lines_iterator_g == ddl_lines_g.length) {
        doFinalWrapUp();
        return;
    }
    // find a new layer opening
    var str = ddl_lines_g[lines_iterator_g].trim();
    // incrementing the cursor to next line
    lines_iterator_g++;

    if (str == "polyline") {
        // A new polyLine has started and so the current polyLine has ended. So push the temp polyLine to the temp Layer and make temp polyLine as null
        temp_layer_g.pushPolyLine(temp_polyLine_g);
        temp_polyLine_g = null;
        lines_iterator_g--;
        doPolyLineStartQuest();
        return;
    } else {
        // polyLine has not ended
        // If a point is encountered
        var pointArgs = str.match(/point\((.+)\s(.+)\)/i);
        if (pointArgs != null) {
            temp_polyLine_g.pushPoint(new Point(pointArgs[1], pointArgs[2]));
            doPolyLineProcessing();
            return;
        }
        // If an origin is encountered
        pointArgs = str.match(/origin\((.+)\s(.+)\)/i);
        if (pointArgs != null) {
            temp_polyLine_g.pushPoint(new Point(pointArgs[1], pointArgs[2]));
            doPolyLineProcessing();
            return;
        }
        // If a gab is encountered
        pointArgs = str.match(/gab\s\"(.+)\"/i);
        if (pointArgs != null) {
            temp_polyLine_g.gab = pointArgs[1];
            doPolyLineProcessing();
            return;
        }
        // If a setField is encountered
        pointArgs = str.match(/set\(\"(.+)\"\)/i);
        if (pointArgs != null) {
            temp_polyLine_g.setField = pointArgs[1];
            doPolyLineProcessing();
            return;
        }
        doPolyLineProcessing();
    }
}

function doFinalWrapUp() {
    if (temp_layer_g != null) {
        if (temp_polyLine_g != null) {
            temp_layer_g.pushPolyLine(temp_polyLine_g);
        }
        jsonTree.pushLayer(temp_layer_g);
    }
    return;
}