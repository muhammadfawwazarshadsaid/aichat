import { useLayoutEffect, useRef } from "react"

interface UseAutosizeTextAreaProps {
  ref: React.RefObject<HTMLTextAreaElement>
  minHeight?: number
  maxHeight?: number
  borderWidth?: number
  dependencies: React.DependencyList
}

export function useAutosizeTextArea({
  ref,
  minHeight = 100, // <-- Default minHeight
  maxHeight = 160, // <-- Default maxHeight
  borderWidth = 0,
  dependencies,
}: UseAutosizeTextAreaProps) {
  const originalHeight = useRef<number | null>(null)

  useLayoutEffect(() => {
    if (!ref.current) return

    const currentRef = ref.current
    const borderAdjustment = borderWidth * 2

    if (originalHeight.current === null) {
      originalHeight.current = currentRef.scrollHeight - borderAdjustment
    }

    currentRef.style.height = "auto" // Reset biar scrollHeight dihitung ulang
    const scrollHeight = currentRef.scrollHeight

    // Pastikan tinggi berada dalam range minHeight dan maxHeight
    const newHeight = Math.max(minHeight, Math.min(scrollHeight, maxHeight - borderAdjustment))

    currentRef.style.height = `${newHeight + borderAdjustment}px`
  }, [ref, minHeight, maxHeight, ...dependencies])
}
