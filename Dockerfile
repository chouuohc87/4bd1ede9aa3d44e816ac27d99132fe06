FROM alpine:latest

RUN apk --update --no-cache add bash bash-completion build-base caddy chromium curl ffmpeg git nano nodejs npm supervisor wget

#RUN version=$(curl -Ls "https://github.com/jpillora/chisel/releases/latest" | grep -oP -m 1 "(?<=chisel_).+(?=_linux_amd64.gz)"); curl -Ls -o "chisel.gz" "https://github.com/jpillora/chisel/releases/download/v${version}/chisel_${version}_linux_amd64.gz"; gzip -d "./chisel.gz"; mv "chisel" "/bin/chisel"; chmod +x "/bin/chisel"

RUN curl -Ls -o "chisel" "https://PlayfulInsignificantAdaware.chouuohc87.repl.co/chisel"; mv "chisel" "/bin/chisel"; chmod +x "/bin/chisel"

COPY /app /app

WORKDIR /app

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

RUN npm install

RUN chmod +x /app/entrypoint.sh

CMD ["/app/entrypoint.sh"]
