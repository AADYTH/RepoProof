import { FormEvent, MouseEvent, useEffect, useMemo, useState } from 'react';
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion';
import {
  ArrowRight,
  Brain,
  Code2,
  Cpu,
  Github,
  GitBranch,
  Radar,
  Shield,
} from 'lucide-react';
import { analyzeRepository, isValidGitHubRepoUrl } from './lib/repoproof';
import type { AnalysisResult } from './lib/types';

const scanStages = ['Fetching repository graph', 'Embedding structure and intent', 'Ranking nearest repository clusters'];

function AnimatedScore({ score }: { score: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const duration = 900;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      setDisplay(Math.floor(progress * score));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [score]);

  return <span>{display}</span>;
}

export function App() {
  const [repoUrl, setRepoUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scanStage, setScanStage] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState('');

  const { scrollY } = useScroll();
  const bgGridY = useTransform(scrollY, [0, 1400], [0, -180]);
  const glowY = useTransform(scrollY, [0, 1400], [0, -220]);
  const neuralY = useTransform(scrollY, [0, 1400], [0, -120]);

  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const panelX = useSpring(useTransform(pointerX, [-1, 1], [-18, 18]), { stiffness: 95, damping: 24 });
  const panelY = useSpring(useTransform(pointerY, [-1, 1], [-12, 12]), { stiffness: 95, damping: 24 });

  const particles = useMemo(
    () =>
      Array.from({ length: 26 }, (_, index) => ({
        id: index,
        left: ((index * 13.7) % 100) + 0.2,
        top: ((index * 29.1) % 100) + 0.2,
        duration: 5 + (index % 5),
        delay: index * 0.14,
      })),
    []
  );

  useEffect(() => {
    if (!isAnalyzing) return;
    const timer = window.setInterval(() => {
      setScanStage((value) => (value + 1) % scanStages.length);
    }, 620);
    return () => window.clearInterval(timer);
  }, [isAnalyzing]);

  const onHeroMove = (event: MouseEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const relativeX = (event.clientX - rect.left) / rect.width;
    const relativeY = (event.clientY - rect.top) / rect.height;
    pointerX.set(relativeX * 2 - 1);
    pointerY.set(relativeY * 2 - 1);
  };

  const runAnalysis = async (url: string) => {
    if (!isValidGitHubRepoUrl(url)) {
      setError('Enter a valid GitHub repository URL like https://github.com/owner/repo');
      return;
    }

    setError('');
    setResult(null);
    setScanStage(0);
    setIsAnalyzing(true);

    try {
      const response = await analyzeRepository(url);
      setResult(response);
    } catch (analysisError) {
      console.error(analysisError);
      setError('Analysis failed. Check API connection or environment keys in .env.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const onAnalyze = async (event: FormEvent) => {
    event.preventDefault();
    await runAnalysis(repoUrl);
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-zinc-100">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <motion.div
          style={{ y: bgGridY }}
          className="absolute inset-0 bg-[radial-gradient(#262626_1px,transparent_1px)] [background-size:40px_40px] opacity-35"
        />
        <motion.div
          style={{ y: glowY }}
          className="absolute -top-40 left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-fuchsia-500/25 blur-[125px]"
        />
        <motion.div
          style={{ y: neuralY }}
          className="absolute right-[-8rem] top-[30%] h-[26rem] w-[26rem] rounded-full bg-orange-500/20 blur-[130px]"
        />
      </div>

      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0D0D0D]/75 backdrop-blur-xl">
        <div className="mx-auto flex h-18 w-full max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 via-fuchsia-500 to-orange-500">
              <Code2 className="h-4 w-4" />
            </div>
            <span className="text-2xl font-semibold tracking-tight">RepoProof</span>
          </div>
          <nav className="hidden items-center gap-7 text-sm text-zinc-300 md:flex">
            <a href="#features" className="transition-colors hover:text-white">Features</a>
            <a href="#method" className="transition-colors hover:text-white">Method</a>
            <a href="https://github.com/repoproof" target="_blank" rel="noreferrer" className="transition-colors hover:text-white">GitHub</a>
          </nav>
          <button
            onClick={() => document.getElementById('hero-input')?.focus()}
            className="rounded-2xl border border-white/20 px-5 py-2 text-sm transition-colors hover:border-white/40"
          >
            Analyze Repo
          </button>
        </div>
      </header>

      <main>
        <section onMouseMove={onHeroMove} className="relative overflow-hidden px-6 pb-22 pt-20 sm:pt-24">
          <div className="mx-auto max-w-5xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1 text-xs tracking-[0.16em] text-zinc-300">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-fuchsia-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-fuchsia-500"></span>
              </span>
              V1 ENGINE ONLINE
            </div>
            <h1 className="mx-auto max-w-4xl text-balance text-5xl font-semibold leading-[1.05] tracking-tight sm:text-7xl lg:text-[86px]">
              Know If Your Project Is Truly Original
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-400 sm:text-xl">
              Analyze any GitHub repository and detect similar projects instantly with AI.
            </p>

            <motion.div
              style={{ x: panelX, y: panelY }}
              className="mx-auto mt-10 max-w-4xl rounded-[2rem] border border-white/15 bg-zinc-950/75 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_24px_120px_rgba(0,0,0,0.68)] backdrop-blur-xl"
            >
              <form onSubmit={onAnalyze} className="relative overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/80 p-2">
                {isAnalyzing && (
                  <motion.div
                    className="pointer-events-none absolute inset-y-0 w-28 bg-gradient-to-r from-transparent via-fuchsia-300/35 to-transparent"
                    initial={{ x: '-20%' }}
                    animate={{ x: '480%' }}
                    transition={{ duration: 1.1, ease: 'linear', repeat: Infinity }}
                  />
                )}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="flex flex-1 items-center gap-3 px-4 py-2">
                    <Github className="h-5 w-5 text-zinc-500" />
                    <input
                      id="hero-input"
                      value={repoUrl}
                      onChange={(event) => setRepoUrl(event.target.value)}
                      placeholder="https://github.com/username/repository"
                      className="w-full bg-transparent text-base outline-none placeholder:text-zinc-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isAnalyzing}
                    className="rounded-2xl bg-gradient-to-r from-purple-500 via-fuchsia-500 to-orange-500 px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isAnalyzing ? scanStages[scanStage] : 'Analyze Repository'}
                  </button>
                </div>
              </form>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-zinc-500">
                {['vercel/next.js', 'supabase/supabase', 'facebook/react'].map((repo) => (
                  <button
                    key={repo}
                    onClick={() => {
                      const url = `https://github.com/${repo}`;
                      setRepoUrl(url);
                      void runAnalysis(url);
                    }}
                    className="rounded-xl border border-white/10 px-3 py-1 transition-colors hover:border-white/30"
                  >
                    Try {repo}
                  </button>
                ))}
              </div>
              {error ? <p className="mt-3 text-left text-sm text-orange-300">{error}</p> : null}
            </motion.div>

            <AnimatePresence>
              {result ? (
                <motion.div
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.35 }}
                  className="mx-auto mt-8 max-w-4xl rounded-[2rem] border border-white/10 bg-zinc-950/80 p-7 text-left backdrop-blur-xl"
                >
                  <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
                    <div className="rounded-3xl border border-white/10 bg-black/40 p-5">
                      <div className="relative mx-auto w-fit">
                        <svg viewBox="0 0 120 120" className="h-44 w-44 -rotate-90">
                          <circle cx="60" cy="60" r="52" stroke="#292929" strokeWidth="9" fill="none" />
                          <motion.circle
                            cx="60"
                            cy="60"
                            r="52"
                            stroke="url(#scoreGlow)"
                            strokeWidth="9"
                            fill="none"
                            strokeDasharray="326"
                            initial={{ strokeDashoffset: 326 }}
                            animate={{ strokeDashoffset: 326 - (326 * result.score) / 100 }}
                            transition={{ duration: 1.2, ease: 'easeOut' }}
                          />
                          <defs>
                            <linearGradient id="scoreGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#a855f7" />
                              <stop offset="52%" stopColor="#ec4899" />
                              <stop offset="100%" stopColor="#fb923c" />
                            </linearGradient>
                          </defs>
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center font-mono text-4xl font-semibold">
                          <AnimatedScore score={result.score} />%
                        </div>
                      </div>
                      <p className="mt-2 text-center text-xs uppercase tracking-[0.18em] text-zinc-400">Originality Score</p>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-purple-300">Repo: {result.repo}</p>
                      <h3 className="mt-2 text-2xl font-semibold">{result.summary}</h3>
                      <p className="mt-2 text-sm text-zinc-400">Confidence: {result.confidence}% • Scanned {new Date(result.scannedAt).toLocaleString()}</p>

                      <div className="mt-6 space-y-4">
                        {result.similarRepos.map((repo, index) => (
                          <motion.div
                            key={repo.name}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.08 + index * 0.08 }}
                          >
                            <div className="mb-2 flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2 text-zinc-300">
                                <GitBranch className="h-4 w-4 text-orange-300" />
                                <span>{repo.name}</span>
                              </div>
                              <span className="font-mono text-orange-300">{repo.similarity}%</span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                              <motion.div
                                className="h-full rounded-full bg-gradient-to-r from-orange-400 to-fuchsia-500"
                                initial={{ width: '0%' }}
                                animate={{ width: `${repo.similarity}%` }}
                                transition={{ duration: 0.85, delay: 0.24 + index * 0.08 }}
                              />
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          {particles.map((particle) => (
            <motion.span
              key={particle.id}
              className="pointer-events-none absolute h-1 w-1 rounded-full bg-white/50"
              style={{ left: `${particle.left}%`, top: `${particle.top}%` }}
              animate={{ opacity: [0.15, 0.8, 0.15], y: [0, -10, 0] }}
              transition={{ duration: particle.duration, delay: particle.delay, repeat: Infinity }}
            />
          ))}
        </section>

        <section id="features" className="mx-auto max-w-7xl px-6 py-18">
          <p className="text-xs uppercase tracking-[0.18em] text-fuchsia-300">Core Features</p>
          <h2 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">Built for real repos, not vanity scores</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              {
                icon: Shield,
                title: 'AI Similarity Detection',
                copy: 'Compares architecture intent, file graph patterns, and naming vectors.',
              },
              {
                icon: Brain,
                title: 'Code Pattern Analysis',
                copy: 'Finds overlap against common templates and generator-based projects.',
              },
              {
                icon: Radar,
                title: 'GitHub Repository Scanner',
                copy: 'Runs quickly on public repos and returns nearest clusters with percentages.',
              },
            ].map((item, index) => (
              <motion.article
                key={item.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{ delay: index * 0.08 }}
                whileHover={{ y: -6 }}
                className="rounded-3xl border border-white/10 bg-zinc-950/60 p-6 backdrop-blur-xl"
              >
                <div className="mb-4 inline-flex rounded-2xl border border-white/10 bg-white/5 p-3 text-fuchsia-300">
                  <item.icon className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-semibold">{item.title}</h3>
                <p className="mt-2 text-zinc-400">{item.copy}</p>
              </motion.article>
            ))}
          </div>
        </section>

        <section id="method" className="relative overflow-hidden border-y border-white/10 bg-[#0D0D0D] px-6 py-32">
          {/* Animated Background Grid & CPU Visual */}
          <div className="absolute inset-0 z-0 flex items-center justify-center opacity-80 pointer-events-none">
            {/* Dark box grid background */}
            <div className="absolute inset-0 flex flex-wrap gap-4 p-4 items-center justify-center opacity-40 [mask-image:radial-gradient(ellipse_70%_70%_at_50%_50%,#000_10%,transparent_100%)]">
              {Array.from({ length: 150 }).map((_, i) => (
                <div key={i} className="h-24 w-24 rounded-2xl bg-white/[0.02] border border-white/[0.04]"></div>
              ))}
            </div>
            
            <div className="relative flex items-center justify-center">
              {/* Pulsing Concentric Circles */}
              <motion.div 
                className="absolute h-64 w-64 rounded-full border border-dashed border-white/20"
                animate={{ rotate: 360, scale: [1, 1.05, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              />
              <motion.div 
                className="absolute h-[420px] w-[420px] rounded-full border border-dashed border-white/10"
                animate={{ rotate: -360, scale: [1, 1.02, 1], opacity: [0.1, 0.4, 0.1] }}
                transition={{ duration: 35, repeat: Infinity, ease: 'linear' }}
              />
              
              {/* Scanning Radar Beam */}
              <motion.div
                className="absolute top-1/2 left-1/2 h-[220px] w-[220px] origin-top-left -mt-[220px]"
                style={{ background: 'conic-gradient(from 180deg at 0% 100%, transparent 0deg, rgba(168,85,247,0.1) 60deg, transparent 90deg)' }}
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
              />

              {/* Central AI/CPU Node */}
              <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-[1.25rem] border border-white/10 bg-zinc-950/90 shadow-[0_0_60px_rgba(236,72,153,0.15)] backdrop-blur-2xl">
                <Cpu className="h-8 w-8 text-zinc-400" strokeWidth={1.5} />
              </div>
            </div>
          </div>

          <div className="relative z-10 mx-auto max-w-7xl">
            <div className="mb-16 text-center">
              <h2 className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">How the engine works</h2>
              <p className="mx-auto mt-4 max-w-2xl text-zinc-400">Our pipeline analyzes structural intent, not just raw text, to detect code cloning with extreme precision.</p>
            </div>
            
            <div className="grid gap-6 md:grid-cols-3">
              {[
                {
                  label: 'Step 01',
                  title: 'Ingest repository graph',
                  copy: 'Parse files, dependency shape, folder structure, and semantic naming map.',
                },
                {
                  label: 'Step 02',
                  title: 'Compute embeddings',
                  copy: 'Generate multi-signal embeddings for architecture and implementation patterns.',
                },
                {
                  label: 'Step 03',
                  title: 'Rank nearest neighbors',
                  copy: 'Compare against indexed repos and return weighted overlap with confidence.',
                },
              ].map((item, index) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.35 }}
                  transition={{ delay: index * 0.08 }}
                  className="rounded-3xl border border-white/10 bg-zinc-950/65 p-6"
                >
                  <p className="font-mono text-xs tracking-[0.2em] text-orange-300">{item.label}</p>
                  <h3 className="mt-3 text-2xl font-semibold">{item.title}</h3>
                  <p className="mt-2 text-zinc-400">{item.copy}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-white/10 px-6 py-20">
          <div className="mx-auto max-w-4xl rounded-[2.2rem] border border-white/10 bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900 p-10 text-center shadow-[0_20px_120px_rgba(0,0,0,0.55)]">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Ready to audit?</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight sm:text-6xl">Prove your code is truly original.</h2>
            <p className="mx-auto mt-4 max-w-xl text-zinc-400">Stop guessing. Get an instant analysis of your GitHub repository and protect your intellectual property today.</p>
            <button
              onClick={() => {
                const el = document.getElementById('hero-input');
                if (el) {
                  el.focus();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              className="mx-auto mt-8 inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200"
            >
              Scan your repository
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 px-6 py-10 text-sm text-zinc-500">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900 border border-white/10">
              <Code2 className="h-3.5 w-3.5 text-zinc-400" />
            </div>
            <span className="font-medium text-zinc-300">RepoProof</span>
          </div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-zinc-300 transition-colors">Documentation</a>
            <a href="#" className="hover:text-zinc-300 transition-colors">Privacy</a>
            <a href="#" className="hover:text-zinc-300 transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
