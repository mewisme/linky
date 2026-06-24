## What's Changed

✨ Features

- Introduce Ponytail guidelines for efficient coding practices ([1000350](../../commit/10003500))
- Update loading components and improve user experience across the application ([7079de7](../../commit/7079de7e))
- Enhance formatting scripts and improve code consistency across the project ([aaebfc6](../../commit/aaebfc6c))
- Add E2E_SECRET_KEY to configuration and improve error logging in video chat ([7c53d4a](../../commit/7c53d4a6))
- Enhance Cloudflare Realtime client and video chat error handling ([0e93d12](../../commit/0e93d129))
- Enhance Cloudflare Realtime client and improve video chat connection handling ([91f5865](../../commit/91f58656))
- Implement E2E relaxed call functionality for video chat ([e9a23d2](../../commit/e9a23d22))
- Implement synthetic remote stream and enhance video chat functionality ([42436e2](../../commit/42436e26))
- Add SocketReadyIndicator component for real-time socket connection status ([46443de](../../commit/46443de1))
- Add initial profile name validation logic ([d1e681b](../../commit/d1e681be))
- Implement input sanitization for user profile details ([53c8f90](../../commit/53c8f908))
- Enhance internationalization by adding time zone support ([69a12f7](../../commit/69a12f7b))
- Add render.yaml configuration for linky-api service ([234a603](../../commit/234a603b))

🐛 Bug Fixes

- Update session error handling and connection timeout in Cloudflare Realtime client ([5859059](../../commit/58590590))
- Correct profile name validation logic to return appropriate issues ([7ab3bec](../../commit/7ab3bec7))
- Reduce maximum bio length from 500 to 300 characters ([84772e7](../../commit/84772e75))
- Increase maximum profile name length from 255 to 256 characters ([be2803c](../../commit/be2803c8))

♻️ Refactoring

- Update E2E configuration and clean up video chat hooks ([e2ab263](../../commit/e2ab2632))
- Update video chat feature structure and imports ([3b4e387](../../commit/3b4e3878))
- Implement reusable save actions and streamline profile section updates ([4da748b](../../commit/4da748b4))
- Reorganize user profile components and enhance structure ([f781e7b](../../commit/f781e7bb))
- Update data-section attributes for consistency in user profile components ([5183e3c](../../commit/5183e3c5))
- Remove unused time zone import from request configuration ([f337dca](../../commit/f337dca0))
- Add data-section attributes to user profile components for improved accessibility ([6fa2df5](../../commit/6fa2df5f))
- Streamline API error handling and improve localization support ([fab30f2](../../commit/fab30f20))
- Standardize error handling responses across S3 API routes ([94f6708](../../commit/94f67088))

🔨 Other Changes

- Update .gitignore and remove obsolete speckit skills ([e109091](../../commit/e1090914))
- Add unit tests for embeddings, rooms, user experience, leveling, and push endpoint functionalities ([0190434](../../commit/0190434f))
- Update pnpm-lock.yaml by removing unused esbuild packages and refining dependency versions ([8f56093](../../commit/8f560937))
- Update package dependencies and enhance Cloudflare Realtime client ([c58e97b](../../commit/c58e97b3))
- Update docker-compose configuration and enhance video chat UI with data-testid attributes ([8649652](../../commit/86496528))
- Update clerk color variables to use oklch color format for improved theming ([e5c0a72](../../commit/e5c0a72b))
- Update global CSS variables for improved theming and consistency ([9103302](../../commit/91033022))
- Update Next.js version to 16.2.7 and adjust component styles ([d4ac9b8](../../commit/d4ac9b80))
- Update development Docker Compose configuration to include Redis service and environment variable ([72f625c](../../commit/72f625cb))
- Update package versions to 2.4.0 and refresh version lock ([d83915e](../../commit/d83915ec))


📋 Full Changelog: [d83915e...1000350](../../compare/d83915ec...10003500)