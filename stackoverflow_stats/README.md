# Stackoverflow collection script

To collect data run the script with

```js
node index.js -f
```

This will save the current snapshot to the ./data directory in json and also in an import format for copy and paste into google spreadsheet.

To calculate all the deltas and generate the deltas between each collected data point do.

```js
node index.js -r
```

This will generate a json and txt file containing the delta between each recorded data point.