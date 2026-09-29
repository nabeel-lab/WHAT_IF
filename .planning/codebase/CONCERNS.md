# Concerns

- **AST Engine Scalability**: Currently, the scanner works brilliantly for Python via `ast`. As language support grows, we will need to integrate `Tree-sitter` for generalized parsing across multiple languages.
- **Dynamic Input**: The repository path is currently hardcoded to `CareVault` in Phase 1 to prevent arbitrary ZIP uploads and directory traversal. This will need a secure extraction sandbox mechanism in subsequent phases.
- **Mocking**: Frontend dashboard currently mocks the `filesScanned` integer; this should be updated to pull directly from the `scan_runs` completed data in Phase 2.
