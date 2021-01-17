
var cv = require("opencv4nodejs");

const rows = 100; // height
const cols = 100; // width

// empty Mat
const emptyMat = new cv.Mat(rows, cols, cv.CV_8UC3);
 
// fill the Mat with default value
const whiteMat = new cv.Mat(rows, cols, cv.CV_8UC1, 255);
const blueMat = new cv.Mat(rows, cols, cv.CV_8UC3, [255, 0, 0]);


console.log("Finally");

const img = cv.imread('./images/pic1.png');

cv.imwrite("image.png", img);

console.log(img);


class WatermarkAnalyzer {
	imgArray: any;
	rows: Number;
	cols: Number;

	constructor(imgArr:any, rw:Number, col:Number){
		this.imgArray = imgArr;
		this.rows = rw;
		this.cols = col;
	}

	public median(values) {

	    values.sort( function(a,b) {return a - b;} );

	    let half = Math.floor(values.length/2);

	    if(values.length % 2)
	        return values[half];
	    else
	        return (values[half-1] + values[half]) / 2.0;
	}

	public getMedianArray(arr:any):any {

		let result = [];

		for (let i = 0; i < this.rows ; i++) {
			let arr2d = []
			for (let j = 0; j < this.cols; j++){
				let arr1d = [];
				for (let k = 0; k < arr.length; k++){
					arr1d.push(arr[k].at(i,j));
				}

				arr2d.push(this.median(arr1d));
				//result.at(i,j) = this.median(arr1d);
			}

			result.push(arr2d);
		}

		//let mat = new cv.Mat(result, cv.CV_32F);
		return result;
	}

	public extract_WM_outline(): any {

		let gradxArr = [];
		let gradyArr = [];

		let count = 0;

		console.log("Calculating gradx and grady (sobel filter) ...");
		for (let img of this.imgArray) {
			let gradx = img.sobel(cv.CV_32F,1,0,1);
			let grady = img.sobel(cv.CV_32F,0,1,1);
			gradxArr.push(gradx);
			gradyArr.push(grady);
		}

		console.log("Calculating median of watermark gradient ...");
		let wm_gradients_x = this.getMedianArray(gradxArr);
		console.log("Calculated.");
		console.log(wm_gradients_x.length)
		console.log(wm_gradients_x[0].length)
		console.log(wm_gradients_x[0][0])
		let wm_gradients_y = this.getMedianArray(gradyArr);
		
		let watermark = [];
		let minPx = 255;
		let maxPx = 0;

		console.log("Estimate watermark ...");
		for (let i = 0; i < this.rows; i++) {
			let rwMat = [];
			//if (i % 100 == 0) {
			//console.log(i);
			//}
			for (let j = 0; j < this.cols; j++) {
				//console.log("j = " + j);
				//console.log(wm_gradients_x[i][j] + " , " + wm_gradients_y[i][j]);
				let pix_abs = Math.sqrt(Math.pow(wm_gradients_x[i][j],2) + Math.pow(wm_gradients_y[i][j],2));
				//console.log("sqrt, square : " + pix_abs);
				rwMat.push(pix_abs);

				if (pix_abs > maxPx){
					maxPx = pix_abs;
				}

				if (pix_abs < minPx) {
					minPx = pix_abs;
				}
			}

			watermark.push(rwMat);
		}

		console.log("watermark estimated.");

		for (let i = 0; i < this.rows; i++) {
			for (let j = 0; j < this.cols; j++) {
				//watermark[i][j] = 255 * (watermark[i][j] - minPx) / (maxPx - minPx) ;
				//watermark[i][j] = (watermark[i][j] - minPx) / (maxPx - minPx) ;
				if (watermark[i][j] > 0.5){
					watermark[i][j] = 255;
				} else {
					watermark[i][j] = 0;
				}
			}
		}

		console.log("watermark thresholding");
		let nw_watermark = new cv.Mat(watermark, cv.CV_32F);
		cv.imwrite("watermark.png", nw_watermark);
		//nw_watermark = nw_watermark.threshold(0.5,1,cv.THRESH_BINARY);

		return [nw_watermark, wm_gradients_x, wm_gradients_y];


	}

	public initial_WM_estimation(): any {

		let wm_outline = this.extract_WM_outline();

		cv.imwrite("outline.png",wm_outline[0]);

	}
}

function loadImages(path:string, noImg:number): any{
	let imgArr = [];

	for (let i = 0; i < noImg; i++){
		let imgPath = path + 'pic' + (i+1).toString() + '.png';
		console.log(imgPath);
		let img = cv.imread(imgPath).cvtColor(cv.COLOR_RGB2GRAY);;
		imgArr.push(img);
	}

	return imgArr;
}

function convertCVmatrix(mat:any): any{
	let rw = mat.rows;
	let col = mat.cols;
	let simpleMat = [];
	for (let i = 0; i<rw;i++){
		let arr = [];
		for (let j = 0; j < col; j++) {
			arr.push(mat.at(i,j));
		}

		simpleMat.push(arr);
	}

	return simpleMat;
}

let imgArr = loadImages('./images/', 10);

console.log(imgArr[0].rows);
console.log(imgArr[0].cols);

var result = [];
var count = 0;


//let mat = cv.matFromArray(3, 4, Number, result);
for (let i = 0; i < 3; i++){
	let rww = [];
	for (let j = 0; j<4; j++) {
		rww.push(i + j);
		//mat[i][j] = i + j;
		count = 1;
		//result.data[i * 4 + j] = i + j;
	}

	result.push(rww);
}

let arrayyy = [[1,2,3,4]]
let mat = new cv.Mat(arrayyy, cv.CV_32F);
result[0][0] = 10;
console.log(result)
//imgArr[0].at(0,5) = 45;
console.log(imgArr[0].at(0,5))

let wm = new WatermarkAnalyzer(imgArr, imgArr[0].rows, imgArr[0].cols);
wm.initial_WM_estimation();
//console.log(wm)

/*
let sq = Math.sqrt(Math.pow(3,2) + Math.pow(4,2));

console.log("5 = " + sq);

let result1 = new cv.Mat(result, cv.CV_32F);
console.log(convertCVmatrix(result1));
let mat1 = result1.threshold(4, 1, cv.THRESH_BINARY);
console.log(convertCVmatrix(mat1)); */