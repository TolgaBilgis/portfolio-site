"""Generate the public HTML and one-page PDF resume from resume.json.

Run from the repository with Python and reportlab installed:
    python scripts/build_resume.py
"""
import json
from html import escape
from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether

ROOT = Path(__file__).resolve().parents[1]
data = json.loads((ROOT / 'resume.json').read_text(encoding='utf-8'))
e = escape

def entry_html(item, project=False):
    title = e(item['title'])
    if project:
        title = f'<a href="{e(item["url"])}">{title}</a>'
    subtitle = item['technology'] if project else item['organization'] + ' | ' + item['location']
    return f'<article><div class="entry-title"><h3>{title}</h3><span>{e(item["date"])}</span></div><p class="role">{e(subtitle)}</p><ul>' + ''.join(f'<li>{e(b)}</li>' for b in item['bullets']) + '</ul></article>'

edu = data['education']
html = '''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="Tolga Bilgis's resume: Linux systems, HPC administration, infrastructure automation, and Kubernetes."><title>Resume | Tolga Bilgis</title><link rel="icon" href="favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="resume.css"><script src="script.js" defer></script></head><body><a class="skip-link" href="#main">Skip to resume</a><div class="resume-toolbar"><a href="index.html">← Portfolio</a><div class="resume-actions"><a href="Tolga-Bilgis-Resume.pdf" download>Download PDF ↓</a><button type="button" data-print>Print</button></div></div><main class="resume" id="main">'''
html += f'<header><h1>{e(data["name"])}</h1><p class="headline">{e(data["headline"])}</p><p class="contact"><a href="tel:+18033971770">{e(data["phone"])}</a> · <a href="mailto:{e(data["email"])}">{e(data["email"])}</a><br><a href="https://www.linkedin.com/in/tolgabilgis">linkedin.com/in/tolgabilgis</a> · <a href="https://github.com/TolgaBilgis">github.com/TolgaBilgis</a> · <a href="https://tolgabilgis.com">tolgabilgis.com</a></p></header>'
html += f'<section><h2>Education</h2><div class="entry-title"><h3>{e(edu["school"])}</h3><span>{e(edu["date"])}</span></div><p>{e(edu["detail"])}</p></section>'
html += '<section><h2>Technical Skills</h2>' + ''.join(f'<p class="skill"><strong>{e(k)}:</strong> {e(v)}</p>' for k,v in data['skills']) + '</section>'
html += '<section><h2>Experience</h2>' + ''.join(entry_html(i) for i in data['experience']) + '</section>'
html += '<section><h2>Projects</h2>' + ''.join(entry_html(i, True) for i in data['projects']) + '</section></main></body></html>'
(ROOT / 'resume.html').write_text(html + '\n', encoding='utf-8')

ink = colors.HexColor('#242824')
styles = {
    'name': ParagraphStyle('Name', fontName='Helvetica-Bold', fontSize=23, leading=25, alignment=TA_CENTER, textColor=ink),
    'headline': ParagraphStyle('Headline', fontName='Helvetica', fontSize=9, leading=12, alignment=TA_CENTER),
    'contact': ParagraphStyle('Contact', fontName='Helvetica', fontSize=8, leading=11, alignment=TA_CENTER),
    'section': ParagraphStyle('Section', fontName='Helvetica-Bold', fontSize=10, leading=12, spaceBefore=9, spaceAfter=5, textColor=ink),
    'title': ParagraphStyle('Title', fontName='Helvetica-Bold', fontSize=9.5, leading=11.5),
    'date': ParagraphStyle('Date', fontName='Helvetica', fontSize=8.6, leading=11.5, alignment=2),
    'body': ParagraphStyle('Body', fontName='Helvetica', fontSize=9, leading=11),
    'sub': ParagraphStyle('Sub', fontName='Helvetica-Oblique', fontSize=8.5, leading=10.5),
    'bullet': ParagraphStyle('Bullet', fontName='Helvetica', fontSize=9, leading=11, leftIndent=10, firstLineIndent=0, bulletIndent=0, spaceBefore=1.5),
}
P = lambda text, style='body': Paragraph(text, styles[style])
story = [P(e(data['name']), 'name'), P(e(data['headline']), 'headline'),
         P(e(data['phone']) + ' | <a href="mailto:tolgabwork@gmail.com">tolgabwork@gmail.com</a> | <a href="https://www.linkedin.com/in/tolgabilgis">linkedin.com/in/tolgabilgis</a> | <a href="https://github.com/TolgaBilgis">github.com/TolgaBilgis</a> | <a href="https://tolgabilgis.com">tolgabilgis.com</a>', 'contact')]
def title_row(title, date):
    table = Table([[P(title, 'title'), P(e(date), 'date')]], colWidths=[394,146])
    table.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),0),('RIGHTPADDING',(0,0),(-1,-1),0),('TOPPADDING',(0,0),(-1,-1),0),('BOTTOMPADDING',(0,0),(-1,-1),1)]))
    return table
story += [P('EDUCATION','section'),title_row(e(edu['school']),edu['date']),P(e(edu['detail']))]
story += [P('TECHNICAL SKILLS','section')]
story += [P(f'<b>{e(k)}:</b> {e(v)}') for k,v in data['skills']]
for key, label in [('experience','EXPERIENCE'),('projects','PROJECTS')]:
    story.append(P(label,'section'))
    for item in data[key]:
        title = e(item['title'])
        if key == 'projects':
            title = f'<a href="{e(item["url"])}">{title}</a>'
        subtitle = item['technology'] if key == 'projects' else item['organization'] + ' | ' + item['location']
        parts = [title_row(title,item['date']),P(e(subtitle),'sub')]
        parts += [Paragraph(e(b),styles['bullet'],bulletText='•') for b in item['bullets']]
        parts.append(Spacer(1,4))
        story.append(KeepTogether(parts))
output = ROOT / 'Tolga-Bilgis-Resume.pdf'
doc = SimpleDocTemplate(str(output), pagesize=letter, rightMargin=36,leftMargin=36,topMargin=27,bottomMargin=27,
                        title='Tolga Bilgis - Systems and Infrastructure Resume',author='Tolga Bilgis')
doc.build(story)
print(f'Generated {output.name} and resume.html from resume.json')
