import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  cacheKeys,
  readImmutable,
  readWithTtl,
  writeImmutable,
  writeWithTtl,
} from "@/app/lib/storage";

describe("cacheKeys", () => {
  it("namespaces punk svg keys by index", () => {
    expect(cacheKeys.punkSvg(7)).toBe("punk:7:svg");
  });

  it("lowercases addresses in ownership keys", () => {
    expect(
      cacheKeys.ownership("0xB47E3CD837DDF8E4C57F05D70AB865DE6E193BBB"),
    ).toBe("owner:0xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb");
  });
});

describe("immutable storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("round-trips values", () => {
    writeImmutable("punk:1:svg", { svg: "<svg/>" });
    expect(readImmutable("punk:1:svg")).toEqual({ svg: "<svg/>" });
  });

  it("returns null for missing keys", () => {
    expect(readImmutable("nope")).toBeNull();
  });

  it("returns null on malformed json", () => {
    window.localStorage.setItem("punks-cache:v1:bad", "not-json");
    expect(readImmutable("bad")).toBeNull();
  });
});

describe("ttl storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useRealTimers();
  });

  it("returns the stored value when fresh", () => {
    writeWithTtl("k", { count: 1 });
    expect(readWithTtl("k", 60_000)).toEqual({ count: 1 });
  });

  it("returns null when expired", () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    writeWithTtl("k", "v");
    vi.setSystemTime(60_001);
    expect(readWithTtl("k", 60_000)).toBeNull();
  });
});
