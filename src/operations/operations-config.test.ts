import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("container operations configuration", () => {
  it("gates production traffic on readiness", () => {
    const compose = read("compose.production.yaml");

    expect(compose).toContain("http://127.0.0.1:3000/api/health/ready");
    expect(compose).toMatch(/tunnel:[\s\S]*web:[\s\S]*condition: service_healthy/);
  });
});

describe("database safety scripts", () => {
  it("creates private, verified, atomic backups with checksums outside the repository", () => {
    const script = read("scripts/backup-db.sh");

    expect(script).toContain("/var/backups/equipqr");
    expect(script).toContain("umask 077");
    expect(script).toContain("chmod 700");
    expect(script).toContain("chmod 600");
    expect(script).toContain("gzip -t");
    expect(script).toContain("stage_dir=");
    expect(script).toContain("sha256sum --check");
    expect(script).toMatch(/sha256sum --check[\s\S]*mv -- "\$stage_backup" "\$output"/);
    expect(script).toMatch(/mv -- "\$stage_backup" "\$output"[\s\S]*mv -- "\$stage_checksum" "\$checksum"/);
  });

  it("validates, snapshots, quiesces, restores, migrates, probes, and restarts", () => {
    const script = read("scripts/restore-db.sh");

    expect(script).toContain("gzip -t");
    expect(script).toContain("Checksum file is required");
    expect(script).toContain("checksum_line_count");
    expect(script).toContain("recorded_name");
    expect(script).toContain("sha256sum --check");
    expect(script).toContain("Type RESTORE");
    expect(script).toContain("backup-db.sh");
    expect(script).toContain("stop tunnel web");
    expect(script).toContain("--single-transaction");
    expect(script).toContain("run --rm migrate");
    expect(script).toContain("/api/health/ready");
    expect(script).toContain("trap on_failure ERR EXIT");
    expect(script).toMatch(/on_failure\(\)[\s\S]*stop tunnel web/);
    expect(script).toMatch(/up -d web[\s\S]*api\/health\/ready[\s\S]*up -d tunnel/);
    expect(script).not.toContain("up -d web tunnel");
  });

  it("ignores local backup artifacts", () => {
    expect(read(".gitignore")).toContain("backups/");
  });
});
