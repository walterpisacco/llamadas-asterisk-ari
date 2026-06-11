import { hashMd5 } from "../utils/md5";

export interface UserConfig {
  username: string;
  extension: string;
  /** Contraseña almacenada como hash MD5 (32 caracteres hex). */
  password: string;
}

const STORAGE_KEY = "llamadas:userConfig";
const MD5_HEX_RE = /^[a-f0-9]{32}$/i;

export function isMd5Hash(value: string): boolean {
  return MD5_HEX_RE.test(value);
}

export function loadUserConfig(): UserConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<UserConfig>;
    if (
      typeof parsed.username !== "string" ||
      typeof parsed.extension !== "string" ||
      typeof parsed.password !== "string"
    ) {
      return null;
    }
    const password = isMd5Hash(parsed.password)
      ? parsed.password
      : hashMd5(parsed.password);

    if (password !== parsed.password) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          username: parsed.username,
          extension: parsed.extension,
          password,
        } satisfies UserConfig),
      );
    }

    return {
      username: parsed.username,
      extension: parsed.extension,
      password,
    };
  } catch {
    return null;
  }
}

export function saveUserConfig(
  config: Pick<UserConfig, "username" | "extension"> & { password: string },
  options?: { passwordAlreadyHashed?: boolean },
): void {
  const password = options?.passwordAlreadyHashed
    ? config.password
    : hashMd5(config.password);

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      username: config.username,
      extension: config.extension,
      password,
    } satisfies UserConfig),
  );
}
