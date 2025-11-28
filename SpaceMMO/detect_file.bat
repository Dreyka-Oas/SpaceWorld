@ECHO OFF
SETLOCAL ENABLEDELAYEDEXPANSION
:: Définit les noms de fichiers
SET "outputFile=resultats_recherche.txt"
SET "scriptName=%~nx0"
SET "startDir=%CD%"

:: Suppression du fichier de sortie s'il existe déjà 
IF EXIST "%outputFile%" (
    ECHO Suppression de l'ancien fichier de resultats...
    DEL "%outputFile%"
)

:: Initialisation
ECHO.
ECHO ========================================
ECHO   RECHERCHE DE FICHIERS EN COURS
ECHO ========================================
ECHO.
ECHO Repertoire de depart : %startDir%
ECHO Fichier de sortie    : %outputFile%
ECHO.

:: En-tête optimisé pour Google AI Studio
(
    ECHO # DOCUMENTATION DU PROJET
    ECHO.
    ECHO ## INFORMATIONS GENERALES
    ECHO.
    ECHO **Date de generation :** %DATE% %TIME%
    ECHO **Repertoire analyse :** %startDir%
    ECHO.
    ECHO ---
    ECHO.
) > "%outputFile%"

SET "fileCount=0"

:: Fonction récursive pour parcourir les dossiers
CALL :ProcessDirectory "%startDir%"

:: Pied de page avec les statistiques
(
    ECHO.
    ECHO ---
    ECHO.
    ECHO ## STATISTIQUES DU PROJET
    ECHO.
    ECHO **Nombre total de fichiers analyses :** !fileCount!
    ECHO **Date de fin :** %DATE% %TIME%
    ECHO.
    ECHO ---
    ECHO.
) >> "%outputFile%"

ECHO.
ECHO ========================================
ECHO   OPERATION TERMINEE AVEC SUCCES !
ECHO ========================================
ECHO.
ECHO   Fichiers traites : !fileCount!
ECHO   Resultats enregistres dans : %outputFile%
ECHO.
GOTO :EOF

:ProcessDirectory
SET "currentDir=%~1"

REM Traiter tous les fichiers du répertoire courant
FOR %%F IN ("%currentDir%\*.*") DO (
    SET "filePath=%%F"
    SET "fileName=%%~nxF"
    SET "fileExt=%%~xF"
    SET "fileAttr=%%~aF"
    
    REM Vérifier que c'est bien un fichier (pas un dossier)
    ECHO !fileAttr! | findstr /C:"d" >NUL
    IF ERRORLEVEL 1 (
        REM C'est un fichier
        
        REM --- Filtres d'exclusion ---
        SET "skip=0"
        
        REM 1. Exclure le script lui-même
        IF /I "!fileName!" == "%scriptName%" SET "skip=1"
        
        REM 2. Exclure le fichier de sortie
        IF /I "!fileName!" == "%outputFile%" SET "skip=1"
        
        REM 3. Exclure .gitignore
        IF /I "!fileName!" == ".gitignore" SET "skip=1"
        
        REM 4. Exclure les fichiers contenant "lock" dans leur nom
        ECHO !fileName! | findstr /I "lock" >NUL
        IF !ERRORLEVEL! EQU 0 SET "skip=1"
        
        REM 5. Exclure les extensions d'images
        IF /I "!fileExt!" == ".jpg" SET "skip=1"
        IF /I "!fileExt!" == ".jpeg" SET "skip=1"
        IF /I "!fileExt!" == ".png" SET "skip=1"
        IF /I "!fileExt!" == ".gif" SET "skip=1"
        IF /I "!fileExt!" == ".bmp" SET "skip=1"
        IF /I "!fileExt!" == ".svg" SET "skip=1"
        IF /I "!fileExt!" == ".ico" SET "skip=1"
        IF /I "!fileExt!" == ".webp" SET "skip=1"
        
        REM --- Si le fichier passe tous les filtres, on l'ajoute ---
        IF "!skip!" == "0" (
            SET /A fileCount+=1
            ECHO [!fileCount!] Ajout de : !fileName!
            (
                ECHO.
                ECHO ---
                ECHO.
                ECHO ### FICHIER #!fileCount! : !fileName!
                ECHO.
                ECHO **Metadata :**
                ECHO - **Nom :** !fileName!
                ECHO - **Chemin :** !filePath!
                ECHO - **Extension :** !fileExt!
                ECHO.
                ECHO **Contenu :**
                ECHO.
                ECHO ```
                TYPE "!filePath!" 2>nul
                ECHO ```
                ECHO.
            ) >> "%outputFile%"
        )
    )
)

REM Parcourir les sous-répertoires (sauf node_modules et autres exclusions)
FOR /D %%D IN ("%currentDir%\*") DO (
    SET "dirName=%%~nxD"
    SET "skipDir=0"
    
    REM Exclusions de dossiers
    IF /I "!dirName!" == "node_modules" SET "skipDir=1"
    IF /I "!dirName!" == ".git" SET "skipDir=1"
    IF /I "!dirName!" == "dist" SET "skipDir=1"
    IF /I "!dirName!" == ".next" SET "skipDir=1"
    IF /I "!dirName!" == "out" SET "skipDir=1"
    IF /I "!dirName!" == "release" SET "skipDir=1"
    
    IF "!skipDir!" == "0" (
        ECHO Exploration de : !dirName!
        CALL :ProcessDirectory "%%D"
    ) ELSE (
        ECHO Dossier ignore : !dirName!
    )
)

GOTO :EOF