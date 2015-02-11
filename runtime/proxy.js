
var Error = require("../error.js")

function unescape (str) { if (/^\$*aran$/.test(str)) { return str.substring(1) } return str }

module.exports = function (aran) {

  if (!aran.sandbox) { return }

  if (!aran.global.Proxy) { Error.external("ECMAscript6 proxies are needed to support sandboxing") }

  var has = function (o, k) { return unescape(k) in o }
  if (aran.traps && aran.traps.exist) { has = function (o, k) { return aran.traps.exist(o, unescape(k)) } }

  var get = function (o, k) { return o[unescape(k)] }
  if (aran.traps && aran.traps.get) { get = function (o, k) { return aran.traps.get(o, unescape(k)) } }

  var set = function (o, k, v) { return o[unescape(k)]=v }
  if (aran.traps && aran.traps.set) { set = function (o, k, v) { return aran.traps.set(o, unescape(k), v) } }

  aran.proxy = new aran.global.Proxy(aran.sandbox, {
    has: function (g, k) { return k !== "aran" },
    get: function (g, k) { if (has(g, k)) { return get(g, k) } throw new ReferenceError("Sandbox reference Error: "+unescape(k)+" is not defined") },
    set: set
  })

  aran.with = function (o) {
    return new Proxy(o, {
      has: function (o, k) { if (k === "aran") { return false } return has(o,k) },
      get: get,
      set: set
    })
  }

}