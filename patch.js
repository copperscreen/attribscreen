let fs = require('fs');
let index = fs.readFileSync('index.html', { encoding: 'ascii' });
let patched = index.replace( 'window.location.href', "'https://ps3chd62zcrn2xfy6n5bscxr740yndyv.lambda-url.us-east-1.on.aws/'");
fs.writeFileSync('attrib.html', patched, { encoding: 'ascii' });