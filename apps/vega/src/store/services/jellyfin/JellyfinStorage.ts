import AsyncStorage from '@amazon-devices/react-native-async-storage__async-storage';

const STORAGE_KEY = '@jellyfin_auth';

export interface JellyfinAuthData {
  accessToken: string;
  userId: string;
  userName: string;
  serverUrl: string;
}

const saveAuth = async (data: JellyfinAuthData): Promise<void> => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

const loadAuth = async (): Promise<JellyfinAuthData | null> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  return JSON.parse(raw) as JellyfinAuthData;
};

const clearAuth = async (): Promise<void> => {
  await AsyncStorage.removeItem(STORAGE_KEY);
};

export default { saveAuth, loadAuth, clearAuth };