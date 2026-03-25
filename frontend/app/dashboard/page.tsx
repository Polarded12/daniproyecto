"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";

const roleMap = {
  patient: "Paciente",
  caregiver: "Cuidador",
  clinician: "Clinico"
} as const;

type RoleKey = keyof typeof roleMap;
type ManagementType = "indwelling_catheter" | "intermittent_catheterization" | "condom_catheter";

type Profile = {
  age: number;
  sex: "female" | "male" | "other";
  lesionLevel: "thoracic" | "lumbar" | "sacral";
  bladderManagementType: ManagementType;
  hasCaregiver: boolean;
  hydrationTargetMl: number;
  nextCatheterChangeDate: string;
};

type EventLog = {
  id: string;
  eventType: "catheterization" | "bag_empty" | "hydration" | "hygiene_check" | "catheter_change";
  plannedAt?: string;
  performedAt: string;
  delayMinutes: number;
  hydrationMl?: number;
  notes?: string;
};

const defaultProfile: Profile = {
  age: 30,
  sex: "male",
  lesionLevel: "thoracic",
  bladderManagementType: "intermittent_catheterization",
  hasCaregiver: false,
  hydrationTargetMl: 1800,
  nextCatheterChangeDate: ""
};

function isToday(dateIso: string) {
  const d = new Date(dateIso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

function riskFromLogs(profile: Profile, logs: EventLog[]) {
  let score = 0;
  const alerts: string[] = [];
  const now = new Date();

  const intermittentDelays = logs
    .filter((e) => e.eventType === "catheterization")
    .map((e) => e.delayMinutes);
  const bagDelays = logs
    .filter((e) => e.eventType === "bag_empty")
    .map((e) => e.delayMinutes);

  const maxIntermittentDelay = intermittentDelays.length ? Math.max(...intermittentDelays) : 0;
  const maxBagDelay = bagDelays.length ? Math.max(...bagDelays) : 0;

  if (profile.bladderManagementType === "intermittent_catheterization") {
    if (maxIntermittentDelay >= 120) {
      score += 35;
      alerts.push("Alerta roja: retraso de 2 horas o mas en cateterismo intermitente.");
    } else if (maxIntermittentDelay >= 60) {
      score += 20;
      alerts.push("Alerta amarilla: retraso de 1 hora en cateterismo intermitente.");
    }
  }

  if (profile.bladderManagementType === "indwelling_catheter") {
    if (maxBagDelay >= 240) {
      score += 30;
      alerts.push("Alerta roja: alto riesgo de infeccion por vaciado tardio de bolsa.");
    } else if (maxBagDelay >= 120) {
      score += 15;
      alerts.push("Alerta amarilla: bolsa posiblemente llena por retraso en vaciado.");
    }

    if (profile.nextCatheterChangeDate) {
      const nextDate = new Date(profile.nextCatheterChangeDate);
      const diffMs = nextDate.getTime() - now.getTime();
      const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (days === 3) {
        alerts.push("Se acerca el cambio de sonda (3 dias).");
      } else if (days === 1) {
        alerts.push("Prepara material para el cambio de sonda (1 dia).");
      } else if (days === 0) {
        score += 8;
        alerts.push("Hoy corresponde cambio de sonda.");
      } else if (days <= -7) {
        score += 25;
        alerts.push("Riesgo alto: retraso importante en cambio de sonda.");
      } else if (days <= -3) {
        score += 12;
        alerts.push("Riesgo moderado: retraso en cambio de sonda.");
      }
    }
  }

  const hydrationToday = logs
    .filter((e) => e.eventType === "hydration" && isToday(e.performedAt))
    .reduce((acc, e) => acc + (e.hydrationMl ?? 0), 0);

  const ratio = profile.hydrationTargetMl > 0 ? hydrationToday / profile.hydrationTargetMl : 0;
  if (ratio < 0.5) {
    score += 18;
    alerts.push("Hidratacion critica baja hoy. Objetivo: 1.5 a 2 L diarios.");
  } else if (ratio < 0.8) {
    score += 10;
    alerts.push("Hidratacion baja hoy. Reforzar recordatorios cada 3-4 horas.");
  }

  const level = score >= 45 ? "red" : score >= 20 ? "yellow" : "info";
  return { score, level, alerts, hydrationToday };
}

export default function DashboardPage() {
  const [role, setRole] = useState<RoleKey>("patient");

  useEffect(() => {
    const params = new URLSearchParams(globalThis.location.search);
    const value = params.get("role");
    if (value === "patient" || value === "caregiver" || value === "clinician") {
      setRole(value);
    }
  }, []);

  const roleLabel = roleMap[role] ?? roleMap.patient;
  const isPatient = role === "patient";
  const isCaregiver = role === "caregiver";
  const isClinician = role === "clinician";

  const profileKey = `neuroUro.profile.${role}`;
  const logsKey = `neuroUro.logs.${role}`;
  const patientProfileKey = "neuroUro.profile.patient";
  const patientLogsKey = "neuroUro.logs.patient";

  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [logs, setLogs] = useState<EventLog[]>([]);
  const [patientProfileView, setPatientProfileView] = useState<Profile>(defaultProfile);
  const [patientLogsView, setPatientLogsView] = useState<EventLog[]>([]);
  const [plannedAt, setPlannedAt] = useState("");
  const [performedAt, setPerformedAt] = useState("");
  const [hydrationInput, setHydrationInput] = useState(250);
  const [hygieneDone, setHygieneDone] = useState(false);
  const [caregiverNote, setCaregiverNote] = useState("");
  const [caregiverNotes, setCaregiverNotes] = useState<string[]>([]);

  useEffect(() => {
    const savedProfile = globalThis.localStorage?.getItem(profileKey);
    const savedLogs = globalThis.localStorage?.getItem(logsKey);

    if (savedProfile) {
      try {
        setProfile(JSON.parse(savedProfile));
      } catch {
        setProfile(defaultProfile);
      }
    } else {
      setProfile(defaultProfile);
    }

    if (savedLogs) {
      try {
        setLogs(JSON.parse(savedLogs));
      } catch {
        setLogs([]);
      }
    } else {
      setLogs([]);
    }
  }, [profileKey, logsKey]);

  useEffect(() => {
    const patientProfileRaw = globalThis.localStorage?.getItem(patientProfileKey);
    const patientLogsRaw = globalThis.localStorage?.getItem(patientLogsKey);
    const caregiverNotesRaw = globalThis.localStorage?.getItem("neuroUro.caregiver.notes");

    if (patientProfileRaw) {
      try {
        setPatientProfileView(JSON.parse(patientProfileRaw));
      } catch {
        setPatientProfileView(defaultProfile);
      }
    } else {
      setPatientProfileView(defaultProfile);
    }

    if (patientLogsRaw) {
      try {
        setPatientLogsView(JSON.parse(patientLogsRaw));
      } catch {
        setPatientLogsView([]);
      }
    } else {
      setPatientLogsView([]);
    }

    if (caregiverNotesRaw) {
      try {
        setCaregiverNotes(JSON.parse(caregiverNotesRaw));
      } catch {
        setCaregiverNotes([]);
      }
    } else {
      setCaregiverNotes([]);
    }
  }, [role, logs, profile]);

  function saveProfile(next: Profile) {
    setProfile(next);
    globalThis.localStorage?.setItem(profileKey, JSON.stringify(next));
  }

  function saveLogs(next: EventLog[]) {
    setLogs(next);
    globalThis.localStorage?.setItem(logsKey, JSON.stringify(next));
  }

  function registerEvent(eventType: EventLog["eventType"], opts?: { hydrationMl?: number; notes?: string }) {
    const performed = performedAt ? new Date(performedAt) : new Date();
    const planned = plannedAt ? new Date(plannedAt) : null;

    const delayMinutes = planned
      ? Math.max(0, Math.floor((performed.getTime() - planned.getTime()) / 60000))
      : 0;

    const next: EventLog[] = [
      {
        id: crypto.randomUUID(),
        eventType,
        plannedAt: planned?.toISOString(),
        performedAt: performed.toISOString(),
        delayMinutes,
        hydrationMl: opts?.hydrationMl,
        notes: opts?.notes
      },
      ...logs
    ].slice(0, 100);

    saveLogs(next);
    setPlannedAt("");
    setPerformedAt("");
  }

  const activeProfile = isPatient ? profile : patientProfileView;
  const activeLogs = isPatient ? logs : patientLogsView;
  const risk = useMemo(() => riskFromLogs(activeProfile, activeLogs), [activeProfile, activeLogs]);

  const moduleTitle =
    activeProfile.bladderManagementType === "intermittent_catheterization"
      ? "Modulo critico: Cateterismo intermitente"
      : activeProfile.bladderManagementType === "indwelling_catheter"
      ? "Modulo critico: Cateter permanente"
      : "Modulo critico: Condon urinario";

  const delayedEvents = activeLogs.filter((e) => e.delayMinutes > 0).slice(0, 8);
  const trackedEvents = activeLogs.filter((e) => e.eventType === "catheterization" || e.eventType === "bag_empty");
  const adherenceRate = trackedEvents.length
    ? Math.round((trackedEvents.filter((e) => e.delayMinutes < 60).length / trackedEvents.length) * 100)
    : 0;

  function addCaregiverNote() {
    const trimmed = caregiverNote.trim();
    if (!trimmed) {
      return;
    }

    const next = [`${new Date().toLocaleString()} - ${trimmed}`, ...caregiverNotes].slice(0, 20);
    setCaregiverNotes(next);
    globalThis.localStorage?.setItem("neuroUro.caregiver.notes", JSON.stringify(next));
    setCaregiverNote("");
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-12">
      <section className="card p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Dashboard NeuroUro</h1>
        <p className="mt-2 text-slate-600">
          Rol activo: <span className="font-semibold">{roleLabel}</span>. Sin login, con flujo por perfil y registros diarios.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/dashboard?role=patient" className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white">
            Paciente
          </Link>
          <Link href="/dashboard?role=caregiver" className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white">
            Cuidador
          </Link>
          <Link href="/dashboard?role=clinician" className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white">
            Clinico
          </Link>
          <Link href="/" className="rounded-md bg-teal-700 px-3 py-2 text-sm text-white">
            Menu de roles
          </Link>
        </div>
      </section>

      {isPatient && (
      <section className="card mt-6 p-6 shadow-sm">
        <h2 className="text-xl font-semibold">1) Perfil del usuario</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="text-sm">
            Edad
            <input
              type="number"
              min={1}
              max={120}
              value={profile.age}
              onChange={(e) => saveProfile({ ...profile, age: Number(e.target.value || 0) })}
              className="mt-1 w-full rounded-md border p-2"
            />
          </label>

          <label className="text-sm">
            Sexo
            <select
              value={profile.sex}
              onChange={(e) => saveProfile({ ...profile, sex: e.target.value as Profile["sex"] })}
              className="mt-1 w-full rounded-md border p-2"
            >
              <option value="female">Femenino</option>
              <option value="male">Masculino</option>
              <option value="other">Otro</option>
            </select>
          </label>

          <label className="text-sm">
            Nivel de lesion
            <select
              value={profile.lesionLevel}
              onChange={(e) => saveProfile({ ...profile, lesionLevel: e.target.value as Profile["lesionLevel"] })}
              className="mt-1 w-full rounded-md border p-2"
            >
              <option value="thoracic">Toracicas</option>
              <option value="lumbar">Lumbares</option>
              <option value="sacral">Sacras</option>
            </select>
          </label>

          <label className="text-sm">
            Tipo de manejo vesical
            <select
              value={profile.bladderManagementType}
              onChange={(e) =>
                saveProfile({
                  ...profile,
                  bladderManagementType: e.target.value as ManagementType
                })
              }
              className="mt-1 w-full rounded-md border p-2"
            >
              <option value="indwelling_catheter">Cateter permanente</option>
              <option value="intermittent_catheterization">Cateterismo intermitente</option>
              <option value="condom_catheter">Condon urinario</option>
            </select>
          </label>

          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input
              type="checkbox"
              checked={profile.hasCaregiver}
              onChange={(e) => saveProfile({ ...profile, hasCaregiver: e.target.checked })}
            />
            Tiene cuidador
          </label>

          <label className="text-sm">
            Meta de hidratacion diaria (ml)
            <input
              type="number"
              min={1500}
              max={2000}
              value={profile.hydrationTargetMl}
              onChange={(e) => saveProfile({ ...profile, hydrationTargetMl: Number(e.target.value || 1800) })}
              className="mt-1 w-full rounded-md border p-2"
            />
          </label>

          <label className="text-sm">
            Proximo cambio de sonda (cateter permanente)
            <input
              type="date"
              value={profile.nextCatheterChangeDate}
              onChange={(e) => saveProfile({ ...profile, nextCatheterChangeDate: e.target.value })}
              className="mt-1 w-full rounded-md border p-2"
            />
          </label>
        </div>

        {profile.hasCaregiver && (
          <p className="mt-4 rounded-md bg-teal-50 p-3 text-sm text-teal-900">Modo cuidador activo para este perfil.</p>
        )}
      </section>
      )}

      {isPatient && (
      <>
      <section className="card mt-6 p-6 shadow-sm">
        <h2 className="text-xl font-semibold">2) {moduleTitle}</h2>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="text-sm">
            Hora programada
            <input
              type="datetime-local"
              value={plannedAt}
              onChange={(e) => setPlannedAt(e.target.value)}
              className="mt-1 w-full rounded-md border p-2"
            />
          </label>

          <label className="text-sm">
            Hora realizada
            <input
              type="datetime-local"
              value={performedAt}
              onChange={(e) => setPerformedAt(e.target.value)}
              className="mt-1 w-full rounded-md border p-2"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {profile.bladderManagementType === "intermittent_catheterization" && (
            <button
              type="button"
              onClick={() => registerEvent("catheterization")}
              className="rounded-md bg-teal-700 px-3 py-2 text-sm text-white"
            >
              Registrar cateterismo
            </button>
          )}

          {profile.bladderManagementType === "indwelling_catheter" && (
            <button
              type="button"
              onClick={() => registerEvent("bag_empty")}
              className="rounded-md bg-teal-700 px-3 py-2 text-sm text-white"
            >
              Registrar vaciado de bolsa
            </button>
          )}

          <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
            Hidratacion (ml)
            <input
              type="number"
              min={50}
              step={50}
              value={hydrationInput}
              onChange={(e) => setHydrationInput(Number(e.target.value || 0))}
              className="w-24 rounded border p-1"
            />
          </label>
          <button
            type="button"
            onClick={() => registerEvent("hydration", { hydrationMl: hydrationInput })}
            className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white"
          >
            Registrar hidratacion
          </button>

          <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
            <input type="checkbox" checked={hygieneDone} onChange={(e) => setHygieneDone(e.target.checked)} />
            Checklist higiene completado
          </label>
          <button
            type="button"
            onClick={() => registerEvent("hygiene_check", { notes: hygieneDone ? "ok" : "pendiente" })}
            className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white"
          >
            Guardar higiene
          </button>

          {profile.bladderManagementType === "indwelling_catheter" && (
            <button
              type="button"
              onClick={() => {
                registerEvent("catheter_change");
                const next = new Date();
                next.setDate(next.getDate() + 30);
                saveProfile({ ...profile, nextCatheterChangeDate: next.toISOString().slice(0, 10) });
              }}
              className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white"
            >
              Registrar cambio de sonda hoy
            </button>
          )}
        </div>

        <div className="mt-4 rounded-md bg-slate-50 p-3 text-sm text-slate-700">
          {profile.bladderManagementType === "intermittent_catheterization" && (
            <p>Horario sugerido cateterismo: 06:00, 10:00, 14:00, 18:00, 22:00. Amarilla a 1h, roja a 2h.</p>
          )}
          {profile.bladderManagementType === "indwelling_catheter" && (
            <p>Recordatorio vaciado de bolsa cada 4h aprox. Alertas por retraso y por cambio de sonda.</p>
          )}
          <p className="mt-1">Recordatorios de hidratacion cada 3-4 horas durante el dia (meta 1.5-2L).</p>
        </div>
      </section>

      <section className="card mt-6 p-6 shadow-sm">
        <h2 className="text-xl font-semibold">3) Riesgo y alertas personalizadas</h2>
        <p className="mt-2 text-sm text-slate-700">
          Riesgo actual: <span className="font-semibold uppercase">{risk.level}</span> | Puntaje: {risk.score}
        </p>
        <p className="mt-1 text-sm text-slate-700">
          Hidratacion hoy: {risk.hydrationToday} ml / {profile.hydrationTargetMl} ml
        </p>

        <div className="mt-4 space-y-2">
          {risk.alerts.length === 0 && <p className="text-sm text-green-700">Sin alertas criticas por ahora.</p>}
          {risk.alerts.map((a, i) => (
            <p key={`${a}-${i}`} className="rounded-md border border-slate-200 bg-white p-2 text-sm">
              {a}
            </p>
          ))}
        </div>
      </section>
      </>
      )}

      {isPatient && (
      <section className="card mt-6 p-6 shadow-sm">
        <h2 className="text-xl font-semibold">4) Registro diario</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="text-slate-600">
              <tr>
                <th className="pb-2">Fecha</th>
                <th className="pb-2">Evento</th>
                <th className="pb-2">Retraso (min)</th>
                <th className="pb-2">Hidratacion (ml)</th>
                <th className="pb-2">Notas</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-3 text-slate-500">
                    Aun no hay registros.
                  </td>
                </tr>
              )}
              {logs.map((e) => (
                <tr key={e.id} className="border-t">
                  <td className="py-2">{new Date(e.performedAt).toLocaleString()}</td>
                  <td className="py-2">{e.eventType}</td>
                  <td className="py-2">{e.delayMinutes}</td>
                  <td className="py-2">{e.hydrationMl ?? "-"}</td>
                  <td className="py-2">{e.notes ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      )}

      {isCaregiver && (
      <>
        <section className="card mt-6 p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Funciones de cuidador</h2>
          <p className="mt-2 text-sm text-slate-700">
            Vista del paciente vinculado y seguimiento de alertas. No puede modificar perfil clinico.
          </p>
          <div className="mt-4 grid gap-2 text-sm md:grid-cols-2">
            <p><span className="font-medium">Lesion:</span> {patientProfileView.lesionLevel}</p>
            <p><span className="font-medium">Manejo vesical:</span> {patientProfileView.bladderManagementType}</p>
            <p><span className="font-medium">Riesgo actual:</span> {risk.level.toUpperCase()}</p>
            <p><span className="font-medium">Hidratacion hoy:</span> {risk.hydrationToday} ml</p>
          </div>
        </section>

        <section className="card mt-6 p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Alertas y tareas</h2>
          <div className="mt-3 space-y-2">
            {risk.alerts.length === 0 && <p className="text-sm text-green-700">Sin alertas urgentes.</p>}
            {risk.alerts.map((a, i) => (
              <p key={`${a}-${i}`} className="rounded-md border border-slate-200 bg-white p-2 text-sm">
                {a}
              </p>
            ))}
            {delayedEvents.map((e) => (
              <p key={e.id} className="rounded-md border border-amber-200 bg-amber-50 p-2 text-sm">
                Evento tardio: {e.eventType} ({e.delayMinutes} min)
              </p>
            ))}
          </div>
        </section>

        <section className="card mt-6 p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Bitacora del cuidador</h2>
          <div className="mt-3 flex gap-2">
            <input
              value={caregiverNote}
              onChange={(e) => setCaregiverNote(e.target.value)}
              placeholder="Ej. Se apoyo en hidratacion y cambio de rutina"
              className="w-full rounded-md border p-2 text-sm"
            />
            <button type="button" onClick={addCaregiverNote} className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white">
              Guardar
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {caregiverNotes.length === 0 && <p className="text-sm text-slate-500">Sin notas registradas.</p>}
            {caregiverNotes.map((note, idx) => (
              <p key={`${note}-${idx}`} className="rounded-md border border-slate-200 p-2 text-sm">{note}</p>
            ))}
          </div>
        </section>
      </>
      )}

      {isClinician && (
      <>
        <section className="card mt-6 p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Funciones de clinico</h2>
          <p className="mt-2 text-sm text-slate-700">
            Panel de evaluacion: perfil, adherencia, riesgo y recomendaciones clinicas.
          </p>
          <div className="mt-4 grid gap-2 text-sm md:grid-cols-2">
            <p><span className="font-medium">Nivel de lesion:</span> {patientProfileView.lesionLevel}</p>
            <p><span className="font-medium">Manejo vesical:</span> {patientProfileView.bladderManagementType}</p>
            <p><span className="font-medium">Adherencia:</span> {adherenceRate}%</p>
            <p><span className="font-medium">Puntaje riesgo:</span> {risk.score}</p>
          </div>
        </section>

        <section className="card mt-6 p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Riesgo y recomendaciones</h2>
          <p className="mt-2 text-sm text-slate-700">Nivel de riesgo: <span className="font-semibold uppercase">{risk.level}</span></p>
          <div className="mt-3 space-y-2">
            {risk.alerts.map((a, i) => (
              <p key={`${a}-${i}`} className="rounded-md border border-slate-200 bg-white p-2 text-sm">{a}</p>
            ))}
            {risk.level === "red" && (
              <p className="rounded-md border border-red-200 bg-red-50 p-2 text-sm">Recomendacion: intervencion inmediata y ajuste de protocolo.</p>
            )}
            {risk.level === "yellow" && (
              <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-sm">Recomendacion: reforzar adherencia, seguimiento diario y educacion.</p>
            )}
            {risk.level === "info" && (
              <p className="rounded-md border border-green-200 bg-green-50 p-2 text-sm">Recomendacion: mantener plan actual y controles periodicos.</p>
            )}
          </div>
        </section>

        <section className="card mt-6 p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Registro clinico (solo lectura)</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="text-slate-600">
                <tr>
                  <th className="pb-2">Fecha</th>
                  <th className="pb-2">Evento</th>
                  <th className="pb-2">Retraso (min)</th>
                  <th className="pb-2">Hidratacion (ml)</th>
                  <th className="pb-2">Notas</th>
                </tr>
              </thead>
              <tbody>
                {activeLogs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-3 text-slate-500">Aun no hay registros del paciente.</td>
                  </tr>
                )}
                {activeLogs.slice(0, 20).map((e) => (
                  <tr key={e.id} className="border-t">
                    <td className="py-2">{new Date(e.performedAt).toLocaleString()}</td>
                    <td className="py-2">{e.eventType}</td>
                    <td className="py-2">{e.delayMinutes}</td>
                    <td className="py-2">{e.hydrationMl ?? "-"}</td>
                    <td className="py-2">{e.notes ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </>
      )}
    </main>
  );
}
