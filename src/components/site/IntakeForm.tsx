"use client";

import SectionLabel from "@/components/site/SectionLabel";
import SplitHeading from "@/components/site/SplitHeading";
import { useState } from "react";

import InstantEstimate from "@/components/site/InstantEstimate";
import { PALAWAN_LOCATIONS, PROPERTY_TYPES } from "@/lib/knowledge";
import { Icon } from "@/lib/icons";
import { isPlaceholderWhatsapp, whatsappDigits } from "@/lib/whatsapp-link";
import type { SiteContent } from "@/lib/site";

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-navy-900 outline-none transition placeholder:text-slate-400 focus:border-solar-400 focus:ring-4 focus:ring-solar-400/15";
const labelClass = "mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-navy-800";

const BILL_RANGES = [
  { value: "a", label: "Below ₱2,000", mid: 1500 },
  { value: "b", label: "₱2,000 – ₱5,000", mid: 3500 },
  { value: "c", label: "₱5,000 – ₱10,000", mid: 7500 },
  { value: "d", label: "₱10,000 or more", mid: 14000 },
];

const GOALS = [
  { value: "bill", label: "Lower my electric bill", hint: "Cut what I pay each month" },
  { value: "backup", label: "Backup power during brownouts", hint: "Keep the lights on when power drops" },
  { value: "offgrid", label: "Completely off-grid", hint: "I have no power connection yet" },
  { value: "unsure", label: "Not sure yet, please recommend", hint: "We'll suggest what fits" },
];

const BROWNOUTS = [
  { value: "rarely", label: "Rarely" },
  { value: "weekly", label: "Weekly" },
  { value: "daily", label: "Daily" },
  { value: "always", label: "Almost always" },
];

const CATALOG = [
  {
    id: "cool",
    icon: "❄️",
    title: "Cooling & Air",
    note: "The biggest load in PH homes",
    items: [
      "Aircon — Window Type",
      "Aircon — Split Type Standard",
      "Aircon — Split Type Inverter",
      "Electric Fans",
      "Ceiling Fans",
    ],
  },
  {
    id: "water",
    icon: "💧",
    title: "Water & Heating",
    note: "Heavy loads",
    items: [
      "Water Pump / Deep Well Pump",
      "Bathroom Water Heater / Shower",
      "Electric Kettle",
      "Swimming Pool Pump",
    ],
  },
  {
    id: "kitchen",
    icon: "🍚",
    title: "Kitchen & Laundry",
    note: "Daily cycles",
    items: [
      "Refrigerator",
      "Chest Freezer",
      "Rice Cooker",
      "Microwave",
      "Induction Stove",
      "Washing Machine",
      "Clothes Dryer",
    ],
  },
  {
    id: "tools",
    icon: "🔌",
    title: "Entertainment, Office & Tools",
    note: "Small but constant",
    items: [
      "Television",
      "Desktop Computer / Gaming PC",
      "Laptops",
      "Starlink / WiFi Router",
      "Power Tools / Welding Machine",
    ],
  },
];

const ROOFS = ["Concrete roof", "Metal roof", "Ground mount", "Not sure"];
const SHADES = ["Full sun all day", "Some shade", "Heavy shade"];
const STEP_TITLES = ["You", "Your electric bill", "Goals & brownouts", "Appliances & roof"];

type Appliances = Record<string, number>;

function gridStateFor(goals: string[], brownouts: string) {
  if (goals.includes("offgrid")) return "off_grid";
  if (brownouts === "daily" || brownouts === "always") return "unstable";
  if (brownouts === "weekly") return "unstable";
  return "stable";
}

export default function IntakeForm({ content }: { content: SiteContent }) {
  const [step, setStep] = useState(0);
  const [contactName, setContactName] = useState("");
  const [contactWhatsapp, setContactWhatsapp] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [propertyType, setPropertyType] = useState("residential");
  const [location, setLocation] = useState(PALAWAN_LOCATIONS[0]);
  const [billRange, setBillRange] = useState("");
  const [billFile, setBillFile] = useState("");
  const [goals, setGoals] = useState<string[]>([]);
  const [brownouts, setBrownouts] = useState("weekly");
  const [appliances, setAppliances] = useState<Appliances>({});
  const [otherAppliance, setOtherAppliance] = useState("");
  const [roof, setRoof] = useState(ROOFS[0]);
  const [shade, setShade] = useState(SHADES[0]);
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  const bill = BILL_RANGES.find((range) => range.value === billRange);
  const billPhp = bill ? String(bill.mid) : "";
  const gridState = gridStateFor(goals, brownouts);
  const selectedAppliances = Object.entries(appliances).filter(([, qty]) => qty > 0);

  function toggleGoal(value: string) {
    setGoals((prev) => (prev.includes(value) ? prev.filter((g) => g !== value) : [...prev, value]));
  }

  function toggleAppliance(name: string) {
    setAppliances((prev) => {
      const next = { ...prev };
      if (next[name]) delete next[name];
      else next[name] = 1;
      return next;
    });
  }

  function setQty(name: string, qty: number) {
    setAppliances((prev) => ({ ...prev, [name]: Math.min(99, Math.max(1, qty)) }));
  }

  function stepErrors(index: number) {
    const next: Record<string, string> = {};
    if (index === 0) {
      if (contactName.trim().length < 2) next.contactName = "Please tell us your name.";
      if (!/^[+0-9()\s-]{7,20}$/.test(contactWhatsapp.trim()))
        next.contactWhatsapp = "Enter a valid WhatsApp number including country code.";
      if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim()))
        next.contactEmail = "That email address does not look right.";
    }
    if (index === 1 && !billRange) next.billRange = "Pick the range closest to your monthly bill.";
    return next;
  }

  function validateStep(index: number) {
    const next = stepErrors(index);
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function goNext() {
    if (!validateStep(step)) return;
    setStep((prev) => Math.min(3, prev + 1));
  }

  function composedNotes() {
    const applianceLine = selectedAppliances.length
      ? selectedAppliances.map(([name, qty]) => `${qty}× ${name}`).join("; ")
      : "Not listed — size from bill";
    const parts = [
      `Goals: ${goals.length ? goals.map((g) => GOALS.find((x) => x.value === g)?.label ?? g).join(", ") : "not specified"}`,
      `Brownouts: ${BROWNOUTS.find((b) => b.value === brownouts)?.label ?? brownouts}`,
      `Bill range: ${bill?.label ?? "not given"}`,
      `Appliances: ${applianceLine}`,
      otherAppliance.trim() ? `Other appliance: ${otherAppliance.trim()}` : "",
      `Panel location: ${roof}`,
      `Shade: ${shade}`,
      billFile ? `Bill file on device (to be sent via WhatsApp): ${billFile}` : "",
      notes.trim(),
    ];
    return parts.filter(Boolean).join("\n");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const combined = { ...stepErrors(0), ...stepErrors(1) };
    if (Object.keys(combined).length > 0) {
      setErrors(combined);
      setStep(stepErrors(0) && Object.keys(stepErrors(0)).length > 0 ? 0 : 1);
      return;
    }

    setStatus("sending");
    setMessage("");
    setErrors({});

    const payload = {
      contactName: contactName.trim(),
      contactWhatsapp: contactWhatsapp.trim(),
      contactEmail: contactEmail.trim(),
      propertyType,
      location,
      energyUsageKwh: "",
      monthlyBillPhp: billPhp,
      gridState,
      timeline: "planned",
      notes: composedNotes(),
      billRange,
      goals,
      brownouts,
      appliances: selectedAppliances.map(([name, qty]) => ({ name, qty })),
      otherAppliance: otherAppliance.trim(),
      roof,
      shade,
    };

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok) {
        setErrors(result.errors ?? {});
        setStatus("error");
        setMessage(result.error ?? "Something went wrong. Please try again.");
        return;
      }

      setStatus("done");
      const estimate = result.estimate as
        | { systemSizeKw: number; monthlySavingsPhp: number; paybackYears: number }
        | undefined;
      setMessage(
        estimate
          ? `${result.message as string} Instant estimate: ~${estimate.systemSizeKw} kWp, about PHP ${estimate.monthlySavingsPhp.toLocaleString("en-PH")}/month saved, payback ~${estimate.paybackYears} years. A free audit has been requested for you.`
          : (result.message as string),
      );
      setStep(0);
      setContactName("");
      setContactWhatsapp("");
      setContactEmail("");
      setBillRange("");
      setBillFile("");
      setGoals([]);
      setAppliances({});
      setOtherAppliance("");
      setNotes("");
    } catch {
      setStatus("error");
      setMessage("Network error — please check your connection and retry.");
    }
  }

  const waLink = isPlaceholderWhatsapp(content.footerWhatsapp)
    ? null
    : `https://wa.me/${whatsappDigits(content.footerWhatsapp)}?text=${encodeURIComponent(
        "Hi Amates, I'd like a solar assessment.",
      )}`;

  return (
    <section id="quote" className="bg-[var(--brand-surface-muted)] py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.15fr]">
          <div className="lg:pt-6">
            <SectionLabel index="06">{content.quoteEyebrow}</SectionLabel>
            <SplitHeading className="mt-6 text-h2 font-bold text-navy-900" lines={[content.quoteTitle]} />
            <p className="mt-5 text-[15px] leading-relaxed text-slate-600">{content.quoteBody}</p>

            <ul className="mt-7 space-y-3">
              {content.quotePerks.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-navy-800">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-solar-400 text-navy-950">
                    <Icon name="Check" className="h-3 w-3" strokeWidth={3.4} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-[11px] leading-relaxed text-slate-500">{content.quoteNote}</p>
            </div>
          </div>

          <form
            onSubmit={submit}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-navy-900/5 sm:p-8"
          >
            <div className="flex items-center gap-2">
              {[0, 1, 2, 3].map((index) => (
                <span
                  key={index}
                  className={`h-1 flex-1 rounded-full ${index <= step ? "bg-solar-400" : "bg-slate-200"}`}
                />
              ))}
              <span className="ml-2 whitespace-nowrap text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Step {step + 1} of 4
              </span>
            </div>

            <h3 className="mt-5 text-lg font-bold text-navy-900">
              <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-navy-900 text-xs font-bold text-white">
                {step + 1}
              </span>
              {STEP_TITLES[step]}
            </h3>

            {step === 0 ? (
              <div className="mt-5 space-y-4">
                <div>
                  <label className={labelClass} htmlFor="contactName">
                    Full name *
                  </label>
                  <input
                    id="contactName"
                    className={inputClass}
                    placeholder="Juan Dela Cruz"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                  />
                  {errors.contactName ? (
                    <p className="mt-1 text-xs text-red-600">{errors.contactName}</p>
                  ) : null}
                </div>

                <div className="rounded-2xl border border-solar-400 bg-[#fffdf7] p-4">
                  <label className={labelClass} htmlFor="contactWhatsapp">
                    WhatsApp number *
                  </label>
                  <input
                    id="contactWhatsapp"
                    type="tel"
                    className={inputClass}
                    placeholder="+63 917 000 0000"
                    value={contactWhatsapp}
                    onChange={(e) => setContactWhatsapp(e.target.value)}
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    We send your proposal here — this is the fastest way to reach you.
                  </p>
                  {errors.contactWhatsapp ? (
                    <p className="mt-1 text-xs text-red-600">{errors.contactWhatsapp}</p>
                  ) : null}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass} htmlFor="contactEmail">
                      Email (optional)
                    </label>
                    <input
                      id="contactEmail"
                      type="email"
                      className={inputClass}
                      placeholder="you@email.com"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                    />
                    {errors.contactEmail ? (
                      <p className="mt-1 text-xs text-red-600">{errors.contactEmail}</p>
                    ) : null}
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="propertyType">
                      Property type *
                    </label>
                    <select
                      id="propertyType"
                      className={inputClass}
                      value={propertyType}
                      onChange={(e) => setPropertyType(e.target.value)}
                    >
                      {PROPERTY_TYPES.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className={labelClass} htmlFor="location">
                    Location in Palawan *
                  </label>
                  <select
                    id="location"
                    className={inputClass}
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  >
                    {PALAWAN_LOCATIONS.map((place) => (
                      <option key={place} value={place}>
                        {place}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : null}

            {step === 1 ? (
              <div className="mt-5 space-y-4">
                <p className="text-sm text-slate-600">
                  Roughly how much you pay a month is enough — no need to dig out a bill.
                </p>
                <div>
                  <label className={labelClass} htmlFor="billRange">
                    Average monthly electric bill *
                  </label>
                  <select
                    id="billRange"
                    className={inputClass}
                    value={billRange}
                    onChange={(e) => setBillRange(e.target.value)}
                  >
                    <option value="">Choose a range…</option>
                    {BILL_RANGES.map((range) => (
                      <option key={range.value} value={range.value}>
                        {range.label}
                      </option>
                    ))}
                  </select>
                  {errors.billRange ? (
                    <p className="mt-1 text-xs text-red-600">{errors.billRange}</p>
                  ) : null}
                </div>

                <div>
                  <span className={labelClass}>Latest bill (optional)</span>
                  <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-[#fffdf7] p-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-solar-400 text-navy-950">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2.4}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4"
                      >
                        <path d="M12 16V4m0 0l-4 4m4-4l4 4M4 20h16" />
                      </svg>
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-navy-900">
                        {billFile || "Attach a photo or PDF"}
                      </span>
                      <span className="block text-xs text-slate-500">
                        Optional — we&apos;ll ask for it on WhatsApp
                      </span>
                    </span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={(e) => setBillFile(e.target.files?.[0]?.name ?? "")}
                    />
                  </label>
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="mt-5 space-y-5">
                <div>
                  <span className={labelClass}>What is your main goal for going solar?</span>
                  <div className="grid gap-2.5">
                    {GOALS.map((goal) => {
                      const checked = goals.includes(goal.value);
                      return (
                        <label
                          key={goal.value}
                          className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 transition ${
                            checked
                              ? "border-navy-900 bg-navy-900/5"
                              : "border-slate-200 bg-white hover:border-slate-300"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleGoal(goal.value)}
                            className="mt-1 h-4 w-4 accent-navy-900"
                          />
                          <span>
                            <span className="block text-sm font-semibold text-navy-900">{goal.label}</span>
                            <span className="block text-xs text-slate-500">{goal.hint}</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className={labelClass} htmlFor="brownouts">
                    How often do you experience brownouts?
                  </label>
                  <select
                    id="brownouts"
                    className={inputClass}
                    value={brownouts}
                    onChange={(e) => setBrownouts(e.target.value)}
                  >
                    {BROWNOUTS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="mt-5 space-y-4">
                <p className="text-sm text-slate-600">
                  Tick what you have — this is how we size your system correctly.
                </p>

                <div className="space-y-3">
                  {CATALOG.map((category) => {
                    const count = category.items.filter((item) => appliances[item]).length;
                    return (
                      <div key={category.id} className="overflow-hidden rounded-2xl border border-slate-200">
                        <div className="flex items-center gap-3 border-b border-slate-200 bg-[var(--brand-surface-muted)] px-4 py-3">
                          <span className="text-base">{category.icon}</span>
                          <span className="flex-1">
                            <span className="block text-sm font-bold text-navy-900">{category.title}</span>
                            <span className="block text-[11px] font-semibold text-slate-500">
                              {category.note}
                            </span>
                          </span>
                          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-500">
                            {count} selected
                          </span>
                        </div>
                        <div className="divide-y divide-slate-100 px-3">
                          {category.items.map((item) => {
                            const qty = appliances[item] ?? 0;
                            const active = qty > 0;
                            return (
                              <div key={item} className="flex items-center gap-3 py-2.5">
                                <input
                                  type="checkbox"
                                  checked={active}
                                  onChange={() => toggleAppliance(item)}
                                  className="h-4 w-4 shrink-0 accent-navy-900"
                                  aria-label={item}
                                />
                                <span className="flex-1 text-sm text-navy-900">{item}</span>
                                <span className={`flex items-center gap-1.5 ${active ? "" : "opacity-45"}`}>
                                  <button
                                    type="button"
                                    onClick={() => (active ? setQty(item, qty - 1) : toggleAppliance(item))}
                                    className="h-8 w-8 rounded-lg border border-slate-200 text-base font-bold leading-none text-navy-900 active:bg-solar-400"
                                    aria-label={`Decrease ${item}`}
                                  >
                                    −
                                  </button>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    value={active ? qty : 1}
                                    onChange={(e) => {
                                      const parsed = Number(e.target.value.replace(/[^0-9]/g, ""));
                                      if (parsed > 0) setQty(item, parsed);
                                    }}
                                    onFocus={() => {
                                      if (!active) toggleAppliance(item);
                                    }}
                                    className="w-12 rounded-lg border border-slate-200 px-1 py-1.5 text-center text-sm"
                                    aria-label={`${item} quantity`}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => (active ? setQty(item, qty + 1) : toggleAppliance(item))}
                                    className="h-8 w-8 rounded-lg border border-slate-200 text-base font-bold leading-none text-navy-900 active:bg-solar-400"
                                    aria-label={`Increase ${item}`}
                                  >
                                    +
                                  </button>
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  <div className="rounded-2xl border border-slate-200 px-4 py-3">
                    <label className={labelClass} htmlFor="otherAppliance">
                      Other appliances
                    </label>
                    <input
                      id="otherAppliance"
                      className={inputClass}
                      placeholder="e.g. gate motor, welding machine"
                      value={otherAppliance}
                      onChange={(e) => setOtherAppliance(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass} htmlFor="roof">
                      Where will the panels go?
                    </label>
                    <select
                      id="roof"
                      className={inputClass}
                      value={roof}
                      onChange={(e) => setRoof(e.target.value)}
                    >
                      {ROOFS.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="shade">
                      Is the area shaded?
                    </label>
                    <select
                      id="shade"
                      className={inputClass}
                      value={shade}
                      onChange={(e) => setShade(e.target.value)}
                    >
                      {SHADES.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className={labelClass} htmlFor="notes">
                    Anything else we should know?
                  </label>
                  <textarea
                    id="notes"
                    rows={3}
                    className={inputClass}
                    placeholder="Generator hours, roof condition, nearest town, timeline…"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
            ) : null}

            <InstantEstimate
              propertyType={propertyType}
              location={location}
              energyUsageKwh=""
              monthlyBillPhp={billPhp}
              gridState={gridState}
            />

            <div className="mt-7 flex gap-3">
              {step > 0 ? (
                <button
                  type="button"
                  onClick={() => setStep((prev) => Math.max(0, prev - 1))}
                  className="rounded-full border border-slate-300 px-7 py-4 text-xs font-bold uppercase tracking-wider text-navy-900 transition hover:border-navy-900"
                >
                  Back
                </button>
              ) : null}

              {step < 3 ? (
                <button
                  type="button"
                  onClick={goNext}
                  className="flex-1 rounded-full bg-navy-900 px-8 py-4 text-xs font-bold uppercase tracking-wider text-white transition hover:-translate-y-0.5 hover:bg-solar-500 hover:text-navy-950"
                >
                  Continue
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={status === "sending"}
                  className="flex-1 rounded-full bg-navy-900 px-8 py-4 text-xs font-bold uppercase tracking-wider text-white transition hover:-translate-y-0.5 hover:bg-solar-500 hover:text-navy-950 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {status === "sending" ? "Sending…" : "Get my free quote"}
                </button>
              )}
            </div>

            {waLink ? (
              <a
                href={waLink}
                target="_blank"
                rel="noreferrer"
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-navy-900 transition hover:border-navy-900"
              >
                Don&apos;t like forms? Chat on WhatsApp
              </a>
            ) : null}

            <p className="mt-4 text-center text-[11px] leading-relaxed text-slate-500">
              By sending you agree to be contacted by Amates Solutions about your quote. We don&apos;t
              share your details.
            </p>

            {message ? (
              <p
                className={`mt-4 rounded-xl px-4 py-3 text-sm ${
                  status === "done" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"
                }`}
              >
                {message}
              </p>
            ) : null}
          </form>
        </div>
      </div>
    </section>
  );
}
