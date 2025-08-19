export class ActionError extends Error {
  constructor(
    message: string,
    public code: string = "ACTION_ERROR",
    public error?: unknown
  ) {
    super(message);
    this.name = "ActionError";
    if (error) {
      console.error(error);
    }
  }
}
