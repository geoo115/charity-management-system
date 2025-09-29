import * as React from "react"
import { cn } from "@/lib/utils"

interface AvatarContextType {
  imageLoadingStatus: 'idle' | 'loading' | 'loaded' | 'error'
  setImageLoadingStatus: (status: 'idle' | 'loading' | 'loaded' | 'error') => void
}

const AvatarContext = React.createContext<AvatarContextType>({
  imageLoadingStatus: 'idle',
  setImageLoadingStatus: () => {}
})

const Avatar = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const [imageLoadingStatus, setImageLoadingStatus] = React.useState<'idle' | 'loading' | 'loaded' | 'error'>('idle')

  return (
    <AvatarContext.Provider value={{ imageLoadingStatus, setImageLoadingStatus }}>
      <div
        ref={ref}
        className={cn(
          "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
          className
        )}
        {...props}
      />
    </AvatarContext.Provider>
  )
})
Avatar.displayName = "Avatar"

const AvatarImage = React.forwardRef<
  HTMLImageElement,
  React.ImgHTMLAttributes<HTMLImageElement>
>(({ className, src, alt, ...props }, ref) => {
  const { imageLoadingStatus, setImageLoadingStatus } = React.useContext(AvatarContext)

  React.useEffect(() => {
    if (!src) {
      setImageLoadingStatus('error')
      return
    }

    setImageLoadingStatus('loading')

    const img = new Image()
    img.onload = () => setImageLoadingStatus('loaded')
    img.onerror = () => setImageLoadingStatus('error')
    img.src = typeof src === 'string' ? src : URL.createObjectURL(src)

    return () => {
      img.onload = null
      img.onerror = null
    }
  }, [src, setImageLoadingStatus])

  if (imageLoadingStatus !== 'loaded') return null

  return (
    <img
      ref={ref}
      src={src}
      alt={alt}
      className={cn("aspect-square h-full w-full", className)}
      {...props}
    />
  )
})
AvatarImage.displayName = "AvatarImage"

const AvatarFallback = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { imageLoadingStatus } = React.useContext(AvatarContext)

  if (imageLoadingStatus === 'loaded') return null

  return (
    <div
      ref={ref}
      className={cn(
        "flex h-full w-full items-center justify-center rounded-full bg-muted",
        className
      )}
      {...props}
    />
  )
})
AvatarFallback.displayName = "AvatarFallback"

export { Avatar, AvatarImage, AvatarFallback }
