'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Server, ChevronLeft, ChevronRight, Search, Play } from 'lucide-react';

interface EpisodeItem {
  name: string;
  slug: string;
  embedUrl: string;
  filename?: string;
}

interface ServerGroup {
  serverName: string;
  items: EpisodeItem[];
}

interface EpisodeSelectorProps {
  servers: ServerGroup[];
  currentServerIndex: number;
  currentEpisodeSlug: string;
  movieSlug: string;
}

export default function EpisodeSelector({
  servers,
  currentServerIndex,
  currentEpisodeSlug,
  movieSlug,
}: EpisodeSelectorProps) {
  const [searchFilter, setSearchFilter] = useState('');

  const [activeChunkIdx, setActiveChunkIdx] = useState(0);

  if (!servers || servers.length === 0) return null;

  const activeServer = servers[currentServerIndex] || servers[0];
  const episodes = activeServer?.items || [];

  const CHUNK_SIZE = 50;
  const numChunks = Math.ceil(episodes.length / CHUNK_SIZE);

  // Filter or chunk
  const activeChunkEpisodes = numChunks > 1 && !searchFilter.trim()
    ? episodes.slice(activeChunkIdx * CHUNK_SIZE, (activeChunkIdx + 1) * CHUNK_SIZE)
    : episodes;

  const filteredEpisodes = searchFilter.trim()
    ? episodes.filter((ep) =>
        ep.name.toLowerCase().includes(searchFilter.trim().toLowerCase())
      )
    : activeChunkEpisodes;

  // Find index of current episode
  const currentEpIndex = episodes.findIndex((ep) => ep.slug === currentEpisodeSlug);
  const prevEp = currentEpIndex > 0 ? episodes[currentEpIndex - 1] : null;
  const nextEp = currentEpIndex < episodes.length - 1 ? episodes[currentEpIndex + 1] : null;

  return (
    <div className="bg-[#101010] border border-[#1f1f1f] p-3.5 sm:p-6 rounded-xl sm:rounded-2xl space-y-4 sm:space-y-6 my-4 sm:my-6">
      {/* Top Bar: Prev/Next Episode Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 sm:pb-4 border-b border-[#1f1f1f]">
        <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
          {prevEp ? (
            <Link
              href={`/xem-phim/${movieSlug}?ep=${prevEp.slug}&server=${currentServerIndex}`}
              className="flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2 rounded-xl bg-[#181818] border border-[#2a2a2a] text-xs font-semibold text-white hover:border-[#e50914] hover:bg-[#222] transition-colors active:scale-95"
            >
              <ChevronLeft className="w-4 h-4 text-[#e50914]" />
              <span>Tập trước</span>
            </Link>
          ) : (
            <button
              disabled
              className="flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2 rounded-xl bg-[#121212] border border-[#1f1f1f] text-xs text-[#525252] cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Tập trước</span>
            </button>
          )}

          {nextEp ? (
            <Link
              href={`/xem-phim/${movieSlug}?ep=${nextEp.slug}&server=${currentServerIndex}`}
              className="flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2 rounded-xl bg-[#e50914] hover:bg-[#f40612] text-xs font-bold text-white transition-colors shadow-md shadow-[#e50914]/20 active:scale-95"
            >
              <span>Tập sau</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          ) : (
            <button
              disabled
              className="flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2 rounded-xl bg-[#121212] border border-[#1f1f1f] text-xs text-[#525252] cursor-not-allowed"
            >
              <span>Tập sau</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Episode Quick Filter */}
        {episodes.length > 12 && (
          <div className="relative w-full sm:w-52">
            <input
              type="text"
              placeholder="Tìm số tập..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full bg-[#181818] text-white text-xs pl-8 pr-3 py-2.5 rounded-xl border border-[#2a2a2a] min-h-[40px] focus:outline-none focus:border-[#e50914] transition-colors placeholder:text-[#737373]"
            />
            <Search className="w-3.5 h-3.5 text-[#737373] absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        )}
      </div>

      {/* Server Selector Tabs */}
      {servers.length > 1 && (
        <div className="space-y-2">
          <span className="text-[11px] sm:text-xs font-bold text-[#a3a3a3] uppercase tracking-wider flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5 text-[#e50914]" />
            Nguồn phát
          </span>
          <div className="flex flex-wrap gap-2">
            {servers.map((srv, idx) => {
              const active = idx === currentServerIndex;
              return (
                <Link
                  key={idx}
                  href={`/xem-phim/${movieSlug}?ep=${currentEpisodeSlug}&server=${idx}`}
                  className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-center transition-all ${
                    active
                      ? 'bg-[#e50914] text-white shadow-md shadow-[#e50914]/20 border border-[#e50914]'
                      : 'bg-[#181818] border border-[#2a2a2a] text-[#a3a3a3] hover:text-white hover:bg-[#222]'
                  }`}
                >
                  {srv.serverName || `Server #${idx + 1}`}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Chunk Range Selector for large series (>50 episodes) */}
      {numChunks > 1 && !searchFilter.trim() && (
        <div className="space-y-2">
          <span className="text-[11px] sm:text-xs font-bold text-[#737373] uppercase tracking-wider">
            Chọn khoảng tập
          </span>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: numChunks }).map((_, cIdx) => {
              const start = cIdx * CHUNK_SIZE + 1;
              const end = Math.min((cIdx + 1) * CHUNK_SIZE, episodes.length);
              const active = cIdx === activeChunkIdx;
              return (
                <button
                  key={cIdx}
                  type="button"
                  onClick={() => setActiveChunkIdx(cIdx)}
                  className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    active
                      ? 'bg-[#262626] border border-[#e50914] text-white font-bold'
                      : 'bg-[#141414] border border-[#222] text-[#a3a3a3] hover:text-white'
                  }`}
                >
                  {start} - {end}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Episode Grid */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] sm:text-xs font-bold text-[#a3a3a3] uppercase tracking-wider">
          <span>Danh sách tập</span>
          <span className="text-[#737373] font-normal">{episodes.length} tập</span>
        </div>

        <div className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-1.5 sm:gap-2 max-h-72 sm:max-h-80 overflow-y-auto custom-scrollbar pr-1">
          {filteredEpisodes.map((ep) => {
            const isCurrent = ep.slug === currentEpisodeSlug;
            return (
              <Link
                key={ep.slug}
                href={`/xem-phim/${movieSlug}?ep=${ep.slug}&server=${currentServerIndex}`}
                className={`min-h-[42px] px-2 py-2 text-center text-xs font-semibold rounded-xl transition-all truncate flex items-center justify-center gap-1 active:scale-95 ${
                  isCurrent
                    ? 'bg-[#e50914] text-white shadow-lg shadow-[#e50914]/25 ring-2 ring-[#e50914]'
                    : 'bg-[#181818] border border-[#262626] text-[#d4d4d4] hover:text-white hover:border-[#e50914] hover:bg-[#222]'
                }`}
              >
                {isCurrent && <Play className="w-3 h-3 fill-current shrink-0" />}
                <span className="truncate">Tập {ep.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
