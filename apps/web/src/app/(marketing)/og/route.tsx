/* eslint-disable react/no-unknown-property */

import { ImageResponse } from "next/og";
import { join } from "node:path";
import { readFile } from "node:fs/promises";

export async function GET() {
  const robotoCondensedMedium = await readFile(
    join(process.cwd(), "assets/fonts/RobotoCondensed-Medium.ttf")
  );

  return new ImageResponse(
    (
      <div
        tw="w-full h-full flex items-center justify-center text-white p-16"
        style={{
          background:
            "radial-gradient(1200px circle at 50% 50%, #18181b 0%, #000 60%)",
        }}
      >
        {/* Frame */}
        <div tw="absolute inset-16 border border-zinc-800 rounded-2xl" />

        {/* Decorative grid */}
        <div tw="absolute inset-0 flex items-center justify-center opacity-20">
          <div tw="w-[900px] h-[400px] border border-zinc-800 rounded-full blur-3xl" />
        </div>

        {/* Content */}
        <div tw="relative flex flex-col items-center text-center gap-6">
          {/* App name */}
          <h1
            tw="font-medium tracking-tight"
            style={{
              fontFamily: "RobotoCondensed",
              fontSize: 96,
            }}
          >
            Linky
          </h1>

          {/* Subtitle */}
          <p
            tw="uppercase tracking-widest text-zinc-400"
            style={{
              fontFamily: "RobotoCondensed",
              fontSize: 28,
            }}
          >
            Random Video Chat
          </p>

          {/* Tagline */}
          <p tw="text-zinc-300 max-w-[700px] text-2xl">
            Meet strangers. Talk freely. Disconnect anytime.
          </p>

          {/* Badges */}
          <div tw="flex gap-4 mt-6 space-x-2">
            {["Realtime", "Anonymous", "Global"].map((item) => (
              <div
                key={item}
                tw="px-4 py-2 rounded-full border border-zinc-700 text-zinc-200 text-lg"
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* Logo / Icon */}
        <div tw="absolute flex bottom-20 right-20">
          <svg
            role="img"
            fill="#fff"
            aria-label="Mew"
            viewBox="0 0 40 40"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M28.9 38.1H11.1c-1.9 0-3.8-.5-5.4-1.5-1.5-.9-2.8-2.2-3.7-3.8S.6 29.5.6 27.7c0-1.9.5-3.8 1.4-5.4l8.9-15.2c1-1.6 2.3-3 4-3.9 1.5-.9 3.3-1.3 5.1-1.3s3.5.4 5.1 1.3 3 2.3 4 3.9L38 22.3c1 1.7 1.5 3.5 1.4 5.4 0 1.8-.5 3.5-1.4 5.1s-2.2 2.9-3.7 3.8c-1.6 1-3.5 1.5-5.4 1.5m-10-26.3L10 27c-.3.5-.2 1 0 1.3s.5.6 1.1.6h17.8c.6 0 .9-.3 1.1-.6s.3-.7 0-1.3l-8.9-15.2c-.3-.5-.8-.6-1.1-.6s-.8.1-1.1.6"></path>
          </svg>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: "RobotoCondensed",
          data: robotoCondensedMedium,
          weight: 500,
        },
      ],
    }
  );
}
