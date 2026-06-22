import ProductDetailsPage, { dynamic, generateMetadata as generateProductMetadata } from "@/app/products/[id]/page";

export { dynamic };

export function generateMetadata({ params }: { params: { slug: string } }) {
  return generateProductMetadata({ params: { id: params.slug } });
}

export default async function TovarDetailsPage(props: { params: { slug: string }; searchParams?: { reported?: string; favorite?: string } }) {
  return ProductDetailsPage({ params: { id: props.params.slug }, searchParams: props.searchParams });
}
