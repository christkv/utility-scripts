var request = require('request'),
  fs = require('fs'),
  f = require('util').format;
var argv = require('yargs')
  .usage('Usage: $0 -f -o [string] -i [string]')
  .describe('f', 'Fetch new data from url')
  .describe('r', 'Generate report')
  .describe('i', 'Input directory to generate summation from')
  .default('i', './data')
  .describe('o', 'Output directory')
  .default('o', './data')
  .argv;

if(argv.r && argv.f) {
  console.log("Both parameters -r and -f cannot be provided");
}

if(!argv.r && !argv.f) {
  console.log("Either -r or -f must be provided")
}

if(argv.f) {
  var request = require('request');
  return request('https://api.stackexchange.com/2.2/tags/mongodb/related?site=stackoverflow', {gzip:true}, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var time = new Date().toString();
      var object = JSON.parse(body);

      var byTags = {};
      var bySplitFunction = f('%s\n', time);
      var items = object.items.forEach(function(x) {
        byTags[x.name] = x.count;
        bySplitFunction = bySplitFunction + f('=SPLIT("%s,%s", ",")\n', x.name, x.count);
      });

      // Get the json
      var json = JSON.stringify(byTags, null, 2);
      fs.writeFileSync(f('%s/%s.json', argv.o, time), json);
      fs.writeFileSync(f('%s/%s.txt', argv.o, time), bySplitFunction);
    }
  });
}

if(argv.r) {
  var entries = fs.readdirSync(argv.i);
  entries = entries.filter(function(x) {
    return x.indexOf('.json') != -1;
  });

  entries = entries.sort()
  // Read and parse all the json
  var data = entries.map(function(x) {
    return { name: x, data: JSON.parse(fs.readFileSync(f('%s/%s', argv.i, x))) };
  })

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

    // Write the delta out
    fs.writeFileSync(f('%s/%s.delta.json', argv.o, time), JSON.stringify(delta, null, 2))
    // Write for simple import
    fs.writeFileSync(f('%s/%s.delta.txt', argv.o, time), bySplitFunction)
    // Set the new baseline
    baseLine = data[i];
  }

    console.dir(data)

  // console.dir(entries)
}















