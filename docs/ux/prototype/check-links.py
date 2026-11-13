#!/usr/bin/env python3
"""Checks internal links and #fragments in the prototype. Usage: python3 -I check-links.py [dir]"""
import sys,os,re
from html.parser import HTMLParser
from urllib.parse import urlsplit
d=sys.argv[1] if len(sys.argv)>1 else os.path.dirname(os.path.abspath(__file__))
class P(HTMLParser):
    def __init__(s):super().__init__();s.links=[];s.ids=set();s.labels=set();s.inputs=[];s.inlabel=0
    def handle_starttag(s,t,a):
        a=dict(a)
        if t=='label':s.inlabel+=1
        if 'id' in a:s.ids.add(a['id'])
        if t=='a' and 'href' in a:s.links.append(a['href'])
        if t in('link',) and a.get('href'):s.links.append(a['href'])
        if t=='script' and a.get('src'):s.links.append(a['src'])
        if t=='label' and a.get('for'):s.labels.add(a['for'])
        if t in('input','select','textarea') and a.get('type') not in('hidden','submit') and not s.inlabel:s.inputs.append(a)
    def handle_endtag(s,t):
        if t=='label':s.inlabel=max(0,s.inlabel-1)
pages={}
for f in sorted(os.listdir(d)):
    if f.endswith('.html'):
        p=P();p.feed(open(os.path.join(d,f)).read());pages[f]=p
bad=0;n=0
for f,p in pages.items():
    for h in p.links:
        if re.match(r'^(https?:|mailto:)',h):continue
        u=urlsplit(h);n+=1
        if h=='#' :continue   # sample placeholder links, listed separately
        tgt=u.path or f
        if not os.path.exists(os.path.join(d,tgt)):print(f'BROKEN {f}: {h}');bad+=1;continue
        if u.fragment and tgt.endswith('.html') and u.fragment not in pages[tgt].ids:print(f'BAD FRAGMENT {f}: {h}');bad+=1
    for i in p.inputs:
        if i.get('id') not in p.labels and 'aria-label' not in i:print(f'UNLABELED INPUT {f}: {i}');bad+=1
ph=sum(p.links.count('#') for p in pages.values())
print(f'{len(pages)} pages, {n} internal refs checked, {ph} "#" placeholders (SAMPLE external links), {bad} problems')
sys.exit(1 if bad else 0)
