"use strict";

function MapJson() {
    this.layers = [];
}

function Layer(name) {
    this.polyLines = [];
    this.name = null;
    // set provided name, if any
    if (name) {
        this.name = name;
    }
}

function PolyLine(name) {
    this.points = [];
    this.name = null;
    this.meta = [];
    this.gab = null;
    this.cam = null;
    this.setField = null;
    // set provided name, if any
    if (name) {
        this.name = name;
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

