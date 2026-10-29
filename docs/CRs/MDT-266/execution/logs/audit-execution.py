"""Compare actual task scope and per-file source size, including untracked files."""
import hashlib,json,pathlib,re,subprocess
root=pathlib.Path.cwd()
plan=(root/'docs/CRs/MDT-266/execution/plan.md').read_text()
allowed=set(re.findall(r'^(?:server|shared|scripts|docs|tests|\.github)/[^\s|`]+\.[\w]+$|^package\.json$',plan,re.M))
allowed.update(re.findall(r'\| `([^`]+)` \|',plan))
refinements={
 'shared/services/project/ProjectConfigLoader.ts',
 'server/services/cloud-sync/TicketIdentityObservation.ts','server/services/fileWatcher/SSEBroadcaster.ts',
 'server/tests/services/cloud-sync/TicketIdentityObservation.test.ts','server/tests/unit/SSEBroadcaster.test.ts',
 'server/services/cloud-sync/ProjectionStreamManager.ts','server/tests/services/cloud-sync/ProjectionStreamManager.test.ts',
 'shared/services/cloud-sync/projection-sync.ts','shared/services/cloud-sync/__tests__/projection-sync.test.ts',
 'server/tests/integration/api.test.ts','server/tests/unit/DevLogBatch.boundaries.test.ts','server/tests/api/projects.test.ts',
 'server/tests/watcherLifecycle.test.ts','server/tests/unit/PathWatcherService.test.ts',
 'shared/services/WorktreeService.ts','shared/services/__tests__/WorktreeService.test.ts',
}
changed=subprocess.check_output(['git','diff','--name-only'],text=True).splitlines()
untracked=subprocess.check_output(['git','ls-files','--others','--exclude-standard'],text=True).splitlines()
paths=sorted(set(changed+untracked))
parent=[p for p in paths if p.startswith('docs/CRs/MDT-266') and not p.startswith('docs/CRs/MDT-266/execution/')]
artifacts=sorted(str(p.relative_to(root)) for p in (root/'docs/CRs/MDT-266/execution').rglob('*') if p.is_file())
task=[p for p in paths if p not in parent and p not in artifacts]
unauthorized=sorted(set(task)-allowed-refinements)
rows=[]
for p in task:
 old=subprocess.run(['git','show',f'4c8ae15b:{p}'],capture_output=True,text=True)
 data=(root/p).read_text()
 rows.append({'path':p,'action':'modify' if old.returncode==0 else 'create','baselineLines':len(old.stdout.splitlines()) if old.returncode==0 else 0,'currentLines':len(data.splitlines())})
result={'head':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'planSHA256':hashlib.sha256((root/'docs/CRs/MDT-266/execution/plan.md').read_bytes()).hexdigest(),'staged':subprocess.check_output(['git','diff','--cached','--name-only'],text=True).splitlines(),'unauthorized':unauthorized,'parentOwnedPreserved':parent,'taskFiles':rows,'executionArtifacts':artifacts}
(root/'docs/CRs/MDT-266/execution/logs/final-scope.json').write_text(json.dumps(result,indent=2)+'\n')
assert not unauthorized,unauthorized
assert not result['staged']
assert result['planSHA256']=='a0f4aa0178d333d8caa344f3cbde9f9d28114e7f7c054631cd0162976afef4f3'
print(json.dumps({'taskFiles':len(rows),'created':sum(r['action']=='create' for r in rows),'modified':sum(r['action']=='modify' for r in rows),'artifacts':len(artifacts),'parentFiles':len(parent),'unauthorized':unauthorized,'staged':result['staged'],'baselineLines':sum(r['baselineLines'] for r in rows),'currentLines':sum(r['currentLines'] for r in rows)},indent=2))
