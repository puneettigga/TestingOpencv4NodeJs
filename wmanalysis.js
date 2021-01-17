var cv = require("opencv4nodejs");
var rows = 100; // height
var cols = 100; // width
// empty Mat
var emptyMat = new cv.Mat(rows, cols, cv.CV_8UC3);
// fill the Mat with default value
var whiteMat = new cv.Mat(rows, cols, cv.CV_8UC1, 255);
var blueMat = new cv.Mat(rows, cols, cv.CV_8UC3, [255, 0, 0]);
console.log("Finally");
var img = cv.imread('./images/pic1.png');
cv.imwrite("image.png", img);
console.log(img);
var WatermarkAnalyzer = /** @class */ (function () {
    function WatermarkAnalyzer(imgArr, rw, col) {
        this.imgArray = imgArr;
        this.rows = rw;
        this.cols = col;
    }
    WatermarkAnalyzer.prototype.median = function (values) {
        values.sort(function (a, b) { return a - b; });
        var half = Math.floor(values.length / 2);
        if (values.length % 2)
            return values[half];
        else
            return (values[half - 1] + values[half]) / 2.0;
    };
    WatermarkAnalyzer.prototype.getMedianArray = function (arr) {
        var result = [];
        for (var i = 0; i < this.rows; i++) {
            var arr2d = [];
            for (var j = 0; j < this.cols; j++) {
                var arr1d = [];
                for (var k = 0; k < arr.length; k++) {
                    arr1d.push(arr[k].at(i, j));
                }
                arr2d.push(this.median(arr1d));
                //result.at(i,j) = this.median(arr1d);
            }
            result.push(arr2d);
        }
        //let mat = new cv.Mat(result, cv.CV_32F);
        return result;
    };
    WatermarkAnalyzer.prototype.extract_WM_outline = function () {
        var gradxArr = [];
        var gradyArr = [];
        var count = 0;
        console.log("Calculating gradx and grady (sobel filter) ...");
        for (var _i = 0, _a = this.imgArray; _i < _a.length; _i++) {
            var img_1 = _a[_i];
            var gradx = img_1.sobel(cv.CV_32F, 1, 0, 1);
            var grady = img_1.sobel(cv.CV_32F, 0, 1, 1);
            gradxArr.push(gradx);
            gradyArr.push(grady);
        }
        console.log("Calculating median of watermark gradient ...");
        var wm_gradients_x = this.getMedianArray(gradxArr);
        console.log("Calculated.");
        console.log(wm_gradients_x.length);
        console.log(wm_gradients_x[0].length);
        console.log(wm_gradients_x[0][0]);
        var wm_gradients_y = this.getMedianArray(gradyArr);
        var watermark = [];
        var minPx = 255;
        var maxPx = 0;
        console.log("Estimate watermark ...");
        for (var i = 0; i < this.rows; i++) {
            var rwMat = [];
            //if (i % 100 == 0) {
            //console.log(i);
            //}
            for (var j = 0; j < this.cols; j++) {
                //console.log("j = " + j);
                //console.log(wm_gradients_x[i][j] + " , " + wm_gradients_y[i][j]);
                var pix_abs = Math.sqrt(Math.pow(wm_gradients_x[i][j], 2) + Math.pow(wm_gradients_y[i][j], 2));
                //console.log("sqrt, square : " + pix_abs);
                rwMat.push(pix_abs);
                if (pix_abs > maxPx) {
                    maxPx = pix_abs;
                }
                if (pix_abs < minPx) {
                    minPx = pix_abs;
                }
            }
            watermark.push(rwMat);
        }
        console.log("watermark estimated.");
        for (var i = 0; i < this.rows; i++) {
            for (var j = 0; j < this.cols; j++) {
                //watermark[i][j] = 255 * (watermark[i][j] - minPx) / (maxPx - minPx) ;
                //watermark[i][j] = (watermark[i][j] - minPx) / (maxPx - minPx) ;
                if (watermark[i][j] > 0.4) {
                    watermark[i][j] = 255;
                }
                else {
                    watermark[i][j] = 0;
                }
            }
        }
        console.log("watermark thresholding");
        var nw_watermark = new cv.Mat(watermark, cv.CV_32F);
        cv.imwrite("watermark.png", nw_watermark);
        //nw_watermark = nw_watermark.threshold(0.5,1,cv.THRESH_BINARY);
        return [nw_watermark, wm_gradients_x, wm_gradients_y];
    };
    WatermarkAnalyzer.prototype.initial_WM_estimation = function () {
        var wm_outline = this.extract_WM_outline();
        cv.imwrite("outline.png", wm_outline[0]);
    };
    return WatermarkAnalyzer;
}());
function loadImages(path, noImg) {
    var imgArr = [];
    for (var i = 0; i < noImg; i++) {
        var imgPath = path + 'pic' + (i + 1).toString() + '.png';
        console.log(imgPath);
        var img_2 = cv.imread(imgPath).cvtColor(cv.COLOR_RGB2GRAY);
        ;
        imgArr.push(img_2);
    }
    return imgArr;
}
function convertCVmatrix(mat) {
    var rw = mat.rows;
    var col = mat.cols;
    var simpleMat = [];
    for (var i = 0; i < rw; i++) {
        var arr = [];
        for (var j = 0; j < col; j++) {
            arr.push(mat.at(i, j));
        }
        simpleMat.push(arr);
    }
    return simpleMat;
}
var imgArr = loadImages('./images/', 10);
console.log(imgArr[0].rows);
console.log(imgArr[0].cols);
var result = [];
var count = 0;
//let mat = cv.matFromArray(3, 4, Number, result);
for (var i = 0; i < 3; i++) {
    var rww = [];
    for (var j = 0; j < 4; j++) {
        rww.push(i + j);
        //mat[i][j] = i + j;
        count = 1;
        //result.data[i * 4 + j] = i + j;
    }
    result.push(rww);
}
var arrayyy = [[1, 2, 3, 4]];
var mat = new cv.Mat(arrayyy, cv.CV_32F);
result[0][0] = 10;
console.log(result);
//imgArr[0].at(0,5) = 45;
console.log(imgArr[0].at(0, 5));
var wm = new WatermarkAnalyzer(imgArr, imgArr[0].rows, imgArr[0].cols);
wm.initial_WM_estimation();
//console.log(wm)
/*
let sq = Math.sqrt(Math.pow(3,2) + Math.pow(4,2));

console.log("5 = " + sq);

let result1 = new cv.Mat(result, cv.CV_32F);
console.log(convertCVmatrix(result1));
let mat1 = result1.threshold(4, 1, cv.THRESH_BINARY);
console.log(convertCVmatrix(mat1)); */ 
