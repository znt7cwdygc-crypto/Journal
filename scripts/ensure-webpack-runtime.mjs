import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const runtimePath = join(process.cwd(), ".next/server/webpack-runtime.js");

if (existsSync(runtimePath)) {
  process.exit(0);
}

writeFileSync(
  runtimePath,
  `"use strict";
var path = require("path");
var __webpack_modules__ = {};
var __webpack_module_cache__ = {};
var installedChunks = {};

function __webpack_require__(moduleId) {
  var cachedModule = __webpack_module_cache__[moduleId];
  if (cachedModule !== undefined) return cachedModule.exports;
  var moduleFactory = __webpack_modules__[moduleId];
  if (!moduleFactory) throw new Error("Cannot find module '" + moduleId + "'");
  var module = (__webpack_module_cache__[moduleId] = { id: moduleId, loaded: false, exports: {} });
  var threw = true;
  try {
    moduleFactory.call(module.exports, module, module.exports, __webpack_require__);
    threw = false;
  } finally {
    if (threw) delete __webpack_module_cache__[moduleId];
  }
  module.loaded = true;
  return module.exports;
}

__webpack_require__.m = __webpack_modules__;
__webpack_require__.c = __webpack_module_cache__;
__webpack_require__.s = undefined;
__webpack_require__.j = undefined;

__webpack_require__.o = function (obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
};

__webpack_require__.d = function (exports, definition) {
  for (var key in definition) {
    if (__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
      Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
    }
  }
};

__webpack_require__.r = function (exports) {
  if (typeof Symbol !== "undefined" && Symbol.toStringTag) {
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
  }
  Object.defineProperty(exports, "__esModule", { value: true });
};

__webpack_require__.n = function (module) {
  var getter = module && module.__esModule ? function () { return module.default; } : function () { return module; };
  __webpack_require__.d(getter, { a: getter });
  return getter;
};

__webpack_require__.t = function (value, mode) {
  if (mode & 1) value = __webpack_require__(value);
  if (mode & 8) return value;
  if ((mode & 4) && typeof value === "object" && value && value.__esModule) return value;
  var ns = Object.create(null);
  __webpack_require__.r(ns);
  Object.defineProperty(ns, "default", { enumerable: true, value: value });
  if (mode & 2 && typeof value !== "string") {
    for (var key in value) {
      __webpack_require__.d(ns, { [key]: function (key) { return value[key]; }.bind(null, key) });
    }
  }
  return ns;
};

__webpack_require__.nmd = function (module) {
  module.paths = [];
  if (!module.children) module.children = [];
  return module;
};

__webpack_require__.C = function (chunk) {
  if (!chunk) return;
  var modules = chunk.modules || {};
  for (var moduleId in modules) {
    if (__webpack_require__.o(modules, moduleId)) __webpack_modules__[moduleId] = modules[moduleId];
  }
  var ids = chunk.ids || (chunk.id !== undefined ? [chunk.id] : []);
  for (var i = 0; i < ids.length; i += 1) installedChunks[ids[i]] = 0;
};

function loadChunk(chunkId) {
  if (installedChunks[chunkId] === 0) return;
  var chunk = require(path.join(__dirname, "chunks", String(chunkId) + ".js"));
  __webpack_require__.C(chunk);
}

__webpack_require__.X = function (result, chunkIds, fn) {
  if (chunkIds) {
    for (var i = 0; i < chunkIds.length; i += 1) loadChunk(chunkIds[i]);
  }
  return fn ? fn() : result;
};

module.exports = __webpack_require__;
`,
  "utf8"
);

console.log("[stable] restored missing .next/server/webpack-runtime.js");
