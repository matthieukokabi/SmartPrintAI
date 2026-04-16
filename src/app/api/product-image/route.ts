import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const ALLOWED_HOSTS = new Set([
    "files.cdn.printful.com",
    "az412349.cdn.gooten.com",
    "appassets.azureedge.net",
])

export async function GET(req: NextRequest) {
    const url = req.nextUrl.searchParams.get("url")
    if (!url) {
        return NextResponse.json({ error: "Missing url param" }, { status: 400 })
    }

    let parsed: URL
    try {
        parsed = new URL(url)
    } catch {
        return NextResponse.json({ error: "Invalid url" }, { status: 400 })
    }

    if (!ALLOWED_HOSTS.has(parsed.hostname)) {
        return NextResponse.json({ error: "Host not allowed" }, { status: 403 })
    }

    try {
        const upstream = await fetch(url, {
            headers: { Accept: "image/jpeg,image/png,image/*" },
        })

        if (!upstream.ok) {
            return NextResponse.json({ error: "Upstream error" }, { status: 502 })
        }

        const contentType = upstream.headers.get("content-type") || "image/png"
        const body = await upstream.arrayBuffer()

        return new NextResponse(body, {
            status: 200,
            headers: {
                "content-type": contentType,
                "cache-control": "public, max-age=604800, immutable",
                "content-disposition": "inline; filename=product.png",
            },
        })
    } catch {
        return NextResponse.json({ error: "Fetch failed" }, { status: 502 })
    }
}
