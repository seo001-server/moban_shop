import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'

export type ToastVariant = 'success' | 'error' | 'info'

type ToastState = {
  message: string
  variant: ToastVariant
  visible: boolean
}

type ToastCtx = {
  showToast: (message: string, variant?: ToastVariant) => void
}

const ToastContext = createContext<ToastCtx | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null)
  const hideTimer = useRef<number | undefined>(undefined)
  const clearTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    return () => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current)
      if (clearTimer.current) window.clearTimeout(clearTimer.current)
    }
  }, [])

  const showToast = useCallback((message: string, variant: ToastVariant = 'success') => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current)
    if (clearTimer.current) window.clearTimeout(clearTimer.current)
    setToast({ message, variant, visible: true })
    hideTimer.current = window.setTimeout(() => {
      setToast((cur) => (cur ? { ...cur, visible: false } : null))
      clearTimer.current = window.setTimeout(() => setToast(null), 300)
    }, 2600)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast ? (
        <div
          className={`alert-toast ${toast.variant}${toast.visible ? ' show' : ''}`}
          role="status"
          aria-live="polite"
        >
          <i
            className={`fas alert-icon ${
              toast.variant === 'error'
                ? 'fa-exclamation-circle'
                : toast.variant === 'info'
                  ? 'fa-info-circle'
                  : 'fa-check-circle'
            }`}
            aria-hidden
          />
          {toast.message}
        </div>
      ) : null}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast 须在 ToastProvider 内使用')
  return ctx
}
