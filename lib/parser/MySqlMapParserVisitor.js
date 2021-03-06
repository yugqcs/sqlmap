const { SqlMapParserVisitor } = require('./SqlMapParserVisitor');
const { SqlMapParser } = require('./SqlMapParser');
const { SqlMapHelper } = require('./SqlMapHelper');

function MySqlMapParserVisitor() {
    SqlMapParserVisitor.call(this);

    this.isColonDeclare = false;
    this.sql = '';
    this.sqlTypeName = '';
    this.sqlId = '';
    this.nodeType = null;
    this.blockStack = [];
    this.hasLineEnd = true;
    this.tabIndex = 0;
    return this;
}

MySqlMapParserVisitor.prototype = Object.create(SqlMapParserVisitor.prototype);
MySqlMapParserVisitor.prototype.constructor = MySqlMapParserVisitor;

MySqlMapParserVisitor.prototype.init = function () {
    this.isColonDeclare = false;
    this.sql = '';
    this.sqlTypeName = '';
    this.sqlId = '';
    this.nodeType = null;
    this.blockStack = [];
    this.hasLineEnd = true;
    this.tabIndex = 0;
}

MySqlMapParserVisitor.prototype.currentBlock = function () {
    return this.blockStack.length > 0 ? this.blockStack[this.blockStack.length - 1] : null;
}

MySqlMapParserVisitor.prototype.evalSqlFunctionDeclare = function() {
    if (this.sql) {
        /* eslint-disable */
        eval(this.sql);
        /* eslint-enable */
        this.sql = '';
    }
}

// Visit a parse tree produced by SqlMapParser#root.
MySqlMapParserVisitor.prototype.visitRoot = function (ctx) {
    var ret = this.visitChildren(ctx);
    if (this.isColonDeclare) {
        this.tabIndex--;
        this.sql += SqlMapHelper.generateCloseBrace(this.tabIndex);
    }
    this.evalSqlFunctionDeclare();
    return ret;
};

// Visit a parse tree produced by SqlMapParser#sqlStatement.
MySqlMapParserVisitor.prototype.visitSqlStatement = function (ctx) {
    if (this.isColonDeclare) {
        this.tabIndex--;
        this.sql += SqlMapHelper.generateCloseBrace(this.tabIndex);
    }
    this.evalSqlFunctionDeclare();
    this.init();
    return this.visitChildren(ctx);
};

// Visit a parse tree produced by SqlMapParser#sqlDeclare.
/** @param {SqlDeclareContext} ctx */
MySqlMapParserVisitor.prototype.visitSqlDeclare = function (ctx) {
    this.sqlTypeName = ctx.children[0].symbol.text.substring(1);
    this.blockStack.push('sql');
    return this.visitChildren(ctx);
};

// Visit a parse tree produced by SqlMapParser#sqlBody.
MySqlMapParserVisitor.prototype.visitSqlBody = function (ctx) {
    return this.visitChildren(ctx);
};

// Visit a parse tree produced by SqlMapParser#sqlLine.
MySqlMapParserVisitor.prototype.visitSqlLine = function (ctx) {
    var params = [];
    var blankFlags = [];
    var hasContent = false;
    for (var i = 0; i < ctx.children.length; i++) {
        var context = ctx.children[i];

        var m = context.children[0].symbol.text.match(/^\s+$/);
        blankFlags.push(m);
        hasContent = hasContent || !m;

        if (context instanceof SqlMapParser.ParamContext) {
            params.push(context.children[0].symbol.text);
        }
    }

    if (!hasContent) return;

    var declare = SqlMapHelper.generateSqlLineDeclare(params, this.tabIndex);
    if (declare) {
        this.sql += declare;
        this.sql += SqlMapHelper.generateOpenBrace();
        this.tabIndex++;
        this.blockStack.push('line');
    }
    /* eslint-disable */
    for (var i = 0; i < ctx.children.length; i++) {
        var context = ctx.children[i];
        /* eslint-enable */
        if (!blankFlags[i]) {
            if (context instanceof SqlMapParser.PlainTextContext) {
                this.sql += SqlMapHelper.generateTextNodeCall(context.children[0].symbol.text, this.tabIndex);
            } else if (context instanceof SqlMapParser.ParamContext) {
                this.sql += SqlMapHelper.generateParamNodeCall(context.children[0].symbol.text, this.tabIndex);
            }
        }
    }
    if (declare) {
        this.blockStack.pop();
        this.tabIndex--;
        this.sql += SqlMapHelper.generateCloseBrace(this.tabIndex);
    }
    return this.visitChildren(ctx);
};

// Visit a parse tree produced by SqlMapParser#ifStatement.
MySqlMapParserVisitor.prototype.visitIfStatement = function (ctx) {
    return this.visitChildren(ctx);
};

// Visit a parse tree produced by SqlMapParser#ifDeclare.
MySqlMapParserVisitor.prototype.visitIfDeclare = function (ctx) {
    this.blockStack.push('if');
    return this.visitChildren(ctx);
};

// Visit a parse tree produced by SqlMapParser#forStatement.
MySqlMapParserVisitor.prototype.visitForStatement = function (ctx) {
    return this.visitChildren(ctx);
};

// Visit a parse tree produced by SqlMapParser#forDeclare.
MySqlMapParserVisitor.prototype.visitForDeclare = function (ctx) {
    this.blockStack.push('for');
    return this.visitChildren(ctx);
};

// Visit a parse tree produced by SqlMapParser#foreachStatement.
MySqlMapParserVisitor.prototype.visitForeachStatement = function (ctx) {
    return this.visitChildren(ctx);
};

// Visit a parse tree produced by SqlMapParser#foreachDeclare.
MySqlMapParserVisitor.prototype.visitForeachDeclare = function (ctx) {
    this.blockStack.push('foreach');
    return this.visitChildren(ctx);
};

// Visit a parse tree produced by SqlMapParser#inExpr.
MySqlMapParserVisitor.prototype.visitInExpr = function (ctx) {
    if (ctx.parentCtx instanceof SqlMapParser.ForDeclareContext) {
        var text = ctx.start.source[1].strdata.substring(ctx.start.start, ctx.stop.stop + 1);
        this.sql += SqlMapHelper.generateForDeclare(text, this.tabIndex);
    }
    return this.visitChildren(ctx);
};

// Visit a parse tree produced by SqlMapParser#indexExpr.
MySqlMapParserVisitor.prototype.visitIndexExpr = function (ctx) {
    if (ctx.parentCtx instanceof SqlMapParser.ForDeclareContext) {
        var text = ctx.start.source[1].strdata.substring(ctx.start.start, ctx.stop.stop + 1);
        this.sql += SqlMapHelper.generateForDeclare(text, this.tabIndex);
    }
    return this.visitChildren(ctx);
};

// Visit a parse tree produced by SqlMapParser#expr.
MySqlMapParserVisitor.prototype.visitExpr = function (ctx) {
    if (ctx.parentCtx instanceof SqlMapParser.IfDeclareContext) {
        var text = ctx.start.source[1].strdata.substring(ctx.start.start, ctx.stop.stop + 1);
        this.sql += SqlMapHelper.generateIfDeclare(text, this.tabIndex);
    }
    return this.visitChildren(ctx);
};

// Visit a parse tree produced by SqlMapParser#includeStatement.
MySqlMapParserVisitor.prototype.visitIncludeStatement = function (ctx) {
    this.blockStack.push('include');
    return this.visitChildren(ctx);
};

// Visit a parse tree produced by SqlMapParser#colon.
MySqlMapParserVisitor.prototype.visitColon = function (ctx) {
    this.isColonDeclare = true;
    this.sql += SqlMapHelper.generateOpenBrace();
    this.tabIndex++;
    return this.visitChildren(ctx);
};

// Visit a parse tree produced by SqlMapParser#openBrace.
MySqlMapParserVisitor.prototype.visitOpenBrace = function (ctx) {
    this.sql += SqlMapHelper.generateOpenBrace();
    this.tabIndex++;
    if (this.currentBlock() === 'for') {

    }
    return this.visitChildren(ctx);
};

// Visit a parse tree produced by SqlMapParser#closeBrace.
MySqlMapParserVisitor.prototype.visitCloseBrace = function (ctx) {
    this.tabIndex--;
    this.sql += SqlMapHelper.generateCloseBrace(this.tabIndex);
    if (this.currentBlock() === 'sql') {
        this.evalSqlFunctionDeclare();
    }
    this.blockStack.pop();
    return this.visitChildren(ctx);
};

// Visit a parse tree produced by SqlMapParser#openParen.
MySqlMapParserVisitor.prototype.visitOpenParen = function (ctx) {
    return this.visitChildren(ctx);
};

// Visit a parse tree produced by SqlMapParser#closeParen.
MySqlMapParserVisitor.prototype.visitCloseParen = function (ctx) {
    return this.visitChildren(ctx);
};

// Visit a parse tree produced by SqlMapParser#sqlId.
MySqlMapParserVisitor.prototype.visitSqlId = function (ctx) {
    if (this.currentBlock() === 'sql') {
        this.sqlId = ctx.children[0].symbol.text;
        this.sql += SqlMapHelper.generateFunctionDeclare(this.sqlTypeName, this.sqlId);
    } else if (this.currentBlock() === 'include') {
        var sqlId = ctx.children[0].symbol.text;
        this.sql += SqlMapHelper.generateIncludeNodeCall(sqlId, this.tabIndex);
        this.blockStack.pop();
    }
    return this.visitChildren(ctx);
};

// Visit a parse tree produced by SqlMapParser#param.
MySqlMapParserVisitor.prototype.visitParam = function (ctx) {
    return this.visitChildren(ctx);
};

// Visit a parse tree produced by SqlMapParser#plainText.
MySqlMapParserVisitor.prototype.visitPlainText = function (ctx) {
    return this.visitChildren(ctx);
};

// Visit a parse tree produced by SqlMapParser#nl.
MySqlMapParserVisitor.prototype.visitNl = function (ctx) {
    return this.visitChildren(ctx);
};

// Visit a parse tree produced by SqlMapParser#eof.
MySqlMapParserVisitor.prototype.visitEof = function (ctx) {
    if (this.isColonDeclare) {
        this.tabIndex--;
        this.sql += SqlMapHelper.generateCloseBrace(this.tabIndex);
    }
    console.log(this.sql);
    return this.visitChildren(ctx);
};

exports.MySqlMapParserVisitor = MySqlMapParserVisitor;
