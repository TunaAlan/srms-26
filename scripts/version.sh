#!/bin/bash
VERSION=$1

if [ -z "$VERSION" ]; then
  echo "Usage: ./scripts/version.sh 0.7.0"
  exit 1
fi

sed -i '' "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" \
  client-admin/package.json \
  client-mobile/package.json \
  service-core/package.json \
  client-mobile/app.json

echo "All modules updated to $VERSION"
