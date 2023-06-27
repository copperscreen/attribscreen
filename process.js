let Jimp = require('jimp');
var culori = {
	rgb:function(yiq){
		return {r: yiq.y + 0.95608445 * yiq.i + 0.6208885 * yiq.q,
		g: yiq.y - 0.27137664 * yiq.i - 0.6486059 * yiq.q,
		b: yiq.y - 1.10561724 * yiq.i + 1.70250126 * yiq.q};
	},yiq:function(rgb){
		return {
			y: 0.29889531 * rgb.r + 0.58662247 * rgb.g + 0.11448223 * rgb.b,
			i: 0.59597799 * rgb.r - 0.2741761 * rgb.g - 0.32180189 * rgb.b,
			q: 0.21147017 * rgb.r - 0.52261711 * rgb.g + 0.31114694 * rgb.b
		}
	}
}

function closest(val, values){
	var result = -1;
	var diff = Number.MAX_VALUE;
	for(var v of values){
		if (Math.abs(v - val)<diff){
			result = v;
			diff = Math.abs(v - val);
		}
	}
	return {value: result, diff: diff};
}
function betterMatch(v1,v2){
	return (v1.diff<v2.diff)?v1:v2;
}
function clamp(low,val,high){
	if (val < low) return low;
	if (val > high) return high;
	return val;
}
function scale(x, from_low, from_high, to_low, to_high){
	let normalized = (x - from_low) / (from_high - from_low);
        return (to_high - to_low) * normalized + to_low;
}
function quantize(x, from_low, from_high, to_low, to_high){
	if (to_high == 0) return 0;
	let scaled = scale(x, from_low, from_high, to_low, to_high);
        return scale(Math.round(scaled), to_low, to_high, from_low, from_high);
}
function levels(max, from, to, bias){
	if (max < 2) return [0];
	const array = Array(max).fill(1).map((_,i) => scale(i, 0, max - 1, from, to));
	let index = -1;
	for(let i = 0; i < array.length; i++){
		let v = array[i];
		if (Math.sign(v) == bias && ( index == -1 || Math.abs(v) < Math.abs(array[index]) )) index = i;
	}
	array[index] = 0;
	return array;
}

//export 
async function process(reqBody){
try{
	const state = reqBody.state;
	const params = state.settings;
	const Cols = Math.ceil(params.Width / params.AttrWidth);
	const Rows = Math.ceil(params.Height / params.AttrHeight);
	const grayLevels = Math.pow(2,params.YDepth);
	const IMax = Math.pow(2,params.IDepth) - 1;
	const ILevels = levels(Math.pow(2,params.IDepth), -0.595, 0.595, params.IBias);
	const QLevels = levels(Math.pow(2,params.QDepth), -0.522, 0.522, params.QBias);
//	var file1 = new Buffer('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFhAJ/wlseKgAAAABJRU5ErkJggg==', 'base64');
//	var file1 = new Buffer(reqBody.file.split(',',2).pop(), 'base64');
//return {mime:'r/r', encoded: reqBody.file.split(',',2).pop()};

	var file = reqBody.url || new Buffer(reqBody.file.split(',',2).pop(), 'base64');

	const image = await Jimp.read(file);
//return {mime:'r/r', encoded: reqBody.file.split(',',2).pop()};
	image.resize(params.Width, params.Height, Jimp.RESIZE_BILINEAR);
	image.normalize();
		
	for(var row=0; row< Rows; row++)
		for(var col=0; col< Cols; col++){
			const cellLeft = col*params.AttrWidth;
			const cellTop = row*params.AttrHeight;
			const cellRight = Math.min(cellLeft+params.AttrWidth - 1, params.Width);
			const cellBottom = Math.min(cellTop+params.AttrHeight - 1, params.Height);
			const pixelCount = (cellRight - cellLeft + 1) * (cellBottom - cellTop + 1);
			var grayData = Array(pixelCount);
			var iSum = -1;
			var qSum = -1;
			var rgbSum = [0,0,0];
			for(var y = cellTop; y<= cellBottom; y++)
				for(var x = cellLeft; x<= cellRight; x++){
					const idx = (y * params.Width + x)*4;
					var red = image.bitmap.data[idx + 0];
					var green = image.bitmap.data[idx + 1];
					var blue = image.bitmap.data[idx + 2];
					const yiq = culori.yiq(	{ mode: 'rgb', r: red/255, g: green/255, b: blue/255, alpha: 1} );
					grayData[(y - cellTop)*params.AttrWidth + x - cellLeft] = yiq.y;
					iSum = (iSum == -1)? yiq.i : (iSum + yiq.i);
					qSum = (qSum == -1)? yiq.q : (qSum + yiq.q);
					rgbSum[0] += red;
					rgbSum[1] += green;
					rgbSum[2] += blue;
				}
			const iAvg = iSum / pixelCount;
			const qAvg = qSum / pixelCount;
			var yiqAvg = culori.yiq({ mode: 'rgb', r: rgbSum[0]/(255*pixelCount), g: rgbSum[1]/(255*pixelCount), b: rgbSum[2]/(255*pixelCount), alpha: 1} );
			yiqAvg.i = closest(yiqAvg.i, ILevels).value;
			yiqAvg.q = closest(yiqAvg.q, QLevels).value;
			var bestGray;
			var bestError = Number.MAX_VALUE;
			for(var g=0; g<Math.pow(2, params.YPalettes);g++){
				var currentGray = [];
				var currentError = 0;
				var grayValues = state.Grays.slice(g*grayLevels, grayLevels*(g+1)).map(_ => _ / 100);
				for(var i=0;i<grayData.length;i++){
					var match = closest( grayData[i], grayValues);
					currentError += match.diff;
					currentGray.push(match.value);
				}
				if (currentError < bestError){
					bestError = currentError;
					bestGray = currentGray;
				}
			}
			var idx = 0;
			for(var y = cellTop; y<= cellBottom; y++)
				for(var x = cellLeft; x<= cellRight; x++){
					const rgb = culori.rgb( {mode:'yiq', y: bestGray[idx++], i:yiqAvg.i, q: yiqAvg.q });
					const pos = (y * params.Width + x)*4;
					image.bitmap.data[pos + 0] = clamp(0,Math.round(rgb.r * 255),255);
					image.bitmap.data[pos + 1] = clamp(0, Math.round(rgb.g * 255),255);
					image.bitmap.data[pos + 2] = clamp(0, Math.round(rgb.b * 255),255);
				}
		}
	const mime = image.getMIME() 
	const encoded = await image.getBase64Async(mime);
	return {mime, encoded};
}catch (ex){
return {mime:'e/e', encoded: ex.stack};
}
}
module.exports = process;