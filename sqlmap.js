var fs = require('fs');
var mysql = require('mysql');
var antlr4 = require('antlr4');
const { SqlMapLexer } = require('./lib/parser/SqlMapLexer');
const { SqlMapParser } = require('./lib/parser/SqlMapParser');
const { MySqlMapParserVisitor } = require('./lib/parser/MySqlMapParserVisitor');
const { SqlMapLoader } = require('./lib/loader/SqlMapLoader');
const { SqlMapHelper } = require('./lib/parser/SqlMapHelper');

function SqlMap(masterConfig, slaveConfigs, poolClusterConfig) {
    this.debug = false;
    this.poolCluster = mysql.createPoolCluster(poolClusterConfig);
    // add named configuration
    this.poolCluster.add('MASTER', masterConfig);
    this.hasSlave = false;
    if (Array.isArray(slaveConfigs)) {
        for (var i = 0; i < slaveConfigs.length; i++) {
            this.poolCluster.add('SLAVE' + (i + 1), slaveConfigs[i]);
            this.hasSlave = true;
        }
    } else if (slaveConfigs instanceof Object) {
        this.poolCluster.add('SLAVE1', slaveConfigs);
        this.hasSlave = true;
    }
}

SqlMap.parse = function (input) {
    var chars = new antlr4.InputStream(input);
    var lexer = new SqlMapLexer(chars);
    var tokens = new antlr4.CommonTokenStream(lexer);
    var parser = new SqlMapParser(tokens);
    parser.buildParseTrees = true;
    var tree = parser.root();
    var visitor = new MySqlMapParserVisitor();
    visitor.visitRoot(tree);
}

SqlMap.emitSql = function (sqlId, _paramObject) {
    var _sqlArr = [];
    var _values = [];

    var func = SqlMapHelper.getSqlFunction(sqlId);
    if (func) {
        func(_paramObject, _sqlArr, _values);
        return {
            func: func.name,
            sql: _sqlArr.join(''),
            values: _values
        };
    }
    throw new Error('Sql map \'' + sqlId + '\' not found!');
}

function querySql(sqlMap, sql, values, callback, isQuery) {
    sqlMap.log(sqlMap.hasSlave ? 'Slave' : 'Master');
    var t1 = new Date();
    var pool = null;
    if (isQuery && sqlMap.hasSlave) {
        pool = sqlMap.poolCluster.of('SLAVE*', 'RANDOM');
    } else {
        pool = sqlMap.poolCluster.of('MASTER');
    }
    pool.query(sql, values, function (err, results, fields) {
        var self = this;
        if (err) {
            if (callback) callback(err);
            else throw err;
        } else {
            var t2 = new Date();
            sqlMap.log(self.sql);
            sqlMap.log('Time: ' + (t2.getUTCMilliseconds() - t1.getUTCMilliseconds()) + ' ms.');
            if (callback) {
                callback(null, results, fields);
            }
        }
    });
}

SqlMap.prototype.log = function (msg) {
    if (this.debug) {
        console.log(msg);
    }
}

SqlMap.prototype.query = function (sql, values, callback) {
    if (typeof sql !== 'string') {
        throw new Error('Parameter \'sql\' requires a string!');
    }
    querySql(this, sql, values, callback);
};

SqlMap.prototype.queryAsync = function (sql, values) {
    var self = this;
    return new Promise(function (resolve, reject) {
        self.query(sql, values, function (err, result) {
            if (err) return reject(err);
            return resolve(result);
        });
    });
}

SqlMap.prototype.dQuery = function (sqlId, values, callback) {
    if (typeof sqlId !== 'string') {
        throw new Error('Parameter \'sql\' requires a string!');
    }
    /* eslint-disable */
    if (values && values !== new Object(values)) {
        throw new Error('Parameter \'values\' requires an object or empty!');
    }
    /* eslint-enable */
    this.log('-------------------------');
    this.log('Sql id: ' + sqlId);
    var sql = SqlMap.emitSql(sqlId, values);
    console.error(sql.sql);
    querySql(this, sql.sql, sql.values, callback, sql.func.startsWith('select'));
};

SqlMap.prototype.dQueryAsync = function (sqlId, values) {
    var self = this;
    return new Promise(function (resolve, reject) {
        self.dQuery(sqlId, values, function (err, result) {
            if (err) return reject(err);
            return resolve(result);
        });
    });
}

SqlMap.prototype.destroy = function (callback) {
    this.poolCluster.end(callback);
};

SqlMap.prototype.destroyAsync = function () {
    var self = this;
    return new Promise(function (resolve, reject) {
        self.destroy(function (err, result) {
            if (err) return reject(err);
            return resolve(result);
        });
    });
}

function _loadSqlMaps(path, callback) {
    var stat = fs.statSync(path);
    if (stat) {
        if (stat.isFile()) {
            SqlMapLoader.loadSqlMapFile(path, SqlMap.parse, callback);
        }
        if (stat.isDirectory()) {
            SqlMapLoader.loadSqlMapDir(path, SqlMap.parse, callback);
        }
    }
};

SqlMap.loadSqlMaps = function (path) {
    _loadSqlMaps(path, null);
}

SqlMap.loadSqlMapsAsync = function (path) {
    return new Promise(function (resolve, reject) {
        _loadSqlMaps(path, function (err, result) {
            if (err) return reject(err);
            return resolve(result);
        });
    });
}

module.exports.SqlMap = SqlMap;
