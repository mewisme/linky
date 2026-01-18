/* eslint-disable react/no-unknown-property */

import { ImageResponse } from "next/og";
import { join } from "node:path";
import { readFile } from "node:fs/promises";

export async function GET() {
  const robotoCondensedMedium = await readFile(
    join(process.cwd(), "src/assets/fonts/RobotoCondensed-Medium.ttf")
  );

  return new ImageResponse(
    (
      <div tw="w-full h-full flex items-center justify-center text-white bg-black p-16">
        <div tw="absolute flex inset-y-0 w-px border border-zinc-800 left-16" />
        <div tw="absolute flex inset-y-0 w-px border border-zinc-800 right-16" />
        <div tw="absolute flex inset-x-0 h-px border border-zinc-800 top-16" />
        <div tw="absolute flex inset-x-0 h-px border border-zinc-800 bottom-16" />

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

        <div tw="flex flex-col items-center justify-center"
          style={{
            fontFamily: "RobotoCondensed",
          }}
        >
          <h1
            tw="text-center font-medium"
            style={{
              fontSize: 64,
            }}
          >
            Linky
          </h1>
          <p tw="text-center text-base text-muted-foreground" style={{ fontSize: 48 }}>
            Connecting you everywhere
          </p>
        </div>
      </div >
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