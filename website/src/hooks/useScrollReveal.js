import { useEffect, useRef } from 'react'

export function useScrollReveal(threshold = 0.15) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold }
    )

    const elements = el.querySelectorAll('.fade-in-up, .fade-in-left, .fade-in-right')
    elements.forEach((element) => observer.observe(element))

    return () => observer.disconnect()
  }, [threshold])

  return ref
}
