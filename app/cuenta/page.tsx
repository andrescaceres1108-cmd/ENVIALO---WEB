import AccountView from "@/components/AccountView";

export default async function CuentaPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return <AccountView next={next} />;
}
