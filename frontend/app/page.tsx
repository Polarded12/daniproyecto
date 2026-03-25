import Link from "next/link";

const roles = [
  {
    id: "patient",
    title: "Paciente",
    description: "Ver tu panel clinico, riesgo y adherencia diaria."
  },
  {
    id: "caregiver",
    title: "Cuidador",
    description: "Monitorear alertas y acompanamiento del paciente."
  },
  {
    id: "clinician",
    title: "Clinico",
    description: "Revisar indicadores y decisiones de seguimiento."
  }
] as const;

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-12">
      <section className="w-full">
        <h1 className="text-3xl font-bold">HealthTech NeuroUro</h1>
        <p className="mt-2 text-slate-600">Selecciona un rol para entrar sin login.</p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {roles.map((role) => (
            <Link
              key={role.id}
              href={`/dashboard?role=${role.id}`}
              className="card p-5 transition hover:-translate-y-0.5 hover:border-teal-700 hover:shadow-md"
            >
              <h2 className="text-lg font-semibold">{role.title}</h2>
              <p className="mt-2 text-sm text-slate-600">{role.description}</p>
              <p className="mt-4 text-sm font-medium text-teal-700">Entrar como {role.title}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
