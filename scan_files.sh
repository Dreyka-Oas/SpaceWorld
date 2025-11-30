#!/bin/bash

# ========================================
#   CONFIGURATION
# ========================================
OUTPUT_FILE="resultats_recherche.txt"
SCRIPT_NAME=$(basename "$0")
START_DIR=$(pwd)

# ========================================
#   INITIALISATION
# ========================================

# Suppression de l'ancien fichier de résultats
if [ -f "$OUTPUT_FILE" ]; then
    echo "Suppression de l'ancien fichier de resultats..."
    rm "$OUTPUT_FILE"
fi

echo ""
echo "========================================"
echo "  RECHERCHE DE FICHIERS EN COURS"
echo "========================================"
echo ""
echo "Repertoire de depart : $START_DIR"
echo "Fichier de sortie    : $OUTPUT_FILE"
echo ""

# En-tête du fichier
{
    echo "# DOCUMENTATION DU PROJET"
    echo ""
    echo "## INFORMATIONS GENERALES"
    echo ""
    echo "**Date de generation :** $(date)"
    echo "**Repertoire analyse :** $START_DIR"
    echo ""
    echo "---"
    echo ""
} > "$OUTPUT_FILE"

FILE_COUNT=0

# ========================================
#   TRAITEMENT DES FICHIERS
# ========================================

# Nous utilisons 'find' pour lister les fichiers.
# -prune permet d'ignorer complètement les dossiers spécifiés sans descendre dedans.
# -print0 et IFS= read ... permettent de gérer les noms de fichiers avec des espaces.

while IFS= read -r -d '' FILE_PATH; do
    FILE_NAME=$(basename "$FILE_PATH")
    # Extension en minuscule (sans le point)
    FILE_EXT="${FILE_NAME##*.}"
    FILE_EXT="${FILE_EXT,,}" 

    # --- Filtres d'exclusion ---
    SKIP=0

    # 1. Exclure le script lui-même
    if [[ "$FILE_NAME" == "$SCRIPT_NAME" ]]; then SKIP=1; fi

    # 2. Exclure le fichier de sortie
    if [[ "$FILE_NAME" == "$OUTPUT_FILE" ]]; then SKIP=1; fi

    # 3. Exclure .gitignore
    if [[ "$FILE_NAME" == ".gitignore" ]]; then SKIP=1; fi

    # 4. Exclure les fichiers contenant "lock" (insensible à la casse)
    if [[ "${FILE_NAME,,}" == *"lock"* ]]; then SKIP=1; fi

    # 5. Exclure les extensions d'images
    # Note: Si le fichier n'a pas d'extension, FILE_EXT vaut le nom du fichier
    case "$FILE_EXT" in
        jpg|jpeg|png|gif|bmp|svg|ico|webp) SKIP=1 ;;
    esac

    # --- Si le fichier passe tous les filtres ---
    if [ "$SKIP" -eq 0 ]; then
        ((FILE_COUNT++))
        echo "[$FILE_COUNT] Ajout de : $FILE_NAME"

        {
            echo ""
            echo "---"
            echo ""
            echo "### FICHIER #$FILE_COUNT : $FILE_NAME"
            echo ""
            echo "**Metadata :**"
            echo "- **Nom :** $FILE_NAME"
            echo "- **Chemin :** $FILE_PATH"
            # On ajoute le point pour coller au format batch original
            echo "- **Extension :** .$FILE_EXT" 
            echo ""
            echo "**Contenu :**"
            echo ""
            echo "\`\`\`"
            # 'cat' affiche le contenu. On redirige les erreurs (fichiers binaires, droits) vers null
            cat "$FILE_PATH" 2>/dev/null || echo "[Erreur de lecture ou binaire]"
            echo ""
            echo "\`\`\`"
            echo ""
        } >> "$OUTPUT_FILE"
    fi

done < <(find . -type d \( \
        -name "node_modules" -o \
        -name ".git" -o \
        -name "dist" -o \
        -name ".next" -o \
        -name "out" -o \
        -name "release" \
    \) -prune -o -type f -print0)

# ========================================
#   PIED DE PAGE ET FIN
# ========================================

{
    echo ""
    echo "---"
    echo ""
    echo "## STATISTIQUES DU PROJET"
    echo ""
    echo "**Nombre total de fichiers analyses :** $FILE_COUNT"
    echo "**Date de fin :** $(date)"
    echo ""
    echo "---"
    echo ""
} >> "$OUTPUT_FILE"

echo ""
echo "========================================"
echo "  OPERATION TERMINEE AVEC SUCCES !"
echo "========================================"
echo ""
echo "  Fichiers traites : $FILE_COUNT"
echo "  Resultats enregistres dans : $OUTPUT_FILE"
echo ""