type Props = {
  src: string
  alt: string
  className?: string
  width?: number
  height?: number
  eager?: boolean
}

/** 商品图：lazy load + 占位尺寸，减少布局抖动 */
export function ProductImage({
  src,
  alt,
  className,
  width = 320,
  height = 240,
  eager = false,
}: Props) {
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      width={width}
      height={height}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
    />
  )
}
