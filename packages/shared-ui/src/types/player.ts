/**
 * A chapter marker from Jellyfin's /Items/{Id}/PlaybackInfo endpoint.
 * StartPositionTicks uses Jellyfin's time unit (10,000,000 ticks = 1 second).
 */
export interface ChapterMarker {
  /** Start time of the chapter in ticks (10M ticks = 1 second) */
  StartPositionTicks?: number;
  /** Name/title of the chapter */
  Name?: string;
  /** Image tag for chapter thumbnail */
  ImageTag?: string;
}

/**
 * A media track (audio or subtitle) from Jellyfin's PlaybackInfo MediaStream entry.
 * Maps to the MediaStream type in the Jellyfin API response.
 */
export interface MediaTrack {
  /** Track index within its type */
  Index: number;
  /** 'Audio' or 'Subtitle' */
  Type: 'Audio' | 'Subtitle';
  /** Language code (e.g., 'eng', 'spa') */
  Language?: string;
  /** Human-readable title */
  DisplayTitle?: string;
  /** Codec name (e.g., 'aac', 'h264', 'subrip') */
  Codec?: string;
  /** Whether this is the default track */
  IsDefault?: boolean;
  /** Whether this is a forced subtitle track */
  IsForced?: boolean;
  /** Whether the subtitle is external (separate file) */
  IsExternal?: boolean;
  /** Delivery URL for external subtitles */
  DeliveryUrl?: string;
}