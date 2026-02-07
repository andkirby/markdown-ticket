#!/bin/sh
# Block .env files from being committed (except .env.sample and .env.example)

block_env_files() {
  ENV_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '^\.env(\..*)?$' || true)
  ALLOWED_ENV=".env.sample|.env.example"

  for file in $ENV_FILES; do
    if ! echo "$file" | grep -qE "^($ALLOWED_ENV)\$"; then
      echo "❌ Error: Attempting to commit environment file: $file"
      echo "Environment files contain secrets and should not be committed."
      echo "Allowed files are: $ALLOWED_ENV"
      return 1
    fi
  done

  return 0
}
