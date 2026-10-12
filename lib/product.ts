// Server-only: the seller's product name, shown as "Fit with X".
export const productName = () => process.env.PRODUCT_NAME?.trim() || "your product";
