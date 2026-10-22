import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, Linkedin, Sparkles } from "lucide-react";
import { Logo, APP_NAME } from "@/components/Logo";
import shotSearch from "@/assets/shot-search.jpg";
import shotResume from "@/assets/shot-resume.jpg";
import shotApply from "@/assets/shot-apply.jpg";
import shotFollowup from "@/assets/shot-followup.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${APP_NAME} — Your job search, on autopilot (free)` },
      { name: "description", content: "Free AI job search: resume match scores, company job board alerts, and an application tracker." },
      { property: "og:title", content: `${APP_NAME} — Your job search, on autopilot` },
      { property: "og:description", content: "Free AI resume matching, job alerts and application tracking." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const features = [
  { title: "AI Resume & Cover Letter Builder", text: "See how well your resume matches each job, which keywords you're missing, and what to add. Tailored resumes and cover letters are coming next.", img: shotResume },
  { title: "Application Packages, Reviewed by You", text: "Get each application ready, review it, then apply through the company's official link. Nothing is ever sent without your say-so.", img: shotApply },
  { title: "Recruiter Follow-Ups", text: "Track every application on one board and keep follow-ups on schedule so no opportunity slips through.", img: shotFollowup },
];

const integrations = [
  { name: "Gmail", description: "Stay on top of applications and follow-ups", Icon: Mail },
  { name: "LinkedIn", description: "Write outreach messages to recruiters in seconds", Icon: Linkedin },
  { name: "AI assistant", description: "AI help for writing applications, follow-ups, and interview prep", Icon: Sparkles },
];

function Cta({ full }: { full?: boolean }) {
  return (
    <Link to="/signup" className={`flex min-h-[42px] items-center justify-center rounded-md bg-primary px-[22px] text-[15px] font-semibold text-primary-foreground transition hover:brightness-90 ${full ? "w-full" : "w-fit max-md:mx-auto"}`}>
      Get Started Free
    </Link>
  );
}

function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-background">
      <header className="mx-8 flex h-[68px] max-w-[1216px] items-center justify-between xl:mx-auto">
        <Link to="/"><Logo /></Link>
        <nav className="flex items-center gap-2">
          <Link to="/login" className="grid h-[37px] place-items-center rounded-md border border-input bg-secondary px-4 text-sm">Login</Link>
          <Link to="/signup" className="grid h-[37px] place-items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground max-sm:hidden">Get Started Free</Link>
        </nav>
      </header>

      <section className="mx-8 mb-28 mt-20 grid max-w-[1216px] items-center gap-12 md:grid-cols-2 xl:mx-auto max-md:mt-10 max-md:text-center">
        <div>
          <h1 className="mb-6 text-[39px] font-bold leading-[1.03] tracking-[-0.04em] md:text-[60px]">Your Job Search,<br />On Autopilot</h1>
          <p className="mb-8 text-lg leading-relaxed text-muted-foreground">Land more interviews faster with AI resume matching, job alerts from the companies you love, and a tracker for every application. Free for everyone.</p>
          <Cta />
        </div>
        <div className="aspect-video overflow-hidden rounded-lg bg-foreground"><img src={shotSearch} alt="Job search dashboard with match scores" width={1600} height={912} className="h-full w-full object-cover" /></div>
      </section>

      <section className="mx-8 mb-44 flex max-w-[1360px] items-center gap-10 text-[15px] text-muted-foreground xl:mx-auto max-md:flex-col">
        <span>Track openings at<br className="max-md:hidden" /> companies like</span>
        <div className="flex flex-1 flex-wrap gap-x-14 gap-y-3 font-semibold text-foreground/85">
          {["Stripe", "Airbnb", "Notion", "Ramp", "Spotify", "Palantir"].map((c) => <b key={c}>{c}</b>)}
        </div>
      </section>

      <section className="mx-8 max-w-[1216px] xl:mx-auto">
        <h2 className="mb-[72px] text-center text-3xl font-bold leading-tight tracking-[-0.035em] md:text-5xl">Everything You Need to Land Your Dream Job</h2>
        {features.map((f, i) => (
          <article key={f.title} className="mb-28 grid items-center gap-12 md:grid-cols-2 md:gap-20">
            <div className={i % 2 ? "md:order-2" : ""}>
              <h3 className="mb-6 text-3xl font-bold leading-tight tracking-[-0.035em] md:text-[42px]">{f.title}</h3>
              <p className="mb-8 text-lg leading-relaxed text-muted-foreground">{f.text}</p>
              <Cta full />
            </div>
            <div className="aspect-video overflow-hidden rounded-2xl bg-foreground"><img src={f.img} alt={f.title} loading="lazy" width={1600} height={912} className="h-full w-full object-cover" /></div>
          </article>
        ))}
      </section>

      <section className="mx-8 mb-32 grid max-w-[1216px] items-center gap-16 md:grid-cols-2 xl:mx-auto">
        <div>
          <h2 className="mb-6 text-3xl font-bold leading-tight tracking-[-0.04em] md:text-[43px]">Seamlessly Integrate<br />Your Job Search Tools</h2>
          <p className="mb-8 text-lg leading-relaxed text-muted-foreground">Connect your favorite platforms to stay on top of applications, deadlines and opportunities, all in one place.</p>
          <Cta full />
        </div>
        <div className="grid gap-4">
          {integrations.map(({ name, description, Icon }) => (
            <div key={name} className="flex items-center gap-5 rounded-xl border bg-card px-6 py-5">
              <span className="grid size-[50px] shrink-0 place-items-center rounded-lg bg-surface text-primary"><Icon size={26} /></span>
              <div><h3 className="text-xl font-semibold">{name}</h3><p className="text-muted-foreground">{description}</p></div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-8 mb-9 grid max-w-[1216px] items-center gap-10 rounded-[26px] bg-secondary px-8 py-16 md:grid-cols-2 md:px-24 md:py-24 xl:mx-auto">
        <div><h2 className="mb-5 text-[31px] font-bold tracking-tight">Take control of your job search</h2><p className="text-lg text-muted-foreground">Apply smarter, follow up on time, and never lose track of an opportunity again.</p></div>
        <Cta full />
      </section>

      <footer className="mx-8 max-w-[1216px] pb-8 xl:mx-auto">
        <Logo size={28} />
        <p className="mt-8 border-t border-input pt-8 text-center text-sm text-muted-foreground">©2026 {APP_NAME}. Free forever — helping you apply smarter and get hired faster.</p>
      </footer>
    </main>
  );
}
