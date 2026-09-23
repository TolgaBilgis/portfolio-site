FROM docker.io/nginxinc/nginx-unprivileged:stable-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY index.html /usr/share/nginx/html/
COPY homelab.html /usr/share/nginx/html/
COPY resume.html /usr/share/nginx/html/
COPY styles.css /usr/share/nginx/html/
COPY resume.css /usr/share/nginx/html/
COPY script.js /usr/share/nginx/html/
COPY favicon.svg /usr/share/nginx/html/
COPY Tolga-Bilgis-Resume.pdf /usr/share/nginx/html/

COPY assets/ /usr/share/nginx/html/assets/

EXPOSE 8080
