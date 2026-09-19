FROM docker.io/library/nginx:stable-alpine

COPY index.html /usr/share/nginx/html/
COPY homelab.html /usr/share/nginx/html/
COPY resume.html /usr/share/nginx/html/
COPY styles.css /usr/share/nginx/html/
COPY resume.css /usr/share/nginx/html/
COPY script.js /usr/share/nginx/html/
COPY favicon.svg /usr/share/nginx/html/
COPY Tolga-Bilgis-Resume.pdf /usr/share/nginx/html/

EXPOSE 80
