export function isProductDelisted(item: { product_visible?: boolean }): boolean {
  return item.product_visible === false
}
