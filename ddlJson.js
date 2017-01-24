"use strict";

function MapJson() {
    this.layers = [];
    this.pushLayer = pushLayer.bind(this);

    function pushLayer(layer_) {
        if (layer_ != null) {
            this.layers.push(layer_);
        }
    }
}

function Layer(name) {
    this.polyLines = [];
    this.name = null;
    this.pushPolyLine = pushPolyLine.bind(this);
    // set provided name, if any
    if (name) {
        this.name = name;
    }

    function pushPolyLine(polyLine_) {
        if (polyLine_ != null) {
            this.polyLines.push(polyLine_);
        }
    }
}

function PolyLine(name) {
    this.points = [];
    this.name = null;
    this.gab = null;
    this.setField = null;
    this.pushPoint = pushPoint.bind(this);
    // set provided name, if any
    if (name) {
        this.name = name;
    }

    function pushPoint(point_) {
        if (point_ != null) {
            this.points.push(point_);
        }
    }
}

function Point(x, y) {
    this.x = null;
    this.y = null;
    this.name = null;
    // set provided name, if any
    if (x != null) {
        this.x = x;
    }
    if (y != null) {
        this.y = y;
    }
}

