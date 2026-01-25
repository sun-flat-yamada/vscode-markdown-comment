#!/bin/bash
set -e

NEW_VERSION=$1

if [ -z "$NEW_VERSION" ]; then
    read -p "Enter new version (e.g. 1.0.1): " NEW_VERSION
fi

if [ -z "$NEW_VERSION" ]; then
    echo "Version is required."
    exit 1
fi

echo "Preparing release for version: $NEW_VERSION"

# Create and checkout release branch
git checkout -b release/v$NEW_VERSION

# Bump version in package.json without git tag
npm version $NEW_VERSION --no-git-tag-version

# Commit changes
git commit -am "Bump version to $NEW_VERSION"

echo "Release preparation complete."
echo "Branch: release/v$NEW_VERSION"
echo "Please verify changes and push the branch."
echo "  git push origin release/v$NEW_VERSION"
