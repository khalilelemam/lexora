## Release Tagging Policy (Scoped SemVer)

Because our repository houses multiple services (a monorepo), we strictly enforce **Scoped Semantic Versioning (SemVer)** for all release tags. This prevents tag collisions between services, ensures our CI/CD pipelines trigger correctly, and makes fetching assets predictable.

### Allowed Formats

All tags must follow the exact `<scope>-vX.Y.Z` format. 

**1. Allowed Scopes:**
* `core-` : For the main Lexora application.
* `ml-` : For the Lexora-ML service.

**2. Versioning Structure:**
* **Stable Releases:** Must use exactly three digits (Major.Minor.Patch).
  * ✅ *Good:* `core-v1.12.2`, `ml-v1.0.5`
  * ❌ *Bad:* `core-v1.12`, `ml-v1`
* **Pre-releases:** Must append a standard hyphenated pre-release identifier (e.g., `-dev.X`, `-rc.X`, `-alpha.X`).
  * ✅ *Good:* `core-v1.13.0-rc.1`, `ml-v1.1.0-alpha.1`
  * ❌ *Bad:* `core-v1.13.0_rc1`, `ml-v1.1.0beta`

### 🛑 Strict Tagging Rules

1. **No Custom Names or Build Numbers:** Legacy formats like `lexora-v66`, `v2.0.1` (missing scope), or `lexora-stable` are explicitly blocked by our GitHub Rulesets. 
2. **Immutability:** Once a release tag is pushed to the repository, it is permanently locked. You cannot delete, move, or force-push an existing tag to a new commit. 
3. **Fixing Mistakes:** If a mistake is made in a tagged release, do not attempt to overwrite it. You must bump the patch version (e.g., from `core-v1.2.0` to `core-v1.2.1`) and push a new tag.

> **Troubleshooting:** If your tag is rejected by GitHub during a `git push --tags`, verify that it strictly matches the required `core-vX.Y.Z` or `ml-vX.Y.Z` pattern.
