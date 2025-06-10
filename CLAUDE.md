# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

- **Build the project**: `npm run build` (compiles TypeScript to JavaScript using `tsc`)
- **Run tests**: `npm test` (executes tests using Jest)
  - To run a single test file: `npm test <path_to_test_file>` (e.g., `npm test src/test/braveSearch.test.ts`)
  - To run a specific test case within a file, you can use Jest's `-t` flag with the test name (e.g., `npm test -- -t "test case name"`)

## Code Architecture and Structure

This is a TypeScript-based Node.js project.

- **Main Source Code**: Located in the `src/` directory.
  - `src/server.ts`: This is likely the primary entry point for the server application.
  - `src/utils/`: Contains utility modules.
    - `brave_search.ts`: Implements functionality related to Brave search.
    - `parallelFetch.ts`: Provides utilities for fetching multiple URLs in parallel.
  - `src/types.ts`: Defines shared TypeScript types and interfaces used across the project.
  - `src/test/`: Contains Jest test files for the corresponding source files.
- **Build Output**: The TypeScript code is compiled into JavaScript and output to the `dist/` directory. The main executable script specified in `package.json` under `bin` is `dist/server.js`.
- **Configuration**:
  - `tsconfig.json`: Configures the TypeScript compiler.
  - `jest.config.cjs`: Configures the Jest testing framework.
- **Dependencies**: Managed via `package.json`. Key dependencies include `axios` for HTTP requests, `dotenv` for environment variables, `fastmcp`, and `zod` for schema validation.

When developing, ensure that new code is typed correctly and that tests are added for new functionalities or bug fixes. The project uses ES modules (`"type": "module"` in `package.json`).