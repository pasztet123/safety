import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import SignatureCanvas from 'react-signature-canvas'

const restoreSignatureImage = (canvas, dataUrl) => {
  if (!canvas || !dataUrl) return

  const image = new Image()
  image.onload = () => {
    const context = canvas.getContext('2d')
    if (!context) return

    context.clearRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
  }
  image.src = dataUrl
}

/**
 * SignaturePad – wrapper around react-signature-canvas that fixes the
 * coordinate offset caused by a mismatch between the canvas HTML attribute
 * dimensions and its CSS-rendered size (width: 100%).
 *
 * On mount (and on window resize) we sync canvas.width / canvas.height to the
 * element's actual pixel size so that every mouse/touch event maps 1-to-1.
 */
const SignaturePad = forwardRef(function SignaturePad(
  { className, style, height = 160, onEnd, ...rest },
  ref
) {
  const innerRef = useRef(null)
  const snapshotRef = useRef(null)
  const lastEmittedDataUrlRef = useRef(null)

  const updateSnapshot = () => {
    const signaturePad = innerRef.current
    if (!signaturePad) return null

    if (signaturePad.isEmpty()) {
      snapshotRef.current = null
      return null
    }

    const dataUrl = signaturePad.toDataURL('image/png')
    snapshotRef.current = dataUrl
    return dataUrl
  }

  const restoreSnapshot = (dataUrl) => {
    const signaturePad = innerRef.current
    if (!signaturePad || !dataUrl) return

    const canvas = signaturePad.getCanvas()
    if (!canvas) return

    restoreSignatureImage(canvas, dataUrl)
    snapshotRef.current = dataUrl
  }

  const emitSignatureChange = (...args) => {
    const latestDataUrl = updateSnapshot()
    if (latestDataUrl === lastEmittedDataUrlRef.current) return

    lastEmittedDataUrlRef.current = latestDataUrl
    onEnd?.(...args)
  }

  // Expose the same API as react-signature-canvas
  useImperativeHandle(ref, () => ({
    clear: () => {
      snapshotRef.current = null
      lastEmittedDataUrlRef.current = null
      innerRef.current?.clear()
    },
    isEmpty: () => !snapshotRef.current,
    toDataURL: (...args) => {
      const signaturePad = innerRef.current
      if (signaturePad && !signaturePad.isEmpty()) {
        const dataUrl = signaturePad.toDataURL(...args)
        snapshotRef.current = dataUrl
        return dataUrl
      }

      return snapshotRef.current
    },
    fromDataURL: (dataUrl, ...args) => {
      snapshotRef.current = dataUrl || null
      lastEmittedDataUrlRef.current = dataUrl || null
      return innerRef.current?.fromDataURL(dataUrl, ...args)
    },
    getCanvas: () => innerRef.current?.getCanvas(),
  }))

  const syncSize = () => {
    const signaturePad = innerRef.current
    const canvas = signaturePad?.getCanvas()
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return

    const nextWidth = Math.round(rect.width)
    const nextHeight = Math.round(rect.height)

    // Only resize if dimensions actually changed.
    if (canvas.width === nextWidth && canvas.height === nextHeight) return

    const savedSignature = snapshotRef.current || updateSnapshot()

    canvas.width = nextWidth
    canvas.height = nextHeight

    if (savedSignature) {
      restoreSnapshot(savedSignature)
    }
  }

  const handleEnd = (...args) => emitSignatureChange(...args)

  useEffect(() => {
    // Small delay to let layout settle (especially inside modals/transitions)
    const id = setTimeout(syncSize, 50)

    const observer = new ResizeObserver(syncSize)
    const canvas = innerRef.current?.getCanvas()
    if (canvas) {
      observer.observe(canvas)

      const emitAfterFrame = () => {
        requestAnimationFrame(() => emitSignatureChange())
      }

      canvas.addEventListener('pointerup', emitAfterFrame)
      canvas.addEventListener('mouseup', emitAfterFrame)
      canvas.addEventListener('touchend', emitAfterFrame)
      canvas.addEventListener('mouseleave', emitAfterFrame)

      return () => {
        clearTimeout(id)
        observer.disconnect()
        canvas.removeEventListener('pointerup', emitAfterFrame)
        canvas.removeEventListener('mouseup', emitAfterFrame)
        canvas.removeEventListener('touchend', emitAfterFrame)
        canvas.removeEventListener('mouseleave', emitAfterFrame)
      }
    }

    return () => {
      clearTimeout(id)
      observer.disconnect()
    }
  }, [])

  return (
    <SignatureCanvas
      ref={innerRef}
      canvasProps={{
        className,
        style: { display: 'block', width: '100%', height: `${height}px`, ...style },
      }}
      onEnd={handleEnd}
      {...rest}
    />
  )
})

export default SignaturePad
