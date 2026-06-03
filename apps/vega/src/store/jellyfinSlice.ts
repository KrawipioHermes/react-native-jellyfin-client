import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import JellyfinClient from '../services/jellyfin/JellyfinClient';
import JellyfinStorage from '../services/jellyfin/JellyfinStorage';

export interface JellyfinState {
  accessToken: string | null;
  userId: string | null;
  userName: string | null;
  serverUrl: string | null;
  libraries: BaseItemDto[];
  libraryItems: Record<string, BaseItemDto[]>;
  isAuthLoading: boolean;
  isLibrariesLoading: boolean;
  error: string | null;
}

const initialState: JellyfinState = {
  accessToken: null,
  userId: null,
  userName: null,
  serverUrl: null,
  libraries: [],
  libraryItems: {},
  isAuthLoading: true,
  isLibrariesLoading: false,
  error: null,
};

export const loadStoredAuth = createAsyncThunk(
  'jellyfin/loadStoredAuth',
  async () => {
    return await JellyfinStorage.loadAuth();
  },
);

export const fetchLibraries = createAsyncThunk(
  'jellyfin/fetchLibraries',
  async (_: void, { getState }) => {
    const state = (getState() as any).jellyfin as JellyfinState;
    if (!state.accessToken || !state.userId) {
      throw new Error('Not authenticated');
    }
    return await JellyfinClient.getLibraries(state.accessToken, state.userId);
  },
);

export const fetchLibraryItems = createAsyncThunk(
  'jellyfin/fetchLibraryItems',
  async (
    { libraryId, collectionType }: { libraryId: string; collectionType?: string | null },
    { getState },
  ) => {
    const state = (getState() as any).jellyfin as JellyfinState;
    if (!state.accessToken || !state.userId) {
      throw new Error('Not authenticated');
    }
    const items = await JellyfinClient.getLibraryItems(
      state.accessToken,
      state.userId,
      libraryId,
      collectionType,
    );
    return { libraryId, items };
  },
);

const jellyfinSlice = createSlice({
  name: 'jellyfin',
  initialState,
  reducers: {
    setAuth(
      state,
      action: PayloadAction<{
        accessToken: string;
        userId: string;
        userName: string;
        serverUrl: string;
      }>,
    ) {
      state.accessToken = action.payload.accessToken;
      state.userId = action.payload.userId;
      state.userName = action.payload.userName;
      state.serverUrl = action.payload.serverUrl;
      state.isAuthLoading = false;
    },
    clearAuth(state) {
      state.accessToken = null;
      state.userId = null;
      state.userName = null;
      state.serverUrl = null;
      state.libraries = [];
      state.libraryItems = {};
      state.isAuthLoading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadStoredAuth.pending, (state) => {
        state.isAuthLoading = true;
      })
      .addCase(loadStoredAuth.fulfilled, (state, action) => {
        state.isAuthLoading = false;
        if (action.payload) {
          state.accessToken = action.payload.accessToken;
          state.userId = action.payload.userId;
          state.userName = action.payload.userName;
          state.serverUrl = action.payload.serverUrl;
        }
      })
      .addCase(loadStoredAuth.rejected, (state) => {
        state.isAuthLoading = false;
      })
      .addCase(fetchLibraries.pending, (state) => {
        state.isLibrariesLoading = true;
        state.error = null;
      })
      .addCase(fetchLibraries.fulfilled, (state, action) => {
        state.isLibrariesLoading = false;
        state.libraries = action.payload;
      })
      .addCase(fetchLibraries.rejected, (state, action) => {
        state.isLibrariesLoading = false;
        state.error = action.error.message ?? 'Failed to fetch libraries';
      })
      .addCase(fetchLibraryItems.fulfilled, (state, action) => {
        state.libraryItems[action.payload.libraryId] = action.payload.items;
      });
  },
});

export const { setAuth, clearAuth } = jellyfinSlice.actions;
export default jellyfinSlice.reducer;