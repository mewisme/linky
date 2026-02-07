export interface GiphyMediaItem {
  id: string;
  url: string;
  previewUrl: string;
  width: number;
  height: number;
}

type GiphyMediaType = "gifs" | "stickers";

const apiBase = "https://api.giphy.com/v1";

function getApiKey(): string {
  const key = process.env.NEXT_PUBLIC_GIPHY_API_KEY;
  if (!key) {
    throw new Error("NEXT_PUBLIC_GIPHY_API_KEY is not set");
  }
  return key;
}

async function fetchGiphy(endpoint: string, params: Record<string, string>): Promise<GiphyMediaItem[]> {
  const apiKey = getApiKey();
  const url = new URL(`${apiBase}/${endpoint}`);
  url.searchParams.set("api_key", apiKey);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error("Giphy request failed");
  }
  const payload = (await response.json()) as {
    data: Array<{
      id: string;
      images: {
        fixed_width: { url: string; width: string; height: string };
        fixed_width_downsampled?: { url: string; width: string; height: string };
        fixed_width_small?: { url: string; width: string; height: string };
      };
    }>;
  };

  return payload.data.map((item) => {
    const image = item.images.fixed_width;
    const preview = item.images.fixed_width_small || item.images.fixed_width_downsampled || image;
    return {
      id: item.id,
      url: image.url,
      previewUrl: preview.url,
      width: Number(image.width),
      height: Number(image.height),
    };
  });
}

export async function searchGiphy(
  query: string,
  mediaType: GiphyMediaType,
  limit: number = 24
): Promise<GiphyMediaItem[]> {
  if (!query.trim()) {
    return [];
  }
  return await fetchGiphy(`${mediaType}/search`, {
    q: query,
    limit: String(limit),
    rating: "pg-13",
  });
}

export async function trendingGiphy(
  mediaType: GiphyMediaType,
  limit: number = 24
): Promise<GiphyMediaItem[]> {
  return await fetchGiphy(`${mediaType}/trending`, {
    limit: String(limit),
    rating: "pg-13",
  });
}
