'use client'

import { useEffect } from 'react'
import {
    trackHomepageCtaClicked,
    trackHomepageScrollDepthReached,
    trackHomepageSectionViewed,
    trackHomepageToCreateClicked,
    trackHomepageViewed,
    trackProductProofCtaClicked,
    trackProductProofSectionViewed,
} from '@/lib/analytics'
import { HOMEPAGE_VISITOR_ID_COOKIE, sanitizeVisitorId } from '@/lib/homepage-experiment'

const SECTION_SELECTOR = '[data-home-section]'
const CTA_SELECTOR = 'a[data-home-cta],button[data-home-cta]'
const SCROLL_MILESTONES = [25, 50, 75, 90] as const

function normalizeDestination(href: string | null): string | undefined {
    if (!href) return undefined
    try {
        const url = new URL(href, window.location.origin)
        return `${url.pathname}${url.search}`
    } catch {
        return href
    }
}

function isCreateDestination(destination: string | undefined): boolean {
    if (!destination) return false
    return /^\/(?:en\/|fr\/|de\/|es\/)?create(?:[/?#]|$)/.test(destination)
}

function getPageVariant(): string {
    const pageRoot = document.querySelector<HTMLElement>('[data-analytics-page="homepage"]')
    return pageRoot?.dataset.pageVariant || 'variant_a'
}

function readVisitorIdFromDocumentCookie(): string | undefined {
    const rawCookieValue = document.cookie
        .split(';')
        .map((part) => part.trim())
        .find((part) => part.startsWith(`${HOMEPAGE_VISITOR_ID_COOKIE}=`))
        ?.split('=')
        .slice(1)
        .join('=')

    if (!rawCookieValue) {
        return undefined
    }

    try {
        return sanitizeVisitorId(decodeURIComponent(rawCookieValue)) || undefined
    } catch {
        return sanitizeVisitorId(rawCookieValue) || undefined
    }
}

export default function HomeFunnelAnalytics() {
    useEffect(() => {
        const pageVariant = getPageVariant()
        const locale = document.documentElement.lang || undefined
        const visitorId = readVisitorIdFromDocumentCookie()

        trackHomepageViewed({
            locale,
            page_variant: pageVariant,
            visitor_id: visitorId,
        })

        const seenSections = new Set<string>()
        const seenScrollMilestones = new Set<number>()

        const sectionObserver =
            typeof IntersectionObserver !== 'undefined'
                ? new IntersectionObserver(
                    (entries) => {
                        for (const entry of entries) {
                            if (!entry.isIntersecting) {
                                continue
                            }
                            const element = entry.target as HTMLElement
                            const sectionName = element.dataset.homeSection
                            if (!sectionName || seenSections.has(sectionName)) {
                                continue
                            }

                            seenSections.add(sectionName)
                            trackHomepageSectionViewed({
                                section_name: sectionName,
                                page_variant: pageVariant,
                                visitor_id: visitorId,
                            })

                            if (sectionName === 'product_proof') {
                                trackProductProofSectionViewed({
                                    page_variant: pageVariant,
                                    visitor_id: visitorId,
                                })
                            }
                        }
                    },
                    { threshold: 0.45 }
                )
                : null

        if (sectionObserver) {
            document.querySelectorAll<HTMLElement>(SECTION_SELECTOR).forEach((section) => {
                sectionObserver.observe(section)
            })
        }

        const maybeTrackScrollDepth = () => {
            const scrollableHeight = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1)
            const currentDepth = (window.scrollY / scrollableHeight) * 100

            for (const milestone of SCROLL_MILESTONES) {
                if (currentDepth >= milestone && !seenScrollMilestones.has(milestone)) {
                    seenScrollMilestones.add(milestone)
                    trackHomepageScrollDepthReached({
                        scroll_depth_percent: milestone,
                        page_variant: pageVariant,
                        visitor_id: visitorId,
                    })
                }
            }
        }

        const handleClick = (event: MouseEvent) => {
            const target = event.target as Element | null
            if (!target) {
                return
            }

            const ctaElement = target.closest<HTMLElement>(CTA_SELECTOR)
            if (!ctaElement) {
                return
            }

            const ctaLocation = ctaElement.dataset.homeCta
            if (!ctaLocation) {
                return
            }

            const destination = normalizeDestination(ctaElement.getAttribute('href'))
            const ctaLabel = ctaElement.dataset.homeCtaLabel || ctaElement.textContent?.trim().replace(/\s+/g, ' ')

            trackHomepageCtaClicked({
                cta_location: ctaLocation,
                cta_label: ctaLabel,
                destination,
                page_variant: pageVariant,
                visitor_id: visitorId,
            })

            if (ctaLocation.startsWith('product_proof_')) {
                trackProductProofCtaClicked({
                    cta_location: ctaLocation,
                    cta_label: ctaLabel,
                    destination,
                    page_variant: pageVariant,
                    visitor_id: visitorId,
                })
            }

            if (isCreateDestination(destination)) {
                trackHomepageToCreateClicked({
                    cta_location: ctaLocation,
                    cta_label: ctaLabel,
                    destination,
                    page_variant: pageVariant,
                    visitor_id: visitorId,
                })
            }
        }

        maybeTrackScrollDepth()
        window.addEventListener('scroll', maybeTrackScrollDepth, { passive: true })
        document.addEventListener('click', handleClick)

        return () => {
            window.removeEventListener('scroll', maybeTrackScrollDepth)
            document.removeEventListener('click', handleClick)
            sectionObserver?.disconnect()
        }
    }, [])

    return null
}
