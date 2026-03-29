'use client'

import { useCallback, useRef, useState, useEffect } from 'react'

interface UsePanelResizerOptions {
  readonly initialWidth: number
  readonly minWidth: number
  readonly maxWidth: number
  readonly direction: 'left' | 'right'
}

export function usePanelResizer({
  initialWidth,
  minWidth,
  maxWidth,
  direction,
}: UsePanelResizerOptions) {
  const [width, setWidth] = useState(initialWidth)
  const isDragging = useRef(false)
  const startX = useRef(0)
  const startWidth = useRef(0)

  const clampWidth = useCallback(
    (delta: number) =>
      Math.min(
        maxWidth,
        Math.max(minWidth, startWidth.current + delta * (direction === 'left' ? 1 : -1))
      ),
    [minWidth, maxWidth, direction]
  )

  const beginDrag = useCallback(
    (clientX: number) => {
      isDragging.current = true
      startX.current = clientX
      startWidth.current = width
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    },
    [width]
  )

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      beginDrag(e.clientX)
    },
    [beginDrag]
  )

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length !== 1) return
      beginDrag(e.touches[0].clientX)
    },
    [beginDrag]
  )

  useEffect(() => {
    const onPointerMove = (clientX: number) => {
      if (!isDragging.current) return
      setWidth(clampWidth(clientX - startX.current))
    }

    const onMouseMove = (e: MouseEvent) => onPointerMove(e.clientX)
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) onPointerMove(e.touches[0].clientX)
    }

    const endDrag = () => {
      if (!isDragging.current) return
      isDragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', endDrag)
    document.addEventListener('touchmove', onTouchMove)
    document.addEventListener('touchend', endDrag)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', endDrag)
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', endDrag)
    }
  }, [clampWidth])

  return { width, onMouseDown, onTouchStart }
}
