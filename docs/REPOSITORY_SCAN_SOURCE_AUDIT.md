# Repository Scan Source Audit

## 1. Current source selection logic
In `services/api/routes/scans.py` (`run_scan_background`), the application checks if `config.repository_url` is provided. If it is, it clones the repository. If it is NOT provided (e.g. `null` from the frontend), it sets `target_dir` to `workspace_root / "tests" / "fixtures" / "Enterprise_info"`. 

## 2. Current repository clone/fetch logic
If `config.repository_url` exists, it uses `subprocess.run(["git", "clone", config.repository_url, temp_dir])` to clone the repository into a temporary directory created via `tempfile.mkdtemp()`. There is no verification of the remote or the `source_type`.

## 3. Current local fixture usage
The local fixture `tests/fixtures/Enterprise_info` is used as a silent fallback whenever `repository_url` is empty. The frontend (`apps/web/src/app/projects/[projectId]/overview/page.tsx` and `scans/page.tsx`) passes `project?.repository_url || null`. Since the `Enterprise Info` project created during demo seeding doesn't always have a strict repository URL stored in the DB (or if it was created with an empty one in the reset script), the backend falls back to the local fixture.

## 4. Current scan directory selection
The scanner (`scanner.scan_directory`) is pointed directly at `target_dir`, which is either the `temp_dir` from the clone or `tests/fixtures/Enterprise_info`.

## 5. Current commit SHA calculation
If a repository is cloned, it runs `git -C <temp_dir> rev-parse HEAD`.
If it falls back to the local fixture, it attempts to run `git -C <fixture_dir> rev-parse HEAD`. If that fails (because it wasn't a git repo until recently), it falls back to getting the SHA of the ECDAT workspace root! This means the local ECDAT repo's SHA was being incorrectly reported as the scan's SHA.

## 6. Whether the application currently scans external GitHub or local filesystem
Because the database reset script often creates the `Enterprise Info` project with an empty `repository_url`, the application has been scanning the local filesystem (`tests/fixtures/Enterprise_info`) for the demo.

## 7. Exact root cause if local fixture is being used
1. The frontend `Scan Again` button sends `repository_url: project?.repository_url || null`.
2. The project was seeded with an empty `repository_url`.
3. The backend explicitly contains a fallback block `else: target_dir = workspace_root / "tests" / "fixtures" / "Enterprise_info"`.
4. There is no strict `source_type` enforcement.

## 8. Exact files/functions that will be changed
- `services/api/models.py`: Add `source_type` to `ScanRunCreate` and `ScanRun`.
- `services/api/routes/scans.py`:
  - Modify `run_scan_background` to require `source_type == "GIT_REPOSITORY"` and a valid `repository_url`.
  - Add a new `REPOSITORY_SOURCE_VERIFICATION` stage that explicitly verifies the clone and remote.
  - Remove all fallback logic to `tests/fixtures/Enterprise_info`.
  - Log safe provenance.
- `apps/web/src/app/projects/[projectId]/overview/page.tsx` & `scans/page.tsx`:
  - Ensure the frontend sends `source_type: "GIT_REPOSITORY"` and `repository_url`.
- `apps/web/src/app/projects/[projectId]/scans/[scanId]/page.tsx`:
  - Update UI to explicitly show the `source_type` and `repository_url`.
- `scratch/reset_projects.py`:
  - Update the seeding script to set the real `https://github.com/nabeel-lab/Enterprise_info.git` URL in the project record.
- `tests/fixtures/Enterprise_info`:
  - Delete the nested `.git` directory created earlier.
