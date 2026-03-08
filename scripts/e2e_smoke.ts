import process from "node:process"

type Failure = {
  name: string
  message: string
}

const baseUrl = (process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3100").replace(/\/$/, "")
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS ?? "10000")

const failures: Failure[] = []

async function fetchWithTimeout(path: string, init?: RequestInit) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(`${baseUrl}${path}`, {
      ...init,
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timer)
  }
}

function expectCondition(name: string, condition: boolean, message: string) {
  if (!condition) {
    failures.push({ name, message })
  }
}

async function runChecks() {
  console.log(`[smoke] Base URL: ${baseUrl}`)

  const homeRes = await fetchWithTimeout("/")
  console.log(`[smoke] GET / -> ${homeRes.status}`)
  expectCondition("GET /", homeRes.status === 200, `Expected 200, got ${homeRes.status}`)

  const productsPageRes = await fetchWithTimeout("/products")
  console.log(`[smoke] GET /products -> ${productsPageRes.status}`)
  expectCondition("GET /products", productsPageRes.status === 200, `Expected 200, got ${productsPageRes.status}`)

  const productsApiRes = await fetchWithTimeout("/api/products")
  console.log(`[smoke] GET /api/products -> ${productsApiRes.status}`)
  expectCondition("GET /api/products status", productsApiRes.status === 200, `Expected 200, got ${productsApiRes.status}`)
  if (productsApiRes.ok) {
    const data = (await productsApiRes.json()) as unknown
    const products = Array.isArray(data)
      ? data
      : typeof data === "object" && data !== null && "products" in data
        ? (data as { products?: unknown }).products
        : null

    expectCondition(
      "GET /api/products payload",
      Array.isArray(products) && products.length > 0,
      "Expected non-empty products array"
    )
  }

  const ordersApiRes = await fetchWithTimeout("/api/orders")
  console.log(`[smoke] GET /api/orders -> ${ordersApiRes.status}`)
  expectCondition("GET /api/orders status", ordersApiRes.status === 400, `Expected 400, got ${ordersApiRes.status}`)

  const checkoutApiRes = await fetchWithTimeout("/api/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
  })
  console.log(`[smoke] POST /api/checkout (invalid payload) -> ${checkoutApiRes.status}`)
  expectCondition("POST /api/checkout status", checkoutApiRes.status === 400, `Expected 400, got ${checkoutApiRes.status}`)

  const unknownOrderRes = await fetchWithTimeout("/api/orders?session_id=smoke_nonexistent_session_123")
  console.log(`[smoke] GET /api/orders?session_id=... -> ${unknownOrderRes.status}`)
  expectCondition(
    "GET /api/orders?session_id=... status",
    unknownOrderRes.status === 404,
    `Expected 404, got ${unknownOrderRes.status}`
  )

  if (failures.length > 0) {
    console.error("\n[smoke] FAILURES:")
    for (const failure of failures) {
      console.error(`- ${failure.name}: ${failure.message}`)
    }
    process.exit(1)
  }

  console.log("\n[smoke] All checks passed.")
}

runChecks().catch((error) => {
  console.error("[smoke] Unexpected error:", error)
  process.exit(1)
})
