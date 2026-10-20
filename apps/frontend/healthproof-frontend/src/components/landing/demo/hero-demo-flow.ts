export const DEMO_STEP_KEYS = [
  "stepOrder",
  "stepSelectLab",
  "stepLab",
  "stepPatient",
  "stepTimeline",
] as const;

export type HeroActor = "medicalCenter" | "laboratory" | "patient";
export type HeroRoute = "order" | "assignment" | "result" | "sharing";
export type DemoPhase =
  | "order"
  | "order-created"
  | "lab"
  | "permission-pending"
  | "lab-assigned"
  | "upload"
  | "file-selected"
  | "file-received"
  | "encrypting"
  | "encrypted"
  | "result-issued"
  | "patient"
  | "result-viewed"
  | "result-shared"
  | "timeline";

export interface HeroDemoState {
  isOpen: boolean;
  step: number;
  completed: boolean[];
  phase: DemoPhase;
  revision: number;
  hasFinished: boolean;
  milestones: {
    fileSelected: boolean;
    fileReceived: boolean;
    fileEncrypted: boolean;
    resultViewed: boolean;
  };
}

export type HeroDemoAction =
  | { type: "open" | "close" | "next" | "back" }
  | { type: "complete"; step: number }
  | { type: "phase"; step: number; phase: DemoPhase };

const STEP_PHASES: DemoPhase[] = [
  "order",
  "lab",
  "upload",
  "patient",
  "timeline",
];
const COMPLETED_PHASES: DemoPhase[] = [
  "order-created",
  "lab-assigned",
  "result-issued",
  "result-shared",
  "timeline",
];

export function createHeroDemoState(): HeroDemoState {
  return {
    isOpen: false,
    step: 0,
    completed: [false, false, false, false, false],
    phase: "order",
    revision: 0,
    hasFinished: false,
    milestones: {
      fileSelected: false,
      fileReceived: false,
      fileEncrypted: false,
      resultViewed: false,
    },
  };
}

export function heroDemoReducer(
  state: HeroDemoState,
  action: HeroDemoAction,
): HeroDemoState {
  if (action.type === "open") {
    return state.isOpen
      ? state
      : {
          ...createHeroDemoState(),
          isOpen: true,
          hasFinished: state.hasFinished,
          revision: state.revision + 1,
        };
  }
  if (!state.isOpen) return state;
  const update = (values: Partial<HeroDemoState>) => ({
    ...state,
    ...values,
    revision: state.revision + 1,
  });
  switch (action.type) {
    case "close":
      return update({ isOpen: false });
    case "next": {
      if (!state.completed[state.step]) return state;
      if (state.step === DEMO_STEP_KEYS.length - 1) {
        return update({ isOpen: false, hasFinished: true });
      }
      const step = state.step + 1;
      return update({ step, phase: STEP_PHASES[step] });
    }
    case "back": {
      if (state.step === 0) return update({ isOpen: false });
      const step = state.step - 1;
      return update({ step, phase: STEP_PHASES[step] });
    }
    case "complete": {
      // Completion history enables navigation; the current phase deduplicates
      // notifications without swallowing a new action after revisiting a step.
      if (
        action.step !== state.step ||
        (state.completed[action.step] &&
          state.phase === COMPLETED_PHASES[action.step])
      )
        return state;
      const completed = [...state.completed];
      completed[action.step] = true;
      const milestones = { ...state.milestones };
      if (action.step === 2) {
        milestones.fileSelected = true;
        milestones.fileReceived = true;
        milestones.fileEncrypted = true;
      }
      if (action.step === 3) milestones.resultViewed = true;
      return update({
        completed,
        milestones,
        phase: COMPLETED_PHASES[action.step],
      });
    }
    case "phase": {
      const allowed =
        action.step === 0
          ? action.phase === "order"
          : action.step === 1
            ? action.phase === "permission-pending"
            : action.step === 2
              ? [
                  "file-selected",
                  "file-received",
                  "encrypting",
                  "encrypted",
                ].includes(action.phase)
              : action.step === 3 && action.phase === "result-viewed";
      if (
        action.step !== state.step ||
        !allowed ||
        state.phase === action.phase
      )
        return state;
      const milestones = { ...state.milestones };
      if (action.phase === "file-selected") {
        milestones.fileReceived = false;
        milestones.fileEncrypted = false;
      }
      if (action.phase === "file-received" || action.phase === "encrypting")
        milestones.fileEncrypted = false;
      if (
        ["file-selected", "file-received", "encrypting", "encrypted"].includes(
          action.phase,
        )
      )
        milestones.fileSelected = true;
      if (["file-received", "encrypting", "encrypted"].includes(action.phase))
        milestones.fileReceived = true;
      if (action.phase === "encrypted") milestones.fileEncrypted = true;
      if (action.phase === "result-viewed") milestones.resultViewed = true;
      return update({ phase: action.phase, milestones });
    }
  }
}

const SCENES: Record<
  DemoPhase,
  { actor: HeroActor | null; route: HeroRoute | null; label: string }
> = {
  order: { actor: "medicalCenter", route: null, label: "doctorOrderDesc" },
  "order-created": {
    actor: "medicalCenter",
    route: "order",
    label: "orderCreated",
  },
  lab: { actor: "patient", route: null, label: "patientSelectLabDesc" },
  "permission-pending": {
    actor: "patient",
    route: null,
    label: "permissionPendingCaption",
  },
  "lab-assigned": {
    actor: "laboratory",
    route: "assignment",
    label: "labAssigned",
  },
  upload: { actor: "laboratory", route: null, label: "labPendingDesc" },
  "file-selected": {
    actor: "laboratory",
    route: null,
    label: "fileSelectedCaption",
  },
  "file-received": {
    actor: "laboratory",
    route: null,
    label: "fileReceivedCaption",
  },
  encrypting: { actor: "laboratory", route: null, label: "labEncryptDesc" },
  encrypted: { actor: "laboratory", route: null, label: "encryptedReady" },
  "result-issued": { actor: "patient", route: "result", label: "labDone" },
  patient: { actor: "patient", route: null, label: "patientReceiveDesc" },
  "result-viewed": { actor: "patient", route: null, label: "decryptedResult" },
  "result-shared": {
    actor: "medicalCenter",
    route: "sharing",
    label: "timelineShared",
  },
  timeline: { actor: null, route: null, label: "timelineTitle" },
};

export function getHeroScene(state: HeroDemoState) {
  if (!state.isOpen) return { actor: null, route: null, label: "sceneTour" };
  return SCENES[state.phase];
}

export type StageStatus = "pending" | "active" | "complete";
export interface HeroFeedback {
  orderReceived: boolean;
  permissionGranted: boolean;
  fileReceived: boolean;
  fileEncrypted: boolean;
  resultAvailable: boolean;
  resultViewed: boolean;
  accessShared: boolean;
  stages: { label: string; status: StageStatus }[];
}

/** Semantic history is independent of any presentation clock or motion preference. */
export function getHeroFeedback(state: HeroDemoState): HeroFeedback {
  const permissionGranted =
    state.completed[1] &&
    !(state.isOpen && state.phase === "permission-pending");
  const status = (complete: boolean, active: boolean): StageStatus =>
    complete ? "complete" : state.isOpen && active ? "active" : "pending";
  return {
    orderReceived: state.completed[0],
    permissionGranted,
    fileReceived: state.milestones.fileReceived,
    fileEncrypted: state.milestones.fileEncrypted,
    resultAvailable: state.completed[2],
    resultViewed: state.milestones.resultViewed,
    accessShared: state.completed[3],
    stages: [
      {
        label: "stageOrder",
        status: status(state.completed[0], state.step === 0),
      },
      {
        label: "stagePermission",
        status: status(permissionGranted, state.step === 1),
      },
      {
        label: "stageFile",
        status: status(state.milestones.fileReceived, state.step === 2),
      },
      {
        label: "stageProtection",
        status: status(
          state.milestones.fileEncrypted,
          state.phase === "encrypting",
        ),
      },
      {
        label: "stageDelivery",
        status: status(state.completed[2], state.phase === "encrypted"),
      },
      {
        label: "stageSharing",
        status: status(state.completed[3], state.step === 3),
      },
    ],
  };
}

export const EMPTY_HERO_FEEDBACK = getHeroFeedback(createHeroDemoState());
