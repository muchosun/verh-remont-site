"""Build a public static proposal; never deploy or send messages."""
from pathlib import Path
from decimal import Decimal
import argparse,json,html,re,secrets,shutil

ROOT=Path(__file__).resolve().parents[1]
ICONS=[
 '<path d="M4 20V4h6v16M14 20V4h6v16M10 8h4M10 16h4"/>',
 '<path d="m13 2-8 12h6l-1 8 9-13h-6l1-7Z"/>',
 '<path d="M9 18h6M10 21h4M8 13a6 6 0 1 1 8 0l-1 3H9l-1-3Z"/>',
 '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M9 3v18M15 3v18M4 9h16M4 15h16"/>',
 '<path d="m3 9 9-6 9 6-9 6-9-6Zm0 6 9 6 9-6M7.5 12v6M16.5 12v6"/>',
 '<rect x="3" y="3" width="18" height="18" rx="1"/><path d="M3 12h18M12 3v18"/>',
 '<path d="M4 11h16M6 11v4a6 6 0 0 0 12 0v-4M7 20l-1 2M17 20l1 2M7 11V5a3 3 0 0 1 6 0v1M11 6h4"/>',
 '<path d="M3 5h18M5 5v13M19 5v13M8 9h8M8 13h8M8 17h8"/>']
def svg(body):return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+body+'</svg>'
def number(x):
 s=format(Decimal(str(x)),'f').rstrip('0').rstrip('.') if '.' in str(x) else str(x)
 whole,dot,fraction=s.partition('.')
 return format(int(whole),',').replace(',',' ')+((','+fraction) if dot else '')
def build(data_path,assets_dir,slug,pdf=None):
 d=json.loads(Path(data_path).read_text());assets=Path(assets_dir)
 area,rate,total=[Decimal(str(d[k])) for k in ('area','rate','total')]
 if not all(v.is_finite() and v>0 for v in (area,rate,total)) or area*rate!=total:raise ValueError('Area × rate must equal the positive total')
 if len(d['references'])!=6 or len(d['work'])!=8:raise ValueError('This template requires 6 references and 8 work entries')
 if not re.fullmatch(r'[a-z0-9][a-z0-9-]{4,80}',slug):raise ValueError('Invalid slug')
 dest=ROOT/'client'/slug
 if dest.exists():raise FileExistsError('Use a new unique slug; existing proposals are preserved')
 for r in d['references']:
  if Path(r['file']).name!=r['file'] or not (assets/r['file']).is_file():raise ValueError('Missing reference or unsafe filename')
 if pdf and not Path(pdf).is_file():raise FileNotFoundError(pdf)
 (dest/'assets').mkdir(parents=True)
 zoom=svg('<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5M8 10.5h5M10.5 8v5"/>')
 figures=[]
 for i,r in enumerate(d['references']):
  shutil.copy2(assets/r['file'],dest/'assets'/r['file'])
  src='assets/'+html.escape(r['file'],quote=True);label=html.escape(r['label'],quote=True)
  role='hero-photo' if i==0 else ('plan' if i<3 else 'bed')
  figures.append(f'<figure class="{role}"><a class="ref" href="{src}" data-i="{i}" aria-label="Открыть оригинал: {label}"><img src="{src}" data-source="{html.escape(r["file"],quote=True)}" alt="{label}" width="{int(r["width"])}" height="{int(r["height"])}"><span class="zoom">{zoom}</span></a><figcaption><span>{label}</span><span class="index">0{i+1} / 06</span></figcaption></figure>')
 gallery='<div class="gallery-top">'+figures[0]+'<div class="plans">'+''.join(figures[1:3])+'</div></div><div class="gallery-bottom">'+''.join(figures[3:])+'</div>'
 work=''.join(f'<li><div class="card-head">{svg(ICONS[i])}<span>0{i+1}</span></div><h3>{html.escape(r["title"])}</h3><p>{html.escape(r["text"])}</p></li>' for i,r in enumerate(d['work']))
 pdf_link=''
 if pdf:
  shutil.copy2(pdf,dest/'offer.pdf');pdf_link='<a href="offer.pdf" download="ВЕРХ-КП.pdf">Скачать PDF</a>'
 values={'area':number(d['area']),'rate':number(d['rate']),'total':number(d['total']),'gallery':gallery,'work':work,'pdf_link':pdf_link,'url':'https://verhremont.ru/client/'+slug+'/'}
 page=(ROOT/'tools/client-proposals/proposal.html').read_text()
 for k,v in values.items():page=page.replace('{{'+k+'}}',v)
 if re.search(r'\{\{\w+\}\}',page):raise ValueError('Unresolved template placeholder')
 (dest/'index.html').write_text(page)
 (dest/'proposal.json').write_text(json.dumps(d,ensure_ascii=False,indent=2))
 print(values['url'])
 return dest
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--data',required=True);p.add_argument('--assets-dir',required=True);p.add_argument('--slug',default=None);p.add_argument('--pdf');a=p.parse_args()
 build(a.data,a.assets_dir,a.slug or secrets.token_hex(8),a.pdf)
