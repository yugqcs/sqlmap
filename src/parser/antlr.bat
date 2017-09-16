@ECHO OFF

SET CLASSPATH=..\..\tools\antlr-4.7-complete.jar
SET Namespace=db.parser
SET G4Folder=%~dp0
SET Options=-Dlanguage=JavaScript -package %Namespace% -visitor -listener -encoding UTF8

SET G4File=SqlMap
DEL /Q ^
	%G4Folder%%G4File%.tokens ^
	%G4Folder%%G4File%.js				
SET FullPath=%G4Folder%%G4File%.g4
JAVA org.antlr.v4.Tool %FullPath% %Options%
