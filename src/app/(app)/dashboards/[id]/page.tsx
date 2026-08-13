import DashboardView from "@/components/DashboardView";

export const metadata = { title: "Dashboard — Dashu" };

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DashboardView id={id} />;
}
