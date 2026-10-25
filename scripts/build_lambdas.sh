#!/usr/bin/env bash
# Build Lambda deployment packages (zip = package + shared + dependencies).
# Run from repo root. Outputs: lambdas/events.zip, lambdas/attendance.zip, etc.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LAMBDAS_DIR="$REPO_ROOT/lambdas"
SHARED_DIR="$REPO_ROOT/shared"
REQUIREMENTS="$REPO_ROOT/requirements.txt"
BUILD_DIR="$REPO_ROOT/build_lambda"
LAMBDA_NAMES=(events attendance polls materials analytics users courses cognito_post_confirm learning notifications)

cd "$REPO_ROOT"

# Install dependencies for Lambda runtime (Linux, Python 3.12) so we get pre-built
# wheels and avoid compiling psycopg2 etc. on the host.
echo "Installing dependencies for Lambda (Linux, Python 3.12)..."
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"
python3 -m pip install -q -r "$REQUIREMENTS" -t "$BUILD_DIR" --upgrade \
  --platform manylinux_2_28_x86_64 --platform manylinux2014_x86_64 --python-version 3.12 --only-binary=:all:

# Copy shared module into build dir
echo "Adding shared module..."
cp -r "$SHARED_DIR" "$BUILD_DIR/shared"

for name in "${LAMBDA_NAMES[@]}"; do
  echo "Building $name.zip..."
  # Copy this Lambda's package into build dir
  rm -rf "$BUILD_DIR/$name"
  cp -r "$LAMBDAS_DIR/$name" "$BUILD_DIR/$name"
  # Zip contents of build dir (so zip root has shared/, events/, psycopg2/, etc.)
  python3 "$REPO_ROOT/scripts/zip_lambda.py" "$BUILD_DIR" "$LAMBDAS_DIR/$name.zip"
  # Remove this package so next iteration gets a clean copy
  rm -rf "$BUILD_DIR/$name"
done

# Remove shared so we don't leave it in build_dir for next run
rm -rf "$BUILD_DIR/shared"
echo "Done. Zips: $LAMBDAS_DIR/*.zip"
