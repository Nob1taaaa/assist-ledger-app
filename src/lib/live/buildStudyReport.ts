import type { GitHubPullRequest } from "../repo/github";
import type { LiveTelemetrySnapshot } from "./telemetry";

export function buildStudyReportMarkdown(
  repository: string,
  pullRequests: GitHubPullRequest[],
  telemetry: LiveTelemetrySnapshot,
): string {
  const labelled = pullRequests.filter((pr) => pr.studyGroup);
  const lines = [
    `# Assist Ledger — Study Report`,
    ``,
    `**Repository:** ${repository}`,
    `**Generated:** ${new Date(telemetry.fetchedAt).toLocaleString()}`,
    ``,
    `## Summary`,
    ``,
    `| Signal | Measured value |`,
    `|--------|----------------|`,
    `| Pull requests loaded | ${pullRequests.length} |`,
    `| Labelled for study | ${labelled.length} |`,
    `| Ollama inference calls | ${telemetry.usage.calls} |`,
    `| Ollama total tokens | ${telemetry.usage.tokens.toLocaleString()} |`,
    `| Models observed | ${telemetry.usage.models.join(", ") || "—"} |`,
    `| Cursor agent edits | ${telemetry.cursor.agent} |`,
    `| Cursor tab edits | ${telemetry.cursor.tab} |`,
    `| CI runs recorded | ${telemetry.ci.runs} |`,
    ``,
    `## Notes`,
    ``,
    `- GitHub metadata does not prove AI authorship.`,
    `- Token and edit counts are instrumentation only; prompts and file contents are not stored.`,
    `- Simulation mode in the app is excluded from this report (live data only).`,
    ``,
  ];
  if (telemetry.usage.rows.length) {
    lines.push(`## Recent model usage (last ${Math.min(5, telemetry.usage.rows.length)})`, ``);
    for (const row of telemetry.usage.rows.slice(0, 5)) {
      lines.push(
        `- ${new Date(row.created_at).toLocaleString()} · ${row.model} · ${row.prompt_tokens + row.completion_tokens} tokens` +
          (row.pull_request_number ? ` · PR #${row.pull_request_number}` : ""),
      );
    }
    lines.push(``);
  }
  return lines.join("\n");
}
