var fs = require('fs');
var antlr4 = require("antlr4");
var SqlMapLexer = require("../../src/parser/SqlMapLexer");
var SqlMapParser = require("../../src/parser/SqlMapParser");
var SqlMapListener = require("../../src/parser/SqlMapListener");
var SqlMapVisitor = require("../../src/parser/SqlMapVisitor");
var MySqlMapVisitor = require("../../src/parser/MySqlMapVisitor");
var SqlMapSql = require("../../src/parser/SqlMapSql");

var input = fs.readFileSync("C:\\Code\\SqlMap\\test\\parser\\sql.sql").toString();
var chars = new antlr4.InputStream(input);
var lexer = new SqlMapLexer.SqlMapLexer(chars);
var tokens  = new antlr4.CommonTokenStream(lexer);
var parser = new SqlMapParser.SqlMapParser(tokens);
parser.buildParseTrees = true;
var tree = parser.root(); 
// var listener = new MySqlMapListener.MySqlMapListener();
// antlr4.tree.ParseTreeWalker.DEFAULT.walk(listener, tree);
var context = new SqlMapSql.SqlMapContext();
var visitor = new MySqlMapVisitor.MySqlMapVisitor(context);
visitor.visitRoot(tree);
context.check();
console.log(context.sqlMap);