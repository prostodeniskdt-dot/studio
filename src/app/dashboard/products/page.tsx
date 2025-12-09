import { ProductsTable } from "@/components/products/products-table";
import { mockProducts } from "@/lib/data";

export default function ProductsPage() {
    // In a real app, this data would be fetched from Firestore
    const products = mockProducts;

    return (
        <div className="container mx-auto">
            <ProductsTable products={products} />
        </div>
    );
}
