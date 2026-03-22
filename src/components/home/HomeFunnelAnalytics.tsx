'use client'

import { useEffect } from 'react'
import {
    trackHomepageCtaClicked,
    trackHomepageScrollDepthReached,
    trackHomepageSectionViewed,
    trackHomepageToCreateClicked,
    trackHomepageViewed,
} from '@/lib/analytics'

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
    return pageRoot?.dataset.pageVariant || 'premium_v2'
}

export default function HomeFunnelAnalytics() {
    useEffect(() => {
        const pageVariant = getPageVariant()
        const locale = document.documentElement.lang || undefined

        trackHomepageViewed({
            locale,
            page_variant: pageVariant,
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
                            })
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
            })

            if (isCreateDestination(destination)) {
                trackHomepageToCreateClicked({
                    cta_location: ctaLocation,
                    cta_label: ctaLabel,
                    destination,
                    page_variant: pageVariant,
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
