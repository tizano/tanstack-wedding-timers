const QUERY_KEYS = {
  ALL_TIMERS: "timers",
  TIMER: "timer",
  ALL_ACTIONS: "actions",
  ACTION: "action",
} as const;

const MUTATION_KEYS = {
  START_ACTION: "start-action",
  COMPLETE_ACTION: "complete-action",
  CANCEL_ACTION: "cancel-action",
  UPDATE_TIMER: "update-timer",
  START_TIMER: "start-timer",
  RESET_WEDDING: "reset-wedding",
  START_WEDDING_DEMO: "start-wedding-demo",
};

export { MUTATION_KEYS, QUERY_KEYS };
