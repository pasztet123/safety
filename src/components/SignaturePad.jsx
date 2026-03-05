import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import SignatureCanvas from 'react-signature-canvas'

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

  // Expose the same API as react-signature-canvas
  useImperativeHandle(ref, () => ({
    clear: () => innerRef.current?.clear(),
    isEmpty: () => innerRef.current?.isEmpty(),
    toDataURL: (...args) => innerRef.current?.toDataURL(...args),
    fromDataURL: (...args) => innerRef.current?.fromDataURL(...args),
    getCanvas: () => innerRef.current?.getCanvas(),
  }))

  const syncSize = () => {
    const canvas = innerRef.current?.getCanvas()
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    if (rect.width > 0 && rect.height > 0) {
      // Only resize if dimensions actually changed (avoids clearing on every call)
      if (canvas.width !== Math.round(rect.width) || canvas.height !== Math.round(rect.height)) {
        canvas.width = Math.round(rect.width)
        canvas.height = Math.round(rect.height)
        // react-signature-canvas stores points internally; after resize we must
        // clear so it redraws at the new resolution.
        innerRef.current?.clear()
      }
    }
  }

  useEffect(() => {
    // Small delay to let layout settle (especially inside modals/transitions)
    const id = setTimeout(syncSize, 50)

    const observer = new ResizeObserver(syncSize)
    const canvas = innerRef.current?.getCanvas()
    if (canvas) observer.observe(canvas)

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
      onEnd={onEnd}
      {...rest}
    />
  )
})

export default SignaturePad
