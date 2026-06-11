export interface UserConfig {
  username: string;
  extension: string;
  password: string;
}

const STORAGE_KEY = "llamadas:userConfig";

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
    return {
      username: parsed.username,
      extension: parsed.extension,
      password: parsed.password,
    };
  } catch {
    return null;
  }
}

export function saveUserConfig(config: UserConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}
