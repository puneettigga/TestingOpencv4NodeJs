
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

	public method1_modify(arrx: any, arry:any): any {
		// For checking purpose (intersection on gradient method)

		let gradxy = [];

		for (let k = 0; k < arrx.length; k++){
			let rowArrxy = [];
			for (let i = 0; i < this.rows; i++) {
				let colxy = [];
				for (let j = 0; j < this.cols; j++) {
					let value = Math.pow(arrx[k].at(i,j),2) + Math.pow(arry[k].at(i,j),2);
					colxy.push(value);
				}
				rowArrxy.push(colxy);
			}
			gradxy.push(rowArrxy);
		}
		
		let wGxy = [];
		
		for (let i = 0; i < this.rows; i++) {
			let rowx = [];
			for (let j = 0; j < this.cols; j++) {
				let found = 1;
				for (let k = 0; k < gradxy.length; k++){

					if (gradxy[k][i][j] == 0) {
						found = 0;
						break;
					}
				}

				if (found == 1){
					rowx.push(255);
				}
				else {
					rowx.push(0);
				}
			}

			wGxy.push(rowx);
		}

		// --------------------------------------------------------
		let nw_watermark = new cv.Mat(wGxy, cv.CV_32F);
		cv.imwrite("new_m1.jpg",nw_watermark);
		return nw_watermark;
	}

	public extract_BoundBox(img : any, path:string): any {

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
			if (rect.width > 30 && rect.height > 30){

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
				//console.log(cnt);
				//console.log("area : " + cnt.area);
				img.drawRectangle(point1, point2, rectangleColor, 2, cv.LINE_AA, 0);
			}

			else {
				//img.fillPoly(point1,point2,0);
				/*for (let y = rect.y; y < rect.height; y++) {
					for (let x = rect.x; x < rect.width; x++) {

					}
				}*/
			}
		}

		let point1 = new cv.Point2(minX, minY);
		let point2 = new cv.Point2(maxX, maxY);
		img.drawRectangle(point1, point2, rectangleColor, 2, cv.LINE_AA, 0);

		if (count > 0){
			console.log("watermark present");
		}
		else {
			console.log("watermark absent");
		}

		return img;
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

		let wGxy = this.method1_modify(gradxArr, gradyArr);

		console.log("Calculating median of watermark gradient ...");
		let wm_gradients_x = this.getMedianArray(gradxArr);
		console.log("Calculated.");
		//console.log(wm_gradients_x.length);
		//console.log(wm_gradients_x[0].length);
		//console.log(wm_gradients_x[0][0]);
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
		//cv.imwrite("watermark.png", nw_watermark);
		//nw_watermark = nw_watermark.threshold(0.5,1,cv.THRESH_BINARY);

		return [nw_watermark, wGxy];


	}

	public initial_WM_estimation(path:string): any {

		let wm_outline = this.extract_WM_outline();

		cv.imwrite(path + "watermark.png",wm_outline[0]);

		return wm_outline;

	}

	public method2(imgArr:any , path:string): any {

		let watermark = [];

		for (let i = 0; i < imgArr[0].rows; i++) {
			let wmRw = [];
			for (let j = 0; j<imgArr[0].cols; j++){
				let found = 1;
				for (let img of imgArr) {
					if (img.at(i,j) == 255) {
						found = 0;
						break;
					}
				}

				if (found == 1) {
					wmRw.push(255);
				}
				else {
					wmRw.push(0);
				}
			}

			watermark.push(wmRw);
		}

		let wm_mat = new cv.Mat(watermark, cv.CV_32F);
		cv.imwrite(path + "wm_method2.jpg",wm_mat);

		let wm_bb = this.extract_BoundBox(wm_mat, path);

		cv.imwrite(path + "outline_m2.jpg", wm_bb);
	}

	public histogram_analysis(imgArr:any , path:string){

	}
}

function loadImages(path:string, noImg:number): any{
	let imgArr = [];

	for (let i = 0; i < noImg; i++){
		let imgPath = path + 'pic' + (i+1).toString() + '.jpg';
		let img = cv.imread(imgPath).cvtColor(cv.COLOR_RGB2GRAY);
		let gb_img = img.gaussianBlur(new cv.Size(5, 5), 1.2);
		imgArr.push(img);
		let grayImg = path + 'g' + (i+1).toString() + '.jpg';
		cv.imwrite(grayImg, gb_img);

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

/*
function removeWatermark(array:any, imgArr:any):any {
	
	let refImg = array[0];

	for (let i = array[1]; i < array[3]; i++){
		for (let j = array[2]; j < array[4]; j++){
			let topPixel = imgArr.at(i-1,j);
			let backPixel = imgArr.at(i,j-1);
			if (refImg.at(i,j) != 0) {
				
			}
		}
	}
}*/



function start(path:string , noImg:number): any {

	//let path = './Data/WaterMark/File3/'

	let imgArr = loadImages(path, noImg);

	let wm = new WatermarkAnalyzer(imgArr, imgArr[0].rows, imgArr[0].cols);
	let wm_img = wm.extract_WM_outline();
	let bb1 = wm.extract_BoundBox(wm_img, path);
	let img1 = bb1[0];

	//cv.imwrite(path + "contours.png", img1)

	let imgArr1 = loadImages(path, 5);
	let bb3 = wm.method2(imgArr1, path);

	return bb3; // returns the referenced watermark img and the information regarding the bounding box of watermark estimated
}



start('./Data/WaterMark/File3/', 3);

