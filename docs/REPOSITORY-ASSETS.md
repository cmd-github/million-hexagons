# Repository assets

Generated runtime assets are not source-controlled unless they are required for a normal build or preserve the frozen inventory contract.

## Artwork fixtures

`public/artwork/sample/` is a retired lower-quality fixture. `public/artwork/sample-hq/` is generated on demand by `npm.cmd run build:artwork` while the Vite development server is running. Both paths are ignored because the application and deployment allowlist use `public/artwork/empty/`; generated fixtures are for local stress and performance testing only.

## Topology

`public/topology/geodesic-v1.bin` remains the frozen canonical source for regional topology generation, tests, recovery tooling and artwork compilation. Its SHA-256 is recorded in `geodesic-v1.json` and checked by the regional builder.

`geodesic-v1.bin.gz` and `geodesic-v1.packed.gz` are ignored generated outputs from `npm.cmd run build:runtime`. The visitor application uses `regions-v1/`, and the deployment allowlist excludes both monolithic compressed variants.

Moving the canonical `.bin` out of Git is a separate migration. Do not remove it until a private durable source, authenticated fetch command, fixed checksum verification and recovery documentation have been implemented and tested.
