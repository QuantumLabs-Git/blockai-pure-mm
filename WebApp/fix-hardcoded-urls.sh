#!/bin/bash

echo "Fixing all hardcoded localhost:5001 URLs in the client..."

# Fix all occurrences in the client source
find /Volumes/PRO-G40/Development/blockai-pure-mm/WebApp/client/src -type f -name "*.jsx" -o -name "*.js" | while read file; do
  if grep -q "http://localhost:5001" "$file"; then
    echo "Fixing: $file"
    sed -i '' 's|http://localhost:5001/api|/api|g' "$file"
    sed -i '' "s|'http://localhost:5001/api'|'/api'|g" "$file"
    sed -i '' 's|"http://localhost:5001/api"|"/api"|g' "$file"
    sed -i '' 's|\`http://localhost:5001/api|\`/api|g' "$file"
  fi
done

echo "✅ All hardcoded URLs have been fixed!"
echo "The app will now work correctly through ngrok."