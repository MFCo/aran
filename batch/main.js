
window.Aran = require("..")

window.onload = function () {
  document.getElementById("masters").onchange = checkfiles
  document.getElementById("targets").onchange = checkfiles
  document.getElementById("run").onclick = pre
}

function prepare () {
  var exports = {}
  eval(arguments[0])
  return Aran(exports.sandbox, exports.traps, exports.options)
}

function round (x) { return Math.round(1000*x)/1000 }

function print (x) {
  if (x === undefined) { return "undefined" }
  if (typeof x === "string") { return JSON.stringify(x) }
  return String(x)
}

function checkfiles () {
  document.getElementById("run").disabled =
    !(document.getElementById("masters").files.length && document.getElementById("targets").files.length)
}

function pre () {
  var masters = {}
  var targets = {}
  var rdv = 0
  var files
  var i
  document.getElementById("feedback").style.visibility = "visible"
  document.getElementById("feedback").textContent = "Load files..."
  document.getElementById("output").style.visibility = "hidden"
  document.getElementById("masters").disabled = true
  document.getElementById("targets").disabled = true
  document.getElementById("run").disabled = true
  function read (file, obj) {
    rdv++
    var reader = new FileReader()
    reader.readAsText(file, "UTF-8")
    reader.onload = function () {
      obj[file.name] = reader.result
      if (!--rdv) { benchmarkall(masters, targets) }
    }
  }
  files = document.getElementById("masters").files
  for (var i=0; i<files.length; i++) { read(files[i], masters) }
  files = document.getElementById("targets").files
  for (var i=0; i<files.length; i++) { read(files[i], targets) }
}

function checkmasters (masters) {
  try { for (var key in masters) { prepare(masters[key]) } }
  catch (e) {
    document.getElementById("feedback").textContent = "Error at master "+key+": "+e
    document.getElementById("masters").disabled = false
    document.getElementById("targets").disabled = false
    document.getElementById("run").disabled = false
    console.dir(e)
    throw e
  }
}

function benchmarkall (masters, targets) {
  function progress () {
    var done = i*targetkeys.length+j
    var todo = masterkeys.length*targetkeys.length
    return "Applying "+masterkeys[i]+" on "+targetkeys[j]+" ("+done+"/"+todo+")"
  }
  function update (done) { document.getElementById("feedback").textContent = done+"/"+(masterkeys.length*targetkeys.length)+"..." }
  var masterkeys = Object.keys(masters)
  var targetkeys = Object.keys(targets)
  var results = []
  var i = 0
  var j = 0
  checkmasters(masters)
  var interval = setInterval(function () {
    if (j === targetkeys.length) { (j = 0, i++) }
    if (i === masterkeys.length) { return (clearInterval(interval), post(results)) }
    document.getElementById("feedback").textContent = progress()
    var result = benchmark(masters[masterkeys[i]], targets[targetkeys[j]])
    result.master = masterkeys[i]
    result.target = targetkeys[j]
    results.push(result)
    j++
  }, 5)
}

function benchmark (master, target) {
  var result = {}
  var input = {code:target}
  var aran = prepare(master)
  // Original
  result.time = performance.now()
  try { window.eval(target) } catch (e) { result.error = print(e) }
  result.time = round(performance.now()-result.time)
  result.loc = target.split("\n").length
  // Aran
  result.arantime = performance.now()
  try { aran(input) } catch (e) { result.aranerror = print(e) }
  result.arantime = round(performance.now()-result.arantime)
  result.aranloc = ("compiled" in input) ? input.compiled.split("\n").length : null
  // Return
  return result
}

function post (results) {
  var headers = ["master", "target", "loc", "aranloc", "error", "aranerror", "time", "arantime"]
  var table = document.getElementById("table")
  var row
  var cell
  var time = 0
  var arantime = 0
  while (table.firstChild) { table.removeChild(table.firstChild) }
  for (var i=0; i<results.length; i++) {
    time = time + results[i].time
    arantime = arantime + results[i].arantime
    row = document.createElement("tr") 
    for (var j=0; j<headers.length; j++) {
      cell = document.createElement("td")
      cell.textContent = results[i][headers[j]]
      row.appendChild(cell)
    }
    cell = document.createElement("td")
    cell.textContent = round(results[i].arantime/results[i].time)
    row.appendChild(cell)
    table.appendChild(row)
  }
  document.getElementById("feedback").textContent = "Average slowdown factor: "+round(arantime/time)
  document.getElementById("output").style.visibility = "visible"
  document.getElementById("masters").disabled = false
  document.getElementById("targets").disabled = false
  document.getElementById("run").disabled = false
}