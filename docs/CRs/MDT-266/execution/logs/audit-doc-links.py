"""Check relative Markdown file targets and fence pairing in affected owner docs."""
import json,pathlib,re,subprocess
root=pathlib.Path.cwd()
files=[p for p in subprocess.check_output(['git','diff','--name-only'],text=True).splitlines() if p.endswith('.md') and not p.startswith('docs/CRs/')]
files += ['docs/CRs/MDT-266/execution/'+name+'.md' for name in ['baseline','plan','result']]
checked=[];broken=[];unclosed=[]
for name in files:
 p=root/name;text=p.read_text();visible=[];fence=None
 for i,line in enumerate(text.splitlines(),1):
  m=re.match(r'^\s*(`{3,}|~{3,})',line)
  if m:
   marker=m[1][0]
   fence=None if fence==marker else marker
  elif fence is None:visible.append(line)
 if fence:unclosed.append(name)
 for match in re.finditer(r'\[[^\]]*\]\((<[^>]*>|[^\s)]+)(?:\s+"[^"]*")?\)', '\n'.join(visible)):
  target=match[1].strip('<>')
  if re.match(r'^[\w+.-]+:',target) or target.startswith('#'):continue
  target=target.split('#')[0].split('?')[0]
  if not target:continue
  resolved=pathlib.Path(target) if target.startswith('/') else p.parent/target
  row={'from':name,'target':target,'exists':resolved.exists()}
  checked.append(row)
  if not row['exists']:broken.append(row)
result={'documents':len(files),'checkedRelativeFileLinks':len(checked),'broken':broken,'unclosedFences':unclosed,'links':checked,'limits':'Local target existence/fence pairing; external URLs and heading anchors not checked automatically.'}
(root/'docs/CRs/MDT-266/execution/logs/final-doc-links.json').write_text(json.dumps(result,indent=2)+'\n')
assert not broken,broken
assert not unclosed,unclosed
print(json.dumps({k:v for k,v in result.items() if k!='links'},indent=2))
