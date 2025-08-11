#!/usr/bin/env bash
# make-structure.sh
# Run from the Laravel root (where artisan lives)

set -euo pipefail

# 1. Make sure we are in a Laravel project
if [[ ! -f "artisan" ]]; then
  echo "❌  artisan not found – please run this script inside your Laravel root directory."
  exit 1
fi

# 2. Base directories
BASE_DIR="resources/js"
COMPONENTS_DIR="$BASE_DIR/components"
PAGES_DIR="$BASE_DIR/Pages"

# 3. Create folder tree
echo "📁  Creating folder structure…"
mkdir -p \
  "$COMPONENTS_DIR/BusinessCustomerForm" \
  "$COMPONENTS_DIR/BusinessCustomerForm/tabs" \
  "$COMPONENTS_DIR/BusinessCustomerForm/shared" \
  "$COMPONENTS_DIR/BusinessCustomerForm/constants" \
  "$COMPONENTS_DIR/BusinessCustomerForm/types" \
  "$PAGES_DIR"

# 4. Create stub files (so folders appear in Git)
touch \
  "$COMPONENTS_DIR/BusinessCustomerForm/index.tsx" \
  "$COMPONENTS_DIR/BusinessCustomerForm/tabs/.gitkeep" \
  "$COMPONENTS_DIR/BusinessCustomerForm/shared/.gitkeep" \
  "$COMPONENTS_DIR/BusinessCustomerForm/constants/.gitkeep" \
  "$COMPONENTS_DIR/BusinessCustomerForm/types/.gitkeep" \
  "$PAGES_DIR/.gitkeep"

# 5. Add a tiny README inside the component folder
cat > "$COMPONENTS_DIR/BusinessCustomerForm/README.md" <<'EOF'
# BusinessCustomerForm

- `index.tsx` – main orchestrator component  
- `tabs/` – one file per tab  
- `shared/` – reusable UI helpers  
- `constants/` – enums / static arrays  
- `types/` – TypeScript interfaces
EOF

echo "✅  Structure created under resources/js/components/BusinessCustomerForm"
