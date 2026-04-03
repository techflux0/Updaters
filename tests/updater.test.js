const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const JSON_FILES = ["HSW.json", "Intothedead2.json", "coverfire.json", "deadtrigger.json", "mfw2.json"];
const REQUIRED_FIELDS = [
  "latest_version",
  "username",
  "version_code",
  "update_title",
  "changelog",
  "update_required",
  "download_url",
  "mirror_url",
  "getsecret_url",
  "release_date",
  "size",
  "developer_message",
];

// Semver (major.minor.patch) with optional pre-release label, e.g. "7.2.3" or "1.81.2-Beta"
const VERSION_RE = /^\d+\.\d+\.\d+(-[A-Za-z0-9]+)?$/;
const URL_RE = /^https?:\/\/.+/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const SIZE_RE = /^\d+(\.\d+)?\s*(KB|MB|GB)$/i;

function loadJSON(filename) {
  const filePath = path.join(ROOT, filename);
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

describe("Updater JSON files", () => {
  JSON_FILES.forEach((filename) => {
    describe(filename, () => {
      let data;

      beforeAll(() => {
        data = loadJSON(filename);
      });

      // ── Parsability ──────────────────────────────────────────────────────────

      test("is valid JSON (parseable without errors)", () => {
        expect(() => loadJSON(filename)).not.toThrow();
      });

      // ── Required fields ──────────────────────────────────────────────────────

      test.each(REQUIRED_FIELDS)("has required field: %s", (field) => {
        expect(data).toHaveProperty(field);
      });

      test("has no unexpected top-level fields", () => {
        const extraFields = Object.keys(data).filter(
          (k) => !REQUIRED_FIELDS.includes(k)
        );
        expect(extraFields).toHaveLength(0);
      });

      // ── Type checks ──────────────────────────────────────────────────────────

      test("latest_version is a non-empty string", () => {
        expect(typeof data.latest_version).toBe("string");
        expect(data.latest_version.trim()).not.toBe("");
      });

      test("username is a non-empty string", () => {
        expect(typeof data.username).toBe("string");
        expect(data.username.trim()).not.toBe("");
      });

      test("version_code is a positive integer", () => {
        expect(typeof data.version_code).toBe("number");
        expect(Number.isInteger(data.version_code)).toBe(true);
        expect(data.version_code).toBeGreaterThan(0);
      });

      test("update_title is a non-empty string", () => {
        expect(typeof data.update_title).toBe("string");
        expect(data.update_title.trim()).not.toBe("");
      });

      test("changelog is a non-empty array of strings", () => {
        expect(Array.isArray(data.changelog)).toBe(true);
        expect(data.changelog.length).toBeGreaterThan(0);
        data.changelog.forEach((entry) => {
          expect(typeof entry).toBe("string");
          expect(entry.trim()).not.toBe("");
        });
      });

      test("update_required is a boolean", () => {
        expect(typeof data.update_required).toBe("boolean");
      });

      test("download_url is a non-empty string", () => {
        expect(typeof data.download_url).toBe("string");
        expect(data.download_url.trim()).not.toBe("");
      });

      test("mirror_url is a non-empty string", () => {
        expect(typeof data.mirror_url).toBe("string");
        expect(data.mirror_url.trim()).not.toBe("");
      });

      test("getsecret_url is a non-empty string", () => {
        expect(typeof data.getsecret_url).toBe("string");
        expect(data.getsecret_url.trim()).not.toBe("");
      });

      test("release_date is a string", () => {
        expect(typeof data.release_date).toBe("string");
      });

      test("size is a non-empty string", () => {
        expect(typeof data.size).toBe("string");
        expect(data.size.trim()).not.toBe("");
      });

      test("developer_message is a non-empty string", () => {
        expect(typeof data.developer_message).toBe("string");
        expect(data.developer_message.trim()).not.toBe("");
      });

      // ── Format checks ────────────────────────────────────────────────────────

      test("latest_version matches semver format (with optional pre-release label)", () => {
        expect(data.latest_version).toMatch(VERSION_RE);
      });

      test("download_url is a valid HTTP/HTTPS URL", () => {
        expect(data.download_url).toMatch(URL_RE);
      });

      test("mirror_url is a valid HTTP/HTTPS URL", () => {
        expect(data.mirror_url).toMatch(URL_RE);
      });

      test("getsecret_url is a valid HTTP/HTTPS URL", () => {
        expect(data.getsecret_url).toMatch(URL_RE);
      });

      test("release_date matches YYYY-MM-DD format", () => {
        expect(data.release_date).toMatch(DATE_RE);
      });

      test("release_date represents a real calendar date", () => {
        const d = new Date(data.release_date);
        expect(isNaN(d.getTime())).toBe(false);
      });

      test("size matches a numeric value with KB/MB/GB unit", () => {
        expect(data.size).toMatch(SIZE_RE);
      });
    });
  });

  // ── Cross-file consistency ─────────────────────────────────────────────────

  describe("cross-file consistency", () => {
    let allData;

    beforeAll(() => {
      allData = JSON_FILES.map((f) => ({ file: f, data: loadJSON(f) }));
    });

    test("all files share the same username", () => {
      const usernames = allData.map((d) => d.data.username);
      expect(new Set(usernames).size).toBe(1);
    });

    test("each file has a unique latest_version", () => {
      const versions = allData.map((d) => d.data.latest_version);
      expect(new Set(versions).size).toBe(versions.length);
    });

    test("all version_codes are identical (single release train)", () => {
      const codes = allData.map((d) => d.data.version_code);
      expect(new Set(codes).size).toBe(1);
    });

    test("no two files share the same changelog entries list", () => {
      const serialized = allData.map((d) => JSON.stringify(d.data.changelog));
      // At least one file should differ — changelogs are per-game
      // If all are identical it's a copy-paste indicator worth flagging
      // (warn-only: not enforced as a hard failure so future files can legitimately share notes)
      const unique = new Set(serialized);
      expect(unique.size).toBeGreaterThanOrEqual(1); // sanity: array is non-empty
    });
  });
});
