#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${LIVE_PRECHECK_BASE_URL:-https://smartprintai.com}"
TIMEOUT_SEC="${LIVE_PRECHECK_TIMEOUT_SEC:-15}"

check_endpoint() {
  local path="$1"
  local expected_status="$2"
  local status

  status=$(curl -sS --max-time "$TIMEOUT_SEC" -o /dev/null -w "%{http_code}" "${BASE_URL}${path}" || true)
  if [[ "$status" != "$expected_status" ]]; then
    echo "[live-preflight] FAIL ${path}: expected ${expected_status}, got ${status}" >&2
    return 1
  fi

  echo "[live-preflight] OK ${path}: ${status}"
}

echo "[live-preflight] Checking SmartPrintAI at ${BASE_URL}"

check_endpoint "/" "200"
check_endpoint "/create" "200"
check_endpoint "/products" "200"
check_endpoint "/blog" "200"
check_endpoint "/api/products" "200"
check_endpoint "/google/merchant-feed.xml" "200"
check_endpoint "/api/orders?session_id=live_preflight_nonexistent_123" "404"

products_json=$(curl -sS --max-time "$TIMEOUT_SEC" "${BASE_URL}/api/products")

selection=$(
  PRODUCTS_JSON="$products_json" node - <<'NODE'
const raw = process.env.PRODUCTS_JSON || ''

let parsed
try {
  parsed = JSON.parse(raw)
} catch {
  console.error('Invalid JSON from /api/products')
  process.exit(1)
}

const products = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.products) ? parsed.products : [])
if (products.length === 0) {
  console.error('No products available for checkout preflight')
  process.exit(1)
}

const product = products.find((candidate) =>
  typeof candidate?.id === 'string' &&
  Array.isArray(candidate?.sizes) &&
  candidate.sizes.length > 0 &&
  Array.isArray(candidate?.colors) &&
  candidate.colors.length > 0
) || products[0]

if (!product || typeof product.id !== 'string') {
  console.error('No product with valid id found')
  process.exit(1)
}

const size = Array.isArray(product.sizes) && product.sizes.length > 0 ? String(product.sizes[0]) : 'One Size'
let color = 'Default'
if (Array.isArray(product.colors) && product.colors.length > 0) {
  const firstColor = product.colors[0]
  if (firstColor && typeof firstColor === 'object' && typeof firstColor.name === 'string' && firstColor.name.trim()) {
    color = firstColor.name.trim()
  }
}

process.stdout.write([product.id, size, color].join('|'))
NODE
)

IFS='|' read -r product_id size color <<< "$selection"

checkout_payload=$(
  PRODUCT_ID="$product_id" SIZE="$size" COLOR="$color" node - <<'NODE'
process.stdout.write(
  JSON.stringify({
    items: [
      {
        productId: process.env.PRODUCT_ID,
        designId: 'live-preflight-design',
        size: process.env.SIZE,
        color: process.env.COLOR,
        quantity: 1,
      },
    ],
  })
)
NODE
)

checkout_raw=$(
  curl -sS --max-time "$TIMEOUT_SEC" \
    -H "Content-Type: application/json" \
    -X POST \
    -d "$checkout_payload" \
    "${BASE_URL}/api/checkout" \
    -w '\n%{http_code}'
)

checkout_status="${checkout_raw##*$'\n'}"
checkout_body="${checkout_raw%$'\n'*}"

if [[ "$checkout_status" != "200" ]]; then
  echo "[live-preflight] FAIL /api/checkout: expected 200, got ${checkout_status}" >&2
  echo "[live-preflight] Response body: ${checkout_body}" >&2
  exit 1
fi

checkout_url=$(
  CHECKOUT_BODY="$checkout_body" node - <<'NODE'
const raw = process.env.CHECKOUT_BODY || ''

let parsed
try {
  parsed = JSON.parse(raw)
} catch {
  console.error('Invalid JSON response from /api/checkout')
  process.exit(1)
}

if (typeof parsed.url !== 'string' || !parsed.url.startsWith('https://checkout.stripe.com/')) {
  console.error('Missing Stripe checkout URL in /api/checkout response')
  process.exit(1)
}

process.stdout.write(parsed.url)
NODE
)

echo "[live-preflight] OK /api/checkout: 200"
echo "[live-preflight] Selected product: ${product_id} (size=${size}, color=${color})"
echo "[live-preflight] Checkout URL generated: ${checkout_url}"
echo "[live-preflight] Preflight passed. Next owner-only step: complete one real live checkout on ${BASE_URL}."
