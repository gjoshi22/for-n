import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
rd=lambda p: open(p,encoding='utf-8').read()
def wr(p,s):
    with open(p,'w',encoding='utf-8',newline='\n') as f: f.write(s)
shell=rd('src/shell.html'); app=rd('src/app.js')
body=shell.replace('/*APP_JS*/', app)
i=body.index('<style>'); headpart, rest = body[:i], body[i:]
os.makedirs('dist',exist_ok=True)
wr('dist/artifact.html',body)
full='''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
'''+headpart+'''</head>
<body>
'''+rest+'''
</body>
</html>
'''
wr('dist/index.html',full)
print(len(full))
