var request = require('request'),
  tagMap = require('./tag_map'),
  fs = require('fs'),
  f = require('util').format;
var argv = require('yargs')
  .usage('Usage: $0 -f -o [string] -i [string]')
  .describe('f', 'Fetch new data from url')
  .describe('r', 'Generate delta report')
  .describe('t', 'Generate last total report')
  .describe('i', 'Input directory to generate summation from')
  .default('i', './data')
  .describe('o', 'Output directory')
  .default('o', './data')
  .argv;

if(argv.r && argv.f && argv.t) {
  console.log("Parameters -r, -f or -t cannot be provided at the same time");
  return;
}

if(!argv.r && !argv.f && !argv.t) {
  console.log("Either -r, -f or -t must be provided")
  return;
}

// Variables used in collecting tags
var time = new Date().toString();
var byTags = {};
var bySplitFunction = f('%s\n', time);

// Gather all the tags
var gatherTags = function(page) {
  console.log(f("- fetching page %s", page));
  var request = require('request');
  return request(f('https://api.stackexchange.com/2.2/tags/mongodb/related?site=stackoverflow&page=%s', page), {gzip:true}, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var object = JSON.parse(body);

      // Number of items
      var items = object.items.forEach(function(x) {
        byTags[x.name] = x.count;
        bySplitFunction = bySplitFunction + f('=SPLIT("%s,%s", ",")\n', x.name, x.count);
      });

      if(object.has_more) {
        gatherTags(page+1);
      } else {
        // Get the json
        var json = JSON.stringify(byTags, null, 2);
        fs.writeFileSync(f('%s/%s.json', argv.o, time), json);
        fs.writeFileSync(f('%s/%s.txt', argv.o, time), bySplitFunction);
      }
    }
  });
}

// Map data object
var mapData = function(map, object) {
  var finalObject = {};
  for(var name in map) finalObject[name] = 0;

  for(var name in object) {
    for(var n in map) {
      if(map[n].indexOf(name) != -1) {
        finalObject[n] += object[name];
      }
    }
  }

  return finalObject;
}

if(argv.f) {
  return gatherTags(1);
}

if(argv.r || argv.t) {
  var entries = fs.readdirSync(argv.i);
  entries = entries.filter(function(x) {
    if(x.indexOf('delta.json') != -1) return false;
    return x.indexOf('.json') != -1;
  });

  // Read and parse all the json
  var data = entries.map(function(x) {
    return { 
      name: x, 
      data: mapData(tagMap, JSON.parse(fs.readFileSync(f('%s/%s', argv.i, x)))),
      date: new Date(x.split('.').shift())
    };
  })

  // Sort data by date
  data = data.sort(function(a, b) {
    return a.date - b.date;
  });

  // If we only want the last document totals, quick hack
  if(argv.t) {
    data = data.reverse();
    var object = {date:data[0].date, data: {}};
    for(var name in data[0].data) object.data[name] = 0;
    data = [object, data[0]];
  }

  // Initial base line
  var baseLine = data[0];

  // For each of the entries crate a delta
  for(var i = 1; i < data.length; i++) {
    // Delta
    var delta = {};
    var bySplitFunction = f('%s\n', time);
    var time = data[i].name.split('.').shift();

    // Get keys
    var keys = Object.keys(baseLine.data).sort();
    // Iterate over all the keys
    for(var j = 0; j < keys.length; j++) {
      delta[keys[j]] = data[i].data[keys[j]] - baseLine.data[keys[j]];
      bySplitFunction = bySplitFunction + f('=SPLIT("%s,%s", ",")\n', keys[j], delta[keys[j]]);
    }

    // Total or delta
    var fileType = argv.t ? 'total' : 'delta';
    // Write the delta out
    fs.writeFileSync(f('%s/%s.%s.json', argv.o, time, fileType), JSON.stringify(delta, null, 2))
    // Write for simple import
    fs.writeFileSync(f('%s/%s.%s.txt', argv.o, time, fileType), bySplitFunction)
    // Set the new baseline
    baseLine = data[i];
  }
}















