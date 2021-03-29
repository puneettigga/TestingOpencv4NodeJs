var cv = require("opencv4nodejs");
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
    WatermarkAnalyzer.prototype.method1_modify = function (arrx, arry) {
        // For checking purpose (intersection on gradient method)
        var gradxy = [];
        for (var k = 0; k < arrx.length; k++) {
            var rowArrxy = [];
            for (var i = 0; i < this.rows; i++) {
                var colxy = [];
                for (var j = 0; j < this.cols; j++) {
                    var value = Math.pow(arrx[k].at(i, j), 2) + Math.pow(arry[k].at(i, j), 2);
                    colxy.push(value);
                }
                rowArrxy.push(colxy);
            }
            gradxy.push(rowArrxy);
        }
        var wGxy = [];
        for (var i = 0; i < this.rows; i++) {
            var rowx = [];
            for (var j = 0; j < this.cols; j++) {
                var found = 1;
                for (var k = 0; k < gradxy.length; k++) {
                    if (gradxy[k][i][j] == 0) {
                        found = 0;
                        break;
                    }
                }
                if (found == 1) {
                    rowx.push(255.0);
                }
                else {
                    rowx.push(0.0);
                }
            }
            wGxy.push(rowx);
        }
        // --------------------------------------------------------
        var nw_watermark = new cv.Mat(wGxy, cv.CV_32F);
        cv.imwrite("new_m1.jpg", nw_watermark);
        return wGxy;
    };
    WatermarkAnalyzer.prototype.extract_BoundBox = function (img, path) {
        console.log("extract_BOUNDBOX");
        var img1 = img.convertTo(cv.CV_8UC1);
        var contours = new cv.Mat();
        var hierarchy = new cv.Mat();
        var cntValues = img1.findContours(cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
        var minX = img.rows;
        var minY = img.rows;
        var maxX = 0;
        var maxY = 0;
        var rectangleColor = new cv.Vec3(255, 0, 0);
        var count = 0;
        for (var _i = 0, cntValues_1 = cntValues; _i < cntValues_1.length; _i++) {
            var cnt = cntValues_1[_i];
            var rect = cnt.boundingRect();
            var contoursColor = new cv.Vec3(255, 255, 255);
            //cv.drawContours(img, contours, 0, contoursColor, 1, 8, hierarchy, 100);
            var point1_1 = new cv.Point2(rect.x, rect.y);
            var point2_1 = new cv.Point2(rect.x + rect.width, rect.y + rect.height);
            if (rect.width > 30 && rect.height > 30) {
                count += 1;
                if (rect.x < minX) {
                    minX = rect.x;
                }
                if (rect.y < minY) {
                    minY = rect.y;
                }
                if (rect.x + rect.width > maxX) {
                    maxX = rect.x + rect.width;
                }
                if (rect.y + rect.height > maxY) {
                    maxY = rect.y + rect.height;
                }
                //console.log(cnt);
                //console.log("area : " + cnt.area);
                img.drawRectangle(point1_1, point2_1, rectangleColor, 2, cv.LINE_AA, 0);
            }
        }
        var point1 = new cv.Point2(minX, minY);
        var point2 = new cv.Point2(maxX, maxY);
        img.drawRectangle(point1, point2, rectangleColor, 2, cv.LINE_AA, 0);
        if (count > 0) {
            console.log("watermark present");
        }
        else {
            console.log("watermark absent");
        }
        return img;
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
        var wGxy = this.method1_modify(gradxArr, gradyArr);
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
                if (watermark[i][j] > 0.5) {
                    watermark[i][j] = 255;
                }
                else {
                    watermark[i][j] = 0;
                }
            }
        }
        console.log("watermark thresholding");
        var nw_watermark = new cv.Mat(watermark, cv.CV_32F);
        //cv.imwrite("watermark.png", nw_watermark);
        //nw_watermark = nw_watermark.threshold(0.5,1,cv.THRESH_BINARY);
        return [nw_watermark, wm_gradients_x, wm_gradients_y];
    };
    WatermarkAnalyzer.prototype.initial_WM_estimation = function (path) {
        var wm_outline = this.extract_WM_outline();
        cv.imwrite(path + "watermark.png", wm_outline[0]);
        return wm_outline[0];
    };
    WatermarkAnalyzer.prototype.method2 = function (imgArr, path) {
        var watermark = [];
        for (var i = 0; i < imgArr[0].rows; i++) {
            var wmRw = [];
            for (var j = 0; j < imgArr[0].cols; j++) {
                var found = 1;
                for (var _i = 0, imgArr_1 = imgArr; _i < imgArr_1.length; _i++) {
                    var img_2 = imgArr_1[_i];
                    if (img_2.at(i, j) == 255) {
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
        var wm_mat = new cv.Mat(watermark, cv.CV_32F);
        cv.imwrite(path + "wm_method2.jpg", wm_mat);
        var wm_bb = this.extract_BoundBox(wm_mat, path);
        cv.imwrite(path + "outline_m2.jpg", wm_bb);
    };
    return WatermarkAnalyzer;
}());
function loadImages(path, noImg) {
    var imgArr = [];
    for (var i = 0; i < noImg; i++) {
        var imgPath = path + 'pic' + (i + 1).toString() + '.jpg';
        //console.log(imgPath);
        var img_3 = cv.imread(imgPath).cvtColor(cv.COLOR_RGB2GRAY);
        ;
        imgArr.push(img_3);
        console.log(img_3.rows + " , " + img_3.cols);
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
var path = './Data/WaterMark/File3/';
var imgArr = loadImages(path, 5);
var wm = new WatermarkAnalyzer(imgArr, imgArr[0].rows, imgArr[0].cols);
var wm_img = wm.initial_WM_estimation(path);
var img = wm.extract_BoundBox(wm_img, path);
cv.imwrite(path + "contours.png", img);
//console.log(wm)
var imgArr1 = loadImages(path, 5);
wm.method2(imgArr1, path);
