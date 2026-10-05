#!/usr/bin/env bash
#
# Fotoflow — backup do deployment Convex.
#
# Uso:
#   ./scripts/backup.sh                     # dev deployment, retenção 7
#   ./scripts/backup.sh --prod              # deployment de produção
#   ./scripts/backup.sh --prod --retention 14
#
# Agende no cron (ex.: diariamente às 3h):
#   0 3 * * * cd /caminho/do/projeto && ./scripts/backup.sh --prod >> backups/backup.log 2>&1
#
# Upload offsite opcional (requer rclone configurado):
#   BACKUP_UPLOAD_TARGET=remote:fotoflow-backups ./scripts/backup.sh --prod
#
# Restauração: bunx convex import --replace-all backups/fotoflow-<data>.zip
set -euo pipefail

DEPLOYMENT_ARG=""
RETENTION=7
OUT_DIR="${BACKUP_DIR:-backups}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --prod) DEPLOYMENT_ARG="--prod"; shift ;;
    --retention)
      RETENTION="${2:-}"
      if ! [[ "$RETENTION" =~ ^[0-9]+$ ]]; then
        echo "erro: --retention espera um número inteiro" >&2
        exit 1
      fi
      shift 2
      ;;
    *)
      echo "Uso: $0 [--prod] [--retention N]" >&2
      exit 1
      ;;
  esac
done

mkdir -p "$OUT_DIR"

STAMP="$(date +%Y%m%d-%H%M%S)"
FILE="$OUT_DIR/fotoflow-$STAMP.zip"

echo "[backup] exportando $FILE"
bunx convex export ${DEPLOYMENT_ARG} --include-file-storage --path "$FILE"

if [[ -n "${BACKUP_UPLOAD_TARGET:-}" ]]; then
  echo "[backup] enviando para $BACKUP_UPLOAD_TARGET"
  rclone copy "$FILE" "$BACKUP_UPLOAD_TARGET"
fi

# Rotação: mantém apenas os $RETENTION arquivos mais recentes.
if ls -1t "$OUT_DIR"/fotoflow-*.zip >/dev/null 2>&1; then
  ls -1t "$OUT_DIR"/fotoflow-*.zip | tail -n +$((RETENTION + 1)) | while read -r old; do
    rm -f "$old"
    echo "[backup] removido (rotação): $old"
  done
fi

echo "[backup] concluído: $FILE"
