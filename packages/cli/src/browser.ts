import { execFile } from "node:child_process"

export function openBrowser(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const windows = process.platform === "win32"
    const command = windows ? "powershell.exe" : process.platform === "darwin" ? "open" : "xdg-open"
    const args = windows
      ? ["-NoProfile", "-NonInteractive", "-Command", "Start-Process -FilePath ([Console]::In.ReadToEnd())"]
      : [url]
    const child = execFile(command, args, { windowsHide: true, timeout: 10_000 }, (error) => {
      if (error) reject(new Error("Could not open your browser. Open the link above to continue."))
      else resolve()
    })
    // Pass the URL as data, never as PowerShell source or a shell command.
    if (windows) {
      child.stdin?.on("error", () => {})
      child.stdin?.end(url)
    }
  })
}
