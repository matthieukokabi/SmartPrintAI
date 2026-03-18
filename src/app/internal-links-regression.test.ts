import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const APP_DIR = path.join(process.cwd(), 'src', 'app')
const INTERNAL_LINK_SOURCE_FILES = [
    path.join(process.cwd(), 'src', 'components', 'layout', 'Navbar.tsx'),
    path.join(process.cwd(), 'src', 'components', 'layout', 'Footer.tsx'),
    path.join(process.cwd(), 'src', 'app', 'products', 'page.tsx'),
    path.join(process.cwd(), 'src', 'app', 'blog', 'page.tsx'),
    path.join(process.cwd(), 'src', 'app', 'about', 'page.tsx'),
    path.join(process.cwd(), 'src', 'app', 'privacy', 'page.tsx'),
    path.join(process.cwd(), 'src', 'app', 'terms', 'page.tsx'),
] as const

function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function normalizePathname(pathname: string): string {
    const stripped = pathname.replace(/[?#].*$/, '').replace(/\/+$/, '')
    return stripped.length === 0 ? '/' : stripped
}

function walkFiles(dir: string): string[] {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    const files: string[] = []

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
            files.push(...walkFiles(fullPath))
            continue
        }
        if (entry.isFile()) {
            files.push(fullPath)
        }
    }

    return files
}

function toRoutePattern(filePath: string): RegExp {
    const relativePath = path.relative(APP_DIR, filePath).replace(/\\/g, '/')
    const routePath = relativePath
        .replace(/(?:^|\/)page\.tsx$/, '')
        .replace(/(?:^|\/)route\.ts$/, '')
    const segments = routePath
        .split('/')
        .filter(Boolean)
        .filter((segment) => !segment.startsWith('(') && !segment.endsWith(')'))
        .map((segment) => {
            if (/^\[\.\.\..+\]$/.test(segment)) {
                return '.+'
            }
            if (/^\[\[\.{3}.+\]\]$/.test(segment)) {
                return '.*'
            }
            if (/^\[.+\]$/.test(segment)) {
                return '[^/]+'
            }
            return escapeRegex(segment)
        })

    if (segments.length === 0) {
        return /^\/$/
    }

    return new RegExp(`^/${segments.join('/')}$`)
}

function collectRoutePatterns(): RegExp[] {
    const appFiles = walkFiles(APP_DIR)
    const routeFiles = appFiles.filter((filePath) => /(?:^|\/)page\.tsx$|(?:^|\/)route\.ts$/.test(filePath))
    return routeFiles.map(toRoutePattern)
}

function collectInternalLiteralHrefs(filePath: string): string[] {
    const source = fs.readFileSync(filePath, 'utf8')
    const hrefPattern = /href\s*=\s*["']([^"'{}]+)["']/g
    const hrefs: string[] = []

    for (const match of source.matchAll(hrefPattern)) {
        const href = match[1]?.trim()
        if (!href) {
            continue
        }
        if (!href.startsWith('/')) {
            continue
        }
        hrefs.push(normalizePathname(href))
    }

    return [...new Set(hrefs)]
}

describe('Wave 2 internal links regression', () => {
    it('keeps hardcoded internal links mapped to existing routes', () => {
        const routePatterns = collectRoutePatterns()
        const checkedLinks = INTERNAL_LINK_SOURCE_FILES.flatMap(collectInternalLiteralHrefs)
        const invalidLinks = checkedLinks.filter((linkPath) => {
            if (linkPath.startsWith('/_next/')) {
                return false
            }
            return !routePatterns.some((routePattern) => routePattern.test(linkPath))
        })

        expect(checkedLinks.length).toBeGreaterThan(0)
        expect(invalidLinks).toEqual([])
    })
})
