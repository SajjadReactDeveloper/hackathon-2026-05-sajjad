import { apiClient } from '@/lib/api-client';
import { ProductsClient } from '@/components/products/products-client';

interface Workspace { id: string }

interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  priceCents: string;
  stock: number;
  active: boolean;
}

export default async function ProductsPage() {
  let workspaceId = '';
  let products: Product[] = [];

  try {
    const workspaces = await apiClient<Workspace[]>('/workspaces/me');
    const workspace = workspaces[0];
    if (workspace) {
      workspaceId = workspace.id;
      products = await apiClient<Product[]>('/products', { workspaceId });
    }
  } catch {
    // show empty
  }

  return (
    <div className="px-7 pt-7 pb-7 overflow-auto h-full">
      <ProductsClient workspaceId={workspaceId} initialProducts={products} />
    </div>
  );
}

export const dynamic = 'force-dynamic';
