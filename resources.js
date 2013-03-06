var fs = require('fs');

var resourcefiles = {
	'_lucos': { filename: __dirname+"/lucos.js", type: 'js'}
};

/**
 * Adds a resource file to the list
 * 
 * @param String key - A unqiue key to identify the file on the client
 * @param String type - tells the client how to parse the file
 * @param String filename - Where in the filesystem the file is stored
 */
exports.add = function (key, type, filename) {
	resourcefiles[key] = {filename: filename, type: type};
}

/**
 * Loads the relevant files
 * 
 * @param ServerResponse res
 * @param String version - The version sent to the client the last time it requested resources
 */
exports.load = function (res, version) {
	var ii;
	var output = {};
	var filenum = 0;
	var totalfiles = 0;
	var vtime = new Date(parseInt(version)*1000);
	var newvtime = vtime;
	var resources = {};
	var isReady = function _isReady() {
		filenum++;
		if (filenum < totalfiles) return;
		output.v = newvtime.getTime() / 1000;
		output.r = resources;
		res.writeHead(200, {'Content-Type': "application/json"});
		res.write(JSON.stringify(output));
		res.end();
	}
	for (ii in resourcefiles) {
		(function _addFileToOutput(key, filename, type) {
			resources[key] = type;
			fs.stat(filename, function _gotstat(err, stats) {
				if (err) {
					isReady();
					return;
				}
				var mtime = new Date(stats.mtime);
				if (mtime > vtime) {
					if (mtime > newvtime) newvtime = mtime;
					fs.readFile(filename, function _gotfile(err, data) {
						if (err) {
							isReady();
							return;
						}
						output[key] = data.toString();
						isReady();
					});
				} else {
					isReady();
				}
			});
		})(ii, resourcefiles[ii].filename, resourcefiles[ii].type);
		totalfiles++;
	}
}
