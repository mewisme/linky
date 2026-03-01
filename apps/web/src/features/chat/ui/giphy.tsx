"use client";

import * as React from "react";
import Image from "next/image";
import { IconSearch } from "@tabler/icons-react";

import { Button } from "@ws/ui/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@ws/ui/components/ui/popover";
import { ScrollArea } from "@ws/ui/components/ui/scroll-area";
import { cn } from "@ws/ui/lib/utils";

import {
  searchGiphy,
  trendingGiphy,
  type GiphyMediaItem,
} from "@/features/chat/lib/giphy-client";
import { ButtonGroup } from "@ws/ui/components/ui/button-group";
import { Loading } from "@/shared/ui/common/loading";

/* -------------------------------------------------- */
/* GiphyPickerContent                                 */
/* -------------------------------------------------- */

export interface GiphyPickerContentProps {
  query: string;
  onQueryChange: (query: string) => void;
  type: "gifs" | "stickers";
  onTypeChange: (type: "gifs" | "stickers") => void;
  loading: boolean;
  results: GiphyMediaItem[];
  onSelect: (item: GiphyMediaItem) => void;
  className?: string;
}

function GiphyPickerContent({
  query,
  onQueryChange,
  type,
  onTypeChange,
  loading,
  results,
  onSelect,
  className,
}: GiphyPickerContentProps) {
  return (
    <div
      className={cn("flex flex-col", className)}
      data-slot="giphy-picker-content"
    >
      <div
        className="mb-2 flex items-center gap-2"
        data-slot="giphy-picker-header"
      >
        <div className="relative flex-1">
          <IconSearch
            size={16}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search GIFs"
            className="w-full rounded-md border bg-background py-2 pl-8 pr-2 text-sm outline-none"
            data-slot="giphy-picker-search"
          />
        </div>

        <ButtonGroup>
          <Button
            size="sm"
            variant={type === "gifs" ? "default" : "outline"}
            onClick={() => onTypeChange("gifs")}
          >
            GIF
          </Button>
          <Button
            size="sm"
            variant={type === "stickers" ? "default" : "outline"}
            onClick={() => onTypeChange("stickers")}
          >
            Sticker
          </Button>
        </ButtonGroup>
      </div>

      <ScrollArea className="h-40" data-slot="giphy-picker-grid">
        <div className="grid grid-cols-3 gap-2 pr-2">
          {loading && (
            <Loading title="Loading giphy..." />
          )}

          {!loading &&
            results.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item)}
                className="overflow-hidden rounded-md border bg-muted"
                data-slot="giphy-picker-item"
              >
                <Image
                  src={item.previewUrl}
                  alt="Giphy"
                  width={120}
                  height={120}
                  className="h-full w-full object-cover"
                  unoptimized
                />
              </button>
            ))}
        </div>
      </ScrollArea>

      <p
        className="mt-2 text-center text-xs text-muted-foreground"
        data-slot="giphy-picker-attribution"
      >
        Powered by GIPHY
      </p>
    </div>
  );
}

/* -------------------------------------------------- */
/* GiphyPicker (Popover only)                          */
/* -------------------------------------------------- */

export interface GiphyPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  query: string;
  onQueryChange: (query: string) => void;
  type: "gifs" | "stickers";
  onTypeChange: (type: "gifs" | "stickers") => void;
  loading: boolean;
  results: GiphyMediaItem[];
  onSelect: (item: GiphyMediaItem) => void;
  disabled?: boolean;
  children: React.ReactNode;
}

function GiphyPicker({
  open,
  onOpenChange,
  query,
  onQueryChange,
  type,
  onTypeChange,
  loading,
  results,
  onSelect,
  disabled = false,
  children,
}: GiphyPickerProps) {
  return (
    <Popover open={open} onOpenChange={onOpenChange} modal={true}>
      <PopoverTrigger asChild>
        <Button
          size="icon"
          variant={open ? "secondary" : "ghost"}
          disabled={disabled}
          className="rounded-full"
          data-slot="giphy-picker-trigger"
        >
          {children}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        side="top"
        align="start"
        className="w-[320px] max-w-[90vw] p-3 z-200!"
        data-slot="giphy-picker-popover"
      >
        <GiphyPickerContent
          query={query}
          onQueryChange={onQueryChange}
          type={type}
          onTypeChange={onTypeChange}
          loading={loading}
          results={results}
          onSelect={onSelect}
        />
      </PopoverContent>
    </Popover>
  );
}

/* -------------------------------------------------- */
/* Hook                                               */
/* -------------------------------------------------- */

export interface GiphySelectPayload {
  item: GiphyMediaItem;
  type: "gif" | "sticker";
}

export interface UseGiphyPickerOptions {
  onSelect: (payload: GiphySelectPayload) => void;
}

export function useGiphyPicker({ onSelect }: UseGiphyPickerOptions) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [type, setType] = React.useState<"gifs" | "stickers">("gifs");
  const [results, setResults] = React.useState<GiphyMediaItem[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;

    let active = true;
    setLoading(true);

    const load = async () => {
      try {
        const data = query.trim()
          ? await searchGiphy(query, type)
          : await trendingGiphy(type);
        if (active) setResults(data);
      } catch {
        if (active) setResults([]);
      } finally {
        if (active) setLoading(false);
      }
    };

    const debounceId = window.setTimeout(load, query.trim() ? 350 : 0);
    return () => {
      active = false;
      window.clearTimeout(debounceId);
    };
  }, [open, query, type]);

  const handleSelect = React.useCallback(
    (item: GiphyMediaItem) => {
      const messageType: "gif" | "sticker" =
        type === "gifs" ? "gif" : "sticker";
      onSelect({ item, type: messageType });
      setOpen(false);
    },
    [onSelect, type]
  );

  return {
    open,
    setOpen,
    query,
    setQuery,
    type,
    setType,
    results,
    loading,
    onSelect: handleSelect,
  };
}

export { GiphyPicker, GiphyPickerContent };
export type { GiphyMediaItem };
