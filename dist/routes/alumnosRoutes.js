"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _express = require("express");

var _alumnosControllers = require("../controllers/alumnosControllers");

var router = (0, _express.Router)();
router.get('/alumsact', _alumnosControllers.getAlumnosActivos);
router.get('/alumsactper', _alumnosControllers.getAlumnosPerActivos);
router.get('/alumsactpro', _alumnosControllers.getAlumnosPorPropuesta);
router.get('/alumsactubipro', _alumnosControllers.getAlumnosPorUbiPropuesta);
router.get('/reinscriptos/:anio', _alumnosControllers.getReinscriptosUbiProp);
var _default = router;
exports["default"] = _default;