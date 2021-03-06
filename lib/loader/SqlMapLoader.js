var fs = require('fs');
var path = require('path');

function SqlMapLoader() { }

function traverseDirectory(dir, callback) {
    var dirList = [];
    fs.readdir(dir, function (err, list) {
        dir = fs.realpathSync(dir);
        if (err) {
            return callback(err);
        }
        var len = list.length;
        list.forEach(function (file) {
            file = dir + '/' + file;
            fs.stat(file, function (err, stat) {
                if (err) throw new Error('Load directory files failed.');
                dirList.push(file);
                if (stat && stat.isDirectory()) {
                    traverseDirectory(file, function (err, parsed) {
                        if (err) throw new Error('Load directory files failed.');
                        dirList = dirList.concat(parsed);
                        if (!--len) {
                            callback(null, dirList);
                        }
                    });
                } else {
                    if (!--len) {
                        callback(null, dirList);
                    }
                }
            });
        });
    });
}

SqlMapLoader.loadSqlMapFile = function (fileName, parseFunction, callback) {
    var input = fs.readFileSync(fileName).toString();
    if (typeof parseFunction === 'function') parseFunction(input);
    if (typeof callback === 'function') callback(null, [path.resolve(fileName)]);
}

SqlMapLoader.loadSqlMapDir = function (dirName, parseFunction, callback) {
    traverseDirectory(dirName, function (err, result) {
        if (err) {
            console.log(err);
            if (typeof callback === 'function') {
                callback(err);
            }
        } else {
            // console.log(result);
            var fileList = [];
            /** @type {array} */
            var res = result;
            for (var i = 0; i < res.length; i++) {
                var ext = path.extname(res[i]);
                if (ext && ext.toLowerCase() === '.sql') {
                    fileList.push(res[i]);
                    SqlMapLoader.loadSqlMapFile(res[i], parseFunction);
                }
            }
            if (typeof callback === 'function') {
                callback(null, fileList);
            }
        }
    });
}

exports.SqlMapLoader = SqlMapLoader;
