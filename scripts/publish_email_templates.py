#!/usr/bin/env python3
"""Publish only the catalog's versioned aliases using the authenticated Resend CLI."""
import json,subprocess
from pathlib import Path
root=Path(__file__).resolve().parents[1]
def run(*args):
 r=subprocess.run(['resend',*args,'--json'],text=True,capture_output=True)
 if r.returncode: raise RuntimeError('Resend template operation failed: '+r.stderr[:300])
 return json.loads(r.stdout)
existing={t.get('alias'):t for t in run('templates','list','--limit','100')['data']}
result=[]
for item in json.loads((root/'email-templates/catalog.json').read_text()):
 alias=item['alias']
 if alias in existing:
  info=existing[alias]
  published=run('templates','get',info['id'])
  if published.get('html') != (root/'email-templates'/f"{item['key']}.html").read_text():
   raise RuntimeError('Template alias already exists with different content; create a new version: '+alias)
 else:
  info=run('templates','create','--name',item['name'],'--alias',alias,'--html-file',str(root/'email-templates'/f"{item['key']}.html"),'--text-file',str(root/'email-templates'/f"{item['key']}.txt"),'--subject','{{{TITLE}}}','--from','AI4Impact <noreply@ai4impact.in>','--reply-to','support@ai4impact.in','--var','TITLE:string','TEXT:string',*[f'BODY_{i}:string' for i in range(1,7)])
 run('templates','publish',info['id'])
 result.append({'alias':alias,'id':info['id'],'status':'published'})
 print(alias+' published',flush=True)
(root/'email-templates/published.json').write_text(json.dumps(result,indent=2)+'\n')
