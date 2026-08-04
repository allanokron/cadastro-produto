import { PageHeading } from "@/components/page-heading";
import { PromoGenerator } from "@/components/promo-generator";

export default function Promocoes() {
  return (
    <>
      <PageHeading
        title="Promoções"
        subtitle="Gere PDF (A4) ou imagem (Instagram) com seus produtos em promoção."
      />
      <PromoGenerator />
    </>
  );
}
