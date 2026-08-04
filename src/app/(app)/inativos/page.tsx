import { PageHeading } from "@/components/page-heading";
import { InactiveProductsManager } from "@/components/inactive-products-manager";

export default function Inativos() {
  return <><PageHeading title="Itens inativos" subtitle="Produtos que não devem aparecer nas próximas análises nem ser enviados ao Tiny." /><InactiveProductsManager /></>;
}
