"use client"

import { useEffect, useId, useMemo, useRef, type RefObject } from "react"

interface CssHighlightApi {
  set: (name: string, value: unknown) => void
  delete: (name: string) => void
}

function getHighlightApi(): { highlights: CssHighlightApi; HighlightCtor: new (...ranges: Range[]) => unknown } | null {
  if (typeof window === "undefined") return null
  const win = window as unknown as {
    CSS?: { highlights?: CssHighlightApi }
    Highlight?: new (...ranges: Range[]) => unknown
  }
  const highlights = win.CSS?.highlights
  const HighlightCtor = win.Highlight
  if (!highlights || !HighlightCtor) return null
  return { highlights, HighlightCtor }
}

function collectMatchRanges(root: Node, term: string): Range[] {
  const ranges: Range[] = []
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) =>
      n.nodeValue && n.nodeValue.length > 0
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT,
  })
  let node = walker.nextNode()
  while (node) {
    const text = node.nodeValue ?? ""
    const lower = text.toLowerCase()
    let from = 0
    while (from <= lower.length) {
      const idx = lower.indexOf(term, from)
      if (idx === -1) break
      const range = document.createRange()
      range.setStart(node, idx)
      range.setEnd(node, idx + term.length)
      ranges.push(range)
      from = idx + term.length
    }
    node = walker.nextNode()
  }
  return ranges
}

interface UseTextHighlightOptions {
  containerRef: RefObject<HTMLElement | null>
  term: string
  /**
   * Optional CSS selector limiting which descendants of the container are
   * scanned for matches. Useful for scoping highlights to a specific column.
   * When omitted, the entire container subtree is scanned.
   */
  scopeSelector?: string
}

/**
 * Paints a yellow highlight over every case-insensitive substring match of
 * `term` inside `containerRef`. Survives subtree re-renders (e.g. TanStack
 * Table re-rendering rows when filtering/sorting/paginating) by re-walking
 * the DOM on mutation.
 *
 * Uses the CSS Custom Highlight API so it works regardless of how cells
 * render (avatars, pills, links, plain text). Silently no-ops on browsers
 * without support.
 */
export function useTextHighlight({ containerRef, term, scopeSelector }: UseTextHighlightOptions): void {
  const reactId = useId()
  const highlightName = useMemo(
    () => `dt-highlight-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}`,
    [reactId],
  )

  useEffect(() => {
    if (typeof document === "undefined") return
    if (!getHighlightApi()) return
    const style = document.createElement("style")
    style.setAttribute("data-dt-highlight", highlightName)
    style.textContent = `::highlight(${highlightName}){background-color:rgb(253 224 71);color:rgb(0 0 0);border-radius:2px;}`
    document.head.appendChild(style)
    return () => {
      style.remove()
    }
  }, [highlightName])

  const termRef = useRef(term)
  termRef.current = term

  useEffect(() => {
    const api = getHighlightApi()
    if (!api) return
    const root = containerRef.current
    if (!root) return

    let raf: number | null = null
    let cancelled = false

    const apply = () => {
      raf = null
      if (cancelled) return
      const t = termRef.current.trim().toLowerCase()
      if (t.length === 0) {
        api.highlights.delete(highlightName)
        return
      }
      const scopes: Element[] = scopeSelector
        ? Array.from(root.querySelectorAll(scopeSelector))
        : [root]
      if (scopes.length === 0) {
        api.highlights.delete(highlightName)
        return
      }
      const ranges: Range[] = []
      for (const scope of scopes) {
        ranges.push(...collectMatchRanges(scope, t))
      }
      if (ranges.length === 0) {
        api.highlights.delete(highlightName)
      } else {
        api.highlights.set(highlightName, new api.HighlightCtor(...ranges))
      }
    }

    const schedule = () => {
      if (raf != null) cancelAnimationFrame(raf)
      raf = requestAnimationFrame(apply)
    }

    apply()

    const observer = new MutationObserver(schedule)
    observer.observe(root, { childList: true, characterData: true, subtree: true })

    return () => {
      cancelled = true
      observer.disconnect()
      if (raf != null) cancelAnimationFrame(raf)
      api.highlights.delete(highlightName)
    }
  }, [term, highlightName, containerRef, scopeSelector])
}
