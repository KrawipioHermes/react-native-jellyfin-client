import { Jellyfin } from '@jellyfin/sdk';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import type { MediaTrack } from '../../types/player';
import { ItemFields } from '@jellyfin/sdk/lib/generated-client/models';
import { getItemsApi } from '@jellyfin/sdk/lib/utils/api/items-api';
import { getMediaInfoApi } from '@jellyfin/sdk/lib/utils/api/media-info-api';
import { getUserViewsApi } from '@jellyfin/sdk/lib/utils/api/user-views-api';
import { getTvShowsApi } from '@jellyfin/sdk/lib/utils/api/tv-shows-api';
import type { ChapterMarker } from '../types/player';

export const SERVER_URL = 'http://192.168.1.13:8096';

const jellyfin = new Jellyfin({
  clientInfo: { name: 'MultiTV Vega', version: '1.0.0' },
  deviceInfo: { name: 'Fire TV', id: 'multitv-vega-device' },
});

const unauthApi = () => jellyfin.createApi(SERVER_URL);
const authApi = (token: string) => jellyfin.createApi(SERVER_URL, token);

export interface QuickConnectResult {
  Code: string;
  Secret: string;
  Authenticated: boolean;
}

export interface JellyfinAuthResult {
  AccessToken: string;
  User: { Id: string; Name: string };
}

const initiateQuickConnect = async (): Promise<QuickConnectResult> => {
  const api = unauthApi();
  const response = await api.axiosInstance.post<QuickConnectResult>(
    `${api.basePath}/QuickConnect/Initiate`,
    null,
    { headers: { Authorization: api.authorizationHeader } },
  );
  return response.data;
};

const checkQuickConnect = async (secret: string): Promise<QuickConnectResult> => {
  const api = unauthApi();
  const response = await api.axiosInstance.get<QuickConnectResult>(
    `${api.basePath}/QuickConnect/Connect?Secret=${secret}`,
    { headers: { Authorization: api.authorizationHeader } },
  );
  return response.data;
};

const authenticateWithQuickConnect = async (secret: string): Promise<JellyfinAuthResult> => {
  const api = unauthApi();
  const response = await api.axiosInstance.post<JellyfinAuthResult>(
    `${api.basePath}/Users/AuthenticateWithQuickConnect`,
    { secret },
    { headers: { Authorization: api.authorizationHeader } },
  );
  return response.data;
};

const getLibraries = async (token: string, userId: string): Promise<BaseItemDto[]> => {
  const api = authApi(token);
  const response = await getUserViewsApi(api).getUserViews({ userId });
  return response.data.Items ?? [];
};

const FIRE_TV_DEVICE_PROFILE = {
  MaxStreamingBitrate: 40000000,
  DirectPlayProfiles: [],
  TranscodingProfiles: [
    {
      Container: 'ts',
      Type: 'Video',
      AudioCodec: 'aac',
      VideoCodec: 'h264',
      Context: 'Streaming',
      Protocol: 'hls',
      MaxAudioChannels: '2',
      MinSegments: '1',
      BreakOnNonKeyFrames: true,
    },
  ],
  ContainerProfiles: [],
  CodecProfiles: [],
  SubtitleProfiles: [],
};

const COLLECTION_TYPE_TO_ITEM_KIND: Record<string, string> = {
  movies: 'Movie',
  tvshows: 'Series',
  boxsets: 'BoxSet',
  homevideos: 'Video',
  musicvideos: 'MusicVideo',
  playlists: 'Playlist',
  music: 'MusicAlbum',
};

const getLibraryItems = async (
  token: string,
  userId: string,
  libraryId: string,
  collectionType?: string | null,
): Promise<BaseItemDto[]> => {
  const api = authApi(token);
  const itemKind = collectionType
    ? COLLECTION_TYPE_TO_ITEM_KIND[collectionType]
    : undefined;
  const response = await getItemsApi(api).getItems({
    userId,
    parentId: libraryId,
    fields: [ItemFields.Overview, ItemFields.Genres],
    limit: 50,
    sortBy: ['SortName', 'ProductionYear'],
    recursive: true,
    ...(itemKind ? { includeItemTypes: [itemKind as any] } : {}),
  });
  return response.data.Items ?? [];
};

const getPlaybackUrl = async (
  token: string,
  userId: string,
  itemId: string,
): Promise<{ url: string; format: string }> => {
  const api = authApi(token);
  const response = await getMediaInfoApi(api).getPostedPlaybackInfo({
    itemId,
    userId,
    autoOpenLiveStream: true,
    playbackInfoDto: {
      DeviceProfile: FIRE_TV_DEVICE_PROFILE as any,
      UserId: userId,
    },
  });

  const mediaSource = response.data.MediaSources?.[0];
  const playSessionId = response.data.PlaySessionId;

  if (!mediaSource) {
    throw new Error(`No media source available for item ${itemId}`);
  }

  if (mediaSource.TranscodingUrl) {
    return {
      url: `${SERVER_URL}${mediaSource.TranscodingUrl}`,
      format: 'HLS',
    };
  }

  const qs = `static=true&api_key=${token}&mediaSourceId=${encodeURIComponent(mediaSource.Id ?? itemId)}${playSessionId ? `&PlaySessionId=${encodeURIComponent(playSessionId)}` : ''}`;
  return {
    url: `${SERVER_URL}/Videos/${itemId}/stream?${qs}`,
    format: 'MP4',
  };
};

const getItemImageUrl = (itemId: string): string =>
  `${SERVER_URL}/Items/${itemId}/Images/Primary`;

/**
 * Extracts media tracks (audio + subtitle) from Jellyfin PlaybackInfo.
 * Calls the /Items/{Id}/PlaybackInfo endpoint and extracts MediaStream arrays.
 * NOTE: This makes a separate API call from getPlaybackUrl. Both hit the same
 * endpoint. A future optimization would share the PlaybackInfo response.
 */
const getMediaTracks = async (
  token: string,
  userId: string,
  itemId: string,
): Promise<{ audioTracks: MediaTrack[]; subtitleTracks: MediaTrack[] }> => {
  const api = authApi(token);
  const response = await getMediaInfoApi(api).getPostedPlaybackInfo({
    itemId,
    userId,
    playbackInfoDto: {
      DeviceProfile: FIRE_TV_DEVICE_PROFILE as any,
      UserId: userId,
    },
  });

  const mediaSource = response.data.MediaSources?.[0];
  const streams = mediaSource?.MediaStreams ?? [];

  const audioTracks: MediaTrack[] = [];
  const subtitleTracks: MediaTrack[] = [];

  for (const stream of streams) {
    const track: MediaTrack = {
      Index: stream.Index ?? 0,
      Type: stream.Type === 'Audio' ? 'Audio' : 'Subtitle',
      Language: stream.Language,
      DisplayTitle: stream.DisplayTitle,
      Codec: stream.Codec,
      IsDefault: stream.IsDefault,
      IsForced: stream.IsForced,
      IsExternal: stream.IsExternal,
      DeliveryUrl: stream.DeliveryUrl,
    };

    if (stream.Type === 'Audio') {
      audioTracks.push(track);
    } else if (stream.Type === 'Subtitle') {
      subtitleTracks.push(track);
    }
  }

  return { audioTracks, subtitleTracks };
};

/**
 * Fetches chapter markers from Jellyfin's PlaybackInfo.
 * Calls /Items/{Id}/PlaybackInfo and extracts Chapter markers.
 */
const getChapters = async (
  token: string,
  userId: string,
  itemId: string,
): Promise<ChapterMarker[]> => {
  const api = authApi(token);
  const response = await getMediaInfoApi(api).getPostedPlaybackInfo({
    itemId,
    userId,
    playbackInfoDto: {
      DeviceProfile: FIRE_TV_DEVICE_PROFILE as any,
      UserId: userId,
    },
  });

  const mediaSource = response.data.MediaSources?.[0];
  return (mediaSource?.Chapters as ChapterMarker[]) ?? [];
};

/**
 * Fetch a single item by ID (for next-episode item metadata).
 */
const getItem = async (
  accessToken: string,
  itemId: string,
): Promise<BaseItemDto | null> => {
  const api = authApi(accessToken);
  try {
    const response = await getItemsApi(api).getItems({
      userId: '',
      ids: [itemId],
      fields: [
        ItemFields.Overview,
        ItemFields.Genres,
        ItemFields.Providers,
      ],
      limit: 1,
    });
    return response.data.Items?.[0] ?? null;
  } catch {
    return null;
  }
};

/**
 * Fetch the next up episode for a given series (for next-episode button).
 */
const getNextUp = async (
  accessToken: string,
  userId: string,
  seriesId: string,
): Promise<BaseItemDto | null> => {
  const api = authApi(accessToken);
  try {
    const response = await getTvShowsApi(api).getNextUp({
      userId,
      seriesId,
      limit: 1,
      fields: [
        ItemFields.Overview,
        ItemFields.Genres,
        ItemFields.Providers,
      ],
    });
    return response.data.Items?.[0] ?? null;
  } catch {
    return null;
  }
};
};

export default {
  SERVER_URL,
  initiateQuickConnect,
  checkQuickConnect,
  authenticateWithQuickConnect,
  getLibraries,
  getLibraryItems,
  getPlaybackUrl,
  getItemImageUrl,
  getMediaTracks,
  getChapters,
  getItem,
  getNextUp,
  COLLECTION_TYPE_TO_ITEM_KIND,
};