var trumpet = require('../');
var tr = trumpet();

tr.selectAll('.b span', function (span) {
console.dir(span);
    //span.createReadStream().pipe(process.stdout);
});

var fs = require('fs');
fs.createReadStream(__dirname + '/select.html').pipe(tr);
