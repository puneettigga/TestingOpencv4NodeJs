var cv = require("opencv4nodejs");
var fs = require('fs');
var Path = require('path');
var WatermarkAnalyzer = /** @class */ (function () {
    function WatermarkAnalyzer(imgArr, rw, col) {
        this.imgArray = imgArr;
        this.rows = rw;
        this.cols = col;
    }
    // function to get median 
    WatermarkAnalyzer.prototype.median = function (values) {
        values.sort(function (a, b) { return a - b; }); // sort numbers in increasing order
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
    // function to extract out repeated pattern from background images by taking the intersection of the gradient
    // images calulated using sobel filter
    WatermarkAnalyzer.prototype.method1_modify = function (arrx, arry) {
        var gradxy = [];
        for (var k = 0; k < arrx.length; k++) {
            var rowArrxy = [];
            for (var i = 0; i < this.rows; i++) {
                var colxy = [];
                for (var j = 0; j < this.cols; j++) {
                    var value = Math.sqrt(Math.pow(arrx[k].at(i, j), 2) + Math.pow(arry[k].at(i, j), 2));
                    if (value > 5) {
                        colxy.push(value);
                    }
                    else {
                        colxy.push(0);
                    }
                }
                rowArrxy.push(colxy);
            }
            var mat = new cv.Mat(rowArrxy, cv.CV_32F);
            cv.imwrite("eg" + (k + 1).toString() + ".jpg", mat);
            gradxy.push(rowArrxy);
        }
        var wGxy = [];
        for (var i = 0; i < this.rows; i++) {
            var rowx = [];
            for (var j = 0; j < this.cols; j++) {
                var found = 1;
                var count = 0;
                var value = 0;
                for (var k = 0; k < gradxy.length; k++) {
                    value += gradxy[k][i][j];
                    count += 1;
                    if (gradxy[k][i][j] == 0) {
                        found = 0;
                        break;
                    }
                }
                if (found == 1) {
                    var avgValue = value / count;
                    rowx.push(255); //255
                }
                else {
                    rowx.push(0);
                }
            }
            wGxy.push(rowx);
        }
        // --------------------------------------------------------
        var nw_watermark = new cv.Mat(wGxy, cv.CV_32F);
        cv.imwrite("new_m1.jpg", nw_watermark);
        return nw_watermark;
    };
    // function extracts the bounding box of all the connected components from the extracted watermark region and
    // check whether the bounding box obtained are greater than some range else ignore the bounding box.
    // If bounding box present then watermark is present else absent. Get the area of watermark region by getting the minimum and 
    // and maximum cordinates of the bounding boxes.
    WatermarkAnalyzer.prototype.extract_BoundBox = function (img, path) {
        //console.log("extract_BOUNDBOX");
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
        var cntCount = 0;
        for (var _i = 0, cntValues_1 = cntValues; _i < cntValues_1.length; _i++) {
            var cnt = cntValues_1[_i];
            var rect = cnt.boundingRect();
            var contoursColor = new cv.Vec3(255, 255, 255);
            var point1_1 = new cv.Point2(rect.x, rect.y);
            var point2_1 = new cv.Point2(rect.x + rect.width, rect.y + rect.height);
            if (rect.width > 30 && rect.height > 30) { //change 30
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
                img.drawRectangle(point1_1, point2_1, rectangleColor, 2, cv.LINE_AA, 0);
            }
            else {
                var contoursColor2 = new cv.Vec3(100, 0, 0);
                img.drawRectangle(point1_1, point2_1, contoursColor2, 2, cv.LINE_AA, 0);
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
        return [img, minX, minY, maxX, maxY, count];
    };
    // function calculates the gradient of the images and use the intersection technique to extract the watermark outline
    WatermarkAnalyzer.prototype.extract_WM_outline = function () {
        var gradxArr = [];
        var gradyArr = [];
        var count = 0;
        var val = 1;
        for (var _i = 0, _a = this.imgArray; _i < _a.length; _i++) {
            var img = _a[_i];
            var gradx = img.sobel(cv.CV_32F, 1, 0, 1);
            var grady = img.sobel(cv.CV_32F, 0, 1, 1);
            gradxArr.push(gradx);
            gradyArr.push(grady);
            cv.imwrite("sgx" + val + ".jpg", gradx);
            cv.imwrite("sgy" + val + ".jpg", grady);
            val += 1;
        }
        var wGxy = this.method1_modify(gradxArr, gradyArr); // get intersection of gradient images
        return wGxy;
    };
    // intersection of grayscale images to check the repeated patterns
    WatermarkAnalyzer.prototype.method2 = function (imgArr, path) {
        var watermark = [];
        for (var i = 0; i < imgArr[0].rows; i++) {
            var wmRw = [];
            for (var j = 0; j < imgArr[0].cols; j++) {
                var found = 1;
                var count = 0;
                var value = 0;
                for (var _i = 0, imgArr_1 = imgArr; _i < imgArr_1.length; _i++) {
                    var img = imgArr_1[_i];
                    value += img.at(i, j);
                    count += 1;
                    if (img.at(i, j) == 255 || img.at(i, j) < 5) {
                        found = 0;
                        break;
                    }
                }
                if (found == 1) {
                    var avgValue = value / count;
                    wmRw.push(avgValue);
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
        cv.imwrite(path + "outline_m2.jpg", wm_bb[0]);
        return wm_bb;
    };
    return WatermarkAnalyzer;
}());
function loadImages(imgLocation) {
    var imgArr = [];
    for (var _i = 0, imgLocation_1 = imgLocation; _i < imgLocation_1.length; _i++) {
        var imgPath = imgLocation_1[_i];
        console.log(imgPath);
        var img = cv.imread(imgPath).cvtColor(cv.COLOR_RGB2GRAY);
        var gb_img = img.gaussianBlur(new cv.Size(5, 5), 1.2);
        imgArr.push(img);
        //let grayImg = path + 'g' + (i+1).toString() + '.jpg';
        //cv.imwrite(grayImg, gb_img);
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
function getFilesRecursive(directoryPath, imgLocation) {
    if (fs.existsSync(directoryPath)) {
        fs.readdirSync(directoryPath).forEach(function (file, index) {
            var curPath = Path.join(directoryPath, file);
            if (fs.lstatSync(curPath).isDirectory()) {
                // recurse
                getFilesRecursive(curPath, imgLocation);
            }
            else {
                // delete file
                if (curPath.includes('.jpg')) {
                    // Found world
                    //console.log(curPath);
                    imgLocation.push(curPath);
                }
                //fs.unlinkSync(curPath);
            }
        });
        //fs.rmdirSync(directoryPath);
    }
}
function start(path) {
    //let path = './Data/WaterMark/File3/'
    var imgLocation = [];
    getFilesRecursive(path, imgLocation);
    var imgArr = loadImages(imgLocation);
    var wm = new WatermarkAnalyzer(imgArr, imgArr[0].rows, imgArr[0].cols);
    var wm_img = wm.extract_WM_outline();
    var bb1 = wm.extract_BoundBox(wm_img, path);
    var img1 = bb1[0];
    //cv.imwrite(path + "contours.png", img1)
    var imgArr1 = loadImages(imgLocation);
    var bb3 = wm.method2(imgArr1, path);
    return bb3; // returns the referenced watermark img and the information regarding the bounding box of watermark estimated
}
var path = process.argv.slice(2);
start(path[0]);
