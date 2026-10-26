# Proof of Concept: MDT-261 Lefthook composition

## Question and Hypothesis

Can tracked local configuration register a validator alongside remote script hooks without relying on gitignored lefthook-local.yml? The hypothesis is that the installed Lefthook supports at least one tracked merge form.

## Experiment

- Runner: `python3 docs/CRs/MDT-261/poc/lefthook-merge/run.py`.
- Uses temporary consumer and remote Git repositories, a local-file Git URL, one remote script and one local sentinel. No network, application runtime or production hook mutation.
- Variants: root commands, root jobs, tracked extends configuration.
- Installed version: 2.1.8. All three variants retained both entries in `lefthook dump --format json` and executed LOCAL_OK plus REMOTE_OK with exit 0.

## Findings and Architecture Implications

- Tracked root commands are viable on the installed version; use the simpler existing command form as the candidate.
- Root lefthook.yml currently documents a merge issue on 2.1.10; this probe does not prove behavior on that other version. Do not delete the observation as false based only on 2.1.8.
- The probe establishes a composition seam, not the delivered guard. Implementation must verify the full actual effective repository configuration, including existing remotes and local CSS gate, and exercise real blocked/accepted commits in isolation.
- Before broader shared-hook rollout, record a supported version contract and validate a separate consuming project. The external repository remains unchanged.
