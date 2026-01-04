export async function register() {
  // Only run on server
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startWatcher } = await import("./lib/watcher");
    startWatcher();
  }
}
