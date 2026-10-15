// The price a customer actually pays for one unit of a product row.
// A sale price only counts when the product is on sale and the
// sale price is a real discount.
export function getUnitPrice(row) {
  const price = Number(row.price) || 0;
  const salePrice = Number(row.sale_price) || 0;
  const onSale = Number(row.on_sale) === 1;

  return onSale && salePrice > 0 && salePrice < price ? salePrice : price;
}
