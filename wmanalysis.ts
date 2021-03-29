
var cv = require("opencv4nodejs");

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

	public extract_BoundBox(img : any): any {

		console.log("extract_BOUNDBOX");
		let img1 = img.convertTo(cv.CV_8UC1)
		let contours = new cv.Mat();
		let hierarchy = new cv.Mat();
		let cntValues = img1.findContours(cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
		let minX = img.rows;
		let minY = img.rows;
		let maxX = 0;
		let maxY = 0;
		let rectangleColor = new cv.Vec3(255, 0, 0);
		let count = 0;
		for (let cnt of cntValues){

			let rect = cnt.boundingRect();
			let contoursColor = new cv.Vec3(255, 255, 255);
			//cv.drawContours(img, contours, 0, contoursColor, 1, 8, hierarchy, 100);
			let point1 = new cv.Point2(rect.x, rect.y);
			let point2 = new cv.Point2(rect.x + rect.width, rect.y + rect.height);
			if (cnt.area > 1000){

				count += 1;
				if (rect.x < minX){
					minX = rect.x;
				}

				if (rect.y < minY){
					minY = rect.y;
				}

				if (rect.x + rect.width > maxX){
					maxX = rect.x + rect.width;
				}

				if (rect.y + rect.height > maxY) {
					maxY = rect.y + rect.height;
				}
				console.log(cnt);
				console.log("area : " + cnt.area);
				img.drawRectangle(point1, point2, rectangleColor, 2, cv.LINE_AA, 0);
			}
		}

		let point1 = new cv.Point2(minX, minY);
		let point2 = new cv.Point2(maxX, maxY);
		img.drawRectangle(point1, point2, rectangleColor, 2, cv.LINE_AA, 0);

		cv.imwrite("contours.png", img)

		if (count > 0){
			console.log("watermark present");
		}
		else {
			console.log("watermark absent");
		}
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

		return wm_outline[0];

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

let imgArr = loadImages('./images4/', 10);

let wm = new WatermarkAnalyzer(imgArr, imgArr[0].rows, imgArr[0].cols);
let wm_img = wm.initial_WM_estimation();
wm.extract_BoundBox(wm_img);
//console.log(wm)
