import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { computeKpis, cycleTimeSeries, densitySeries, modelComparison } from "../lib/metrics";
import type { CycleBar, DensityPoint, KpiModel, ModelCard } from "../lib/metrics";
import { MemoryPullRequestRepository, MemoryTelemetryRepository } from "../lib/repo/memory";
import type { GitHubPullRequest } from "../lib/repo/github";
import { DEFAULT_STUDY_REPOSITORY, importGitHubRepository } from "../lib/live/importRepository";
import { loadPullRequestsForRepository } from "../lib/live/pullRequests";
import { listImportedRepositories } from "../lib/live/telemetry";
import { supabase } from "../lib/repo/supabaseClient";
import {
  SPEED_INTERVAL_MS,
  createSeedWorld,
  ingestPullRequest,
  pickAuthor,
  pickComplexity,
} from "../lib/sim/engine";
import { AUTHOR_LABEL, COMPLEXITY_LABEL, mulberry32 } from "../lib/sim/profiles";
import type { CiRun, Complexity, PullRequest, Speed, TokenTelemetry } from "../lib/sim/types";

export type TabId = "pulse" | "benchmark" | "ingestion" | "report";
export type DataMode = "demo" | "live";
export type GitHubImportStatus = "idle" | "importing" | "error";

const RNG_SEED = 0x51ed;

interface Boot {
  prs: MemoryPullRequestRepository;
  telemetry: MemoryTelemetryRepository;
  nextSeq: number;
}

function bootWorld(now = Date.now()): Boot {
  const world = createSeedWorld(now);
  return {
    prs: new MemoryPullRequestRepository(world.pullRequests),
    telemetry: new MemoryTelemetryRepository(world.ciRuns, world.tokenTelemetry),
    nextSeq: world.nextSeq,
  };
}

interface SimulationValue {
  pullRequests: PullRequest[];
  kpis: KpiModel;
  cycle: CycleBar[];
  density: { ai: DensityPoint[]; human: DensityPoint[] };
  models: ModelCard[];
  running: boolean;
  speed: Speed;
  preset: Complexity;
  statusText: string;
  selectedId: string | null;
  selected: PullRequest | null;
  selectedCi: CiRun[];
  selectedToken: TokenTelemetry | null;
  tab: TabId;
  dataMode: DataMode;
  lastInsertedId: string | null;
  githubPullRequests: GitHubPullRequest[] | null;
  githubRepository: string | null;
  importedRepositories: string[];
  selectedLivePrNumber: number | null;
  setGitHubData: (repository: string, pullRequests: GitHubPullRequest[]) => void;
  clearGitHubData: () => void;
  reloadLiveRepository: () => Promise<void>;
  switchLiveRepository: (repository: string) => Promise<void>;
  selectLivePr: (number: number | null) => void;
  githubImportStatus: GitHubImportStatus;
  githubImportError: string | null;
  importGitHubRepository: (repository?: string) => Promise<void>;
  toggleRunning: () => void;
  setSpeed: (speed: Speed) => void;
  setPreset: (preset: Complexity) => void;
  trigger: () => void;
  reset: () => void;
  select: (id: string | null) => void;
  setTab: (tab: TabId) => void;
  setDataMode: (mode: DataMode) => void;
}

const SimulationContext = createContext<SimulationValue | null>(null);

export function SimulationProvider({ children }: { children: ReactNode }) {
  const bootRef = useRef<Boot | null>(null);
  if (bootRef.current === null) bootRef.current = bootWorld();

  const seqRef = useRef(bootRef.current.nextSeq);
  const rngRef = useRef(mulberry32(RNG_SEED));
  const [version, setVersion] = useState(0);
  const [running, setRunning] = useState(false);
  const [speed, setSpeedState] = useState<Speed>(1);
  const [preset, setPreset] = useState<Complexity>("L2");
  const [statusText, setStatusText] = useState("Paused · historical baseline loaded");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("pulse");
  // Start on observed data. Demo values remain available only when someone
  // explicitly switches modes, so a fresh install never presents seed rows as real.
  const [dataMode, setDataModeState] = useState<DataMode>(() => window.localStorage.getItem("assist-ledger.dataMode") === "demo" ? "demo" : "live");
  const [lastInsertedId, setLastInsertedId] = useState<string | null>(null);
  const [githubPullRequests, setGitHubPullRequests] = useState<GitHubPullRequest[] | null>(null);
  const [githubRepository, setGitHubRepository] = useState<string | null>(null);
  const [importedRepositories, setImportedRepositories] = useState<string[]>([]);
  const [selectedLivePrNumber, setSelectedLivePrNumber] = useState<number | null>(null);
  const [githubImportStatus, setGitHubImportStatus] = useState<GitHubImportStatus>("idle");
  const [githubImportError, setGitHubImportError] = useState<string | null>(null);
  const autoImportAttemptedRef = useRef(false);

  const refreshImportedRepositories = useCallback(async () => {
    const repos = await listImportedRepositories();
    setImportedRepositories(repos);
  }, []);

  const applyRepository = useCallback(async (repository: string) => {
    const prs = await loadPullRequestsForRepository(repository);
    setGitHubRepository(repository);
    setGitHubPullRequests(prs.length ? prs : []);
    window.localStorage.setItem("assist-ledger.githubRepository", repository);
    window.localStorage.setItem("assist-ledger.dataMode", "live");
    setDataModeState("live");
    await refreshImportedRepositories();
  }, [refreshImportedRepositories]);

  const reloadLiveRepository = useCallback(async () => {
    if (!githubRepository) return;
    const prs = await loadPullRequestsForRepository(githubRepository);
    setGitHubPullRequests(prs);
    await refreshImportedRepositories();
  }, [githubRepository, refreshImportedRepositories]);

  const switchLiveRepository = useCallback(async (repository: string) => {
    setSelectedLivePrNumber(null);
    await applyRepository(repository);
  }, [applyRepository]);

  const selectLivePr = useCallback((number: number | null) => {
    setSelectedLivePrNumber(number);
  }, []);

  const setGitHubData = useCallback((repository: string, prs: GitHubPullRequest[]) => {
    setGitHubRepository(repository);
    setGitHubPullRequests(prs);
    window.localStorage.setItem("assist-ledger.githubRepository", repository);
    window.localStorage.setItem("assist-ledger.dataMode", "live");
    setDataModeState("live");
    setGitHubImportStatus("idle");
    setGitHubImportError(null);
    setTab("pulse");
    void refreshImportedRepositories();
  }, [refreshImportedRepositories]);

  const runGitHubImport = useCallback(async (repository?: string) => {
    const target = (repository ?? githubRepository ?? window.localStorage.getItem("assist-ledger.githubRepository") ?? DEFAULT_STUDY_REPOSITORY).trim();
    if (!target) return;
    setGitHubImportStatus("importing");
    setGitHubImportError(null);
    try {
      const result = await importGitHubRepository(target);
      setGitHubRepository(result.repository);
      setGitHubPullRequests(result.pullRequests);
      window.localStorage.setItem("assist-ledger.githubRepository", result.repository);
      window.localStorage.setItem("assist-ledger.dataMode", "live");
      setDataModeState("live");
      setGitHubImportStatus("idle");
      await refreshImportedRepositories();
    } catch (cause) {
      setGitHubImportStatus("error");
      setGitHubImportError(cause instanceof Error ? cause.message : "Import failed.");
      throw cause;
    }
  }, [githubRepository, refreshImportedRepositories]);

  useEffect(() => {
    if (!supabase) return;
    let mounted = true;
    const restore = async () => {
      const savedRepository = window.localStorage.getItem("assist-ledger.githubRepository") ?? DEFAULT_STUDY_REPOSITORY;
      let prs = await loadPullRequestsForRepository(savedRepository);
      if (!prs.length && !autoImportAttemptedRef.current) {
        autoImportAttemptedRef.current = true;
        if (!mounted) return;
        setGitHubImportStatus("importing");
        try {
          const result = await importGitHubRepository(savedRepository);
          if (!mounted) return;
          prs = result.pullRequests;
          setGitHubRepository(result.repository);
          window.localStorage.setItem("assist-ledger.githubRepository", result.repository);
          setGitHubImportError(null);
          setGitHubImportStatus("idle");
        } catch (cause) {
          if (!mounted) return;
          setGitHubImportStatus("error");
          setGitHubImportError(cause instanceof Error ? cause.message : "Could not import pull requests.");
        }
      }
      if (!mounted) return;
      setGitHubRepository(savedRepository);
      setDataModeState("live");
      setGitHubPullRequests(prs);
      await refreshImportedRepositories();
    };
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) void restore();
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        window.setTimeout(() => void restore(), 0);
      } else if (event === "SIGNED_OUT") {
        autoImportAttemptedRef.current = false;
        setGitHubRepository(null);
        setGitHubPullRequests(null);
        setImportedRepositories([]);
        setSelectedLivePrNumber(null);
        setGitHubImportStatus("idle");
        setGitHubImportError(null);
        window.localStorage.removeItem("assist-ledger.githubRepository");
      }
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [refreshImportedRepositories]);

  const pullRequests = useMemo(
    () => bootRef.current?.prs.listPullRequests() ?? [],
    [version],
  );

  const ingest = useCallback((complexity: Complexity) => {
    const boot = bootRef.current;
    if (!boot) return;
    const author = pickAuthor(rngRef.current, "ai-leaning");
    const bundle = ingestPullRequest({
      rng: rngRef.current,
      seq: seqRef.current,
      now: Date.now(),
      complexity,
      author,
    });
    seqRef.current += 1;
    boot.prs.insertPullRequest(bundle.pullRequest);
    for (const run of bundle.ciRuns) boot.telemetry.insertCiRun(run);
    if (bundle.tokenTelemetry) boot.telemetry.insertTokenTelemetry(bundle.tokenTelemetry);
    setLastInsertedId(bundle.pullRequest.id);
    setStatusText(
      `Ingested ${bundle.pullRequest.id} · ${COMPLEXITY_LABEL[complexity]} · ${AUTHOR_LABEL[author]}`,
    );
    setVersion((value) => value + 1);
  }, []);

  useEffect(() => {
    if (!running) return;
    const handle = window.setInterval(() => {
      ingest(pickComplexity(rngRef.current));
    }, SPEED_INTERVAL_MS[speed]);
    return () => window.clearInterval(handle);
  }, [running, speed, ingest]);

  const toggleRunning = useCallback(() => {
    setRunning((prev) => {
      const next = !prev;
      setStatusText(next ? `Running · ${speed}×` : "Paused");
      return next;
    });
  }, [speed]);

  const setSpeed = useCallback(
    (next: Speed) => {
      setSpeedState(next);
      if (running) setStatusText(`Running · ${next}×`);
    },
    [running],
  );

  const trigger = useCallback(() => {
    ingest(preset);
  }, [ingest, preset]);

  const reset = useCallback(() => {
    const boot = bootRef.current;
    if (!boot) return;
    const world = createSeedWorld(Date.now());
    boot.prs.replaceAll(world.pullRequests);
    boot.telemetry.replaceAll(world.ciRuns, world.tokenTelemetry);
    seqRef.current = world.nextSeq;
    rngRef.current = mulberry32(RNG_SEED);
    setRunning(false);
    setSelectedId(null);
    setLastInsertedId(null);
    setStatusText("Paused · baseline restored");
    setVersion((value) => value + 1);
  }, []);

  const select = useCallback((id: string | null) => {
    setSelectedId(id);
  }, []);

  const clearGitHubData = useCallback(() => {
    setGitHubRepository(null);
    setGitHubPullRequests(null);
    setSelectedLivePrNumber(null);
    window.localStorage.removeItem("assist-ledger.githubRepository");
    window.localStorage.setItem("assist-ledger.dataMode", "live");
    setDataModeState("live");
  }, []);
  const setDataMode = useCallback((mode: DataMode) => {
    window.localStorage.setItem("assist-ledger.dataMode", mode);
    setDataModeState(mode);
    if (mode === "live") setRunning(false);
  }, []);

  const kpis = useMemo(() => computeKpis(pullRequests), [pullRequests]);
  const cycle = useMemo(() => cycleTimeSeries(pullRequests), [pullRequests]);
  const density = useMemo(() => densitySeries(pullRequests), [pullRequests]);
  const models = useMemo(() => modelComparison(pullRequests), [pullRequests]);

  const selected = useMemo(() => {
    if (!selectedId) return null;
    return bootRef.current?.prs.getPullRequest(selectedId) ?? null;
  }, [selectedId, version]);

  const selectedCi = useMemo(() => {
    if (!selectedId) return [];
    return bootRef.current?.telemetry.listCiRuns(selectedId) ?? [];
  }, [selectedId, version]);

  const selectedToken = useMemo(() => {
    if (!selectedId) return null;
    return bootRef.current?.telemetry.listTokenTelemetry(selectedId)[0] ?? null;
  }, [selectedId, version]);

  const value = useMemo<SimulationValue>(
    () => ({
      pullRequests,
      kpis,
      cycle,
      density,
      models,
      running,
      speed,
      preset,
      statusText,
      selectedId,
      selected,
      selectedCi,
      selectedToken,
      tab,
      dataMode,
      lastInsertedId,
      githubPullRequests,
      githubRepository,
      importedRepositories,
      selectedLivePrNumber,
      setGitHubData,
      clearGitHubData,
      reloadLiveRepository,
      switchLiveRepository,
      selectLivePr,
      githubImportStatus,
      githubImportError,
      importGitHubRepository: runGitHubImport,
      toggleRunning,
      setSpeed,
      setPreset,
      trigger,
      reset,
      select,
      setTab,
      setDataMode,
    }),
    [
      pullRequests,
      kpis,
      cycle,
      density,
      models,
      running,
      speed,
      preset,
      statusText,
      selectedId,
      selected,
      selectedCi,
      selectedToken,
      tab,
      dataMode,
      lastInsertedId,
      githubPullRequests,
      githubRepository,
      importedRepositories,
      selectedLivePrNumber,
      setGitHubData,
      clearGitHubData,
      reloadLiveRepository,
      switchLiveRepository,
      selectLivePr,
      githubImportStatus,
      githubImportError,
      runGitHubImport,
      toggleRunning,
      setSpeed,
      trigger,
      reset,
      select,
      setDataMode,
    ],
  );

  return <SimulationContext.Provider value={value}>{children}</SimulationContext.Provider>;
}

export function useSimulation(): SimulationValue {
  const value = useContext(SimulationContext);
  if (!value) throw new Error("useSimulation must be used within SimulationProvider");
  return value;
}
