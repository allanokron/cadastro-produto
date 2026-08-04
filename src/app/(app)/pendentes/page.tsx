import {PageHeading} from "@/components/page-heading";import {ProductsTable} from "@/components/products-table";import {SyncButton} from "@/components/sync-button";
export default function Pendentes(){return <><PageHeading title="Pendentes de cadastro" subtitle="Produtos do Senior ainda não encontrados no Tiny." action={<SyncButton/>}/><ProductsTable/></>}
